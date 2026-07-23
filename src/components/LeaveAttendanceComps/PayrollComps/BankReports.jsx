import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Button, Grid, IconButton,
    Card, Chip, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, InputAdornment, Dialog,
    DialogContent, DialogActions, Avatar, CircularProgress, Tooltip,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlineRounded';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import { useSelector } from 'react-redux';
import { selectWebsiteSettings } from '../../../redux/slices/websiteSettingsSlice';
import * as XLSX from 'xlsx';
import http from '../../../Api/http';
import SnackBar from '../../SnackBar';
import { employeeBankDetailsDashboard, updateEmployeeBankDetailsByEmployeeCode } from '../../../Api/Api';

// ─── Theme (matches Salary Structures / LeaveAttendancePage) ───────────────
const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_DARK = '#6246E0';
const PRIMARY_BORDER = '#C9BEFB';

const AVATAR_PALETTE = ['#0E7490', '#6D28D9', '#C2410C', '#6246E0', '#1D4ED8', '#BE185D', '#A16207', '#0F766E'];
const avatarColorFor = (name = '') => {
    const code = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0);
    return AVATAR_PALETTE[code % AVATAR_PALETTE.length];
};

const getInitials = (name = '') =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function BankReports() {
    const websiteSettings = useSelector(selectWebsiteSettings);

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [isAddMode, setIsAddMode] = useState(false);
    const [bankDetails, setBankDetails] = useState({
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        branchName: '',
    });

    const [stats, setStats] = useState({
        totalEmployees: 0,
        verifiedAccounts: 0,
        totalAccounts: 0,
        totalNetSalary: 0,
    });
    const [employeeData, setEmployeeData] = useState([]);

    const [snackOpen, setSnackOpen] = useState(false);
    const [snackStatus, setSnackStatus] = useState(false);
    const [snackColor, setSnackColor] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const showSnack = (msg, success) => {
        setSnackMessage(msg); setSnackOpen(true); setSnackColor(success); setSnackStatus(success);
    };

    const fetchBankDashboard = async () => {
        setIsLoading(true);
        try {
            const res = await http.get(employeeBankDetailsDashboard);
            if (!res.data.error) {
                const d = res.data.data;
                setStats({
                    totalEmployees: d.totalEmployees,
                    verifiedAccounts: d.verifiedAccounts,
                    totalAccounts: d.totalAccounts,
                    totalNetSalary: d.totalNetSalary,
                });
                // Rows are keyed by employeeCode; alias to rollNumber so the
                // table, search, export and save keep reading one field.
                setEmployeeData((d.employees || []).map(emp => ({
                    ...emp,
                    rollNumber: emp.employeeCode ?? emp.rollNumber ?? '',
                })));
            }
        } catch {
            showSnack('Failed to load bank details', false);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBankDashboard();
    }, []);

    const hasBankDetails = (emp) =>
        emp.bankName && emp.accountNumber && emp.ifsc && emp.branch;

    const filteredData = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return employeeData;
        return employeeData.filter(emp =>
            (emp.name || '').toLowerCase().includes(q) ||
            (emp.rollNumber || '').toLowerCase().includes(q) ||
            (emp.bankName || '').toLowerCase().includes(q)
        );
    }, [employeeData, searchTerm]);

    const pendingAccounts = useMemo(
        () => employeeData.filter(e => !hasBankDetails(e)).length,
        [employeeData],
    );

    const visibleNetTotal = useMemo(
        () => filteredData.reduce((s, e) => s + (Number(e.netSalary) || 0), 0),
        [filteredData],
    );

    const coverage = stats.totalAccounts > 0
        ? Math.round((stats.verifiedAccounts / stats.totalAccounts) * 100)
        : 0;

    const handleOpenBankDialog = (employee) => {
        const addMode = !hasBankDetails(employee);
        setIsAddMode(addMode);
        setSelectedEmployee(employee);
        setBankDetails({
            bankName: employee.bankName || '',
            accountNumber: employee.accountNumber || '',
            ifscCode: employee.ifsc || '',
            branchName: employee.branch || '',
        });
        setOpenDialog(true);
    };

    const handleSaveBankDetails = async () => {
        if (!bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.branchName) {
            showSnack('Please fill all bank details', false);
            return;
        }
        setIsSaving(true);
        try {
            // PUT /Payroll/UpdateEmployeeBankDetailsByEmployeeCode
            const body = {
                EmployeeCode:  selectedEmployee.employeeCode || selectedEmployee.rollNumber,
                BankName:      bankDetails.bankName,
                AccountNumber: bankDetails.accountNumber,
                IFSC:          bankDetails.ifscCode,
                Branch:        bankDetails.branchName,
            };
            const res = await http.put(updateEmployeeBankDetailsByEmployeeCode, body);
            if (!res.data.error) {
                showSnack(isAddMode ? 'Bank details added successfully!' : 'Bank details updated successfully!', true);
                setOpenDialog(false);
                setEmployeeData(employeeData.map(emp =>
                    emp.id === selectedEmployee.id
                        ? { ...emp, bankName: body.BankName, accountNumber: body.AccountNumber, ifsc: body.IFSC, branch: body.Branch }
                        : emp
                ));
            } else {
                showSnack(res.data.message || 'Failed to save bank details', false);
            }
        } catch {
            showSnack('Failed to save bank details', false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleExportBankData = () => {
        const excelData = filteredData.map((emp, index) => ({
            'S.No': index + 1,
            'Roll Number': emp.rollNumber,
            'Employee Name': emp.name,
            'Net Salary': emp.netSalary,
            'Bank Name': emp.bankName || 'N/A',
            'Account Number': emp.accountNumber || 'N/A',
            'IFSC Code': emp.ifsc || 'N/A',
            'Branch Name': emp.branch || 'N/A',
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        ws['!cols'] = [
            { wch: 6 }, { wch: 12 }, { wch: 20 }, { wch: 18 },
            { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 20 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Employee Bank Details');
        const fileName = `Employee_Bank_Details_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        showSnack('Bank details exported successfully!', true);
    };

    // Field styling — matches SalaryStructures
    const fieldSx = {
        '& .MuiOutlinedInput-root': {
            borderRadius: '7px',
            fontSize: '13px',
            bgcolor: '#F9FAFB',
            '&:hover': { bgcolor: '#fff' },
            '&.Mui-focused': { bgcolor: '#fff' },
            '& fieldset': { borderColor: '#E5E7EB' },
            '&.Mui-focused fieldset': { borderColor: PRIMARY, borderWidth: '1.5px' },
        },
        '& .MuiInputLabel-root.Mui-focused': { color: PRIMARY },
    };

    const kpiCards = [
        {
            label: 'Total Employees',
            value: stats.totalEmployees,
            sub: 'on payroll',
            color: '#7C5CFC', bg: '#F1EEFE',
            icon: PeopleAltOutlinedIcon,
        },
        {
            label: 'Verified Accounts',
            value: `${coverage}%`,
            sub: `${stats.verifiedAccounts} of ${stats.totalAccounts}`,
            color: '#16A34A', bg: '#DCFCE7',
            icon: CheckCircleIcon,
        },
        {
            label: 'Pending Setup',
            value: pendingAccounts,
            sub: 'awaiting bank info',
            color: '#F59E0B', bg: '#FFF7ED',
            icon: HourglassEmptyIcon,
        },
        {
            label: 'Total Net Payout',
            value: formatINR(stats.totalNetSalary),
            sub: 'monthly disbursement',
            color: '#0EA5E9', bg: '#E0F2FE',
            icon: PaidOutlinedIcon,
        },
    ];

    const searchActive = searchTerm.trim().length > 0;

    return (
        <>
            <SnackBar open={snackOpen} color={snackColor} setOpen={setSnackOpen} status={snackStatus} message={snackMessage} />

            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '88vh',
                p: 2,
            }}>
                {/* ─── Header ─────────────────────────────────────────────── */}
                <Box sx={{
                    pb: 2.5,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 1.5,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box>
                            <Typography sx={{ fontSize: '24px', fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>
                                Employee Bank Details
                            </Typography>
                            <Typography sx={{ fontSize: '13px', color: '#6B7280', mt: 0.3 }}>
                                Manage payroll bank accounts and disbursement information
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Search field — pill style, in header */}
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Search by name, roll no, or bank..."
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
                        <Button
                            variant="contained"
                            disableElevation
                            startIcon={<DownloadIcon sx={{ fontSize: 18 }} />}
                            onClick={handleExportBankData}
                            sx={{
                                textTransform: 'none',
                                bgcolor: '#F1EEFE',
                                color: '#7C5CFC',
                                borderRadius: '30px',
                                fontSize: '12.5px',
                                fontWeight: 700,
                                px: 2.4, height: 34,
                                boxShadow: 'none',
                                border: '1.5px solid #C9BEFB',
                                '&:hover': {
                                    bgcolor: '#E7DFFC',
                                    borderColor: '#C9BEFB',
                                    boxShadow: 'none',
                                },
                            }}
                        >
                            Export Data
                        </Button>
                    </Box>
                </Box>

                {/* ─── Body ───────────────────────────────────────────────── */}
                <Box sx={{ flex: 1 }}>

                    {/* KPI Cards */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        {kpiCards.map((card) => {
                            const Icon = card.icon;
                            return (
                                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.label}>
                                    <Box sx={{
                                        p: 2.5,
                                        borderRadius: '7px',
                                        bgcolor: card.bg,
                                        border: `1px solid ${card.color}22`,
                                        boxShadow: '0 1px 3px rgba(16,24,40,0.06)',
                                        height: '100%',
                                        transition: 'transform 0.15s, box-shadow 0.15s',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: `0 8px 20px ${card.color}22`,
                                        },
                                    }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography sx={{
                                                    fontSize: '11px', color: card.color, fontWeight: 700,
                                                    textTransform: 'uppercase', letterSpacing: 0.5,
                                                }}>
                                                    {card.label}
                                                </Typography>
                                                <Typography sx={{
                                                    fontSize: '28px', fontWeight: 800, color: '#0F172A',
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
                                                width: 44, height: 44, borderRadius: '7px',
                                                bgcolor: '#fff', boxShadow: '0 1px 3px rgba(16,24,40,0.08)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0, ml: 1,
                                            }}>
                                                <Icon sx={{ color: card.color, fontSize: 22 }} />
                                            </Box>
                                        </Box>
                                    </Box>
                                </Grid>
                            );
                        })}
                    </Grid>

                    {/* Employee Bank Details Table */}
                    <Card sx={{ border: '1px solid #ECEBF5', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.05)', bgcolor: '#fff', overflow: 'hidden' }}>
                        <Box sx={{
                            px: 2, py: 1.6,
                            borderBottom: '1px solid #EAE7F7',
                            bgcolor: '#F7F6FD',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1.5,
                            flexWrap: 'wrap',
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{
                                    width: 32, height: 32, borderRadius: '9px',
                                    bgcolor: '#fff', boxShadow: '0 1px 4px rgba(16,24,40,0.12)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <AccountBalanceIcon sx={{ fontSize: 17, color: PRIMARY }} />
                                </Box>
                                <Typography sx={{ fontSize: '14.5px', fontWeight: 800, color: '#0F172A' }}>
                                    Employee Bank Account Details
                                </Typography>
                                <Chip
                                    label={`${employeeData.length} employees`}
                                    size="small"
                                    sx={{
                                        bgcolor: PRIMARY_LIGHT, color: PRIMARY,
                                        fontWeight: 700, fontSize: '11px', height: 20,
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
                                        of {employeeData.length}
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

                        <TableContainer sx={{ }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        {[
                                            'S.No', 'Employee', 'Net Salary', 'Bank Name',
                                            'Account Number', 'IFSC Code', 'Branch', 'Status', 'Actions',
                                        ].map((header) => (
                                            <TableCell
                                                key={header}
                                                sx={{
                                                    fontWeight: 700, fontSize: '10.5px',
                                                    color: '#6E6B99',
                                                    bgcolor: '#F4F3FB',
                                                    textTransform: 'uppercase', letterSpacing: 0.7,
                                                    whiteSpace: 'nowrap', py: 1.5,
                                                    borderBottom: '1px solid #E8E6F3',
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
                                                    Loading bank details…
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
                                                    <AccountBalanceIcon sx={{ fontSize: 28, color: '#9CA3AF' }} />
                                                </Box>
                                                <Typography sx={{ fontSize: '13px', color: '#6B7280', fontWeight: 600 }}>
                                                    {searchActive ? `No results for "${searchTerm}"` : 'No employee records yet'}
                                                </Typography>
                                                <Typography sx={{ fontSize: '11.5px', color: '#9CA3AF', mt: 0.4 }}>
                                                    {searchActive ? 'Try a different search term' : 'Employees will appear here once added to payroll'}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredData.map((emp, idx) => {
                                        const avColor = avatarColorFor(emp.name || '');
                                        const verified = hasBankDetails(emp);

                                        return (
                                            <TableRow
                                                key={emp.id}
                                                sx={{
                                                    bgcolor: idx % 2 ? '#FBFAFE' : '#fff',
                                                    '&:hover': { bgcolor: '#F5F4FC' },
                                                    transition: 'background-color 0.15s',
                                                }}
                                            >
                                                <TableCell sx={{ width: 50, borderBottom: '1px solid #EEF0F6', py: 1.4 }}>
                                                    <Typography sx={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 500 }}>
                                                        {idx + 1}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #EEF0F6', py: 1.4 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                                        <Avatar sx={{
                                                            width: 32, height: 32,
                                                            bgcolor: `${avColor}15`,
                                                            color: avColor,
                                                            fontSize: '11px', fontWeight: 700,
                                                            border: `1px solid ${avColor}33`,
                                                        }}>
                                                            {getInitials(emp.name || '?')}
                                                        </Avatar>
                                                        <Box sx={{ minWidth: 0 }}>
                                                            <Typography sx={{
                                                                fontSize: '13px', fontWeight: 600,
                                                                color: '#111827', whiteSpace: 'nowrap',
                                                            }}>
                                                                {emp.name || '—'}
                                                            </Typography>
                                                            <Typography sx={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 500 }}>
                                                                {emp.rollNumber}{emp.designation ? ` · ${emp.designation}` : ''}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #EEF0F6', py: 1.4 }}>
                                                    <Box sx={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 0.5,
                                                        px: 1.1, py: 0.5, borderRadius: '7px',
                                                        bgcolor: '#EFECFE', border: '1px solid #DDD3FB',
                                                    }}>
                                                        <Typography sx={{ fontSize: '13px', fontWeight: 800, color: '#5B21B6' }}>
                                                            {formatINR(emp.netSalary)}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #EEF0F6', py: 1.4 }}>
                                                    {emp.bankName ? (
                                                        <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                                                            {emp.bankName}
                                                        </Typography>
                                                    ) : (
                                                        <Typography sx={{ fontSize: '12px', color: '#CBD5E1', fontStyle: 'italic' }}>
                                                            Not added
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #EEF0F6', py: 1.4 }}>
                                                    {emp.accountNumber ? (
                                                        <Typography sx={{ fontSize: '12.5px', fontFamily: 'monospace', fontWeight: 600, color: '#374151' }}>
                                                            {emp.accountNumber}
                                                        </Typography>
                                                    ) : (
                                                        <Typography sx={{ fontSize: '12px', color: '#CBD5E1' }}>—</Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #EEF0F6', py: 1.4 }}>
                                                    {emp.ifsc ? (
                                                        <Chip
                                                            label={emp.ifsc}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: '#EEF2FF', color: '#4F46E5',
                                                                border: '1px solid #DDE0FB',
                                                                fontWeight: 700, fontSize: '10.5px', height: 22,
                                                                fontFamily: 'monospace',
                                                            }}
                                                        />
                                                    ) : (
                                                        <Typography sx={{ fontSize: '12px', color: '#CBD5E1' }}>—</Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #EEF0F6', py: 1.4 }}>
                                                    {emp.branch ? (
                                                        <Typography sx={{ fontSize: '12.5px', color: '#374151', fontWeight: 500 }}>
                                                            {emp.branch}
                                                        </Typography>
                                                    ) : (
                                                        <Typography sx={{ fontSize: '12px', color: '#CBD5E1' }}>—</Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #EEF0F6', py: 1.4 }}>
                                                    <Chip
                                                        size="small"
                                                        icon={verified
                                                            ? <CheckCircleIcon sx={{ fontSize: '12px !important' }} />
                                                            : <HourglassEmptyIcon sx={{ fontSize: '12px !important' }} />}
                                                        label={verified ? 'Verified' : 'Pending'}
                                                        sx={{
                                                            height: 22, fontSize: '10.5px', fontWeight: 700,
                                                            bgcolor: verified ? '#F1EEFE' : '#FFFBEB',
                                                            color: verified ? '#6246E0' : '#B45309',
                                                            border: `1px solid ${verified ? '#C9BEFB' : '#FDE68A'}`,
                                                            '& .MuiChip-icon': { color: 'inherit', ml: '6px' },
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #EEF0F6', py: 1.4 }}>
                                                    <Tooltip arrow title={verified ? 'Edit bank details' : 'Add bank details'}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleOpenBankDialog(emp)}
                                                            sx={{
                                                                bgcolor: verified ? '#F3F0FE' : '#F1EEFE',
                                                                borderRadius: '7px',
                                                                border: `1px solid ${verified ? '#C9BEFB' : '#C9BEFB'}`,
                                                                '&:hover': { bgcolor: '#E7DFFC' },
                                                            }}
                                                        >
                                                            {verified
                                                                ? <EditIcon sx={{ fontSize: 14, color: '#6246E0' }} />
                                                                : <AddCircleOutlineIcon sx={{ fontSize: 14, color: PRIMARY }} />}
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* Totals footer */}
                        {!isLoading && filteredData.length > 0 && (
                            <Box sx={{
                                px: 2, py: 1.5, borderTop: '1px solid #EAE7F7', bgcolor: '#F7F6FD',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                flexWrap: 'wrap', gap: 1.5,
                            }}>
                                <Typography sx={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>
                                    Showing <Box component="span" sx={{ color: '#5B21B6', fontWeight: 800 }}>{filteredData.length}</Box> of {employeeData.length} accounts
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.6 }}>
                                    <Typography sx={{ fontSize: '11px', color: '#6D28D9', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>Total Net Payout</Typography>
                                    <Typography sx={{ fontSize: '14px', fontWeight: 800, color: '#5B21B6' }}>{formatINR(visibleNetTotal)}</Typography>
                                </Box>
                            </Box>
                        )}
                    </Card>
                </Box>
            </Box>

            {/* ─── Add / Edit Bank Details Dialog ───────────────────────── */}
            <Dialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                maxWidth="sm"
                fullWidth
                slotProps={{
                    paper: {
                        sx: { borderRadius: '7px', overflow: 'hidden' },
                    },
                }}
            >
                {/* Dialog header */}
                <Box sx={{
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
                            {isAddMode
                                ? <AddCircleOutlineIcon sx={{ color: PRIMARY, fontSize: 20 }} />
                                : <EditIcon sx={{ color: PRIMARY, fontSize: 20 }} />}
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '24px', fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>
                                {isAddMode ? 'Add Bank Account Details' : 'Edit Bank Account Details'}
                            </Typography>
                            <Typography sx={{ fontSize: '13px', color: '#6B7280', mt: 0.3 }}>
                                {isAddMode
                                    ? 'Set up payroll bank account for this employee'
                                    : 'Update the bank account information used for salary disbursement'}
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

                <DialogContent sx={{ p: 2.5, bgcolor: '#F9FAFB' }}>
                    {/* Section: Employee */}
                    {selectedEmployee && (
                        <Box sx={{
                            p: 2, mb: 2,
                            bgcolor: '#fff', borderRadius: '7px',
                            border: '1px solid #E5E7EB',
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <Box sx={{
                                    width: 24, height: 24, borderRadius: '7px',
                                    bgcolor: '#F3F0FE', border: '1px solid #BFDBFE',
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

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Avatar sx={{
                                    width: 44, height: 44,
                                    bgcolor: `${avatarColorFor(selectedEmployee.name)}15`,
                                    color: avatarColorFor(selectedEmployee.name),
                                    fontSize: '14px', fontWeight: 800,
                                    border: `1px solid ${avatarColorFor(selectedEmployee.name)}33`,
                                }}>
                                    {getInitials(selectedEmployee.name)}
                                </Avatar>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                                        {selectedEmployee.name}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.3, flexWrap: 'wrap' }}>
                                        <Chip
                                            label={selectedEmployee.rollNumber}
                                            size="small"
                                            sx={{
                                                bgcolor: '#F3F4F6', color: '#374151',
                                                fontWeight: 600, fontSize: '10.5px', height: 20,
                                                border: '1px solid #E5E7EB',
                                            }}
                                        />
                                        {selectedEmployee.designation && (
                                            <Typography sx={{ fontSize: '11px', color: '#6B7280' }}>
                                                {selectedEmployee.designation}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                                {selectedEmployee.netSalary != null && (
                                    <Box sx={{
                                        textAlign: 'right',
                                        px: 1.2, py: 0.6, borderRadius: '7px',
                                        bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`,
                                    }}>
                                        <Typography sx={{ fontSize: '9.5px', color: PRIMARY_DARK, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            Net Salary
                                        </Typography>
                                        <Typography sx={{ fontSize: '14px', fontWeight: 800, color: PRIMARY_DARK }}>
                                            {formatINR(selectedEmployee.netSalary)}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>
                    )}

                    {/* Section: Bank Details */}
                    <Box sx={{
                        p: 2,
                        bgcolor: '#fff', borderRadius: '7px',
                        border: '1px solid #E5E7EB',
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                            <Box sx={{
                                width: 24, height: 24, borderRadius: '7px',
                                bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <AccountBalanceIcon sx={{ fontSize: 14, color: PRIMARY }} />
                            </Box>
                            <Typography sx={{
                                fontSize: '11px', fontWeight: 700, color: '#374151',
                                textTransform: 'uppercase', letterSpacing: 0.6,
                            }}>
                                Bank Account Information
                            </Typography>
                        </Box>

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Bank Name *"
                                    value={bankDetails.bankName}
                                    onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                    sx={fieldSx}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Branch Name *"
                                    value={bankDetails.branchName}
                                    onChange={(e) => setBankDetails({ ...bankDetails, branchName: e.target.value })}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                    sx={fieldSx}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 7 }}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="Account Number *"
                                    value={bankDetails.accountNumber}
                                    onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                    sx={{
                                        ...fieldSx,
                                        '& .MuiOutlinedInput-input': { fontFamily: 'monospace', letterSpacing: 0.5 },
                                    }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 5 }}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label="IFSC Code *"
                                    value={bankDetails.ifscCode}
                                    onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                    sx={{
                                        ...fieldSx,
                                        '& .MuiOutlinedInput-input': { fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 0.5 },
                                    }}
                                />
                            </Grid>
                        </Grid>

                        <Box sx={{
                            mt: 2, p: 1.2, borderRadius: '7px',
                            bgcolor: '#FFFBEB', border: '1px solid #FDE68A',
                            display: 'flex', alignItems: 'flex-start', gap: 1,
                        }}>
                            <AccountBalanceWalletIcon sx={{ fontSize: 16, color: '#B45309', mt: 0.1 }} />
                            <Typography sx={{ fontSize: '11px', color: '#92400E', lineHeight: 1.4 }}>
                                Double-check the account number and IFSC code before saving. Incorrect details can delay or misdirect salary disbursement.
                            </Typography>
                        </Box>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ px: 2.5, py: 1.8, borderTop: '1px solid #E5E7EB', bgcolor: '#fff' }}>
                    <Button
                        onClick={() => setOpenDialog(false)}
                        disabled={isSaving}
                        sx={{
                            textTransform: 'none', fontSize: '13px', fontWeight: 600,
                            color: '#374151', borderRadius: '7px',
                            border: '1px solid #E5E7EB', px: 2, height: 38,
                            '&:hover': { bgcolor: '#F9FAFB' },
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveBankDetails}
                        disabled={isSaving}
                        startIcon={isSaving
                            ? <CircularProgress size={14} sx={{ color: '#fff' }} />
                            : <SaveOutlinedIcon sx={{ fontSize: 18 }} />}
                        sx={{
                            textTransform: 'none', fontSize: '13px', fontWeight: 700,
                            bgcolor: PRIMARY, color: '#fff', borderRadius: '7px',
                            px: 2.5, height: 38,
                            boxShadow: `0 2px 6px ${PRIMARY}33`,
                            '&:hover': { bgcolor: PRIMARY_DARK, boxShadow: `0 4px 12px ${PRIMARY}55` },
                            '&.Mui-disabled': { bgcolor: '#E5E7EB', color: '#9CA3AF' },
                        }}
                    >
                        {isSaving ? 'Saving…' : isAddMode ? 'Add Details' : 'Save Changes'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
