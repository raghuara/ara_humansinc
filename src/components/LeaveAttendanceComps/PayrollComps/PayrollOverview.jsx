import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Grid, Card, CardContent, Divider, IconButton, Chip, Button,
    Paper, LinearProgress, Avatar, Stack, Select, MenuItem, Tooltip,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import DescriptionIcon from '@mui/icons-material/Description';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlineRounded';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import SavingsIcon from '@mui/icons-material/Savings';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

// ─── Payroll Module Cards (existing) ────────────────────────────────────────
const payrollModules = [
    { color: '#8600BB', icon: AssignmentIcon, text: 'Create Salary Structures', description: 'Configure salary components and define earnings / deduction rules for employee categories and salary grades.', bgColor: '#f9f4fc', iconBgColor: '#8600BB1A', path: 'salary-structures' },
    { color: '#6246E0', icon: AccountBalanceIcon, text: 'Auto-Deductions & Compliance', description: 'Manage statutory deductions: Provident Fund (PF), ESI, Professional Tax (PT), TDS settings for payroll compliance.', bgColor: '#F3F0FE', iconBgColor: '#6246E01A', path: 'compliance' },
    { color: '#00ACC1', icon: ReceiptLongIcon, text: 'Bank Details', description: 'Manage employee bank account details for salary disbursement and maintain records for payroll processing.', bgColor: '#E0F7FA', iconBgColor: '#00ACC11A', path: 'bank-reports' },
    { color: '#E30053', icon: DescriptionIcon, text: 'Audit-Ready Salary Register', description: 'View and export detailed salary breakdowns per employee including earnings, deductions, and net pay for each month.', bgColor: '#FCF8F9', iconBgColor: '#fbebf1', path: 'salary-register' },
    { color: '#FF9800', icon: TaskAltIcon, text: 'Run & Approve Payroll', description: 'Process monthly payroll, approve salary disbursement, and download professional payslips for employees.', bgColor: '#FFF4E6', iconBgColor: '#FF98001A', path: 'approve-payroll' },
    { color: '#7C5CFC', icon: SavingsIcon, text: 'Mark Salary Credited', description: 'Record salary as credited for any month — including past-month salaries paid in the current month, with a credited-on date.', bgColor: '#F1EEFE', iconBgColor: '#7C5CFC1A', path: 'salary-credit' },
];

// ─── Payroll Cycle Stages ───────────────────────────────────────────────────
const PAYROLL_STAGES = [
    { key: 'attendance', label: 'Attendance Cutoff', description: 'Lock monthly attendance', icon: FactCheckIcon },
    { key: 'calculation', label: 'Salary Calculation', description: 'Compute gross / LOP / net', icon: AssignmentIcon },
    { key: 'approval', label: 'Manager Approval', description: 'Review & approve register', icon: HowToRegIcon },
    { key: 'paid', label: 'Salary Credited', description: 'Paid to bank & payslips shared', icon: SavingsIcon },
];

