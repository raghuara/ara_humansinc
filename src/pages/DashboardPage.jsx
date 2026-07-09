import React from 'react';
import { Box, Typography, Stack, Grid, Chip, LinearProgress, Button } from '@mui/material';
import { keyframes } from '@mui/system';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import WavingHandRoundedIcon from '@mui/icons-material/WavingHandRounded';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
    ResponsiveContainer,
} from 'recharts';
import { PRIMARY, GRADIENT } from '../theme';

// Soft accent colours for the charts.
const CH_VIOLET = '#8E7DF6';
const CH_SKY = '#5FB8F5';

// ── Animations ───────────────────────────────────────────────────────────────
const fadeUp = keyframes`from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; }`;
const enter = (i) => ({ animation: `${fadeUp} .55s cubic-bezier(.22,1,.36,1) both`, animationDelay: `${i * 0.07}s` });

// Small colour-dot legend chip used in chart headers.
const LegendDot = ({ color, label }) => (
    <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
        <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: color }} />
        <Typography sx={{ fontSize: 12.5, color: '#64748B', fontWeight: 600 }}>{label}</Typography>
    </Stack>
);

const STATS = [
    { label: 'Total Employees', value: '248', delta: '+12', up: true, icon: GroupsRoundedIcon, color: '#7C5CFC', bg: '#F1EEFE' },
    { label: 'Monthly Payroll', value: '₹42.6L', delta: '+4.2%', up: true, icon: PaymentsRoundedIcon, color: '#9B87FB', bg: '#F3F0FE' },
    { label: 'Pending Approvals', value: '17', delta: '-5', up: false, icon: PendingActionsRoundedIcon, color: '#F59E0B', bg: '#FFF7ED' },
    { label: 'Statutory Dues', value: '₹6.8L', delta: '+1.1%', up: true, icon: AccountBalanceRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE' },
];

const TREND = [
    { m: 'Jan', gross: 38.2, net: 32.0 }, { m: 'Feb', gross: 39.1, net: 32.8 },
    { m: 'Mar', gross: 40.4, net: 33.9 }, { m: 'Apr', gross: 39.8, net: 33.4 },
    { m: 'May', gross: 41.2, net: 34.6 }, { m: 'Jun', gross: 41.9, net: 35.2 },
    { m: 'Jul', gross: 42.6, net: 35.8 },
];

const DEPT = [
    { dept: 'Eng', earn: 18.4, deduct: 3.1 },
    { dept: 'Sales', earn: 12.2, deduct: 2.0 },
    { dept: 'Design', earn: 7.6, deduct: 1.2 },
];

const STAGES = [
    { label: 'Attendance Cutoff', icon: FactCheckRoundedIcon, done: true },
    { label: 'Salary Calculation', icon: CalculateRoundedIcon, done: true },
    { label: 'Manager Approval', icon: HowToRegRoundedIcon, done: false, current: true },
    { label: 'Salary Credited', icon: SavingsRoundedIcon, done: false },
];

const MODULES = [
    { text: 'Salary Structures', desc: 'Configure earnings & deduction rules', icon: RequestQuoteRoundedIcon, color: '#7C5CFC', bg: '#F1EEFE', path: '/dashboard/salary-structures' },
    { text: 'Compliance & Deductions', desc: 'PF, ESI, PT & TDS settings', icon: AccountBalanceRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE', path: '/dashboard/compliance' },
    { text: 'Salary Register', desc: 'Audit-ready monthly breakdowns', icon: ReceiptLongRoundedIcon, color: '#9B87FB', bg: '#F3F0FE', path: '/dashboard/salary-register' },
    { text: 'Run & Approve Payroll', desc: 'Process & approve disbursement', icon: FactCheckRoundedIcon, color: '#F59E0B', bg: '#FFF7ED', path: '/dashboard/approve-payroll' },
];

const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
const hoverLift = { transition: 'transform .22s ease, box-shadow .22s ease, border-color .22s ease', '&:hover': { transform: 'translateY(-2px)', borderColor: '#D3DBE6', boxShadow: '0 8px 20px -12px rgba(16,24,40,0.22)' } };

export default function DashboardPage() {
    const navigate = useNavigate();
    const auth = useSelector((s) => s.auth);

    return (
        <Box>
            {/* ── Welcome hero (white card, blue accents only) ─────────────── */}
            <Box sx={{ ...enter(0), ...card, p: { xs: 2.5, md: 3 }, mb: 1.5, position: 'relative', overflow: 'hidden' }}>
                {/* subtle gradient glows for a hint of colour */}
                <Box sx={{ position: 'absolute', top: -60, right: -30, width: 210, height: 210, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,92,252,0.12), transparent 70%)' }} />
                <Box sx={{ position: 'absolute', bottom: -70, right: 150, width: 170, height: 170, borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,165,233,0.10), transparent 70%)' }} />
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ position: 'relative', justifyContent: 'space-between', alignItems: { md: 'center' } }}>
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                        <Box sx={{ width: 52, height: 52, borderRadius: '7px', background: GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <WavingHandRoundedIcon sx={{ fontSize: 25, color: '#fff' }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.4px' }}>
                                Good day, {auth.userName || 'there'}
                            </Typography>
                            <Typography sx={{ fontSize: 13.5, color: '#64748B', mt: 0.3 }}>
                                Your July 2026 payroll cycle is in progress — next payout in 4 days.
                            </Typography>
                        </Box>
                    </Stack>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1.2 }}>
                        <Chip label="Cycle: Jul 2026 · In progress" sx={{ bgcolor: '#F1EEFE', color: PRIMARY, fontWeight: 600, fontSize: 12.5, border: '1px solid #C9BEFB' }} />
                        <Button
                            endIcon={<ArrowForwardRoundedIcon />}
                            onClick={() => navigate('/dashboard/approve-payroll')}
                            sx={{ background: GRADIENT, color: '#fff', fontWeight: 700, fontSize: 13, borderRadius: '7px', px: 2, height: 40, boxShadow: 'none', transition: 'filter .2s', '&:hover': { filter: 'brightness(0.94)' } }}
                        >
                            Review payroll
                        </Button>
                    </Stack>
                </Stack>
            </Box>

            {/* ── Stat cards ───────────────────────────────────────────────── */}
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                {STATS.map((s, i) => (
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={s.label}>
                        <Box sx={{ ...card, ...hoverLift, ...enter(i + 1), p: 2.5, bgcolor: s.bg, border: `1px solid ${s.color}22` }}>
                            <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <Box sx={{ width: 48, height: 48, borderRadius: '7px', bgcolor: '#fff', boxShadow: '0 1px 3px rgba(16,24,40,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <s.icon sx={{ fontSize: 25, color: s.color }} />
                                </Box>
                                <Chip
                                    size="small"
                                    icon={s.up ? <ArrowUpwardRoundedIcon sx={{ fontSize: 14 }} /> : <ArrowDownwardRoundedIcon sx={{ fontSize: 14 }} />}
                                    label={s.delta}
                                    sx={{
                                        height: 22, fontSize: 11.5, fontWeight: 700,
                                        bgcolor: s.up ? '#ECFDF3' : '#FEF2F2',
                                        color: s.up ? '#059669' : '#DC2626',
                                        '& .MuiChip-icon': { color: 'inherit', ml: 0.5 },
                                    }}
                                />
                            </Stack>
                            <Typography sx={{ fontSize: 28, fontWeight: 800, color: '#0F172A', mt: 1.5 }}>{s.value}</Typography>
                            <Typography sx={{ fontSize: 12.5, color: '#98A0AE' }}>{s.label}</Typography>
                        </Box>
                    </Grid>
                ))}
            </Grid>

            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                {/* Trend chart */}
                <Grid size={{ xs: 12, lg: 8 }}>
                    <Box sx={{ ...card, ...enter(5), p: 3 }}>
                        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
                            <Box>
                                <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Payroll cost trend</Typography>
                                <Typography sx={{ fontSize: 12.5, color: '#98A0AE' }}>Gross vs net monthly outflow (₹ lakhs)</Typography>
                            </Box>
                            <Stack direction="row" spacing={2}>
                                <LegendDot color={PRIMARY} label="Gross" />
                                <LegendDot color={CH_VIOLET} label="Net" />
                            </Stack>
                        </Stack>
                        <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={TREND} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gGross" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.24} />
                                        <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={CH_VIOLET} stopOpacity={0.22} />
                                        <stop offset="100%" stopColor={CH_VIOLET} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" stroke="#EEF1F6" vertical={false} />
                                <XAxis dataKey="m" tick={{ fontSize: 12, fill: '#98A0AE' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#98A0AE' }} axisLine={false} tickLine={false} />
                                <RTooltip formatter={(v, n) => [`₹${v}L`, n === 'gross' ? 'Gross' : 'Net']} contentStyle={{ borderRadius: 12, border: '1px solid #EDEFF4', fontSize: 13, boxShadow: '0 8px 24px rgba(16,24,40,0.1)' }} />
                                <Area type="monotone" dataKey="gross" stroke={PRIMARY} strokeWidth={2.6} fill="url(#gGross)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                                <Area type="monotone" dataKey="net" stroke={CH_VIOLET} strokeWidth={2.6} fill="url(#gNet)" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Box>
                </Grid>

                {/* Department payroll (grouped bars) */}
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Box sx={{ ...card, ...enter(6), p: 3, height: '100%' }}>
                        <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                            <Box>
                                <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Department payroll</Typography>
                                <Typography sx={{ fontSize: 12.5, color: '#98A0AE' }}>Earnings vs deductions (₹ lakhs)</Typography>
                            </Box>
                        </Stack>
                        <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
                            <LegendDot color={CH_VIOLET} label="Earnings" />
                            <LegendDot color={CH_SKY} label="Deductions" />
                        </Stack>
                        <ResponsiveContainer width="100%" height={210}>
                            <BarChart data={DEPT} margin={{ top: 6, right: 6, left: -20, bottom: 0 }} barGap={5} barCategoryGap="30%">
                                <defs>
                                    <linearGradient id="bEarn" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={CH_VIOLET} stopOpacity={1} />
                                        <stop offset="100%" stopColor={CH_VIOLET} stopOpacity={0.4} />
                                    </linearGradient>
                                    <linearGradient id="bDed" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={CH_SKY} stopOpacity={1} />
                                        <stop offset="100%" stopColor={CH_SKY} stopOpacity={0.4} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 4" stroke="#EEF1F6" vertical={false} />
                                <XAxis dataKey="dept" tick={{ fontSize: 11.5, fill: '#98A0AE' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#98A0AE' }} axisLine={false} tickLine={false} />
                                <RTooltip cursor={{ fill: 'rgba(124,92,252,0.05)' }} formatter={(v, n) => [`₹${v}L`, n === 'earn' ? 'Earnings' : 'Deductions']} contentStyle={{ borderRadius: 12, border: '1px solid #EDEFF4', fontSize: 13 }} />
                                <Bar dataKey="earn" name="earn" fill="url(#bEarn)" radius={[5, 5, 0, 0]} maxBarSize={18} />
                                <Bar dataKey="deduct" name="deduct" fill="url(#bDed)" radius={[5, 5, 0, 0]} maxBarSize={18} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                </Grid>
            </Grid>

            <Grid container spacing={1.5}>
                {/* Payroll cycle timeline */}
                <Grid size={{ xs: 12, lg: 5 }}>
                    <Box sx={{ ...card, ...enter(7), p: 3, height: '100%' }}>
                        <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#0F172A', mb: 0.3 }}>This month's payroll cycle</Typography>
                        <Typography sx={{ fontSize: 12.5, color: '#98A0AE', mb: 2.5 }}>2 of 4 stages complete</Typography>
                        <LinearProgress variant="determinate" value={50} sx={{ height: 8, borderRadius: 5, mb: 3, bgcolor: '#EEF0F5', '& .MuiLinearProgress-bar': { background: GRADIENT, borderRadius: 5 } }} />
                        <Stack spacing={2.2}>
                            {STAGES.map((st) => (
                                <Stack key={st.label} direction="row" spacing={1.8} sx={{ alignItems: 'center' }}>
                                    <Box sx={{ width: 42, height: 42, borderRadius: '7px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: st.done ? '#F1EEFE' : st.current ? '#FFF7ED' : '#F3F4F8' }}>
                                        <st.icon sx={{ fontSize: 21, color: st.done ? PRIMARY : st.current ? '#F59E0B' : '#98A0AE' }} />
                                    </Box>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A' }}>{st.label}</Typography>
                                        <Typography sx={{ fontSize: 11.5, color: st.current ? '#F59E0B' : '#98A0AE' }}>
                                            {st.done ? 'Completed' : st.current ? 'In progress' : 'Pending'}
                                        </Typography>
                                    </Box>
                                    {st.done
                                        ? <CheckCircleRoundedIcon sx={{ fontSize: 21, color: PRIMARY }} />
                                        : <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 21, color: '#CBD2DD' }} />}
                                </Stack>
                            ))}
                        </Stack>
                    </Box>
                </Grid>

                {/* Quick actions */}
                <Grid size={{ xs: 12, lg: 7 }}>
                    <Box sx={{ ...card, ...enter(8), p: 3, height: '100%' }}>
                        <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#0F172A', mb: 2 }}>Quick actions</Typography>
                        <Grid container spacing={1.5}>
                            {MODULES.map((m) => (
                                <Grid size={{ xs: 12, sm: 6 }} key={m.text}>
                                    <Stack
                                        direction="row"
                                        spacing={1.8}
                                        onClick={() => navigate(m.path)}
                                        sx={{
                                            alignItems: 'center',
                                            p: 2, borderRadius: '7px', border: '1px solid #EDEFF4', cursor: 'pointer',
                                            transition: 'border-color .18s, background-color .18s, transform .18s',
                                            '&:hover': { borderColor: m.color, bgcolor: m.bg, transform: 'translateY(-2px)' },
                                        }}
                                    >
                                        <Box sx={{ width: 44, height: 44, borderRadius: '7px', bgcolor: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <m.icon sx={{ fontSize: 22, color: m.color }} />
                                        </Box>
                                        <Box sx={{ flexGrow: 1 }}>
                                            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{m.text}</Typography>
                                            <Typography sx={{ fontSize: 11.5, color: '#98A0AE' }}>{m.desc}</Typography>
                                        </Box>
                                        <ArrowForwardRoundedIcon sx={{ fontSize: 18, color: '#CBD2DD' }} />
                                    </Stack>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
}
