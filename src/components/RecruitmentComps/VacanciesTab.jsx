import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Box, Typography, Grid, Button, Stack, Chip, IconButton, Tooltip, InputBase, LinearProgress, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, InputAdornment, Snackbar, Alert,
} from '@mui/material';
import WorkOutlineRoundedIcon from '@mui/icons-material/WorkOutlineRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { useSelector } from 'react-redux';
import { selectActiveEntity, selectActiveEntityId, ALL_ENTITY_ID } from '../../redux/slices/orgSlice';
import { PRIMARY, PRIMARY_LIGHT } from '../../theme';
import { inr } from '../../utils/format';
import { solidBtn, ghostBtn, field, Panel, EmptyState, ConfirmDialog } from '../uiKit';
import http, { apiErrorMessage } from '../../Api/http';
import { GetVacancies, CreateVacancy, UpdateVacancy, SetVacancyStatus, DeleteVacancy, GetDepartments, GetDesignations } from '../../Api/Api';

const PRIORITIES = [
    { key: 'High', color: '#E11D48', bg: '#FEE2E2' },
    { key: 'Medium', color: '#B45309', bg: '#FFF7ED' },
    { key: 'Low', color: '#0369A1', bg: '#E0F2FE' },
];
const TYPES = ['Permanent', 'Contract', 'Internship', 'Part-Time'];
const EXPERIENCE = ['0-1 yrs', '1-3 yrs', '2-4 yrs', '4-7 yrs', '5-8 yrs', '8+ yrs'];

const EMPTY = {
    title: '', department: '', designation: '', openings: 1, experience: '1-3 yrs',
    location: '', employmentType: 'Permanent', minSalary: '', maxSalary: '',
    priority: 'Medium', hiringManager: '', description: '',
};

// Map one API vacancy onto the shape this tab renders. Dates arrive
// display-ready ("17 Jul 2026") and the applicant count is server-computed.
const normalizeVacancy = (v) => ({
    id: v.id,
    title: v.roleTitle ?? '',
    department: v.department ?? '',
    designation: v.designation ?? '',
    employmentType: v.employmentType ?? '',
    priority: v.priority ?? 'Medium',
    status: v.status ?? 'Open',
    openings: Number(v.openings) || 0,
    filled: Number(v.filled) || 0,
    applicants: Number(v.applicants) || 0,
    experience: v.experienceRange ?? '',
    minSalary: Number(v.minSalary) || 0,
    maxSalary: Number(v.maxSalary) || 0,
    location: v.location ?? '',
    hiringManager: v.hiringManager ?? '',
    description: v.description ?? '',
    postedOn: v.postedOn ?? '',
    closedOn: v.closedOn ?? '',
});

// Departments and designations come back in the same envelope: entity-scoped rows
// carrying an isActive flag. Both pickers only ever need the distinct live names
// for the entity being worked in. A rejected call yields an empty list.
const namesFrom = (settled, key, activeEntityId) => {
    const body = settled.status === 'fulfilled' ? settled.value?.data : null;
    if (!body || body.error) return [];
    const rows = Array.isArray(body?.data?.[key]) ? body.data[key] : [];
    const scoped = activeEntityId === ALL_ENTITY_ID
        ? rows
        : rows.filter((r) => String(r.entityId) === String(activeEntityId));
    return [...new Set(
        scoped.filter((r) => r.isActive !== false).map((r) => (r.name || '').trim()).filter(Boolean),
    )].sort((a, b) => a.localeCompare(b));
};

