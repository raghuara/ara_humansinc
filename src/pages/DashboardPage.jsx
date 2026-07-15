import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Stack, Grid, Chip, Avatar, Button, Tooltip, IconButton } from '@mui/material';
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
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { BarChart } from '@mui/x-charts/BarChart';
import { selectEmployees } from '../redux/slices/employeesSlice';
import { selectInterviewsToday } from '../redux/slices/recruitmentSlice';
import Loader from '../components/Loader';

const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_BORDER = '#C9BEFB';
const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
const tonalBtn = { bgcolor: PRIMARY_LIGHT, color: PRIMARY, border: `1px solid ${PRIMARY_BORDER}`, fontWeight: 700, borderRadius: '7px', boxShadow: 'none', textTransform: 'none', '&:hover': { bgcolor: '#E7DFFC' } };
const solidBtn = { bgcolor: PRIMARY, color: '#fff', fontWeight: 700, borderRadius: '7px', boxShadow: `0 2px 6px ${PRIMARY}40`, textTransform: 'none', '&:hover': { bgcolor: '#6246E0' } };

const fadeUp = keyframes`from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; }`;
const enter = (i) => ({ animation: `${fadeUp} .5s cubic-bezier(.22,1,.36,1) both`, animationDelay: `${i * 0.05}s` });

const initials = (s = '') => s.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const PALETTE = ['#7C5CFC', '#0EA5E9', '#F59E0B', '#16A34A', '#E11D48', '#6246E0', '#0891B2'];
const colorFor = (s = '') => PALETTE[(s.charCodeAt(0) || 0) % PALETTE.length];
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// "09:42" → "9:42 AM". Punch-in and interview times are stored 24-hour.
const fmtClock = (t) => {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
};

