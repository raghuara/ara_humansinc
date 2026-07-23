import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, Typography, Grid, Button, Avatar, Chip, Stack, Tooltip, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
    InputAdornment, Snackbar, Alert, LinearProgress, CircularProgress, Divider,
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
    giveAdvance, recordRecovery, cancelAdvance,
} from '../redux/slices/advancesSlice';
import { PRIMARY, PRIMARY_LIGHT, PRIMARY_DARK, PRIMARY_BORDER } from '../theme';
import { inr, fmtDate, initialsFromName as initials, paletteColor as colorFor } from '../utils/format';
import http, { apiErrorMessage } from '../Api/http';
import { GetSalaryAdvancesDashboard, UpdateAdvanceRequestAction } from '../Api/Api';

const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
const solidBtn = { bgcolor: PRIMARY, color: '#fff', fontWeight: 700, borderRadius: '7px', boxShadow: 'none', textTransform: 'none', '&:hover': { bgcolor: PRIMARY_DARK, boxShadow: 'none' } };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtMonth = (ym) => { if (!ym) return '—'; const [y, m] = ym.split('-'); return `${MONTHS[+m - 1]} ${y}`; };
const addMonths = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const thisMonth = () => new Date().toISOString().slice(0, 7);

const QUICK_MONTHS = [3, 6, 9, 12];
const MAX_MONTHS = 12;

// Recovery can only begin next month, and no later than three months out —
// the current month's payroll is already in flight, and an open-ended start
// date would let an advance sit unrecovered indefinitely.
const START_MONTH_OFFSETS = [1, 2, 3];
const startMonthChoices = () => START_MONTH_OFFSETS.map((n) => addMonths(thisMonth(), n));
const defaultStartMonth = () => startMonthChoices()[0];

const EMPTY_FORM = { employeeId: '', employeeName: '', department: '', amount: '', reason: '', plan: 'installment', months: '', startMonth: defaultStartMonth() };

// Canned rejection reasons. The employee reads this text verbatim in the app,
// so each one says why it was refused AND what to do next — a bare "rejected"
// only produces a duplicate request the following day. All are editable after
// being inserted.
const REJECT_TEMPLATES = [
    { label: 'Amount too high', text: 'The requested amount is higher than what can be approved against your current salary. Please raise a fresh request for a lower amount.' },
    { label: 'Advance already running', text: 'An earlier salary advance is still being recovered. Please re-apply once the outstanding balance has been fully cleared.' },
    { label: 'Recovery too long', text: 'The recovery period requested is longer than what is permitted. Please re-apply with a shorter instalment plan.' },
    { label: 'Instalment too high', text: 'The monthly deduction on this plan would leave your take-home salary below the permitted minimum. Please re-apply spreading the recovery over more months.' },
    { label: 'Not enough detail', text: 'The reason given is not sufficient to assess this request. Please re-apply with the purpose of the advance clearly stated.' },
    { label: 'Not eligible yet', text: 'You have not yet completed the minimum service period required to be eligible for a salary advance.' },
    { label: 'Cut-off passed', text: "This month's payroll cut-off has already passed, so the advance cannot be scheduled. Please raise the request again in the next cycle." },
];

const DetailRow = ({ label, children }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, py: 1.2 }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#98A0AE', textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0, pt: 0.4 }}>{label}</Typography>
        <Box sx={{ textAlign: 'right', minWidth: 0 }}>{children}</Box>
    </Box>
);

