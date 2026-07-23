import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Box, Typography, Grid, Button, Stack, IconButton, Tooltip, InputBase, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert,
} from '@mui/material';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { useSelector } from 'react-redux';
import { selectEmployees } from '../redux/slices/employeesSlice';
import { sanitizeCode, selectActiveEntity, selectActiveEntityId, ALL_ENTITY_ID } from '../redux/slices/orgSlice';
import { PRIMARY, PRIMARY_LIGHT } from '../theme';
import { card, solidBtn, ghostBtn, field, PageHeader, StatCards, EmptyState, StatusChip, StatusToggle, ConfirmDialog } from '../components/uiKit';
import http, { apiErrorMessage } from '../Api/http';
import { GetDepartments, CreateDepartment, UpdateDepartment, DeleteDepartment } from '../Api/Api';

const EMPTY = { entityId: '', name: '', code: '', description: '', status: 'Active' };

const normalizeDept = (d) => ({
    id: d.id,
    name: d.name ?? '',
    code: d.code ?? '',
    description: d.description ?? '',
    status: d.isActive === false ? 'Inactive' : 'Active',
    designations: Number(d.designations) || 0,
    entityId: d.entityId,
    entityName: d.entityName ?? '',
});

export default function DepartmentsPage() {
    const employees = useSelector(selectEmployees);
    // The entity to work in comes from the sidebar "Working in" switcher (org
    // slice) — there's no picker on this page. Everything here scopes to it.
    const activeEntity = useSelector(selectActiveEntity);
    const activeEntityId = useSelector(selectActiveEntityId);

    const [apiDepartments, setApiDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [q, setQ] = useState('');
    const [dialog, setDialog] = useState(null);   // { mode, id? }
    const [form, setForm] = useState(EMPTY);
    const [tried, setTried] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [snack, setSnack] = useState(null);      // { msg, sev }

    const notify = (msg, sev = 'success') => setSnack({ msg, sev });

    // ── Load ────────────────────────────────────────────────────────────────
    const loadDepartments = useCallback(async () => {
        setLoading(true);
        try {
            const { data: body } = await http.get(GetDepartments);
            if (body?.error) throw new Error(body.message || 'Could not load departments.');
            const list = Array.isArray(body?.data?.departments) ? body.data.departments : [];
            setApiDepartments(list.map(normalizeDept));
            setLoadError('');
        } catch (err) {
            setLoadError(apiErrorMessage(err, 'Could not load departments.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadDepartments(); }, [loadDepartments]);

    const entity = activeEntity;
    const isAll = activeEntityId === ALL_ENTITY_ID;

    // Only the active entity's departments (all of them when "All entities").
    const departments = useMemo(
        () => (isAll ? apiDepartments : apiDepartments.filter((d) => String(d.entityId) === String(activeEntityId))),
        [apiDepartments, activeEntityId, isAll],
    );

    const stats = useMemo(() => {
        const map = {};
        departments.forEach((d) => {
            map[d.id] = { employees: employees.filter((e) => e.department === d.name).length, designations: d.designations };
        });
        return map;
    }, [departments, employees]);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return departments;
        return departments.filter((d) => [d.name, d.code, d.description].some((v) => String(v || '').toLowerCase().includes(s)));
    }, [departments, q]);

    const mapped = useMemo(() => employees.filter((e) => departments.some((d) => d.name === e.department)).length, [employees, departments]);
    const totalDesignations = useMemo(() => departments.reduce((n, d) => n + d.designations, 0), [departments]);

    const KPIS = [
        { label: 'Departments', value: departments.length, sub: entity ? `In ${entity.name}` : '—', icon: AccountTreeRoundedIcon, color: PRIMARY, bg: PRIMARY_LIGHT },
        { label: 'Active', value: departments.filter((d) => d.status === 'Active').length, sub: 'Open for assignment', icon: ApartmentRoundedIcon, color: '#16A34A', bg: '#DCFCE7' },
        { label: 'Designations', value: totalDesignations, sub: 'Mapped under these', icon: WorkspacePremiumRoundedIcon, color: '#F59E0B', bg: '#FFF7ED' },
        { label: 'Employees Mapped', value: mapped, sub: 'Assigned to a department', icon: GroupsRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE' },
    ];

    // ── Create / edit / delete ──────────────────────────────────────────────
    const openCreate = () => { setForm({ ...EMPTY, entityId: activeEntityId }); setTried(false); setDialog({ mode: 'create' }); };
    const openEdit = (d) => { setForm({ entityId: d.entityId, name: d.name, code: d.code, description: d.description, status: d.status }); setTried(false); setDialog({ mode: 'edit', id: d.id }); };
    const closeDialog = () => { if (!saving) setDialog(null); };
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    // Names must be unique inside the entity being filed into.
    const nameTaken = apiDepartments.some((d) =>
        String(d.entityId) === String(form.entityId)
        && d.name.trim().toLowerCase() === form.name.trim().toLowerCase()
        && d.id !== dialog?.id);
    const valid = form.name.trim() && form.entityId && form.entityId !== ALL_ENTITY_ID && !nameTaken;

    const submit = async () => {
        setTried(true);
        if (!valid) {
            notify(nameTaken ? 'A department with that name already exists in that entity.'
                : (!form.entityId || form.entityId === ALL_ENTITY_ID) ? 'Choose an entity from the sidebar “Working in” switcher first.'
                    : 'Department name is required.', 'warning');
            return;
        }

        const editing = dialog.mode === 'edit';
        setSaving(true);
        try {
            const { data: body } = editing
                ? await http.put(UpdateDepartment, { id: dialog.id, name: form.name.trim(), code: sanitizeCode(form.code), description: form.description, isActive: form.status === 'Active' })
                : await http.post(CreateDepartment, { entityId: String(form.entityId), name: form.name.trim(), code: sanitizeCode(form.code), description: form.description, isActive: form.status === 'Active' });
            if (body?.error) throw new Error(body.message || 'Could not save the department.');
            notify(body?.message || (editing ? `${form.name.trim()} updated.` : `${form.name.trim()} added to ${entity?.name || 'the selected entity'}.`));
            setDialog(null);
            await loadDepartments();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not save the department.'), 'error');
        } finally {
            setSaving(false);
        }
    };

    const doDelete = async () => {
        if (!confirm || deleting) return;
        setDeleting(true);
        try {
            const { data: body } = await http.delete(DeleteDepartment, { params: { id: confirm.id } });
            if (body?.error) throw new Error(body.message || 'Could not remove the department.');
            notify(body?.message || `${confirm.name} removed.`);
            setConfirm(null);
            await loadDepartments();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not remove the department.'), 'error');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            {/* Entity comes from the sidebar's "Working in" switcher — no per-page
                picker or indicator, so the header stays about departments. */}
            <PageHeader title="Departments" subtitle="Departments for the entity you’re working in — they feed the employee onboarding dropdowns">
                <Button startIcon={<AddRoundedIcon />} onClick={openCreate} disabled={!entity} sx={{ ...solidBtn, height: 42, px: 2.2 }}>New Department</Button>
            </PageHeader>

            <StatCards items={KPIS} />

            {/* Header row — keeps its own panel background & border; the cards below
                sit directly on the page. */}
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mt: 2.5, mb: 1.5, px: 2, py: 1.4, bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY}22`, borderRadius: '5px' }}>
                <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
                    <Box sx={{ width: 34, height: 34, borderRadius: '9px', bgcolor: '#fff', border: '1px solid #ECEAF6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <AccountTreeRoundedIcon sx={{ fontSize: 18, color: PRIMARY }} />
                    </Box>
                    <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>All Departments</Typography>
                    <Box sx={{ px: 1, py: 0.3, borderRadius: '7px', bgcolor: '#fff', border: `1px solid ${PRIMARY}22` }}>
                        <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: PRIMARY }}>{`${filtered.length} of ${departments.length}`}</Typography>
                    </Box>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', px: 1.4, height: 38, width: { xs: 160, sm: 240 } }}>
                        <SearchRoundedIcon sx={{ fontSize: 18, color: '#98A0AE' }} />
                        <InputBase placeholder="Search departments…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ fontSize: 13, flex: 1 }} />
                    </Stack>
                    <Tooltip arrow title="Reload">
                        <IconButton onClick={loadDepartments} disabled={loading} sx={{ border: '1px solid #E6EAF1', borderRadius: '7px', bgcolor: '#fff', color: '#64748B', height: 38, width: 38, '&:hover': { bgcolor: PRIMARY_LIGHT, color: PRIMARY } }}>
                            <RefreshRoundedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>

            <Box sx={{ px: 0.5 }}>
                {loading ? (
                    <Box sx={{ p: 5, display: 'flex', justifyContent: 'center' }}><CircularProgress size={26} /></Box>
                ) : loadError ? (
                    <Box sx={{ p: 3 }}>
                        <Alert severity="error" sx={{ borderRadius: '9px' }}
                            action={<Button size="small" onClick={loadDepartments} sx={{ textTransform: 'none', fontWeight: 700 }}>Retry</Button>}>
                            {loadError}
                        </Alert>
                    </Box>
                ) : (
                    <Box>
                        <Grid container spacing={1.5}>
                            {filtered.map((d) => {
                                const s = stats[d.id] || {};
                                const accent = entity?.color || PRIMARY;
                                return (
                                    <Grid size={{ xs: 12, sm: 6, xl: 4 }}  key={d.id}>
                                        <Box sx={{
                                            ...card, height: '100%', p: 0, overflow: 'hidden', position: 'relative', borderColor: '#ECEAF6',
                                            transition: 'box-shadow .22s, transform .22s, border-color .22s',
                                            '&:hover': {
                                                transform: 'translateY(-3px)', borderColor: `${accent}55`,
                                                boxShadow: `0 16px 34px -18px ${accent}aa`,
                                                '& .dept-actions': { opacity: 1 },
                                            },
                                        }}>
                                            {/* Top accent */}
                                            <Box sx={{ height: 4, background: `linear-gradient(90deg, ${accent}, ${accent}55)` }} />

                                            {/* Header */}
                                            <Box sx={{ px: 2.2, pt: 2, pb: 1.6, display: 'flex', gap: 1.4, alignItems: 'flex-start' }}>
                                                <Box sx={{ width: 46, height: 46, borderRadius: '12px', background: `linear-gradient(135deg, ${accent}, ${accent}c8)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 6px 16px -4px ${accent}99` }}>
                                                    <AccountTreeRoundedIcon sx={{ fontSize: 23, color: '#fff' }} />
                                                </Box>
                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                    <Typography sx={{ fontSize: 15.5, fontWeight: 800, color: '#0F172A', lineHeight: 1.25 }} noWrap>{d.name}</Typography>
                                                    <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center', mt: 0.6, flexWrap: 'wrap', rowGap: 0.5 }}>
                                                        {d.code && (
                                                            <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: accent, letterSpacing: 0.6, bgcolor: `${accent}16`, px: 0.85, py: 0.2, borderRadius: '5px', lineHeight: 1.4 }}>{d.code}</Typography>
                                                        )}
                                                        <StatusChip status={d.status} />
                                                    </Stack>
                                                </Box>
                                                <Stack className="dept-actions" direction="row" spacing={0.2} sx={{ opacity: 0.55, transition: 'opacity .2s' }}>
                                                    <Tooltip arrow title="Edit"><IconButton size="small" onClick={() => openEdit(d)} sx={{ color: '#94A3B8', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}><EditRoundedIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                                                    <Tooltip arrow title="Remove"><IconButton size="small" onClick={() => setConfirm(d)} sx={{ color: '#94A3B8', '&:hover': { color: '#E11D48', bgcolor: '#FEF2F2' } }}><DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                                                </Stack>
                                            </Box>

                                            {/* Stats + description */}
                                            <Box sx={{ px: 2.2, pb: 2.2 }}>
                                                <Stack direction="row" spacing={1.2}>
                                                    {[
                                                        { icon: GroupsRoundedIcon, l: 'Employees', v: s.employees ?? 0, c: '#0EA5E9', bg: '#E0F2FE' },
                                                        { icon: WorkspacePremiumRoundedIcon, l: 'Designations', v: s.designations ?? 0, c: '#F59E0B', bg: '#FFF7ED' },
                                                    ].map((x) => (
                                                        <Box key={x.l} sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, p: 1.1, borderRadius: '10px', bgcolor: '#F8F9FC', border: '1px solid #EEF0F6' }}>
                                                            <Box sx={{ width: 30, height: 30, borderRadius: '8px', bgcolor: x.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                <x.icon sx={{ fontSize: 17, color: x.c }} />
                                                            </Box>
                                                            <Box sx={{ minWidth: 0 }}>
                                                                <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>{x.v}</Typography>
                                                                <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: '#98A0AE', textTransform: 'uppercase', letterSpacing: 0.3 }}>{x.l}</Typography>
                                                            </Box>
                                                        </Box>
                                                    ))}
                                                </Stack>

                                                {d.description && (
                                                    <Typography sx={{ fontSize: 12.5, color: '#64748B', lineHeight: 1.5, mt: 1.4 }}>{d.description}</Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    </Grid>
                                );
                            })}
                        </Grid>
                        {filtered.length === 0 && (
                            <EmptyState
                                icon={AccountTreeRoundedIcon}
                                title={q ? 'No departments match that search' : 'No departments yet'}
                                hint={q ? 'Try a different name or code.' : 'Add your first department to start assigning employees.'}
                            />
                        )}
                    </Box>
                )}
            </Box>

            {/* Create / edit */}
            <Dialog open={Boolean(dialog)} onClose={closeDialog} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{dialog?.mode === 'edit' ? 'Edit Department' : 'New Department'}</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>
                        {dialog?.mode === 'edit'
                            ? 'Update this department.'
                            : 'Added under the entity you’re working in — offered in its employee form.'}
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    <Grid container spacing={1.8}>
                        {dialog?.mode === 'create' && entity && (
                            <Grid size={12}>
                                {/* Entity is fixed to the sidebar's "Working in" selection — to add
                                    under a different company, switch it there first. */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, p: 1.3, borderRadius: '10px', bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY}22` }}>
                                    <Box sx={{ width: 34, height: 34, borderRadius: '9px', bgcolor: entity.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{(entity.code || entity.name).slice(0, 3)}</Typography>
                                    </Box>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: PRIMARY, textTransform: 'uppercase', letterSpacing: 0.4 }}>Entity</Typography>
                                        <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A' }} noWrap>{entity.name}</Typography>
                                    </Box>
                                    <Typography sx={{ fontSize: 10.5, color: '#94A3B8', textAlign: 'right', maxWidth: 140, lineHeight: 1.35 }}>Switch from the sidebar to add elsewhere</Typography>
                                </Box>
                            </Grid>
                        )}
                        <Grid size={{ xs: 12, sm: 8 }}>
                            <TextField label="Department name" size="small" fullWidth value={form.name} onChange={set('name')}
                                error={tried && (!form.name.trim() || nameTaken)} helperText={nameTaken ? 'Already exists in this entity' : ' '} sx={field} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Code" size="small" fullWidth value={form.code}
                                onChange={(e) => setForm((f) => ({ ...f, code: sanitizeCode(e.target.value) }))} helperText="e.g. ENG" sx={field} />
                        </Grid>
                        <Grid size={12}>
                            <TextField label="Description (optional)" size="small" fullWidth multiline minRows={2} value={form.description} onChange={set('description')} sx={field} />
                        </Grid>
                        <Grid size={12}>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.8 }}>Status</Typography>
                            <StatusToggle
                                value={form.status}
                                onChange={(v) => setForm((f) => ({ ...f, status: v }))}
                                activeHint="Offered when assigning employees"
                                inactiveHint="Kept on record, but no longer offered"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={closeDialog} disabled={saving} sx={{ ...ghostBtn, height: 40, px: 2 }}>Cancel</Button>
                    <Button onClick={submit} disabled={saving} startIcon={saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null} sx={{ ...solidBtn, height: 40, px: 2.4 }}>
                        {saving ? 'Saving…' : dialog?.mode === 'edit' ? 'Save Changes' : 'Add Department'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={Boolean(confirm)}
                onClose={() => { if (!deleting) setConfirm(null); }}
                onConfirm={doDelete}
                title="Remove department?"
                body={confirm ? `${confirm.name} will be removed. Its ${stats[confirm.id]?.designations ?? 0} designation(s) and ${stats[confirm.id]?.employees ?? 0} employee mapping(s) are handled by the server.` : ''}
                confirmLabel="Remove"
            />

            <Snackbar open={Boolean(snack)} autoHideDuration={3000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack(null)} severity={snack?.sev || 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack?.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
