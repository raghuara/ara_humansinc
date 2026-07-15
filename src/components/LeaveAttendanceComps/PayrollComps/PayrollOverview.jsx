import React, { useState } from 'react';
import {
    Box, Typography, Grid, Card, CardContent, Divider, IconButton, Chip,
    Paper, Avatar, Select, MenuItem, Tooltip,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import DescriptionIcon from '@mui/icons-material/Description';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import SavingsIcon from '@mui/icons-material/Savings';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

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

// ─── Helpers ────────────────────────────────────────────────────────────────
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
