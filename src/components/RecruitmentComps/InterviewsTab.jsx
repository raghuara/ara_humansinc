import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Grid, Button, Stack, Chip, Avatar, IconButton, Tooltip, Rating,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Snackbar, Alert,
} from '@mui/material';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import TodayRoundedIcon from '@mui/icons-material/TodayRounded';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import UpcomingRoundedIcon from '@mui/icons-material/UpcomingRounded';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import CallRoundedIcon from '@mui/icons-material/CallRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import PauseCircleFilledRoundedIcon from '@mui/icons-material/PauseCircleFilledRounded';
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded';
import EditCalendarRoundedIcon from '@mui/icons-material/EditCalendarRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import { useSelector, useDispatch } from 'react-redux';
import {
    selectInterviewsToday, selectUpcomingInterviews, selectAwaitingReview, selectOverdueInterviews,
    selectCandidates, selectOpenVacancies, selectInterviews,
    scheduleInterview, rescheduleInterview, cancelInterview, markNoShow, markConducted, reviewInterview,
} from '../../redux/slices/recruitmentSlice';
import { PRIMARY, PRIMARY_LIGHT, PRIMARY_DARK } from '../../theme';
import { fmtDate, initialsFromName as initials, paletteColor as colorFor } from '../../utils/format';
import { solidBtn, ghostBtn, successBtn, dangerBtn, field, Panel, EmptyState } from '../uiKit';

const MODES = ['Video', 'In-person', 'Phone'];
const ROUNDS = ['Screening', 'Technical Round 1', 'Technical Round 2', 'Managerial Round', 'HR Round', 'Final Round'];
const DURATIONS = [15, 30, 45, 60, 90];

const MODE_ICON = { Video: VideocamRoundedIcon, 'In-person': PlaceRoundedIcon, Phone: CallRoundedIcon };

// "14:30" → "2:30 PM". Interview times are stored 24-hour and read 12-hour.
const fmtTime = (t) => {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
};

