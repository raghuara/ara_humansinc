import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Grid, Button, Avatar, Chip, Stack, Tooltip, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Autocomplete,
    InputAdornment, Snackbar, Alert, LinearProgress,
} from '@mui/material';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PhoneIphoneRoundedIcon from '@mui/icons-material/PhoneIphoneRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import EventRepeatRoundedIcon from '@mui/icons-material/EventRepeatRounded';
import { useSelector, useDispatch } from 'react-redux';
import { selectEmployees } from '../redux/slices/employeesSlice';
import {
    selectAdvances, selectAdvanceRequests, advanceMonths,
    giveAdvance, approveRequest, rejectRequest, recordRecovery, cancelAdvance,
} from '../redux/slices/advancesSlice';
import { PRIMARY, PRIMARY_LIGHT, PRIMARY_DARK, PRIMARY_BORDER } from '../theme';
import { inr, fmtDate, initialsFromName as initials, paletteColor as colorFor } from '../utils/format';

const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
const solidBtn = { bgcolor: PRIMARY, color: '#fff', fontWeight: 700, borderRadius: '7px', boxShadow: 'none', textTransform: 'none', '&:hover': { bgcolor: PRIMARY_DARK, boxShadow: 'none' } };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtMonth = (ym) => { if (!ym) return '—'; const [y, m] = ym.split('-'); return `${MONTHS[+m - 1]} ${y}`; };
const addMonths = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const thisMonth = () => new Date().toISOString().slice(0, 7);

const QUICK = [5000, 10000, 15000, 20000];

const EMPTY_FORM = { employeeId: '', employeeName: '', department: '', amount: '', reason: '', plan: 'installment', monthlyAmount: '', startMonth: thisMonth() };

