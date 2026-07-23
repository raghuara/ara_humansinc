import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Select, MenuItem, Button, Chip, Tooltip, Grid, Stack, CircularProgress,
} from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import http from '../../../Api/http';
import {
    getPayrollCycle, postApprovePayrollCycle, postMarkCreditedPayrollCycle, postRollbackPayrollCycle,
} from '../../../Api/Api';
import SnackBar from '../../SnackBar';

const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
const solidBtn = { bgcolor: PRIMARY, color: '#fff', fontWeight: 700, borderRadius: '7px', boxShadow: `0 2px 6px ${PRIMARY}40`, textTransform: 'none', '&:hover': { bgcolor: '#6246E0' } };

const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// The cycle's four stages, in order. Each maps to a { done, on, by } block on
// the GetCycle response.
const STAGES = [
    { key: 'attendanceLocked', label: 'Attendance Locked', desc: 'Monthly attendance frozen', icon: EventAvailableRoundedIcon },
    { key: 'calculated', label: 'Calculated', desc: 'Gross, deductions & net computed', icon: CalculateRoundedIcon },
    { key: 'approved', label: 'Approved', desc: 'Reviewed & approved', icon: HowToRegRoundedIcon },
    { key: 'credited', label: 'Credited', desc: 'Paid to bank accounts', icon: PaidRoundedIcon },
];

// Build the last 12 payout-month options as { value: 'YYYY-MM', label: 'July 2026' }.
const buildMonths = () => {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        opts.push({
            value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
            isCurrent: i === 0,
        });
    }
    return opts;
};

const prettyStatus = (s) => (s ? String(s).replace(/([a-z])([A-Z])/g, '$1 $2') : '—');

