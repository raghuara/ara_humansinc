import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Box, Typography, Grid, Button, Stack, Chip, IconButton, Tooltip, InputBase, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Snackbar, Alert,
} from '@mui/material';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import StairsRoundedIcon from '@mui/icons-material/StairsRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { useSelector } from 'react-redux';
import { selectEmployees } from '../redux/slices/employeesSlice';
import { sanitizeCode, selectActiveEntity, selectActiveEntityId, ALL_ENTITY_ID } from '../redux/slices/orgSlice';
import { PRIMARY, PRIMARY_LIGHT } from '../theme';
import { solidBtn, ghostBtn, field, th, td, PageHeader, StatCards, Panel, EmptyState, StatusChip, StatusToggle, ConfirmDialog } from '../components/uiKit';
import http, { apiErrorMessage } from '../Api/http';
import { GetDesignations, CreateDesignation, UpdateDesignation, DeleteDesignation, GetDepartments } from '../Api/Api';

const GRADES = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];

// A designation belongs to an ENTITY, not a department — there's no department on
// the form, so every one created/edited here is entity-wide (departmentId: null).
const EMPTY = { entityId: '', name: '', code: '', grade: '', description: '', status: 'Active' };

const normalizeDept = (d) => ({ id: d.id, name: d.name ?? '', entityId: d.entityId });
const normalizeDesignation = (d) => ({
    id: d.id,
    name: d.name ?? '',
    code: d.code ?? '',
    departmentId: d.departmentId ?? null,
    departmentName: d.departmentName ?? '',
    isEntityWide: Boolean(d.isEntityWide ?? (d.departmentId == null)),
    grade: d.grade ?? '',
    description: d.description ?? '',
    status: d.isActive === false ? 'Inactive' : 'Active',
    entityId: d.entityId,
    entityName: d.entityName ?? '',
});

