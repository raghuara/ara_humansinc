import React, { useMemo, useState } from 'react';
import {
    Box, Typography, Select, MenuItem, Button, Avatar, Chip, TextField, Tooltip, Grid, Stack,
} from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import HistoryToggleOffIcon from '@mui/icons-material/HistoryToggleOff';
import SnackBar from '../../SnackBar';

const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
const solidBtn = { bgcolor: PRIMARY, color: '#fff', fontWeight: 700, borderRadius: '7px', boxShadow: `0 2px 6px ${PRIMARY}40`, textTransform: 'none', '&:hover': { bgcolor: '#6246E0' } };

const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const getInitials = (n = '') => n.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
const AVATAR_PALETTE = ['#7C5CFC', '#0EA5E9', '#F59E0B', '#16A34A', '#E11D48', '#6246E0', '#0891B2'];
const colorFor = (s = '') => AVATAR_PALETTE[(s.charCodeAt(0) || 0) % AVATAR_PALETTE.length];

const EMPLOYEES = [
    { id: 1, name: 'Ananya Sharma', dept: 'Engineering', netPay: 48500, bank: 'HDFC ••6721' },
    { id: 2, name: 'Rahul Verma', dept: 'Human Resources', netPay: 52300, bank: 'SBI ••1188' },
    { id: 3, name: 'Priya Nair', dept: 'Design', netPay: 45200, bank: 'ICICI ••9034' },
    { id: 4, name: 'Mohammed Imran', dept: 'Operations', netPay: 31800, bank: 'Axis ••4521' },
    { id: 5, name: 'Sneha Reddy', dept: 'Finance', netPay: 56700, bank: 'Kotak ••7790' },
    { id: 6, name: 'Vikram Singh', dept: 'Support', netPay: 28900, bank: 'HDFC ••3344' },
    { id: 7, name: 'Divya Krishnan', dept: 'Sales', netPay: 47100, bank: 'SBI ••8856' },
    { id: 8, name: 'Arjun Menon', dept: 'Marketing', netPay: 33400, bank: 'ICICI ••2207' },
];

const STAGES = [
    { key: 'calculated', label: 'Calculated', desc: 'Net pay computed', icon: CalculateRoundedIcon },
    { key: 'approved', label: 'Approved', desc: 'Reviewed & approved', icon: HowToRegRoundedIcon },
    { key: 'credited', label: 'Credited', desc: 'Paid to bank accounts', icon: PaidRoundedIcon },
];
const STAGE_IDX = { calculated: 0, approved: 1, credited: 2 };

const buildMonths = () => {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        opts.push({ value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }), isPast: i > 0 });
    }
    return opts;
};
const prettyDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