const OUTCOMES = [
    { key: 'Selected', label: 'Selected', desc: 'Move ahead — clear this round', icon: CheckCircleRoundedIcon, color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
    { key: 'Rejected', label: 'Rejected', desc: 'Not a fit — a reason is required', icon: CancelRoundedIcon, color: '#E11D48', bg: '#FEF2F2', border: '#FECACA' },
    { key: 'On Hold', label: 'On Hold', desc: 'Park them and decide later', icon: PauseCircleFilledRoundedIcon, color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
];

const EMPTY_SCHEDULE = { vacancyId: '', candidateId: '', round: 'Screening', date: '', time: '10:00', durationMins: 30, mode: 'Video', locationOrLink: '', panel: '' };
const EMPTY_REVIEW = { outcome: '', rating: 0, feedback: '', rejectReason: '' };

// One interview row — used by every section, with the actions varying by state.
function InterviewRow({ iv, onConduct, onReview, onReschedule, onCancel, onNoShow, tone }) {
    const ModeIcon = MODE_ICON[iv.mode] || VideocamRoundedIcon;
    const reviewed = Boolean(iv.outcome);
    const outcome = OUTCOMES.find((o) => o.key === iv.outcome);

    return (
        <Box sx={{
            border: `1px solid ${tone || '#EEF0F6'}`, borderRadius: '9px', p: 1.8, bgcolor: '#fff',
            display: 'flex', alignItems: 'center', gap: 1.8, flexWrap: 'wrap',
            transition: 'border-color .15s, box-shadow .15s',
            '&:hover': { borderColor: '#DDE3EC', boxShadow: '0 4px 14px -8px rgba(16,24,40,0.18)' },
        }}>
            {/* Time */}
            <Box sx={{ minWidth: 76, textAlign: 'center', px: 1.2, py: 0.9, borderRadius: '8px', bgcolor: PRIMARY_LIGHT, flexShrink: 0 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 800, color: PRIMARY_DARK, lineHeight: 1.2 }}>{fmtTime(iv.time)}</Typography>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: PRIMARY }}>{iv.durationMins} min</Typography>
            </Box>

            {/* Candidate */}
            <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center', minWidth: 175 }}>
                <Avatar sx={{ width: 40, height: 40, bgcolor: colorFor(iv.candidateName), fontSize: 13.5, fontWeight: 700 }}>{initials(iv.candidateName)}</Avatar>
                <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }} noWrap>{iv.candidateName}</Typography>
                    <Typography sx={{ fontSize: 11.5, color: '#98A0AE' }} noWrap>{iv.vacancyTitle}</Typography>
                </Box>
            </Stack>

            {/* Round + mode */}
            <Box sx={{ minWidth: 155, flex: 1 }}>
                <Chip label={iv.round} size="small" sx={{ height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: '#E0F2FE', color: '#0369A1' }} />
                <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center', mt: 0.5 }}>
                    <ModeIcon sx={{ fontSize: 14, color: '#94A3B8' }} />
                    <Typography sx={{ fontSize: 11.5, color: '#64748B' }} noWrap>{iv.mode}{iv.locationOrLink ? ` · ${iv.locationOrLink}` : ''}</Typography>
                </Stack>
                {iv.panel?.length > 0 && (
                    <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center', mt: 0.3 }}>
                        <GroupsRoundedIcon sx={{ fontSize: 14, color: '#CBD2DD' }} />
                        <Typography sx={{ fontSize: 11, color: '#98A0AE' }} noWrap>{iv.panel.join(', ')}</Typography>
                    </Stack>
                )}
            </Box>

            {/* Verdict, once reviewed */}
            {reviewed && outcome && (
                <Box sx={{ minWidth: 170 }}>
                    <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center' }}>
                        <outcome.icon sx={{ fontSize: 17, color: outcome.color }} />
                        <Typography sx={{ fontSize: 13, fontWeight: 800, color: outcome.color }}>{outcome.label}</Typography>
                        {iv.rating > 0 && <Rating value={iv.rating} readOnly size="small" sx={{ fontSize: 14 }} />}
                    </Stack>
                    {iv.rejectReason && <Typography sx={{ fontSize: 11.5, color: '#E11D48', mt: 0.2 }}>{iv.rejectReason}</Typography>}
                    {!iv.rejectReason && iv.feedback && <Typography sx={{ fontSize: 11.5, color: '#64748B', mt: 0.2, fontStyle: 'italic' }} noWrap>“{iv.feedback}”</Typography>}
                </Box>
            )}

            {/* Actions */}
            <Stack direction="row" spacing={0.8} sx={{ flexWrap: 'wrap', gap: 0.8 }}>
                {iv.status === 'Scheduled' && (
                    <>
                        <Button onClick={() => onConduct(iv)} startIcon={<CheckCircleRoundedIcon sx={{ fontSize: 16 }} />} sx={{ ...solidBtn, height: 34, px: 1.6, fontSize: 12 }}>
                            Mark Conducted
                        </Button>
                        <Tooltip arrow title="Reschedule">
                            <IconButton size="small" onClick={() => onReschedule(iv)} sx={{ width: 34, height: 34, color: '#64748B', border: '1px solid #E6EAF1', borderRadius: '7px', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}>
                                <EditCalendarRoundedIcon sx={{ fontSize: 17 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip arrow title="Candidate didn't turn up">
                            <IconButton size="small" onClick={() => onNoShow(iv)} sx={{ width: 34, height: 34, color: '#64748B', border: '1px solid #E6EAF1', borderRadius: '7px', '&:hover': { color: '#B45309', bgcolor: '#FFF7ED' } }}>
                                <EventBusyRoundedIcon sx={{ fontSize: 17 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip arrow title="Cancel interview">
                            <IconButton size="small" onClick={() => onCancel(iv)} sx={{ width: 34, height: 34, color: '#64748B', border: '1px solid #E6EAF1', borderRadius: '7px', '&:hover': { color: '#E11D48', bgcolor: '#FEF2F2' } }}>
                                <CancelRoundedIcon sx={{ fontSize: 17 }} />
                            </IconButton>
                        </Tooltip>
                    </>
                )}

                {iv.status === 'Conducted' && !reviewed && (
                    <Button onClick={() => onReview(iv)} startIcon={<RateReviewRoundedIcon sx={{ fontSize: 16 }} />} sx={{ ...successBtn, height: 34, px: 1.8, fontSize: 12 }}>
                        Add Review
                    </Button>
                )}

                {iv.status === 'Conducted' && reviewed && (
                    <Chip label={`Reviewed by ${iv.reviewedBy}`} size="small" sx={{ height: 24, fontSize: 10.5, fontWeight: 700, bgcolor: '#F1F5F9', color: '#64748B' }} />
                )}

                {iv.status === 'No Show' && <Chip label="No show" size="small" sx={{ height: 24, fontSize: 11, fontWeight: 700, bgcolor: '#FFF7ED', color: '#B45309' }} />}
                {iv.status === 'Cancelled' && <Chip label="Cancelled" size="small" sx={{ height: 24, fontSize: 11, fontWeight: 700, bgcolor: '#F1F5F9', color: '#64748B' }} />}
            </Stack>
        </Box>
    );
}

export default function InterviewsTab() {
    const dispatch = useDispatch();
    const auth = useSelector((s) => s.auth);
    const todayList = useSelector(selectInterviewsToday);
    const upcoming = useSelector(selectUpcomingInterviews);
    const awaiting = useSelector(selectAwaitingReview);
    const overdue = useSelector(selectOverdueInterviews);
    const allInterviews = useSelector(selectInterviews);
    const candidates = useSelector(selectCandidates);
    const openVacancies = useSelector(selectOpenVacancies);

    const [dialog, setDialog] = useState(null);      // { mode: 'schedule' | 'reschedule', iv? }
    const [form, setForm] = useState(EMPTY_SCHEDULE);
    const [review, setReview] = useState(null);      // the interview being reviewed
    const [rv, setRv] = useState(EMPTY_REVIEW);
    const [tried, setTried] = useState(false);
    const [snack, setSnack] = useState('');

    const reviewer = auth.userName || 'Management';

    // Only candidates still in play can be booked — no point scheduling a round
    // with someone already rejected or joined.
    const bookable = useMemo(
        () => candidates.filter((c) => ['applied', 'interviewing', 'on-hold', 'selected'].includes(c.status)),
        [candidates],
    );
    const candidatesForVacancy = form.vacancyId ? bookable.filter((c) => c.vacancyId === form.vacancyId) : bookable;

    // ── Schedule / reschedule ───────────────────────────────────────────────
    const openSchedule = () => {
        const d = new Date();
        setForm({ ...EMPTY_SCHEDULE, date: d.toISOString().slice(0, 10) });
        setTried(false);
        setDialog({ mode: 'schedule' });
    };
    const openReschedule = (iv) => {
        setForm({ vacancyId: iv.vacancyId, candidateId: iv.candidateId, round: iv.round, date: iv.date, time: iv.time, durationMins: iv.durationMins, mode: iv.mode, locationOrLink: iv.locationOrLink, panel: (iv.panel || []).join(', ') });
        setTried(false);
        setDialog({ mode: 'reschedule', iv });
    };
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const scheduleValid = form.vacancyId && form.candidateId && form.date && form.time;

    const submitSchedule = () => {
        setTried(true);
        if (!scheduleValid) { setSnack('Pick a vacancy, a candidate, a date and a time.'); return; }

        if (dialog.mode === 'reschedule') {
            dispatch(rescheduleInterview({
                id: dialog.iv.id, date: form.date, time: form.time, mode: form.mode,
                locationOrLink: form.locationOrLink, durationMins: Number(form.durationMins),
            }));
            setSnack(`${dialog.iv.candidateName} moved to ${fmtDate(form.date)}, ${fmtTime(form.time)}.`);
            setDialog(null);
            return;
        }

        const cand = candidates.find((c) => c.id === form.candidateId);
        const vac = openVacancies.find((v) => v.id === form.vacancyId);
        dispatch(scheduleInterview({
            vacancyId: form.vacancyId,
            candidateId: form.candidateId,
            candidateName: cand?.name || '',
            vacancyTitle: vac?.title || '',
            round: form.round,
            date: form.date,
            time: form.time,
            durationMins: Number(form.durationMins),
            mode: form.mode,
            locationOrLink: form.locationOrLink,
            panel: form.panel.split(',').map((p) => p.trim()).filter(Boolean),
        }));
        setSnack(`${form.round} scheduled with ${cand?.name} on ${fmtDate(form.date)} at ${fmtTime(form.time)}.`);
        setDialog(null);
    };

    // ── Conduct → review ────────────────────────────────────────────────────
    const conduct = (iv) => {
        dispatch(markConducted(iv.id));
        setSnack(`${iv.candidateName}'s ${iv.round} marked as conducted — add your review to record the outcome.`);
    };

    const openReview = (iv) => { setReview(iv); setRv(EMPTY_REVIEW); setTried(false); };

    // A rejection without a reason is refused by the reducer, so the form
    // enforces the same rule rather than letting the dispatch silently no-op.
    const reviewValid = rv.outcome && (rv.outcome !== 'Rejected' || rv.rejectReason.trim());

    const submitReview = () => {
        setTried(true);
        if (!reviewValid) {
            setSnack(!rv.outcome ? 'Pick an outcome for this interview.' : 'A rejection needs a reason — the candidate’s record keeps it.');
            return;
        }
        dispatch(reviewInterview({
            id: review.id, outcome: rv.outcome, rating: rv.rating,
            feedback: rv.feedback, rejectReason: rv.rejectReason, reviewedBy: reviewer,
        }));
        setSnack(
            rv.outcome === 'Selected' ? `${review.candidateName} cleared ${review.round}.`
                : rv.outcome === 'Rejected' ? `${review.candidateName} rejected — reason saved to their record.`
                    : `${review.candidateName} put on hold.`,
        );
        setReview(null);
    };

    const rowProps = {
        onConduct: conduct,
        onReview: openReview,
        onReschedule: openReschedule,
        onCancel: (iv) => { dispatch(cancelInterview(iv.id)); setSnack(`Interview with ${iv.candidateName} cancelled.`); },
        onNoShow: (iv) => { dispatch(markNoShow(iv.id)); setSnack(`${iv.candidateName} marked as a no-show.`); },
    };

    const selectedOutcome = OUTCOMES.find((o) => o.key === rv.outcome);

    return (
        <Box sx={{ p: 2, pt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Overdue — scheduled, date passed, nobody closed them off */}
            {overdue.length > 0 && (
                <Box sx={{ p: 1.8, borderRadius: '9px', bgcolor: '#FFFBEB', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: 1.4, flexWrap: 'wrap' }}>
                    <WarningAmberRoundedIcon sx={{ fontSize: 20, color: '#B45309' }} />
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: '#78350F' }}>
                            {overdue.length} interview{overdue.length === 1 ? '' : 's'} past their date and still marked as scheduled
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: '#B45309' }}>
                            {overdue.map((i) => `${i.candidateName} (${fmtDate(i.date)})`).join(' · ')}
                        </Typography>
                    </Box>
                </Box>
            )}

            {/* Today */}
            <Panel
                title="Interviews Today"
                icon={TodayRoundedIcon}
                chip={`${todayList.length} scheduled`}
                action={<Button startIcon={<AddRoundedIcon />} onClick={openSchedule} sx={{ ...solidBtn, height: 38, px: 1.8, fontSize: 13 }}>Schedule Interview</Button>}
            >
                {todayList.length === 0 ? (
                    <EmptyState icon={TodayRoundedIcon} title="No interviews today" hint="Schedule one, or check the upcoming list below." />
                ) : (
                    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                        {todayList.map((iv) => <InterviewRow key={iv.id} iv={iv} {...rowProps} tone="#C9BEFB" />)}
                    </Box>
                )}
            </Panel>

            {/* Awaiting review — conducted, no verdict yet */}
            <Panel
                title="Awaiting Review"
                icon={RateReviewRoundedIcon}
                chip={`${awaiting.length} to review`}
                chipColor="#B45309"
                chipBg="#FFF7ED"
                hint="Conducted, but no outcome recorded yet"
            >
                {awaiting.length === 0 ? (
                    <EmptyState icon={CheckCircleRoundedIcon} title="Nothing waiting on you" hint="Every conducted interview has an outcome on file." />
                ) : (
                    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                        {awaiting.map((iv) => <InterviewRow key={iv.id} iv={iv} {...rowProps} tone="#FDE68A" />)}
                    </Box>
                )}
            </Panel>

            {/* Upcoming */}
            <Panel
                title="Upcoming Interviews"
                icon={UpcomingRoundedIcon}
                chip={`${upcoming.length} scheduled`}
                chipColor="#0369A1"
                chipBg="#E0F2FE"
            >
                {upcoming.length === 0 ? (
                    <EmptyState icon={UpcomingRoundedIcon} title="Nothing on the calendar" hint="Schedule an interview and it will show up here." />
                ) : (
                    <Box sx={{ p: 1.5 }}>
                        {/* Grouped by day, so a week reads as a schedule and not a list */}
                        {Object.entries(upcoming.reduce((acc, iv) => {
                            (acc[iv.date] = acc[iv.date] || []).push(iv);
                            return acc;
                        }, {})).map(([date, list]) => (
                            <Box key={date} sx={{ mb: 1.8, '&:last-of-type': { mb: 0 } }}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                                    <ScheduleRoundedIcon sx={{ fontSize: 15, color: '#94A3B8' }} />
                                    <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#475569' }}>{fmtDate(date)}</Typography>
                                    <Chip label={`${list.length} interview${list.length === 1 ? '' : 's'}`} size="small" sx={{ height: 18, fontSize: 9.5, fontWeight: 700, bgcolor: '#F1F5F9', color: '#64748B' }} />
                                    <Box sx={{ flex: 1, height: '1px', bgcolor: '#EEF0F6' }} />
                                </Stack>
                                <Stack spacing={1.2}>
                                    {list.map((iv) => <InterviewRow key={iv.id} iv={iv} {...rowProps} />)}
                                </Stack>
                            </Box>
                        ))}
                    </Box>
                )}
            </Panel>

            {/* Decided — the audit trail */}
            <Panel
                title="Completed Interviews"
                icon={EventAvailableRoundedIcon}
                chip={`${allInterviews.filter((i) => i.outcome).length} decided`}
                chipColor="#16A34A"
                chipBg="#DCFCE7"
                hint="Outcome and feedback on record"
            >
                {allInterviews.filter((i) => i.outcome).length === 0 ? (
                    <EmptyState icon={EventAvailableRoundedIcon} title="No decisions yet" hint="Reviewed interviews land here with their outcome and feedback." />
                ) : (
                    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                        {allInterviews.filter((i) => i.outcome).map((iv) => <InterviewRow key={iv.id} iv={iv} {...rowProps} />)}
                    </Box>
                )}
            </Panel>

            {/* ── Schedule / reschedule dialog ────────────────────────────── */}
            <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
                        {dialog?.mode === 'reschedule' ? `Reschedule — ${dialog.iv.candidateName}` : 'Schedule an Interview'}
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>
                        {dialog?.mode === 'reschedule'
                            ? 'Move this round to a new date and time. The round and candidate stay the same.'
                            : 'Pick the role, then the candidate applying for it.'}
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    <Grid container spacing={1.8}>
                        {dialog?.mode === 'schedule' && (
                            <>
                                <Grid size={12}>
                                    <TextField
                                        select label="Vacancy" size="small" fullWidth value={form.vacancyId}
                                        onChange={(e) => setForm((f) => ({ ...f, vacancyId: e.target.value, candidateId: '' }))}
                                        error={tried && !form.vacancyId} sx={field}
                                        helperText={openVacancies.length === 0 ? 'No open vacancies — create one on the Vacancies tab first.' : ' '}
                                    >
                                        {openVacancies.map((v) => (
                                            <MenuItem key={v.id} value={v.id} sx={{ fontSize: 13.5 }}>
                                                {v.title} — {v.department} ({Math.max(0, v.openings - v.filled)} open)
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid size={12}>
                                    <TextField
                                        select label="Candidate" size="small" fullWidth value={form.candidateId}
                                        onChange={set('candidateId')} error={tried && !form.candidateId} sx={field}
                                        disabled={!form.vacancyId}
                                        helperText={form.vacancyId && candidatesForVacancy.length === 0 ? 'No candidates on this vacancy yet — add one on the Candidates tab.' : ' '}
                                    >
                                        {candidatesForVacancy.map((c) => (
                                            <MenuItem key={c.id} value={c.id} sx={{ fontSize: 13.5 }}>
                                                {c.name} — {c.experience} · {c.currentCompany || 'Fresher'}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid size={12}>
                                    <TextField select label="Round" size="small" fullWidth value={form.round} onChange={set('round')} sx={field}>
                                        {ROUNDS.map((r) => <MenuItem key={r} value={r} sx={{ fontSize: 13.5 }}>{r}</MenuItem>)}
                                    </TextField>
                                </Grid>
                            </>
                        )}

                        <Grid size={{ xs: 12, sm: 5 }}>
                            <TextField label="Date" type="date" size="small" fullWidth value={form.date} onChange={set('date')}
                                error={tried && !form.date} slotProps={{ inputLabel: { shrink: true } }} sx={field} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField label="Time" type="time" size="small" fullWidth value={form.time} onChange={set('time')}
                                error={tried && !form.time} slotProps={{ inputLabel: { shrink: true } }} sx={field} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 3 }}>
                            <TextField select label="Duration" size="small" fullWidth value={form.durationMins} onChange={set('durationMins')} sx={field}>
                                {DURATIONS.map((d) => <MenuItem key={d} value={d} sx={{ fontSize: 13.5 }}>{d} min</MenuItem>)}
                            </TextField>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField select label="Mode" size="small" fullWidth value={form.mode} onChange={set('mode')} sx={field}>
                                {MODES.map((m) => <MenuItem key={m} value={m} sx={{ fontSize: 13.5 }}>{m}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 8 }}>
                            <TextField
                                label={form.mode === 'Video' ? 'Meeting link' : form.mode === 'Phone' ? 'Phone number' : 'Location'}
                                size="small" fullWidth value={form.locationOrLink} onChange={set('locationOrLink')} sx={field}
                                placeholder={form.mode === 'Video' ? 'meet.google.com/…' : form.mode === 'Phone' ? '98400 00000' : 'Meeting Room 2'}
                            />
                        </Grid>

                        {dialog?.mode === 'schedule' && (
                            <Grid size={12}>
                                <TextField label="Interview panel (comma separated)" size="small" fullWidth value={form.panel}
                                    onChange={set('panel')} placeholder="e.g. Karthik R, Divya Prakash" sx={field} />
                            </Grid>
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setDialog(null)} sx={{ ...ghostBtn, height: 40, px: 2 }}>Cancel</Button>
                    <Button onClick={submitSchedule} sx={{ ...solidBtn, height: 40, px: 2.4 }}>
                        {dialog?.mode === 'reschedule' ? 'Save New Slot' : 'Schedule'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Review dialog — the outcome step ────────────────────────── */}
            <Dialog open={Boolean(review)} onClose={() => setReview(null)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Review Interview</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>
                        {review?.candidateName} · {review?.round} · {review && fmtDate(review.conductedOn || review.date)}
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    {/* Rating */}
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#374151', mb: 0.8 }}>How did they do?</Typography>
                    <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center', mb: 2.2 }}>
                        <Rating
                            value={rv.rating}
                            onChange={(_, v) => setRv((r) => ({ ...r, rating: v || 0 }))}
                            size="large"
                            sx={{ '& .MuiRating-iconFilled': { color: '#F59E0B' } }}
                        />
                        <Typography sx={{ fontSize: 12.5, color: '#98A0AE' }}>
                            {rv.rating ? `${rv.rating} of 5` : 'Not rated'}
                        </Typography>
                    </Stack>

                    {/* Outcome */}
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#374151', mb: 1 }}>Outcome</Typography>
                    <Grid container spacing={1.2} sx={{ mb: 2 }}>
                        {OUTCOMES.map((o) => {
                            const on = rv.outcome === o.key;
                            return (
                                <Grid size={{ xs: 12, sm: 4 }} key={o.key}>
                                    <Box
                                        onClick={() => setRv((r) => ({ ...r, outcome: o.key }))}
                                        sx={{
                                            cursor: 'pointer', p: 1.5, borderRadius: '9px', height: '100%',
                                            border: `1.5px solid ${on ? o.color : tried && !rv.outcome ? '#FECACA' : '#E5E7EB'}`,
                                            bgcolor: on ? o.bg : '#fff', transition: '.15s',
                                            '&:hover': { borderColor: o.border },
                                        }}
                                    >
                                        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', mb: 0.4 }}>
                                            <o.icon sx={{ fontSize: 18, color: on ? o.color : '#94A3B8' }} />
                                            <Typography sx={{ fontSize: 13, fontWeight: 800, color: on ? o.color : '#374151' }}>{o.label}</Typography>
                                        </Stack>
                                        <Typography sx={{ fontSize: 11, color: '#6B7280', lineHeight: 1.4 }}>{o.desc}</Typography>
                                    </Box>
                                </Grid>
                            );
                        })}
                    </Grid>

                    {/* Rejection reason — required, and only for a rejection */}
                    {rv.outcome === 'Rejected' && (
                        <Box sx={{ mb: 2 }}>
                            <TextField
                                label="Reason for rejection" size="small" fullWidth multiline minRows={2} autoFocus
                                placeholder="e.g. Strong on React, but no real experience with state management at scale."
                                value={rv.rejectReason}
                                onChange={(e) => setRv((r) => ({ ...r, rejectReason: e.target.value }))}
                                error={tried && !rv.rejectReason.trim()}
                                helperText={tried && !rv.rejectReason.trim()
                                    ? 'Required — this is what stays on the candidate’s record.'
                                    : 'Saved against the candidate, so the decision is never unexplained later.'}
                                sx={field}
                            />
                        </Box>
                    )}

                    {/* Panel feedback */}
                    <TextField
                        label="Feedback (optional)" size="small" fullWidth multiline minRows={3}
                        placeholder="What went well, what didn't, anything the next round should probe."
                        value={rv.feedback}
                        onChange={(e) => setRv((r) => ({ ...r, feedback: e.target.value }))}
                        sx={field}
                    />

                    {/* What this will do */}
                    {rv.outcome && (
                        <Box sx={{ mt: 2, p: 1.6, borderRadius: '9px', bgcolor: selectedOutcome.bg, border: `1px solid ${selectedOutcome.border}` }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: selectedOutcome.color, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.4 }}>What happens next</Typography>
                            <Typography sx={{ fontSize: 12.5, color: '#334155' }}>
                                {rv.outcome === 'Selected' && <><strong>{review?.candidateName}</strong> clears this round and is marked <strong>Selected</strong>. Schedule the next round, or mark them as joined from the Candidates tab once they accept.</>}
                                {rv.outcome === 'Rejected' && <><strong>{review?.candidateName}</strong> is marked <strong>Rejected</strong> and drops out of the pipeline. The reason is kept on their record.</>}
                                {rv.outcome === 'On Hold' && <><strong>{review?.candidateName}</strong> is parked as <strong>On Hold</strong> — they stay in the pipeline and can be picked up again later.</>}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setReview(null)} sx={{ ...ghostBtn, height: 40, px: 2 }}>Cancel</Button>
                    <Button
                        onClick={submitReview}
                        sx={rv.outcome === 'Rejected'
                            ? { ...dangerBtn, height: 40, px: 2.4, bgcolor: '#DC2626', color: '#fff', border: 'none', '&:hover': { bgcolor: '#B91C1C' } }
                            : { ...successBtn, height: 40, px: 2.4 }}
                    >
                        Save Review
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={Boolean(snack)} autoHideDuration={3800} onClose={() => setSnack('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack('')} severity={/Pick|needs a reason/.test(snack) ? 'warning' : 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack}</Alert>
            </Snackbar>
        </Box>
    );
}
