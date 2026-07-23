import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Box, Typography, Grid, Button, Stack, Chip, Avatar, IconButton, Tooltip, InputBase, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, InputAdornment, Snackbar, Alert,
    Menu, ListItemIcon,
} from '@mui/material';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import CallRoundedIcon from '@mui/icons-material/CallRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { inr, initialsFromName as initials, paletteColor as colorFor } from '../../utils/format';
import { solidBtn, ghostBtn, field, th, td, Panel, EmptyState, ConfirmDialog } from '../uiKit';
import http, { apiErrorMessage } from '../../Api/http';
import { GetCandidates, AddCandidate, UpdateCandidate, SetCandidateStage, DeleteCandidate, GetVacancies } from '../../Api/Api';

const SOURCES = ['Referral', 'LinkedIn', 'Naukri', 'Walk-in', 'Career Page', 'Agency', 'Other'];
const NOTICE = ['Immediate', '15 days', '30 days', '60 days', '90 days'];

// The candidate's position in the funnel — keyed by the API's stage string
// (lowercased, spaces → hyphens: "On Hold" → "on-hold").
const STAGES = {
    applied: { label: 'Applied', color: '#64748B', bg: '#F1F5F9' },
    interviewing: { label: 'Interviewing', color: '#0369A1', bg: '#E0F2FE' },
    'on-hold': { label: 'On Hold', color: '#B45309', bg: '#FFF7ED' },
    selected: { label: 'Selected', color: '#16A34A', bg: '#DCFCE7' },
    joined: { label: 'Joined', color: '#15803D', bg: '#DCFCE7' },
    rejected: { label: 'Rejected', color: '#E11D48', bg: '#FEE2E2' },
};
const stageKey = (s) => {
    const t = String(s || '').toLowerCase().replace(/\s+/g, '-');
    return STAGES[t] ? t : 'applied';
};
// The proper-case value SetCandidateStage expects for each stage key.
const STAGE_API = {
    applied: 'Applied', interviewing: 'Interviewing', 'on-hold': 'On Hold',
    selected: 'Selected', joined: 'Joined', rejected: 'Rejected',
};
const STAGE_ORDER = ['applied', 'interviewing', 'on-hold', 'selected', 'joined', 'rejected'];

const EMPTY = {
    vacancyId: '', name: '', email: '', phone: '', experience: '', currentCompany: '',
    expectedSalary: '', noticePeriod: '30 days', source: 'Referral',
};

const normalizeCandidate = (c) => ({
    id: c.id,
    vacancyId: c.vacancyId,
    vacancyTitle: c.vacancyTitle ?? '',
    name: c.fullName ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    currentCompany: c.currentCompany ?? '',
    isFresher: Boolean(c.isFresher),
    experienceYears: Number(c.experienceYears) || 0,
    expectedSalary: Number(c.expectedSalary) || 0,
    noticePeriod: c.noticePeriod ?? '',
    source: c.source ?? '',
    stage: stageKey(c.stage),
    appliedOn: c.appliedOn ?? '',
    rejectReason: c.rejectReason ?? null,
    roundsDecided: Number(c.roundsDecided) || 0,
    roundsTotal: Number(c.roundsTotal) || 0,
});

const expText = (c) => (c.isFresher || c.experienceYears === 0 ? 'Fresher' : `${c.experienceYears} yr${c.experienceYears === 1 ? '' : 's'}`);

