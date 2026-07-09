import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    Box, Typography, Button, Grid, IconButton, Divider,
    Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Avatar, Dialog, DialogContent, DialogActions, TextField, InputAdornment,
    Select, MenuItem, FormControl, CircularProgress, Chip, Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';
import BadgeIcon from '@mui/icons-material/Badge';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import SearchIcon from '@mui/icons-material/Search';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectWebsiteSettings } from '../../../redux/slices/websiteSettingsSlice';
import SnackBar from '../../SnackBar';
import { approvePayrollPayslipsDashboard, getPayrollPayslipByRollNumber } from '../../../Api/Api';

// ─── Theme (matches other Payroll pages) ───────────────────────────────────
const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_DARK = '#6246E0';
const PRIMARY_BORDER = '#C9BEFB';

const AVATAR_PALETTE = ['#0E7490', '#1D4ED8', '#C2410C', '#6246E0', '#1D4ED8', '#BE185D', '#A16207', '#0F766E'];
const avatarColorFor = (name = '') => {
    const code = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0);
    return AVATAR_PALETTE[code % AVATAR_PALETTE.length];
};

const getInitials = (name = '') =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

const EarningRow = ({ label, value, bold }) => (
    <Box sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        px: 2, py: 0.75, borderBottom: '1px solid #F1F5F9',
    }}>
        <Typography sx={{ fontSize: 12, color: bold ? '#1a1a1a' : '#374151', fontWeight: bold ? 700 : 400 }}>{label}</Typography>
        <Typography sx={{ fontSize: 12, fontWeight: bold ? 800 : 600, color: bold ? '#1a1a1a' : '#374151' }}>
            {Number(value).toLocaleString()}
        </Typography>
    </Box>
);

const formatMonthParam = (monthIndex, year) =>
    `${String(monthIndex + 1).padStart(2, '0')}-${year}`;

