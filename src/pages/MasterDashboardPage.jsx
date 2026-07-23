import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Typography, Stack, Grid, Chip, Button, Tooltip, IconButton, LinearProgress, Alert, Avatar } from '@mui/material';
import { keyframes } from '@mui/system';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import StairsRoundedIcon from '@mui/icons-material/StairsRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import EqualizerRoundedIcon from '@mui/icons-material/EqualizerRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded';
import BeachAccessRoundedIcon from '@mui/icons-material/BeachAccessRounded';
import RunningWithErrorsRoundedIcon from '@mui/icons-material/RunningWithErrorsRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import MoreTimeRoundedIcon from '@mui/icons-material/MoreTimeRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { BarChart } from '@mui/x-charts/BarChart';
import { setActiveEntity } from '../redux/slices/orgSlice';
import http, { apiErrorMessage } from '../Api/http';
import { GetBusinessEntitiesDashboard, GetDashboard, GetActionRequired } from '../Api/Api';
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
const num = (v) => n(v).toLocaleString('en-IN');
const inr = (v) => `₹${n(v).toLocaleString('en-IN')}`;
const compactInr = (v) => {
    const x = n(v); const a = Math.abs(x);
    if (a >= 1e7) return `₹${(x / 1e7).toFixed(a >= 1e8 ? 0 : 1)}Cr`;
    if (a >= 1e5) return `₹${(x / 1e5).toFixed(a >= 1e6 ? 0 : 1)}L`;
    if (a >= 1e3) return `₹${(x / 1e3).toFixed(a >= 1e4 ? 0 : 1)}K`;
    return `₹${Math.round(x)}`;
};
const initials = (s = '') => s.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const PALETTE = ['#7C5CFC', '#0EA5E9', '#F59E0B', '#16A34A', '#E11D48', '#6246E0', '#0891B2'];
const colorFor = (s = '') => PALETTE[(s.charCodeAt(0) || 0) % PALETTE.length];

const normalizeEntity = (e) => ({
    id: e.id,
    name: e.companyName ?? '',
    code: e.shortCode ?? '',
    city: e.city ?? '',
    state: e.state ?? '',
    color: e.entityColour || PRIMARY,
    status: e.status || (e.isActive ? 'Active' : 'Inactive'),
    employees: n(e.employees),
    departments: n(e.departments),
    designations: n(e.designations),
});

// Aggregate "action required" cards → icon + destination.
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

