import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Button, Grid, IconButton,
    Card, CardContent, Chip, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, MenuItem, InputAdornment, Dialog,
    DialogContent, DialogActions, CircularProgress, Avatar, Tooltip, Paper,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DescriptionIcon from '@mui/icons-material/Description';
import HistoryIcon from '@mui/icons-material/History';
import AssessmentIcon from '@mui/icons-material/Assessment';
import VerifiedIcon from '@mui/icons-material/Verified';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import ApartmentIcon from '@mui/icons-material/Apartment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import SavingsIcon from '@mui/icons-material/Savings';
import AssignmentIcon from '@mui/icons-material/Assignment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectWebsiteSettings } from '../../../redux/slices/websiteSettingsSlice';
import * as XLSX from 'xlsx';
import axios from 'axios';
import SnackBar from '../../SnackBar';
import { salaryRegisterDashboard } from '../../../Api/Api';

// ─── Payroll Cycle Stages (mirrors PayrollOverview) ─────────────────────────
const PAYROLL_STAGES = [
    { key: 'attendance',  label: 'Attendance Cutoff', description: 'Lock monthly attendance',        icon: FactCheckIcon },
    { key: 'calculation', label: 'Salary Calculation', description: 'Compute gross / LOP / net',     icon: AssignmentIcon },
    { key: 'approval',    label: 'Manager Approval',   description: 'Review & approve register',     icon: HowToRegIcon },
    { key: 'paid',        label: 'Salary Credited',    description: 'Paid to bank & payslips shared', icon: SavingsIcon },
];