export default function VacanciesTab() {
    const entity = useSelector(selectActiveEntity);
    const activeEntityId = useSelector(selectActiveEntityId);

    const [departments, setDepartments] = useState([]);
    const [designations, setDesignations] = useState([]);
    const [optionsLoading, setOptionsLoading] = useState(true);

    const [vacancies, setVacancies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [statusBusy, setStatusBusy] = useState(null);   // vacancy id whose status is changing

    const [q, setQ] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dialog, setDialog] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [tried, setTried] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [snack, setSnack] = useState(null);             // { msg, sev }

    const notify = (msg, sev = 'success') => setSnack({ msg, sev });

    const loadVacancies = useCallback(async () => {
        setLoading(true);
        try {
            const { data: body } = await http.get(GetVacancies);
            if (body?.error) throw new Error(body.message || 'Could not load vacancies.');
            const list = Array.isArray(body?.data?.vacancies) ? body.data.vacancies : [];
            setVacancies(list.map(normalizeVacancy));
            setLoadError('');
        } catch (err) {
            setLoadError(apiErrorMessage(err, 'Could not load vacancies.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadVacancies(); }, [loadVacancies]);

    // Both pickers are fed by the Organisation module's own lists rather than the
    // org slice — the slice still holds seed rows keyed to seed entity ids, so
    // once the sidebar hydrates real entities nothing matches and the dropdowns
    // come up empty. Fetched together; one failing doesn't blank the other.
    const loadOrgOptions = useCallback(async () => {
        setOptionsLoading(true);
        const [deptRes, desigRes] = await Promise.allSettled([
            http.get(GetDepartments),
            http.get(GetDesignations),
        ]);
        setDepartments(namesFrom(deptRes, 'departments', activeEntityId));
        setDesignations(namesFrom(desigRes, 'designations', activeEntityId));
        setOptionsLoading(false);
    }, [activeEntityId]);

    useEffect(() => { loadOrgOptions(); }, [loadOrgOptions]);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        return vacancies.filter((v) => {
            if (statusFilter !== 'all' && v.status !== statusFilter) return false;
            if (!s) return true;
            return [v.title, v.department, v.designation, v.location, v.hiringManager].some((x) => String(x || '').toLowerCase().includes(s));
        });
    }, [vacancies, q, statusFilter]);

    // Editing an older vacancy can surface a department or designation that has
    // since been renamed or deactivated. Keep it in the list so MUI doesn't blank
    // the select (and warn about an out-of-range value) the moment it opens.
    const departmentOptions = useMemo(() => (
        form.department && !departments.includes(form.department) ? [...departments, form.department] : departments
    ), [departments, form.department]);
    const designationOptions = useMemo(() => (
        form.designation && !designations.includes(form.designation) ? [...designations, form.designation] : designations
    ), [designations, form.designation]);

    const openCreate = () => { setForm(EMPTY); setTried(false); setDialog({ mode: 'create' }); };
    const openEdit = (v) => {
        setForm({ ...EMPTY, ...v, minSalary: String(v.minSalary || ''), maxSalary: String(v.maxSalary || '') });
        setTried(false);
        setDialog({ mode: 'edit', id: v.id });
    };
    const closeDialog = () => { if (!saving) setDialog(null); };
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const openingsNum = Number(form.openings) || 0;
    const minNum = Number(form.minSalary) || 0;
    const maxNum = Number(form.maxSalary) || 0;
    const salaryBad = minNum > 0 && maxNum > 0 && maxNum < minNum;

    const valid = form.title.trim() && form.department && openingsNum > 0 && !salaryBad;

    // A vacancy is always opened under exactly one company, and the API reads that
    // from the X-Entity-Id header rather than the body. The sidebar's "All entities"
    // mode has no single id to send, so creating is blocked until one is picked.
    const submit = async () => {
        setTried(true);
        if (dialog?.mode !== 'edit' && (!activeEntityId || activeEntityId === ALL_ENTITY_ID)) {
            notify('Pick a single business entity in the sidebar before opening a vacancy.', 'warning');
            return;
        }
        if (!valid) {
            notify(salaryBad ? 'The maximum salary cannot be below the minimum.'
                : !form.title.trim() ? 'Give the role a title.'
                    : !form.department ? 'Pick the department this role sits in.'
                        : 'A vacancy needs at least one opening.', 'warning');
            return;
        }

        const payload = {
            roleTitle: form.title.trim(),
            openings: openingsNum,
            department: form.department,
            designation: form.designation || '',
            experienceRange: form.experience,
            employmentType: form.employmentType,
            priority: form.priority,
            minSalary: minNum,
            maxSalary: maxNum,
            location: form.location || '',
            hiringManager: form.hiringManager || '',
            description: form.description || '',
        };

        setSaving(true);
        try {
            const { data: body } = dialog.mode === 'edit'
                ? await http.put(UpdateVacancy, { id: dialog.id, ...payload })
                : await http.post(CreateVacancy, payload);
            if (body?.error) throw new Error(body.message || 'Could not save the vacancy.');
            notify(body?.message || (dialog.mode === 'edit'
                ? `${payload.roleTitle} updated.`
                : `${payload.roleTitle} opened — ${openingsNum} position${openingsNum === 1 ? '' : 's'}.`));
            setDialog(null);
            await loadVacancies();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not save the vacancy.'), 'error');
        } finally {
            setSaving(false);
        }
    };

    const setStatus = async (v, status) => {
        if (statusBusy) return;
        setStatusBusy(v.id);
        try {
            const { data: body } = await http.put(SetVacancyStatus, { id: v.id, status });
            if (body?.error) throw new Error(body.message || 'Could not update the vacancy.');
            notify(body?.message || `${v.title} ${status === 'Closed' ? 'closed' : 'reopened'}.`);
            await loadVacancies();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not update the vacancy.'), 'error');
        } finally {
            setStatusBusy(null);
        }
    };

    const doDelete = async () => {
        if (!confirm || deleting) return;
        setDeleting(true);
        try {
            const { data: body } = await http.delete(DeleteVacancy, { params: { id: confirm.id } });
            if (body?.error) throw new Error(body.message || 'Could not remove the vacancy.');
            notify(body?.message || `${confirm.title} removed.`);
            setConfirm(null);
            await loadVacancies();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not remove the vacancy.'), 'error');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Box sx={{ p: 2, pt: 1.5 }}>
            <Panel
                title="Vacancies"
                icon={WorkOutlineRoundedIcon}
                chip={`${filtered.length} of ${vacancies.length}`}
                action={(
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <TextField
                            select size="small" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                            sx={{ ...field, width: 140, '& .MuiOutlinedInput-root': { ...field['& .MuiOutlinedInput-root'], height: 38, bgcolor: '#fff' } }}
                        >
                            <MenuItem value="all" sx={{ fontSize: 13 }}>All statuses</MenuItem>
                            <MenuItem value="Open" sx={{ fontSize: 13 }}>Open</MenuItem>
                            <MenuItem value="Closed" sx={{ fontSize: 13 }}>Closed</MenuItem>
                        </TextField>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', px: 1.4, height: 38, width: { xs: 140, sm: 200 } }}>
                            <SearchRoundedIcon sx={{ fontSize: 18, color: '#98A0AE' }} />
                            <InputBase placeholder="Search roles…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ fontSize: 13, flex: 1 }} />
                        </Stack>
                        <Tooltip arrow title="Reload">
                            <IconButton onClick={loadVacancies} disabled={loading} sx={{ border: '1px solid #E6EAF1', borderRadius: '7px', color: '#64748B', height: 38, width: 38, '&:hover': { bgcolor: PRIMARY_LIGHT, color: PRIMARY } }}>
                                <RefreshRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                        <Button startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ ...solidBtn, height: 38, px: 1.8, fontSize: 13 }}>New Vacancy</Button>
                    </Stack>
                )}
            >
                {loading ? (
                    <Box sx={{ p: 5, display: 'flex', justifyContent: 'center' }}><CircularProgress size={26} /></Box>
                ) : loadError ? (
                    <Box sx={{ p: 3 }}>
                        <Alert severity="error" sx={{ borderRadius: '9px' }}
                            action={<Button size="small" onClick={loadVacancies} sx={{ textTransform: 'none', fontWeight: 700 }}>Retry</Button>}>
                            {loadError}
                        </Alert>
                    </Box>
                ) : filtered.length === 0 ? (
                    <EmptyState
                        icon={WorkOutlineRoundedIcon}
                        title={q || statusFilter !== 'all' ? 'No vacancies match these filters' : 'No vacancies yet'}
                        hint={q || statusFilter !== 'all' ? 'Clear the search or switch the status filter.' : 'Open a role, add candidates against it, then schedule their interviews.'}
                    />
                ) : (
                    <Box sx={{ p: 1.8 }}>
                        <Grid container spacing={1.5}>
                            {filtered.map((v) => {
                                const prio = PRIORITIES.find((p) => p.key === v.priority) || PRIORITIES[1];
                                const closed = v.status === 'Closed';
                                const remaining = Math.max(0, v.openings - v.filled);
                                const pct = v.openings ? Math.round((v.filled / v.openings) * 100) : 0;
                                const busy = statusBusy === v.id;
                                return (
                                    <Grid size={{ xs: 12, md: 6, xl: 4 }} key={v.id}>
                                        <Box sx={{
                                            height: '100%', border: '1px solid #EEF0F6', borderRadius: '9px', p: 1.8, bgcolor: closed ? '#FBFBFD' : '#fff',
                                            display: 'flex', flexDirection: 'column', gap: 1.2, opacity: closed ? 0.85 : 1,
                                            transition: 'border-color .15s, box-shadow .15s, transform .15s',
                                            '&:hover': { borderColor: '#C9BEFB', boxShadow: '0 10px 24px -14px rgba(124,92,252,0.5)', transform: 'translateY(-2px)' },
                                        }}>
                                            {/* Title row */}
                                            <Stack direction="row" spacing={1.2} sx={{ alignItems: 'flex-start' }}>
                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                    <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                                                        <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }} noWrap>{v.title}</Typography>
                                                        <Chip label={v.priority} size="small" sx={{ height: 18, fontSize: 9.5, fontWeight: 800, bgcolor: prio.bg, color: prio.color }} />
                                                        {closed && <Chip label="Closed" size="small" sx={{ height: 18, fontSize: 9.5, fontWeight: 800, bgcolor: '#F1F5F9', color: '#64748B' }} />}
                                                    </Stack>
                                                    <Typography sx={{ fontSize: 12, color: '#98A0AE', mt: 0.2 }} noWrap>
                                                        {v.department}{v.designation ? ` · ${v.designation}` : ''} · {v.employmentType}
                                                    </Typography>
                                                </Box>
                                                <Stack direction="row" spacing={0.2}>
                                                    <Tooltip arrow title="Edit"><IconButton size="small" onClick={() => openEdit(v)} sx={{ color: '#94A3B8', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}><EditRoundedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                                    <Tooltip arrow title="Remove"><IconButton size="small" onClick={() => setConfirm(v)} sx={{ color: '#94A3B8', '&:hover': { color: '#E11D48', bgcolor: '#FEF2F2' } }}><DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                                </Stack>
                                            </Stack>

                                            {/* Hiring progress */}
                                            <Box>
                                                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#16A34A' }}>{v.filled} of {v.openings} filled</Typography>
                                                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: remaining ? PRIMARY : '#16A34A' }}>
                                                        {remaining ? `${remaining} still open` : 'All filled'}
                                                    </Typography>
                                                </Stack>
                                                <LinearProgress variant="determinate" value={pct} sx={{ height: 7, borderRadius: 5, bgcolor: '#EEF0F6', '& .MuiLinearProgress-bar': { bgcolor: pct === 100 ? '#16A34A' : PRIMARY, borderRadius: 5 } }} />
                                            </Box>

                                            {/* Facts */}
                                            <Grid container spacing={1.2}>
                                                {[
                                                    ['Experience', v.experience],
                                                    ['Salary', salaryBand(v)],
                                                    ['Location', v.location],
                                                    ['Applicants', String(v.applicants)],
                                                ].map(([l, val]) => (
                                                    <Grid size={6} key={l}>
                                                        <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: '#98A0AE', textTransform: 'uppercase', letterSpacing: 0.4 }}>{l}</Typography>
                                                        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: val ? '#334155' : '#C4C9D4' }} noWrap>{val || '—'}</Typography>
                                                    </Grid>
                                                ))}
                                            </Grid>

                                            {v.description && (
                                                <Typography sx={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, flexGrow: 1 }}>{v.description}</Typography>
                                            )}

                                            {/* Footer */}
                                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', pt: 1.2, borderTop: '1px solid #F1F0F9', flexWrap: 'wrap', gap: 1 }}>
                                                {v.hiringManager && (
                                                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                                        <PersonRoundedIcon sx={{ fontSize: 14, color: '#CBD2DD' }} />
                                                        <Typography sx={{ fontSize: 11, color: '#98A0AE' }} noWrap>{v.hiringManager}</Typography>
                                                    </Stack>
                                                )}
                                                <Typography sx={{ fontSize: 11, color: '#98A0AE', flex: 1 }} noWrap>
                                                    {closed ? (v.closedOn ? `Closed ${v.closedOn}` : 'Closed') : (v.postedOn ? `Posted ${v.postedOn}` : '')}
                                                </Typography>
                                                {closed ? (
                                                    <Button onClick={() => setStatus(v, 'Open')} disabled={busy} startIcon={busy ? <CircularProgress size={13} /> : <ReplayRoundedIcon sx={{ fontSize: 15 }} />} sx={{ ...ghostBtn, height: 30, px: 1.2, fontSize: 11.5 }}>Reopen</Button>
                                                ) : (
                                                    <Button onClick={() => setStatus(v, 'Closed')} disabled={busy} startIcon={busy ? <CircularProgress size={13} /> : <LockRoundedIcon sx={{ fontSize: 15 }} />} sx={{ ...ghostBtn, height: 30, px: 1.2, fontSize: 11.5 }}>Close</Button>
                                                )}
                                            </Stack>
                                        </Box>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </Box>
                )}
            </Panel>

            {/* Create / edit */}
            <Dialog open={Boolean(dialog)} onClose={closeDialog} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{dialog?.mode === 'edit' ? 'Edit Vacancy' : 'New Vacancy'}</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>
                        Opened under <strong>{entity?.name || '—'}</strong>. Candidates and interviews hang off this role.
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    <Grid container spacing={1.8}>
                        <Grid size={{ xs: 12, sm: 8 }}>
                            <TextField label="Role title" size="small" fullWidth value={form.title} onChange={set('title')}
                                error={tried && !form.title.trim()} placeholder="e.g. Senior React Engineer" sx={field} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Openings" type="number" size="small" fullWidth value={form.openings} onChange={set('openings')}
                                error={tried && openingsNum <= 0} slotProps={{ htmlInput: { min: 1 } }} sx={field} />
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField select label="Department" size="small" fullWidth value={form.department} onChange={set('department')}
                                error={tried && !form.department} disabled={optionsLoading} sx={field}
                                helperText={optionsLoading ? 'Loading departments…'
                                    : departmentOptions.length === 0 ? 'No departments in this entity yet — add one under Organisation.' : ' '}>
                                {departmentOptions.map((d) => <MenuItem key={d} value={d} sx={{ fontSize: 13.5 }}>{d}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField select label="Designation" size="small" fullWidth value={form.designation} onChange={set('designation')}
                                disabled={optionsLoading} sx={field}
                                helperText={optionsLoading ? 'Loading designations…'
                                    : designationOptions.length === 0 ? 'No designations in this entity yet — add one under Organisation.' : ' '}>
                                <MenuItem value="" sx={{ fontSize: 13.5 }}><em>—</em></MenuItem>
                                {designationOptions.map((d) => <MenuItem key={d} value={d} sx={{ fontSize: 13.5 }}>{d}</MenuItem>)}
                            </TextField>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField select label="Experience" size="small" fullWidth value={form.experience} onChange={set('experience')} sx={field}>
                                {EXPERIENCE.map((e) => <MenuItem key={e} value={e} sx={{ fontSize: 13.5 }}>{e}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField select label="Type" size="small" fullWidth value={form.employmentType} onChange={set('employmentType')} sx={field}>
                                {TYPES.map((t) => <MenuItem key={t} value={t} sx={{ fontSize: 13.5 }}>{t}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField select label="Priority" size="small" fullWidth value={form.priority} onChange={set('priority')} sx={field}>
                                {PRIORITIES.map((p) => <MenuItem key={p.key} value={p.key} sx={{ fontSize: 13.5 }}>{p.key}</MenuItem>)}
                            </TextField>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Minimum salary (per year)" type="number" size="small" fullWidth value={form.minSalary} onChange={set('minSalary')}
                                slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }} sx={field} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Maximum salary (per year)" type="number" size="small" fullWidth value={form.maxSalary} onChange={set('maxSalary')}
                                error={tried && salaryBad} helperText={salaryBad ? 'Must be at least the minimum.' : ' '}
                                slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }} sx={field} />
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Location" size="small" fullWidth value={form.location} onChange={set('location')}
                                slotProps={{ input: { startAdornment: <InputAdornment position="start"><PlaceRoundedIcon sx={{ fontSize: 17, color: '#94A3B8' }} /></InputAdornment> } }} sx={field} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Hiring manager" size="small" fullWidth value={form.hiringManager} onChange={set('hiringManager')}
                                slotProps={{ input: { startAdornment: <InputAdornment position="start"><PersonRoundedIcon sx={{ fontSize: 17, color: '#94A3B8' }} /></InputAdornment> } }} sx={field} />
                        </Grid>

                        <Grid size={12}>
                            <TextField label="Description (optional)" size="small" fullWidth multiline minRows={2} value={form.description} onChange={set('description')} sx={field} />
                        </Grid>

                        {dialog?.mode === 'edit' && (
                            <Grid size={12}>
                                <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', p: 1.4, borderRadius: '8px', bgcolor: '#F8FAFC', border: '1px solid #EEF1F6' }}>
                                    <GroupsRoundedIcon sx={{ fontSize: 17, color: '#94A3B8' }} />
                                    <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                                        <strong>{form.filled ?? 0}</strong> of {openingsNum} already filled. Positions fill when a selected candidate is marked as joined — not from this form.
                                    </Typography>
                                </Stack>
                            </Grid>
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={closeDialog} disabled={saving} sx={{ ...ghostBtn, height: 40, px: 2 }}>Cancel</Button>
                    <Button onClick={submit} disabled={saving} startIcon={saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null} sx={{ ...solidBtn, height: 40, px: 2.4 }}>
                        {saving ? 'Saving…' : dialog?.mode === 'edit' ? 'Save Changes' : 'Open Vacancy'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={Boolean(confirm)}
                onClose={() => { if (!deleting) setConfirm(null); }}
                onConfirm={doDelete}
                title="Remove this vacancy?"
                body={confirm ? `${confirm.title} will be removed, along with its ${confirm.applicants} candidate(s) and every interview scheduled against it. This cannot be undone.` : ''}
                confirmLabel="Remove vacancy"
            />

            <Snackbar open={Boolean(snack)} autoHideDuration={3400} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack(null)} severity={snack?.sev || 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack?.msg}</Alert>
            </Snackbar>
        </Box>
    );
}

// Salary band, or an empty string when the range was never filled in.
function salaryBand(v) {
    if (!v.minSalary && !v.maxSalary) return '';
    if (v.minSalary && v.maxSalary) return `${inr(v.minSalary)} – ${inr(v.maxSalary)}`;
    return inr(v.minSalary || v.maxSalary);
}