export default function ApprovePayroll() {
    const navigate = useNavigate();
    const websiteSettings = useSelector(selectWebsiteSettings);
    const isExpanded = useSelector((state) => state.sidebar.isExpanded);

    const [loading, setLoading] = useState(false);
    const [payrollData, setPayrollData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    const [payslipData, setPayslipData] = useState(null);
    const [payslipLoading, setPayslipLoading] = useState(false);

    const [fromMonth, setFromMonth] = useState(new Date().getMonth());
    const [fromYear, setFromYear] = useState(currentYear);
    const [toMonth, setToMonth] = useState(new Date().getMonth());
    const [toYear, setToYear] = useState(currentYear);

    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState(false);
    const [color, setColor] = useState(false);
    const [message, setMessage] = useState('');

    const showSnack = (msg, success) => {
        setMessage(msg); setOpen(true); setColor(success); setStatus(success);
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const token = "123";
            const res = await axios.get(approvePayrollPayslipsDashboard, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = res.data.data;
            const employees = (data.employees || []).map(emp => ({
                id: emp.id,
                rollNumber: emp.rollNumber || '-',
                name: emp.name || '-',
                department: emp.department || '-',
                designation: emp.designation || '-',
                basicSalary: emp.basicSalary || 0,
                grossSalary: emp.grossSalary || 0,
                deductions: emp.deductions || 0,
                netSalary: emp.netSalary || 0,
                status: emp.status || 'Pending',
            }));
            setPayrollData(employees);
        } catch {
            showSnack('Failed to load payroll data', false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (viewDialogOpen && selectedEmployee) {
            fetchPayslip(selectedEmployee.rollNumber, fromMonth, fromYear, toMonth, toYear);
        }
    }, [viewDialogOpen, fromMonth, fromYear, toMonth, toYear]);

    const fetchPayslip = async (rollNumber, fMonth, fYear, tMonth, tYear) => {
        setPayslipLoading(true);
        setPayslipData(null);
        try {
            const token = "123";
            const res = await axios.get(getPayrollPayslipByRollNumber, {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    RollNumber: rollNumber,
                    FromMonth: formatMonthParam(fMonth, fYear),
                    ToMonth: formatMonthParam(tMonth, tYear),
                },
            });
            setPayslipData(res.data.data);
        } catch {
            showSnack('Failed to load payslip', false);
        } finally {
            setPayslipLoading(false);
        }
    };

    const handleViewPayslip = (employee) => {
        setSelectedEmployee(employee);
        setFromMonth(new Date().getMonth());
        setFromYear(currentYear);
        setToMonth(new Date().getMonth());
        setToYear(currentYear);
        setViewDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setViewDialogOpen(false);
        setSelectedEmployee(null);
        setPayslipData(null);
    };

    const periodLabel = payslipData?.periodLabel || (() => {
        const from = `${MONTHS[fromMonth].substring(0, 3)} ${fromYear}`;
        const to = `${MONTHS[toMonth].substring(0, 3)} ${toYear}`;
        return fromMonth === toMonth && fromYear === toYear
            ? `${MONTHS[fromMonth]} ${fromYear}`
            : `${from} – ${to}`;
    })();

    const filteredData = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return payrollData;
        return payrollData.filter(emp =>
            (emp.name || '').toLowerCase().includes(q) ||
            (emp.rollNumber || '').toLowerCase().includes(q) ||
            (emp.department || '').toLowerCase().includes(q)
        );
    }, [payrollData, searchTerm]);

    const searchActive = searchTerm.trim().length > 0;

    const stats = useMemo(() => {
        const approved = payrollData.filter(e => (e.status || '').toLowerCase() === 'approved').length;
        const pending = payrollData.filter(e => (e.status || '').toLowerCase() !== 'approved').length;
        const totalNet = payrollData.reduce((sum, e) => sum + Number(e.netSalary || 0), 0);
        return { total: payrollData.length, approved, pending, totalNet };
    }, [payrollData]);

    const kpiCards = [
        {
            label: 'Total Employees',
            value: stats.total,
            sub: 'on this payroll',
            color: '#7C5CFC', bg: '#F1EEFE', border: '#C9BEFB',
            icon: PeopleAltOutlinedIcon,
        },
        {
            label: 'Pending Approval',
            value: stats.pending,
            sub: 'awaiting review',
            color: '#0EA5E9', bg: '#E0F2FE', border: '#BAE6FD',
            icon: HourglassEmptyIcon,
        },
        {
            label: 'Approved',
            value: stats.approved,
            sub: 'ready for disbursement',
            color: '#6246E0', bg: '#F3F0FE', border: '#C9BEFB',
            icon: CheckCircleIcon,
        },
        {
            label: 'Total Net Payout',
            value: formatINR(stats.totalNet),
            sub: 'this cycle',
            color: '#2563EB', bg: '#F3F0FE', border: '#C9BEFB',
            icon: PaidOutlinedIcon,
        },
    ];

    return (
        <>
            <SnackBar open={open} color={color} setOpen={setOpen} status={status} message={message} />

            <style>{`
                @page { size: A4; margin: 10mm; }
                @media print {
                    body * { visibility: hidden; }
                    #payslip-print-content, #payslip-print-content * { visibility: visible; }
                    #payslip-print-content { position: absolute; left: 0; top: 0; width: 100%; background: #fff; }
                    .print-hide { display: none !important; }
                }
            `}</style>

            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#F9FAFB',
                borderRadius: '16px',
                border: '1px solid #E5E7EB',
                overflow: 'hidden',
                minHeight: '88vh',
            }}>
                {/* ─── Header (fixed) ──────────────────────────────────────── */}
                <Box sx={{
                    position: "static",
                    top: "60px",
                    left: isExpanded ? "260px" : "80px",
                    right: 0,
                    backgroundColor: "transparent",
                    px: 2,
                    py: 1,
                    borderBottom: "1px solid #ddd",
                    borderTop: "none",
                    zIndex: 1200,
                    transition: "left 0.3s ease-in-out",
                    overflow: 'hidden',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 1.5,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <IconButton
                            onClick={() => navigate(-1)}
                            sx={{
                                width: 38, height: 38,
                                bgcolor: '#F9FAFB',
                                border: '1px solid #E5E7EB',
                                borderRadius: '7px',
                                '&:hover': { bgcolor: PRIMARY_LIGHT, borderColor: PRIMARY_BORDER },
                            }}
                        >
                            <ArrowBackIcon sx={{ fontSize: 18, color: '#374151' }} />
                        </IconButton>
                        <Box sx={{
                            width: 38, height: 38, borderRadius: '7px',
                            bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <TaskAltIcon sx={{ color: PRIMARY, fontSize: 20 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>
                                Approve Payroll & Payslips
                            </Typography>
                            <Typography sx={{ fontSize: '11.5px', color: '#6B7280', mt: 0.3 }}>
                                Review monthly payroll and generate audit-ready payslips
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Search pill */}
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Search by name, roll no, or dept..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ fontSize: 18, color: searchActive ? PRIMARY : '#9CA3AF' }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: searchActive ? (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setSearchTerm('')} sx={{ p: 0.3 }}>
                                                <CloseIcon sx={{ fontSize: 14, color: '#9CA3AF' }} />
                                            </IconButton>
                                        </InputAdornment>
                                    ) : null,
                                    sx: {
                                        padding: '0 12px',
                                        borderRadius: '50px',
                                        height: '32px',
                                        fontSize: '12px',
                                    },
                                },
                            }}
                            sx={{
                                width: { xs: '100%', sm: 260 },
                                '& .MuiOutlinedInput-root': {
                                    minHeight: '32px',
                                    paddingRight: '3px',
                                    backgroundColor: '#fff',
                                },
                                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: websiteSettings.mainColor,
                                },
                            }}
                        />
                    </Box>
                </Box>

                {/* ─── Body ────────────────────────────────────────────────── */}
                <Box sx={{ flex: 1, pt: "14px", pb: 2, px: 2 }}>

                    {/* KPI Cards */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        {kpiCards.map((card) => {
                            const Icon = card.icon;
                            return (
                                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.label}>
                                    <Card sx={{
                                        border: `1px solid ${card.border}`,
                                        borderRadius: '7px',
                                        boxShadow: 'none',
                                        bgcolor: card.bg,
                                        height: '100%',
                                        transition: 'transform 0.15s, box-shadow 0.15s',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: `0 6px 16px ${card.color}22`,
                                        },
                                    }}>
                                        <CardContent sx={{ py: 1.8, '&:last-child': { pb: 1.8 } }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                    <Typography sx={{
                                                        fontSize: '11px', color: card.color, fontWeight: 700,
                                                        textTransform: 'uppercase', letterSpacing: 0.5,
                                                    }}>
                                                        {card.label}
                                                    </Typography>
                                                    <Typography sx={{
                                                        fontSize: '22px', fontWeight: 800, color: '#111827',
                                                        lineHeight: 1.2, mt: 0.5,
                                                    }} noWrap>
                                                        {card.value}
                                                    </Typography>
                                                    <Typography sx={{
                                                        fontSize: '10.5px', color: '#6B7280', fontWeight: 600, mt: 0.4,
                                                    }} noWrap>
                                                        {card.sub}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{
                                                    width: 38, height: 38, borderRadius: '7px',
                                                    bgcolor: '#fff', border: `1px solid ${card.border}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0, ml: 1,
                                                }}>
                                                    <Icon sx={{ color: card.color, fontSize: 20 }} />
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>

                    {/* Monthly Payroll Table */}
                    <Card sx={{ border: '1px solid #E5E7EB', borderRadius: '7px', boxShadow: 'none', bgcolor: '#fff' }}>
                        <Box sx={{
                            px: 2, py: 1.5,
                            borderBottom: '1px solid #E5E7EB',
                            bgcolor: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1.5,
                            flexWrap: 'wrap',
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{
                                    width: 28, height: 28, borderRadius: '7px',
                                    bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <ReceiptLongIcon sx={{ fontSize: 16, color: PRIMARY }} />
                                </Box>
                                <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                                    Monthly Payroll
                                </Typography>
                                <Chip
                                    label={`${payrollData.length} records`}
                                    size="small"
                                    sx={{
                                        bgcolor: '#F3F4F6', color: '#374151',
                                        fontWeight: 600, fontSize: '11px', height: 20,
                                    }}
                                />
                            </Box>

                            {searchActive && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                    <Typography sx={{ fontSize: '11.5px', color: '#6B7280' }}>
                                        Showing
                                    </Typography>
                                    <Typography sx={{ fontSize: '13px', fontWeight: 800, color: PRIMARY_DARK }}>
                                        {filteredData.length}
                                    </Typography>
                                    <Typography sx={{ fontSize: '11.5px', color: '#6B7280' }}>
                                        of {payrollData.length}
                                    </Typography>
                                    <Button
                                        size="small"
                                        startIcon={<RestartAltIcon sx={{ fontSize: 14 }} />}
                                        onClick={() => setSearchTerm('')}
                                        sx={{
                                            textTransform: 'none', fontSize: '11.5px', fontWeight: 600,
                                            ml: 0.8, height: 26, borderRadius: '7px', px: 1,
                                            color: '#DC2626',
                                            '&:hover': { bgcolor: '#FEF2F2' },
                                        }}
                                    >
                                        Clear
                                    </Button>
                                </Box>
                            )}
                        </Box>

                        <TableContainer>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: PRIMARY_LIGHT }}>
                                        {[
                                            'S.No', 'Employee', 'Department', 'Basic',
                                            'Gross Salary', 'Deductions', 'Net Salary', 'Status', 'Action',
                                        ].map((header) => (
                                            <TableCell
                                                key={header}
                                                sx={{
                                                    fontWeight: 700, fontSize: '10px',
                                                    color: PRIMARY_DARK,
                                                    bgcolor: PRIMARY_LIGHT,
                                                    textTransform: 'uppercase', letterSpacing: 0.6,
                                                    whiteSpace: 'nowrap', py: 1.3,
                                                    borderBottom: `1px solid ${PRIMARY_BORDER}`,
                                                }}
                                            >
                                                {header}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={9} align="center" sx={{ py: 6, borderBottom: 'none' }}>
                                                <CircularProgress size={28} sx={{ color: PRIMARY }} />
                                                <Typography sx={{ fontSize: '12px', color: '#9CA3AF', mt: 1.2 }}>
                                                    Loading payroll data…
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredData.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} align="center" sx={{ py: 6, borderBottom: 'none' }}>
                                                <Box sx={{
                                                    width: 56, height: 56, borderRadius: '50%',
                                                    bgcolor: '#F3F4F6', mx: 'auto', mb: 1.2,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <ReceiptLongIcon sx={{ fontSize: 28, color: '#9CA3AF' }} />
                                                </Box>
                                                <Typography sx={{ fontSize: '13px', color: '#6B7280', fontWeight: 600 }}>
                                                    {searchActive ? `No results for "${searchTerm}"` : 'No payroll records found'}
                                                </Typography>
                                                <Typography sx={{ fontSize: '11.5px', color: '#9CA3AF', mt: 0.4 }}>
                                                    {searchActive ? 'Try a different search term' : 'Records will appear here once payroll is processed'}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredData.map((row, idx) => {
                                        const avColor = avatarColorFor(row.name || '');
                                        const isApproved = (row.status || '').toLowerCase() === 'approved';

                                        return (
                                            <TableRow
                                                key={row.id}
                                                sx={{
                                                    '&:hover': { bgcolor: PRIMARY_LIGHT },
                                                    borderBottom: '1px solid #F3F4F6',
                                                    transition: 'background-color 0.15s',
                                                }}
                                            >
                                                <TableCell sx={{ width: 50, borderBottom: '1px solid #F3F4F6', py: 1.2 }}>
                                                    <Typography sx={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 500 }}>
                                                        {idx + 1}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #F3F4F6', py: 1.2 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                                        <Avatar sx={{
                                                            width: 32, height: 32,
                                                            bgcolor: `${avColor}15`,
                                                            color: avColor,
                                                            fontSize: '11px', fontWeight: 700,
                                                            border: `1px solid ${avColor}33`,
                                                        }}>
                                                            {getInitials(row.name || '?')}
                                                        </Avatar>
                                                        <Box sx={{ minWidth: 0 }}>
                                                            <Typography sx={{
                                                                fontSize: '13px', fontWeight: 600,
                                                                color: '#111827', whiteSpace: 'nowrap',
                                                            }}>
                                                                {row.name || '—'}
                                                            </Typography>
                                                            <Typography sx={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 500 }}>
                                                                {row.rollNumber}{row.designation ? ` · ${row.designation}` : ''}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #F3F4F6', py: 1.2 }}>
                                                    {row.department && row.department !== '-' ? (
                                                        <Chip
                                                            label={row.department}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: '#F3F4F6', color: '#374151',
                                                                fontWeight: 600, fontSize: '10.5px', height: 22,
                                                                border: '1px solid #E5E7EB',
                                                                textTransform: 'capitalize',
                                                            }}
                                                        />
                                                    ) : (
                                                        <Typography sx={{ fontSize: '12px', color: '#CBD5E1' }}>—</Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #F3F4F6', py: 1.2 }}>
                                                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                                                        {formatINR(row.basicSalary)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #F3F4F6', py: 1.2 }}>
                                                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#6246E0' }}>
                                                        {formatINR(row.grossSalary)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #F3F4F6', py: 1.2 }}>
                                                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#DC2626' }}>
                                                        {formatINR(row.deductions)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #F3F4F6', py: 1.2 }}>
                                                    <Box sx={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 0.5,
                                                        px: 1, py: 0.4, borderRadius: '7px',
                                                        bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`,
                                                    }}>
                                                        <Typography sx={{ fontSize: '13px', fontWeight: 800, color: PRIMARY_DARK }}>
                                                            {formatINR(row.netSalary)}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #F3F4F6', py: 1.2 }}>
                                                    <Chip
                                                        size="small"
                                                        icon={isApproved
                                                            ? <CheckCircleIcon sx={{ fontSize: '12px !important' }} />
                                                            : <HourglassEmptyIcon sx={{ fontSize: '12px !important' }} />}
                                                        label={row.status}
                                                        sx={{
                                                            height: 22, fontSize: '10.5px', fontWeight: 700,
                                                            bgcolor: isApproved ? '#F1EEFE' : '#E0F2FE',
                                                            color: isApproved ? '#6246E0' : '#B45309',
                                                            border: `1px solid ${isApproved ? '#C9BEFB' : '#BAE6FD'}`,
                                                            '& .MuiChip-icon': { color: 'inherit', ml: '6px' },
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #F3F4F6', py: 1.2 }}>
                                                    <Tooltip arrow title="View & print payslip">
                                                        <Button
                                                            size="small"
                                                            startIcon={<PrintIcon sx={{ fontSize: 14 }} />}
                                                            onClick={() => handleViewPayslip(row)}
                                                            sx={{
                                                                textTransform: 'none', fontSize: 12, fontWeight: 700,
                                                                border: '1px solid #C9BEFB', borderRadius: '7px',
                                                                px: 1.5, py: 0.4,
                                                                color: '#6246E0', bgcolor: '#F3F0FE',
                                                                '&:hover': { bgcolor: '#DBEAFE', borderColor: '#93C5FD' },
                                                            }}
                                                        >
                                                            Payslip
                                                        </Button>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Card>
                </Box>
            </Box>

            {/* ─── Payslip Dialog ────────────────────────────────────────── */}
            <Dialog
                open={viewDialogOpen}
                onClose={handleCloseDialog}
                maxWidth="md"
                fullWidth
                slotProps={{
                    paper: { sx: { borderRadius: '7px', maxHeight: '95vh', overflow: 'hidden' } },
                }}
            >
                {/* Dialog header (hidden on print) */}
                <Box className="print-hide" sx={{
                    px: 2.5, py: 1.8,
                    background: `linear-gradient(135deg, ${PRIMARY_LIGHT} 0%, #fff 70%)`,
                    borderBottom: `1px solid ${PRIMARY_BORDER}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 1.5, flexWrap: 'wrap',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            width: 38, height: 38, borderRadius: '7px',
                            bgcolor: '#fff', border: `1px solid ${PRIMARY_BORDER}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <ReceiptLongIcon sx={{ color: PRIMARY, fontSize: 20 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>
                                {selectedEmployee?.name || 'Payslip'}
                            </Typography>
                            <Typography sx={{ fontSize: '11px', color: '#6B7280', mt: 0.3 }}>
                                Period: <strong style={{ color: '#374151' }}>{periodLabel}</strong>
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4, mr: 0.4 }}>
                            From
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <Select
                                value={fromMonth}
                                onChange={(e) => setFromMonth(e.target.value)}
                                sx={{
                                    fontSize: 12, height: 32, borderRadius: '7px', bgcolor: '#fff',
                                    '& fieldset': { borderColor: '#E5E7EB' },
                                    '&.Mui-focused fieldset': { borderColor: PRIMARY },
                                }}
                            >
                                {MONTHS.map((mo, i) => (
                                    <MenuItem key={i} value={i} sx={{ fontSize: 12 }}>{mo}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 76 }}>
                            <Select
                                value={fromYear}
                                onChange={(e) => setFromYear(e.target.value)}
                                sx={{
                                    fontSize: 12, height: 32, borderRadius: '7px', bgcolor: '#fff',
                                    '& fieldset': { borderColor: '#E5E7EB' },
                                    '&.Mui-focused fieldset': { borderColor: PRIMARY },
                                }}
                            >
                                {YEARS.map(y => (
                                    <MenuItem key={y} value={y} sx={{ fontSize: 12 }}>{y}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4, mx: 0.4 }}>
                            To
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <Select
                                value={toMonth}
                                onChange={(e) => setToMonth(e.target.value)}
                                sx={{
                                    fontSize: 12, height: 32, borderRadius: '7px', bgcolor: '#fff',
                                    '& fieldset': { borderColor: '#E5E7EB' },
                                    '&.Mui-focused fieldset': { borderColor: PRIMARY },
                                }}
                            >
                                {MONTHS.map((mo, i) => (
                                    <MenuItem key={i} value={i} sx={{ fontSize: 12 }}>{mo}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 76 }}>
                            <Select
                                value={toYear}
                                onChange={(e) => setToYear(e.target.value)}
                                sx={{
                                    fontSize: 12, height: 32, borderRadius: '7px', bgcolor: '#fff',
                                    '& fieldset': { borderColor: '#E5E7EB' },
                                    '&.Mui-focused fieldset': { borderColor: PRIMARY },
                                }}
                            >
                                {YEARS.map(y => (
                                    <MenuItem key={y} value={y} sx={{ fontSize: 12 }}>{y}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <IconButton
                            onClick={handleCloseDialog}
                            sx={{
                                width: 32, height: 32, borderRadius: '7px', ml: 0.5,
                                bgcolor: '#fff', border: '1px solid #E5E7EB',
                                '&:hover': { bgcolor: '#F9FAFB' },
                            }}
                        >
                            <CloseIcon sx={{ fontSize: 16, color: '#6B7280' }} />
                        </IconButton>
                    </Box>
                </Box>

                <DialogContent sx={{ p: 0, overflow: 'auto', bgcolor: '#fff' }}>
                    {payslipLoading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                            <CircularProgress sx={{ color: PRIMARY }} />
                        </Box>
                    )}

                    {!payslipLoading && payslipData && (
                        <Box id="payslip-print-content" sx={{ p: 3.5, bgcolor: '#fff' }}>

                            <Box sx={{
                                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                                pb: 2.5, mb: 2.5, borderBottom: '2px solid #111827',
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                    <Box sx={{
                                        width: 56, height: 56, borderRadius: '7px', flexShrink: 0,
                                        border: '1.5px solid #D1D5DB', overflow: 'hidden', bgcolor: '#F3F4F6',
                                    }}>
                                        <img
                                            src={websiteSettings.logo}
                                            alt="School Logo"
                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                        />
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>
                                            {websiteSettings.title}
                                        </Typography>
                                        {payslipData.company.address && (
                                            <Typography sx={{ fontSize: 10.5, color: '#6B7280', mt: 0.4 }}>
                                                {payslipData.company.address}
                                            </Typography>
                                        )}
                                        {(payslipData.company.phone || payslipData.company.email) && (
                                            <Typography sx={{ fontSize: 10.5, color: '#6B7280', mt: 0.2 }}>
                                                {payslipData.company.phone && `Ph: ${payslipData.company.phone}`}
                                                {payslipData.company.phone && payslipData.company.email && '  |  '}
                                                {payslipData.company.email && `Email: ${payslipData.company.email}`}
                                            </Typography>
                                        )}
                                        <Box sx={{ display: 'flex', gap: 2.5, mt: 0.3 }}>
                                            {payslipData.company.pfRegNo && (
                                                <Typography sx={{ fontSize: 10, color: '#9CA3AF' }}>
                                                    PF Reg No:&nbsp;<Box component="span" sx={{ fontWeight: 700, color: '#6B7280' }}>{payslipData.company.pfRegNo}</Box>
                                                </Typography>
                                            )}
                                            {payslipData.company.esiRegNo && (
                                                <Typography sx={{ fontSize: 10, color: '#9CA3AF' }}>
                                                    ESI Reg No:&nbsp;<Box component="span" sx={{ fontWeight: 700, color: '#6B7280' }}>{payslipData.company.esiRegNo}</Box>
                                                </Typography>
                                            )}
                                        </Box>
                                    </Box>
                                </Box>

                                <Box sx={{
                                    flexShrink: 0, textAlign: 'center',
                                    border: '1.5px solid #374151', borderRadius: '7px',
                                    px: 2.5, py: 1.5, bgcolor: '#fff',
                                }}>
                                    <Typography sx={{ fontSize: 12, fontWeight: 900, color: '#111827', letterSpacing: '1.5px' }}>
                                        SALARY SLIP
                                    </Typography>
                                    <Divider sx={{ my: 0.8, borderColor: '#D1D5DB' }} />
                                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1a1a1a' }}>
                                        {periodLabel}
                                    </Typography>
                                    <Typography sx={{ fontSize: 9.5, color: '#9CA3AF', mt: 0.4 }}>
                                        Generated: {payslipData.generatedOn}
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ mb: 2.5, border: '1px solid #D1D5DB', borderRadius: '7px', overflow: 'hidden' }}>
                                <Box sx={{ px: 2, py: 1, bgcolor: '#F3F4F6', borderBottom: '1px solid #D1D5DB', display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <BadgeIcon sx={{ fontSize: 14, color: '#374151' }} />
                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                                        Employee Information
                                    </Typography>
                                </Box>
                                <Box sx={{ p: 2 }}>
                                    <Grid container spacing={1.5}>
                                        {[
                                            ['Employee Name', payslipData.employeeInformation.employeeName],
                                            ['Employee ID', payslipData.employeeInformation.employeeId],
                                            ['Designation', payslipData.employeeInformation.designation],
                                            ['Department', payslipData.employeeInformation.department],
                                            ['Date of Joining', payslipData.employeeInformation.dateOfJoining],
                                            ['PAN Number', payslipData.employeeInformation.panNumber],
                                            ['Bank Account No.', payslipData.employeeInformation.bankAccountNoMasked
                                                ? `${payslipData.employeeInformation.bankAccountNoMasked}${payslipData.employeeInformation.bankName ? ` (${payslipData.employeeInformation.bankName})` : ''}`
                                                : '-'],
                                            ['UAN Number', payslipData.employeeInformation.uanNumber],
                                            ['PF Account No.', payslipData.employeeInformation.pfAccountNo],
                                            ['ESI IP Number', payslipData.employeeInformation.esiIpNumber],
                                        ].map(([label, value], i) => (
                                            <Grid key={i} size={{ xs: 6, sm: 4, md: 4, lg: 4 }}>
                                                <Typography sx={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                                                    {label}
                                                </Typography>
                                                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#111827', mt: 0.2 }}>
                                                    {value || '-'}
                                                </Typography>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>
                            </Box>

                            <Box sx={{ mb: 2.5, border: '1px solid #D1D5DB', borderRadius: '7px', overflow: 'hidden' }}>
                                <Box sx={{ px: 2, py: 1, bgcolor: '#F3F4F6', borderBottom: '1px solid #D1D5DB' }}>
                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                                        Attendance — {periodLabel}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex' }}>
                                    {[
                                        { label: 'Working Days',  value: payslipData.attendance.workingDays },
                                        { label: 'Present Days',  value: payslipData.attendance.presentDays  },
                                        { label: 'Absent Days',   value: payslipData.attendance.absentDays   },
                                        { label: 'LOP Days',      value: payslipData.attendance.lopDays      },
                                        { label: 'Paid Holidays', value: payslipData.attendance.paidHolidays },
                                    ].map((att, i, arr) => (
                                        <Box key={i} sx={{
                                            flex: 1, py: 2, textAlign: 'center',
                                            borderRight: i < arr.length - 1 ? '1px solid #E5E7EB' : 'none',
                                        }}>
                                            <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>{att.value}</Typography>
                                            <Typography sx={{ fontSize: 10, color: '#6B7280', mt: 0.3, fontWeight: 500 }}>{att.label}</Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>

                            <Grid container spacing={2} sx={{ mb: 2.5 }}>
                                <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
                                    <Box sx={{ border: '1px solid #D1D5DB', borderRadius: '7px', overflow: 'hidden', height: '100%' }}>
                                        <Box sx={{ px: 2, py: 1.2, bgcolor: '#F3F4F6', borderBottom: '2px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Earnings</Typography>
                                            <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF' }}>Amount (₹)</Typography>
                                        </Box>
                                        {[
                                            ['Basic Salary', payslipData.earnings.basicSalary],
                                            ['House Rent Allowance (HRA)', payslipData.earnings.hra],
                                            ['Dearness Allowance (DA)', payslipData.earnings.da],
                                            ['Transport Allowance', payslipData.earnings.transportAllowance],
                                            ['Special Allowance', payslipData.earnings.specialAllowance],
                                            ['Incentive / Special Pay', payslipData.earnings.incentive],
                                            ['Additional Salary', payslipData.earnings.additionalSalary],
                                        ].filter(([, v]) => v > 0).map(([label, value], i) => (
                                            <EarningRow key={i} label={label} value={value} />
                                        ))}
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1.2, bgcolor: '#F3F4F6', borderTop: '2px solid #374151' }}>
                                            <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#111827' }}>Gross Earnings</Typography>
                                            <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>₹{payslipData.earnings.grossEarnings.toLocaleString()}</Typography>
                                        </Box>
                                    </Box>
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
                                    <Box sx={{ border: '1px solid #D1D5DB', borderRadius: '7px', overflow: 'hidden', height: '100%' }}>
                                        <Box sx={{ px: 2, py: 1.2, bgcolor: '#F3F4F6', borderBottom: '2px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Deductions</Typography>
                                            <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF' }}>Amount (₹)</Typography>
                                        </Box>
                                        {[
                                            [payslipData.deductions.pfLabel,  payslipData.deductions.pfAmount],
                                            [payslipData.deductions.esiLabel, payslipData.deductions.esiAmount],
                                            [payslipData.deductions.ptLabel,  payslipData.deductions.ptAmount],
                                            [payslipData.deductions.tdsLabel, payslipData.deductions.tdsAmount],
                                        ].filter(([, v]) => v > 0).map(([label, value], i) => (
                                            <EarningRow key={i} label={label} value={value} />
                                        ))}
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1.2, bgcolor: '#F3F4F6', borderTop: '2px solid #374151' }}>
                                            <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#111827' }}>Total Deductions</Typography>
                                            <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>₹{payslipData.deductions.totalDeductions.toLocaleString()}</Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                            </Grid>

                            <Box sx={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                px: 3, py: 2.5, background: 'linear-gradient(135deg, #7C5CFC 0%, #9B87FB 100%)', boxShadow: '0 10px 22px -8px rgba(124,92,252,0.5)', borderRadius: '7px', mb: 3,
                            }}>
                                <Box>
                                    <Typography sx={{ fontSize: 9.5, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>
                                        Net Salary — Take Home Pay
                                    </Typography>
                                    <Typography sx={{ fontSize: 11, color: '#D1D5DB', mt: 0.5 }}>
                                        {periodLabel} &nbsp;·&nbsp; {payslipData.employeeInformation.employeeName} ({payslipData.employeeInformation.employeeId})
                                    </Typography>
                                </Box>
                                <Typography sx={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>
                                    ₹{payslipData.totals.netSalary.toLocaleString()}
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2.5, borderTop: '1px dashed #D1D5DB' }}>
                                {[
                                    payslipData.signature.employeeSignatureLabel,
                                    payslipData.signature.accountsManagerLabel,
                                    payslipData.signature.authorizedSignatoryLabel,
                                ].map((label, i) => (
                                    <Box key={i} sx={{ textAlign: 'center' }}>
                                        <Box sx={{ height: 36 }} />
                                        <Box sx={{ width: 130, borderBottom: '1.5px solid #9CA3AF', mx: 'auto', mb: 0.6 }} />
                                        <Typography sx={{ fontSize: 10, color: '#6B7280' }}>{label}</Typography>
                                    </Box>
                                ))}
                            </Box>

                            <Box sx={{ mt: 2.5, textAlign: 'center' }}>
                                <Typography sx={{ fontSize: 9, color: '#D1D5DB', letterSpacing: '0.3px' }}>
                                    {payslipData.footer.note} &nbsp;|&nbsp; Generated on {payslipData.generatedOn} &nbsp;|&nbsp; {websiteSettings.title}
                                </Typography>
                            </Box>

                        </Box>
                    )}
                </DialogContent>

                <DialogActions className="print-hide" sx={{ px: 2.5, py: 1.8, borderTop: '1px solid #E5E7EB', bgcolor: '#fff', gap: 1 }}>
                    <Button
                        onClick={handleCloseDialog}
                        sx={{
                            textTransform: 'none', fontSize: '13px', fontWeight: 600,
                            color: '#374151', borderRadius: '7px',
                            border: '1px solid #E5E7EB', px: 2, height: 38,
                            '&:hover': { bgcolor: '#F9FAFB' },
                        }}
                    >
                        Close
                    </Button>
                    <Button
                        variant="contained"
                        disableElevation
                        startIcon={<PrintIcon sx={{ fontSize: 18 }} />}
                        onClick={() => window.print()}
                        disabled={payslipLoading || !payslipData}
                        sx={{
                            textTransform: 'none', fontSize: '13px', fontWeight: 700,
                            background: 'linear-gradient(135deg, #7C5CFC 0%, #9B87FB 100%)', boxShadow: '0 10px 22px -8px rgba(124,92,252,0.5)', color: '#fff', borderRadius: '7px',
                            px: 2.5, height: 38,
                            border: '1.5px solid #0F172A',
                            '&:hover': { bgcolor: '#6246E0', borderColor: '#6246E0' },
                            '&.Mui-disabled': { bgcolor: '#E5E7EB', color: '#9CA3AF', borderColor: '#E5E7EB' },
                        }}
                    >
                        Print / Download PDF
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
