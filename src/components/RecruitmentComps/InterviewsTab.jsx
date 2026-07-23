import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Box, Typography, Grid, Button, Stack, Chip, Avatar, IconButton, Tooltip, Rating, CircularProgress,
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
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import WorkOutlineRoundedIcon from '@mui/icons-material/WorkOutlineRounded';
import { PRIMARY, PRIMARY_LIGHT, PRIMARY_DARK } from '../../theme';
import { initialsFromName as initials, paletteColor as colorFor } from '../../utils/format';
import { solidBtn, ghostBtn, successBtn, dangerBtn, field, Panel, EmptyState, StatCards } from '../uiKit';
import http, { apiErrorMessage } from '../../Api/http';
import {
    GetInterviews, GetInterviewFormOptions, ScheduleInterview, RescheduleInterview,
    MarkInterviewConducted, MarkInterviewNoShow, ReviewInterview, CancelInterview,
} from '../../Api/Api';

const MODES = ['Video', 'In-person', 'Phone'];
const ROUNDS = ['Screening', 'Technical Round 1', 'Technical Round 2', 'Managerial Round', 'HR Round', 'Final Round'];
const DURATIONS = [15, 30, 45, 60, 90];

const MODE_ICON = { Video: VideocamRoundedIcon, 'In-person': PlaceRoundedIcon, Phone: CallRoundedIcon };

// The API sends dates/times display-ready ("18 Jul 2026" / "10:00 AM"), so they
// are shown verbatim. These parsers only run the other way — to pre-fill the
// native date/time inputs when rescheduling.
const MONTHS = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
const isoFromDisplayDate = (s) => {
    const m = String(s || '').match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
    return m ? `${m[3]}-${MONTHS[m[2].toLowerCase()] || '01'}-${String(m[1]).padStart(2, '0')}` : '';
};
const time24FromDisplay = (s) => {
    const m = String(s || '').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return '';
    let h = Number(m[1]) % 12;
    if (/pm/i.test(m[3])) h += 12;
    return `${String(h).padStart(2, '0')}:${m[2]}`;
};
// The native date input gives ISO "YYYY-MM-DD"; the API wants "DD-MM-YYYY".
const dmyFromIso = (s) => {
    const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : (s || '');
};