export default function MarkSalaryCreditedPage() {
    const months = useMemo(buildMonths, []);
    const [month, setMonth] = useState(months[0].value); // default: current month
    const [cycle, setCycle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [snack, setSnack] = useState({ open: false, ok: true, msg: '' });
    const showSnack = (msg, ok = true) => setSnack({ open: true, ok, msg });

    // GET /PayrollCycle/GetCycle?payoutMonth=YYYY-MM
    const fetchCycle = useCallback(async () => {
        setLoading(true);
        try {
            const res = await http.get(getPayrollCycle, { params: { payoutMonth: month } });
            if (res.data && !res.data.error) {
                setCycle(res.data.data || null);
            } else {
                setCycle(null);
                showSnack(res.data?.message || 'Failed to load the payroll cycle', false);
            }
        } catch {
            setCycle(null);
            showSnack('Failed to load the payroll cycle', false);
        } finally {
            setLoading(false);
        }
    }, [month]);

    useEffect(() => { fetchCycle(); }, [fetchCycle]);

    const stageState = (key) => cycle?.[key] || { done: false, on: null, by: null };
    // The active stage is the first one not yet done; all done → past the end.
    const activeIdx = (() => {
        const idx = STAGES.findIndex((s) => !stageState(s.key).done);
        return idx === -1 ? STAGES.length : idx;
    })();

    // All stage actions POST { payoutMonth } to their endpoint, then refetch the
    // cycle so the pipeline and totals reflect the new state.
    const payoutMonth = cycle?.payoutMonthRaw || month;
    const runAction = async (url, successMsg) => {
        setActionLoading(true);
        try {
            const res = await http.post(url, { payoutMonth });
            if (res.data && !res.data.error) {
                showSnack(successMsg, true);
                await fetchCycle();
            } else {
                showSnack(res.data?.message || 'Action failed. Please try again.', false);
            }
        } catch {
            showSnack('Action failed. Please try again.', false);
        } finally {
            setActionLoading(false);
        }
    };

    const monthLabel = months.find((m) => m.value === month)?.label || cycle?.payoutMonth || month;

    const totals = [
        { label: 'Total Employees', value: cycle?.totalEmployees, fmt: (v) => v, color: '#7C5CFC', bg: '#F1EEFE', icon: GroupsRoundedIcon },
        { label: 'Total Gross', value: cycle?.totalGross, fmt: formatINR, color: '#0EA5E9', bg: '#E0F2FE', icon: ReceiptLongRoundedIcon },
        { label: 'Total Deductions', value: cycle?.totalDeductions, fmt: formatINR, color: '#E11D48', bg: '#FEE2E2', icon: EventBusyRoundedIcon },
        { label: 'Net Payout', value: cycle?.totalNet, fmt: formatINR, color: '#16A34A', bg: '#DCFCE7', icon: PaidRoundedIcon },
    ];

    // Contextual next-step action, plus a Revert once there's a stage to undo.
    const renderAction = () => {
        if (loading || !cycle) return null;
        const attendanceDone = stageState('attendanceLocked').done;
        const approvedDone = stageState('approved').done;
        const creditedDone = stageState('credited').done;

        // Rollback reverts the most recent completed stage — offered once the
        // payroll has been approved (i.e. there's an approve/credit to undo).
        const revertBtn = approvedDone ? (
            <Button
                onClick={() => runAction(postRollbackPayrollCycle, 'Reverted to the previous stage.')}
                disabled={actionLoading}
                startIcon={<ReplayRoundedIcon sx={{ fontSize: 16 }} />}
                sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, color: '#64748B', bgcolor: '#F1F5F9', borderRadius: '7px', height: 40, px: 2, '&:hover': { bgcolor: '#E2E8F0' } }}
            >
                Revert
            </Button>
        ) : null;

        let primary;
        if (!attendanceDone) {
            primary = <Chip icon={<EventBusyRoundedIcon sx={{ fontSize: '15px !important' }} />} label="Lock attendance for this month first" sx={{ height: 38, borderRadius: '7px', fontWeight: 700, fontSize: 12.5, bgcolor: '#FEF3C7', color: '#B45309', '& .MuiChip-icon': { color: '#B45309' } }} />;
        } else if (!approvedDone) {
            primary = <Button onClick={() => runAction(postApprovePayrollCycle, 'Payroll approved — you can now credit salaries.')} disabled={actionLoading} startIcon={actionLoading ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : <HowToRegRoundedIcon sx={{ fontSize: 18 }} />} sx={{ ...solidBtn, height: 40, px: 2.4 }}>Approve Payroll</Button>;
        } else if (!creditedDone) {
            primary = <Button onClick={() => runAction(postMarkCreditedPayrollCycle, 'Salaries marked as credited.')} disabled={actionLoading} startIcon={actionLoading ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : <PaidRoundedIcon sx={{ fontSize: 18 }} />} sx={{ height: 40, px: 2.2, textTransform: 'none', fontSize: 12.5, fontWeight: 700, color: '#fff', bgcolor: '#16A34A', borderRadius: '7px', boxShadow: '0 2px 6px #16A34A40', '&:hover': { bgcolor: '#15803D' } }}>Mark as Credited</Button>;
        } else {
            primary = <Chip icon={<CheckCircleRoundedIcon sx={{ fontSize: '15px !important' }} />} label="Payroll credited — cycle complete" sx={{ height: 38, borderRadius: '7px', fontWeight: 700, fontSize: 12.5, bgcolor: '#DCFCE7', color: '#16A34A', '& .MuiChip-icon': { color: '#16A34A' } }} />;
        }

        return (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                {revertBtn}
                {primary}
            </Stack>
        );
    };

    return (
        <Box sx={{ p: 2 }}>
            <SnackBar open={snack.open} color={snack.ok} setOpen={(v) => setSnack((s) => ({ ...s, open: v }))} status={snack.ok} message={snack.msg} />

            {/* Header */}
            <Box sx={{ pb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexWrap: 'wrap', gap: 1.5 }}>
                <Box>
                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>Run Payroll</Typography>
                    <Typography sx={{ fontSize: 13, color: '#6B7280', mt: 0.3 }}>Review calculated salaries, approve and credit them to bank accounts</Typography>
                </Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#6B7280' }}>Payout month</Typography>
                    <Select size="small" value={month} onChange={(e) => setMonth(e.target.value)}
                        sx={{ fontSize: 12.5, fontWeight: 600, height: 38, bgcolor: '#fff', borderRadius: '7px', minWidth: 190, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E5E7EB' } }}>
                        {months.map((m) => <MenuItem key={m.value} value={m.value} sx={{ fontSize: 13 }}>{m.label}{m.isCurrent ? '  (current)' : ''}</MenuItem>)}
                    </Select>
                </Stack>
            </Box>

            {/* Cycle progress + primary action */}
            <Box sx={{ ...card, p: 2.5, mb: 1.5 }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2.5 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Payroll Cycle — {cycle?.payoutMonth || monthLabel}</Typography>
                        {cycle?.financialYear && <Chip icon={<CalendarMonthRoundedIcon sx={{ fontSize: '13px !important' }} />} label={`FY ${cycle.financialYear}`} size="small" sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: '#EEF2FF', color: '#4F46E5', '& .MuiChip-icon': { color: '#4F46E5' } }} />}
                        {cycle?.attendanceMonth && <Chip label={`Attendance: ${cycle.attendanceMonth}`} size="small" sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: '#F1F5F9', color: '#475569' }} />}
                        {cycle?.status && <Chip label={prettyStatus(cycle.status)} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: PRIMARY_LIGHT, color: PRIMARY }} />}
                    </Stack>
                    {renderAction()}
                </Stack>

                {loading ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <CircularProgress size={26} sx={{ color: PRIMARY }} />
                    </Box>
                ) : !cycle ? (
                    <Typography sx={{ fontSize: 12.5, color: '#9CA3AF', textAlign: 'center', py: 3 }}>
                        No payroll cycle found for {monthLabel}.
                    </Typography>
                ) : (
                    /* Stage timeline */
                    <Stack direction="row" sx={{ alignItems: 'flex-start' }}>
                        {STAGES.map((st, idx) => {
                            const s = stageState(st.key);
                            const done = s.done;
                            const current = idx === activeIdx;
                            const Icon = st.icon;
                            const c = done ? '#16A34A' : current ? PRIMARY : '#CBD5E1';
                            const bg = done ? '#DCFCE7' : current ? PRIMARY_LIGHT : '#F3F4F6';
                            const tip = done && (s.on || s.by) ? `${s.on || ''}${s.by ? ` · by ${s.by}` : ''}` : '';
                            return (
                                <React.Fragment key={st.key}>
                                    <Tooltip arrow title={tip} disableHoverListener={!tip}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto', width: 140, cursor: tip ? 'default' : 'inherit' }}>
                                            <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: bg, border: `2px solid ${c}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: current ? `0 0 0 4px ${c}22` : 'none' }}>
                                                {done ? <CheckCircleRoundedIcon sx={{ color: c, fontSize: 24 }} /> : <Icon sx={{ color: c, fontSize: 22 }} />}
                                            </Box>
                                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: current ? PRIMARY : done ? '#16A34A' : '#475569', mt: 0.8, textAlign: 'center' }}>{st.label}</Typography>
                                            <Typography sx={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center' }}>{st.desc}</Typography>
                                            {done && s.on && <Typography sx={{ fontSize: 9.5, color: '#16A34A', fontWeight: 700, mt: 0.3, textAlign: 'center' }}>{s.on}</Typography>}
                                        </Box>
                                    </Tooltip>
                                    {idx < STAGES.length - 1 && <Box sx={{ flex: 1, height: 3, borderRadius: 3, bgcolor: idx < activeIdx ? '#16A34A' : '#E5E7EB', mt: '21px', mx: 0.5 }} />}
                                </React.Fragment>
                            );
                        })}
                    </Stack>
                )}
            </Box>

            {/* Totals — null until the cycle is calculated */}
            <Grid container spacing={1.5}>
                {totals.map((t) => {
                    const has = t.value !== null && t.value !== undefined;
                    return (
                        <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={t.label}>
                            <Box sx={{ ...card, p: 2.5, bgcolor: t.bg, border: `1px solid ${t.color}22` }}>
                                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.label}</Typography>
                                        <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#0F172A', mt: 0.5 }} noWrap>{has ? t.fmt(t.value) : '—'}</Typography>
                                        <Typography sx={{ fontSize: 10.5, color: '#6B7280', fontWeight: 600, mt: 0.3 }} noWrap>{has ? 'this cycle' : 'Pending calculation'}</Typography>
                                    </Box>
                                    <Box sx={{ width: 44, height: 44, borderRadius: '7px', bgcolor: '#fff', boxShadow: '0 1px 3px rgba(16,24,40,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ml: 1 }}>
                                        <t.icon sx={{ color: t.color, fontSize: 22 }} />
                                    </Box>
                                </Stack>
                            </Box>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
    );
}
