import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Grid, Button, Stack, Chip, IconButton, Tooltip, InputBase, LinearProgress,
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
import { useSelector, useDispatch } from 'react-redux';
import {
    selectVacancies, selectCandidates, addVacancy, updateVacancy,
    closeVacancy, reopenVacancy, deleteVacancy,
} from '../../redux/slices/recruitmentSlice';
import { selectDepartmentNames, selectDesignationNames, selectActiveEntity, selectActiveEntityId } from '../../redux/slices/orgSlice';
import { PRIMARY, PRIMARY_LIGHT } from '../../theme';
import { inr, fmtDate } from '../../utils/format';
import { card, solidBtn, ghostBtn, field, Panel, EmptyState, ConfirmDialog } from '../uiKit';

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

export default function VacanciesTab() {
    const dispatch = useDispatch();
    const vacancies = useSelector(selectVacancies);
    const candidates = useSelector(selectCandidates);
    const departments = useSelector(selectDepartmentNames);
    const designations = useSelector(selectDesignationNames);
    const entity = useSelector(selectActiveEntity);
    const entityId = useSelector(selectActiveEntityId);

    const [q, setQ] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dialog, setDialog] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [tried, setTried] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [snack, setSnack] = useState('');

    // Applicants per vacancy — the number that tells you if a role is starving.
    const applicants = useMemo(() => {
        const map = {};
        vacancies.forEach((v) => { map[v.id] = candidates.filter((c) => c.vacancyId === v.id).length; });
        return map;
    }, [vacancies, candidates]);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        return vacancies.filter((v) => {
            if (statusFilter !== 'all' && v.status !== statusFilter) return false;
            if (!s) return true;
            return [v.title, v.department, v.designation, v.location, v.hiringManager].some((x) => String(x || '').toLowerCase().includes(s));
        });
    }, [vacancies, q, statusFilter]);

    const openCreate = () => { setForm(EMPTY); setTried(false); setDialog({ mode: 'create' }); };
    const openEdit = (v) => {
        setForm({ ...EMPTY, ...v, minSalary: String(v.minSalary || ''), maxSalary: String(v.maxSalary || '') });
        setTried(false);
        setDialog({ mode: 'edit', id: v.id });
    };
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const openingsNum = Number(form.openings) || 0;
    const minNum = Number(form.minSalary) || 0;
    const maxNum = Number(form.maxSalary) || 0;
    const salaryBad = minNum > 0 && maxNum > 0 && maxNum < minNum;

    const valid = form.title.trim() && form.department && openingsNum > 0 && !salaryBad;

    const submit = () => {
        setTried(true);
        if (!valid) {
            setSnack(salaryBad ? 'The maximum salary cannot be below the minimum.'
                : !form.title.trim() ? 'Give the role a title.'
                    : !form.department ? 'Pick the department this role sits in.'
                        : 'A vacancy needs at least one opening.');
            return;
        }

        const payload = {
            ...form,
            openings: openingsNum,
            minSalary: minNum,
            maxSalary: maxNum,
            entityId,
        };

        if (dialog.mode === 'create') {
            dispatch(addVacancy(payload));
            setSnack(`${form.title.trim()} opened — ${openingsNum} position${openingsNum === 1 ? '' : 's'}.`);
        } else {
            // `filled` is owned by the joining flow, never by this form.
            const { filled, status, postedOn, closedOn, id, ...changes } = payload;
            dispatch(updateVacancy({ id: dialog.id, changes }));
            setSnack(`${form.title.trim()} updated.`);
        }
        setDialog(null);
    };

    if (!entity) {
        return <Box sx={{ p: 2 }}><Box sx={{ ...card }}><EmptyState icon={WorkOutlineRoundedIcon} title="No business entity selected" hint="Vacancies belong to a company — create an entity first." /></Box></Box>;
    }

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
                        <Button startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ ...solidBtn, height: 38, px: 1.8, fontSize: 13 }}>New Vacancy</Button>
                    </Stack>
                )}
            >
                {filtered.length === 0 ? (
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
                                                    ['Salary', minNumOrDash(v)],
                                                    ['Location', v.location],
                                                    ['Applicants', String(applicants[v.id] ?? 0)],
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
                                                    {closed ? `Closed ${fmtDate(v.closedOn)}` : `Posted ${fmtDate(v.postedOn)}`}
                                                </Typography>
                                                {closed ? (
                                                    <Button onClick={() => { dispatch(reopenVacancy(v.id)); setSnack(`${v.title} reopened.`); }} startIcon={<ReplayRoundedIcon sx={{ fontSize: 15 }} />} sx={{ ...ghostBtn, height: 30, px: 1.2, fontSize: 11.5 }}>Reopen</Button>
                                                ) : (
                                                    <Button onClick={() => { dispatch(closeVacancy(v.id)); setSnack(`${v.title} closed.`); }} startIcon={<LockRoundedIcon sx={{ fontSize: 15 }} />} sx={{ ...ghostBtn, height: 30, px: 1.2, fontSize: 11.5 }}>Close</Button>
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
            <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{dialog?.mode === 'edit' ? 'Edit Vacancy' : 'New Vacancy'}</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>
                        Opened under <strong>{entity.name}</strong>. Candidates and interviews hang off this role.
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
                                error={tried && !form.department} sx={field}
                                helperText={departments.length === 0 ? 'No departments in this entity yet.' : ' '}>
                                {departments.map((d) => <MenuItem key={d} value={d} sx={{ fontSize: 13.5 }}>{d}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField select label="Designation" size="small" fullWidth value={form.designation} onChange={set('designation')} sx={field}>
                                <MenuItem value="" sx={{ fontSize: 13.5 }}><em>—</em></MenuItem>
                                {designations.map((d) => <MenuItem key={d} value={d} sx={{ fontSize: 13.5 }}>{d}</MenuItem>)}
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
                    <Button onClick={() => setDialog(null)} sx={{ ...ghostBtn, height: 40, px: 2 }}>Cancel</Button>
                    <Button onClick={submit} sx={{ ...solidBtn, height: 40, px: 2.4 }}>{dialog?.mode === 'edit' ? 'Save Changes' : 'Open Vacancy'}</Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={Boolean(confirm)}
                onClose={() => setConfirm(null)}
                onConfirm={() => { dispatch(deleteVacancy(confirm.id)); setSnack(`${confirm.title} removed.`); setConfirm(null); }}
                title="Remove this vacancy?"
                body={confirm ? `${confirm.title} will be removed, along with its ${applicants[confirm.id] ?? 0} candidate(s) and every interview scheduled against it. This cannot be undone.` : ''}
                confirmLabel="Remove vacancy"
            />

            <Snackbar open={Boolean(snack)} autoHideDuration={3400} onClose={() => setSnack('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack('')} severity={/cannot|Give|Pick|needs/.test(snack) ? 'warning' : 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack}</Alert>
            </Snackbar>
        </Box>
    );
}

// Salary band, or an em-dash when the range was never filled in.
function minNumOrDash(v) {
    if (!v.minSalary && !v.maxSalary) return '';
    if (v.minSalary && v.maxSalary) return `${inr(v.minSalary)} – ${inr(v.maxSalary)}`;
    return inr(v.minSalary || v.maxSalary);
}