const OUTCOMES = [
    { key: 'Selected', label: 'Selected', desc: 'Move ahead — clear this round', icon: CheckCircleRoundedIcon, color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
    { key: 'Rejected', label: 'Rejected', desc: 'Not a fit — a reason is required', icon: CancelRoundedIcon, color: '#E11D48', bg: '#FEF2F2', border: '#FECACA' },
    { key: 'On Hold', label: 'On Hold', desc: 'Park them and decide later', icon: PauseCircleFilledRoundedIcon, color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
];

const EMPTY_SCHEDULE = { vacancyId: '', candidateId: '', round: 'Screening', date: '', time: '10:00', durationMins: 30, mode: 'Video', locationOrLink: '', panel: '' };
const EMPTY_REVIEW = { outcome: '', rating: 0, feedback: '', rejectReason: '' };

const normalizeInterview = (iv) => ({
    id: iv.id,
    vacancyId: iv.vacancyId,
    candidateId: iv.candidateId,
    candidateName: iv.candidateName ?? '',
    vacancyTitle: iv.role ?? '',
    round: iv.round ?? '',
    date: iv.date ?? '',                 // display "18 Jul 2026"
    time: iv.time ?? '',                 // display "10:00 AM"
    durationMins: Number(iv.durationMinutes) || 0,
    durationLabel: iv.durationLabel || `${Number(iv.durationMinutes) || 0} min`,
    mode: iv.mode ?? '',
    locationOrLink: iv.meetingDetail ?? '',
    panel: iv.panel ? String(iv.panel).split(',').map((p) => p.trim()).filter(Boolean) : [],
    status: iv.status ?? '',
    outcome: iv.outcome ?? null,
    rating: Number(iv.rating) || 0,
    feedback: iv.feedback ?? null,
    reviewedBy: iv.reviewedBy ?? null,
    reviewedOn: iv.reviewedOn ?? null,
});

// One interview row — used by every section, with the actions varying by state.
function InterviewRow({ iv, busy, onConduct, onReview, onReschedule, onCancel, onNoShow, tone }) {
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
            <Box sx={{ minWidth: 80, textAlign: 'center', px: 1.2, py: 0.9, borderRadius: '8px', bgcolor: PRIMARY_LIGHT, flexShrink: 0 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: PRIMARY_DARK, lineHeight: 1.2 }}>{iv.time || '—'}</Typography>
                <Typography sx={{ fontSize: 10, fontWeight: 700, color: PRIMARY }}>{iv.durationLabel}</Typography>
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
                {iv.panel.length > 0 && (
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
                    {iv.feedback && <Typography sx={{ fontSize: 11.5, color: '#64748B', mt: 0.2, fontStyle: 'italic' }} noWrap>“{iv.feedback}”</Typography>}
                </Box>
            )}

            {/* Actions */}
            <Stack direction="row" spacing={0.8} sx={{ flexWrap: 'wrap', gap: 0.8 }}>
                {iv.status === 'Scheduled' && (
                    <>
                        <Button onClick={() => onConduct(iv)} disabled={busy} startIcon={<CheckCircleRoundedIcon sx={{ fontSize: 16 }} />} sx={{ ...solidBtn, height: 34, px: 1.6, fontSize: 12 }}>
                            Mark Conducted
                        </Button>
                        <Tooltip arrow title="Reschedule">
                            <span><IconButton size="small" disabled={busy} onClick={() => onReschedule(iv)} sx={{ width: 34, height: 34, color: '#64748B', border: '1px solid #E6EAF1', borderRadius: '7px', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}>
                                <EditCalendarRoundedIcon sx={{ fontSize: 17 }} />
                            </IconButton></span>
                        </Tooltip>
                        <Tooltip arrow title="Candidate didn't turn up">
                            <span><IconButton size="small" disabled={busy} onClick={() => onNoShow(iv)} sx={{ width: 34, height: 34, color: '#64748B', border: '1px solid #E6EAF1', borderRadius: '7px', '&:hover': { color: '#B45309', bgcolor: '#FFF7ED' } }}>
                                <EventBusyRoundedIcon sx={{ fontSize: 17 }} />
                            </IconButton></span>
                        </Tooltip>
                        <Tooltip arrow title="Cancel interview">
                            <span><IconButton size="small" disabled={busy} onClick={() => onCancel(iv)} sx={{ width: 34, height: 34, color: '#64748B', border: '1px solid #E6EAF1', borderRadius: '7px', '&:hover': { color: '#E11D48', bgcolor: '#FEF2F2' } }}>
                                <CancelRoundedIcon sx={{ fontSize: 17 }} />
                            </IconButton></span>
                        </Tooltip>
                    </>
                )}

                {iv.status === 'Conducted' && !reviewed && (
                    <Button onClick={() => onReview(iv)} disabled={busy} startIcon={<RateReviewRoundedIcon sx={{ fontSize: 16 }} />} sx={{ ...successBtn, height: 34, px: 1.8, fontSize: 12 }}>
                        Add Review
                    </Button>
                )}

                {reviewed && iv.reviewedBy && (
                    <Chip label={`Reviewed by ${iv.reviewedBy}`} size="small" sx={{ height: 24, fontSize: 10.5, fontWeight: 700, bgcolor: '#F1F5F9', color: '#64748B' }} />
                )}

                {iv.status === 'No Show' && <Chip label="No show" size="small" sx={{ height: 24, fontSize: 11, fontWeight: 700, bgcolor: '#FFF7ED', color: '#B45309' }} />}
                {iv.status === 'Cancelled' && <Chip label="Cancelled" size="small" sx={{ height: 24, fontSize: 11, fontWeight: 700, bgcolor: '#F1F5F9', color: '#64748B' }} />}
            </Stack>
        </Box>
    );
}

export default function InterviewsTab() {
    const [data, setData] = useState({ cards: {}, today: [], awaiting: [], upcoming: [], completed: [] });
    const [options, setOptions] = useState({ vacancies: [], rounds: ROUNDS, modes: MODES, durations: DURATIONS });
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [saving, setSaving] = useState(false);      // any mutation in flight

    const [dialog, setDialog] = useState(null);      // { mode: 'schedule' | 'reschedule', iv? }
    const [form, setForm] = useState(EMPTY_SCHEDULE);
    const [review, setReview] = useState(null);      // the interview being reviewed
    const [rv, setRv] = useState(EMPTY_REVIEW);
    const [tried, setTried] = useState(false);
    const [snack, setSnack] = useState(null);        // { msg, sev }

    const notify = (msg, sev = 'success') => setSnack({ msg, sev });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data: body } = await http.get(GetInterviews);
            if (body?.error) throw new Error(body.message || 'Could not load interviews.');
            const d = body?.data || {};
            setData({
                cards: d.cards || {},
                today: (Array.isArray(d.today) ? d.today : []).map(normalizeInterview),
                awaiting: (Array.isArray(d.awaitingReview) ? d.awaitingReview : []).map(normalizeInterview),
                upcoming: (Array.isArray(d.upcoming) ? d.upcoming : []).map(normalizeInterview),
                completed: (Array.isArray(d.completed) ? d.completed : []).map(normalizeInterview),
            });
            setLoadError('');
        } catch (err) {
            setLoadError(apiErrorMessage(err, 'Could not load interviews.'));
        } finally {
            setLoading(false);
        }
    }, []);

    const loadOptions = useCallback(async () => {
        try {
            const { data: body } = await http.get(GetInterviewFormOptions);
            if (body?.error) return;
            const d = body?.data || {};
            setOptions({
                vacancies: (Array.isArray(d.vacancies) ? d.vacancies : []).map((v) => ({
                    id: v.id,
                    label: v.label || v.roleTitle || 'Vacancy',
                    candidates: (Array.isArray(v.candidates) ? v.candidates : []).map((c) => ({ id: c.id, label: c.label || c.fullName || 'Candidate' })),
                })),
                rounds: Array.isArray(d.rounds) && d.rounds.length ? d.rounds : ROUNDS,
                modes: Array.isArray(d.modes) && d.modes.length ? d.modes : MODES,
                durations: Array.isArray(d.durations) && d.durations.length ? d.durations : DURATIONS,
            });
        } catch { /* dialog falls back to the built-in lists */ }
    }, []);

    useEffect(() => { load(); loadOptions(); }, [load, loadOptions]);

    const cards = data.cards;
    const STATS = [
        { label: 'Interviews Today', value: cards.interviewsToday ?? data.today.length, sub: 'On the calendar', icon: TodayRoundedIcon, color: PRIMARY, bg: PRIMARY_LIGHT },
        { label: 'Awaiting Review', value: cards.awaitingReview ?? data.awaiting.length, sub: 'Conducted, no outcome', icon: RateReviewRoundedIcon, color: '#B45309', bg: '#FFF7ED' },
        { label: 'In Pipeline', value: cards.inPipeline ?? 0, sub: 'Active candidates', icon: GroupsRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE' },
        { label: 'Open Positions', value: cards.openPositions ?? 0, sub: `${cards.openRoles ?? 0} open role${(cards.openRoles ?? 0) === 1 ? '' : 's'}`, icon: WorkOutlineRoundedIcon, color: '#16A34A', bg: '#DCFCE7' },
    ];

    // Candidates cascade off the chosen vacancy in the form options.
    const candidatesForVacancy = useMemo(
        () => options.vacancies.find((v) => v.id === form.vacancyId)?.candidates || [],
        [options.vacancies, form.vacancyId],
    );

    // ── Schedule / reschedule ───────────────────────────────────────────────
    const openSchedule = () => {
        setForm({ ...EMPTY_SCHEDULE, date: new Date().toISOString().slice(0, 10) });
        setTried(false);
        setDialog({ mode: 'schedule' });
    };
    const openReschedule = (iv) => {
        setForm({
            vacancyId: iv.vacancyId, candidateId: iv.candidateId, round: iv.round,
            date: isoFromDisplayDate(iv.date), time: time24FromDisplay(iv.time),
            durationMins: iv.durationMins, mode: iv.mode, locationOrLink: iv.locationOrLink,
            panel: iv.panel.join(', '),
        });
        setTried(false);
        setDialog({ mode: 'reschedule', iv });
    };
    const closeDialog = () => { if (!saving) setDialog(null); };
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const scheduleValid = form.vacancyId && form.candidateId && form.date && form.time;

    const submitSchedule = async () => {
        setTried(true);
        if (!scheduleValid) { notify('Pick a vacancy, a candidate, a date and a time.', 'warning'); return; }

        setSaving(true);
        try {
            let body;
            if (dialog.mode === 'reschedule') {
                ({ data: body } = await http.put(RescheduleInterview, {
                    id: dialog.iv.id, date: dmyFromIso(form.date), time: form.time,
                    durationMinutes: Number(form.durationMins), mode: form.mode, meetingDetail: form.locationOrLink,
                }));
            } else {
                ({ data: body } = await http.post(ScheduleInterview, {
                    vacancyId: form.vacancyId, candidateId: form.candidateId, round: form.round,
                    date: dmyFromIso(form.date), time: form.time, durationMinutes: Number(form.durationMins),
                    mode: form.mode, meetingDetail: form.locationOrLink, panel: form.panel,
                }));
            }
            if (body?.error) throw new Error(body.message || 'Could not save the interview.');
            notify(body?.message || (dialog.mode === 'reschedule' ? 'Interview rescheduled.' : 'Interview scheduled.'));
            setDialog(null);
            await load();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not save the interview.'), 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Row actions ─────────────────────────────────────────────────────────
    const runAction = async (request, okMsg, errMsg) => {
        if (saving) return;
        setSaving(true);
        try {
            const { data: body } = await request();
            if (body?.error) throw new Error(body.message || errMsg);
            notify(body?.message || okMsg);
            await load();
            return true;
        } catch (err) {
            notify(apiErrorMessage(err, errMsg), 'error');
            return false;
        } finally {
            setSaving(false);
        }
    };

    // These three take the id as a query param, not a body.
    const conduct = (iv) => runAction(() => http.put(MarkInterviewConducted, null, { params: { id: iv.id } }), `${iv.candidateName}'s ${iv.round} marked as conducted.`, 'Could not update the interview.');
    const noShow = (iv) => runAction(() => http.put(MarkInterviewNoShow, null, { params: { id: iv.id } }), `${iv.candidateName} marked as a no-show.`, 'Could not update the interview.');
    const cancel = (iv) => runAction(() => http.put(CancelInterview, null, { params: { id: iv.id } }), `Interview with ${iv.candidateName} cancelled.`, 'Could not cancel the interview.');

    // ── Review ──────────────────────────────────────────────────────────────
    const openReview = (iv) => { setReview(iv); setRv(EMPTY_REVIEW); setTried(false); };

    const reviewValid = rv.outcome && (rv.outcome !== 'Rejected' || rv.rejectReason.trim());

    const submitReview = async () => {
        setTried(true);
        if (!reviewValid) {
            notify(!rv.outcome ? 'Pick an outcome for this interview.' : 'A rejection needs a reason — the candidate’s record keeps it.', 'warning');
            return;
        }
        // ReviewInterview takes { id, outcome, rating, feedback } only — there's
        // no separate reject-reason field, so a rejection's reason is folded into
        // the feedback text (it's still required in the form) rather than lost.
        const feedback = rv.outcome === 'Rejected'
            ? [rv.rejectReason.trim(), rv.feedback.trim()].filter(Boolean).join(' — ')
            : rv.feedback.trim();
        const ok = await runAction(
            () => http.put(ReviewInterview, { id: review.id, outcome: rv.outcome, rating: rv.rating, feedback }),
            rv.outcome === 'Selected' ? `${review.candidateName} cleared ${review.round}.`
                : rv.outcome === 'Rejected' ? `${review.candidateName} rejected — reason saved.`
                    : `${review.candidateName} put on hold.`,
            'Could not save the review.',
        );
        if (ok) setReview(null);
    };

    const rowProps = { busy: saving, onConduct: conduct, onReview: openReview, onReschedule: openReschedule, onCancel: cancel, onNoShow: noShow };
    const selectedOutcome = OUTCOMES.find((o) => o.key === rv.outcome);

    if (loading) {
        return <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}><CircularProgress size={28} /></Box>;
    }
    if (loadError) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity="error" sx={{ borderRadius: '9px' }}
                    action={<Button size="small" onClick={load} sx={{ textTransform: 'none', fontWeight: 700 }}>Retry</Button>}>
                    {loadError}
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2, pt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <StatCards items={STATS} />

            {/* Today */}
            <Panel
                title="Interviews Today"
                icon={TodayRoundedIcon}
                chip={`${data.today.length} scheduled`}
                action={(
                    <Stack direction="row" spacing={1}>
                        <Tooltip arrow title="Reload">
                            <IconButton onClick={() => { load(); loadOptions(); }} disabled={saving} sx={{ border: '1px solid #E6EAF1', borderRadius: '7px', color: '#64748B', height: 38, width: 38, '&:hover': { bgcolor: PRIMARY_LIGHT, color: PRIMARY } }}>
                                <RefreshRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                        <Button startIcon={<AddRoundedIcon />} onClick={openSchedule} sx={{ ...solidBtn, height: 38, px: 1.8, fontSize: 13 }}>Schedule Interview</Button>
                    </Stack>
                )}
            >
                {data.today.length === 0 ? (
                    <EmptyState icon={TodayRoundedIcon} title="No interviews today" hint="Schedule one, or check the upcoming list below." />
                ) : (
                    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                        {data.today.map((iv) => <InterviewRow key={iv.id} iv={iv} {...rowProps} tone="#C9BEFB" />)}
                    </Box>
                )}
            </Panel>

            {/* Awaiting review */}
            <Panel
                title="Awaiting Review"
                icon={RateReviewRoundedIcon}
                chip={`${data.awaiting.length} to review`}
                chipColor="#B45309"
                chipBg="#FFF7ED"
                hint="Conducted, but no outcome recorded yet"
            >
                {data.awaiting.length === 0 ? (
                    <EmptyState icon={CheckCircleRoundedIcon} title="Nothing waiting on you" hint="Every conducted interview has an outcome on file." />
                ) : (
                    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                        {data.awaiting.map((iv) => <InterviewRow key={iv.id} iv={iv} {...rowProps} tone="#FDE68A" />)}
                    </Box>
                )}
            </Panel>

            {/* Upcoming */}
            <Panel
                title="Upcoming Interviews"
                icon={UpcomingRoundedIcon}
                chip={`${data.upcoming.length} scheduled`}
                chipColor="#0369A1"
                chipBg="#E0F2FE"
            >
                {data.upcoming.length === 0 ? (
                    <EmptyState icon={UpcomingRoundedIcon} title="Nothing on the calendar" hint="Schedule an interview and it will show up here." />
                ) : (
                    <Box sx={{ p: 1.5 }}>
                        {/* Grouped by day, so a week reads as a schedule and not a list */}
                        {Object.entries(data.upcoming.reduce((acc, iv) => {
                            (acc[iv.date] = acc[iv.date] || []).push(iv);
                            return acc;
                        }, {})).map(([date, list]) => (
                            <Box key={date} sx={{ mb: 1.8, '&:last-of-type': { mb: 0 } }}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                                    <ScheduleRoundedIcon sx={{ fontSize: 15, color: '#94A3B8' }} />
                                    <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#475569' }}>{date}</Typography>
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

            {/* Completed */}
            <Panel
                title="Completed Interviews"
                icon={EventAvailableRoundedIcon}
                chip={`${data.completed.length} decided`}
                chipColor="#16A34A"
                chipBg="#DCFCE7"
                hint="Outcome and feedback on record"
            >
                {data.completed.length === 0 ? (
                    <EmptyState icon={EventAvailableRoundedIcon} title="No decisions yet" hint="Reviewed interviews land here with their outcome and feedback." />
                ) : (
                    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                        {data.completed.map((iv) => <InterviewRow key={iv.id} iv={iv} {...rowProps} />)}
                    </Box>
                )}
            </Panel>

            {/* ── Schedule / reschedule dialog ────────────────────────────── */}
            <Dialog open={Boolean(dialog)} onClose={closeDialog} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
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
                                        helperText={options.vacancies.length === 0 ? 'No open vacancies with candidates yet.' : ' '}
                                    >
                                        {options.vacancies.map((v) => (
                                            <MenuItem key={v.id} value={v.id} sx={{ fontSize: 13.5 }}>{v.label}</MenuItem>
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
                                            <MenuItem key={c.id} value={c.id} sx={{ fontSize: 13.5 }}>{c.label}</MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid size={12}>
                                    <TextField select label="Round" size="small" fullWidth value={form.round} onChange={set('round')} sx={field}>
                                        {options.rounds.map((r) => <MenuItem key={r} value={r} sx={{ fontSize: 13.5 }}>{r}</MenuItem>)}
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
                                {options.durations.map((d) => <MenuItem key={d} value={d} sx={{ fontSize: 13.5 }}>{d} min</MenuItem>)}
                            </TextField>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField select label="Mode" size="small" fullWidth value={form.mode} onChange={set('mode')} sx={field}>
                                {options.modes.map((m) => <MenuItem key={m} value={m} sx={{ fontSize: 13.5 }}>{m}</MenuItem>)}
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
                    <Button onClick={closeDialog} disabled={saving} sx={{ ...ghostBtn, height: 40, px: 2 }}>Cancel</Button>
                    <Button onClick={submitSchedule} disabled={saving} startIcon={saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null} sx={{ ...solidBtn, height: 40, px: 2.4 }}>
                        {saving ? 'Saving…' : dialog?.mode === 'reschedule' ? 'Save New Slot' : 'Schedule'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Review dialog ───────────────────────────────────────────── */}
            <Dialog open={Boolean(review)} onClose={() => { if (!saving) setReview(null); }} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Review Interview</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>
                        {review?.candidateName} · {review?.round}{review?.date ? ` · ${review.date}` : ''}
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#374151', mb: 0.8 }}>How did they do?</Typography>
                    <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center', mb: 2.2 }}>
                        <Rating value={rv.rating} onChange={(_, v) => setRv((r) => ({ ...r, rating: v || 0 }))} size="large" sx={{ '& .MuiRating-iconFilled': { color: '#F59E0B' } }} />
                        <Typography sx={{ fontSize: 12.5, color: '#98A0AE' }}>{rv.rating ? `${rv.rating} of 5` : 'Not rated'}</Typography>
                    </Stack>

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

                    <TextField
                        label="Feedback (optional)" size="small" fullWidth multiline minRows={3}
                        placeholder="What went well, what didn't, anything the next round should probe."
                        value={rv.feedback}
                        onChange={(e) => setRv((r) => ({ ...r, feedback: e.target.value }))}
                        sx={field}
                    />

                    {rv.outcome && (
                        <Box sx={{ mt: 2, p: 1.6, borderRadius: '9px', bgcolor: selectedOutcome.bg, border: `1px solid ${selectedOutcome.border}` }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: selectedOutcome.color, textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.4 }}>What happens next</Typography>
                            <Typography sx={{ fontSize: 12.5, color: '#334155' }}>
                                {rv.outcome === 'Selected' && <><strong>{review?.candidateName}</strong> clears this round and is marked <strong>Selected</strong>. Schedule the next round, or mark them joined from the Candidates tab once they accept.</>}
                                {rv.outcome === 'Rejected' && <><strong>{review?.candidateName}</strong> is marked <strong>Rejected</strong> and drops out of the pipeline. The reason is kept on their record.</>}
                                {rv.outcome === 'On Hold' && <><strong>{review?.candidateName}</strong> is parked as <strong>On Hold</strong> — they stay in the pipeline and can be picked up again later.</>}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setReview(null)} disabled={saving} sx={{ ...ghostBtn, height: 40, px: 2 }}>Cancel</Button>
                    <Button
                        onClick={submitReview} disabled={saving}
                        startIcon={saving ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : null}
                        sx={rv.outcome === 'Rejected'
                            ? { ...dangerBtn, height: 40, px: 2.4, bgcolor: '#DC2626', color: '#fff', border: 'none', '&:hover': { bgcolor: '#B91C1C' } }
                            : { ...successBtn, height: 40, px: 2.4 }}
                    >
                        {saving ? 'Saving…' : 'Save Review'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={Boolean(snack)} autoHideDuration={3800} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack(null)} severity={snack?.sev || 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack?.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