// ─── Statutory rates (standard India) ───────────────────────────────────────
const STATUTORY = {
    PF_EMPLOYEE: 0.12,   // 12% of Basic + DA
    PF_EMPLOYER: 0.12,
    ESI_EMPLOYEE: 0.0075, // 0.75% of Gross (if gross ≤ ₹21,000)
    ESI_EMPLOYER: 0.0325, // 3.25%
    PT_MONTHLY: 200,    // Professional Tax (state-dependent)
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatINR = (n) => {
    if (n == null || Number.isNaN(n)) return '₹0';
    const x = Math.round(n).toString();
    const lastThree = x.substring(x.length - 3);
    const other = x.substring(0, x.length - 3);
    const formatted = other !== '' ? other.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree : lastThree;
    return '₹' + formatted;
};

const formatLakhs = (n) => {
    if (n == null || Number.isNaN(n)) return '₹0';
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n}`;
};

const monthOptions = () => {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        opts.push(d.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
    }
    return opts;
};

// ─── Component ──────────────────────────────────────────────────────────────
export default function PayrollOverview({ isEmbedded = false, onBack }) {
    const navigate = useNavigate();
    const user = useSelector((state) => state.auth);
    const userType = user.userType;

    const [selectedMonth, setSelectedMonth] = useState(monthOptions()[0]);

    // Current payroll cycle stage (0-indexed).
    // TODO: derive from backend — for now, show "Manager Approval" as current stage.
    const currentStage = 2;

    // ─── Mock payroll snapshot ─────────────────────────────────────────────
    // TODO: replace with API: /api/payroll/overview?month=YYYY-MM
    const snapshot = useMemo(() => {
        const totalEmployees = 156;
        const activeEmployees = 152;

        // Earnings
        const basic = 2260000;   // 50% of gross roughly
        const hra = 904000;    // 40% of basic
        const allowances = 985000;    // conveyance + medical + special + LTA
        const overtime = 85000;
        const incentives = 120000;
        const bonus = 169000;
        const gross = basic + hra + allowances + overtime + incentives + bonus;

        // Statutory deductions
        const pfEmployee = Math.round(basic * STATUTORY.PF_EMPLOYEE);
        const esiEmployee = Math.round(gross * 0.3 * STATUTORY.ESI_EMPLOYEE); // ~30% eligible
        const pt = STATUTORY.PT_MONTHLY * activeEmployees;
        const tds = 305000;
        const loanRecovery = 45000;
        const lopDeduction = 32000;
        const totalDeductions = pfEmployee + esiEmployee + pt + tds + loanRecovery + lopDeduction;

        const netPay = gross - totalDeductions;

        // Leave-driven fields
        const lopDays = 34;
        const encashableDays = 87;

        return {
            totalEmployees, activeEmployees,
            basic, hra, allowances, overtime, incentives, bonus, gross,
            pfEmployee, esiEmployee, pt, tds, loanRecovery, lopDeduction, totalDeductions,
            netPay, lopDays, encashableDays,
            pendingApprovals: 12,
        };
    }, [selectedMonth]);

    // 6-month trend (mock — replace with API)
    const monthlyTrend = useMemo(() => ([
        { month: 'Nov', gross: 4250000, net: 3685000, deductions: 565000 },
        { month: 'Dec', gross: 4320000, net: 3745000, deductions: 575000 },
        { month: 'Jan', gross: 4380000, net: 3802000, deductions: 578000 },
        { month: 'Feb', gross: 4425000, net: 3846000, deductions: 579000 },
        { month: 'Mar', gross: 4490000, net: 3910000, deductions: 580000 },
        { month: 'Apr', gross: snapshot.gross, net: snapshot.netPay, deductions: snapshot.totalDeductions },
    ]), [snapshot]);

    // Earnings vs Deductions donut
    const earningsDeductions = useMemo(() => ([
        { name: 'Basic + HRA', value: snapshot.basic + snapshot.hra, color: '#6246E0' },
        { name: 'Allowances', value: snapshot.allowances, color: '#00ACC1' },
        { name: 'OT + Incentives', value: snapshot.overtime + snapshot.incentives + snapshot.bonus, color: '#16A34A' },
        { name: 'Deductions', value: snapshot.totalDeductions, color: '#DC2626' },
    ]), [snapshot]);

    // Compliance status
    const compliance = [
        { name: 'PF', status: 'filed', amount: snapshot.pfEmployee * 2, dueDate: '15th', color: '#6246E0', description: 'Provident Fund' },
        { name: 'ESI', status: 'pending', amount: Math.round(snapshot.esiEmployee * 5.33), dueDate: '21st', color: '#00ACC1', description: 'Employee State Insurance' },
        { name: 'PT', status: 'filed', amount: snapshot.pt, dueDate: '15th', color: '#2563EB', description: 'Professional Tax' },
        { name: 'TDS', status: 'pending', amount: snapshot.tds, dueDate: '7th', color: '#EA580C', description: 'Tax Deducted at Source' },
    ];

    const handleBackClick = () => {
        if (isEmbedded && onBack) onBack();
        else navigate(-1);
    };

    const containerSx = isEmbedded
        ? { display: 'flex', flexDirection: 'column', height: '100%' }
        : { border: '1px solid #E5E7EB', borderRadius: '20px', p: 2, height: '86vh', display: 'flex', flexDirection: 'column', bgcolor: '#fff' };

    // ─── Section: Header ───────────────────────────────────────────────────
    const renderHeader = () => (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton onClick={handleBackClick} size="small" sx={{ width: 35, height: 35 }}>
                    <ArrowBackIcon />
                </IconButton>
                <Box>
                    <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>
                        Payroll Management
                    </Typography>
                    <Typography sx={{ fontSize: '11px', color: '#6B7280' }}>
                        Process, approve and audit salaries with complete statutory compliance
                    </Typography>
                </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Select
                    size="small" value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    sx={{
                        fontSize: '12px', fontWeight: 600, height: 36, bgcolor: '#fff',
                        borderRadius: '50px', minWidth: 180,
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E5E7EB' },
                    }}
                >
                    {monthOptions().map(m => <MenuItem key={m} value={m} sx={{ fontSize: '13px' }}>{m}</MenuItem>)}
                </Select>

            </Box>
        </Box>
    );

    // ─── Section: Cycle Progress ───────────────────────────────────────────
    const renderCycleProgress = () => (
        <Paper elevation={0} sx={{ p: 2, borderRadius: '7px', border: '1px solid #E5E7EB', bgcolor: '#FAFBFD', mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <Box>
                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                        Payroll Cycle — {selectedMonth}
                    </Typography>
                    <Typography sx={{ fontSize: '11px', color: '#6B7280' }}>
                        Track the processing stage of this month's payroll
                    </Typography>
                </Box>
                <Chip
                    icon={<PendingActionsIcon sx={{ fontSize: '14px !important' }} />}
                    label={`Currently at: ${PAYROLL_STAGES[currentStage].label}`}
                    sx={{ bgcolor: '#FFF7ED', color: '#EA580C', fontWeight: 700, fontSize: '11px', height: 24, '& .MuiChip-icon': { color: '#EA580C' } }}
                />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0, position: 'relative' }}>
                {PAYROLL_STAGES.map((stage, idx) => {
                    const Icon = stage.icon;
                    const isDone = idx < currentStage;
                    const isCurrent = idx === currentStage;
                    const color = isDone ? '#16A34A' : isCurrent ? '#F97316' : '#CBD5E1';
                    const bg = isDone ? '#DBEAFE' : isCurrent ? '#FFF7ED' : '#F3F4F6';
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
                                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: isCurrent ? '#EA580C' : '#374151', mt: 0.7, textAlign: 'center' }} noWrap>
                                    {stage.label}
                                </Typography>
                                <Typography sx={{ fontSize: '9px', color: '#9CA3AF', textAlign: 'center' }} noWrap>
                                    {stage.description}
                                </Typography>
                            </Box>
                            {idx < PAYROLL_STAGES.length - 1 && (
                                <Box sx={{ flex: 0.7, height: 2, bgcolor: idx < currentStage ? '#16A34A' : '#E5E7EB', mb: 3.5, minWidth: 20 }} />
                            )}
                        </React.Fragment>
                    );
                })}
            </Box>
        </Paper>
    );

    // ─── Section: KPI Row ──────────────────────────────────────────────────
    const renderKpis = () => {
        const kpis = [
            { title: 'Total Employees', value: snapshot.totalEmployees, sub: `${snapshot.activeEmployees} on-roll`, icon: PeopleIcon, color: '#8600BB', bg: '#F5F0FA' },
            { title: 'Gross Payroll', value: formatLakhs(snapshot.gross), sub: 'Earnings before deductions', icon: AccountBalanceWalletIcon, color: '#6246E0', bg: '#F3F0FE', delta: '+2.8%' },
            { title: 'Total Deductions', value: formatLakhs(snapshot.totalDeductions), sub: 'PF + ESI + PT + TDS + LOP', icon: ReceiptLongIcon, color: '#DC2626', bg: '#FEF2F2', delta: '-1.2%', deltaDown: true },
            { title: 'Net Pay', value: formatLakhs(snapshot.netPay), sub: 'Disbursable to bank', icon: SavingsIcon, color: '#16A34A', bg: '#EFF5FF', delta: '+3.1%' },
            { title: 'Pending Approvals', value: snapshot.pendingApprovals, sub: `${snapshot.lopDays} LOP days recorded`, icon: PendingActionsIcon, color: '#F97316', bg: '#FFF7ED' },
        ];
        return (
            <Grid container spacing={2} sx={{ mb: 2 }}>
                {kpis.map((k, idx) => {
                    const Icon = k.icon;
                    return (
                        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }} key={idx}>
                            <Paper elevation={0} sx={{
                                p: 2, borderRadius: '7px', border: '1px solid #E5E7EB', bgcolor: '#fff',
                                height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                                transition: 'all 0.2s',
                                '&:hover': { boxShadow: `0 4px 12px ${k.color}25`, borderColor: `${k.color}55` },
                            }}>
                                <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Typography sx={{ fontSize: '10px', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                            {k.title}
                                        </Typography>
                                        <Avatar sx={{ width: 32, height: 32, bgcolor: k.bg }}>
                                            <Icon sx={{ fontSize: 18, color: k.color }} />
                                        </Avatar>
                                    </Box>
                                    <Typography sx={{ fontSize: '22px', fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>
                                        {k.value}
                                    </Typography>
                                    <Typography sx={{ fontSize: '11px', color: '#6B7280', mt: 0.5 }}>
                                        {k.sub}
                                    </Typography>
                                </Box>
                                {k.delta && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 1 }}>
                                        {k.deltaDown
                                            ? <TrendingDownIcon sx={{ fontSize: 13, color: '#16A34A' }} />
                                            : <TrendingUpIcon sx={{ fontSize: 13, color: '#16A34A' }} />}
                                        <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#16A34A' }}>
                                            {k.delta}
                                        </Typography>
                                        <Typography sx={{ fontSize: '10px', color: '#9CA3AF' }}>vs last month</Typography>
                                    </Box>
                                )}
                            </Paper>
                        </Grid>
                    );
                })}
            </Grid>
        );
    };

    // ─── Section: Module cards ─────────────────────────────────────────────
    const renderModules = () => (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                    Payroll Management Modules
                </Typography>
                <Tooltip title="Configure each module in order: Leave Policy → Salary Structure → Compliance → Bank Details → Run Payroll → Register" arrow placement="right">
                    <InfoOutlinedIcon sx={{ fontSize: 14, color: '#9CA3AF', cursor: 'help' }} />
                </Tooltip>
            </Box>
            <Grid container spacing={2}>
                {payrollModules.filter(m =>
                    userType === 'Super Admin' || userType === 'admin'
                        ? true
                        : m.text === 'Bank Details' || m.text === 'Audit-Ready Salary Register'
                ).map((m, idx) => {
                    const Icon = m.icon;
                    return (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
                            <Card
                                onClick={() => navigate(m.path)}
                                sx={{
                                    border: `1px solid ${m.color}20`,
                                    borderRadius: '7px', boxShadow: 'none', bgcolor: m.bgColor, cursor: 'pointer',
                                    transition: 'all 0.3s', height: '100%',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: `0 8px 24px ${m.color}25`,
                                        borderColor: m.color,
                                        '& .module-arrow': { opacity: 1, transform: 'translateX(4px)' },
                                    },
                                }}
                            >
                                <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                                        <Box sx={{
                                            width: 48, height: 48, borderRadius: '7px', bgcolor: m.iconBgColor,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${m.color}`,
                                        }}>
                                            <Icon sx={{ fontSize: 24, color: m.color }} />
                                        </Box>
                                        <ArrowForwardIcon className="module-arrow"
                                            sx={{ fontSize: 20, color: m.color, opacity: 0, transition: 'all 0.3s' }} />
                                    </Box>
                                    <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#111827', mb: 1, lineHeight: 1.3 }}>
                                        {m.text}
                                    </Typography>
                                    <Typography sx={{ fontSize: '12px', color: '#6B7280', lineHeight: 1.55, flex: 1 }}>
                                        {m.description}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
    );

    return (
        <Box sx={containerSx}>
            {renderHeader()}
            <Divider sx={{ mb: 2 }} />
            <Box sx={{
                flex: 1, overflowY: 'auto', pr: 0.5,
                '&::-webkit-scrollbar': { width: 5 },
                '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#D1D5DB', borderRadius: 10 },
            }}>
                {renderCycleProgress()}
                {(userType === 'Super Admin' || userType === 'admin' || userType === 'staff') && renderModules()}
            </Box>
        </Box>
    );
}