export default function SalaryAdvancesPage() {
    const dispatch = useDispatch();
    const employees = useSelector(selectEmployees);
    const auth = useSelector((state) => state.auth);

    // The signed-in employee raises the request for themselves, so there is no
    // employee picker. PostLogin may expose the code as `employeeCode` or, on
    // older sessions, `rollNumber` — same fallback chain ApplyLeavePage uses.
    const me = useMemo(() => {
        const code = auth?.user?.employeeCode || auth?.employeeCode || auth?.rollNumber || '';
        const record = code ? employees.find((e) => e.employeeId === code) : null;
        return {
            employeeId: code,
            employeeName: record ? `${record.firstName} ${record.lastName}` : (auth?.user?.name || auth?.userName || ''),
            department: record?.department || auth?.user?.department || '',
        };
    }, [auth, employees]);

    const [snack, setSnack] = useState(null);       // { msg, sev }
    const [dialog, setDialog] = useState(null);     // { mode: 'give' } | { mode: 'approve', req }
    const [reject, setReject] = useState(null);     // the request being rejected
    const [rejectReason, setRejectReason] = useState('');
    const [acting, setActing] = useState(false);    // approve/reject call in flight
    const [form, setForm] = useState(EMPTY_FORM);
    const [tried, setTried] = useState(false);

    const notify = (msg, sev = 'success') => setSnack({ msg, sev });

    const [dashboardData, setDashboardData] = useState({
        totalAdvanced: 0,
        outstanding: 0,
        activeAdvances: 0,
        pendingRequests: 0,
        advanceRequests: [],
        activeRecovering: [],
    });

    const [loading, setLoading] = useState(false);



    const stats = useMemo(() => ({
        totalAdvanced: dashboardData.totalAdvanced,
        outstanding: dashboardData.outstanding,
        active: dashboardData.activeAdvances,
        requests: dashboardData.pendingRequests,
    }), [dashboardData]);

    const KPIS = [
        { label: 'Total Advanced', value: inr(stats.totalAdvanced), sub: 'All-time granted', icon: AccountBalanceWalletRoundedIcon, color: PRIMARY, bg: PRIMARY_LIGHT },
        { label: 'Outstanding', value: inr(stats.outstanding), sub: 'Yet to recover', icon: SavingsRoundedIcon, color: '#F59E0B', bg: '#FFF7ED' },
        { label: 'Active Advances', value: stats.active, sub: 'Under recovery', icon: TrendingUpRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE' },
        { label: 'Pending Requests', value: stats.requests, sub: 'From mobile app', icon: PendingActionsRoundedIcon, color: '#E11D48', bg: '#FEE2E2' },
    ];

    // ── Dialog helpers ──────────────────────────────────────────────────────
    const openGive = () => { setForm({ ...EMPTY_FORM, startMonth: defaultStartMonth() }); setTried(false); setDialog({ mode: 'give' }); };

    // Review only — the endpoint takes no recovery plan, so there is nothing on
    // this request the approver can change.
    const openApprove = (req) => setDialog({ mode: 'approve', req });

    const openReject = (req) => { setRejectReason(''); setReject(req); };

    const closeDialog = () => { if (!acting) setDialog(null); };

    // One call serves both verdicts. `Reason` rides along on a reject only.
    const runAction = async (req, action, reason = '') => {
        if (!req) return;
        setActing(true);
        try {
            const payload = { RequestId: req.id, Action: action };
            if (action === 'reject') payload.Reason = reason.trim();

            const { data: body } = await http.put(UpdateAdvanceRequestAction, payload);
            if (body?.error) throw new Error(body.message || `Could not ${action} this request.`);

            setReject(null);
            setDialog(null);
            notify(body?.message || (action === 'approve'
                ? `Advance of ${inr(Number(req.amount) || 0)} approved for ${req.employeeName}.`
                : `Request from ${req.employeeName} rejected.`));
            // The verdict moves the request out of the pending list and shifts
            // the KPIs, so the dashboard is re-read rather than patched.
            await getSalaryAdvancesDashboard();
        } catch (err) {
            notify(apiErrorMessage(err, `Could not ${action} this request.`), 'error');
        } finally {
            setActing(false);
        }
    };

    const amountNum = Number(form.amount) || 0;
    const months = form.plan === 'onetime' ? 1 : (Number(form.months) || 0);
    const monthlyNum = form.plan === 'onetime'
        ? amountNum
        : (months > 0 && amountNum > 0 ? Math.ceil(amountNum / months) : 0);
    const endMonth = months > 0 ? addMonths(form.startMonth, months - 1) : form.startMonth;
    // Last instalment absorbs the rounding remainder so the total matches the advance exactly.
    const lastMonthNum = months > 0 ? amountNum - monthlyNum * (months - 1) : 0;

    // Recomputed per render so a dialog left open across a month boundary can't
    // submit a start month that has since become the current one.
    const monthChoices = startMonthChoices();
    const knowsRequester = Boolean(me.employeeId || me.employeeName);

    // ── The request under review (read-only) ────────────────────────────────
    // `installments` is preferred over dividing, so the count shown is the one
    // the employee actually chose rather than one re-derived from a rounded
    // per-month figure.
    const review = dialog?.mode === 'approve' ? dialog.req : null;
    const reviewAmount = Number(review?.amount) || 0;
    const reviewPerMonth = Number(review?.deductPerMonth) || 0;
    const reviewOneTime = String(review?.recoveryPlan || '').toLowerCase() !== 'monthly';
    const reviewMonths = Number(review?.installments)
        || (reviewPerMonth > 0 ? Math.ceil(reviewAmount / reviewPerMonth) : 0);

    const formValid = amountNum > 0
        && knowsRequester
        && monthChoices.includes(form.startMonth)
        && (form.plan === 'onetime' || (months >= 1 && months <= MAX_MONTHS));

    const submit = () => {
        setTried(true);
        if (!formValid) { notify('Please complete the highlighted fields.', 'warning'); return; }
        dispatch(giveAdvance({
            employeeId: me.employeeId, employeeName: me.employeeName, department: me.department,
            amount: amountNum, reason: form.reason || 'Salary advance',
            plan: form.plan, monthlyAmount: monthlyNum, installments: months, startMonth: form.startMonth,
        }));
        notify(`Advance of ${inr(amountNum)} requested — starts ${fmtMonth(form.startMonth)}.`);
        closeDialog();
    };

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    // Digits only, 1–12. Anything else leaves the field untouched.
    const setMonths = (e) => {
        const digits = e.target.value.replace(/\D/g, '');
        if (digits === '') { setForm((f) => ({ ...f, months: '' })); return; }
        const n = Number(digits);
        if (n < 1 || n > MAX_MONTHS) return;
        setForm((f) => ({ ...f, months: String(n) }));
    };


    useEffect(() => {
        getSalaryAdvancesDashboard();
    }, []);


    const getSalaryAdvancesDashboard = async () => {
        try {
            setLoading(true);

            const res = await http.get(GetSalaryAdvancesDashboard);

            if (res.data && !res.data.error) {
                const d = res.data.data || {};
                setDashboardData({
                    totalAdvanced: d.totalAdvanced ?? 0,
                    outstanding: d.outstanding ?? 0,
                    activeAdvances: d.activeAdvances ?? 0,
                    pendingRequests: d.pendingRequests ?? 0,
                    advanceRequests: Array.isArray(d.advanceRequests) ? d.advanceRequests : [],
                    activeRecovering: Array.isArray(d.activeRecovering) ? d.activeRecovering : [],
                });
            }
        } catch (error) {
            console.error("Dashboard API Error:", error);
        } finally {
            setLoading(false);
        }
    };
    
    if (loading) {
        return (
            <Box
                sx={{
                    height: "70vh",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <LinearProgress sx={{ width: 300 }} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            {/* Header */}
            <Box sx={{ pb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexWrap: 'wrap', gap: 1.5 }}>
                <Box>
                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>Salary Advances</Typography>
                    <Typography sx={{ fontSize: 13, color: '#6B7280', mt: 0.3 }}>Request advances and recover them from monthly salary</Typography>
                </Box>
                <Button startIcon={<AddRoundedIcon />} onClick={openGive} sx={{ ...solidBtn, height: 42, px: 2.2 }}>Request Advance</Button>
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
                    <Chip label={`${dashboardData.advanceRequests.length} pending`} size="small" sx={{ bgcolor: '#FEE2E2', color: '#E11D48', fontWeight: 700, fontSize: 11.5 }} />
                    <Typography sx={{ fontSize: 11.5, color: '#98A0AE', ml: 'auto', display: { xs: 'none', sm: 'block' } }}>Raised by employees from the mobile app</Typography>
                </Stack>

                {dashboardData.advanceRequests.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 5 }}>
                        <CheckRoundedIcon sx={{ fontSize: 32, color: '#CBD2DD' }} />
                        <Typography sx={{ fontSize: 13.5, color: '#98A0AE', mt: 0.5 }}>No pending requests — you're all caught up.</Typography>
                    </Box>
                ) : (
                    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                        {dashboardData.advanceRequests.map((r) => (
                            <Box key={r.id} sx={{ border: '1px solid #EEF0F6', borderRadius: '9px', p: 1.8, display: 'flex', alignItems: 'center', gap: 1.6, flexWrap: 'wrap' }}>
                                <Avatar sx={{ width: 40, height: 40, bgcolor: colorFor(r.employeeName), fontSize: 14, fontWeight: 700 }}>{initials(r.employeeName)}</Avatar>
                                <Box sx={{ minWidth: 160 }}>
                                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{r.employeeName}</Typography>
                                    <Typography sx={{ fontSize: 11.5, color: '#98A0AE' }}>{r.employeeCode} · {r.department}</Typography>
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
                                    <Button onClick={() => openApprove(r)} startIcon={<CheckRoundedIcon />} sx={{ ...solidBtn, height: 36, px: 1.8, fontSize: 12.5, bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' } }}>Review</Button>
                                    <Button onClick={() => openReject(r)} startIcon={<CloseRoundedIcon />}
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
                    <Chip label={`${dashboardData.activeRecovering.length} advances`} size="small" sx={{ bgcolor: PRIMARY_LIGHT, color: PRIMARY, fontWeight: 700, fontSize: 11.5 }} />
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
                            {dashboardData.activeRecovering.map((a, idx) => {
                                const recovered = Number(a.recoveredAmount) || 0;
                                const outstanding = a.outstanding ?? (Number(a.amount) - recovered);
                                const pct = a.percentComplete ?? (a.amount ? Math.round((recovered / a.amount) * 100) : 0);
                                const done = String(a.status || '').toLowerCase() === 'completed';
                                return (
                                    <Box component="tr" key={a.id} sx={{ bgcolor: idx % 2 ? '#FBFAFE' : '#fff' }}>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' }}>
                                            <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
                                                <Avatar sx={{ width: 36, height: 36, bgcolor: colorFor(a.employeeName), fontSize: 13, fontWeight: 700 }}>{initials(a.employeeName)}</Avatar>
                                                <Box>
                                                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{a.employeeName}</Typography>
                                                    <Typography sx={{ fontSize: 11.5, color: '#98A0AE' }}>{a.employeeCode} · {a.department}</Typography>
                                                </Box>
                                            </Stack>
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' }}>
                                            <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{inr(a.amount)}</Typography>
                                            <Typography sx={{ fontSize: 11, color: '#98A0AE' }}>Granted {a.grantedOn}</Typography>
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' }}>
                                            <Chip icon={<EventRepeatRoundedIcon sx={{ fontSize: 15 }} />} label={`${inr(a.deductPerMonth)}/mo × ${a.installments}`} size="small" sx={{ bgcolor: '#E0F2FE', color: '#0369A1', fontWeight: 700, fontSize: 11.5 }} />
                                            <Typography sx={{ fontSize: 10.5, color: '#98A0AE', mt: 0.4 }}>{a.startMonth} → {a.endMonth}</Typography>
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6', minWidth: 180 }}>
                                            <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography sx={{ fontSize: 11.5, color: '#16A34A', fontWeight: 700 }}>{inr(recovered)} recovered</Typography>
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
                    {dashboardData.activeRecovering.length === 0 && (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                            <AccountBalanceWalletRoundedIcon sx={{ fontSize: 34, color: '#CBD2DD' }} />
                            <Typography sx={{ fontSize: 14, color: '#98A0AE', mt: 1 }}>No advances yet. Raise one with "Request Advance".</Typography>
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Review dialog — read-only. The action endpoint accepts only a
                verdict, so nothing here is editable by the approver. */}
            <Dialog open={dialog?.mode === 'approve'} onClose={closeDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Approve Advance Request</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>Review what the employee asked for, then approve or reject.</Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    {review && (
                        <>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, p: 1.5, borderRadius: '9px', bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`, mb: 1 }}>
                                <Avatar sx={{ width: 38, height: 38, bgcolor: colorFor(review.employeeName), fontSize: 13, fontWeight: 700 }}>{initials(review.employeeName)}</Avatar>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{review.employeeName}</Typography>
                                    <Typography sx={{ fontSize: 11.5, color: PRIMARY_DARK }}>{[review.employeeCode, review.department].filter(Boolean).join(' · ') || '—'}</Typography>
                                </Box>
                            </Box>

                            <Box sx={{ px: 0.5 }}>
                                <DetailRow label="Amount requested">
                                    <Typography sx={{ fontSize: 19, fontWeight: 800, color: '#0F172A' }}>{inr(reviewAmount)}</Typography>
                                </DetailRow>
                                <Divider />
                                <DetailRow label="Deduction plan">
                                    {reviewOneTime ? (
                                        <>
                                            <Chip icon={<PaymentsRoundedIcon sx={{ fontSize: 15 }} />} label="One-time" size="small" sx={{ bgcolor: '#FFF7ED', color: '#B45309', fontWeight: 700, fontSize: 11.5 }} />
                                            <Typography sx={{ fontSize: 11.5, color: '#98A0AE', mt: 0.4 }}>Full amount from a single month's salary</Typography>
                                        </>
                                    ) : reviewPerMonth > 0 ? (
                                        <>
                                            <Chip icon={<EventRepeatRoundedIcon sx={{ fontSize: 15 }} />} label={`${inr(reviewPerMonth)}/mo × ${reviewMonths}`} size="small" sx={{ bgcolor: '#E0F2FE', color: '#0369A1', fontWeight: 700, fontSize: 11.5 }} />
                                            <Typography sx={{ fontSize: 11.5, color: '#98A0AE', mt: 0.4 }}>Recovered over {reviewMonths} month{reviewMonths === 1 ? '' : 's'}</Typography>
                                        </>
                                    ) : (
                                        <Typography sx={{ fontSize: 12.5, color: '#98A0AE' }}>Not specified</Typography>
                                    )}
                                </DetailRow>
                                <Divider />
                                <DetailRow label="Notes / remarks">
                                    <Typography sx={{ fontSize: 12.5, color: review.reason ? '#475569' : '#98A0AE' }}>{review.reason || 'None given'}</Typography>
                                </DetailRow>
                                <Divider />
                                <DetailRow label="Requested on">
                                    <Typography sx={{ fontSize: 12.5, color: '#475569' }}>{review.requestedOn ? fmtDate(review.requestedOn) : '—'}</Typography>
                                </DetailRow>
                            </Box>
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={closeDialog} disabled={acting} sx={{ textTransform: 'none', fontWeight: 700, color: '#64748B', borderRadius: '7px', mr: 'auto' }}>Cancel</Button>
                    <Button onClick={() => openReject(review)} disabled={acting} startIcon={<CloseRoundedIcon />}
                        sx={{ height: 40, px: 2, fontSize: 13, fontWeight: 700, textTransform: 'none', borderRadius: '7px', color: '#E11D48', border: '1px solid #FBCFE8', bgcolor: '#fff', '&:hover': { bgcolor: '#FEF2F2' } }}>
                        Reject
                    </Button>
                    <Button onClick={() => runAction(review, 'approve')} disabled={acting}
                        startIcon={acting ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : <CheckRoundedIcon />}
                        sx={{ ...solidBtn, height: 40, px: 2.4, bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' } }}>
                        {acting ? 'Approving…' : 'Approve'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Request dialog */}
            <Dialog open={dialog?.mode === 'give'} onClose={closeDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Request Salary Advance</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>Choose an amount and how it will be deducted from monthly salary.</Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    {/* The requester sees themselves — never an editable picker. */}
                    {knowsRequester ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4, p: 1.5, borderRadius: '9px', bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`, mb: 2 }}>
                            <Avatar sx={{ width: 38, height: 38, bgcolor: colorFor(me.employeeName), fontSize: 13, fontWeight: 700 }}>{initials(me.employeeName)}</Avatar>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{me.employeeName || me.employeeId}</Typography>
                                <Typography sx={{ fontSize: 11.5, color: PRIMARY_DARK }}>
                                    {[me.employeeId, me.department].filter(Boolean).join(' · ')}{(me.employeeId || me.department) ? ' · ' : ''}requesting for yourself
                                </Typography>
                            </Box>
                        </Box>
                    ) : (
                        <Alert severity="warning" sx={{ mb: 2, borderRadius: '9px', fontSize: 12.5, py: 0.5 }}>
                            Your employee profile isn't linked to this login, so the request can't be attributed. Please sign in again or contact HR.
                        </Alert>
                    )}

                    {/* Amount */}
                    <TextField
                        label="Advance amount" type="number" size="small" fullWidth value={form.amount}
                        onChange={set('amount')} error={tried && amountNum <= 0}
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

                    {/* Number of months + derived instalment */}
                    {form.plan === 'installment' && (
                        <Box sx={{ mb: 2 }}>
                            <TextField
                                label="Number of months" size="small" fullWidth value={form.months}
                                onChange={setMonths} error={tried && !(months >= 1 && months <= MAX_MONTHS)}
                                helperText={tried && !(months >= 1 && months <= MAX_MONTHS) ? `Enter a number between 1 and ${MAX_MONTHS}.` : ' '}
                                inputProps={{ inputMode: 'numeric', maxLength: 2 }}
                                InputProps={{ startAdornment: <InputAdornment position="start"><EventRepeatRoundedIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
                            />
                            <Stack direction="row" spacing={0.8} sx={{ mt: 0.2, mb: 2, flexWrap: 'wrap', gap: 0.8 }}>
                                {QUICK_MONTHS.map((m) => (
                                    <Chip key={m} label={`${m} months`} size="small" onClick={() => setForm((f) => ({ ...f, months: String(m) }))}
                                        sx={{ cursor: 'pointer', fontWeight: 700, fontSize: 11.5, bgcolor: months === m ? PRIMARY : '#F1F5F9', color: months === m ? '#fff' : '#475569', '&:hover': { bgcolor: months === m ? PRIMARY_DARK : '#E2E8F0' } }} />
                                ))}
                            </Stack>
                            <TextField
                                label="Deduction per month" size="small" fullWidth disabled
                                value={monthlyNum > 0 ? String(monthlyNum) : ''}
                                helperText={months > 0 && amountNum > 0 ? `${inr(amountNum)} ÷ ${months} month${months > 1 ? 's' : ''}` : 'Auto-calculated from the amount and months.'}
                                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                            />
                        </Box>
                    )}

                    {/* Start month — a fixed list, not a free month input: a native
                        picker can be typed into and its min/max is honoured
                        inconsistently across browsers. */}
                    <TextField
                        select label="Start from month" size="small" fullWidth value={form.startMonth}
                        onChange={set('startMonth')} error={tried && !monthChoices.includes(form.startMonth)}
                        helperText={`Recovery can start from ${fmtMonth(monthChoices[0])} up to ${fmtMonth(monthChoices[monthChoices.length - 1])}.`}
                        InputProps={{ startAdornment: <InputAdornment position="start"><CalendarMonthRoundedIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
                        sx={{ mb: 2 }}
                    >
                        {monthChoices.map((m) => (
                            <MenuItem key={m} value={m} sx={{ fontSize: 13.5 }}>{fmtMonth(m)}</MenuItem>
                        ))}
                    </TextField>

                    <TextField label="Notes / Remarks (optional)" size="small" fullWidth multiline minRows={2} value={form.reason} onChange={set('reason')} sx={{ mb: 1 }} />

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
                                    {lastMonthNum !== monthlyNum ? ` (last month ${inr(lastMonthNum)}).` : '.'}
                                </Typography>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={closeDialog} sx={{ textTransform: 'none', fontWeight: 700, color: '#64748B', borderRadius: '7px' }}>Cancel</Button>
                    <Button onClick={submit} sx={{ ...solidBtn, height: 40, px: 2.4 }}>Request Advance</Button>
                </DialogActions>
            </Dialog>

            {/* Reject reason */}
            <Dialog open={Boolean(reject)} onClose={() => { if (!acting) setReject(null); }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Reject Advance Request</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>
                        {reject ? `${reject.employeeName} · ${inr(Number(reject.amount) || 0)}` : ''} — the employee sees this reason, so say what they should do next.
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#374151', mb: 1 }}>Common reasons — tap to use, then edit if needed</Typography>
                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.8, mb: 2 }}>
                        {REJECT_TEMPLATES.map((t) => {
                            const active = rejectReason === t.text;
                            return (
                                <Chip
                                    key={t.label} label={t.label} size="small" onClick={() => setRejectReason(t.text)}
                                    sx={{
                                        cursor: 'pointer', fontWeight: 700, fontSize: 11.5,
                                        bgcolor: active ? PRIMARY : '#F1F5F9', color: active ? '#fff' : '#475569',
                                        '&:hover': { bgcolor: active ? PRIMARY_DARK : '#E2E8F0' },
                                    }}
                                />
                            );
                        })}
                    </Stack>
                    <TextField
                        label="Rejection reason" size="small" fullWidth multiline minRows={3}
                        value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Pick a reason above, or write your own."
                        helperText={`${rejectReason.trim().length}/400`}
                        inputProps={{ maxLength: 400 }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setReject(null)} disabled={acting} sx={{ textTransform: 'none', fontWeight: 700, color: '#64748B', borderRadius: '7px' }}>Cancel</Button>
                    <Button
                        onClick={() => runAction(reject, 'reject', rejectReason)}
                        disabled={acting || !rejectReason.trim()}
                        startIcon={acting ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : <CloseRoundedIcon />}
                        sx={{ ...solidBtn, height: 40, px: 2.4, bgcolor: '#E11D48', '&:hover': { bgcolor: '#BE123C' }, '&.Mui-disabled': { bgcolor: '#FBCFE8', color: '#fff' } }}>
                        {acting ? 'Rejecting…' : 'Reject Request'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={Boolean(snack)} autoHideDuration={3800} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack(null)} severity={snack?.sev || 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack?.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
