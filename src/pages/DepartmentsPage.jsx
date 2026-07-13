import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Grid, Button, Stack, Chip, IconButton, Tooltip, Avatar, InputBase,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Snackbar, Alert,
} from '@mui/material';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import { useSelector, useDispatch } from 'react-redux';
import {
    selectEntities, selectDepartments, selectAllDepartments, selectDesignations,
    selectActiveEntity, selectActiveEntityId,
    addDepartment, updateDepartment, deleteDepartment, sanitizeCode,
} from '../redux/slices/orgSlice';
import { selectEmployees } from '../redux/slices/employeesSlice';
import { PRIMARY, PRIMARY_LIGHT } from '../theme';
import { initialsFromName as initials, paletteColor as colorFor } from '../utils/format';
import { card, solidBtn, ghostBtn, field, th, td, PageHeader, StatCards, Panel, EmptyState, StatusChip, StatusToggle, ConfirmDialog } from '../components/uiKit';
import EntityField from '../components/EntityField';

const EMPTY = { name: '', code: '', head: '', description: '', status: 'Active', entityId: '' };

export default function DepartmentsPage() {
    const dispatch = useDispatch();
    const entities = useSelector(selectEntities);
    const entity = useSelector(selectActiveEntity);
    const entityId = useSelector(selectActiveEntityId);
    const departments = useSelector(selectDepartments);
    const allDepartments = useSelector(selectAllDepartments);
    const designations = useSelector(selectDesignations);
    const employees = useSelector(selectEmployees);

    const entityName = (id) => entities.find((e) => e.id === id)?.name || '—';

    const [q, setQ] = useState('');
    const [dialog, setDialog] = useState(null);   // { mode, id? }
    const [form, setForm] = useState(EMPTY);
    const [tried, setTried] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [snack, setSnack] = useState('');

    // Headcount and designation count per department, keyed by department id.
    const stats = useMemo(() => {
        const map = {};
        departments.forEach((d) => {
            map[d.id] = {
                employees: employees.filter((e) => e.department === d.name).length,
                designations: designations.filter((g) => g.departmentId === d.id).length,
            };
        });
        return map;
    }, [departments, designations, employees]);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return departments;
        return departments.filter((d) =>
            [d.name, d.code, d.head, d.description].some((v) => String(v || '').toLowerCase().includes(s)));
    }, [departments, q]);

    const mapped = useMemo(() => employees.filter((e) => departments.some((d) => d.name === e.department)).length, [employees, departments]);

    const KPIS = [
        { label: 'Departments', value: departments.length, sub: entity ? `In ${entity.name}` : '—', icon: AccountTreeRoundedIcon, color: PRIMARY, bg: PRIMARY_LIGHT },
        { label: 'Active', value: departments.filter((d) => d.status === 'Active').length, sub: 'Open for assignment', icon: ApartmentRoundedIcon, color: '#16A34A', bg: '#DCFCE7' },
        { label: 'Designations', value: designations.length, sub: 'Mapped under these', icon: WorkspacePremiumRoundedIcon, color: '#F59E0B', bg: '#FFF7ED' },
        { label: 'Employees Mapped', value: mapped, sub: 'Assigned to a department', icon: GroupsRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE' },
    ];

    // The dialog's own Entity field defaults to whatever the page is showing, so
    // you can still file a department under another company without leaving.
    const openCreate = () => { setForm({ ...EMPTY, entityId }); setTried(false); setDialog({ mode: 'create' }); };
    const openEdit = (d) => { setForm({ ...EMPTY, ...d }); setTried(false); setDialog({ mode: 'edit', id: d.id }); };
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    // Names must be unique inside an entity — two "Sales" departments in one
    // company would make the employee dropdown ambiguous. The check runs against
    // the entity the form is filing into, not the one on screen.
    const nameTaken = allDepartments.some((d) =>
        d.entityId === form.entityId
        && d.name.trim().toLowerCase() === form.name.trim().toLowerCase()
        && d.id !== dialog?.id);
    const valid = form.name.trim() && form.entityId && !nameTaken;

    const submit = () => {
        setTried(true);
        if (!valid) {
            setSnack(nameTaken ? 'A department with that name already exists in that entity.'
                : !form.entityId ? 'Pick the entity this department belongs to.'
                    : 'Department name is required.');
            return;
        }
        if (dialog.mode === 'create') {
            dispatch(addDepartment(form));
            setSnack(`${form.name.trim()} added to ${entityName(form.entityId)}.`);
        } else {
            dispatch(updateDepartment({ id: dialog.id, changes: form }));
            setSnack(`${form.name.trim()} updated.`);
        }
        setDialog(null);
    };

    const doDelete = () => {
        dispatch(deleteDepartment(confirm.id));
        setSnack(`${confirm.name} removed.`);
        setConfirm(null);
    };

    if (!entity) {
        return (
            <Box sx={{ p: 2 }}>
                <Box sx={{ ...card }}>
                    <EmptyState icon={ApartmentRoundedIcon} title="No business entity selected" hint="Create a business entity first — departments belong to a company." />
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            <PageHeader title="Departments" subtitle="Pick an entity to work in — its departments feed the employee onboarding dropdowns">
                <EntityField />
                <Button startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ ...solidBtn, height: 42, px: 2.2 }}>New Department</Button>
            </PageHeader>

            <StatCards items={KPIS} />

            <Panel
                title="All Departments"
                icon={AccountTreeRoundedIcon}
                chip={`${filtered.length} of ${departments.length}`}
                action={(
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', px: 1.4, height: 38, width: { xs: 160, sm: 240 } }}>
                        <SearchRoundedIcon sx={{ fontSize: 18, color: '#98A0AE' }} />
                        <InputBase placeholder="Search departments…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ fontSize: 13, flex: 1 }} />
                    </Stack>
                )}
            >
                <Box sx={{ overflowX: 'auto' }}>
                    <Box component="table" sx={{ width: '100%', minWidth: 880, borderCollapse: 'collapse' }}>
                        <Box component="thead" sx={{ bgcolor: '#F4F3FB' }}>
                            <Box component="tr">
                                {['DEPARTMENT', 'CODE', 'DEPARTMENT HEAD', 'EMPLOYEES', 'DESIGNATIONS', 'STATUS', 'ACTIONS'].map((h) => (
                                    <Box component="th" key={h} sx={{ ...th, textAlign: h === 'ACTIONS' ? 'right' : 'left' }}>{h}</Box>
                                ))}
                            </Box>
                        </Box>
                        <Box component="tbody">
                            {filtered.map((d, i) => {
                                const s = stats[d.id] || {};
                                return (
                                    <Box component="tr" key={d.id} sx={{ bgcolor: i % 2 ? '#FBFAFE' : '#fff' }}>
                                        <Box component="td" sx={td}>
                                            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{d.name}</Typography>
                                            {d.description && <Typography sx={{ fontSize: 11.5, color: '#98A0AE' }} noWrap>{d.description}</Typography>}
                                        </Box>
                                        <Box component="td" sx={td}>
                                            <Chip label={d.code || '—'} size="small" sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: PRIMARY_LIGHT, color: PRIMARY }} />
                                        </Box>
                                        <Box component="td" sx={td}>
                                            {d.head ? (
                                                <Stack direction="row" spacing={1.1} sx={{ alignItems: 'center' }}>
                                                    <Avatar sx={{ width: 30, height: 30, bgcolor: colorFor(d.head), fontSize: 11.5, fontWeight: 700 }}>{initials(d.head)}</Avatar>
                                                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{d.head}</Typography>
                                                </Stack>
                                            ) : <Typography sx={{ fontSize: 12.5, color: '#C4C9D4', fontStyle: 'italic' }}>Not assigned</Typography>}
                                        </Box>
                                        <Box component="td" sx={td}>
                                            <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{s.employees ?? 0}</Typography>
                                        </Box>
                                        <Box component="td" sx={td}>
                                            <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{s.designations ?? 0}</Typography>
                                        </Box>
                                        <Box component="td" sx={td}><StatusChip status={d.status} /></Box>
                                        <Box component="td" sx={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <Tooltip arrow title="Edit"><IconButton size="small" onClick={() => openEdit(d)} sx={{ color: '#94A3B8', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}><EditRoundedIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                                            <Tooltip arrow title="Remove"><IconButton size="small" onClick={() => setConfirm(d)} sx={{ ml: 0.5, color: '#94A3B8', '&:hover': { color: '#E11D48', bgcolor: '#FEF2F2' } }}><DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                    {filtered.length === 0 && (
                        <EmptyState
                            icon={AccountTreeRoundedIcon}
                            title={q ? 'No departments match that search' : 'No departments yet'}
                            hint={q ? 'Try a different name or code.' : 'Add your first department to start assigning employees.'}
                        />
                    )}
                </Box>
            </Panel>

            {/* Create / edit */}
            <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{dialog?.mode === 'edit' ? 'Edit Department' : 'New Department'}</Typography>
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
                            <TextField label="Department name" size="small" fullWidth value={form.name} onChange={set('name')}
                                error={tried && !valid} helperText={tried && nameTaken ? 'Already exists in this entity' : ' '} sx={field} />
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
                    <Button onClick={() => setDialog(null)} sx={{ ...ghostBtn, height: 40, px: 2 }}>Cancel</Button>
                    <Button onClick={submit} sx={{ ...solidBtn, height: 40, px: 2.4 }}>{dialog?.mode === 'edit' ? 'Save Changes' : 'Add Department'}</Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={Boolean(confirm)}
                onClose={() => setConfirm(null)}
                onConfirm={doDelete}
                title="Remove department?"
                body={confirm ? `${confirm.name} will be removed. Its ${stats[confirm.id]?.designations ?? 0} designation(s) become entity-wide, and ${stats[confirm.id]?.employees ?? 0} employee record(s) keep the department name already saved on them.` : ''}
                confirmLabel="Remove"
            />

            <Snackbar open={Boolean(snack)} autoHideDuration={3000} onClose={() => setSnack('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack('')} severity={/required|exists/.test(snack) ? 'warning' : 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack}</Alert>
            </Snackbar>
        </Box>
    );
}