// Cycle key — one record per calendar month so each month tracks its own stage
const currentCycleKey = () => {
    const d = new Date();
    return `payroll-cycle-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

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

export default function SalaryRegister() {
    const navigate = useNavigate();
    const token = "123";
    const isExpanded = useSelector((state) => state.sidebar.isExpanded);
    const websiteSettings = useSelector(selectWebsiteSettings);
    const user = useSelector((state) => state.auth);
    const userType = user?.userType;
    const canApprove = userType === 'superadmin' || userType === 'admin';

    // Cycle stage — persisted per month in localStorage.
    // 1 = Salary Calculation (data loaded), 2 = Manager Approval done, 3 = Salary Credited.
    const [currentStage, setCurrentStage] = useState(() => {
        try {
            const stored = localStorage.getItem(currentCycleKey());
            return stored ? Number(stored) : 2; // default: awaiting Manager Approval
        } catch {
            return 2;
        }
    });

    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [creditDialogOpen, setCreditDialogOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('All');
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    const [stats, setStats] = useState({
        totalGrossSalary: 0,
        totalNetSalary: 0,
        totalDeductions: 0,
        totalEmployees: 0,
    });
    const [records, setRecords] = useState([]);

    const [snackOpen, setSnackOpen] = useState(false);
    const [snackStatus, setSnackStatus] = useState(false);
    const [snackColor, setSnackColor] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const showSnack = (msg, success) => {
        setSnackMessage(msg); setSnackOpen(true); setSnackColor(success); setSnackStatus(success);
    };

    const fetchSalaryRegister = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(salaryRegisterDashboard, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.data.error) {
                const d = res.data.data;
                setStats({
                    totalGrossSalary: d.totalGrossSalary,
                    totalNetSalary: d.totalNetSalary,
                    totalDeductions: d.totalDeductions,
                    totalEmployees: d.totalEmployees,
                });
                setRecords(d.records);
            }
        } catch {
            showSnack('Failed to load salary register', false);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSalaryRegister();
    }, []);

    const departments = useMemo(
        () => ['All', ...new Set(records.map(r => r.department).filter(Boolean))],
        [records],
    );

    const filteredData = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return records.filter(emp => {
            const matchesSearch = !q
                || (emp.name || '').toLowerCase().includes(q)
                || (emp.rollNumber || '').toLowerCase().includes(q);
            const matchesDept = selectedDepartment === 'All' || emp.department === selectedDepartment;
            return matchesSearch && matchesDept;
        });
    }, [records, searchTerm, selectedDepartment]);

    const searchActive = searchTerm.trim().length > 0;
    const deptActive = selectedDepartment !== 'All';
    const anyFilterActive = searchActive || deptActive;

    const handleViewDetails = (employee) => {
        setSelectedEmployee(employee);
        setOpenDialog(true);
    };

    const handlePrintPayslip = () => {
        window.print();
    };

    const handleExportRegister = () => {
        const excelData = filteredData.map((emp, index) => ({
            'S.No': index + 1,
            'Roll Number': emp.rollNumber,
            'Employee': emp.name,
            'Designation': emp.designation,
            'Department': emp.department,
            'Basic Salary': emp.basicSalary,
            'Gross Salary': emp.grossSalary,
            'Deductions': emp.deductions,
            'Net Salary': emp.netSalary,
            'Payment Date': emp.paymentDate,
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        ws['!cols'] = [
            { wch: 8 }, { wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 15 },
            { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Salary Register');
        const fileName = `Salary_Register_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        showSnack('Salary register exported successfully!', true);
    };

    // ─── Cycle stage actions ────────────────────────────────────────────────
    const persistStage = (stage) => {
        setCurrentStage(stage);
        try {
            localStorage.setItem(currentCycleKey(), String(stage));
        } catch {
            // localStorage may be unavailable in some environments — fail silently
        }
    };

    const handleApproveRegister = async () => {
        setActionLoading(true);
        // Simulate a brief API call. Replace with axios.post to your approval endpoint when available.
        await new Promise(r => setTimeout(r, 400));
        persistStage(3);
        setActionLoading(false);
        setApproveDialogOpen(false);
        showSnack('Salary register approved — ready for disbursement', true);
    };

    const handleMarkCredited = async () => {
        setActionLoading(true);
        await new Promise(r => setTimeout(r, 400));
        persistStage(4);
        setActionLoading(false);
        setCreditDialogOpen(false);
        showSnack('Salaries marked as credited — payslips can be shared', true);
    };

    // Cycle UI helpers
    const stageMeta = currentStage >= PAYROLL_STAGES.length
        ? { label: 'Cycle Complete', tone: '#16A34A', bg: '#DBEAFE', border: '#86EFAC' }
        : currentStage === 3
            ? { label: PAYROLL_STAGES[3].label, tone: '#F59E0B', bg: '#E0F2FE', border: '#BAE6FD' }
            : currentStage === 2
                ? { label: PAYROLL_STAGES[2].label, tone: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' }
                : { label: PAYROLL_STAGES[Math.max(0, currentStage)].label, tone: '#6246E0', bg: '#F3F0FE', border: '#C9BEFB' };

    const cycleMonthLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const kpiCards = [
        {
            label: 'Total Gross Salary',
            value: formatINR(stats.totalGrossSalary),
            sub: 'across all employees',
            color: '#7C5CFC', bg: '#F1EEFE', border: '#C9BEFB',
            icon: AssessmentIcon,
        },
        {
            label: 'Total Net Payout',
            value: formatINR(stats.totalNetSalary),
            sub: 'after all deductions',
            color: '#6246E0', bg: '#F3F0FE', border: '#C9BEFB',
            icon: VerifiedIcon,
        },
        {
            label: 'Total Deductions',
            value: formatINR(stats.totalDeductions),
            sub: 'statutory + others',
            color: '#DC2626', bg: '#FEF2F2', border: '#FECACA',
            icon: DescriptionIcon,
        },
        {
            label: 'Total Employees',
            value: stats.totalEmployees,
            sub: 'on register',
            color: '#2563EB', bg: '#F3F0FE', border: '#C9BEFB',
            icon: HistoryIcon,
        },
    ];

    return (
        <>
            <SnackBar open={snackOpen} color={snackColor} setOpen={setSnackOpen} status={snackStatus} message={snackMessage} />

            <style>
                {`
                    @page { size: A4; margin: 15mm; }
                    @media print {
                        body * { visibility: hidden; }
                        #payslip-print-content, #payslip-print-content * { visibility: visible; }
                        #payslip-print-content { position: absolute; left: 0; top: 0; width: 100%; padding: 10px; }
                        .print-hide { display: none !important; }
                        .MuiDialog-paper { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; }
                        .print-no-break { page-break-inside: avoid !important; break-inside: avoid !important; }
                        .MuiCard-root { margin-bottom: 8px !important; page-break-inside: avoid !important; }
                        .MuiCardContent-root { padding: 12px !important; }
                        #payslip-print-content { transform: scale(0.95); transform-origin: top left; }
                    }
                `}
            </style>

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
                            <DescriptionIcon sx={{ color: PRIMARY, fontSize: 20 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>
                                Audit-ready Salary Register
                            </Typography>
                            <Typography sx={{ fontSize: '11.5px', color: '#6B7280', mt: 0.3 }}>
                                Comprehensive salary records for audit and compliance
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Department pill select */}
                        <TextField
                            select
                            size="small"
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <ApartmentIcon sx={{ fontSize: 16, color: deptActive ? PRIMARY : '#9CA3AF' }} />
                                        </InputAdornment>
                                    ),
                                    sx: {
                                        padding: '0 12px',
                                        borderRadius: '50px',
                                        height: '32px',
                                        fontSize: '12px',
                                    },
                                },
                            }}
                            sx={{
                                width: { xs: '100%', sm: 180 },
                                '& .MuiOutlinedInput-root': {
                                    minHeight: '32px',
                                    bgcolor: deptActive ? PRIMARY_LIGHT : '#fff',
                                    '& fieldset': { borderColor: deptActive ? PRIMARY_BORDER : '#E5E7EB' },
                                },
                                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: websiteSettings.mainColor,
                                },
                            }}
                        >
                            {departments.map(dept => (
                                <MenuItem key={dept} value={dept} sx={{ fontSize: '12.5px' }}>
                                    {dept === 'All' ? 'All Departments' : dept}
                                </MenuItem>
                            ))}
                        </TextField>

                        {/* Search pill */}
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Search by name or roll no..."
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
                                width: { xs: '100%', sm: 240 },
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

                        {/* Export button — dark pill */}
                        <Button
                            variant="contained"
                            disableElevation
                            startIcon={<DownloadIcon sx={{ fontSize: 18 }} />}
                            onClick={handleExportRegister}
                            sx={{
                                textTransform: 'none',
                                background: 'linear-gradient(135deg, #7C5CFC 0%, #9B87FB 100%)', boxShadow: '0 10px 22px -8px rgba(124,92,252,0.5)',
                                color: '#fff',
                                borderRadius: '30px',
                                fontSize: '12.5px',
                                fontWeight: 700,
                                px: 2.4, height: 34,
                                boxShadow: 'none',
                                border: '1.5px solid #0F172A',
                                '&:hover': {
                                    bgcolor: '#6246E0',
                                    borderColor: '#6246E0',
                                    boxShadow: 'none',
                                },
                            }}
                        >
                            Export Excel
                        </Button>
                    </Box>
                </Box>

                {/* ─── Body ────────────────────────────────────────────────── */}
                <Box sx={{ flex: 1, pt: "14px", pb: 2, px: 2 }}>

                    {/* ─── Payroll Cycle Progress ──────────────────────────── */}
                    <Paper elevation={0} sx={{
                        p: 2, mb: 2,
                        borderRadius: '7px',
                        border: '1px solid #E5E7EB',
                        bgcolor: '#FAFBFD',
                    }}>
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 1.8,
                            flexWrap: 'wrap',
                            gap: 1,
                        }}>
                            <Box>
                                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                                    Payroll Cycle — {cycleMonthLabel}
                                </Typography>
                                <Typography sx={{ fontSize: '11px', color: '#6B7280' }}>
                                    Track the processing stage of this month's payroll
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                <Chip
                                    icon={currentStage >= PAYROLL_STAGES.length
                                        ? <CheckCircleIcon sx={{ fontSize: '14px !important' }} />
                                        : <PendingActionsIcon sx={{ fontSize: '14px !important' }} />}
                                    label={currentStage >= PAYROLL_STAGES.length
                                        ? 'Payroll Cycle Complete'
                                        : `Currently at: ${stageMeta.label}`}
                                    sx={{
                                        bgcolor: stageMeta.bg,
                                        color: stageMeta.tone,
                                        border: `1px solid ${stageMeta.border}`,
                                        fontWeight: 700, fontSize: '11px', height: 26,
                                        '& .MuiChip-icon': { color: stageMeta.tone },
                                    }}
                                />
                                {/* Action button based on stage */}
                                {canApprove && currentStage === 2 && (
                                    <Button
                                        variant="contained"
                                        disableElevation
                                        startIcon={<HowToRegIcon sx={{ fontSize: 16 }} />}
                                        onClick={() => setApproveDialogOpen(true)}
                                        sx={{
                                            textTransform: 'none', fontSize: '12.5px', fontWeight: 700,
                                            background: 'linear-gradient(135deg, #7C5CFC 0%, #9B87FB 100%)', boxShadow: '0 10px 22px -8px rgba(124,92,252,0.5)', color: '#fff',
                                            borderRadius: '30px',
                                            px: 2.2, height: 32,
                                            border: '1.5px solid #0F172A',
                                            '&:hover': { bgcolor: '#6246E0', borderColor: '#6246E0' },
                                        }}
                                    >
                                        Approve Register
                                    </Button>
                                )}
                                {canApprove && currentStage === 3 && (
                                    <Button
                                        variant="contained"
                                        disableElevation
                                        startIcon={<SavingsIcon sx={{ fontSize: 16 }} />}
                                        onClick={() => setCreditDialogOpen(true)}
                                        sx={{
                                            textTransform: 'none', fontSize: '12.5px', fontWeight: 700,
                                            bgcolor: PRIMARY, color: '#fff',
                                            borderRadius: '30px',
                                            px: 2.2, height: 32,
                                            border: `1.5px solid ${PRIMARY}`,
                                            '&:hover': { bgcolor: PRIMARY_DARK, borderColor: PRIMARY_DARK },
                                        }}
                                    >
                                        Mark as Salary Credited
                                    </Button>
                                )}
                                {!canApprove && (
                                    <Chip
                                        icon={<LockOutlinedIcon sx={{ fontSize: '12px !important' }} />}
                                        label="Read-only access"
                                        size="small"
                                        sx={{
                                            bgcolor: '#F3F4F6', color: '#6B7280',
                                            border: '1px solid #E5E7EB',
                                            fontWeight: 600, fontSize: '10.5px', height: 24,
                                            '& .MuiChip-icon': { color: '#6B7280', ml: '6px' },
                                        }}
                                    />
                                )}
                            </Box>
                        </Box>

                        {/* Stage Timeline */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, position: 'relative' }}>
                            {PAYROLL_STAGES.map((stage, idx) => {
                                const Icon = stage.icon;
                                const isDone = idx < currentStage;
                                const isCurrent = idx === currentStage && currentStage < PAYROLL_STAGES.length;
                                const color = isDone ? '#16A34A' : isCurrent ? stageMeta.tone : '#CBD5E1';
                                const bg = isDone ? '#DBEAFE' : isCurrent ? stageMeta.bg : '#F3F4F6';
                                return (
                                    <React.Fragment key={stage.key}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                            <Avatar sx={{
                                                width: 40, height: 40, bgcolor: bg,
                                                border: `2px solid ${color}`,
                                                boxShadow: isCurrent ? `0 0 0 4px ${color}20` : 'none',
                                            }}>
                                                {isDone
                                                    ? <CheckCircleIcon sx={{ color, fontSize: 22 }} />
                                                    : <Icon sx={{ color, fontSize: 20 }} />}
                                            </Avatar>
                                            <Typography sx={{
                                                fontSize: '11px', fontWeight: 700,
                                                color: isCurrent ? stageMeta.tone : isDone ? '#16A34A' : '#374151',
                                                mt: 0.7, textAlign: 'center',
                                            }} noWrap>
                                                {stage.label}
                                            </Typography>
                                            <Typography sx={{ fontSize: '9.5px', color: '#9CA3AF', textAlign: 'center' }} noWrap>
                                                {stage.description}
                                            </Typography>
                                        </Box>
                                        {idx < PAYROLL_STAGES.length - 1 && (
                                            <Box sx={{
                                                flex: 0.7, height: 2,
                                                bgcolor: idx < currentStage ? '#16A34A' : '#E5E7EB',
                                                mb: 3.5, minWidth: 20,
                                            }} />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </Box>
                    </Paper>

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

                    {/* Salary Register Table */}
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
                                    <DescriptionIcon sx={{ fontSize: 16, color: PRIMARY }} />
                                </Box>
                                <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                                    Salary Register
                                </Typography>
                                <Chip
                                    label={`${records.length} records`}
                                    size="small"
                                    sx={{
                                        bgcolor: '#F3F4F6', color: '#374151',
                                        fontWeight: 600, fontSize: '11px', height: 20,
                                    }}
                                />
                            </Box>

                            {anyFilterActive && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                    <Typography sx={{ fontSize: '11.5px', color: '#6B7280' }}>
                                        Showing
                                    </Typography>
                                    <Typography sx={{ fontSize: '13px', fontWeight: 800, color: PRIMARY_DARK }}>
                                        {filteredData.length}
                                    </Typography>
                                    <Typography sx={{ fontSize: '11.5px', color: '#6B7280' }}>
                                        of {records.length}
                                    </Typography>
                                    <Button
                                        size="small"
                                        startIcon={<RestartAltIcon sx={{ fontSize: 14 }} />}
                                        onClick={() => { setSearchTerm(''); setSelectedDepartment('All'); }}
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
                                            'S.No', 'Employee', 'Department', 'Basic Salary',
                                            'Gross Salary', 'Deductions', 'Net Salary', 'Payment Date', 'Actions',
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
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={9} align="center" sx={{ py: 6, borderBottom: 'none' }}>
                                                <CircularProgress size={28} sx={{ color: PRIMARY }} />
                                                <Typography sx={{ fontSize: '12px', color: '#9CA3AF', mt: 1.2 }}>
                                                    Loading salary register…
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
                                                    <DescriptionIcon sx={{ fontSize: 28, color: '#9CA3AF' }} />
                                                </Box>
                                                <Typography sx={{ fontSize: '13px', color: '#6B7280', fontWeight: 600 }}>
                                                    {anyFilterActive ? 'No matching salary records' : 'No salary records yet'}
                                                </Typography>
                                                <Typography sx={{ fontSize: '11.5px', color: '#9CA3AF', mt: 0.4 }}>
                                                    {anyFilterActive ? 'Try adjusting filters or search term' : 'Records will appear here once payroll is processed'}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredData.map((row, idx) => {
                                        const avColor = avatarColorFor(row.name || '');
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
                                                    {row.department ? (
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
                                                    <Typography sx={{ fontSize: '12.5px', color: '#374151', fontWeight: 500 }}>
                                                        {row.paymentDate || '—'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #F3F4F6', py: 1.2 }}>
                                                    <Tooltip arrow title="View payslip">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleViewDetails(row)}
                                                            sx={{
                                                                bgcolor: '#F3F0FE', borderRadius: '7px',
                                                                border: '1px solid #C9BEFB',
                                                                '&:hover': { bgcolor: '#DBEAFE' },
                                                            }}
                                                        >
                                                            <VisibilityIcon sx={{ fontSize: 14, color: '#6246E0' }} />
                                                        </IconButton>
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
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                maxWidth="sm"
                fullWidth
                slotProps={{
                    paper: { sx: { borderRadius: '7px', overflow: 'hidden' } },
                }}
            >
                {/* Dialog header (hidden on print) */}
                <Box className="print-hide" sx={{
                    px: 2.5, py: 2,
                    background: `linear-gradient(135deg, ${PRIMARY_LIGHT} 0%, #fff 70%)`,
                    borderBottom: `1px solid ${PRIMARY_BORDER}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            width: 40, height: 40, borderRadius: '7px',
                            bgcolor: '#fff', border: `1px solid ${PRIMARY_BORDER}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <DescriptionIcon sx={{ color: PRIMARY, fontSize: 20 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>
                                Salary Breakdown
                            </Typography>
                            <Typography sx={{ fontSize: '11.5px', color: '#6B7280', mt: 0.3 }}>
                                {selectedEmployee
                                    ? `${selectedEmployee.name} (${selectedEmployee.rollNumber})${selectedEmployee.designation ? ` · ${selectedEmployee.designation}` : ''}`
                                    : 'Detailed payslip view'}
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton
                        onClick={() => setOpenDialog(false)}
                        sx={{
                            width: 32, height: 32, borderRadius: '7px',
                            bgcolor: '#fff', border: '1px solid #E5E7EB',
                            '&:hover': { bgcolor: '#F9FAFB' },
                        }}
                    >
                        <CloseIcon sx={{ fontSize: 16, color: '#6B7280' }} />
                    </IconButton>
                </Box>

                <DialogContent id="payslip-print-content" sx={{ p: 2.5, bgcolor: '#F9FAFB' }}>
                    {selectedEmployee && (
                        <Box>
                            {/* Print-only header */}
                            <Box className="print-no-break" sx={{
                                display: 'none',
                                '@media print': { display: 'block' },
                                mb: 3, pb: 2,
                                borderBottom: `3px solid ${PRIMARY}`,
                            }}>
                                <Typography sx={{ fontSize: '24px', fontWeight: 800, textAlign: 'center', color: PRIMARY, mb: 1 }}>
                                    SCHOOLMATE
                                </Typography>
                                <Typography sx={{ fontSize: '20px', fontWeight: 700, textAlign: 'center', mb: 2 }}>
                                    SALARY SLIP
                                </Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2 }}>
                                    <Box>
                                        <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>
                                            {selectedEmployee.name}
                                        </Typography>
                                        <Typography sx={{ fontSize: '12px', color: '#64748B' }}>
                                            {selectedEmployee.rollNumber} · {selectedEmployee.designation}
                                        </Typography>
                                        <Typography sx={{ fontSize: '12px', color: '#64748B', textTransform: 'capitalize' }}>
                                            {selectedEmployee.department}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography sx={{ fontSize: '12px', color: '#64748B' }}>
                                            Payment Date: {selectedEmployee.paymentDate}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>

                            {/* Employee identity card */}
                            <Box className="print-no-break" sx={{
                                p: 2, mb: 2,
                                bgcolor: '#fff', borderRadius: '7px',
                                border: '1px solid #E5E7EB',
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                    <Box sx={{
                                        width: 24, height: 24, borderRadius: '7px',
                                        bgcolor: '#F3F0FE', border: '1px solid #C9BEFB',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <BadgeOutlinedIcon sx={{ fontSize: 14, color: '#6246E0' }} />
                                    </Box>
                                    <Typography sx={{
                                        fontSize: '11px', fontWeight: 700, color: '#374151',
                                        textTransform: 'uppercase', letterSpacing: 0.6,
                                    }}>
                                        Employee
                                    </Typography>
                                </Box>

                                <Grid container spacing={1.5}>
                                    <Grid size={{ xs: 6 }}>
                                        <Typography sx={{ fontSize: '10.5px', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                            Employee Name
                                        </Typography>
                                        <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#111827', mt: 0.3 }}>
                                            {selectedEmployee.name}
                                        </Typography>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <Typography sx={{ fontSize: '10.5px', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                            Roll Number
                                        </Typography>
                                        <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#111827', mt: 0.3 }}>
                                            {selectedEmployee.rollNumber}
                                        </Typography>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <Typography sx={{ fontSize: '10.5px', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                            Designation
                                        </Typography>
                                        <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#111827', mt: 0.3, textTransform: 'capitalize' }}>
                                            {selectedEmployee.designation || '—'}
                                        </Typography>
                                    </Grid>
                                    <Grid size={{ xs: 6 }}>
                                        <Typography sx={{ fontSize: '10.5px', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                            Department
                                        </Typography>
                                        <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#111827', mt: 0.3, textTransform: 'capitalize' }}>
                                            {selectedEmployee.department || '—'}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Box>

                            {/* Salary Breakdown */}
                            <Box className="print-no-break" sx={{
                                p: 2, mb: 2,
                                bgcolor: '#fff', borderRadius: '7px',
                                border: '1px solid #E5E7EB',
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                    <Box sx={{
                                        width: 24, height: 24, borderRadius: '7px',
                                        bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <AssessmentIcon sx={{ fontSize: 14, color: PRIMARY }} />
                                    </Box>
                                    <Typography sx={{
                                        fontSize: '11px', fontWeight: 700, color: '#374151',
                                        textTransform: 'uppercase', letterSpacing: 0.6,
                                    }}>
                                        Salary Breakdown
                                    </Typography>
                                </Box>

                                {[
                                    { label: 'Basic Salary', value: selectedEmployee.basicSalary, color: '#111827' },
                                    { label: 'Gross Salary', value: selectedEmployee.grossSalary, color: '#6246E0' },
                                    { label: 'Total Deductions', value: selectedEmployee.deductions, color: '#DC2626' },
                                ].map((row, i, arr) => (
                                    <Box
                                        key={row.label}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            py: 1.2,
                                            borderBottom: i < arr.length - 1 ? '1px dashed #E5E7EB' : 'none',
                                        }}
                                    >
                                        <Typography sx={{ fontSize: '12.5px', color: '#6B7280', fontWeight: 600 }}>
                                            {row.label}
                                        </Typography>
                                        <Typography sx={{ fontSize: '13px', fontWeight: 700, color: row.color }}>
                                            {formatINR(row.value)}
                                        </Typography>
                                    </Box>
                                ))}

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1.2, mt: 0.5, borderTop: '1px solid #E5E7EB' }}>
                                    <Typography sx={{ fontSize: '11.5px', color: '#9CA3AF', fontWeight: 600 }}>
                                        Payment Date
                                    </Typography>
                                    <Typography sx={{ fontSize: '12.5px', fontWeight: 600, color: '#374151' }}>
                                        {selectedEmployee.paymentDate || '—'}
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Net Salary */}
                            <Box className="print-no-break">
                                <Box sx={{
                                    p: 2, borderRadius: '7px',
                                    border: `1px solid ${PRIMARY_BORDER}`,
                                    background: `linear-gradient(135deg, ${PRIMARY_LIGHT} 0%, #fff 70%)`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    flexWrap: 'wrap', gap: 1.5,
                                }}>
                                    <Box>
                                        <Typography sx={{
                                            fontSize: '11px', fontWeight: 700, color: PRIMARY_DARK,
                                            textTransform: 'uppercase', letterSpacing: 0.6,
                                        }}>
                                            Net Salary (Take Home)
                                        </Typography>
                                        <Typography sx={{ fontSize: '26px', fontWeight: 800, color: PRIMARY_DARK, lineHeight: 1.1, mt: 0.4 }}>
                                            {formatINR(selectedEmployee.netSalary)}
                                        </Typography>
                                        <Typography sx={{ fontSize: '10.5px', color: '#4B5563', mt: 0.4 }}>
                                            Disbursed to registered bank account
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label="Bank Transfer"
                                        sx={{
                                            bgcolor: PRIMARY, color: '#fff',
                                            fontWeight: 700, fontSize: '11px', height: 24,
                                            borderRadius: '20px', px: 0.5,
                                        }}
                                    />
                                </Box>
                            </Box>
                        </Box>
                    )}
                </DialogContent>

                <DialogActions className="print-hide" sx={{ px: 2.5, py: 1.8, borderTop: '1px solid #E5E7EB', bgcolor: '#fff' }}>
                    <Button
                        onClick={() => setOpenDialog(false)}
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
                        startIcon={<PrintIcon sx={{ fontSize: 18 }} />}
                        onClick={handlePrintPayslip}
                        sx={{
                            textTransform: 'none', fontSize: '13px', fontWeight: 700,
                            bgcolor: PRIMARY, color: '#fff', borderRadius: '7px',
                            px: 2.5, height: 38,
                            boxShadow: `0 2px 6px ${PRIMARY}33`,
                            '&:hover': { bgcolor: PRIMARY_DARK, boxShadow: `0 4px 12px ${PRIMARY}55` },
                        }}
                    >
                        Print Payslip
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ─── Approve Register Confirmation ─────────────────────────── */}
            <Dialog
                open={approveDialogOpen}
                onClose={() => !actionLoading && setApproveDialogOpen(false)}
                maxWidth="xs"
                fullWidth
                slotProps={{
                    paper: { sx: { borderRadius: '7px', overflow: 'hidden' } },
                }}
            >
                <DialogContent sx={{ pt: 3.5, pb: 2, textAlign: 'center' }}>
                    <Box sx={{
                        width: 64, height: 64, borderRadius: '50%',
                        bgcolor: '#F3F0FE', border: '4px solid #DBEAFE',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        mx: 'auto', mb: 1.8,
                    }}>
                        <HowToRegIcon sx={{ fontSize: 32, color: '#6246E0' }} />
                    </Box>
                    <Typography sx={{ fontSize: '17px', fontWeight: 800, color: '#111827', mb: 0.8 }}>
                        Approve Salary Register?
                    </Typography>
                    <Typography sx={{ fontSize: '12.5px', color: '#6B7280', px: 1.5, lineHeight: 1.5 }}>
                        You're approving the salary register for{' '}
                        <strong style={{ color: '#111827' }}>{cycleMonthLabel}</strong>{' '}
                        covering <strong style={{ color: '#111827' }}>{records.length} employees</strong>
                        {' '}and a net payout of <strong style={{ color: PRIMARY_DARK }}>{formatINR(stats.totalNetSalary)}</strong>.
                        This will move the cycle to <strong>Salary Credited</strong>.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
                    <Button
                        fullWidth
                        onClick={() => setApproveDialogOpen(false)}
                        disabled={actionLoading}
                        sx={{
                            textTransform: 'none', fontSize: '13px', fontWeight: 600,
                            borderRadius: '7px', height: 38,
                            border: '1px solid #E5E7EB', color: '#374151',
                            '&:hover': { bgcolor: '#F9FAFB' },
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        fullWidth
                        variant="contained"
                        disableElevation
                        startIcon={actionLoading
                            ? <CircularProgress size={14} sx={{ color: '#fff' }} />
                            : <HowToRegIcon sx={{ fontSize: 16 }} />}
                        onClick={handleApproveRegister}
                        disabled={actionLoading}
                        sx={{
                            textTransform: 'none', fontSize: '13px', fontWeight: 700,
                            borderRadius: '7px', height: 38,
                            background: 'linear-gradient(135deg, #7C5CFC 0%, #9B87FB 100%)', boxShadow: '0 10px 22px -8px rgba(124,92,252,0.5)', color: '#fff',
                            border: '1.5px solid #0F172A',
                            '&:hover': { bgcolor: '#6246E0', borderColor: '#6246E0' },
                            '&.Mui-disabled': { bgcolor: '#E5E7EB', color: '#9CA3AF', borderColor: '#E5E7EB' },
                        }}
                    >
                        {actionLoading ? 'Approving…' : 'Yes, Approve'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ─── Mark as Credited Confirmation ─────────────────────────── */}
            <Dialog
                open={creditDialogOpen}
                onClose={() => !actionLoading && setCreditDialogOpen(false)}
                maxWidth="xs"
                fullWidth
                slotProps={{
                    paper: { sx: { borderRadius: '7px', overflow: 'hidden' } },
                }}
            >
                <DialogContent sx={{ pt: 3.5, pb: 2, textAlign: 'center' }}>
                    <Box sx={{
                        width: 64, height: 64, borderRadius: '50%',
                        bgcolor: PRIMARY_LIGHT, border: `4px solid ${PRIMARY_BORDER}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        mx: 'auto', mb: 1.8,
                    }}>
                        <SavingsIcon sx={{ fontSize: 32, color: PRIMARY }} />
                    </Box>
                    <Typography sx={{ fontSize: '17px', fontWeight: 800, color: '#111827', mb: 0.8 }}>
                        Mark Salary as Credited?
                    </Typography>
                    <Typography sx={{ fontSize: '12.5px', color: '#6B7280', px: 1.5, lineHeight: 1.5 }}>
                        Confirm that <strong style={{ color: PRIMARY_DARK }}>{formatINR(stats.totalNetSalary)}</strong>
                        {' '}has been disbursed to the registered bank accounts of{' '}
                        <strong style={{ color: '#111827' }}>{records.length} employees</strong>.
                        Once confirmed, the payroll cycle for <strong style={{ color: '#111827' }}>{cycleMonthLabel}</strong> will be marked complete.
                    </Typography>

                    <Box sx={{
                        mt: 2, p: 1.2, borderRadius: '7px',
                        bgcolor: '#E0F2FE', border: '1px solid #BAE6FD',
                        display: 'flex', alignItems: 'flex-start', gap: 1, textAlign: 'left',
                    }}>
                        <WarningAmberIcon sx={{ fontSize: 16, color: '#B45309', mt: 0.1, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '11px', color: '#92400E', lineHeight: 1.4 }}>
                            This action is final for this cycle. Make sure bank transfers are confirmed before marking as credited.
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
                    <Button
                        fullWidth
                        onClick={() => setCreditDialogOpen(false)}
                        disabled={actionLoading}
                        sx={{
                            textTransform: 'none', fontSize: '13px', fontWeight: 600,
                            borderRadius: '7px', height: 38,
                            border: '1px solid #E5E7EB', color: '#374151',
                            '&:hover': { bgcolor: '#F9FAFB' },
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        fullWidth
                        variant="contained"
                        disableElevation
                        startIcon={actionLoading
                            ? <CircularProgress size={14} sx={{ color: '#fff' }} />
                            : <CheckCircleIcon sx={{ fontSize: 16 }} />}
                        onClick={handleMarkCredited}
                        disabled={actionLoading}
                        sx={{
                            textTransform: 'none', fontSize: '13px', fontWeight: 700,
                            borderRadius: '7px', height: 38,
                            bgcolor: PRIMARY, color: '#fff',
                            border: `1.5px solid ${PRIMARY}`,
                            '&:hover': { bgcolor: PRIMARY_DARK, borderColor: PRIMARY_DARK },
                            '&.Mui-disabled': { bgcolor: '#E5E7EB', color: '#9CA3AF', borderColor: '#E5E7EB' },
                        }}
                    >
                        {actionLoading ? 'Confirming…' : 'Yes, Mark Credited'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