export default function DesignationsPage() {
    const employees = useSelector(selectEmployees);
    // The entity to work in comes from the sidebar "Working in" switcher (org
    // slice) — there's no picker on this page. Everything here scopes to it.
    const activeEntity = useSelector(selectActiveEntity);
    const activeEntityId = useSelector(selectActiveEntityId);

    const [apiDesignations, setApiDesignations] = useState([]);
    const [apiDepartments, setApiDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [q, setQ] = useState('');
    const [depFilter, setDepFilter] = useState('all');
    const [dialog, setDialog] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [tried, setTried] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [snack, setSnack] = useState(null);      // { msg, sev }

    const notify = (msg, sev = 'success') => setSnack({ msg, sev });

    // ── Load ────────────────────────────────────────────────────────────────
    const loadDepartments = useCallback(async () => {
        try {
            const { data: body } = await http.get(GetDepartments);
            if (body?.error) return;
            const list = Array.isArray(body?.data?.departments) ? body.data.departments : [];
            setApiDepartments(list.map(normalizeDept));
        } catch { /* department dropdown stays empty */ }
    }, []);

    const loadDesignations = useCallback(async () => {
        setLoading(true);
        try {
            const { data: body } = await http.get(GetDesignations);
            if (body?.error) throw new Error(body.message || 'Could not load designations.');
            const list = Array.isArray(body?.data?.designations) ? body.data.designations : [];
            setApiDesignations(list.map(normalizeDesignation));
            setLoadError('');
        } catch (err) {
            setLoadError(apiErrorMessage(err, 'Could not load designations.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadDepartments(); loadDesignations(); }, [loadDepartments, loadDesignations]);

    const entity = activeEntity;
    const isAll = activeEntityId === ALL_ENTITY_ID;

    const designations = useMemo(
        () => (isAll ? apiDesignations : apiDesignations.filter((d) => String(d.entityId) === String(activeEntityId))),
        [apiDesignations, activeEntityId, isAll],
    );
    // Departments belonging to the entity on screen — feed the list's filter.
    const entityDepartments = useMemo(
        () => (isAll ? apiDepartments : apiDepartments.filter((d) => String(d.entityId) === String(activeEntityId))),
        [apiDepartments, activeEntityId, isAll],
    );

    const headcount = useMemo(() => {
        const map = {};
        designations.forEach((d) => { map[d.id] = employees.filter((e) => e.designation === d.name).length; });
        return map;
    }, [designations, employees]);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        return designations.filter((d) => {
            if (depFilter === 'entity' && !d.isEntityWide) return false;
            if (depFilter !== 'all' && depFilter !== 'entity' && String(d.departmentId) !== depFilter) return false;
            if (!s) return true;
            return [d.name, d.code, d.grade, d.departmentName].some((v) => String(v || '').toLowerCase().includes(s));
        });
    }, [designations, q, depFilter]);

    const totalEntityWide = useMemo(() => designations.filter((d) => d.isEntityWide).length, [designations]);

    const KPIS = [
        { label: 'Designations', value: designations.length, sub: entity ? `In ${entity.name}` : '—', icon: WorkspacePremiumRoundedIcon, color: PRIMARY, bg: PRIMARY_LIGHT },
        { label: 'Active', value: designations.filter((d) => d.status === 'Active').length, sub: 'Open for assignment', icon: StairsRoundedIcon, color: '#16A34A', bg: '#DCFCE7' },
        { label: 'Departments', value: entityDepartments.length, sub: 'Available to map against', icon: AccountTreeRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE' },
        { label: 'Entity-wide Roles', value: totalEntityWide, sub: 'Not tied to a department', icon: ApartmentRoundedIcon, color: '#F59E0B', bg: '#FFF7ED' },
    ];

    // ── Create / edit / delete ──────────────────────────────────────────────
    const openCreate = () => { setForm({ ...EMPTY, entityId: activeEntityId }); setTried(false); setDialog({ mode: 'create' }); };
    const openEdit = (d) => {
        setForm({ entityId: d.entityId, name: d.name, code: d.code, grade: d.grade, description: d.description, status: d.status });
        setTried(false); setDialog({ mode: 'edit', id: d.id });
    };
    const closeDialog = () => { if (!saving) setDialog(null); };
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const nameTaken = apiDesignations.some((d) =>
        String(d.entityId) === String(form.entityId)
        && d.name.trim().toLowerCase() === form.name.trim().toLowerCase()
        && d.id !== dialog?.id);
    const valid = form.name.trim() && form.entityId && form.entityId !== ALL_ENTITY_ID && !nameTaken;

    const submit = async () => {
        setTried(true);
        if (!valid) {
            notify(nameTaken ? 'A designation with that name already exists in that entity.'
                : (!form.entityId || form.entityId === ALL_ENTITY_ID) ? 'Choose an entity from the sidebar “Working in” switcher first.'
                    : 'Designation name is required.', 'warning');
            return;
        }

        const departmentId = null;   // designations are entity-wide — not tied to a department
        const editing = dialog.mode === 'edit';
        setSaving(true);
        try {
            const { data: body } = editing
                ? await http.put(UpdateDesignation, { id: dialog.id, name: form.name.trim(), code: sanitizeCode(form.code), departmentId, grade: form.grade, description: form.description, isActive: form.status === 'Active' })
                : await http.post(CreateDesignation, { entityId: String(form.entityId), name: form.name.trim(), code: sanitizeCode(form.code), departmentId, grade: form.grade, description: form.description, isActive: form.status === 'Active' });
            if (body?.error) throw new Error(body.message || 'Could not save the designation.');
            notify(body?.message || (editing ? `${form.name.trim()} updated.` : `${form.name.trim()} added to ${entity?.name || 'the selected entity'}.`));
            setDialog(null);
            await loadDesignations();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not save the designation.'), 'error');
        } finally {
            setSaving(false);
        }
    };

    const doDelete = async () => {
        if (!confirm || deleting) return;
        setDeleting(true);
        try {
            const { data: body } = await http.delete(DeleteDesignation, { params: { id: confirm.id } });
            if (body?.error) throw new Error(body.message || 'Could not remove the designation.');
            notify(body?.message || `${confirm.name} removed.`);
            setConfirm(null);
            await loadDesignations();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not remove the designation.'), 'error');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            {/* Entity comes from the sidebar's "Working in" switcher — no per-page
                picker or indicator. */}
            <PageHeader title="Designations" subtitle="Job titles for the entity you’re working in — offered in its employee form">
                <Button startIcon={<AddRoundedIcon />} onClick={openCreate} disabled={!entity} sx={{ ...solidBtn, height: 42, px: 2.2 }}>New Designation</Button>
            </PageHeader>

            <StatCards items={KPIS} />

            <Panel
                title="All Designations"
                icon={WorkspacePremiumRoundedIcon}
                chip={`${filtered.length} of ${designations.length}`}
                action={(
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <TextField select size="small" value={depFilter} onChange={(e) => setDepFilter(e.target.value)}
                            sx={{ ...field, width: 170, '& .MuiOutlinedInput-root': { ...field['& .MuiOutlinedInput-root'], height: 38, bgcolor: '#fff' } }}>
                            <MenuItem value="all" sx={{ fontSize: 13 }}>All departments</MenuItem>
                            <MenuItem value="entity" sx={{ fontSize: 13 }}>Entity-wide</MenuItem>
                            {entityDepartments.map((d) => <MenuItem key={d.id} value={String(d.id)} sx={{ fontSize: 13 }}>{d.name}</MenuItem>)}
                        </TextField>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', px: 1.4, height: 38, width: { xs: 140, sm: 200 } }}>
                            <SearchRoundedIcon sx={{ fontSize: 18, color: '#98A0AE' }} />
                            <InputBase placeholder="Search designations…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ fontSize: 13, flex: 1 }} />
                        </Stack>
                        <Tooltip arrow title="Reload">
                            <IconButton onClick={() => { loadDepartments(); loadDesignations(); }} disabled={loading} sx={{ border: '1px solid #E6EAF1', borderRadius: '7px', color: '#64748B', height: 38, width: 38, '&:hover': { bgcolor: PRIMARY_LIGHT, color: PRIMARY } }}>
                                <RefreshRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                )}
            >
                {loading ? (
                    <Box sx={{ p: 5, display: 'flex', justifyContent: 'center' }}><CircularProgress size={26} /></Box>
                ) : loadError ? (
                    <Box sx={{ p: 3 }}>
                        <Alert severity="error" sx={{ borderRadius: '9px' }}
                            action={<Button size="small" onClick={loadDesignations} sx={{ textTransform: 'none', fontWeight: 700 }}>Retry</Button>}>
                            {loadError}
                        </Alert>
                    </Box>
                ) : (
                    <Box sx={{ overflowX: 'auto' }}>
                        <Box component="table" sx={{ width: '100%', minWidth: 860, borderCollapse: 'collapse' }}>
                            <Box component="thead" sx={{ bgcolor: '#F4F3FB' }}>
                                <Box component="tr">
                                    {['DESIGNATION', 'CODE', 'DEPARTMENT', 'GRADE', 'EMPLOYEES', 'STATUS', 'ACTIONS'].map((h) => (
                                        <Box component="th" key={h} sx={{ ...th, textAlign: h === 'ACTIONS' ? 'right' : 'left' }}>{h}</Box>
                                    ))}
                                </Box>
                            </Box>
                            <Box component="tbody">
                                {filtered.map((d, i) => (
                                    <Box component="tr" key={d.id} sx={{ bgcolor: i % 2 ? '#FBFAFE' : '#fff' }}>
                                        <Box component="td" sx={td}>
                                            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{d.name}</Typography>
                                            {d.description && <Typography sx={{ fontSize: 11.5, color: '#98A0AE' }} noWrap>{d.description}</Typography>}
                                        </Box>
                                        <Box component="td" sx={td}>
                                            <Chip label={d.code || '—'} size="small" sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: PRIMARY_LIGHT, color: PRIMARY }} />
                                        </Box>
                                        <Box component="td" sx={td}>
                                            {d.isEntityWide ? (
                                                <Chip label="Entity-wide" size="small" sx={{ height: 21, fontSize: 10.5, fontWeight: 700, bgcolor: '#FFF7ED', color: '#B45309' }} />
                                            ) : (
                                                <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center' }}>
                                                    <AccountTreeRoundedIcon sx={{ fontSize: 15, color: '#94A3B8' }} />
                                                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{d.departmentName || 'Unknown'}</Typography>
                                                </Stack>
                                            )}
                                        </Box>
                                        <Box component="td" sx={td}>
                                            {d.grade
                                                ? <Chip label={d.grade} size="small" sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: '#E0F2FE', color: '#0369A1' }} />
                                                : <Typography sx={{ fontSize: 12.5, color: '#C4C9D4' }}>—</Typography>}
                                        </Box>
                                        <Box component="td" sx={td}>
                                            <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
                                                <GroupsRoundedIcon sx={{ fontSize: 16, color: '#CBD2DD' }} />
                                                <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{headcount[d.id] ?? 0}</Typography>
                                            </Stack>
                                        </Box>
                                        <Box component="td" sx={td}><StatusChip status={d.status} /></Box>
                                        <Box component="td" sx={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <Tooltip arrow title="Edit"><IconButton size="small" onClick={() => openEdit(d)} sx={{ color: '#94A3B8', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}><EditRoundedIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                                            <Tooltip arrow title="Remove"><IconButton size="small" onClick={() => setConfirm(d)} sx={{ ml: 0.5, color: '#94A3B8', '&:hover': { color: '#E11D48', bgcolor: '#FEF2F2' } }}><DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                        {filtered.length === 0 && (
                            <EmptyState
                                icon={WorkspacePremiumRoundedIcon}
                                title={q || depFilter !== 'all' ? 'No designations match these filters' : 'No designations yet'}
                                hint={q || depFilter !== 'all' ? 'Clear the search or the department filter.' : 'Add a job title and map it to a department, or keep it entity-wide.'}
                            />
                        )}
                    </Box>
                )}
            </Panel>

            {/* Create / edit */}
            <Dialog open={Boolean(dialog)} onClose={closeDialog} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{dialog?.mode === 'edit' ? 'Edit Designation' : 'New Designation'}</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>
                        {dialog?.mode === 'edit'
                            ? 'Update this designation.'
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
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Designation name" size="small" fullWidth value={form.name} onChange={set('name')}
                                error={tried && (!form.name.trim() || nameTaken)} helperText={nameTaken ? 'Already exists in this entity' : ' '} sx={field} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField label="Code" size="small" fullWidth value={form.code}
                                onChange={(e) => setForm((f) => ({ ...f, code: sanitizeCode(e.target.value) }))} helperText="e.g. SSE" sx={field} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <TextField select label="Grade" size="small" fullWidth value={form.grade} onChange={set('grade')} sx={field}>
                                <MenuItem value="" sx={{ fontSize: 13.5 }}><em>—</em></MenuItem>
                                {GRADES.map((g) => <MenuItem key={g} value={g} sx={{ fontSize: 13.5 }}>{g}</MenuItem>)}
                            </TextField>
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
                        {saving ? 'Saving…' : dialog?.mode === 'edit' ? 'Save Changes' : 'Add Designation'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={Boolean(confirm)}
                onClose={() => { if (!deleting) setConfirm(null); }}
                onConfirm={doDelete}
                title="Remove designation?"
                body={confirm ? `${confirm.name} will be removed. ${headcount[confirm.id] ?? 0} employee record(s) keep the title already saved on them.` : ''}
                confirmLabel="Remove"
            />

            <Snackbar open={Boolean(snack)} autoHideDuration={3000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack(null)} severity={snack?.sev || 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack?.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