export default function CandidatesTab() {
    const [candidates, setCandidates] = useState([]);
    const [openVacancies, setOpenVacancies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [saving, setSaving] = useState(false);

    const [q, setQ] = useState('');
    const [stageFilter, setStageFilter] = useState('all');
    const [dialog, setDialog] = useState(null);      // { mode: 'create' | 'edit', id? }
    const [form, setForm] = useState(EMPTY);
    const [tried, setTried] = useState(false);
    const [snack, setSnack] = useState(null);        // { msg, sev }

    const [stageAnchor, setStageAnchor] = useState(null);
    const [stageTarget, setStageTarget] = useState(null);   // candidate whose stage is changing
    const [reject, setReject] = useState(null);             // candidate being rejected
    const [rejectReason, setRejectReason] = useState('');
    const [confirm, setConfirm] = useState(null);           // candidate pending deletion
    const [busyId, setBusyId] = useState(null);             // row action (stage/delete) in flight
    const [deleting, setDeleting] = useState(false);

    const notify = (msg, sev = 'success') => setSnack({ msg, sev });

    const loadCandidates = useCallback(async () => {
        setLoading(true);
        try {
            const { data: body } = await http.get(GetCandidates);
            if (body?.error) throw new Error(body.message || 'Could not load candidates.');
            const list = Array.isArray(body?.data?.candidates) ? body.data.candidates : [];
            setCandidates(list.map(normalizeCandidate));
            setLoadError('');
        } catch (err) {
            setLoadError(apiErrorMessage(err, 'Could not load candidates.'));
        } finally {
            setLoading(false);
        }
    }, []);

    // Open vacancies feed the "Applying for" picker in the add dialog.
    const loadVacancies = useCallback(async () => {
        try {
            const { data: body } = await http.get(GetVacancies);
            if (body?.error) return;
            const list = Array.isArray(body?.data?.vacancies) ? body.data.vacancies : [];
            setOpenVacancies(list
                .filter((v) => v.status === 'Open')
                .map((v) => ({ id: v.id, title: v.roleTitle, department: v.department, open: Math.max(0, (Number(v.openings) || 0) - (Number(v.filled) || 0)) })));
        } catch { /* picker just stays empty */ }
    }, []);

    useEffect(() => { loadCandidates(); loadVacancies(); }, [loadCandidates, loadVacancies]);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        return candidates.filter((c) => {
            if (stageFilter !== 'all' && c.stage !== stageFilter) return false;
            if (!s) return true;
            return [c.name, c.email, c.phone, c.currentCompany, c.vacancyTitle].some((x) => String(x || '').toLowerCase().includes(s));
        });
    }, [candidates, q, stageFilter]);

    const openCreate = () => { setForm(EMPTY); setTried(false); setDialog({ mode: 'create' }); };
    const openEdit = (c) => {
        setForm({
            vacancyId: c.vacancyId,
            name: c.name,
            email: c.email,
            phone: c.phone,
            experience: c.experienceYears ? String(c.experienceYears) : '',
            currentCompany: c.currentCompany,
            expectedSalary: c.expectedSalary ? String(c.expectedSalary) : '',
            noticePeriod: c.noticePeriod || '30 days',
            source: c.source || 'Referral',
        });
        setTried(false);
        setDialog({ mode: 'edit', id: c.id, vacancyTitle: c.vacancyTitle });
    };
    const closeDialog = () => { if (!saving) setDialog(null); };
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    // The picker lists open vacancies; when editing, the candidate's current
    // vacancy is prepended so it stays selectable even if it's now closed.
    const vacancyOptions = useMemo(() => {
        if (dialog?.mode === 'edit' && form.vacancyId && !openVacancies.some((v) => v.id === form.vacancyId)) {
            return [{ id: form.vacancyId, title: dialog.vacancyTitle || 'Current vacancy', department: '', open: 0, closed: true }, ...openVacancies];
        }
        return openVacancies;
    }, [dialog, form.vacancyId, openVacancies]);

    const valid = form.name.trim() && form.vacancyId;

    const submit = async () => {
        setTried(true);
        if (!valid) { notify(!form.name.trim() ? 'The candidate needs a name.' : 'Pick the vacancy they are applying for.', 'warning'); return; }

        const payload = {
            vacancyId: form.vacancyId,
            fullName: form.name.trim(),
            email: form.email || '',
            phone: form.phone || '',
            currentCompany: form.currentCompany || '',
            experience: Number(form.experience) || 0,
            expectedSalary: Number(form.expectedSalary) || 0,
            noticePeriod: form.noticePeriod,
            source: form.source,
        };

        const editing = dialog?.mode === 'edit';
        setSaving(true);
        try {
            const { data: body } = editing
                ? await http.put(UpdateCandidate, { id: dialog.id, ...payload })
                : await http.post(AddCandidate, payload);
            if (body?.error) throw new Error(body.message || 'Could not save the candidate.');
            const vacTitle = vacancyOptions.find((v) => v.id === form.vacancyId)?.title || 'the vacancy';
            notify(body?.message || (editing ? `${payload.fullName} updated.` : `${payload.fullName} added to ${vacTitle}.`));
            setDialog(null);
            await loadCandidates();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not save the candidate.'), 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Stage change ────────────────────────────────────────────────────────
    // Rejecting needs a reason, so it detours through a dialog; every other
    // stage is set straight away. `reason` only rides along on a reject.
    const setStage = async (candidate, key, reason = '') => {
        if (busyId) return;
        setBusyId(candidate.id);
        try {
            const { data: body } = await http.put(SetCandidateStage, {
                id: candidate.id,
                stage: STAGE_API[key],
                rejectReason: key === 'rejected' ? reason.trim() : '',
            });
            if (body?.error) throw new Error(body.message || 'Could not update the stage.');
            notify(body?.message || `${candidate.name} moved to ${STAGES[key].label}.`);
            setReject(null);
            setRejectReason('');
            await loadCandidates();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not update the stage.'), 'error');
        } finally {
            setBusyId(null);
        }
    };

    const pickStage = (key) => {
        const candidate = stageTarget;
        setStageAnchor(null);
        setStageTarget(null);
        if (!candidate || key === candidate.stage) return;
        if (key === 'rejected') { setRejectReason(''); setReject(candidate); return; }
        setStage(candidate, key);
    };

    const doDelete = async () => {
        if (!confirm || deleting) return;
        setDeleting(true);
        try {
            const { data: body } = await http.delete(DeleteCandidate, { params: { id: confirm.id } });
            if (body?.error) throw new Error(body.message || 'Could not remove the candidate.');
            notify(body?.message || `${confirm.name} removed.`);
            setConfirm(null);
            await loadCandidates();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not remove the candidate.'), 'error');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Box sx={{ p: 2, pt: 1.5 }}>
            <Panel
                title="Candidates"
                icon={PeopleAltRoundedIcon}
                chip={`${filtered.length} of ${candidates.length}`}
                action={(
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <TextField
                            select size="small" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}
                            sx={{ ...field, width: 150, '& .MuiOutlinedInput-root': { ...field['& .MuiOutlinedInput-root'], height: 38, bgcolor: '#fff' } }}
                        >
                            <MenuItem value="all" sx={{ fontSize: 13 }}>All stages</MenuItem>
                            {Object.entries(STAGES).map(([k, s]) => <MenuItem key={k} value={k} sx={{ fontSize: 13 }}>{s.label}</MenuItem>)}
                        </TextField>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', px: 1.4, height: 38, width: { xs: 140, sm: 200 } }}>
                            <SearchRoundedIcon sx={{ fontSize: 18, color: '#98A0AE' }} />
                            <InputBase placeholder="Search candidates…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ fontSize: 13, flex: 1 }} />
                        </Stack>
                        <Tooltip arrow title="Reload">
                            <IconButton onClick={() => { loadCandidates(); loadVacancies(); }} disabled={loading} sx={{ border: '1px solid #E6EAF1', borderRadius: '7px', color: '#64748B', height: 38, width: 38, '&:hover': { bgcolor: '#F1EEFE', color: '#7C5CFC' } }}>
                                <RefreshRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                        <Button startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ ...solidBtn, height: 38, px: 1.8, fontSize: 13 }}>Add Candidate</Button>
                    </Stack>
                )}
            >
                {loading ? (
                    <Box sx={{ p: 5, display: 'flex', justifyContent: 'center' }}><CircularProgress size={26} /></Box>
                ) : loadError ? (
                    <Box sx={{ p: 3 }}>
                        <Alert severity="error" sx={{ borderRadius: '9px' }}
                            action={<Button size="small" onClick={loadCandidates} sx={{ textTransform: 'none', fontWeight: 700 }}>Retry</Button>}>
                            {loadError}
                        </Alert>
                    </Box>
                ) : filtered.length === 0 ? (
                    <EmptyState
                        icon={PeopleAltRoundedIcon}
                        title={q || stageFilter !== 'all' ? 'No candidates match these filters' : 'No candidates yet'}
                        hint={q || stageFilter !== 'all' ? 'Clear the search or pick another stage.' : 'Add an applicant against an open vacancy, then schedule their first round.'}
                    />
                ) : (
                    <Box sx={{ overflowX: 'auto' }}>
                        <Box component="table" sx={{ width: '100%', minWidth: 940, borderCollapse: 'collapse' }}>
                            <Box component="thead" sx={{ bgcolor: '#F4F3FB' }}>
                                <Box component="tr">
                                    {['CANDIDATE', 'APPLIED FOR', 'EXPERIENCE', 'EXPECTED', 'ROUNDS', 'STAGE', 'ACTIONS'].map((h) => (
                                        <Box component="th" key={h} sx={{ ...th, textAlign: h === 'ACTIONS' ? 'right' : 'left' }}>{h}</Box>
                                    ))}
                                </Box>
                            </Box>
                            <Box component="tbody">
                                {filtered.map((c, i) => {
                                    const stage = STAGES[c.stage] || STAGES.applied;
                                    return (
                                        <Box component="tr" key={c.id} sx={{ bgcolor: i % 2 ? '#FBFAFE' : '#fff' }}>
                                            <Box component="td" sx={td}>
                                                <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center' }}>
                                                    <Avatar sx={{ width: 38, height: 38, bgcolor: colorFor(c.name), fontSize: 13, fontWeight: 700 }}>{initials(c.name)}</Avatar>
                                                    <Box sx={{ minWidth: 0 }}>
                                                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{c.name}</Typography>
                                                        <Typography sx={{ fontSize: 11, color: '#98A0AE' }} noWrap>{c.email || c.phone || '—'}</Typography>
                                                    </Box>
                                                </Stack>
                                            </Box>
                                            <Box component="td" sx={td}>
                                                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{c.vacancyTitle || 'Unknown role'}</Typography>
                                                <Typography sx={{ fontSize: 11, color: '#98A0AE' }}>{c.source}{c.appliedOn ? ` · applied ${c.appliedOn}` : ''}</Typography>
                                            </Box>
                                            <Box component="td" sx={td}>
                                                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{expText(c)}</Typography>
                                                <Typography sx={{ fontSize: 11, color: '#98A0AE' }} noWrap>{c.currentCompany || 'Fresher'}</Typography>
                                            </Box>
                                            <Box component="td" sx={td}>
                                                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{c.expectedSalary ? inr(c.expectedSalary) : '—'}</Typography>
                                                <Typography sx={{ fontSize: 11, color: '#98A0AE' }}>{c.noticePeriod || '—'} notice</Typography>
                                            </Box>
                                            <Box component="td" sx={td}>
                                                {c.roundsTotal === 0
                                                    ? <Typography sx={{ fontSize: 12, color: '#C4C9D4', fontStyle: 'italic' }}>Not scheduled</Typography>
                                                    : <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{c.roundsDecided} of {c.roundsTotal} decided</Typography>}
                                            </Box>
                                            <Box component="td" sx={td}>
                                                <Tooltip arrow title="Change stage">
                                                    <Chip
                                                        label={stage.label} size="small" clickable
                                                        disabled={busyId === c.id}
                                                        onClick={(e) => { setStageTarget(c); setStageAnchor(e.currentTarget); }}
                                                        onDelete={(e) => { setStageTarget(c); setStageAnchor(e.currentTarget); }}
                                                        deleteIcon={busyId === c.id ? <CircularProgress size={12} sx={{ color: stage.color }} /> : <KeyboardArrowDownRoundedIcon sx={{ fontSize: 15 }} />}
                                                        sx={{ height: 24, fontSize: 11, fontWeight: 700, bgcolor: stage.bg, color: stage.color, '& .MuiChip-deleteIcon': { color: stage.color, '&:hover': { color: stage.color } } }}
                                                    />
                                                </Tooltip>
                                                {c.stage === 'rejected' && c.rejectReason && (
                                                    <Tooltip arrow title={c.rejectReason}>
                                                        <Typography sx={{ fontSize: 10.5, color: '#E11D48', mt: 0.3, maxWidth: 150, cursor: 'help' }} noWrap>{c.rejectReason}</Typography>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                            <Box component="td" sx={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                <Tooltip arrow title="Edit">
                                                    <IconButton size="small" onClick={() => openEdit(c)} sx={{ color: '#94A3B8', '&:hover': { color: '#7C5CFC', bgcolor: '#F1EEFE' } }}><EditRoundedIcon sx={{ fontSize: 17 }} /></IconButton>
                                                </Tooltip>
                                                <Tooltip arrow title="Remove">
                                                    <IconButton size="small" onClick={() => setConfirm(c)} sx={{ ml: 0.4, color: '#94A3B8', '&:hover': { color: '#E11D48', bgcolor: '#FEF2F2' } }}><DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} /></IconButton>
                                                </Tooltip>
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </Box>
                    </Box>
                )}
            </Panel>

            {/* Add / edit candidate */}
            <Dialog open={Boolean(dialog)} onClose={closeDialog} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{dialog?.mode === 'edit' ? 'Edit Candidate' : 'Add Candidate'}</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>
                        {dialog?.mode === 'edit' ? 'Update the applicant’s details. Their stage is changed from the table.' : 'They start as Applied, and move to Interviewing once you schedule their first round.'}
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    <Grid container spacing={1.8}>
                        <Grid size={12}>
                            <TextField select label="Applying for" size="small" fullWidth value={form.vacancyId} onChange={set('vacancyId')}
                                error={tried && !form.vacancyId} sx={field}
                                helperText={vacancyOptions.length === 0 ? 'No open vacancies — open one on the Vacancies tab first.' : ' '}>
                                {vacancyOptions.map((v) => (
                                    <MenuItem key={v.id} value={v.id} sx={{ fontSize: 13.5 }}>
                                        {v.title}{v.department ? ` — ${v.department}` : ''}{v.closed ? ' (closed)' : ` (${v.open} open)`}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Full name" size="small" fullWidth value={form.name} onChange={set('name')} error={tried && !form.name.trim()} sx={field} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Email" size="small" fullWidth value={form.email} onChange={set('email')}
                                slotProps={{ input: { startAdornment: <InputAdornment position="start"><MailRoundedIcon sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> } }} sx={field} />
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Phone" size="small" fullWidth value={form.phone} onChange={set('phone')}
                                slotProps={{ input: { startAdornment: <InputAdornment position="start"><CallRoundedIcon sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> } }} sx={field} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Current company" size="small" fullWidth value={form.currentCompany} onChange={set('currentCompany')}
                                placeholder="Leave blank for a fresher"
                                slotProps={{ input: { startAdornment: <InputAdornment position="start"><BusinessRoundedIcon sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> } }} sx={field} />
                        </Grid>

                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Experience (years)" type="number" size="small" fullWidth value={form.experience} onChange={set('experience')} placeholder="e.g. 5" slotProps={{ htmlInput: { min: 0, step: 0.5 } }} sx={field} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Expected salary" type="number" size="small" fullWidth value={form.expectedSalary} onChange={set('expectedSalary')}
                                slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }} sx={field} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField select label="Notice period" size="small" fullWidth value={form.noticePeriod} onChange={set('noticePeriod')} sx={field}>
                                {NOTICE.map((n) => <MenuItem key={n} value={n} sx={{ fontSize: 13.5 }}>{n}</MenuItem>)}
                            </TextField>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField select label="Source" size="small" fullWidth value={form.source} onChange={set('source')} sx={field}>
                                {SOURCES.map((s) => <MenuItem key={s} value={s} sx={{ fontSize: 13.5 }}>{s}</MenuItem>)}
                            </TextField>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={closeDialog} disabled={saving} sx={{ ...ghostBtn, height: 40, px: 2 }}>Cancel</Button>
                    <Button onClick={submit} disabled={saving} startIcon={saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null} sx={{ ...solidBtn, height: 40, px: 2.4 }}>
                        {saving ? 'Saving…' : dialog?.mode === 'edit' ? 'Save Changes' : 'Add Candidate'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Stage picker */}
            <Menu anchorEl={stageAnchor} open={Boolean(stageAnchor)} onClose={() => { setStageAnchor(null); setStageTarget(null); }}
                slotProps={{ paper: { sx: { borderRadius: '9px', minWidth: 190 } } }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#9CA3AF', px: 1.5, py: 0.7, letterSpacing: 0.4 }}>MOVE TO STAGE</Typography>
                {STAGE_ORDER.map((key) => {
                    const s = STAGES[key];
                    const isCurrent = stageTarget?.stage === key;
                    return (
                        <MenuItem key={key} onClick={() => pickStage(key)} disabled={Boolean(busyId)} sx={{ fontSize: 13, gap: 1 }}>
                            <ListItemIcon sx={{ minWidth: 0 }}>
                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color }} />
                            </ListItemIcon>
                            {s.label}
                            {isCurrent && <CheckRoundedIcon sx={{ fontSize: 16, color: s.color, ml: 'auto' }} />}
                        </MenuItem>
                    );
                })}
            </Menu>

            {/* Reject reason */}
            <Dialog open={Boolean(reject)} onClose={() => { if (!busyId) setReject(null); }} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ pb: 0.5 }}>
                    <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>Reject candidate</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>{reject?.name}{reject?.vacancyTitle ? ` · ${reject.vacancyTitle}` : ''}</Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    <TextField label="Reason" size="small" fullWidth multiline minRows={3} autoFocus
                        placeholder="e.g. Salary expectations above band; strong profile — keep for future roles."
                        value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} sx={field} />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setReject(null)} disabled={Boolean(busyId)} sx={{ ...ghostBtn, height: 40, px: 2 }}>Cancel</Button>
                    <Button onClick={() => setStage(reject, 'rejected', rejectReason)} disabled={Boolean(busyId) || !rejectReason.trim()}
                        startIcon={busyId ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : null}
                        sx={{ height: 40, px: 2.4, fontWeight: 700, textTransform: 'none', borderRadius: '7px', bgcolor: '#DC2626', color: '#fff', '&:hover': { bgcolor: '#B91C1C' }, '&.Mui-disabled': { bgcolor: '#FCA5A5', color: '#fff' } }}>
                        {busyId ? 'Rejecting…' : 'Reject'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={Boolean(confirm)}
                onClose={() => { if (!deleting) setConfirm(null); }}
                onConfirm={doDelete}
                title="Remove this candidate?"
                body={confirm ? `${confirm.name} and their interview history for ${confirm.vacancyTitle || 'this vacancy'} will be removed. This cannot be undone.` : ''}
                confirmLabel="Remove"
            />

            <Snackbar open={Boolean(snack)} autoHideDuration={3400} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack(null)} severity={snack?.sev || 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack?.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
