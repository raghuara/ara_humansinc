import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Grid, Button, Stack, Chip, Avatar, IconButton, Tooltip, InputBase,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, InputAdornment, Snackbar, Alert,
} from '@mui/material';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import CallRoundedIcon from '@mui/icons-material/CallRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import { useSelector, useDispatch } from 'react-redux';
import {
    selectCandidates, selectVacancies, selectInterviews,
    addCandidate, deleteCandidate, markJoined,
} from '../../redux/slices/recruitmentSlice';
import { inr, fmtDate, initialsFromName as initials, paletteColor as colorFor } from '../../utils/format';
import { solidBtn, ghostBtn, successBtn, field, th, td, Panel, EmptyState, ConfirmDialog } from '../uiKit';

const SOURCES = ['Referral', 'LinkedIn', 'Naukri', 'Walk-in', 'Career Page', 'Agency', 'Other'];
const NOTICE = ['Immediate', '15 days', '30 days', '60 days', '90 days'];

// The candidate's position in the funnel. `joined` is terminal and consumes a
// vacancy opening; `rejected` is terminal and carries the reason from the review.
const STAGES = {
    applied: { label: 'Applied', color: '#64748B', bg: '#F1F5F9' },
    interviewing: { label: 'Interviewing', color: '#0369A1', bg: '#E0F2FE' },
    'on-hold': { label: 'On Hold', color: '#B45309', bg: '#FFF7ED' },
    selected: { label: 'Selected', color: '#16A34A', bg: '#DCFCE7' },
    joined: { label: 'Joined', color: '#15803D', bg: '#DCFCE7' },
    rejected: { label: 'Rejected', color: '#E11D48', bg: '#FEE2E2' },
};

const EMPTY = {
    vacancyId: '', name: '', email: '', phone: '', experience: '', currentCompany: '',
    expectedSalary: '', noticePeriod: '30 days', source: 'Referral',
};

