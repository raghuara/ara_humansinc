import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Stack, Grid, Chip, Avatar, Button, Tooltip, IconButton, Alert, Badge } from '@mui/material';
import { keyframes } from '@mui/system';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import BeachAccessRoundedIcon from '@mui/icons-material/BeachAccessRounded';
import CakeRoundedIcon from '@mui/icons-material/CakeRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PhoneIphoneRoundedIcon from '@mui/icons-material/PhoneIphoneRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import RunningWithErrorsRoundedIcon from '@mui/icons-material/RunningWithErrorsRounded';
import MoreTimeRoundedIcon from '@mui/icons-material/MoreTimeRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { BarChart } from '@mui/x-charts/BarChart';
import { selectActiveEntity, selectActiveEntityId } from '../redux/slices/orgSlice';
import http, { apiErrorMessage } from '../Api/http';
import { GetDashboard, GetActionRequired } from '../Api/Api';
import Loader from '../components/Loader';

const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_BORDER = '#C9BEFB';
const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
const tonalBtn = { bgcolor: PRIMARY_LIGHT, color: PRIMARY, border: `1px solid ${PRIMARY_BORDER}`, fontWeight: 700, borderRadius: '7px', boxShadow: 'none', textTransform: 'none', '&:hover': { bgcolor: '#E7DFFC' } };
const solidBtn = { bgcolor: PRIMARY, color: '#fff', fontWeight: 700, borderRadius: '7px', boxShadow: `0 2px 6px ${PRIMARY}40`, textTransform: 'none', '&:hover': { bgcolor: '#6246E0' } };
const ghostBtn = { color: '#475569', bgcolor: '#fff', border: '1px solid #E5E7EB', fontWeight: 700, borderRadius: '7px', textTransform: 'none', '&:hover': { bgcolor: '#F8FAFC' } };

const fadeUp = keyframes`from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; }`;
const enter = (i) => ({ animation: `${fadeUp} .5s cubic-bezier(.22,1,.36,1) both`, animationDelay: `${i * 0.05}s` });

const initials = (s = '') => s.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const PALETTE = ['#7C5CFC', '#0EA5E9', '#F59E0B', '#16A34A', '#E11D48', '#6246E0', '#0891B2'];
const colorFor = (s = '') => PALETTE[(s.charCodeAt(0) || 0) % PALETTE.length];
const n = (v) => Number(v) || 0;