export default function SalaryAdvancesPage() {
    const dispatch = useDispatch();
    const advances = useSelector(selectAdvances);
    const requests = useSelector(selectAdvanceRequests);
    const employees = useSelector(selectEmployees);

    const [snack, setSnack] = useState('');
    const [dialog, setDialog] = useState(null);   // { mode: 'give' | 'approve', requestId? }
    const [form, setForm] = useState(EMPTY_FORM);
    const [tried, setTried] = useState(false);

    const stats = useMemo(() => {
        const active = advances.filter((a) => a.status === 'active');
        const totalAdvanced = advances.reduce((s, a) => s + a.amount, 0);
        const outstanding = active.reduce((s, a) => s + (a.amount - a.recovered), 0);
        return { totalAdvanced, outstanding, active: active.length, requests: requests.length };
    }, [advances, requests]);

    const KPIS = [
        { label: 'Total Advanced', value: inr(stats.totalAdvanced), sub: 'All-time granted', icon: AccountBalanceWalletRoundedIcon, color: PRIMARY, bg: PRIMARY_LIGHT },
        { label: 'Outstanding', value: inr(stats.outstanding), sub: 'Yet to recover', icon: SavingsRoundedIcon, color: '#F59E0B', bg: '#FFF7ED' },
        { label: 'Active Advances', value: stats.active, sub: 'Under recovery', icon: TrendingUpRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE' },
        { label: 'Pending Requests', value: stats.requests, sub: 'From mobile app', icon: PendingActionsRoundedIcon, color: '#E11D48', bg: '#FEE2E2' },
    ];

    // ── Dialog helpers ──────────────────────────────────────────────────────
    const openGive = () => { setForm({ ...EMPTY_FORM, startMonth: thisMonth() }); setTried(false); setDialog({ mode: 'give' }); };
    const openApprove = (req) => {
        setForm({ employeeId: req.employeeId, employeeName: req.employeeName, department: req.department, amount: String(req.amount), reason: req.reason, plan: 'installment', monthlyAmount: '', startMonth: thisMonth() });
        setTried(false);
        setDialog({ mode: 'approve', requestId: req.id });
    };
    const closeDialog = () => setDialog(null);

    const amountNum = Number(form.amount) || 0;
    const monthlyNum = form.plan === 'onetime' ? amountNum : (Number(form.monthlyAmount) || 0);
    const months = form.plan === 'onetime' ? 1 : (monthlyNum > 0 ? Math.ceil(amountNum / monthlyNum) : 0);
    const endMonth = months > 0 ? addMonths(form.startMonth, months - 1) : form.startMonth;

    const formValid = amountNum > 0
        && (dialog?.mode === 'approve' || form.employeeId)
        && form.startMonth
        && (form.plan === 'onetime' || (monthlyNum > 0 && monthlyNum <= amountNum));

    const submit = () => {
        setTried(true);
        if (!formValid) { setSnack('Please complete the highlighted fields.'); return; }
        if (dialog.mode === 'give') {
            dispatch(giveAdvance({
                employeeId: form.employeeId, employeeName: form.employeeName, department: form.department,
                amount: amountNum, reason: form.reason || 'Salary advance',
                plan: form.plan, monthlyAmount: form.plan === 'onetime' ? amountNum : monthlyNum, startMonth: form.startMonth,
            }));
            setSnack(`Advance of ${inr(amountNum)} granted to ${form.employeeName}.`);
        } else {
            dispatch(approveRequest({ requestId: dialog.requestId, plan: form.plan, monthlyAmount: monthlyNum, startMonth: form.startMonth }));
            setSnack(`Request approved — recovery starts ${fmtMonth(form.startMonth)}.`);
        }
        closeDialog();
    };

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    return (
        <Box sx={{ p: 2 }}>
            {/* Header */}
            <Box sx={{ pb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexWrap: 'wrap', gap: 1.5 }}>
                <Box>
                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>Salary Advances</Typography>
                    <Typography sx={{ fontSize: 13, color: '#6B7280', mt: 0.3 }}>Grant advances and recover them from monthly salary</Typography>
                </Box>
                <Button startIcon={<AddRoundedIcon />} onClick={openGive} sx={{ ...solidBtn, height: 42, px: 2.2 }}>Give Advance</Button>
            </Box>

            {/* KPI cards */}
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                {KPIS.map((k) => (
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={k.label}>
                        <Box sx={{ ...card, p: 2.5, bgcolor: k.bg, border: `1px solid ${k.color}22`, height: '100%' }}>
                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: k.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</Typography>
                                    <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#0F172A', mt: 0.5 }}>{k.value}</Typography>
                                    <Typography sx={{ fontSize: 10.5, color: '#6B7280', mt: 0.2 }}>{k.sub}</Typography>
                                </Box>
                                <Box sx={{ width: 44, height: 44, borderRadius: '7px', bgcolor: '#fff', boxShadow: '0 1px 3px rgba(16,24,40,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <k.icon sx={{ color: k.color, fontSize: 22 }} />
                                </Box>
                            </Stack>
                        </Box>
                    </Grid>
                ))}
            </Grid>

            {/* Approval requests (from mobile app) */}
            <Box sx={{ ...card, p: 0, overflow: 'hidden', mb: 1.5 }}>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1.2, p: 2.5, bgcolor: '#F7F6FD', borderBottom: '1px solid #EAE7F7' }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: '#fff', boxShadow: '0 1px 4px rgba(16,24,40,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <PhoneIphoneRoundedIcon sx={{ color: PRIMARY, fontSize: 18 }} />
                    </Box>
                    <Typography sx={{ fontSize: 15.5, fontWeight: 800, color: '#0F172A' }}>Advance Requests</Typography>
                    <Chip label={`${requests.length} pending`} size="small" sx={{ bgcolor: '#FEE2E2', color: '#E11D48', fontWeight: 700, fontSize: 11.5 }} />
                    <Typography sx={{ fontSize: 11.5, color: '#98A0AE', ml: 'auto', display: { xs: 'none', sm: 'block' } }}>Raised by employees from the mobile app</Typography>
                </Stack>

                {requests.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 5 }}>
                        <CheckRoundedIcon sx={{ fontSize: 32, color: '#CBD2DD' }} />
                        <Typography sx={{ fontSize: 13.5, color: '#98A0AE', mt: 0.5 }}>No pending requests — you're all caught up.</Typography>
                    </Box>
                ) : (
                    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                        {requests.map((r) => (
                            <Box key={r.id} sx={{ border: '1px solid #EEF0F6', borderRadius: '9px', p: 1.8, display: 'flex', alignItems: 'center', gap: 1.6, flexWrap: 'wrap' }}>
                                <Avatar sx={{ width: 40, height: 40, bgcolor: colorFor(r.employeeName), fontSize: 14, fontWeight: 700 }}>{initials(r.employeeName)}</Avatar>
                                <Box sx={{ minWidth: 160 }}>
                                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{r.employeeName}</Typography>
                                    <Typography sx={{ fontSize: 11.5, color: '#98A0AE' }}>{r.employeeId} · {r.department}</Typography>
                                </Box>
                                <Box sx={{ minWidth: 110 }}>
                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#98A0AE', textTransform: 'uppercase', letterSpacing: 0.5 }}>Requested</Typography>
                                    <Typography sx={{ fontSize: 16, fontWeight: 800, color: PRIMARY_DARK }}>{inr(r.amount)}</Typography>
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 160 }}>
                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#98A0AE', textTransform: 'uppercase', letterSpacing: 0.5 }}>Reason</Typography>
                                    <Typography sx={{ fontSize: 12.5, color: '#475569' }}>{r.reason}</Typography>
                                    <Typography sx={{ fontSize: 11, color: '#98A0AE', mt: 0.2 }}>Requested {fmtDate(r.requestedOn)}</Typography>
                                </Box>
                                <Stack direction="row" spacing={1}>
                                    <Button onClick={() => openApprove(r)} startIcon={<CheckRoundedIcon />} sx={{ ...solidBtn, height: 36, px: 1.8, fontSize: 12.5, bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' } }}>Approve</Button>
                                    <Button onClick={() => { dispatch(rejectRequest(r.id)); setSnack('Request rejected.'); }} startIcon={<CloseRoundedIcon />}
                                        sx={{ height: 36, px: 1.6, fontSize: 12.5, fontWeight: 700, textTransform: 'none', borderRadius: '7px', color: '#E11D48', border: '1px solid #FBCFE8', bgcolor: '#fff', '&:hover': { bgcolor: '#FEF2F2' } }}>Reject</Button>
                                </Stack>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>

            {/* Active advances */}
            <Box sx={{ ...card, p: 0, overflow: 'hidden' }}>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1.2, p: 2.5, bgcolor: '#F7F6FD', borderBottom: '1px solid #EAE7F7' }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: '#fff', boxShadow: '0 1px 4px rgba(16,24,40,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AccountBalanceWalletRoundedIcon sx={{ color: PRIMARY, fontSize: 18 }} />
                    </Box>
                    <Typography sx={{ fontSize: 15.5, fontWeight: 800, color: '#0F172A' }}>Active & Recovering</Typography>
                    <Chip label={`${advances.length} advances`} size="small" sx={{ bgcolor: PRIMARY_LIGHT, color: PRIMARY, fontWeight: 700, fontSize: 11.5 }} />
                </Stack>
                <Box sx={{ overflowX: 'auto' }}>
                    <Box component="table" sx={{ width: '100%', minWidth: 940, borderCollapse: 'collapse' }}>
                        <Box component="thead" sx={{ bgcolor: '#F4F3FB' }}>
                            <Box component="tr">
                                {['EMPLOYEE', 'ADVANCE', 'DEDUCTION PLAN', 'RECOVERY', 'STATUS', 'ACTIONS'].map((h) => (
                                    <Box component="th" key={h} sx={{ textAlign: h === 'ACTIONS' ? 'right' : 'left', px: 2.5, py: 1.6, fontSize: 10.5, fontWeight: 700, color: '#6E6B99', letterSpacing: 0.6, borderBottom: '1px solid #E8E6F3', whiteSpace: 'nowrap' }}>{h}</Box>
                                ))}
                            </Box>
                        </Box>
                        <Box component="tbody">
                            {advances.map((a, idx) => {
                                const outstanding = a.amount - a.recovered;
                                const pct = Math.round((a.recovered / a.amount) * 100);
                                const done = a.status === 'completed';
                                const totalMonths = advanceMonths(a);
                                return (
                                    <Box component="tr" key={a.id} sx={{ bgcolor: idx % 2 ? '#FBFAFE' : '#fff' }}>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' }}>
                                            <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
                                                <Avatar sx={{ width: 36, height: 36, bgcolor: colorFor(a.employeeName), fontSize: 13, fontWeight: 700 }}>{initials(a.employeeName)}</Avatar>
                                                <Box>
                                                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{a.employeeName}</Typography>
                                                    <Typography sx={{ fontSize: 11.5, color: '#98A0AE' }}>{a.employeeId} · {a.department}</Typography>
                                                </Box>
                                            </Stack>
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' }}>
                                            <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{inr(a.amount)}</Typography>
                                            <Typography sx={{ fontSize: 11, color: '#98A0AE' }}>Granted {fmtDate(a.grantedOn)}</Typography>
                                            {a.source === 'request' && <Chip label="via app" size="small" sx={{ height: 17, fontSize: 9.5, fontWeight: 700, mt: 0.3, bgcolor: PRIMARY_LIGHT, color: PRIMARY }} />}
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' }}>
                                            {a.plan === 'onetime' ? (
                                                <Chip icon={<PaymentsRoundedIcon sx={{ fontSize: 15 }} />} label={`One-time · ${fmtMonth(a.startMonth)}`} size="small" sx={{ bgcolor: '#FFF7ED', color: '#B45309', fontWeight: 700, fontSize: 11.5 }} />
                                            ) : (
                                                <>
                                                    <Chip icon={<EventRepeatRoundedIcon sx={{ fontSize: 15 }} />} label={`${inr(a.monthlyAmount)}/mo × ${totalMonths}`} size="small" sx={{ bgcolor: '#E0F2FE', color: '#0369A1', fontWeight: 700, fontSize: 11.5 }} />
                                                    <Typography sx={{ fontSize: 10.5, color: '#98A0AE', mt: 0.4 }}>{fmtMonth(a.startMonth)} → {fmtMonth(addMonths(a.startMonth, totalMonths - 1))}</Typography>
                                                </>
                                            )}
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6', minWidth: 180 }}>
                                            <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography sx={{ fontSize: 11.5, color: '#16A34A', fontWeight: 700 }}>{inr(a.recovered)} recovered</Typography>
                                                <Typography sx={{ fontSize: 11.5, color: '#E11D48', fontWeight: 700 }}>{inr(outstanding)} left</Typography>
                                            </Stack>
                                            <LinearProgress variant="determinate" value={pct} sx={{ height: 7, borderRadius: 5, bgcolor: '#EEF0F6', '& .MuiLinearProgress-bar': { bgcolor: done ? '#16A34A' : PRIMARY, borderRadius: 5 } }} />
                                            <Typography sx={{ fontSize: 10, color: '#98A0AE', mt: 0.3 }}>{pct}% complete</Typography>
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' }}>
                                            <Chip label={done ? 'Completed' : 'Active'} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: done ? '#DCFCE7' : '#F1EEFE', color: done ? '#16A34A' : PRIMARY }} />
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            {!done && (
                                                <Tooltip arrow title="Record this month's deduction">
                                                    <Button onClick={() => dispatch(recordRecovery(a.id))} size="small" sx={{ height: 30, px: 1.4, fontSize: 11.5, fontWeight: 700, textTransform: 'none', borderRadius: '7px', color: PRIMARY, bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`, '&:hover': { bgcolor: '#E7DFFC' } }}>Record deduction</Button>
                                                </Tooltip>
                                            )}
                                            <Tooltip arrow title="Remove advance">
                                                <IconButton onClick={() => dispatch(cancelAdvance(a.id))} size="small" sx={{ ml: 0.8, color: '#98A0AE', '&:hover': { color: '#E11D48', bgcolor: '#FEF2F2' } }}><CloseRoundedIcon sx={{ fontSize: 17 }} /></IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                    {advances.length === 0 && (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                            <AccountBalanceWalletRoundedIcon sx={{ fontSize: 34, color: '#CBD2DD' }} />
                            <Typography sx={{ fontSize: 14, color: '#98A0AE', mt: 1 }}>No advances yet. Grant one with "Give Advance".</Typography>
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Give / Approve dialog */}
            <Dialog open={Boolean(dialog)} onClose={closeDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
                        {dialog?.mode === 'approve' ? 'Approve Advance Request' : 'Give Salary Advance'}
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>
                        {dialog?.mode === 'approve' ? 'Set how this advance will be recovered from salary.' : 'Choose an amount and how it will be deducted from monthly salary.'}
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    {/* Employee */}
                    {dialog?.mode === 'approve' ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, p: 1.5, borderRadius: '9px', bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`, mb: 2 }}>
                            <Avatar sx={{ width: 38, height: 38, bgcolor: colorFor(form.employeeName), fontSize: 13, fontWeight: 700 }}>{initials(form.employeeName)}</Avatar>
                            <Box>
                                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{form.employeeName}</Typography>
                                <Typography sx={{ fontSize: 11.5, color: PRIMARY_DARK }}>{form.employeeId} · {form.department} · requested {inr(amountNum)}</Typography>
                            </Box>
                        </Box>
                    ) : (
                        <Autocomplete
                            options={employees}
                            getOptionLabel={(o) => `${o.firstName} ${o.lastName} (${o.employeeId})`}
                            onChange={(_, v) => setForm((f) => ({ ...f, employeeId: v?.employeeId || '', employeeName: v ? `${v.firstName} ${v.lastName}` : '', department: v?.department || '' }))}
                            renderInput={(params) => <TextField {...params} label="Employee" size="small" error={tried && !form.employeeId} sx={{ mb: 2 }} />}
                        />
                    )}

                    {/* Amount */}
                    <TextField
                        label="Advance amount" type="number" size="small" fullWidth value={form.amount}
                        onChange={set('amount')} error={tried && amountNum <= 0} disabled={dialog?.mode === 'approve'}
                        InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                        sx={{ mb: 2 }}
                    />

                    {/* Deduction plan selector */}
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#374151', mb: 1 }}>Deduction plan</Typography>
                    <Stack direction="row" spacing={1.2} sx={{ mb: 2 }}>
                        {[
                            { key: 'installment', label: 'Monthly instalment', desc: 'A fixed amount every month', icon: EventRepeatRoundedIcon },
                            { key: 'onetime', label: 'One-time', desc: 'Full amount in one month', icon: PaymentsRoundedIcon },
                        ].map((opt) => {
                            const sel = form.plan === opt.key;
                            return (
                                <Box key={opt.key} onClick={() => setForm((f) => ({ ...f, plan: opt.key }))}
                                    sx={{ flex: 1, cursor: 'pointer', p: 1.5, borderRadius: '9px', border: `1.5px solid ${sel ? PRIMARY : '#E5E7EB'}`, bgcolor: sel ? PRIMARY_LIGHT : '#fff', transition: '0.15s' }}>
                                    <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', mb: 0.3 }}>
                                        <opt.icon sx={{ fontSize: 18, color: sel ? PRIMARY : '#94A3B8' }} />
                                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: sel ? PRIMARY_DARK : '#374151' }}>{opt.label}</Typography>
                                    </Stack>
                                    <Typography sx={{ fontSize: 11, color: '#6B7280' }}>{opt.desc}</Typography>
                                </Box>
                            );
                        })}
                    </Stack>

                    {/* Instalment amount */}
                    {form.plan === 'installment' && (
                        <Box sx={{ mb: 2 }}>
                            <TextField
                                label="Deduct per month" type="number" size="small" fullWidth value={form.monthlyAmount}
                                onChange={set('monthlyAmount')} error={tried && !(monthlyNum > 0 && monthlyNum <= amountNum)}
                                helperText={tried && monthlyNum > amountNum ? 'Monthly amount cannot exceed the advance.' : ' '}
                                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                            />
                            <Stack direction="row" spacing={0.8} sx={{ mt: 0.2, flexWrap: 'wrap', gap: 0.8 }}>
                                {QUICK.filter((q) => q <= (amountNum || Infinity)).map((q) => (
                                    <Chip key={q} label={inr(q)} size="small" onClick={() => setForm((f) => ({ ...f, monthlyAmount: String(q) }))}
                                        sx={{ cursor: 'pointer', fontWeight: 700, fontSize: 11.5, bgcolor: Number(form.monthlyAmount) === q ? PRIMARY : '#F1F5F9', color: Number(form.monthlyAmount) === q ? '#fff' : '#475569', '&:hover': { bgcolor: Number(form.monthlyAmount) === q ? PRIMARY_DARK : '#E2E8F0' } }} />
                                ))}
                            </Stack>
                        </Box>
                    )}

                    {/* Start month */}
                    <TextField
                        label="Start from month" type="month" size="small" fullWidth value={form.startMonth}
                        onChange={set('startMonth')} error={tried && !form.startMonth}
                        InputLabelProps={{ shrink: true }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonthRoundedIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
                        sx={{ mb: 2 }}
                    />

                    {dialog?.mode === 'give' && (
                        <TextField label="Reason (optional)" size="small" fullWidth value={form.reason} onChange={set('reason')} sx={{ mb: 1 }} />
                    )}

                    {/* Live preview */}
                    {amountNum > 0 && (form.plan === 'onetime' || monthlyNum > 0) && (
                        <Box sx={{ p: 1.6, borderRadius: '9px', bgcolor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.4 }}>Recovery preview</Typography>
                            {form.plan === 'onetime' ? (
                                <Typography sx={{ fontSize: 12.5, color: '#166534' }}>
                                    Full <strong>{inr(amountNum)}</strong> deducted from <strong>{fmtMonth(form.startMonth)}</strong> salary.
                                </Typography>
                            ) : (
                                <Typography sx={{ fontSize: 12.5, color: '#166534' }}>
                                    <strong>{inr(amountNum)}</strong> recovered over <strong>{months} month{months > 1 ? 's' : ''}</strong> — {inr(monthlyNum)}/month from <strong>{fmtMonth(form.startMonth)}</strong> to <strong>{fmtMonth(endMonth)}</strong>
                                    {amountNum % monthlyNum !== 0 ? ` (last month ${inr(amountNum - monthlyNum * (months - 1))}).` : '.'}
                                </Typography>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={closeDialog} sx={{ textTransform: 'none', fontWeight: 700, color: '#64748B', borderRadius: '7px' }}>Cancel</Button>
                    <Button onClick={submit} sx={{ ...solidBtn, height: 40, px: 2.4, ...(dialog?.mode === 'approve' && { bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' } }) }}>
                        {dialog?.mode === 'approve' ? 'Approve & Schedule' : 'Grant Advance'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={Boolean(snack)} autoHideDuration={3200} onClose={() => setSnack('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack('')} severity="success" variant="filled" sx={{ borderRadius: '7px' }}>{snack}</Alert>
            </Snackbar>
        </Box>
    );
}