export default function MarkSalaryCreditedPage() {
    const months = useMemo(buildMonths, []);
    const [month, setMonth] = useState(months[1]?.value || months[0].value);
    const [creditDate, setCreditDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [approvedMonths, setApprovedMonths] = useState({});   // month -> true
    const [credited, setCredited] = useState({});               // `${month}__${id}` -> date
    const [snack, setSnack] = useState({ open: false, ok: true, msg: '' });
    const showSnack = (msg, ok = true) => setSnack({ open: true, ok, msg });

    const monthInfo = months.find((m) => m.value === month) || months[0];
    const keyOf = (id) => `${month}__${id}`;
    const isCredited = (id) => Boolean(credited[keyOf(id)]);

    const creditedCount = EMPLOYEES.filter((e) => isCredited(e.id)).length;
    const pendingCount = EMPLOYEES.length - creditedCount;
    const totalNet = EMPLOYEES.reduce((s, e) => s + e.netPay, 0);
    const creditedNet = EMPLOYEES.filter((e) => isCredited(e.id)).reduce((s, e) => s + e.netPay, 0);

    const isApproved = Boolean(approvedMonths[month]);
    const allCredited = EMPLOYEES.length > 0 && creditedCount === EMPLOYEES.length;
    const stage = allCredited ? 'credited' : (isApproved ? 'approved' : 'calculated');
    const stageIdx = STAGE_IDX[stage];

    const approve = () => { setApprovedMonths((p) => ({ ...p, [month]: true })); showSnack(`${monthInfo.label} payroll approved — you can now credit salaries.`); };
    const revertApproval = () => {
        setApprovedMonths((p) => { const n = { ...p }; delete n[month]; return n; });
        setCredited((p) => { const n = { ...p }; EMPLOYEES.forEach((e) => delete n[keyOf(e.id)]); return n; });
        showSnack(`Reverted ${monthInfo.label} payroll to Calculated.`, false);
    };
    const markOne = (emp) => { setCredited((p) => ({ ...p, [keyOf(emp.id)]: creditDate })); showSnack(`${emp.name}'s salary credited on ${prettyDate(creditDate)}.`); };
    const undoOne = (emp) => { setCredited((p) => { const n = { ...p }; delete n[keyOf(emp.id)]; return n; }); showSnack(`Reverted ${emp.name} to pending.`, false); };
    const markAllCredited = () => { setCredited((p) => { const n = { ...p }; EMPLOYEES.forEach((e) => { n[keyOf(e.id)] = creditDate; }); return n; }); showSnack(`All ${EMPLOYEES.length} salaries for ${monthInfo.label} credited on ${prettyDate(creditDate)}.`); };
    const revertCredit = () => { setCredited((p) => { const n = { ...p }; EMPLOYEES.forEach((e) => delete n[keyOf(e.id)]); return n; }); showSnack(`Reverted crediting for ${monthInfo.label}.`, false); };

    const KPIS = [
        { label: 'Total Employees', value: EMPLOYEES.length, sub: 'on this payroll', color: '#7C5CFC', bg: '#F1EEFE', icon: GroupsRoundedIcon },
        { label: 'Total Net Payout', value: formatINR(totalNet), sub: 'to disburse', color: '#16A34A', bg: '#DCFCE7', icon: PaidRoundedIcon },
        { label: 'Credited', value: formatINR(creditedNet), sub: `${creditedCount} of ${EMPLOYEES.length} paid`, color: '#0EA5E9', bg: '#E0F2FE', icon: CheckCircleRoundedIcon },
        { label: 'Pending', value: formatINR(totalNet - creditedNet), sub: `${pendingCount} pending`, color: '#F59E0B', bg: '#FFF7ED', icon: PendingActionsRoundedIcon },
    ];

    const stageChip = stage === 'credited'
        ? { label: 'Salaries Credited', bg: '#DCFCE7', color: '#16A34A' }
        : stage === 'approved'
            ? { label: 'Approved — ready to credit', bg: '#EEF2FF', color: '#4F46E5' }
            : { label: 'Awaiting approval', bg: '#FEF3C7', color: '#B45309' };

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
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#6B7280' }}>Salary month</Typography>
                    <Select size="small" value={month} onChange={(e) => setMonth(e.target.value)}
                        sx={{ fontSize: 12.5, fontWeight: 600, height: 38, bgcolor: '#fff', borderRadius: '7px', minWidth: 190, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E5E7EB' } }}>
                        {months.map((m) => <MenuItem key={m.value} value={m.value} sx={{ fontSize: 13 }}>{m.label}{m.isPast ? '' : '  (current)'}</MenuItem>)}
                    </Select>
                </Stack>
            </Box>

            {/* Cycle progress + primary action */}
            <Box sx={{ ...card, p: 2.5, mb: 1.5 }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2.5 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Payroll Cycle — {monthInfo.label}</Typography>
                        {monthInfo.isPast && <Chip icon={<HistoryToggleOffIcon sx={{ fontSize: '13px !important' }} />} label="Past month" size="small" sx={{ height: 20, fontSize: 9.5, fontWeight: 800, bgcolor: '#EEF1F6', color: '#64748B', '& .MuiChip-icon': { color: '#94A3B8' } }} />}
                        <Chip label={stageChip.label} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: stageChip.bg, color: stageChip.color }} />
                    </Stack>

                    {/* Stage-based action */}
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        {stage === 'calculated' && (
                            <Button onClick={approve} startIcon={<HowToRegRoundedIcon sx={{ fontSize: 18 }} />} sx={{ ...solidBtn, height: 40, px: 2.4 }}>Approve Payroll</Button>
                        )}
                        {stage === 'approved' && (
                            <>
                                <Box>
                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.4, display: 'flex', alignItems: 'center', gap: 0.4 }}><EventAvailableRoundedIcon sx={{ fontSize: 13 }} /> Credited on</Typography>
                                    <TextField type="date" size="small" value={creditDate} onChange={(e) => setCreditDate(e.target.value)} sx={{ bgcolor: '#fff', '& .MuiOutlinedInput-root': { height: 40, fontSize: 13, borderRadius: '7px' } }} />
                                </Box>
                                <Button onClick={revertApproval} startIcon={<ReplayRoundedIcon sx={{ fontSize: 16 }} />} sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, color: '#64748B', bgcolor: '#F1F5F9', borderRadius: '7px', height: 40, px: 2, '&:hover': { bgcolor: '#E2E8F0' } }}>Revert</Button>
                                <Button onClick={markAllCredited} startIcon={<DoneAllRoundedIcon sx={{ fontSize: 18 }} />} sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, color: '#fff', bgcolor: '#16A34A', borderRadius: '7px', height: 40, px: 2.2, boxShadow: '0 2px 6px #16A34A40', '&:hover': { bgcolor: '#15803D' } }}>Mark All as Credited</Button>
                            </>
                        )}
                        {stage === 'credited' && (
                            <Button onClick={revertCredit} startIcon={<ReplayRoundedIcon sx={{ fontSize: 16 }} />} sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, color: '#64748B', bgcolor: '#F1F5F9', borderRadius: '7px', height: 40, px: 2, '&:hover': { bgcolor: '#E2E8F0' } }}>Revert Crediting</Button>
                        )}
                    </Stack>
                </Stack>

                {/* Stage timeline */}
                <Stack direction="row" sx={{ alignItems: 'flex-start' }}>
                    {STAGES.map((st, idx) => {
                        const Icon = st.icon;
                        const done = idx < stageIdx;
                        const current = idx === stageIdx;
                        const c = done ? '#16A34A' : current ? PRIMARY : '#CBD5E1';
                        const bg = done ? '#DCFCE7' : current ? PRIMARY_LIGHT : '#F3F4F6';
                        return (
                            <React.Fragment key={st.key}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto', width: 130 }}>
                                    <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: bg, border: `2px solid ${c}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: current ? `0 0 0 4px ${c}22` : 'none' }}>
                                        {done ? <CheckCircleRoundedIcon sx={{ color: c, fontSize: 24 }} /> : <Icon sx={{ color: c, fontSize: 22 }} />}
                                    </Box>
                                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: current ? PRIMARY : done ? '#16A34A' : '#475569', mt: 0.8 }}>{st.label}</Typography>
                                    <Typography sx={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center' }}>{st.desc}</Typography>
                                </Box>
                                {idx < STAGES.length - 1 && <Box sx={{ flex: 1, height: 3, borderRadius: 3, bgcolor: idx < stageIdx ? '#16A34A' : '#E5E7EB', mt: '21px', mx: 0.5 }} />}
                            </React.Fragment>
                        );
                    })}
                </Stack>
            </Box>

            {/* KPI cards */}
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                {KPIS.map((k) => (
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={k.label}>
                        <Box sx={{ ...card, p: 2.5, bgcolor: k.bg, border: `1px solid ${k.color}22` }}>
                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: k.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</Typography>
                                    <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#0F172A', mt: 0.5 }} noWrap>{k.value}</Typography>
                                    <Typography sx={{ fontSize: 10.5, color: '#6B7280', fontWeight: 600, mt: 0.3 }} noWrap>{k.sub}</Typography>
                                </Box>
                                <Box sx={{ width: 44, height: 44, borderRadius: '7px', bgcolor: '#fff', boxShadow: '0 1px 3px rgba(16,24,40,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ml: 1 }}>
                                    <k.icon sx={{ color: k.color, fontSize: 22 }} />
                                </Box>
                            </Stack>
                        </Box>
                    </Grid>
                ))}
            </Grid>

            {/* Table */}
            <Box sx={{ ...card, p: 0, overflow: 'hidden' }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.6, bgcolor: '#F7F6FD', borderBottom: '1px solid #EAE7F7', flexWrap: 'wrap', gap: 1 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: '#fff', boxShadow: '0 1px 4px rgba(16,24,40,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <SavingsRoundedIcon sx={{ fontSize: 17, color: PRIMARY }} />
                        </Box>
                        <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: '#0F172A' }}>Net Pay Disbursement</Typography>
                        <Chip label={`${EMPLOYEES.length} employees`} size="small" sx={{ bgcolor: PRIMARY_LIGHT, color: PRIMARY, fontWeight: 700, fontSize: 11 }} />
                    </Stack>
                    {stage === 'calculated' && <Typography sx={{ fontSize: 11.5, color: '#B45309', fontWeight: 600 }}>Approve the payroll to enable crediting</Typography>}
                </Stack>
                <Box sx={{ overflowX: 'auto' }}>
                    <Box component="table" sx={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
                        <Box component="thead" sx={{ bgcolor: '#F4F3FB' }}>
                            <Box component="tr">
                                {['EMPLOYEE', 'BANK ACCOUNT', 'NET PAY', 'STATUS', 'ACTION'].map((h) => (
                                    <Box component="th" key={h} sx={{ textAlign: h === 'ACTION' ? 'right' : 'left', px: 2.5, py: 1.6, fontSize: 10.5, fontWeight: 700, color: '#6E6B99', letterSpacing: 0.6, borderBottom: '1px solid #E8E6F3', whiteSpace: 'nowrap' }}>{h}</Box>
                                ))}
                            </Box>
                        </Box>
                        <Box component="tbody">
                            {EMPLOYEES.map((emp, idx) => {
                                const done = isCredited(emp.id);
                                return (
                                    <Box component="tr" key={emp.id} sx={{ bgcolor: done ? '#F2FBF5' : (idx % 2 ? '#FBFAFE' : '#fff'), '&:hover': { bgcolor: done ? '#EAF9EF' : '#F5F4FC' }, transition: 'background-color .15s' }}>
                                        <Box component="td" sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #EEF0F6' }}>
                                            <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
                                                <Avatar sx={{ width: 36, height: 36, fontSize: 12.5, fontWeight: 700, bgcolor: `${colorFor(emp.name)}22`, color: colorFor(emp.name) }}>{getInitials(emp.name)}</Avatar>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }} noWrap>{emp.name}</Typography>
                                                    <Typography sx={{ fontSize: 11.5, color: '#98A0AE' }} noWrap>{emp.dept}</Typography>
                                                </Box>
                                            </Stack>
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.5, fontSize: 12.5, fontFamily: 'monospace', fontWeight: 600, color: '#475569', borderBottom: '1px solid #EEF0F6', whiteSpace: 'nowrap' }}>{emp.bank}</Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #EEF0F6' }}>
                                            <Box sx={{ display: 'inline-flex', px: 1.1, py: 0.5, borderRadius: '7px', bgcolor: '#EFECFE', border: '1px solid #DDD3FB' }}>
                                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#5B21B6' }}>{formatINR(emp.netPay)}</Typography>
                                            </Box>
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #EEF0F6' }}>
                                            {done ? (
                                                <Chip icon={<CheckCircleRoundedIcon sx={{ fontSize: '14px !important' }} />} label={`Credited · ${prettyDate(credited[keyOf(emp.id)])}`} size="small" sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: '#DCFCE7', color: '#16A34A', '& .MuiChip-icon': { color: '#16A34A' } }} />
                                            ) : isApproved ? (
                                                <Chip icon={<PendingActionsRoundedIcon sx={{ fontSize: '14px !important' }} />} label="Pending payout" size="small" sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: '#FEF3C7', color: '#B45309', '& .MuiChip-icon': { color: '#B45309' } }} />
                                            ) : (
                                                <Chip icon={<RadioButtonUncheckedRoundedIcon sx={{ fontSize: '13px !important' }} />} label="Awaiting approval" size="small" sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: '#F1F5F9', color: '#64748B', '& .MuiChip-icon': { color: '#94A3B8' } }} />
                                            )}
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #EEF0F6', textAlign: 'right' }}>
                                            {!isApproved ? (
                                                <Typography sx={{ fontSize: 11.5, color: '#CBD5E1', fontStyle: 'italic' }}>—</Typography>
                                            ) : done ? (
                                                <Tooltip arrow title="Revert to pending">
                                                    <Button onClick={() => undoOne(emp)} startIcon={<UndoRoundedIcon sx={{ fontSize: 15 }} />} size="small" sx={{ textTransform: 'none', fontWeight: 700, fontSize: 11.5, color: '#64748B', border: '1px solid #E5E7EB', borderRadius: '7px', height: 32, px: 1.4, '&:hover': { bgcolor: '#F8FAFC' } }}>Undo</Button>
                                                </Tooltip>
                                            ) : (
                                                <Button onClick={() => markOne(emp)} startIcon={<CheckCircleRoundedIcon sx={{ fontSize: 16 }} />} size="small" sx={{ textTransform: 'none', fontWeight: 700, fontSize: 11.5, color: '#16A34A', bgcolor: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '7px', height: 32, px: 1.4, '&:hover': { bgcolor: '#BBF7D0' } }}>Mark Credited</Button>
                                            )}
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