// "09:42" → "9:42 AM". Punch-in and interview times arrive 24-hour.
const fmtClock = (t) => {
    if (!t) return '—';
    const [h, m] = String(t).split(':').map(Number);
    if (!Number.isFinite(h)) return String(t);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${ampm}`;
};

// A clock time ("09:42", "09:42:10") anchored to today, so the running timer can
// count from it. Anything else is handed to Date, which covers a full timestamp.
const clockToDate = (v) => {
    if (!v) return null;
    const s = String(v);
    const hhmm = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (hhmm) {
        const d = new Date();
        d.setHours(Number(hhmm[1]), Number(hhmm[2]), Number(hhmm[3] || 0), 0);
        return d;
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
};

// Rupees at whatever scale the cycle happens to be — the trend axis has to read
// sensibly for a ₹8,200 month and a ₹1.5Cr one alike.
const compactInr = (v) => {
    const x = n(v);
    const a = Math.abs(x);
    if (a >= 1e7) return `₹${(x / 1e7).toFixed(a >= 1e8 ? 0 : 1)}Cr`;
    if (a >= 1e5) return `₹${(x / 1e5).toFixed(a >= 1e6 ? 0 : 1)}L`;
    if (a >= 1e3) return `₹${(x / 1e3).toFixed(a >= 1e4 ? 0 : 1)}K`;
    return `₹${Math.round(x)}`;
};

// ── Action Required catalogue ───────────────────────────────────────────────
// GetActionRequired owns the titles, subtitles and counts. All this map adds is
// how each one looks and where it takes you. A key the API adds later still
// renders — with a neutral icon and no link — instead of disappearing.
const ACTION_META = {
    leaveApprovals: { icon: BeachAccessRoundedIcon, color: '#0891B2', to: '/dashboard/leave-management' },
    payslipApprovals: { icon: FactCheckRoundedIcon, color: '#7C5CFC', to: '/dashboard/payslips' },
    overtime: { icon: MoreTimeRoundedIcon, color: '#F59E0B', to: '/dashboard/pay-adjustments?tab=overtime' },
    advances: { icon: SavingsRoundedIcon, color: '#16A34A', to: '/dashboard/pay-adjustments?tab=advances' },
    documentApprovals: { icon: DescriptionRoundedIcon, color: '#0EA5E9', to: '/dashboard/documents?tab=approvals' },
    shiftAssign: { icon: ScheduleRoundedIcon, color: '#E11D48', to: '/dashboard/leave-policy?tab=shifts' },
    resignations: { icon: LogoutRoundedIcon, color: '#DC2626', to: '/dashboard/employees' },
    interviewFeedback: { icon: EventAvailableRoundedIcon, color: '#6246E0', to: '/dashboard/recruitment?tab=interviews' },
};

const GAP_META = {
    entitySetup: { icon: ApartmentRoundedIcon, color: '#7C5CFC', to: '/dashboard/entities' },
    salaryStructures: { icon: RequestQuoteRoundedIcon, color: '#0EA5E9', to: '/dashboard/payroll-setup?tab=structures' },
    bankDetails: { icon: AccountBalanceRoundedIcon, color: '#16A34A', to: '/dashboard/payroll-setup?tab=bank' },
    noLoginAccess: { icon: AdminPanelSettingsRoundedIcon, color: '#E11D48', to: '/dashboard/employees' },
    probationDue: { icon: HowToRegRoundedIcon, color: '#F59E0B', to: '/dashboard/employees' },
    toRelieve: { icon: LogoutRoundedIcon, color: '#DC2626', to: '/dashboard/employees' },
    awaitingUpload: { icon: DescriptionRoundedIcon, color: '#0891B2', to: '/dashboard/documents?tab=requests' },
    staleInterviews: { icon: RunningWithErrorsRoundedIcon, color: '#6246E0', to: '/dashboard/recruitment?tab=interviews' },
};

const FALLBACK_META = { icon: TaskAltRoundedIcon, color: '#64748B', to: null };

// One tile in the Action Required grid. Compact horizontal row — icon, label —
// with the count shown as a notification badge on the top-right corner, so a
// dozen of them scan like a list of alerts. `clear` is the API's own verdict:
// it wins over count, so a done tile shows a green check and no badge, and is
// muted so the eye lands on what actually needs action.
function ActionTile({ item, meta, onOpen }) {
    const Icon = meta.icon;
    const live = !item.clear && n(item.count) > 0;
    return (
        <Badge
            badgeContent={live ? n(item.count) : 0}
            max={99}
            overlap="rectangular"
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            sx={{
                display: 'block', width: '100%', height: '100%',
                // Matches the sidebar inbox count pill exactly — flat red, no shadow,
                // no border.
                '& .MuiBadge-badge': {
                    top: 4, right: 6, minWidth: 20, height: 18, padding: '0 5px', borderRadius: '9px',
                    fontSize: 10, fontWeight: 800, color: '#fff', bgcolor: '#E11D48',
                },
            }}
        >
            <Stack
                direction="row"
                spacing={1.2}
                onClick={meta.to ? onOpen : undefined}
                sx={{
                    alignItems: 'center', p: 1, pr: 1.3, borderRadius: '10px', width: '100%', height: '100%',
                    cursor: meta.to ? 'pointer' : 'default',
                    border: '1px solid', borderColor: live ? `${meta.color}2E` : '#EEF1F6',
                    bgcolor: live ? `${meta.color}0A` : '#FBFBFD',
                    transition: 'border-color .15s, box-shadow .15s, transform .15s',
                    ...(meta.to && { '&:hover': { transform: 'translateY(-1px)', borderColor: `${meta.color}66`, boxShadow: `0 6px 16px -8px ${meta.color}88` } }),
                }}
            >
                <Box sx={{ width: 32, height: 32, borderRadius: '8px', flexShrink: 0, bgcolor: live ? `${meta.color}18` : '#EEF1F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon sx={{ fontSize: 17, color: live ? meta.color : '#AAB2C0' }} />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: live ? '#0F172A' : '#64748B', lineHeight: 1.2 }} noWrap>{item.title}</Typography>
                    <Typography sx={{ fontSize: 10.5, color: '#98A0AE', lineHeight: 1.2 }} noWrap>{item.subtitle}</Typography>
                </Box>
                {!live && <CheckCircleRoundedIcon sx={{ fontSize: 18, color: '#86EFAC', flexShrink: 0 }} />}
            </Stack>
        </Badge>
    );
}

// Section card wrapper with a header row
function Panel({ title, icon: Icon, action, onAction, color = PRIMARY, children, i = 0 }) {
    return (
        <Box sx={{ ...card, p: 0, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'box-shadow .22s, transform .22s, border-color .22s', '&:hover': { boxShadow: '0 14px 32px -16px rgba(16,24,40,0.24)', borderColor: '#E4E0F6', transform: 'translateY(-2px)' }, ...enter(i) }}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2.2, py: 1.7, bgcolor: `${color}12`, borderBottom: `1px solid ${color}24` }}>
                <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center' }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: '#fff', boxShadow: '0 1px 4px rgba(16,24,40,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon sx={{ fontSize: 19, color }} />
                    </Box>
                    <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: '#0F172A' }}>{title}</Typography>
                </Stack>
                {action && (
                    <Button onClick={onAction} endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 15 }} />} sx={{ textTransform: 'none', fontSize: 12, fontWeight: 700, color: PRIMARY, minWidth: 0, px: 1, borderRadius: '7px', '&:hover': { bgcolor: PRIMARY_LIGHT } }}>{action}</Button>
                )}
            </Stack>
            <Box sx={{ p: 2.2, flexGrow: 1 }}>{children}</Box>
        </Box>
    );
}

// A small empty state — every list on this page can legitimately come back empty.
function Nothing({ icon: Icon, title, hint, color = '#CBD2DD' }) {
    return (
        <Box sx={{ textAlign: 'center', py: 5 }}>
            <Icon sx={{ fontSize: 34, color }} />
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#64748B', mt: 1 }}>{title}</Typography>
            {hint && <Typography sx={{ fontSize: 12, color: '#98A0AE', mt: 0.3 }}>{hint}</Typography>}
        </Box>
    );
}

export default function DashboardPage() {
    const navigate = useNavigate();
    const auth = useSelector((s) => s.auth);
    const activeEntity = useSelector(selectActiveEntity);
    const activeEntityId = useSelector(selectActiveEntityId);

    const [data, setData] = useState(null);
    const [actions, setActions] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    // Re-fetches when the sidebar entity changes. `activeEntityId` isn't read in
    // the body — the scope travels in the X-Entity-Id header the interceptor adds
    // — but the same URL returns a different entity's numbers, so it belongs in
    // the deps. eslint can't see through the interceptor to know that.
    const load = useCallback(async () => {
        setLoading(true);
        // Two independent panels. The main payload failing is fatal — the page is
        // mostly empty without it — but a failed Action Required only costs that
        // one card, so it's allowed to come back null.
        const [mainRes, actionRes] = await Promise.allSettled([
            http.get(GetDashboard),
            http.get(GetActionRequired),
        ]);
        try {
            if (mainRes.status === 'rejected') throw mainRes.reason;
            const body = mainRes.value?.data;
            if (body?.error) throw new Error(body.message || 'Could not load the dashboard.');
            setData(body?.data || {});
            setLoadError('');
        } catch (err) {
            setLoadError(apiErrorMessage(err, 'Could not load the dashboard.'));
        }
        const actionBody = actionRes.status === 'fulfilled' ? actionRes.value?.data : null;
        setActions(actionBody && !actionBody.error ? actionBody.data || null : null);
        setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeEntityId]);

    useEffect(() => { load(); }, [load]);

    const me = data?.me || {};
    const stats = data?.stats || {};
    const payroll = data?.payroll || {};
    const needs = data?.needsAttention || {};
    const listOf = (k) => (Array.isArray(data?.[k]) ? data[k] : []);
    const interviewsToday = listOf('interviewsToday');
    const lateComers = listOf('lateComers');
    const leaveRequests = listOf('leaveRequests');
    const newJoiners = listOf('newJoiners');
    const resignations = listOf('resignations');
    const birthdays = listOf('birthdays');
    const anniversaries = listOf('anniversaries');
    const trend = listOf('payrollTrend');
    const steps = Array.isArray(payroll.steps) ? payroll.steps : [];

    // The timer counts from the first punch of the day. Not clocked in → 00:00:00,
    // which is what the card showed before any of this was wired up.
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        const start = me.clockedIn ? clockToDate(me.firstIn) : null;
        if (!start) { setElapsed(0); return undefined; }
        const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000)));
        tick();
        const t = setInterval(tick, 1000);
        return () => clearInterval(t);
    }, [me.clockedIn, me.firstIn]);
    const fmtTimer = (s) => [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((x) => String(x).padStart(2, '0')).join(':');

    const now = new Date();
    const hr = now.getHours();
    const greet = hr < 12 ? 'morning' : hr < 17 ? 'afternoon' : 'evening';
    const entityName = activeEntity?.name || auth.organisation || 'your organisation';
    const today = me.dateLabel || now.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });

    const total = n(stats.totalEmployees);

    // Items that need HR attention — counts straight from the API.
    const alerts = [
        { key: 'extendedLeave', icon: BeachAccessRoundedIcon, color: '#F59E0B', bg: '#FFF7ED', title: 'Extended Leave', desc: '3+ continuous days', count: n(needs.extendedLeave) },
        { key: 'lateArrivals', icon: ScheduleRoundedIcon, color: '#E11D48', bg: '#FEE2E2', title: 'Late Arrivals', desc: 'Clocked in after shift start', count: n(needs.lateArrivals) },
        { key: 'absentNoNotice', icon: EventBusyRoundedIcon, color: '#DC2626', bg: '#FEE2E2', title: 'Absent · No Notice', desc: 'Unmarked absence today', count: n(needs.absentNoNotice) },
        { key: 'probationEnding', icon: HowToRegRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE', title: 'Probation Ending', desc: 'Confirmation due this week', count: n(needs.probationEnding) },
        { key: 'documentsPending', icon: DescriptionRoundedIcon, color: '#7C5CFC', bg: '#F1EEFE', title: 'Documents Pending', desc: 'Incomplete onboarding', count: n(needs.documentsPending) },
    ];

    // ── Action Required ───────────────────────────────────────────────────────
    // Entirely server-owned now: what's waiting on you (`cards`), what's missing
    // from setup (`gaps`), and where the working calendar stands.
    const actionCards = Array.isArray(actions?.cards) ? actions.cards : [];
    // These setup gaps are intentionally hidden from the dashboard.
    const HIDDEN_GAP_KEYS = ['entitySetup', 'noLoginAccess', 'toRelieve'];
    const actionGaps = (Array.isArray(actions?.gaps) ? actions.gaps : []).filter((g) => !HIDDEN_GAP_KEYS.includes(g.key));
    const totalActions = n(actions?.totalPending);
    const totalGaps = n(actions?.totalGaps);
    const cal = actions?.workingCalendar || null;

    const absentTotal = n(stats.absentToday) + n(stats.onLeaveToday);
    const KPIS = [
        { label: 'Total Employees', value: total, sub: 'Active workforce', icon: GroupsRoundedIcon, color: PRIMARY, bg: PRIMARY_LIGHT, onClick: () => navigate('/dashboard/employees') },
        { label: 'Present Today', value: n(stats.presentToday), sub: `${n(stats.presentPercent)}% attendance`, icon: HowToRegRoundedIcon, color: '#16A34A', bg: '#DCFCE7', onClick: () => navigate('/dashboard/attendance-leave?tab=overview') },
        { label: 'Absent Today', value: absentTotal, sub: `${n(stats.absentToday)} absent · ${n(stats.onLeaveToday)} on leave`, icon: EventBusyRoundedIcon, color: '#F59E0B', bg: '#FFF7ED', onClick: () => navigate('/dashboard/attendance-leave?tab=overview') },
        { label: 'Late Comers Today', value: n(stats.lateComersToday), sub: stats.latestLateLabel || 'Everyone on time', icon: RunningWithErrorsRoundedIcon, color: '#E11D48', bg: '#FEE2E2', onClick: () => navigate('/dashboard/attendance-leave?tab=overview') },
    ];

    const quickActions = [
        { label: 'Onboard Employee', icon: PersonAddAlt1RoundedIcon, to: '/dashboard/employees/onboard', color: '#7C5CFC' },
        { label: 'Run Payroll', icon: FactCheckRoundedIcon, to: '/dashboard/run-payroll', color: '#16A34A' },
        { label: 'Salary Structures', icon: RequestQuoteRoundedIcon, to: '/dashboard/payroll-setup?tab=structures', color: '#0EA5E9' },
        { label: 'Mark Attendance', icon: HowToRegRoundedIcon, to: '/dashboard/attendance-leave?tab=attendance', color: '#F59E0B' },
        { label: 'Leave Management', icon: BeachAccessRoundedIcon, to: '/dashboard/attendance-leave?tab=leave', color: '#0891B2' },
        { label: 'Roles & Access', icon: AdminPanelSettingsRoundedIcon, to: '/dashboard/roles', color: '#E11D48' },
    ];

    if (loading) return <Loader />;

    if (loadError) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity="error" sx={{ borderRadius: '9px' }} action={<Button size="small" onClick={load} sx={{ textTransform: 'none', fontWeight: 700 }}>Retry</Button>}>
                    {loadError}
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            {/* Header */}
            <Stack direction="row" sx={{ alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, pb: 2.5 }}>
                <Box>
                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>Good {greet}, {auth.userName || 'Admin'} 👋</Typography>
                    <Typography sx={{ fontSize: 13, color: '#6B7280', mt: 0.3 }}>Here's what's happening at {entityName} today · {today}</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Tooltip arrow title="Reload">
                        <IconButton onClick={load} sx={{ ...ghostBtn, width: 42, height: 42 }}><RefreshRoundedIcon sx={{ fontSize: 19 }} /></IconButton>
                    </Tooltip>
                    <Button onClick={() => navigate('/dashboard/employees/onboard')} startIcon={<PersonAddAlt1RoundedIcon />} sx={{ ...tonalBtn, height: 42, px: 2 }}>Onboard</Button>
                    <Button onClick={() => navigate('/dashboard/run-payroll?tab=register')} startIcon={<PlayArrowRoundedIcon />} sx={{ ...solidBtn, height: 42, px: 2.2 }}>Run Payroll</Button>
                </Stack>
            </Stack>

            {/* Clock-in card + KPI cards */}
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Box sx={{ ...enter(0), background: 'linear-gradient(160deg, #7C5CFC 0%, #6246E0 100%)', borderRadius: '7px', p: 3, color: '#fff', height: '100%', position: 'relative', overflow: 'hidden', boxShadow: '0 16px 34px -18px rgba(124,92,252,0.7)' }}>
                        <Box sx={{ position: 'absolute', top: -40, right: -30, width: 150, height: 150, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)' }} />
                        <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', opacity: 0.85, position: 'relative' }}>TODAY</Typography>
                        <Typography sx={{ fontSize: 13.5, opacity: 0.9, mb: 2.2, position: 'relative' }}>{today}</Typography>
                        <Typography sx={{ fontSize: 42, fontWeight: 800, letterSpacing: '1px', lineHeight: 1, position: 'relative' }}>{fmtTimer(elapsed)}</Typography>

                        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', mt: 1.2, mb: 2.5, position: 'relative' }}>
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: me.clockedIn ? '#4ADE80' : 'rgba(255,255,255,0.6)', boxShadow: me.clockedIn ? '0 0 0 3px rgba(74,222,128,0.25)' : 'none' }} />
                            <Typography sx={{ fontSize: 13, opacity: 0.9 }}>{me.statusLabel || (me.clockedIn ? 'Clocked in' : 'Not clocked in yet')}</Typography>
                        </Stack>

                        <Stack direction="row" spacing={1} sx={{ mb: 1.2, position: 'relative' }}>
                            {[
                                ['BREAK', me.breakDuration || '00:00:00'],
                                ['SHIFT', me.shiftName || (me.shiftStart ? `${fmtClock(me.shiftStart)}` : '—')],
                                ['OT', me.otDuration || '00:00:00'],
                            ].map(([l, v]) => (
                                <Box key={l} sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.14)', borderRadius: '7px', p: 1.2, minWidth: 0 }}>
                                    <Typography sx={{ fontSize: 9.5, fontWeight: 700, opacity: 0.8 }}>{l}</Typography>
                                    <Typography sx={{ fontSize: 12.5, fontWeight: 800, mt: 0.3 }} noWrap>{v}</Typography>
                                </Box>
                            ))}
                        </Stack>

                        <Stack direction="row" spacing={1} sx={{ position: 'relative' }}>
                            {[['FIRST IN', me.firstIn], ['LAST OUT', me.lastOut]].map(([l, v]) => (
                                <Box key={l} sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.14)', borderRadius: '7px', p: 1.2 }}>
                                    <Typography sx={{ fontSize: 9.5, fontWeight: 700, opacity: 0.8 }}>{l}</Typography>
                                    <Typography sx={{ fontSize: 12.5, fontWeight: 800, mt: 0.3 }}>{v ? fmtClock(v) : '—'}</Typography>
                                </Box>
                            ))}
                        </Stack>

                        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', mt: 2.2, pt: 1.6, borderTop: '1px solid rgba(255,255,255,0.18)', opacity: 0.85, position: 'relative' }}>
                            <PhoneIphoneRoundedIcon sx={{ fontSize: 14 }} />
                            <Typography sx={{ fontSize: 11.5 }}>Punch in from the ARA HumanSync mobile app</Typography>
                        </Stack>
                    </Box>
                </Grid>

                {/* 4 KPI cards (2×2) */}
                <Grid size={{ xs: 12, lg: 8 }}>
                    <Grid container spacing={1.5} sx={{ height: '100%' }}>
                        {KPIS.map((k, i) => (
                            <Grid size={{ xs: 12, sm: 6 }} key={k.label}>
                                <Box onClick={k.onClick} sx={{ ...card, p: 2.5, bgcolor: k.bg, border: `1px solid ${k.color}22`, cursor: 'pointer', height: '100%', transition: 'transform .15s, box-shadow .15s', '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 20px ${k.color}22` }, ...enter(i + 1) }}>
                                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: k.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</Typography>
                                            <Typography sx={{ fontSize: 28, fontWeight: 800, color: '#0F172A', mt: 0.5 }}>{k.value}</Typography>
                                            <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#6B7280', mt: 0.3 }} noWrap>{k.sub}</Typography>
                                        </Box>
                                        <Box sx={{ width: 44, height: 44, borderRadius: '7px', bgcolor: '#fff', boxShadow: '0 1px 3px rgba(16,24,40,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <k.icon sx={{ color: k.color, fontSize: 22 }} />
                                        </Box>
                                    </Stack>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Grid>
            </Grid>

            {/* Action Required — every open work queue in one card */}
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                <Grid size={12}>
                    <Panel
                        title="Action Required"
                        icon={TaskAltRoundedIcon}
                        color="#E11D48"
                        action={totalActions > 0 ? 'Clear your queue' : undefined}
                        onAction={() => navigate('/dashboard/documents?tab=approvals')}
                        i={3}
                    >
                        {!actions ? (
                            <Nothing icon={TaskAltRoundedIcon} title="Couldn't load your queue" hint="The rest of the dashboard is unaffected — reload to try again." />
                        ) : (
                            <>
                                <Typography sx={{ fontSize: 12.5, color: '#64748B', mb: 1.6 }}>
                                    {totalActions > 0
                                        ? <>You have <b style={{ color: '#0F172A' }}>{totalActions}</b> item{totalActions > 1 ? 's' : ''} waiting on you.</>
                                        : 'You\'re all caught up — nothing needs approval right now.'}
                                </Typography>

                                <Grid container spacing={1}>
                                    {actionCards.map((a) => {
                                        const meta = ACTION_META[a.key] || FALLBACK_META;
                                        return (
                                            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={a.key}>
                                                <ActionTile item={a} meta={meta} onOpen={() => navigate(meta.to)} />
                                            </Grid>
                                        );
                                    })}
                                </Grid>

                                {/* Setup gaps — not approvals, but things that block payroll
                                    or onboarding until someone fills them in. */}
                                {actionGaps.length > 0 && (
                                    <Box sx={{ mt: 2, pt: 1.8, borderTop: '1px solid #F1F0F9' }}>
                                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.2 }}>
                                            <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4 }}>Setup Gaps</Typography>
                                            {totalGaps > 0 && <Chip label={totalGaps} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: '#FEF3C7', color: '#B45309' }} />}
                                        </Stack>
                                        <Grid container spacing={1}>
                                            {actionGaps.map((g) => {
                                                const meta = GAP_META[g.key] || FALLBACK_META;
                                                return (
                                                    <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={g.key}>
                                                        <ActionTile item={g} meta={meta} onOpen={() => navigate(meta.to)} />
                                                    </Grid>
                                                );
                                            })}
                                        </Grid>
                                    </Box>
                                )}

                                {/* Working calendar — the API decides whether it's set, how
                                    long is left, and what to say about it. */}
                                {cal && (
                                    <Stack
                                        direction="row"
                                        onClick={() => navigate('/dashboard/leave-policy?tab=calendar')}
                                        sx={{
                                            mt: 1.6, alignItems: 'center', gap: 1.5, p: 1.6, borderRadius: '10px', cursor: 'pointer',
                                            bgcolor: cal.isSet ? '#F5FDF8' : (cal.overdue ? '#FEF2F2' : '#FFF7ED'),
                                            border: `1px solid ${cal.isSet ? '#DCFCE7' : (cal.overdue ? '#FECDD3' : '#FCEBD0')}`,
                                            transition: 'background-color .15s',
                                            '&:hover': { bgcolor: cal.isSet ? '#ECFDF3' : (cal.overdue ? '#FEE2E2' : '#FEF0DC') },
                                        }}
                                    >
                                        <Box sx={{ width: 40, height: 40, borderRadius: '10px', flexShrink: 0, bgcolor: cal.isSet ? '#DCFCE7' : (cal.overdue ? '#FEE2E2' : '#FEF3C7'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <CalendarMonthRoundedIcon sx={{ fontSize: 21, color: cal.isSet ? '#16A34A' : (cal.overdue ? '#E11D48' : '#B45309') }} />
                                        </Box>
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>Working Calendar · {cal.title || cal.monthName}</Typography>
                                            <Typography sx={{ fontSize: 11.5, color: '#64748B' }} noWrap>{cal.note}</Typography>
                                        </Box>
                                        {(cal.daysLeftLabel || cal.daysLeft != null) && (
                                            <Chip
                                                label={cal.daysLeftLabel || `${n(cal.daysLeft)}d left`}
                                                size="small"
                                                sx={{ height: 24, fontSize: 11, fontWeight: 800, flexShrink: 0, bgcolor: cal.isSet ? '#DCFCE7' : (cal.overdue ? '#FEE2E2' : '#FEF3C7'), color: cal.isSet ? '#16A34A' : (cal.overdue ? '#E11D48' : '#B45309') }}
                                            />
                                        )}
                                        <Button
                                            onClick={(e) => { e.stopPropagation(); navigate('/dashboard/leave-policy?tab=calendar'); }}
                                            endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 15 }} />}
                                            sx={{ ...tonalBtn, height: 34, px: 1.6, display: { xs: 'none', sm: 'inline-flex' } }}
                                        >
                                            {cal.isSet ? 'View' : 'Set calendar'}
                                        </Button>
                                    </Stack>
                                )}
                            </>
                        )}
                    </Panel>
                </Grid>
            </Grid>

            {/* Row: interviews today · late comers today · payroll status */}
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                    <Panel title="Interviews Today" icon={EventAvailableRoundedIcon} color="#0EA5E9" action="Recruitment" onAction={() => navigate('/dashboard/recruitment?tab=interviews')} i={4}>
                        {interviewsToday.length === 0 ? (
                            <Nothing icon={EventAvailableRoundedIcon} title="No interviews today" hint="Schedule one from Recruitment." />
                        ) : (
                            <Stack spacing={0.6}>
                                {interviewsToday.map((iv, idx) => {
                                    const name = iv.candidateName || iv.name || '—';
                                    const outcome = iv.outcome || null;
                                    const toReview = iv.status === 'Conducted' && !outcome;
                                    const tone = outcome
                                        ? (outcome === 'Selected' ? { c: '#16A34A', bg: '#DCFCE7' } : outcome === 'Rejected' ? { c: '#E11D48', bg: '#FEE2E2' } : { c: '#B45309', bg: '#FFF7ED' })
                                        : toReview ? { c: '#B45309', bg: '#FFF7ED' } : { c: '#64748B', bg: '#F1F5F9' };
                                    return (
                                        <Stack
                                            key={iv.id ?? idx}
                                            direction="row"
                                            onClick={() => navigate('/dashboard/recruitment?tab=interviews')}
                                            sx={{ alignItems: 'center', gap: 1.2, p: 1, borderRadius: '9px', cursor: 'pointer', transition: 'background-color .15s', '&:hover': { bgcolor: '#F8FAFC' } }}
                                        >
                                            <Box sx={{ minWidth: 62, textAlign: 'center', px: 0.8, py: 0.7, borderRadius: '8px', bgcolor: '#E0F2FE', flexShrink: 0 }}>
                                                <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: '#0369A1', lineHeight: 1.2 }}>{fmtClock(iv.time || iv.scheduledTime)}</Typography>
                                                {Boolean(iv.durationMins || iv.duration) && (
                                                    <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#0EA5E9' }}>{iv.durationMins || iv.duration}m</Typography>
                                                )}
                                            </Box>
                                            <Avatar sx={{ width: 34, height: 34, bgcolor: colorFor(name), fontSize: 12, fontWeight: 700 }}>{iv.initials || initials(name)}</Avatar>
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }} noWrap>{name}</Typography>
                                                <Typography sx={{ fontSize: 10.5, color: '#94A3B8' }} noWrap>{[iv.round, iv.vacancyTitle || iv.roleTitle].filter(Boolean).join(' · ')}</Typography>
                                            </Box>
                                            <Chip
                                                label={outcome || (toReview ? 'To review' : iv.mode || 'Scheduled')}
                                                size="small"
                                                sx={{ height: 19, fontSize: 9.5, fontWeight: 700, flexShrink: 0, bgcolor: tone.bg, color: tone.c }}
                                            />
                                        </Stack>
                                    );
                                })}
                            </Stack>
                        )}
                    </Panel>
                </Grid>

                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                    <Panel title="Late Comers Today" icon={RunningWithErrorsRoundedIcon} color="#E11D48" action="Attendance" onAction={() => navigate('/dashboard/attendance-leave?tab=overview')} i={5}>
                        {lateComers.length === 0 ? (
                            <Nothing icon={CheckCircleRoundedIcon} color="#BBF7D0" title="Everyone was on time" hint="No punches after the shift start." />
                        ) : (
                            <Stack spacing={0.6}>
                                {lateComers.map((p, idx) => {
                                    const name = p.name || '—';
                                    return (
                                        <Stack key={p.id ?? idx} direction="row" sx={{ alignItems: 'center', gap: 1.2, p: 1, borderRadius: '9px', transition: 'background-color .15s', '&:hover': { bgcolor: '#FFF7F8' } }}>
                                            <Avatar sx={{ width: 34, height: 34, bgcolor: `${colorFor(name)}22`, color: colorFor(name), fontSize: 12, fontWeight: 700 }}>{p.initials || initials(name)}</Avatar>
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }} noWrap>{name}</Typography>
                                                <Typography sx={{ fontSize: 10.5, color: '#94A3B8' }} noWrap>{p.department || p.dept || p.subtitle || '—'}</Typography>
                                            </Box>
                                            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>{fmtClock(p.inTime || p.firstIn)}</Typography>
                                                {Boolean(p.lateByLabel || p.lateBy) && (
                                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#E11D48' }}>{p.lateByLabel || p.lateBy} late</Typography>
                                                )}
                                            </Box>
                                        </Stack>
                                    );
                                })}
                            </Stack>
                        )}
                    </Panel>
                </Grid>

                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                    <Panel title="Payroll Status" icon={PaymentsRoundedIcon} color="#7C5CFC" i={5}>
                        {!payroll.hasCycle ? (
                            <Nothing icon={PaymentsRoundedIcon} title="No payroll cycle yet" hint="Start this month's run from Run Payroll." />
                        ) : (
                            <>
                                <Typography sx={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{payroll.cycleLabel || 'Current cycle'}</Typography>
                                <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mt: 0.5, gap: 1 }}>
                                    <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#0F172A' }}>₹{n(payroll.grossPayout).toLocaleString('en-IN')}</Typography>
                                    {payroll.statusBadge && <Chip label={payroll.statusBadge} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, flexShrink: 0, bgcolor: '#FEF3C7', color: '#B45309' }} />}
                                </Stack>
                                <Typography sx={{ fontSize: 11.5, color: '#6B7280', mt: 0.3 }}>
                                    Gross payout · {n(payroll.employees)} employee{n(payroll.employees) === 1 ? '' : 's'} · net ₹{n(payroll.netPayout).toLocaleString('en-IN')}
                                </Typography>
                                <Stack spacing={0} sx={{ mt: 2 }}>
                                    {steps.map((s) => (
                                        <Stack key={s.label} direction="row" spacing={1.2} sx={{ alignItems: 'center', py: 0.5 }}>
                                            {s.done ? <CheckCircleRoundedIcon sx={{ fontSize: 18, color: PRIMARY }} /> : <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 18, color: s.current ? PRIMARY : '#CBD2DD' }} />}
                                            <Typography sx={{ fontSize: 12.5, fontWeight: s.done || s.current ? 700 : 500, color: s.done || s.current ? '#0F172A' : '#94A3B8' }}>{s.label}</Typography>
                                            {s.current && <Chip label="Current" size="small" sx={{ height: 18, fontSize: 9.5, fontWeight: 700, bgcolor: PRIMARY_LIGHT, color: PRIMARY }} />}
                                        </Stack>
                                    ))}
                                </Stack>
                                <Button fullWidth onClick={() => navigate('/dashboard/payslips')} endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />} sx={{ ...tonalBtn, mt: 1.5, height: 38 }}>Continue Payroll</Button>
                            </>
                        )}
                    </Panel>
                </Grid>
            </Grid>

            {/* Quick actions */}
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                <Grid size={12}>
                    <Panel title="Quick Actions" icon={PlayArrowRoundedIcon} color="#0EA5E9" i={6}>
                        <Grid container spacing={1}>
                            {quickActions.map((a) => (
                                <Grid size={{ xs: 6, sm: 4, lg: 2 }} key={a.label}>
                                    <Stack onClick={() => navigate(a.to)} spacing={0.8} sx={{ alignItems: 'flex-start', p: 1.4, borderRadius: '8px', border: '1px solid #EEF1F6', bgcolor: '#F8FAFC', cursor: 'pointer', height: '100%', transition: 'all .15s', '&:hover': { borderColor: `${a.color}55`, bgcolor: `${a.color}0D`, transform: 'translateY(-1px)' } }}>
                                        <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: `${a.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <a.icon sx={{ fontSize: 18, color: a.color }} />
                                        </Box>
                                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#334155', lineHeight: 1.25 }}>{a.label}</Typography>
                                    </Stack>
                                </Grid>
                            ))}
                        </Grid>
                    </Panel>
                </Grid>
            </Grid>

            {/* Row: payroll trend bar chart · needs attention */}
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                <Grid size={{ xs: 12, lg: 8 }}>
                    <Panel title="Payroll Cost Trend" icon={PaymentsRoundedIcon} color="#7C5CFC" action="Salary Register" onAction={() => navigate('/dashboard/run-payroll?tab=register')} i={7}>
                        {trend.length === 0 ? (
                            <Nothing icon={PaymentsRoundedIcon} title="No payroll history yet" hint="The trend builds up as cycles are run." />
                        ) : (
                            <BarChart
                                xAxis={[{ scaleType: 'band', data: trend.map((t) => t.month), categoryGapRatio: 0.55, barGapRatio: 0.3 }]}
                                yAxis={[{ valueFormatter: compactInr, width: 56 }]}
                                series={[
                                    { data: trend.map((t) => n(t.gross)), label: 'Gross', color: '#7C5CFC', valueFormatter: (v) => `₹${n(v).toLocaleString('en-IN')}` },
                                    { data: trend.map((t) => n(t.net)), label: 'Net', color: '#C4B5FD', valueFormatter: (v) => `₹${n(v).toLocaleString('en-IN')}` },
                                ]}
                                height={250}
                                borderRadius={6}
                                grid={{ horizontal: true }}
                                margin={{ top: 16, right: 8, bottom: 24, left: 8 }}
                                slotProps={{ legend: { direction: 'horizontal', position: { vertical: 'top', horizontal: 'end' } } }}
                                sx={{ '& .MuiChartsAxis-line, & .MuiChartsAxis-tick': { display: 'none' }, '& .MuiChartsGrid-line': { stroke: '#EEF1F6' }, '& .MuiChartsAxis-tickLabel': { fontSize: 11, fill: '#94A3B8' } }}
                            />
                        )}
                    </Panel>
                </Grid>
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Panel title="Needs Attention" icon={WarningAmberRoundedIcon} color="#F59E0B" i={8}>
                        <Stack spacing={0.5}>
                            {alerts.map((a) => (
                                <Stack key={a.key} direction="row" sx={{ alignItems: 'center', gap: 1.3, p: 1, borderRadius: '9px', transition: 'background-color .15s', opacity: a.count ? 1 : 0.6, '&:hover': { bgcolor: '#F8FAFC' } }}>
                                    <Box sx={{ width: 36, height: 36, borderRadius: '9px', bgcolor: a.count ? a.bg : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <a.icon sx={{ fontSize: 19, color: a.count ? a.color : '#94A3B8' }} />
                                    </Box>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }} noWrap>{a.title}</Typography>
                                        <Typography sx={{ fontSize: 11, color: '#94A3B8' }} noWrap>{a.desc}</Typography>
                                    </Box>
                                    <Box sx={{ minWidth: 26, height: 24, px: 0.9, borderRadius: '7px', bgcolor: a.count ? a.bg : '#F1F5F9', color: a.count ? a.color : '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>{a.count}</Typography>
                                    </Box>
                                </Stack>
                            ))}
                        </Stack>
                    </Panel>
                </Grid>
            </Grid>

            {/* Row: leave requests · joiners & resignations */}
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                <Grid size={{ xs: 12, lg: 6 }}>
                    <Panel title="Leave Requests" icon={BeachAccessRoundedIcon} color="#0891B2" action="View all" onAction={() => navigate('/dashboard/attendance-leave?tab=leave')} i={7}>
                        {leaveRequests.length === 0 ? (
                            <Nothing icon={BeachAccessRoundedIcon} title="No leave requests" hint="Nothing is waiting on a decision." />
                        ) : (
                            <Stack spacing={0.4}>
                                {leaveRequests.map((lr, idx) => {
                                    const tone = lr.colorTag || colorFor(lr.name || '');
                                    return (
                                        <Stack key={lr.id ?? idx} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, p: 1, borderRadius: '9px', transition: 'background-color .15s', '&:hover': { bgcolor: '#F8FAFC' } }}>
                                            <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center', minWidth: 0 }}>
                                                <Avatar sx={{ width: 38, height: 38, bgcolor: `${tone}22`, color: tone, fontSize: 12.5, fontWeight: 700, border: `2px solid ${tone}33` }}>{lr.initials || initials(lr.name || '')}</Avatar>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }} noWrap>{lr.name}</Typography>
                                                    <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center', mt: 0.2 }}>
                                                        <Chip label={lr.leaveType} size="small" sx={{ height: 17, fontSize: 9.5, fontWeight: 700, bgcolor: `${tone}18`, color: tone, '& .MuiChip-label': { px: 0.7 } }} />
                                                        <Typography sx={{ fontSize: 11, color: '#94A3B8' }} noWrap>{[lr.daysLabel, lr.dateRange].filter(Boolean).join(' · ')}</Typography>
                                                    </Stack>
                                                </Box>
                                            </Stack>
                                            <Stack direction="row" spacing={0.6} sx={{ flexShrink: 0 }}>
                                                <Tooltip arrow title="Review in Leave Management">
                                                    <IconButton size="small" onClick={() => navigate('/dashboard/attendance-leave?tab=leave')} sx={{ bgcolor: '#DCFCE7', borderRadius: '7px', width: 30, height: 30, '&:hover': { bgcolor: '#BBF7D0' } }}><CheckRoundedIcon sx={{ fontSize: 16, color: '#16A34A' }} /></IconButton>
                                                </Tooltip>
                                                <Tooltip arrow title="Review in Leave Management">
                                                    <IconButton size="small" onClick={() => navigate('/dashboard/attendance-leave?tab=leave')} sx={{ bgcolor: '#FEE2E2', borderRadius: '7px', width: 30, height: 30, '&:hover': { bgcolor: '#FECACA' } }}><CloseRoundedIcon sx={{ fontSize: 16, color: '#DC2626' }} /></IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </Stack>
                                    );
                                })}
                            </Stack>
                        )}
                    </Panel>
                </Grid>

                <Grid size={{ xs: 12, lg: 6 }}>
                    <Panel title="New Joiners & Resignations" icon={PersonAddAlt1RoundedIcon} color="#16A34A" i={8}>
                        <Grid container spacing={2}>
                            {[
                                { rows: newJoiners, label: 'New Joiners', icon: PersonAddAlt1RoundedIcon, colour: '#16A34A', bg: '#F5FDF8', border: '#DCFCE7', chipBg: '#DCFCE7', empty: 'No recent joiners' },
                                { rows: resignations, label: 'Resignations', icon: LogoutRoundedIcon, colour: '#E11D48', bg: '#FFF7F8', border: '#FEE2E2', chipBg: '#FEE2E2', empty: 'None this month' },
                            ].map((col) => (
                                <Grid size={{ xs: 12, sm: 6 }} key={col.label}>
                                    <Box sx={{ bgcolor: col.bg, border: `1px solid ${col.border}`, borderRadius: '10px', p: 1.4, height: '100%' }}>
                                        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', mb: 1.2 }}>
                                            <col.icon sx={{ fontSize: 16, color: col.colour }} />
                                            <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: col.colour, textTransform: 'uppercase', letterSpacing: 0.3 }}>{col.label}</Typography>
                                            <Chip label={col.rows.length} size="small" sx={{ height: 17, fontSize: 10, fontWeight: 800, bgcolor: col.chipBg, color: col.colour, '& .MuiChip-label': { px: 0.7 } }} />
                                        </Stack>
                                        <Stack spacing={0.3}>
                                            {col.rows.map((p, idx) => (
                                                <Stack key={`${p.name}-${idx}`} direction="row" spacing={1.2} sx={{ alignItems: 'center', p: 0.7, borderRadius: '8px', transition: 'background-color .15s', '&:hover': { bgcolor: '#fff' } }}>
                                                    <Avatar sx={{ width: 32, height: 32, bgcolor: `${colorFor(p.name || '')}22`, color: colorFor(p.name || ''), fontSize: 11.5, fontWeight: 700 }}>{p.initials || initials(p.name || '')}</Avatar>
                                                    <Box sx={{ minWidth: 0 }}>
                                                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }} noWrap>{p.name}</Typography>
                                                        <Typography sx={{ fontSize: 10.5, color: '#94A3B8' }} noWrap>{[p.subtitle, p.whenLabel].filter(Boolean).join(' · ')}</Typography>
                                                    </Box>
                                                </Stack>
                                            ))}
                                            {col.rows.length === 0 && <Typography sx={{ fontSize: 12, color: '#B4BBC6', p: 0.7 }}>{col.empty}</Typography>}
                                        </Stack>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Panel>
                </Grid>
            </Grid>

            {/* Row: birthdays · anniversaries */}
            <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, lg: 6 }}>
                    <Panel title="Upcoming Birthdays" icon={CakeRoundedIcon} color="#E11D48" i={9}>
                        {birthdays.length === 0 ? (
                            <Nothing icon={CakeRoundedIcon} title="No birthdays coming up" />
                        ) : (
                            <Stack spacing={0.4}>
                                {birthdays.map((p, idx) => {
                                    const isToday = String(p.whenLabel || '').toLowerCase() === 'today';
                                    return (
                                        <Stack key={`${p.name}-${idx}`} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', p: 1, borderRadius: '9px', transition: 'background-color .15s', '&:hover': { bgcolor: '#FDF2F8' } }}>
                                            <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center', minWidth: 0 }}>
                                                <Avatar sx={{ width: 38, height: 38, bgcolor: `${colorFor(p.name || '')}22`, color: colorFor(p.name || ''), fontSize: 12.5, fontWeight: 700, border: `2px solid ${colorFor(p.name || '')}33` }}>{p.initials || initials(p.name || '')}</Avatar>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }} noWrap>{p.name}</Typography>
                                                    <Typography sx={{ fontSize: 11, color: '#94A3B8' }} noWrap>{p.subtitle || '—'}</Typography>
                                                </Box>
                                            </Stack>
                                            <Chip icon={<CakeRoundedIcon sx={{ fontSize: '13px !important' }} />} label={p.whenLabel || '—'} size="small" sx={{ height: 23, fontSize: 11, fontWeight: 700, bgcolor: isToday ? '#FCE7F3' : '#F1F5F9', color: isToday ? '#DB2777' : '#64748B', '& .MuiChip-icon': { color: isToday ? '#DB2777' : '#94A3B8' } }} />
                                        </Stack>
                                    );
                                })}
                            </Stack>
                        )}
                    </Panel>
                </Grid>
                <Grid size={{ xs: 12, lg: 6 }}>
                    <Panel title="Work Anniversaries" icon={EmojiEventsRoundedIcon} color="#F59E0B" i={10}>
                        {anniversaries.length === 0 ? (
                            <Nothing icon={EmojiEventsRoundedIcon} title="No anniversaries coming up" />
                        ) : (
                            <Stack spacing={0.4}>
                                {anniversaries.map((p, idx) => (
                                    <Stack key={`${p.name}-${idx}`} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', p: 1, borderRadius: '9px', transition: 'background-color .15s', '&:hover': { bgcolor: '#FFFBF3' } }}>
                                        <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center', minWidth: 0 }}>
                                            <Avatar sx={{ width: 38, height: 38, bgcolor: `${colorFor(p.name || '')}22`, color: colorFor(p.name || ''), fontSize: 12.5, fontWeight: 700, border: `2px solid ${colorFor(p.name || '')}33` }}>{p.initials || initials(p.name || '')}</Avatar>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }} noWrap>{p.name}</Typography>
                                                <Typography sx={{ fontSize: 11, color: '#94A3B8' }} noWrap>{p.subtitle || '—'}</Typography>
                                            </Box>
                                        </Stack>
                                        <Chip icon={<EmojiEventsRoundedIcon sx={{ fontSize: '13px !important' }} />} label={p.whenLabel || '—'} size="small" sx={{ height: 23, fontSize: 11, fontWeight: 700, bgcolor: '#FFF7ED', color: '#B45309', '& .MuiChip-icon': { color: '#F59E0B' } }} />
                                    </Stack>
                                ))}
                            </Stack>
                        )}
                    </Panel>
                </Grid>
            </Grid>
        </Box>
    );
}
