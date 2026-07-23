import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Stack, Grid, Chip, Avatar, Button, LinearProgress, Alert, Tooltip, IconButton } from '@mui/material';
import { keyframes } from '@mui/system';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded';
import BeachAccessRoundedIcon from '@mui/icons-material/BeachAccessRounded';
import RunningWithErrorsRoundedIcon from '@mui/icons-material/RunningWithErrorsRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import PhoneIphoneRoundedIcon from '@mui/icons-material/PhoneIphoneRounded';
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import MoreTimeRoundedIcon from '@mui/icons-material/MoreTimeRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectEffectiveModules } from '../redux/slices/authSlice';
import { hasModule } from '../data/serverModules';
import http, { apiErrorMessage } from '../Api/http';
import { GetMyDashboard } from '../Api/Api';
import Loader from '../components/Loader';

const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_BORDER = '#C9BEFB';
const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
const tonalBtn = { bgcolor: PRIMARY_LIGHT, color: PRIMARY, border: `1px solid ${PRIMARY_BORDER}`, fontWeight: 700, borderRadius: '7px', boxShadow: 'none', textTransform: 'none', '&:hover': { bgcolor: '#E7DFFC' } };
const ghostBtn = { color: '#475569', bgcolor: '#fff', border: '1px solid #E5E7EB', fontWeight: 700, borderRadius: '7px', textTransform: 'none', '&:hover': { bgcolor: '#F8FAFC' } };

const fadeUp = keyframes`from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; }`;
const enter = (i) => ({ animation: `${fadeUp} .5s cubic-bezier(.22,1,.36,1) both`, animationDelay: `${i * 0.05}s` });

const n = (v) => Number(v) || 0;
const initials = (s = '') => s.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const PALETTE = ['#7C5CFC', '#0EA5E9', '#F59E0B', '#16A34A', '#E11D48', '#6246E0', '#0891B2'];
const colorFor = (s = '') => PALETTE[(s.charCodeAt(0) || 0) % PALETTE.length];

// "09:42" → "9:42 AM"
const fmtClock = (t) => {
    if (!t) return '—';
    const [h, m] = String(t).split(':').map(Number);
    if (!Number.isFinite(h)) return String(t);
    return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

// A clock time anchored to today, so the running timer can count from it.
const clockToDate = (v) => {
    if (!v) return null;
    const hhmm = String(v).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (hhmm) {
        const d = new Date();
        d.setHours(Number(hhmm[1]), Number(hhmm[2]), Number(hhmm[3] || 0), 0);
        return d;
    }
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
};

// Leave and payslip states the API can send, and how each should read.
const STATUS_TONE = {
    approved: { c: '#16A34A', bg: '#DCFCE7' },
    paid: { c: '#16A34A', bg: '#DCFCE7' },
    pending: { c: '#B45309', bg: '#FEF3C7' },
    processing: { c: '#B45309', bg: '#FEF3C7' },
    rejected: { c: '#E11D48', bg: '#FEE2E2' },
    cancelled: { c: '#64748B', bg: '#F1F5F9' },
};
const toneFor = (status) => STATUS_TONE[String(status || '').toLowerCase()] || { c: '#64748B', bg: '#F1F5F9' };

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

function Nothing({ icon: Icon, title, hint, color = '#CBD2DD' }) {
    return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
            <Icon sx={{ fontSize: 34, color }} />
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#64748B', mt: 1 }}>{title}</Typography>
            {hint && <Typography sx={{ fontSize: 12, color: '#98A0AE', mt: 0.3 }}>{hint}</Typography>}
        </Box>
    );
}