export default function MasterDashboardPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const userName = useSelector((s) => s.auth.userName);

    const [entities, setEntities] = useState([]);
    const [summary, setSummary] = useState({ totalEntities: 0, activeEntities: 0, totalEmployees: 0 });
    const [group, setGroup] = useState(null);     // aggregate GetDashboard payload
    const [actions, setActions] = useState(null); // aggregate GetActionRequired payload
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        // Business entities is the backbone (fatal if it fails). The two aggregate
        // reads — group operations + group action items — are best-effort: a
        // failure there just hides those panels, it doesn't break the page.
        // Both force NO entity scope so they span every company.
        const [entRes, dashRes, actRes] = await Promise.allSettled([
            http.get(GetBusinessEntitiesDashboard),
            http.get(GetDashboard, { noEntityScope: true }),
            http.get(GetActionRequired, { noEntityScope: true }),
        ]);
        try {
            if (entRes.status === 'rejected') throw entRes.reason;
            const body = entRes.value?.data;
            if (body?.error) throw new Error(body.message || 'Could not load the group overview.');
            const d = body?.data || {};
            setEntities((Array.isArray(d.entities) ? d.entities : []).map(normalizeEntity).sort((a, b) => b.employees - a.employees));
            setSummary({ totalEntities: n(d.totalEntities), activeEntities: n(d.activeEntities), totalEmployees: n(d.totalEmployees) });
            setLoadError('');
        } catch (err) {
            setLoadError(apiErrorMessage(err, 'Could not load the group overview.'));
        }
        const gBody = dashRes.status === 'fulfilled' ? dashRes.value?.data : null;
        setGroup(gBody && !gBody.error ? gBody.data || null : null);
        const aBody = actRes.status === 'fulfilled' ? actRes.value?.data : null;
        setActions(aBody && !aBody.error ? aBody.data || null : null);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const roll = useMemo(() => ({
        headcount: summary.totalEmployees || entities.reduce((t, e) => t + e.employees, 0),
        departments: entities.reduce((t, e) => t + e.departments, 0),
        designations: entities.reduce((t, e) => t + e.designations, 0),
        inactive: entities.filter((e) => e.status !== 'Active').length,
        largest: entities[0] || null,
        unstaffed: entities.filter((e) => e.employees === 0),
        unstructured: entities.filter((e) => e.departments === 0),
    }), [entities, summary.totalEmployees]);

    const totalEntities = summary.totalEntities || entities.length;
    const activeEntities = summary.activeEntities || entities.filter((e) => e.status === 'Active').length;
    const avgHeadcount = totalEntities ? Math.round(roll.headcount / totalEntities) : 0;

    const stats = group?.stats || {};
    const payroll = group?.payroll || {};
    const trend = Array.isArray(group?.payrollTrend) ? group.payrollTrend : [];
    const needs = group?.needsAttention || {};
    const newJoiners = Array.isArray(group?.newJoiners) ? group.newJoiners : [];
    const resignations = Array.isArray(group?.resignations) ? group.resignations : [];
    const leaveRequests = Array.isArray(group?.leaveRequests) ? group.leaveRequests : [];

    const actionCards = (Array.isArray(actions?.cards) ? actions.cards : []).filter((c) => !c.clear && n(c.count) > 0);
    const totalPending = n(actions?.totalPending);

    const openEntity = (ent) => { dispatch(setActiveEntity(ent.id)); navigate('/dashboard'); };

    const KPIS = [
        { label: 'Business Entities', value: num(totalEntities), sub: `${activeEntities} active · ${roll.inactive} inactive`, icon: ApartmentRoundedIcon, color: PRIMARY, bg: PRIMARY_LIGHT, to: '/dashboard/entities' },
        { label: 'Total Employees', value: num(roll.headcount), sub: `${num(avgHeadcount)} avg per entity`, icon: GroupsRoundedIcon, color: '#16A34A', bg: '#DCFCE7', to: '/dashboard/employees' },
        { label: 'Present Today', value: num(stats.presentToday), sub: group ? `${n(stats.presentPercent)}% across the group` : '—', icon: HowToRegRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE', to: '/dashboard/attendance-leave?tab=overview' },
        { label: 'Payroll This Month', value: compactInr(payroll.grossPayout), sub: payroll.hasCycle ? (payroll.cycleLabel || 'Current cycle') : 'No cycle yet', icon: PaymentsRoundedIcon, color: '#F59E0B', bg: '#FFF7ED', to: '/dashboard/run-payroll?tab=register' },
    ];

    const attendanceTiles = [
        { label: 'Present', value: n(stats.presentToday), color: '#16A34A', icon: HowToRegRoundedIcon },
        { label: 'Absent', value: n(stats.absentToday), color: '#F59E0B', icon: EventBusyRoundedIcon },
        { label: 'On Leave', value: n(stats.onLeaveToday), color: '#0891B2', icon: BeachAccessRoundedIcon },
        { label: 'Late', value: n(stats.lateComersToday), color: '#E11D48', icon: RunningWithErrorsRoundedIcon },
    ];

    const alerts = [
        { key: 'documentsPending', title: 'Documents Pending', color: '#7C5CFC', bg: '#F1EEFE', icon: DescriptionRoundedIcon, count: n(needs.documentsPending) },
        { key: 'probationEnding', title: 'Probation Ending', color: '#0EA5E9', bg: '#E0F2FE', icon: HowToRegRoundedIcon, count: n(needs.probationEnding) },
        { key: 'lateArrivals', title: 'Late Arrivals', color: '#E11D48', bg: '#FEE2E2', icon: ScheduleRoundedIcon, count: n(needs.lateArrivals) },
        { key: 'extendedLeave', title: 'Extended Leave', color: '#F59E0B', bg: '#FFF7ED', icon: BeachAccessRoundedIcon, count: n(needs.extendedLeave) },
        { key: 'absentNoNotice', title: 'Absent · No Notice', color: '#DC2626', bg: '#FEE2E2', icon: EventBusyRoundedIcon, count: n(needs.absentNoNotice) },
    ];

    const quickActions = [
        { label: 'Manage Entities', icon: ApartmentRoundedIcon, to: '/dashboard/entities', color: '#7C5CFC' },
        { label: 'Departments', icon: AccountTreeRoundedIcon, to: '/dashboard/organisation?tab=departments', color: '#0EA5E9' },
        { label: 'Designations', icon: StairsRoundedIcon, to: '/dashboard/organisation?tab=designations', color: '#F59E0B' },
        { label: 'Roles & Access', icon: AdminPanelSettingsRoundedIcon, to: '/dashboard/roles', color: '#E11D48' },
        { label: 'Financial Year', icon: CalendarMonthRoundedIcon, to: '/dashboard/settings?tab=financial-year', color: '#0891B2' },
        { label: 'Onboard Employee', icon: PersonAddAlt1RoundedIcon, to: '/dashboard/employees/onboard', color: '#16A34A' },
    ];

    if (loading) return <Loader />;
    if (loadError) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity="error" sx={{ borderRadius: '9px' }} action={<Button size="small" onClick={load} sx={{ textTransform: 'none', fontWeight: 700 }}>Retry</Button>}>{loadError}</Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            {/* Header */}
            <Stack direction="row" sx={{ alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, pb: 2.5 }}>
                <Box>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>Master Dashboard</Typography>
                        <Chip label="All entities" size="small" sx={{ height: 22, fontSize: 10.5, fontWeight: 800, bgcolor: PRIMARY_LIGHT, color: PRIMARY }} />
                    </Stack>
                    <Typography sx={{ fontSize: 13, color: '#6B7280', mt: 0.3 }}>
                        Every business entity in one view{userName ? `, ${userName}` : ''} · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Tooltip arrow title="Reload"><IconButton onClick={load} sx={{ ...ghostBtn, width: 42, height: 42 }}><RefreshRoundedIcon sx={{ fontSize: 19 }} /></IconButton></Tooltip>
                    <Button onClick={() => navigate('/dashboard/entities')} startIcon={<ApartmentRoundedIcon />} sx={{ ...tonalBtn, height: 42, px: 2 }}>Manage Entities</Button>
                </Stack>
            </Stack>

            {/* Hero + KPI cards */}
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Box sx={{ ...enter(0), background: 'linear-gradient(160deg, #7C5CFC 0%, #6246E0 100%)', borderRadius: '7px', p: 3, color: '#fff', height: '100%', position: 'relative', overflow: 'hidden', boxShadow: '0 16px 34px -18px rgba(124,92,252,0.7)' }}>
                        <Box sx={{ position: 'absolute', top: -40, right: -30, width: 150, height: 150, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.08)' }} />
                        <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', opacity: 0.85, position: 'relative' }}>GROUP HEADCOUNT</Typography>
                        <Typography sx={{ fontSize: 42, fontWeight: 800, lineHeight: 1.15, mt: 0.5, position: 'relative' }}>{num(roll.headcount)}</Typography>
                        <Typography sx={{ fontSize: 13.5, opacity: 0.9, mt: 0.4, mb: 2.4, position: 'relative' }}>across {num(totalEntities)} {totalEntities === 1 ? 'entity' : 'entities'}</Typography>
                        <Stack direction="row" spacing={1} sx={{ mb: 1.2, position: 'relative' }}>
                            {[['ACTIVE', num(activeEntities)], ['INACTIVE', num(roll.inactive)], ['AVG SIZE', num(avgHeadcount)]].map(([l, v]) => (
                                <Box key={l} sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.14)', borderRadius: '7px', p: 1.2 }}>
                                    <Typography sx={{ fontSize: 9.5, fontWeight: 700, opacity: 0.8 }}>{l}</Typography>
                                    <Typography sx={{ fontSize: 15, fontWeight: 800, mt: 0.3 }}>{v}</Typography>
                                </Box>
                            ))}
                        </Stack>
                        <Box sx={{ bgcolor: 'rgba(255,255,255,0.14)', borderRadius: '7px', p: 1.4, position: 'relative' }}>
                            <Typography sx={{ fontSize: 9.5, fontWeight: 700, opacity: 0.8 }}>LARGEST ENTITY</Typography>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 800, mt: 0.3 }} noWrap>{roll.largest?.name || '—'}</Typography>
                            <Typography sx={{ fontSize: 11.5, opacity: 0.85 }}>{roll.largest ? `${num(roll.largest.employees)} employees · ${roll.headcount ? Math.round((roll.largest.employees / roll.headcount) * 100) : 0}% of the group` : 'No entities yet'}</Typography>
                        </Box>
                        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', mt: 2.2, pt: 1.6, borderTop: '1px solid rgba(255,255,255,0.18)', opacity: 0.85, position: 'relative' }}>
                            <AdminPanelSettingsRoundedIcon sx={{ fontSize: 14 }} />
                            <Typography sx={{ fontSize: 11.5 }}>Aggregated across every entity you manage</Typography>
                        </Stack>
                    </Box>
                </Grid>
                <Grid size={{ xs: 12, lg: 8 }}>
                    <Grid container spacing={1.5} sx={{ height: '100%' }}>
                        {KPIS.map((k, i) => (
                            <Grid size={{ xs: 12, sm: 6 }} key={k.label}>
                                <Box onClick={() => navigate(k.to)} sx={{ ...card, p: 2.5, bgcolor: k.bg, border: `1px solid ${k.color}22`, cursor: 'pointer', height: '100%', transition: 'transform .15s, box-shadow .15s', '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 20px ${k.color}22` }, ...enter(i + 1) }}>
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

            {/* Group action required — pending approvals across all entities */}
            {group && (
                <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                    <Grid size={12}>
                        <Panel title="Action Required · Group" icon={TaskAltRoundedIcon} color="#E11D48" i={3}>
                            <Typography sx={{ fontSize: 12.5, color: '#64748B', mb: 1.4 }}>
                                {totalPending > 0
                                    ? <>Across every entity, <b style={{ color: '#0F172A' }}>{totalPending}</b> item{totalPending > 1 ? 's' : ''} await a decision.</>
                                    : 'Nothing waiting on approval across the group.'}
                            </Typography>
                            {actionCards.length === 0 ? (
                                <Typography sx={{ fontSize: 12.5, color: '#94A3B8' }}>All approval queues are clear.</Typography>
                            ) : (
                                <Grid container spacing={1}>
                                    {actionCards.map((a) => {
                                        const meta = ACTION_META[a.key] || { icon: TaskAltRoundedIcon, color: '#64748B', to: null };
                                        const Icon = meta.icon;
                                        return (
                                            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={a.key}>
                                                <Stack direction="row" spacing={1.2} onClick={meta.to ? () => navigate(meta.to) : undefined}
                                                    sx={{ alignItems: 'center', p: 1, pr: 1.3, borderRadius: '10px', border: `1px solid ${meta.color}2E`, bgcolor: `${meta.color}0A`, cursor: meta.to ? 'pointer' : 'default', transition: 'all .15s', '&:hover': meta.to ? { transform: 'translateY(-1px)', borderColor: `${meta.color}66`, boxShadow: `0 6px 16px -8px ${meta.color}88` } : {} }}>
                                                    <Box sx={{ width: 32, height: 32, borderRadius: '8px', flexShrink: 0, bgcolor: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon sx={{ fontSize: 17, color: meta.color }} /></Box>
                                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }} noWrap>{a.title}</Typography>
                                                        <Typography sx={{ fontSize: 10.5, color: '#98A0AE' }} noWrap>{a.subtitle}</Typography>
                                                    </Box>
                                                    <Box sx={{ minWidth: 22, height: 22, px: 0.7, borderRadius: '7px', flexShrink: 0, bgcolor: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: '#fff' }}>{n(a.count)}</Typography>
                                                    </Box>
                                                </Stack>
                                            </Grid>
                                        );
                                    })}
                                </Grid>
                            )}
                        </Panel>
                    </Grid>
                </Grid>
            )}

            {/* Attendance today · Payroll this month (group) */}
            {group && (
                <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                    <Grid size={{ xs: 12, lg: 6 }}>
                        <Panel title="Attendance Today · Group" icon={HowToRegRoundedIcon} color="#16A34A" action="Attendance" onAction={() => navigate('/dashboard/attendance-leave?tab=overview')} i={4}>
                            <Grid container spacing={1.2}>
                                {attendanceTiles.map((t) => (
                                    <Grid size={6} key={t.label}>
                                        <Box sx={{ p: 1.6, borderRadius: '10px', border: `1px solid ${t.color}22`, bgcolor: `${t.color}0A` }}>
                                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box>
                                                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>{num(t.value)}</Typography>
                                                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.color, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t.label}</Typography>
                                                </Box>
                                                <Box sx={{ width: 36, height: 36, borderRadius: '9px', bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><t.icon sx={{ fontSize: 18, color: t.color }} /></Box>
                                            </Stack>
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                            <Typography sx={{ fontSize: 11.5, color: '#94A3B8', mt: 1.4 }}>{n(stats.presentPercent)}% of {num(roll.headcount)} employees present across the group today.</Typography>
                        </Panel>
                    </Grid>
                    <Grid size={{ xs: 12, lg: 6 }}>
                        <Panel title="Payroll · Group" icon={PaymentsRoundedIcon} color="#7C5CFC" action="Run Payroll" onAction={() => navigate('/dashboard/run-payroll?tab=register')} i={5}>
                            {!payroll.hasCycle ? (
                                <Typography sx={{ fontSize: 13, color: '#94A3B8', py: 3, textAlign: 'center' }}>No payroll cycle running.</Typography>
                            ) : (
                                <>
                                    <Typography sx={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{payroll.cycleLabel}</Typography>
                                    <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mt: 0.5, gap: 1 }}>
                                        <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#0F172A' }}>{inr(payroll.grossPayout)}</Typography>
                                        {payroll.statusBadge && <Chip label={payroll.statusBadge} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, flexShrink: 0, bgcolor: '#FEF3C7', color: '#B45309' }} />}
                                    </Stack>
                                    <Typography sx={{ fontSize: 11.5, color: '#6B7280', mt: 0.3 }}>Gross · {num(payroll.employees)} employees · net {inr(payroll.netPayout)}</Typography>
                                    <Grid container spacing={1} sx={{ mt: 1 }}>
                                        {[['New Joiners', newJoiners.length, '#16A34A'], ['Resignations', resignations.length, '#E11D48'], ['Leave Requests', leaveRequests.length, '#0891B2']].map(([l, v, c]) => (
                                            <Grid size={4} key={l}>
                                                <Box sx={{ p: 1.2, borderRadius: '8px', bgcolor: '#F8FAFC', border: '1px solid #EEF1F6', textAlign: 'center' }}>
                                                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: c }}>{num(v)}</Typography>
                                                    <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: '#98A0AE', textTransform: 'uppercase', letterSpacing: 0.3 }}>{l}</Typography>
                                                </Box>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </>
                            )}
                        </Panel>
                    </Grid>
                </Grid>
            )}

            {/* Every entity, ranked by headcount */}
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                <Grid size={12}>
                    <Panel title="Entities" icon={ApartmentRoundedIcon} action="Manage entities" onAction={() => navigate('/dashboard/entities')} i={6}>
                        {entities.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 5 }}>
                                <ApartmentRoundedIcon sx={{ fontSize: 34, color: '#CBD2DD' }} />
                                <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#64748B', mt: 1 }}>No entities yet</Typography>
                                <Button onClick={() => navigate('/dashboard/entities')} sx={{ ...tonalBtn, mt: 2, height: 38, px: 2 }}>Add entity</Button>
                            </Box>
                        ) : (
                            <Grid container spacing={1.2}>
                                {entities.map((ent) => {
                                    const share = roll.headcount ? Math.round((ent.employees / roll.headcount) * 100) : 0;
                                    const inactive = ent.status !== 'Active';
                                    return (
                                        <Grid size={{ xs: 12, md: 6, xl: 4 }} key={ent.id}>
                                            <Box sx={{ height: '100%', border: '1px solid #EEF0F6', borderRadius: '10px', p: 1.8, bgcolor: inactive ? '#FBFBFD' : '#fff', opacity: inactive ? 0.85 : 1, display: 'flex', flexDirection: 'column', gap: 1.3, transition: 'border-color .15s, box-shadow .15s, transform .15s', '&:hover': { borderColor: `${ent.color}66`, boxShadow: `0 10px 24px -14px ${ent.color}88`, transform: 'translateY(-2px)' } }}>
                                                <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center' }}>
                                                    <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: ent.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 10px ${ent.color}55` }}>
                                                        <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: '#fff' }}>{(ent.code || ent.name).slice(0, 3).toUpperCase()}</Typography>
                                                    </Box>
                                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                                        <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }} noWrap>{ent.name}</Typography>
                                                        <Typography sx={{ fontSize: 11.5, color: '#98A0AE' }} noWrap>{[ent.city, ent.state].filter(Boolean).join(', ') || ent.code || '—'}</Typography>
                                                    </Box>
                                                    <Chip label={ent.status} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 800, flexShrink: 0, bgcolor: inactive ? '#F1F5F9' : '#DCFCE7', color: inactive ? '#64748B' : '#16A34A' }} />
                                                </Stack>
                                                <Grid container spacing={1}>
                                                    {[['Employees', ent.employees], ['Departments', ent.departments], ['Designations', ent.designations]].map(([l, v]) => (
                                                        <Grid size={4} key={l}>
                                                            <Box sx={{ bgcolor: '#F8FAFC', border: '1px solid #EEF1F6', borderRadius: '8px', p: 1, textAlign: 'center' }}>
                                                                <Typography sx={{ fontSize: 16, fontWeight: 800, color: v ? '#0F172A' : '#C4C9D4' }}>{num(v)}</Typography>
                                                                <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: '#98A0AE', textTransform: 'uppercase', letterSpacing: 0.3 }}>{l}</Typography>
                                                            </Box>
                                                        </Grid>
                                                    ))}
                                                </Grid>
                                                <Box>
                                                    <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                                                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>Share of group</Typography>
                                                        <Typography sx={{ fontSize: 11, fontWeight: 800, color: ent.color }}>{share}%</Typography>
                                                    </Stack>
                                                    <LinearProgress variant="determinate" value={share} sx={{ height: 6, borderRadius: 5, bgcolor: '#EEF0F6', '& .MuiLinearProgress-bar': { bgcolor: ent.color, borderRadius: 5 } }} />
                                                </Box>
                                                <Stack direction="row" spacing={1} sx={{ mt: 'auto', pt: 1.2, borderTop: '1px solid #F1F0F9' }}>
                                                    <Button onClick={() => openEntity(ent)} startIcon={<LoginRoundedIcon sx={{ fontSize: 16 }} />} sx={{ ...tonalBtn, flex: 1, height: 34, fontSize: 12 }}>Open dashboard</Button>
                                                    <Button onClick={() => navigate('/dashboard/entities')} sx={{ ...ghostBtn, height: 34, px: 1.6, fontSize: 12 }}>Details</Button>
                                                </Stack>
                                            </Box>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        )}
                    </Panel>
                </Grid>
            </Grid>

            {/* Headcount by entity · Payroll trend / Needs attention */}
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                <Grid size={{ xs: 12, lg: 7 }}>
                    <Panel title="Headcount by Entity" icon={EqualizerRoundedIcon} color="#0EA5E9" action="Employees" onAction={() => navigate('/dashboard/employees')} i={7}>
                        {entities.length === 0 ? (
                            <Typography sx={{ fontSize: 12.5, color: '#94A3B8', py: 4, textAlign: 'center' }}>Nothing to compare yet.</Typography>
                        ) : (
                            <BarChart
                                xAxis={[{ scaleType: 'band', data: entities.map((e) => e.code || e.name), categoryGapRatio: 0.55 }]}
                                yAxis={[{ width: 44 }]}
                                series={[
                                    { data: entities.map((e) => e.employees), label: 'Employees', color: PRIMARY },
                                    { data: entities.map((e) => e.departments), label: 'Departments', color: '#0EA5E9' },
                                ]}
                                height={260}
                                borderRadius={6}
                                grid={{ horizontal: true }}
                                margin={{ top: 16, right: 8, bottom: 24, left: 8 }}
                                slotProps={{ legend: { direction: 'horizontal', position: { vertical: 'top', horizontal: 'end' } } }}
                                sx={{ '& .MuiChartsAxis-line, & .MuiChartsAxis-tick': { display: 'none' }, '& .MuiChartsGrid-line': { stroke: '#EEF1F6' }, '& .MuiChartsAxis-tickLabel': { fontSize: 11, fill: '#94A3B8' } }}
                            />
                        )}
                    </Panel>
                </Grid>
                <Grid size={{ xs: 12, lg: 5 }}>
                    <Panel title="Needs Attention · Group" icon={WarningAmberRoundedIcon} color="#F59E0B" i={8}>
                        {!group ? (
                            <Typography sx={{ fontSize: 12.5, color: '#94A3B8', py: 3, textAlign: 'center' }}>Group figures unavailable right now.</Typography>
                        ) : (
                            <Stack spacing={0.5}>
                                {alerts.map((a) => (
                                    <Stack key={a.key} direction="row" sx={{ alignItems: 'center', gap: 1.3, p: 1, borderRadius: '9px', opacity: a.count ? 1 : 0.6, '&:hover': { bgcolor: '#F8FAFC' } }}>
                                        <Box sx={{ width: 36, height: 36, borderRadius: '9px', bgcolor: a.count ? a.bg : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><a.icon sx={{ fontSize: 19, color: a.count ? a.color : '#94A3B8' }} /></Box>
                                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A', flex: 1 }} noWrap>{a.title}</Typography>
                                        <Box sx={{ minWidth: 26, height: 24, px: 0.9, borderRadius: '7px', bgcolor: a.count ? a.bg : '#F1F5F9', color: a.count ? a.color : '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>{num(a.count)}</Typography>
                                        </Box>
                                    </Stack>
                                ))}
                            </Stack>
                        )}
                    </Panel>
                </Grid>
            </Grid>

            {/* Payroll trend (group) + New joiners */}
            {group && (trend.length > 0 || newJoiners.length > 0) && (
                <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                    <Grid size={{ xs: 12, lg: 7 }}>
                        <Panel title="Payroll Cost Trend · Group" icon={PaymentsRoundedIcon} color="#7C5CFC" action="Register" onAction={() => navigate('/dashboard/run-payroll?tab=register')} i={9}>
                            {trend.length === 0 ? (
                                <Typography sx={{ fontSize: 12.5, color: '#94A3B8', py: 4, textAlign: 'center' }}>The trend builds up as cycles are run.</Typography>
                            ) : (
                                <BarChart
                                    xAxis={[{ scaleType: 'band', data: trend.map((t) => t.month), categoryGapRatio: 0.55, barGapRatio: 0.3 }]}
                                    yAxis={[{ valueFormatter: compactInr, width: 56 }]}
                                    series={[
                                        { data: trend.map((t) => n(t.gross)), label: 'Gross', color: '#7C5CFC', valueFormatter: (v) => inr(v) },
                                        { data: trend.map((t) => n(t.net)), label: 'Net', color: '#C4B5FD', valueFormatter: (v) => inr(v) },
                                    ]}
                                    height={240}
                                    borderRadius={6}
                                    grid={{ horizontal: true }}
                                    margin={{ top: 16, right: 8, bottom: 24, left: 8 }}
                                    slotProps={{ legend: { direction: 'horizontal', position: { vertical: 'top', horizontal: 'end' } } }}
                                    sx={{ '& .MuiChartsAxis-line, & .MuiChartsAxis-tick': { display: 'none' }, '& .MuiChartsGrid-line': { stroke: '#EEF1F6' }, '& .MuiChartsAxis-tickLabel': { fontSize: 11, fill: '#94A3B8' } }}
                                />
                            )}
                        </Panel>
                    </Grid>
                    <Grid size={{ xs: 12, lg: 5 }}>
                        <Panel title="New Joiners · Group" icon={PersonAddAlt1RoundedIcon} color="#16A34A" i={10}>
                            {newJoiners.length === 0 ? (
                                <Typography sx={{ fontSize: 12.5, color: '#94A3B8', py: 3, textAlign: 'center' }}>No recent joiners across the group.</Typography>
                            ) : (
                                <Stack spacing={0.4}>
                                    {newJoiners.slice(0, 6).map((p, idx) => (
                                        <Stack key={`${p.name}-${idx}`} direction="row" spacing={1.3} sx={{ alignItems: 'center', p: 0.8, borderRadius: '9px', '&:hover': { bgcolor: '#F8FAFC' } }}>
                                            <Avatar sx={{ width: 34, height: 34, bgcolor: `${colorFor(p.name || '')}22`, color: colorFor(p.name || ''), fontSize: 12, fontWeight: 700 }}>{p.initials || initials(p.name || '')}</Avatar>
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }} noWrap>{p.name}</Typography>
                                                <Typography sx={{ fontSize: 10.5, color: '#94A3B8' }} noWrap>{[p.subtitle, p.entityName].filter(Boolean).join(' · ')}</Typography>
                                            </Box>
                                            <Typography sx={{ fontSize: 10.5, color: '#98A0AE', flexShrink: 0 }}>{p.whenLabel}</Typography>
                                        </Stack>
                                    ))}
                                </Stack>
                            )}
                        </Panel>
                    </Grid>
                </Grid>
            )}

            {/* Group setup shortcuts */}
            <Grid container spacing={1.5}>
                <Grid size={12}>
                    <Panel title="Group Setup" icon={PlayArrowRoundedIcon} color="#16A34A" i={11}>
                        <Grid container spacing={1}>
                            {quickActions.map((a) => (
                                <Grid size={{ xs: 6, sm: 4, lg: 2 }} key={a.label}>
                                    <Stack onClick={() => navigate(a.to)} spacing={0.8} sx={{ alignItems: 'flex-start', p: 1.4, borderRadius: '8px', border: '1px solid #EEF1F6', bgcolor: '#F8FAFC', cursor: 'pointer', height: '100%', transition: 'all .15s', '&:hover': { borderColor: `${a.color}55`, bgcolor: `${a.color}0D`, transform: 'translateY(-1px)' } }}>
                                        <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: `${a.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><a.icon sx={{ fontSize: 18, color: a.color }} /></Box>
                                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#334155', lineHeight: 1.25 }}>{a.label}</Typography>
                                    </Stack>
                                </Grid>
                            ))}
                        </Grid>
                    </Panel>
                </Grid>
            </Grid>
        </Box>
    );
}