export default function CandidatesTab() {
    const dispatch = useDispatch();
    const candidates = useSelector(selectCandidates);
    const vacancies = useSelector(selectVacancies);
    const interviews = useSelector(selectInterviews);

    const [q, setQ] = useState('');
    const [stageFilter, setStageFilter] = useState('all');
    const [dialog, setDialog] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [tried, setTried] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [snack, setSnack] = useState('');

    const vacancyTitle = (id) => vacancies.find((v) => v.id === id)?.title || 'Unknown role';

    // How many rounds each candidate has been through — the quickest read on
    // where someone actually is, beyond their stage label.
    const rounds = useMemo(() => {
        const map = {};
        candidates.forEach((c) => {
            const mine = interviews.filter((i) => i.candidateId === c.id);
            map[c.id] = { total: mine.length, done: mine.filter((i) => i.outcome).length };
        });
        return map;
    }, [candidates, interviews]);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        return candidates.filter((c) => {
            if (stageFilter !== 'all' && c.status !== stageFilter) return false;
            if (!s) return true;
            return [c.name, c.email, c.phone, c.currentCompany, vacancyTitle(c.vacancyId)].some((x) => String(x || '').toLowerCase().includes(s));
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [candidates, vacancies, q, stageFilter]);

    const openVacancies = vacancies.filter((v) => v.status === 'Open');

    const openCreate = () => { setForm(EMPTY); setTried(false); setDialog(true); };
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const valid = form.name.trim() && form.vacancyId;

    const submit = () => {
        setTried(true);
        if (!valid) { setSnack(!form.name.trim() ? 'The candidate needs a name.' : 'Pick the vacancy they are applying for.'); return; }
        dispatch(addCandidate({ ...form, expectedSalary: Number(form.expectedSalary) || 0 }));
        setSnack(`${form.name.trim()} added to ${vacancyTitle(form.vacancyId)}.`);
        setDialog(false);
    };

    const join = (c) => {
        dispatch(markJoined(c.id));
        setSnack(`${c.name} marked as joined — one opening on ${vacancyTitle(c.vacancyId)} is now filled.`);
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
                        <Button startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ ...solidBtn, height: 38, px: 1.8, fontSize: 13 }}>Add Candidate</Button>
                    </Stack>
                )}
            >
                {filtered.length === 0 ? (
                    <EmptyState
                        icon={PeopleAltRoundedIcon}
                        title={q || stageFilter !== 'all' ? 'No candidates match these filters' : 'No candidates yet'}
                        hint={q || stageFilter !== 'all' ? 'Clear the search or pick another stage.' : 'Add an applicant against an open vacancy, then schedule their first round.'}
                    />
                ) : (
                    <Box sx={{ overflowX: 'auto' }}>
                        <Box component="table" sx={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse' }}>
                            <Box component="thead" sx={{ bgcolor: '#F4F3FB' }}>
                                <Box component="tr">
                                    {['CANDIDATE', 'APPLIED FOR', 'EXPERIENCE', 'EXPECTED', 'ROUNDS', 'STAGE', 'ACTIONS'].map((h) => (
                                        <Box component="th" key={h} sx={{ ...th, textAlign: h === 'ACTIONS' ? 'right' : 'left' }}>{h}</Box>
                                    ))}
                                </Box>
                            </Box>
                            <Box component="tbody">
                                {filtered.map((c, i) => {
                                    const stage = STAGES[c.status] || STAGES.applied;
                                    const r = rounds[c.id] || { total: 0, done: 0 };
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
                                                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{vacancyTitle(c.vacancyId)}</Typography>
                                                <Typography sx={{ fontSize: 11, color: '#98A0AE' }}>{c.source} · applied {fmtDate(c.appliedOn)}</Typography>
                                            </Box>
                                            <Box component="td" sx={td}>
                                                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{c.experience || '—'}</Typography>
                                                <Typography sx={{ fontSize: 11, color: '#98A0AE' }} noWrap>{c.currentCompany || 'Fresher'}</Typography>
                                            </Box>
                                            <Box component="td" sx={td}>
                                                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{c.expectedSalary ? inr(c.expectedSalary) : '—'}</Typography>
                                                <Typography sx={{ fontSize: 11, color: '#98A0AE' }}>{c.noticePeriod || '—'} notice</Typography>
                                            </Box>
                                            <Box component="td" sx={td}>
                                                {r.total === 0
                                                    ? <Typography sx={{ fontSize: 12, color: '#C4C9D4', fontStyle: 'italic' }}>Not scheduled</Typography>
                                                    : <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{r.done} of {r.total} decided</Typography>}
                                            </Box>
                                            <Box component="td" sx={td}>
                                                <Chip label={stage.label} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: stage.bg, color: stage.color }} />
                                                {c.status === 'rejected' && c.rejectReason && (
                                                    <Tooltip arrow title={c.rejectReason}>
                                                        <Typography sx={{ fontSize: 10.5, color: '#E11D48', mt: 0.3, maxWidth: 150, cursor: 'help' }} noWrap>{c.rejectReason}</Typography>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                            <Box component="td" sx={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                {c.status === 'selected' && (
                                                    <Tooltip arrow title="They accepted the offer and joined">
                                                        <Button onClick={() => join(c)} startIcon={<HowToRegRoundedIcon sx={{ fontSize: 16 }} />} sx={{ ...successBtn, height: 32, px: 1.4, fontSize: 11.5 }}>
                                                            Mark Joined
                                                        </Button>
                                                    </Tooltip>
                                                )}
                                                <Tooltip arrow title="Remove candidate">
                                                    <IconButton size="small" onClick={() => setConfirm(c)} sx={{ ml: 0.6, color: '#94A3B8', '&:hover': { color: '#E11D48', bgcolor: '#FEF2F2' } }}>
                                                        <DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />
                                                    </IconButton>
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

            {/* Add candidate */}
            <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Add Candidate</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>They start as <strong>Applied</strong>, and move to Interviewing once you schedule their first round.</Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    <Grid container spacing={1.8}>
                        <Grid size={12}>
                            <TextField select label="Applying for" size="small" fullWidth value={form.vacancyId} onChange={set('vacancyId')}
                                error={tried && !form.vacancyId} sx={field}
                                helperText={openVacancies.length === 0 ? 'No open vacancies — open one on the Vacancies tab first.' : ' '}>
                                {openVacancies.map((v) => (
                                    <MenuItem key={v.id} value={v.id} sx={{ fontSize: 13.5 }}>
                                        {v.title} — {v.department} ({Math.max(0, v.openings - v.filled)} open)
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
                            <TextField label="Experience" size="small" fullWidth value={form.experience} onChange={set('experience')} placeholder="e.g. 5 yrs" sx={field} />
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
                    <Button onClick={() => setDialog(false)} sx={{ ...ghostBtn, height: 40, px: 2 }}>Cancel</Button>
                    <Button onClick={submit} sx={{ ...solidBtn, height: 40, px: 2.4 }}>Add Candidate</Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={Boolean(confirm)}
                onClose={() => setConfirm(null)}
                onConfirm={() => { dispatch(deleteCandidate(confirm.id)); setSnack(`${confirm.name} removed.`); setConfirm(null); }}
                title="Remove this candidate?"
                body={confirm ? `${confirm.name} and their ${rounds[confirm.id]?.total ?? 0} scheduled interview(s) will be removed. This cannot be undone.` : ''}
                confirmLabel="Remove"
            />

            <Snackbar open={Boolean(snack)} autoHideDuration={3400} onClose={() => setSnack('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack('')} severity={/needs|Pick/.test(snack) ? 'warning' : 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack}</Alert>
            </Snackbar>
        </Box>
    );
}