export default function MyInfoPage() {
    const navigate = useNavigate();
    const modules = useSelector(selectEffectiveModules);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data: body } = await http.get(GetMyDashboard);
            if (body?.error) throw new Error(body.message || 'Could not load your dashboard.');
            setData(body?.data || {});
            setLoadError('');
        } catch (err) {
            setLoadError(apiErrorMessage(err, 'Could not load your dashboard.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const profile = data?.profile || {};
    const me = data?.me || {};
    const att = data?.attendanceThisMonth || {};
    const balances = Array.isArray(data?.leaveBalances) ? data.leaveBalances : [];
    const myLeave = Array.isArray(data?.myLeaveRequests) ? data.myLeaveRequests : [];
    const payslip = data?.latestPayslip || null;
    const pendingDocs = Array.isArray(data?.pendingDocuments) ? data.pendingDocuments : [];
    const holidays = Array.isArray(data?.upcomingHolidays) ? data.upcomingHolidays : [];

    // The timer counts from today's first punch.
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

    const hr = new Date().getHours();
    const greet = hr < 12 ? 'morning' : hr < 17 ? 'afternoon' : 'evening';
    const myName = profile.name || 'there';
    const today = me.dateLabel || new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });

    const KPIS = [
        { label: 'Present', value: n(att.presentDays), sub: `${n(att.attendancePercent)}% of ${n(att.markedDays)} marked days`, icon: HowToRegRoundedIcon, color: '#16A34A', bg: '#DCFCE7' },
        { label: 'Absent', value: n(att.absentDays), sub: att.monthLabel || 'This month', icon: EventBusyRoundedIcon, color: '#F59E0B', bg: '#FFF7ED' },
        { label: 'On Leave', value: n(att.onLeaveDays), sub: 'Approved leave days', icon: BeachAccessRoundedIcon, color: '#0891B2', bg: '#E0F2FE' },
        { label: 'Late Arrivals', value: n(att.lateDays), sub: 'Punched in after shift start', icon: RunningWithErrorsRoundedIcon, color: '#E11D48', bg: '#FEE2E2' },
    ];

    // Only offer a request type this login can actually open.
    const requests = [
        { key: 'leave', label: 'Apply for Leave', sub: 'Casual, sick or earned', icon: BeachAccessRoundedIcon, color: '#0891B2', to: '/dashboard/leave-management', module: 'leave-management' },
        { key: 'advance', label: 'Salary Advance', sub: 'Request an advance', icon: SavingsRoundedIcon, color: '#16A34A', to: '/dashboard/pay-adjustments?tab=advances', module: 'advances' },
        { key: 'overtime', label: 'Overtime', sub: 'Log extra hours', icon: MoreTimeRoundedIcon, color: '#F59E0B', to: '/dashboard/pay-adjustments?tab=overtime', module: 'overtime' },
        { key: 'document', label: 'My Documents', sub: pendingDocs.length ? `${pendingDocs.length} to upload` : 'Submit what HR asked for', icon: DescriptionRoundedIcon, color: '#0EA5E9', to: '/dashboard/documents?tab=employee', module: 'employee-documents' },
    ].filter((r) => hasModule(modules, r.module));

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
            {/* Header — who you are, straight from your employee record */}
            <Stack direction="row" sx={{ alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, pb: 2.5 }}>
                <Stack direction="row" spacing={1.8} sx={{ alignItems: 'center' }}>
                    <Avatar
                        src={profile.photoUrl || undefined}
                        sx={{ width: 54, height: 54, bgcolor: `${colorFor(myName)}22`, color: colorFor(myName), fontSize: 17, fontWeight: 800, border: `2px solid ${colorFor(myName)}33` }}
                    >
                        {profile.initials || initials(myName)}
                    </Avatar>
                    <Box>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                            <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>My Info</Typography>
                            <Chip label="Self service" size="small" sx={{ height: 22, fontSize: 10.5, fontWeight: 800, bgcolor: PRIMARY_LIGHT, color: PRIMARY }} />
                            {profile.employmentType && <Chip label={profile.employmentType} size="small" sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: '#F1F5F9', color: '#64748B' }} />}
                        </Stack>
                        <Typography sx={{ fontSize: 13, color: '#6B7280', mt: 0.3 }}>
                            Good {greet}, {myName} 👋
                            {profile.designation ? ` · ${profile.designation}` : ''}
                            {profile.department ? ` · ${profile.department}` : ''}
                        </Typography>
                    </Box>
                </Stack>
                <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Tooltip arrow title="Reload">
                        <IconButton onClick={load} sx={{ ...ghostBtn, width: 42, height: 42 }}><RefreshRoundedIcon sx={{ fontSize: 19 }} /></IconButton>
                    </Tooltip>
                    {[
                        ['Employee ID', profile.employeeCode],
                        ['Joined', profile.dateOfJoining],
                        ['Tenure', profile.tenureLabel],
                    ].filter(([, v]) => Boolean(v)).map(([l, v]) => (
                        <Box key={l} sx={{ ...card, px: 2, py: 1.2 }}>
                            <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: '#98A0AE', textTransform: 'uppercase', letterSpacing: 0.4 }}>{l}</Typography>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A' }}>{v}</Typography>
                        </Box>
                    ))}
                </Stack>
            </Stack>

            {/* Clock-in card + my attendance KPIs */}
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
                                ['SHIFT', me.shiftName || '—'],
                                ['OT', me.otDuration || '00:00:00'],
                            ].map(([l, v]) => (
                                <Box key={l} sx={{ flex: 1, minWidth: 0, bgcolor: 'rgba(255,255,255,0.14)', borderRadius: '7px', p: 1.2 }}>
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

                        {(me.shiftStart || me.shiftEnd) && (
                            <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', mt: 1.6, opacity: 0.85, position: 'relative' }}>
                                <ScheduleRoundedIcon sx={{ fontSize: 14 }} />
                                <Typography sx={{ fontSize: 11.5 }}>Your shift runs {fmtClock(me.shiftStart)} – {fmtClock(me.shiftEnd)}</Typography>
                            </Stack>
                        )}

                        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', mt: 1.6, pt: 1.6, borderTop: '1px solid rgba(255,255,255,0.18)', opacity: 0.85, position: 'relative' }}>
                            <PhoneIphoneRoundedIcon sx={{ fontSize: 14 }} />
                            <Typography sx={{ fontSize: 11.5 }}>Punch in from the ARA HumanSync mobile app</Typography>
                        </Stack>
                    </Box>
                </Grid>

                <Grid size={{ xs: 12, lg: 8 }}>
                    <Grid container spacing={1.5} sx={{ height: '100%' }}>
                        {KPIS.map((k, i) => (
                            <Grid size={{ xs: 12, sm: 6 }} key={k.label}>
                                <Box sx={{ ...card, p: 2.5, bgcolor: k.bg, border: `1px solid ${k.color}22`, height: '100%', ...enter(i + 1) }}>
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

            {/* My requests + leave balance · my payroll */}
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                <Grid size={{ xs: 12, lg: 8 }}>
                    <Panel title="My Requests" icon={AssignmentTurnedInRoundedIcon} color="#0891B2" i={5}>
                        {requests.length === 0 ? (
                            <Nothing icon={AssignmentTurnedInRoundedIcon} title="No request types available" hint="Your role doesn't include any of these yet." />
                        ) : (
                            <Grid container spacing={1}>
                                {requests.map((r) => (
                                    <Grid size={{ xs: 6, sm: 3 }} key={r.key}>
                                        <Stack
                                            onClick={() => navigate(r.to)}
                                            spacing={1.2}
                                            sx={{
                                                p: 1.6, borderRadius: '10px', height: '100%', cursor: 'pointer',
                                                border: `1px solid ${r.color}33`, bgcolor: `${r.color}0A`, transition: 'all .15s',
                                                '&:hover': { transform: 'translateY(-2px)', borderColor: `${r.color}66`, boxShadow: `0 8px 20px ${r.color}1F` },
                                            }}
                                        >
                                            <Box sx={{ width: 36, height: 36, borderRadius: '9px', bgcolor: `${r.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <r.icon sx={{ fontSize: 19, color: r.color }} />
                                            </Box>
                                            <Box>
                                                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A', lineHeight: 1.25 }}>{r.label}</Typography>
                                                <Typography sx={{ fontSize: 10.5, color: '#94A3B8' }} noWrap>{r.sub}</Typography>
                                            </Box>
                                        </Stack>
                                    </Grid>
                                ))}
                            </Grid>
                        )}

                        {/* Leave balance — what's left before you apply for more */}
                        <Box sx={{ mt: 2, pt: 1.8, borderTop: '1px solid #F1F0F9' }}>
                            <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4, mb: 1.2 }}>My Leave Balance</Typography>
                            {balances.length === 0 ? (
                                <Typography sx={{ fontSize: 12.5, color: '#94A3B8' }}>No leave types allocated to you yet.</Typography>
                            ) : (
                                <Grid container spacing={1.5}>
                                    {balances.map((lb) => {
                                        const tone = lb.colorTag || PRIMARY;
                                        const pct = n(lb.allocated) ? Math.round((n(lb.used) / n(lb.allocated)) * 100) : 0;
                                        return (
                                            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={lb.leaveTypeId ?? lb.leaveType}>
                                                <Box sx={{ p: 1.4, borderRadius: '9px', bgcolor: '#F8FAFC', border: '1px solid #EEF1F6' }}>
                                                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
                                                        <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center', minWidth: 0 }}>
                                                            {lb.shortCode && <Chip label={lb.shortCode} size="small" sx={{ height: 17, fontSize: 9.5, fontWeight: 800, bgcolor: `${tone}18`, color: tone, '& .MuiChip-label': { px: 0.7 } }} />}
                                                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#334155' }} noWrap>{lb.leaveType}</Typography>
                                                        </Stack>
                                                        <Typography sx={{ fontSize: 12, fontWeight: 800, color: tone, flexShrink: 0 }}>{n(lb.remaining)} left</Typography>
                                                    </Stack>
                                                    <LinearProgress variant="determinate" value={pct} sx={{ mt: 0.8, height: 6, borderRadius: 5, bgcolor: '#EEF0F6', '& .MuiLinearProgress-bar': { bgcolor: tone, borderRadius: 5 } }} />
                                                    <Typography sx={{ fontSize: 10.5, color: '#94A3B8', mt: 0.5 }}>{n(lb.used)} of {n(lb.allocated)} used</Typography>
                                                </Box>
                                            </Grid>
                                        );
                                    })}
                                </Grid>
                            )}
                        </Box>
                    </Panel>
                </Grid>

                <Grid size={{ xs: 12, lg: 4 }}>
                    <Panel
                        title="My Payroll"
                        icon={PaymentsRoundedIcon}
                        action={hasModule(modules, 'payslips') ? 'Payslips' : undefined}
                        onAction={() => navigate('/dashboard/payslips')}
                        i={6}
                    >
                        {!payslip ? (
                            <Nothing icon={PaymentsRoundedIcon} title="No payslip yet" hint="Your first payslip appears once a cycle is run." />
                        ) : (
                            <>
                                <Typography sx={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{payslip.monthLabel || payslip.month}</Typography>
                                <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mt: 0.5, gap: 1 }}>
                                    <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#0F172A' }}>₹{n(payslip.net).toLocaleString('en-IN')}</Typography>
                                    {payslip.status && (
                                        <Chip label={payslip.status} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, flexShrink: 0, bgcolor: toneFor(payslip.status).bg, color: toneFor(payslip.status).c }} />
                                    )}
                                </Stack>
                                <Typography sx={{ fontSize: 11.5, color: '#6B7280', mt: 0.3 }}>Net pay · take-home</Typography>

                                <Grid container spacing={1} sx={{ mt: 1.5 }}>
                                    {[['Gross', n(payslip.gross)], ['Deductions', Math.max(0, n(payslip.gross) - n(payslip.net))]].map(([l, v]) => (
                                        <Grid size={6} key={l}>
                                            <Box sx={{ p: 1.2, borderRadius: '8px', bgcolor: '#F8FAFC', border: '1px solid #EEF1F6' }}>
                                                <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: '#98A0AE', textTransform: 'uppercase', letterSpacing: 0.3 }}>{l}</Typography>
                                                <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#0F172A', mt: 0.2 }}>₹{v.toLocaleString('en-IN')}</Typography>
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>

                                <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', mt: 1.6, p: 1.2, borderRadius: '8px', bgcolor: payslip.paymentDate ? '#F5FDF8' : '#F8FAFC', border: `1px solid ${payslip.paymentDate ? '#DCFCE7' : '#EEF1F6'}` }}>
                                    <CheckCircleRoundedIcon sx={{ fontSize: 16, color: payslip.paymentDate ? '#16A34A' : '#CBD2DD' }} />
                                    <Typography sx={{ fontSize: 11.5, color: '#64748B' }}>
                                        {payslip.paymentDate ? `Paid on ${payslip.paymentDate}` : 'Not credited yet'}
                                    </Typography>
                                </Stack>

                                {hasModule(modules, 'payslips') && (
                                    <Button fullWidth onClick={() => navigate('/dashboard/payslips')} endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />} sx={{ ...tonalBtn, mt: 1.5, height: 38 }}>View Payslip</Button>
                                )}
                            </>
                        )}
                    </Panel>
                </Grid>
            </Grid>

            {/* My leave requests · upcoming holidays */}
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                <Grid size={{ xs: 12, lg: 7 }}>
                    <Panel
                        title="My Leave Requests"
                        icon={BeachAccessRoundedIcon}
                        color="#0891B2"
                        action={hasModule(modules, 'leave-management') ? 'Leave' : undefined}
                        onAction={() => navigate('/dashboard/leave-management')}
                        i={7}
                    >
                        {myLeave.length === 0 ? (
                            <Nothing icon={BeachAccessRoundedIcon} title="No leave applied" hint="Your applications and their status show up here." />
                        ) : (
                            <Stack spacing={0.4}>
                                {myLeave.map((lr) => {
                                    const tone = lr.colorTag || PRIMARY;
                                    const st = toneFor(lr.status);
                                    return (
                                        <Stack key={lr.id} direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, p: 1, borderRadius: '9px', transition: 'background-color .15s', '&:hover': { bgcolor: '#F8FAFC' } }}>
                                            <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center', minWidth: 0 }}>
                                                <Box sx={{ width: 6, alignSelf: 'stretch', borderRadius: 3, bgcolor: tone, flexShrink: 0 }} />
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                                                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }} noWrap>{lr.leaveType}</Typography>
                                                        <Chip label={lr.daysLabel} size="small" sx={{ height: 17, fontSize: 9.5, fontWeight: 700, bgcolor: `${tone}18`, color: tone, '& .MuiChip-label': { px: 0.7 } }} />
                                                    </Stack>
                                                    <Typography sx={{ fontSize: 11, color: '#94A3B8' }} noWrap>
                                                        {lr.dateRange}{lr.appliedOn ? ` · applied ${lr.appliedOn}` : ''}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                            <Chip label={lr.status} size="small" sx={{ height: 22, fontSize: 10.5, fontWeight: 800, flexShrink: 0, bgcolor: st.bg, color: st.c }} />
                                        </Stack>
                                    );
                                })}
                            </Stack>
                        )}
                    </Panel>
                </Grid>

                <Grid size={{ xs: 12, lg: 5 }}>
                    <Panel title="Upcoming Holidays" icon={EventAvailableRoundedIcon} color="#16A34A" i={8}>
                        {holidays.length === 0 ? (
                            <Nothing icon={EventAvailableRoundedIcon} title="No holidays coming up" hint="Check the working calendar for the full year." />
                        ) : (
                            <Stack spacing={0.4}>
                                {holidays.map((h) => (
                                    <Stack key={h.date} direction="row" spacing={1.3} sx={{ alignItems: 'center', p: 1, borderRadius: '9px', transition: 'background-color .15s', '&:hover': { bgcolor: '#F5FDF8' } }}>
                                        <Box sx={{ minWidth: 46, textAlign: 'center', px: 0.8, py: 0.7, borderRadius: '8px', bgcolor: '#DCFCE7', flexShrink: 0 }}>
                                            <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#15803D', lineHeight: 1.15 }}>{String(h.dateLabel || '').split(' ')[0]}</Typography>
                                            <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#16A34A', textTransform: 'uppercase' }}>{String(h.dateLabel || '').split(' ')[1]}</Typography>
                                        </Box>
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }} noWrap>{h.dayLabel}</Typography>
                                            <Typography sx={{ fontSize: 11, color: '#94A3B8' }} noWrap>{h.dateLabel}</Typography>
                                        </Box>
                                    </Stack>
                                ))}
                            </Stack>
                        )}
                    </Panel>
                </Grid>
            </Grid>

            {/* Pending documents — only worth a card when there's something to do */}
            {pendingDocs.length > 0 && (
                <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                    <Grid size={12}>
                        <Panel
                            title="Documents to Upload"
                            icon={DescriptionRoundedIcon}
                            color="#E11D48"
                            action={hasModule(modules, 'employee-documents') ? 'My Documents' : undefined}
                            onAction={() => navigate('/dashboard/documents?tab=employee')}
                            i={9}
                        >
                            <Stack spacing={0.4}>
                                {pendingDocs.map((d, idx) => (
                                    <Stack key={d.id ?? idx} direction="row" spacing={1.3} sx={{ alignItems: 'center', p: 1, borderRadius: '9px', transition: 'background-color .15s', '&:hover': { bgcolor: '#FFF7F8' } }}>
                                        <Box sx={{ width: 34, height: 34, borderRadius: '9px', bgcolor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <DescriptionRoundedIcon sx={{ fontSize: 17, color: '#E11D48' }} />
                                        </Box>
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }} noWrap>{d.documentName || d.name || 'Document'}</Typography>
                                            <Typography sx={{ fontSize: 11, color: '#94A3B8' }} noWrap>
                                                {[d.category, d.dueDate ? `due ${d.dueDate}` : null].filter(Boolean).join(' · ') || 'Requested by HR'}
                                            </Typography>
                                        </Box>
                                        <Button onClick={() => navigate('/dashboard/documents?tab=employee')} sx={{ ...tonalBtn, height: 32, px: 1.6, fontSize: 12 }}>Upload</Button>
                                    </Stack>
                                ))}
                            </Stack>
                        </Panel>
                    </Grid>
                </Grid>
            )}

            {/* Contact details + why this page */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' }, p: 1.6, borderRadius: '9px', bgcolor: '#F8FAFC', border: '1px solid #EEF1F6' }}>
                <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center', flex: 1, minWidth: 0, flexWrap: 'wrap', gap: 1 }}>
                    <BadgeRoundedIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
                    <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                        This is your personal view. The company-wide dashboard isn&apos;t part of your role.
                    </Typography>
                </Stack>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    {profile.email && (
                        <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
                            <MailOutlineRoundedIcon sx={{ fontSize: 15, color: '#CBD2DD' }} />
                            <Typography sx={{ fontSize: 11.5, color: '#94A3B8' }} noWrap>{profile.email}</Typography>
                        </Stack>
                    )}
                    {profile.mobile && (
                        <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
                            <PhoneRoundedIcon sx={{ fontSize: 15, color: '#CBD2DD' }} />
                            <Typography sx={{ fontSize: 11.5, color: '#94A3B8' }} noWrap>{profile.mobile}</Typography>
                        </Stack>
                    )}
                </Stack>
            </Stack>
        </Box>
    );
}
