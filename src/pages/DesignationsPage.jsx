import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Grid, Button, Stack, Chip, IconButton, Tooltip, InputBase,
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
import { useSelector, useDispatch } from 'react-redux';
import {
    selectEntities, selectDepartments, selectAllDepartments, selectDesignations, selectAllDesignations,
    selectActiveEntity, selectActiveEntityId,
    addDesignation, updateDesignation, deleteDesignation, sanitizeCode,
} from '../redux/slices/orgSlice';
import { selectEmployees } from '../redux/slices/employeesSlice';
import { PRIMARY, PRIMARY_LIGHT } from '../theme';
import { card, solidBtn, ghostBtn, field, th, td, PageHeader, StatCards, Panel, EmptyState, StatusChip, StatusToggle, ConfirmDialog } from '../components/uiKit';
import EntityField from '../components/EntityField';

// Grade ladder — kept as a simple string so an org can rename its own bands.
const LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];
const ENTITY_WIDE = '__all__';   // sentinel for "not tied to one department"

const EMPTY = { name: '', code: '', entityId: '', departmentId: ENTITY_WIDE, level: '', description: '', status: 'Active' };

export default function DesignationsPage() {
    const dispatch = useDispatch();
    const entities = useSelector(selectEntities);
    const entity = useSelector(selectActiveEntity);
    const entityId = useSelector(selectActiveEntityId);
    const departments = useSelector(selectDepartments);
    const allDepartments = useSelector(selectAllDepartments);
    const designations = useSelector(selectDesignations);
    const allDesignations = useSelector(selectAllDesignations);
    const employees = useSelector(selectEmployees);

    const entityName = (id) => entities.find((e) => e.id === id)?.name || '—';

    const [q, setQ] = useState('');
    const [depFilter, setDepFilter] = useState('all');
    const [dialog, setDialog] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [tried, setTried] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [snack, setSnack] = useState('');

    const depName = (id) => departments.find((d) => d.id === id)?.name || '';

    // Headcount per designation — employees store the designation by name.
    const headcount = useMemo(() => {
        const map = {};
        designations.forEach((d) => { map[d.id] = employees.filter((e) => e.designation === d.name).length; });
        return map;
    }, [designations, employees]);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        return designations.filter((d) => {
            if (depFilter === 'entity' && d.departmentId) return false;
            if (depFilter !== 'all' && depFilter !== 'entity' && d.departmentId !== depFilter) return false;
            if (!s) return true;
            return [d.name, d.code, d.level, depName(d.departmentId)].some((v) => String(v || '').toLowerCase().includes(s));
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [designations, departments, q, depFilter]);

    const KPIS = [
        { label: 'Designations', value: designations.length, sub: entity ? `In ${entity.name}` : '—', icon: WorkspacePremiumRoundedIcon, color: PRIMARY, bg: PRIMARY_LIGHT },
        { label: 'Active', value: designations.filter((d) => d.status === 'Active').length, sub: 'Open for assignment', icon: StairsRoundedIcon, color: '#16A34A', bg: '#DCFCE7' },
        { label: 'Departments', value: departments.length, sub: 'Available to map against', icon: AccountTreeRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE' },
        { label: 'Entity-wide Roles', value: designations.filter((d) => !d.departmentId).length, sub: 'Not tied to a department', icon: ApartmentRoundedIcon, color: '#F59E0B', bg: '#FFF7ED' },
    ];

    const openCreate = () => { setForm({ ...EMPTY, entityId }); setTried(false); setDialog({ mode: 'create' }); };
    const openEdit = (d) => { setForm({ ...EMPTY, ...d, departmentId: d.departmentId || ENTITY_WIDE }); setTried(false); setDialog({ mode: 'edit', id: d.id }); };

    // Changing the entity in the dialog invalidates the chosen department, since
    // departments belong to one company — reset it rather than file the
    // designation under a department from a different entity.
    const set = (k) => (e) => setForm((f) => (
        k === 'entityId'
            ? { ...f, entityId: e.target.value, departmentId: ENTITY_WIDE }
            : { ...f, [k]: e.target.value }
    ));

    // Departments offered in the dialog follow the dialog's entity, not the page's.
    const dialogDepartments = allDepartments.filter((d) => d.entityId === form.entityId);

    const nameTaken = allDesignations.some((d) =>
        d.entityId === form.entityId
        && d.name.trim().toLowerCase() === form.name.trim().toLowerCase()
        && d.id !== dialog?.id);
    const valid = form.name.trim() && form.entityId && !nameTaken;

    const submit = () => {
        setTried(true);
        if (!valid) {
            setSnack(nameTaken ? 'A designation with that name already exists in that entity.'
                : !form.entityId ? 'Pick the entity this designation belongs to.'
                    : 'Designation name is required.');
            return;
        }
        // The sentinel is a UI concern — the store keeps `null` for entity-wide.
        const payload = { ...form, departmentId: form.departmentId === ENTITY_WIDE ? null : form.departmentId };
        if (dialog.mode === 'create') {
            dispatch(addDesignation(payload));
            setSnack(`${form.name.trim()} added to ${entityName(form.entityId)}.`);
        } else {
            dispatch(updateDesignation({ id: dialog.id, changes: payload }));
            setSnack(`${form.name.trim()} updated.`);
        }
        setDialog(null);
    };

    const doDelete = () => {
        dispatch(deleteDesignation(confirm.id));
        setSnack(`${confirm.name} removed.`);
        setConfirm(null);
    };

    if (!entity) {
        return (
            <Box sx={{ p: 2 }}>
                <Box sx={{ ...card }}>
                    <EmptyState icon={ApartmentRoundedIcon} title="No business entity selected" hint="Create a business entity first — designations belong to a company." />
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            <PageHeader title="Designations" subtitle="Pick an entity to work in — map each job title to a department, or leave it entity-wide">
                <EntityField />
                <Button startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ ...solidBtn, height: 42, px: 2.2 }}>New Designation</Button>
            </PageHeader>

            <StatCards items={KPIS} />

            <Panel
                title="All Designations"
                icon={WorkspacePremiumRoundedIcon}
                chip={`${filtered.length} of ${designations.length}`}
                action={(
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <TextField
                            select size="small" value={depFilter} onChange={(e) => setDepFilter(e.target.value)}
                            sx={{ ...field, width: 190, '& .MuiOutlinedInput-root': { ...field['& .MuiOutlinedInput-root'], height: 38, bgcolor: '#fff' } }}
                        >
                            <MenuItem value="all" sx={{ fontSize: 13 }}>All departments</MenuItem>
                            <MenuItem value="entity" sx={{ fontSize: 13 }}>Entity-wide only</MenuItem>
                            {departments.map((d) => <MenuItem key={d.id} value={d.id} sx={{ fontSize: 13 }}>{d.name}</MenuItem>)}
                        </TextField>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', px: 1.4, height: 38, width: { xs: 150, sm: 220 } }}>
                            <SearchRoundedIcon sx={{ fontSize: 18, color: '#98A0AE' }} />
                            <InputBase placeholder="Search designations…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ fontSize: 13, flex: 1 }} />
                        </Stack>
                    </Stack>
                )}
            >
                <Box sx={{ overflowX: 'auto' }}>
                    <Box component="table" sx={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
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
                                        {d.departmentId ? (
                                            <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center' }}>
                                                <AccountTreeRoundedIcon sx={{ fontSize: 15, color: '#94A3B8' }} />
                                                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{depName(d.departmentId) || 'Unknown'}</Typography>
                                            </Stack>
                                        ) : (
                                            <Chip label="Entity-wide" size="small" sx={{ height: 21, fontSize: 10.5, fontWeight: 700, bgcolor: '#FFF7ED', color: '#B45309' }} />
                                        )}
                                    </Box>
                                    <Box component="td" sx={td}>
                                        {d.level
                                            ? <Chip label={d.level} size="small" sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: '#E0F2FE', color: '#0369A1' }} />
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
                            hint={q || depFilter !== 'all' ? 'Clear the search or pick another department.' : 'Add job titles so they appear in the employee form.'}
                        />
                    )}
                </Box>
            </Panel>

            {/* Create / edit */}
            <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{dialog?.mode === 'edit' ? 'Edit Designation' : 'New Designation'}</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>Belongs to one entity, and is offered in that entity’s employee form.</Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    <Grid container spacing={1.8}>
                        <Grid size={12}>
                            <TextField select label="Entity" size="small" fullWidth value={form.entityId} onChange={set('entityId')}
                                error={tried && !form.entityId} sx={field} slotProps={{ inputLabel: { shrink: true } }}>
                                {entities.map((e) => (
                                    <MenuItem key={e.id} value={e.id} sx={{ py: 0.9 }}>
                                        <Stack direction="row" spacing={1.1} sx={{ alignItems: 'center' }}>
                                            <Box sx={{ width: 24, height: 24, borderRadius: '6px', bgcolor: e.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Typography sx={{ fontSize: 9, fontWeight: 800, color: '#fff' }}>{e.code.slice(0, 3)}</Typography>
                                            </Box>
                                            <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{e.name}</Typography>
                                        </Stack>
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 8 }}>
                            <TextField label="Designation name" size="small" fullWidth value={form.name} onChange={set('name')}
                                error={tried && !valid} helperText={tried && nameTaken ? 'Already exists in this entity' : ' '} sx={field} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Code" size="small" fullWidth value={form.code}
                                onChange={(e) => setForm((f) => ({ ...f, code: sanitizeCode(e.target.value) }))} helperText="e.g. SSE" sx={field} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 8 }}>
                            <TextField select label="Department" size="small" fullWidth value={form.departmentId} onChange={set('departmentId')} sx={field}
                                helperText="Entity-wide roles (e.g. Director) don't sit under one department">
                                <MenuItem value={ENTITY_WIDE} sx={{ fontSize: 13.5 }}><em>Entity-wide — no department</em></MenuItem>
                                {dialogDepartments.map((d) => <MenuItem key={d.id} value={d.id} sx={{ fontSize: 13.5 }}>{d.name}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField select label="Grade" size="small" fullWidth value={form.level} onChange={set('level')} sx={field}>
                                <MenuItem value="" sx={{ fontSize: 13.5 }}><em>—</em></MenuItem>
                                {LEVELS.map((l) => <MenuItem key={l} value={l} sx={{ fontSize: 13.5 }}>{l}</MenuItem>)}
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
                                activeHint="Offered in the employee form"
                                inactiveHint="Kept on record, but no longer offered"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setDialog(null)} sx={{ ...ghostBtn, height: 40, px: 2 }}>Cancel</Button>
                    <Button onClick={submit} sx={{ ...solidBtn, height: 40, px: 2.4 }}>{dialog?.mode === 'edit' ? 'Save Changes' : 'Add Designation'}</Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={Boolean(confirm)}
                onClose={() => setConfirm(null)}
                onConfirm={doDelete}
                title="Remove designation?"
                body={confirm ? `${confirm.name} will no longer be offered in the employee form. The ${headcount[confirm.id] ?? 0} employee(s) already on it keep the title saved on their record.` : ''}
                confirmLabel="Remove"
            />

            <Snackbar open={Boolean(snack)} autoHideDuration={3000} onClose={() => setSnack('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack('')} severity={/required|exists/.test(snack) ? 'warning' : 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack}</Alert>
            </Snackbar>
        </Box>
    );
}