// 42 → "42m", 95 → "1h 35m". Reads better than a raw minute count once it's over an hour.
const fmtLate = (mins) => (mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`);

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

export default function DashboardPage() {
    const navigate = useNavigate();
    const employees = useSelector(selectEmployees);
    const auth = useSelector((s) => s.auth);
    const interviewsToday = useSelector(selectInterviewsToday);
    const [loading, setLoading] = useState(true);
    useEffect(() => { const t = setTimeout(() => setLoading(false), 650); return () => clearTimeout(t); }, []);

    // Clock-in status — read-only on the dashboard; punches are made in the mobile app
    const [clockedIn] = useState(false);
    const [punchIn] = useState(null);
    const [punchOut] = useState(null);
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        if (!clockedIn) return undefined;
        const t = setInterval(() => setElapsed((e) => e + 1), 1000);
        return () => clearInterval(t);
    }, [clockedIn]);
    const fmtTimer = (s) => [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');

    const now = new Date();
    const hr = now.getHours();
    const greet = hr < 12 ? 'morning' : hr < 17 ? 'afternoon' : 'evening';
    const monthName = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    const today = now.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });

    const total = employees.length;
    const att = useMemo(() => {
        const onLeave = Math.min(2, Math.floor(total * 0.1));
        const absent = Math.min(3, Math.floor(total * 0.06));
        const present = Math.max(0, total - onLeave - absent);
        return { present, absent, onLeave };
    }, [total]);

    // Items that need HR attention
    const alerts = [
        { icon: BeachAccessRoundedIcon, color: '#F59E0B', bg: '#FFF7ED', title: 'Extended Leave', desc: '3+ continuous days', count: 2 },
        { icon: ScheduleRoundedIcon, color: '#E11D48', bg: '#FEE2E2', title: 'Late Arrivals', desc: 'Clocked in after 10:00 AM', count: 3 },
        { icon: EventBusyRoundedIcon, color: '#DC2626', bg: '#FEE2E2', title: 'Absent · No Notice', desc: 'Unmarked absence today', count: 1 },
        { icon: HowToRegRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE', title: 'Probation Ending', desc: 'Confirmation due this week', count: 2 },
        { icon: DescriptionRoundedIcon, color: '#7C5CFC', bg: '#F1EEFE', title: 'Documents Pending', desc: 'Incomplete onboarding', count: 4 },
    ];

    // Payroll cost trend (₹ lakhs) — last 6 months
    const trendMonths = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
    const trendGross = [56.4, 58.1, 59.7, 61.2, 62.8, 64.0];
    const trendNet = [48.6, 50.0, 51.3, 52.6, 54.0, 55.0];

    // Who clocked in after the 09:15 grace cut-off today. Mocked alongside the
    // rest of this dashboard's attendance figures — swap for the punch feed when
    // the biometric endpoint lands, keeping the same shape.
    const SHIFT_START = '09:15';
    const lateComers = [
        { id: 1, name: 'Gopinath S', dept: 'Sales', inTime: '09:42', shift: SHIFT_START },
        { id: 2, name: 'Anitha M', dept: 'Design', inTime: '10:05', shift: SHIFT_START },
        { id: 3, name: 'Sneha Iyer', dept: 'Engineering', inTime: '10:24', shift: SHIFT_START },
    ];
    // Minutes past the cut-off, so the list can be ranked worst-first.
    const minsLate = (inTime, shift) => {
        const [ih, im] = inTime.split(':').map(Number);
        const [sh, sm] = shift.split(':').map(Number);
        return (ih * 60 + im) - (sh * 60 + sm);
    };
    const lateSorted = [...lateComers].sort((a, b) => minsLate(b.inTime, b.shift) - minsLate(a.inTime, a.shift));

    const leaveRequests = [
        { id: 1, name: 'Sneha Iyer', type: 'Casual Leave', from: '2026-07-14', days: 2 },
        { id: 2, name: 'Vikram Nair', type: 'Sick Leave', from: '2026-07-11', days: 1 },
        { id: 3, name: 'Priya Raj', type: 'Earned Leave', from: '2026-07-18', days: 3 },
    ];
    const payroll = { gross: 6399707, status: 'Processing', step: 2 }; // 0 draft,1 processed,2 approved,3 paid
    const payrollSteps = ['Draft', 'Processed', 'Approved', 'Paid'];

    const joiners = useMemo(() => [...employees].sort((a, b) => (b.doj || '').localeCompare(a.doj || '')).slice(0, 3), [employees]);
    const resignations = [
        { id: 1, name: 'Arjun Mehta', role: 'Sales Executive', date: '2026-07-31' },
    ];
    const birthdays = [
        { id: 1, name: 'Karthik R', when: 'Today', dept: 'Engineering' },
        { id: 2, name: 'Divya Prakash', when: 'in 2 days', dept: 'Finance' },
        { id: 3, name: 'Rahul Verma', when: 'in 5 days', dept: 'Human Resources' },
    ];
    const anniversaries = [
        { id: 1, name: 'Gopinath S', when: 'in 3 days', years: 3 },
        { id: 2, name: 'Anitha M', when: 'in 6 days', years: 1 },
    ];

    const KPIS = [
        { label: 'Total Employees', value: total, sub: 'Active workforce', icon: GroupsRoundedIcon, color: PRIMARY, bg: PRIMARY_LIGHT, onClick: () => navigate('/dashboard/employees') },
        { label: 'Present Today', value: att.present, sub: `${total ? Math.round((att.present / total) * 100) : 0}% attendance`, icon: HowToRegRoundedIcon, color: '#16A34A', bg: '#DCFCE7', onClick: () => navigate('/dashboard/attendance-leave?tab=overview') },
        { label: 'Absent Today', value: att.absent + att.onLeave, sub: `${att.absent} absent · ${att.onLeave} on leave`, icon: EventBusyRoundedIcon, color: '#F59E0B', bg: '#FFF7ED', onClick: () => navigate('/dashboard/attendance-leave?tab=overview') },
        {
            label: 'Late Comers Today',
            value: lateComers.length,
            sub: lateSorted.length ? `Latest ${fmtClock(lateSorted[0].inTime)} · after ${fmtClock(SHIFT_START)}` : 'Everyone on time',
            icon: RunningWithErrorsRoundedIcon,
            color: '#E11D48',
            bg: '#FEE2E2',
            onClick: () => navigate('/dashboard/attendance-leave?tab=overview'),
        },
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

    return (
        <Box sx={{ p: 2 }}>
            {/* Header */}
            <Stack direction="row" sx={{ alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, pb: 2.5 }}>
                <Box>
                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>Good {greet}, {auth.userName || 'Admin'} 👋</Typography>
                    <Typography sx={{ fontSize: 13, color: '#6B7280', mt: 0.3 }}>Here's what's happening at ARA HumanSync today · {now.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short' })}</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button onClick={() => navigate('/dashboard/employees/onboard')} startIcon={<PersonAddAlt1RoundedIcon />} sx={{ ...tonalBtn, height: 42, px: 2 }}>Onboard</Button>
                    <Button onClick={() => navigate('/dashboard/payslips')} startIcon={<PlayArrowRoundedIcon />} sx={{ ...solidBtn, height: 42, px: 2.2 }}>Run Payroll</Button>
                </Stack>
            </Stack>

            {/* Clock-in card + KPI cards */}
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                {/* Clock-in card (violet gradient) */}
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Box sx={{ ...enter(0), background: 'linear-gradient(160deg, #7C5CFC 0%, #6246E0 100%)', borderRadius: '7px', p: 3, color: '#fff', height: '100%', position: 'relative', overflow: 'hidden', boxShadow: '0 16px 34px -18px rgba(124,92,252,0.7)' }}>
                        <Box sx={{ position: 'absolute', top: -40, right: -30, width: 150, height: 150, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)' }} />
                        <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', opacity: 0.85, position: 'relative' }}>TODAY</Typography>
                        <Typography sx={{ fontSize: 13.5, opacity: 0.9, mb: 2.2, position: 'relative' }}>{today}</Typography>
                        <Typography sx={{ fontSize: 42, fontWeight: 800, letterSpacing: '1px', lineHeight: 1, position: 'relative' }}>{fmtTimer(elapsed)}</Typography>

                        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', mt: 1.2, mb: 2.5, position: 'relative' }}>
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: clockedIn ? '#4ADE80' : 'rgba(255,255,255,0.6)', boxShadow: clockedIn ? '0 0 0 3px rgba(74,222,128,0.25)' : 'none' }} />
                            <Typography sx={{ fontSize: 13, opacity: 0.9 }}>{clockedIn ? 'Clocked in' : 'Not clocked in yet'}</Typography>
                        </Stack>

                        <Stack direction="row" spacing={1} sx={{ mb: 1.2, position: 'relative' }}>
                            {[['BREAK', '00:00:00'], ['SHIFT', '—'], ['OT', '00:00:00']].map(([l, v]) => (
                                <Box key={l} sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.14)', borderRadius: '7px', p: 1.2 }}>
                                    <Typography sx={{ fontSize: 9.5, fontWeight: 700, opacity: 0.8 }}>{l}</Typography>
                                    <Typography sx={{ fontSize: 12.5, fontWeight: 800, mt: 0.3 }}>{v}</Typography>
                                </Box>
                            ))}
                        </Stack>

                        <Stack direction="row" spacing={1} sx={{ position: 'relative' }}>
                            {[['FIRST IN', punchIn], ['LAST OUT', punchOut]].map(([l, v]) => (
                                <Box key={l} sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.14)', borderRadius: '7px', p: 1.2 }}>
                                    <Typography sx={{ fontSize: 9.5, fontWeight: 700, opacity: 0.8 }}>{l}</Typography>
                                    <Typography sx={{ fontSize: 12.5, fontWeight: 800, mt: 0.3 }}>{v || '—'}</Typography>
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

            {/* Row: interviews today · late comers today · payroll status */}
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                {/* Interviews Today — live from the recruitment module, not mock data */}
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                    <Panel title="Interviews Today" icon={EventAvailableRoundedIcon} color="#0EA5E9" action="Recruitment" onAction={() => navigate('/dashboard/recruitment?tab=interviews')} i={4}>
                        {interviewsToday.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 5 }}>
                                <EventAvailableRoundedIcon sx={{ fontSize: 34, color: '#CBD2DD' }} />
                                <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#64748B', mt: 1 }}>No interviews today</Typography>
                                <Typography sx={{ fontSize: 12, color: '#98A0AE', mt: 0.3 }}>Schedule one from Recruitment.</Typography>
                            </Box>
                        ) : (
                            <Stack spacing={0.6}>
                                {interviewsToday.map((iv) => {
                                    const decided = Boolean(iv.outcome);
                                    const toReview = iv.status === 'Conducted' && !iv.outcome;
                                    const tone = decided
                                        ? (iv.outcome === 'Selected' ? { c: '#16A34A', bg: '#DCFCE7' } : iv.outcome === 'Rejected' ? { c: '#E11D48', bg: '#FEE2E2' } : { c: '#B45309', bg: '#FFF7ED' })
                                        : toReview ? { c: '#B45309', bg: '#FFF7ED' } : { c: '#64748B', bg: '#F1F5F9' };
                                    return (
                                        <Stack
                                            key={iv.id}
                                            direction="row"
                                            onClick={() => navigate('/dashboard/recruitment?tab=interviews')}
                                            sx={{ alignItems: 'center', gap: 1.2, p: 1, borderRadius: '9px', cursor: 'pointer', transition: 'background-color .15s', '&:hover': { bgcolor: '#F8FAFC' } }}
                                        >
                                            {/* The time is what you scan this list for, so it leads */}
                                            <Box sx={{ minWidth: 62, textAlign: 'center', px: 0.8, py: 0.7, borderRadius: '8px', bgcolor: '#E0F2FE', flexShrink: 0 }}>
                                                <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: '#0369A1', lineHeight: 1.2 }}>{fmtClock(iv.time)}</Typography>
                                                <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#0EA5E9' }}>{iv.durationMins}m</Typography>
                                            </Box>
                                            <Avatar sx={{ width: 34, height: 34, bgcolor: colorFor(iv.candidateName), fontSize: 12, fontWeight: 700 }}>{initials(iv.candidateName)}</Avatar>
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }} noWrap>{iv.candidateName}</Typography>
                                                <Typography sx={{ fontSize: 10.5, color: '#94A3B8' }} noWrap>{iv.round} · {iv.vacancyTitle}</Typography>
                                            </Box>
                                            <Chip
                                                label={decided ? iv.outcome : toReview ? 'To review' : iv.mode}
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

                {/* Late Comers Today — who, what time they punched in, and how late */}
                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                    <Panel title="Late Comers Today" icon={RunningWithErrorsRoundedIcon} color="#E11D48" action="Attendance" onAction={() => navigate('/dashboard/attendance-leave?tab=overview')} i={5}>
                        {lateSorted.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 5 }}>
                                <CheckCircleRoundedIcon sx={{ fontSize: 34, color: '#BBF7D0' }} />
                                <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#64748B', mt: 1 }}>Everyone was on time</Typography>
                                <Typography sx={{ fontSize: 12, color: '#98A0AE', mt: 0.3 }}>No punches after {fmtClock(SHIFT_START)}.</Typography>
                            </Box>
                        ) : (
                            <>
                                <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center', mb: 1.2 }}>
                                    <ScheduleRoundedIcon sx={{ fontSize: 14, color: '#94A3B8' }} />
                                    <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>Shift starts {fmtClock(SHIFT_START)} · latest first</Typography>
                                </Stack>
                                <Stack spacing={0.6}>
                                    {lateSorted.map((p) => (
                                        <Stack key={p.id} direction="row" sx={{ alignItems: 'center', gap: 1.2, p: 1, borderRadius: '9px', transition: 'background-color .15s', '&:hover': { bgcolor: '#FFF7F8' } }}>
                                            <Avatar sx={{ width: 34, height: 34, bgcolor: `${colorFor(p.name)}22`, color: colorFor(p.name), fontSize: 12, fontWeight: 700 }}>{initials(p.name)}</Avatar>
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }} noWrap>{p.name}</Typography>
                                                <Typography sx={{ fontSize: 10.5, color: '#94A3B8' }} noWrap>{p.dept}</Typography>
                                            </Box>
                                            {/* Punch-in time, then how far past the cut-off it was */}
                                            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>{fmtClock(p.inTime)}</Typography>
                                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#E11D48' }}>{fmtLate(minsLate(p.inTime, p.shift))} late</Typography>
                                            </Box>
                                        </Stack>
                                    ))}
                                </Stack>
                            </>
                        )}
                    </Panel>
                </Grid>

                <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                    <Panel title="Payroll Status" icon={PaymentsRoundedIcon} color="#7C5CFC" i={5}>
                        <Typography sx={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{monthName} cycle</Typography>
                        <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mt: 0.5 }}>
                            <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#0F172A' }}>₹{payroll.gross.toLocaleString('en-IN')}</Typography>
                            <Chip label={payroll.status} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: '#FEF3C7', color: '#B45309' }} />
                        </Stack>
                        <Typography sx={{ fontSize: 11.5, color: '#6B7280', mt: 0.3 }}>Gross payout · {total} employees</Typography>
                        <Stack spacing={0} sx={{ mt: 2 }}>
                            {payrollSteps.map((s, idx) => {
                                const done = idx <= payroll.step;
                                return (
                                    <Stack key={s} direction="row" spacing={1.2} sx={{ alignItems: 'center', py: 0.5 }}>
                                        {done ? <CheckCircleRoundedIcon sx={{ fontSize: 18, color: PRIMARY }} /> : <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 18, color: '#CBD2DD' }} />}
                                        <Typography sx={{ fontSize: 12.5, fontWeight: done ? 700 : 500, color: done ? '#0F172A' : '#94A3B8' }}>{s}</Typography>
                                        {idx === payroll.step && <Chip label="Current" size="small" sx={{ height: 18, fontSize: 9.5, fontWeight: 700, bgcolor: PRIMARY_LIGHT, color: PRIMARY }} />}
                                    </Stack>
                                );
                            })}
                        </Stack>
                        <Button fullWidth onClick={() => navigate('/dashboard/payslips')} endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />} sx={{ ...tonalBtn, mt: 1.5, height: 38 }}>Continue Payroll</Button>
                    </Panel>
                </Grid>

            </Grid>

            {/* Quick actions — full width now that Interviews and Late Comers own
                the row above. Six tiles read better across than stacked 2×3. */}
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

            {/* Row: payroll trend bar chart · headcount by department */}
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                <Grid size={{ xs: 12, lg: 8 }}>
                    <Panel title="Payroll Cost Trend" icon={PaymentsRoundedIcon} color="#7C5CFC" action="Salary Register" onAction={() => navigate('/dashboard/payroll-register')} i={7}>
                        <BarChart
                            xAxis={[{ scaleType: 'band', data: trendMonths, categoryGapRatio: 0.55, barGapRatio: 0.3 }]}
                            yAxis={[{ valueFormatter: (v) => `₹${v}L`, width: 44 }]}
                            series={[
                                { data: trendGross, label: 'Gross', color: '#7C5CFC' },
                                { data: trendNet, label: 'Net', color: '#C4B5FD' },
                            ]}
                            height={250}
                            borderRadius={6}
                            grid={{ horizontal: true }}
                            margin={{ top: 16, right: 8, bottom: 24, left: 8 }}
                            slotProps={{ legend: { direction: 'horizontal', position: { vertical: 'top', horizontal: 'end' } } }}
                            sx={{ '& .MuiChartsAxis-line, & .MuiChartsAxis-tick': { display: 'none' }, '& .MuiChartsGrid-line': { stroke: '#EEF1F6' }, '& .MuiChartsAxis-tickLabel': { fontSize: 11, fill: '#94A3B8' } }}
                        />
                    </Panel>
                </Grid>
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Panel title="Needs Attention" icon={WarningAmberRoundedIcon} color="#F59E0B" i={8}>
                        <Stack spacing={0.5}>
                            {alerts.map((a) => (
                                <Stack key={a.title} direction="row" sx={{ alignItems: 'center', gap: 1.3, p: 1, borderRadius: '9px', cursor: 'pointer', transition: 'background-color .15s', '&:hover': { bgcolor: '#F8FAFC' } }}>
                                    <Box sx={{ width: 36, height: 36, borderRadius: '9px', bgcolor: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <a.icon sx={{ fontSize: 19, color: a.color }} />
                                    </Box>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }} noWrap>{a.title}</Typography>
                                        <Typography sx={{ fontSize: 11, color: '#94A3B8' }} noWrap>{a.desc}</Typography>
                                    </Box>
                                    <Box sx={{ minWidth: 26, height: 24, px: 0.9, borderRadius: '7px', bgcolor: a.bg, color: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
                        <Stack spacing={0.4}>
                            {leaveRequests.map((lr) => (
                                <Stack key={lr.id} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, p: 1, borderRadius: '9px', transition: 'background-color .15s', '&:hover': { bgcolor: '#F8FAFC' } }}>
                                    <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center', minWidth: 0 }}>
                                        <Avatar sx={{ width: 38, height: 38, bgcolor: `${colorFor(lr.name)}22`, color: colorFor(lr.name), fontSize: 12.5, fontWeight: 700, border: `2px solid ${colorFor(lr.name)}33` }}>{initials(lr.name)}</Avatar>
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }} noWrap>{lr.name}</Typography>
                                            <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center', mt: 0.2 }}>
                                                <Chip label={lr.type} size="small" sx={{ height: 17, fontSize: 9.5, fontWeight: 700, bgcolor: `${colorFor(lr.name)}18`, color: colorFor(lr.name), '& .MuiChip-label': { px: 0.7 } }} />
                                                <Typography sx={{ fontSize: 11, color: '#94A3B8' }} noWrap>{lr.days} day{lr.days > 1 ? 's' : ''} · {fmtDate(lr.from)}</Typography>
                                            </Stack>
                                        </Box>
                                    </Stack>
                                    <Stack direction="row" spacing={0.6} sx={{ flexShrink: 0 }}>
                                        <Tooltip arrow title="Approve"><IconButton size="small" sx={{ bgcolor: '#DCFCE7', borderRadius: '7px', width: 30, height: 30, '&:hover': { bgcolor: '#BBF7D0' } }}><CheckRoundedIcon sx={{ fontSize: 16, color: '#16A34A' }} /></IconButton></Tooltip>
                                        <Tooltip arrow title="Reject"><IconButton size="small" sx={{ bgcolor: '#FEE2E2', borderRadius: '7px', width: 30, height: 30, '&:hover': { bgcolor: '#FECACA' } }}><CloseRoundedIcon sx={{ fontSize: 16, color: '#DC2626' }} /></IconButton></Tooltip>
                                    </Stack>
                                </Stack>
                            ))}
                        </Stack>
                    </Panel>
                </Grid>

                <Grid size={{ xs: 12, lg: 6 }}>
                    <Panel title="New Joiners & Resignations" icon={PersonAddAlt1RoundedIcon} color="#16A34A" i={8}>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Box sx={{ bgcolor: '#F5FDF8', border: '1px solid #DCFCE7', borderRadius: '10px', p: 1.4, height: '100%' }}>
                                    <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', mb: 1.2 }}>
                                        <PersonAddAlt1RoundedIcon sx={{ fontSize: 16, color: '#16A34A' }} />
                                        <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: '#16A34A', textTransform: 'uppercase', letterSpacing: 0.3 }}>New Joiners</Typography>
                                        <Chip label={joiners.length} size="small" sx={{ height: 17, fontSize: 10, fontWeight: 800, bgcolor: '#DCFCE7', color: '#16A34A', '& .MuiChip-label': { px: 0.7 } }} />
                                    </Stack>
                                    <Stack spacing={0.3}>
                                        {joiners.map((e) => (
                                            <Stack key={e.id} direction="row" spacing={1.2} sx={{ alignItems: 'center', p: 0.7, borderRadius: '8px', transition: 'background-color .15s', '&:hover': { bgcolor: '#fff' } }}>
                                                <Avatar sx={{ width: 32, height: 32, bgcolor: colorFor(e.firstName), fontSize: 11.5, fontWeight: 700 }}>{initials(`${e.firstName} ${e.lastName || ''}`)}</Avatar>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }} noWrap>{e.firstName} {e.lastName}</Typography>
                                                    <Typography sx={{ fontSize: 10.5, color: '#94A3B8' }} noWrap>{e.designation || 'Staff'} · {fmtDate(e.doj)}</Typography>
                                                </Box>
                                            </Stack>
                                        ))}
                                        {joiners.length === 0 && <Typography sx={{ fontSize: 12, color: '#B4BBC6', p: 0.7 }}>No recent joiners</Typography>}
                                    </Stack>
                                </Box>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <Box sx={{ bgcolor: '#FFF7F8', border: '1px solid #FEE2E2', borderRadius: '10px', p: 1.4, height: '100%' }}>
                                    <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', mb: 1.2 }}>
                                        <LogoutRoundedIcon sx={{ fontSize: 16, color: '#E11D48' }} />
                                        <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: '#E11D48', textTransform: 'uppercase', letterSpacing: 0.3 }}>Resignations</Typography>
                                        <Chip label={resignations.length} size="small" sx={{ height: 17, fontSize: 10, fontWeight: 800, bgcolor: '#FEE2E2', color: '#E11D48', '& .MuiChip-label': { px: 0.7 } }} />
                                    </Stack>
                                    <Stack spacing={0.3}>
                                        {resignations.map((e) => (
                                            <Stack key={e.id} direction="row" spacing={1.2} sx={{ alignItems: 'center', p: 0.7, borderRadius: '8px', transition: 'background-color .15s', '&:hover': { bgcolor: '#fff' } }}>
                                                <Avatar sx={{ width: 32, height: 32, bgcolor: `${colorFor(e.name)}22`, color: colorFor(e.name), fontSize: 11.5, fontWeight: 700 }}>{initials(e.name)}</Avatar>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }} noWrap>{e.name}</Typography>
                                                    <Typography sx={{ fontSize: 10.5, color: '#94A3B8' }} noWrap>{e.role} · LWD {fmtDate(e.date)}</Typography>
                                                </Box>
                                            </Stack>
                                        ))}
                                        {resignations.length === 0 && <Typography sx={{ fontSize: 12, color: '#B4BBC6', p: 0.7 }}>None this month</Typography>}
                                    </Stack>
                                </Box>
                            </Grid>
                        </Grid>
                    </Panel>
                </Grid>
            </Grid>

            {/* Row: birthdays · anniversaries */}
            <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, lg: 6 }}>
                    <Panel title="Upcoming Birthdays" icon={CakeRoundedIcon} color="#E11D48" i={9}>
                        <Stack spacing={0.4}>
                            {birthdays.map((p) => (
                                <Stack key={p.id} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', p: 1, borderRadius: '9px', transition: 'background-color .15s', '&:hover': { bgcolor: '#FDF2F8' } }}>
                                    <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center', minWidth: 0 }}>
                                        <Avatar sx={{ width: 38, height: 38, bgcolor: `${colorFor(p.name)}22`, color: colorFor(p.name), fontSize: 12.5, fontWeight: 700, border: `2px solid ${colorFor(p.name)}33` }}>{initials(p.name)}</Avatar>
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }} noWrap>{p.name}</Typography>
                                            <Typography sx={{ fontSize: 11, color: '#94A3B8' }} noWrap>{p.dept}</Typography>
                                        </Box>
                                    </Stack>
                                    <Chip icon={<CakeRoundedIcon sx={{ fontSize: '13px !important' }} />} label={p.when} size="small" sx={{ height: 23, fontSize: 11, fontWeight: 700, bgcolor: p.when === 'Today' ? '#FCE7F3' : '#F1F5F9', color: p.when === 'Today' ? '#DB2777' : '#64748B', '& .MuiChip-icon': { color: p.when === 'Today' ? '#DB2777' : '#94A3B8' } }} />
                                </Stack>
                            ))}
                        </Stack>
                    </Panel>
                </Grid>
                <Grid size={{ xs: 12, lg: 6 }}>
                    <Panel title="Work Anniversaries" icon={EmojiEventsRoundedIcon} color="#F59E0B" i={10}>
                        <Stack spacing={0.4}>
                            {anniversaries.map((p) => (
                                <Stack key={p.id} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', p: 1, borderRadius: '9px', transition: 'background-color .15s', '&:hover': { bgcolor: '#FFFBF3' } }}>
                                    <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center', minWidth: 0 }}>
                                        <Avatar sx={{ width: 38, height: 38, bgcolor: `${colorFor(p.name)}22`, color: colorFor(p.name), fontSize: 12.5, fontWeight: 700, border: `2px solid ${colorFor(p.name)}33` }}>{initials(p.name)}</Avatar>
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }} noWrap>{p.name}</Typography>
                                            <Typography sx={{ fontSize: 11, color: '#94A3B8' }} noWrap>{p.years} year{p.years > 1 ? 's' : ''} at ARA HumanSync</Typography>
                                        </Box>
                                    </Stack>
                                    <Chip icon={<EmojiEventsRoundedIcon sx={{ fontSize: '13px !important' }} />} label={p.when} size="small" sx={{ height: 23, fontSize: 11, fontWeight: 700, bgcolor: '#FFF7ED', color: '#B45309', '& .MuiChip-icon': { color: '#F59E0B' } }} />
                                </Stack>
                            ))}
                        </Stack>
                    </Panel>
                </Grid>
            </Grid>
        </Box>
    );
}
