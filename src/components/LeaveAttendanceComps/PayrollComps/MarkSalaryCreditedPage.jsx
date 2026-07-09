import React, { useMemo, useState } from 'react';
import {
    Box, Typography, IconButton, Select, MenuItem, Button, Avatar, Chip, Divider, TextField, Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SavingsIcon from '@mui/icons-material/Savings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import HistoryToggleOffIcon from '@mui/icons-material/HistoryToggleOff';
import UndoIcon from '@mui/icons-material/Undo';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { useNavigate } from 'react-router-dom';
import SnackBar from '../../SnackBar';

const ACCENT = '#7C5CFC';

const formatINR = (n) => {
    if (n == null || Number.isNaN(n)) return '₹0';
    const x = Math.round(n).toString();
    const lastThree = x.substring(x.length - 3);
    const other = x.substring(0, x.length - 3);
    return '₹' + (other !== '' ? other.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree : lastThree);
};

const getInitials = (n = '') => n.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
const AVATAR_PALETTE = ['#0E7490', '#1D4ED8', '#C2410C', '#6246E0', '#1D4ED8', '#BE185D', '#A16207', '#0F766E'];
const colorFor = (s = '') => AVATAR_PALETTE[(s.charCodeAt(0) || 0) % AVATAR_PALETTE.length];

// ─── Mock employees (replace with API: /api/payroll/net-pay?month=YYYY-MM) ───
const EMPLOYEES = [
    { id: 1, name: 'Ananya Sharma', dept: 'Teaching', netPay: 48500, bank: 'HDFC ••6721' },
    { id: 2, name: 'Rahul Verma', dept: 'Administration', netPay: 52300, bank: 'SBI ••1188' },
    { id: 3, name: 'Priya Nair', dept: 'Teaching', netPay: 45200, bank: 'ICICI ••9034' },
    { id: 4, name: 'Mohammed Imran', dept: 'Transport', netPay: 31800, bank: 'Axis ••4521' },
    { id: 5, name: 'Sneha Reddy', dept: 'Accounts', netPay: 56700, bank: 'Kotak ••7790' },
    { id: 6, name: 'Vikram Singh', dept: 'Maintenance', netPay: 28900, bank: 'HDFC ••3344' },
    { id: 7, name: 'Divya Krishnan', dept: 'Teaching', netPay: 47100, bank: 'SBI ••8856' },
    { id: 8, name: 'Arjun Menon', dept: 'Library', netPay: 33400, bank: 'ICICI ••2207' },
];

// Last 12 months (current + past) — past months are explicitly allowed.
const buildMonths = () => {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        opts.push({
            value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            label: d.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
            isPast: i > 0,
        });
    }
    return opts;
};

const prettyDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function MarkSalaryCreditedPage({ isEmbedded = false, onBack }) {
    const navigate = useNavigate();
    const months = useMemo(buildMonths, []);

    // Default to the previous month — salaries are usually credited in the following month.
    const [month, setMonth] = useState(months[1]?.value || months[0].value);
    const [creditDate, setCreditDate] = useState(() => new Date().toISOString().slice(0, 10));
    // credited map: key `${month}__${empId}` -> credit date (ISO). Presence = credited.
    const [credited, setCredited] = useState({});
    const [snack, setSnack] = useState({ open: false, ok: true, msg: '' });
    const showSnack = (msg, ok = true) => setSnack({ open: true, ok, msg });

    const monthInfo = months.find((m) => m.value === month) || months[0];
    const keyOf = (id) => `${month}__${id}`;
    const isCredited = (id) => Boolean(credited[keyOf(id)]);

    const markOne = (emp) => {
        setCredited((p) => ({ ...p, [keyOf(emp.id)]: creditDate }));
        showSnack(`${emp.name}'s ${monthInfo.label} salary marked credited on ${prettyDate(creditDate)}.`);
    };
    const undoOne = (emp) => {
        setCredited((p) => { const n = { ...p }; delete n[keyOf(emp.id)]; return n; });
        showSnack(`Reverted ${emp.name}'s ${monthInfo.label} salary to pending.`, false);
    };
    const markAll = () => {
        setCredited((p) => {
            const n = { ...p };
            EMPLOYEES.forEach((e) => { n[keyOf(e.id)] = creditDate; });
            return n;
        });
        showSnack(`All ${EMPLOYEES.length} salaries for ${monthInfo.label} marked credited on ${prettyDate(creditDate)}.`);
    };

    const creditedCount = EMPLOYEES.filter((e) => isCredited(e.id)).length;
    const pendingCount = EMPLOYEES.length - creditedCount;
    const totalNet = EMPLOYEES.reduce((s, e) => s + e.netPay, 0);
    const creditedNet = EMPLOYEES.filter((e) => isCredited(e.id)).reduce((s, e) => s + e.netPay, 0);

    const handleBack = () => { if (isEmbedded && onBack) onBack(); else navigate(-1); };

    const containerSx = isEmbedded
        ? { display: 'flex', flexDirection: 'column', height: '100%' }
        : { border: '1px solid #E5E7EB', borderRadius: '20px', p: 2, height: '86vh', display: 'flex', flexDirection: 'column', bgcolor: '#fff' };

    return (
        <Box sx={containerSx}>
            <SnackBar open={snack.open} color={snack.ok} setOpen={(v) => setSnack((s) => ({ ...s, open: v }))} status={snack.ok} message={snack.msg} />

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton onClick={handleBack} size="small" sx={{ width: 35, height: 35 }}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Box>
                        <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>Mark Salary Credited</Typography>
                        <Typography sx={{ fontSize: '11px', color: '#6B7280' }}>
                            Record salary disbursement for any month — including past months paid in the current month
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#6B7280' }}>Salary month</Typography>
                    <Select
                        size="small" value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        sx={{ fontSize: '12px', fontWeight: 600, height: 36, bgcolor: '#fff', borderRadius: '50px', minWidth: 190, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E5E7EB' } }}
                    >
                        {months.map((m) => (
                            <MenuItem key={m.value} value={m.value} sx={{ fontSize: '13px' }}>
                                {m.label}{m.isPast ? '' : '  (current)'}
                            </MenuItem>
                        ))}
                    </Select>
                </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5,
                '&::-webkit-scrollbar': { width: 5 },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#D1D5DB', borderRadius: 10 },
            }}>
                {/* Month context banner — always shows which month is being credited */}
                <Box sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
                    p: 2, mb: 2, borderRadius: '14px', border: `1px solid ${ACCENT}33`,
                    background: `linear-gradient(120deg, ${ACCENT}0F 0%, ${ACCENT}06 100%)`,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                        <Box sx={{ width: 46, height: 46, borderRadius: '7px', bgcolor: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <SavingsIcon sx={{ fontSize: 26, color: '#fff' }} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Typography sx={{ fontSize: '11px', fontWeight: 800, color: ACCENT, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Crediting salary for
                                </Typography>
                                {monthInfo.isPast && (
                                    <Chip icon={<HistoryToggleOffIcon sx={{ fontSize: '13px !important' }} />} label="Past month" size="small"
                                        sx={{ height: 20, fontSize: 9.5, fontWeight: 800, bgcolor: '#FFF7ED', color: '#EA580C', '& .MuiChip-icon': { color: '#EA580C' } }} />
                                )}
                            </Box>
                            <Typography sx={{ fontSize: '20px', fontWeight: 800, color: '#111827', lineHeight: 1.15 }}>{monthInfo.label}</Typography>
                            <Typography sx={{ fontSize: '11.5px', color: '#6B7280' }}>
                                {monthInfo.isPast
                                    ? 'This salary belongs to a past month and is being paid now.'
                                    : 'Current month payroll.'}
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap' }}>
                        <Box>
                            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.3, display: 'flex', alignItems: 'center', gap: 0.4 }}>
                                <EventAvailableOutlinedIcon sx={{ fontSize: 14 }} /> Credited on
                            </Typography>
                            <TextField
                                type="date" size="small" value={creditDate}
                                onChange={(e) => setCreditDate(e.target.value)}
                                sx={{ bgcolor: '#fff', '& .MuiOutlinedInput-root': { height: 38, fontSize: 13, borderRadius: '7px' } }}
                            />
                        </Box>
                        <Button
                            onClick={markAll}
                            startIcon={<DoneAllIcon sx={{ fontSize: 18 }} />}
                            disabled={pendingCount === 0}
                            sx={{ alignSelf: 'flex-end', textTransform: 'none', fontWeight: 700, fontSize: 13, bgcolor: ACCENT, color: '#fff', borderRadius: '7px', height: 38, px: 2, boxShadow: 'none', '&:hover': { bgcolor: ACCENT, filter: 'brightness(0.92)' }, '&.Mui-disabled': { bgcolor: '#E5E7EB', color: '#9CA3AF' } }}
                        >
                            Mark all as Credited
                        </Button>
                    </Box>
                </Box>

                {/* Summary chips */}
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
                    {[
                        { label: 'Total Employees', value: EMPLOYEES.length, color: '#6246E0', icon: PendingActionsIcon },
                        { label: 'Credited', value: creditedCount, color: '#16A34A', icon: CheckCircleIcon },
                        { label: 'Pending', value: pendingCount, color: '#EA580C', icon: PendingActionsIcon },
                        { label: 'Net Credited', value: `${formatINR(creditedNet)} / ${formatINR(totalNet)}`, color: ACCENT, icon: SavingsIcon },
                    ].map((s) => {
                        const Icon = s.icon;
                        return (
                            <Box key={s.label} sx={{ flex: '1 1 160px', display: 'flex', alignItems: 'center', gap: 1.2, p: 1.4, borderRadius: '7px', border: '1px solid #E5E7EB', bgcolor: '#fff' }}>
                                <Avatar sx={{ width: 36, height: 36, bgcolor: `${s.color}14` }}>
                                    <Icon sx={{ fontSize: 19, color: s.color }} />
                                </Avatar>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3 }}>{s.label}</Typography>
                                    <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#111827', lineHeight: 1.2 }} noWrap>{s.value}</Typography>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>

                {/* Employee list */}
                <Box sx={{ border: '1px solid #E5E7EB', borderRadius: '7px', overflow: 'hidden' }}>
                    {/* Table header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.2, bgcolor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                        <Typography sx={{ flex: 2.2, fontSize: 10.5, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4 }}>Employee</Typography>
                        <Typography sx={{ flex: 1.2, fontSize: 10.5, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4 }}>Net Pay</Typography>
                        <Typography sx={{ flex: 1.4, fontSize: 10.5, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4, display: { xs: 'none', md: 'block' } }}>Status</Typography>
                        <Typography sx={{ flex: 1.3, fontSize: 10.5, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'right' }}>Action</Typography>
                    </Box>

                    {EMPLOYEES.map((emp, idx) => {
                        const done = isCredited(emp.id);
                        return (
                            <Box key={emp.id} sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.2, borderBottom: idx < EMPLOYEES.length - 1 ? '1px solid #F1F3F5' : 'none', bgcolor: done ? `${ACCENT}08` : '#fff', transition: 'background-color 0.2s' }}>
                                {/* Employee */}
                                <Box sx={{ flex: 2.2, display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
                                    <Avatar sx={{ width: 34, height: 34, fontSize: 12, fontWeight: 700, bgcolor: `${colorFor(emp.name)}22`, color: colorFor(emp.name) }}>{getInitials(emp.name)}</Avatar>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#111827' }} noWrap>{emp.name}</Typography>
                                        <Typography sx={{ fontSize: 11, color: '#9CA3AF' }} noWrap>{emp.dept} · {emp.bank}</Typography>
                                    </Box>
                                </Box>
                                {/* Net pay */}
                                <Typography sx={{ flex: 1.2, fontSize: 13.5, fontWeight: 800, color: '#111827' }}>{formatINR(emp.netPay)}</Typography>
                                {/* Status */}
                                <Box sx={{ flex: 1.4, display: { xs: 'none', md: 'block' } }}>
                                    {done ? (
                                        <Chip icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />} label={`Credited · ${prettyDate(credited[keyOf(emp.id)])}`} size="small"
                                            sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: '#DBEAFE', color: '#15803D', '& .MuiChip-icon': { color: '#15803D' } }} />
                                    ) : (
                                        <Chip icon={<PendingActionsIcon sx={{ fontSize: '14px !important' }} />} label="Pending" size="small"
                                            sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: '#FFF7ED', color: '#EA580C', '& .MuiChip-icon': { color: '#EA580C' } }} />
                                    )}
                                </Box>
                                {/* Action */}
                                <Box sx={{ flex: 1.3, display: 'flex', justifyContent: 'flex-end' }}>
                                    {done ? (
                                        <Tooltip title="Revert to pending" arrow>
                                            <Button onClick={() => undoOne(emp)} startIcon={<UndoIcon sx={{ fontSize: 15 }} />}
                                                sx={{ textTransform: 'none', fontWeight: 700, fontSize: 11.5, color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: '7px', height: 30, px: 1.2, '&:hover': { bgcolor: '#F9FAFB', borderColor: '#9CA3AF' } }}>
                                                Undo
                                            </Button>
                                        </Tooltip>
                                    ) : (
                                        <Button onClick={() => markOne(emp)} startIcon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                                            sx={{ textTransform: 'none', fontWeight: 700, fontSize: 11.5, bgcolor: ACCENT, color: '#fff', borderRadius: '7px', height: 30, px: 1.4, boxShadow: 'none', '&:hover': { bgcolor: ACCENT, filter: 'brightness(0.92)' } }}>
                                            Mark Credited
                                        </Button>
                                    )}
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            </Box>
        </Box>
    );
}
