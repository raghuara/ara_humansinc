import React, { useState, useMemo } from 'react';
import {
    Box, Typography, TextField, Button, Grid, IconButton, Divider,
    MenuItem, Select, FormControl, InputLabel, Switch, InputAdornment,
    Chip, LinearProgress, Avatar
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineRounded';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import WorkHistoryOutlinedIcon from '@mui/icons-material/WorkHistoryOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

// Mock: All staff from the school database
const allStaffMembers = [
    { id: 'EMP001', name: 'Rajesh Kumar', designation: 'Senior Teacher', department: 'Mathematics' },
    { id: 'EMP002', name: 'Priya Sharma', designation: 'Teacher', department: 'Science' },
    { id: 'EMP003', name: 'Amit Patel', designation: 'Lab Assistant', department: 'Science' },
    { id: 'EMP004', name: 'Sunita Verma', designation: 'Admin Officer', department: 'Administration' },
    { id: 'EMP005', name: 'Mohammed Ali', designation: 'Physical Education Teacher', department: 'Sports' },
    { id: 'EMP006', name: 'Kavitha Nair', designation: 'Librarian', department: 'Library' },
    { id: 'EMP007', name: 'Deepak Singh', designation: 'Teacher', department: 'English' },
    { id: 'EMP008', name: 'Lakshmi Iyer', designation: 'Teacher', department: 'Computer Science' },
    { id: 'EMP009', name: 'Arjun Reddy', designation: 'Security Guard', department: 'Administration' },
    { id: 'EMP010', name: 'Fatima Khan', designation: 'Accountant', department: 'Administration' },
];

const designations = [
    'Principal', 'Vice Principal', 'Senior Teacher', 'Teacher', 'Lab Assistant',
    'Admin Officer', 'Accountant', 'Librarian', 'Physical Education Teacher',
    'Counselor', 'IT Administrator', 'Security Guard', 'Peon', 'Driver',
];

const departmentsList = [
    'Mathematics', 'Science', 'English', 'Hindi', 'Social Studies',
    'Computer Science', 'Sports', 'Library', 'Administration', 'Accounts',
];

const bankNames = [
    'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Punjab National Bank',
    'Bank of Baroda', 'Canara Bank', 'Union Bank of India', 'Axis Bank',
    'Kotak Mahindra Bank', 'Indian Bank',
];

// Mock: Attendance data fetched from Leave Management module
const mockAttendanceData = {
    'EMP001': { totalWorkingDays: 26, daysPresent: 24, leaveTaken: 1, lopDays: 1, overtimeHours: 4 },
    'EMP002': { totalWorkingDays: 26, daysPresent: 25, leaveTaken: 1, lopDays: 0, overtimeHours: 0 },
    'EMP003': { totalWorkingDays: 26, daysPresent: 22, leaveTaken: 2, lopDays: 2, overtimeHours: 6 },
    'EMP004': { totalWorkingDays: 26, daysPresent: 26, leaveTaken: 0, lopDays: 0, overtimeHours: 2 },
    'EMP005': { totalWorkingDays: 26, daysPresent: 23, leaveTaken: 2, lopDays: 1, overtimeHours: 8 },
    'EMP006': { totalWorkingDays: 26, daysPresent: 25, leaveTaken: 1, lopDays: 0, overtimeHours: 0 },
    'EMP007': { totalWorkingDays: 26, daysPresent: 24, leaveTaken: 1, lopDays: 1, overtimeHours: 3 },
    'EMP008': { totalWorkingDays: 26, daysPresent: 26, leaveTaken: 0, lopDays: 0, overtimeHours: 5 },
    'EMP009': { totalWorkingDays: 26, daysPresent: 25, leaveTaken: 1, lopDays: 0, overtimeHours: 10 },
    'EMP010': { totalWorkingDays: 26, daysPresent: 24, leaveTaken: 2, lopDays: 0, overtimeHours: 0 },
};

// Primary color palette - Light Blue Theme
const PRIMARY = '#7C5CFC';
const PRIMARY_DARK = '#6246E0';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_TEXT = '#7C5CFC';
const PRIMARY_GRADIENT = 'linear-gradient(135deg, #60A5FA 0%, #93C5FD 100%)';
const CARD_RADIUS = '12px';

// Reusable section card with blue left accent — defined outside component to prevent focus loss
const SectionCard = ({ icon: Icon, title, subtitle, children, accentColor = PRIMARY }) => (
    <Box sx={{
        bgcolor: '#fff', borderRadius: CARD_RADIUS, overflow: 'hidden',
        border: '1px solid #E8E8E8',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'all 0.3s ease',
        '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            transform: 'translateY(-2px)',
        },
    }}>
        <Box sx={{
            px: 2.5, py: 2, borderBottom: '2px solid #F1F5F9',
            display: 'flex', alignItems: 'center', gap: 1.5,
            bgcolor: '#FAFAFA',
            position: 'relative',
        }}>
            <Box sx={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px',
                background: PRIMARY_GRADIENT,
            }} />
            <Box sx={{
                width: '40px', height: '40px', borderRadius: '7px',
                bgcolor: PRIMARY_LIGHT,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${accentColor}30`,
            }}>
                <Icon sx={{ fontSize: '20px', color: accentColor }} />
            </Box>
            <Box>
                <Typography sx={{ fontSize: '13px', fontWeight: '700', color: '#1a1a1a', letterSpacing: '0.3px' }}>{title}</Typography>
                {subtitle && <Typography sx={{ fontSize: '11px', color: '#94A3B8', mt: 0.3 }}>{subtitle}</Typography>}
            </Box>
        </Box>
        <Box sx={{ p: 2.5 }}>
            {children}
        </Box>
    </Box>
);

export default function AddEditPayroll() {
    const navigate = useNavigate();
    const location = useLocation();
    const { mode = 'add', staffData = null, existingEmployeeIds = [], moduleTab = 1 } = location.state || {};
    const isEditMode = mode === 'edit';

    const [activeTab, setActiveTab] = useState(0);

    const [formData, setFormData] = useState({
        employeeId: staffData?.id || '',
        name: staffData?.name || '',
        designation: staffData?.designation || '',
        department: staffData?.department || '',
        salaryType: 'Monthly',
        basicSalary: staffData?.basicSalary || '',
        bankAccountNo: staffData?.bankAccountNo || '',
        bankName: staffData?.bankName || '',
        ifscCode: staffData?.ifscCode || '',
        isPfApplicable: staffData?.isPfApplicable ?? true,
        pfNumber: staffData?.pfNumber || '',
        isEsiApplicable: staffData?.isEsiApplicable ?? false,
        esiNumber: staffData?.esiNumber || '',
        panNumber: staffData?.panNumber || '',
        hraPercent: staffData?.hraPercent || 40,
        daPercent: staffData?.daPercent || 10,
        conveyance: staffData?.conveyance || 1600,
        specialAllowance: staffData?.specialAllowance || 0,
        bonus: staffData?.bonus || 0,
        professionalTax: staffData?.professionalTax || 200,
        tds: staffData?.tds || 0,
        otherDeduction: staffData?.otherDeduction || 0,
        totalWorkingDays: 26,
        daysPresent: 26,
        leaveTaken: 0,
        lopDays: 0,
        overtimeHours: 0,
    });

    const availableStaff = allStaffMembers.filter(
        staff => !existingEmployeeIds.includes(staff.id)
    );

    const handleStaffSelect = (e) => {
        const selectedId = e.target.value;
        const staff = allStaffMembers.find(s => s.id === selectedId);
        const attendance = mockAttendanceData[selectedId] || {
            totalWorkingDays: 26, daysPresent: 26, leaveTaken: 0, lopDays: 0, overtimeHours: 0
        };
        if (staff) {
            setFormData(prev => ({
                ...prev,
                employeeId: staff.id,
                name: staff.name,
                designation: staff.designation,
                department: staff.department,
                totalWorkingDays: attendance.totalWorkingDays,
                daysPresent: attendance.daysPresent,
                leaveTaken: attendance.leaveTaken,
                lopDays: attendance.lopDays,
                overtimeHours: attendance.overtimeHours,
            }));
        }
    };

    const handleChange = (field) => (e) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
    };

    const handleSwitchChange = (field) => (e) => {
        setFormData(prev => ({ ...prev, [field]: e.target.checked }));
    };

    // Salary calculations based on attendance
    const calc = useMemo(() => {
        const basicSalary = Number(formData.basicSalary) || 0;
        const totalWorkingDays = Number(formData.totalWorkingDays) || 26;
        const daysPresent = Number(formData.daysPresent) || 0;
        const lopDays = Number(formData.lopDays) || 0;
        const overtimeHours = Number(formData.overtimeHours) || 0;

        const perDayRate = totalWorkingDays > 0 ? basicSalary / totalWorkingDays : 0;
        const effectiveBasicPay = Math.round(perDayRate * daysPresent);

        const hra = Math.round(effectiveBasicPay * (Number(formData.hraPercent) || 0) / 100);
        const da = Math.round(effectiveBasicPay * (Number(formData.daPercent) || 0) / 100);
        const conveyance = Math.round((Number(formData.conveyance) || 0) / totalWorkingDays * daysPresent);
        const specialAllowance = Math.round((Number(formData.specialAllowance) || 0) / totalWorkingDays * daysPresent);
        const perHourRate = totalWorkingDays > 0 ? basicSalary / totalWorkingDays / 8 : 0;
        const overtimePay = Math.round(overtimeHours * perHourRate * 2);
        const bonus = Number(formData.bonus) || 0;

        const grossSalary = effectiveBasicPay + hra + da + conveyance + specialAllowance + overtimePay + bonus;

        const pf = formData.isPfApplicable ? Math.round(effectiveBasicPay * 0.12) : 0;
        const esi = formData.isEsiApplicable && grossSalary < 21000 ? Math.round(grossSalary * 0.0075) : 0;
        const professionalTax = Number(formData.professionalTax) || 0;
        const tds = Number(formData.tds) || 0;
        const otherDeduction = Number(formData.otherDeduction) || 0;
        const lopDeduction = Math.round(perDayRate * lopDays);

        const totalDeductions = pf + esi + professionalTax + tds + otherDeduction + lopDeduction;
        const netSalary = grossSalary - totalDeductions;

        const attendancePercent = totalWorkingDays > 0 ? Math.round((daysPresent / totalWorkingDays) * 100) : 0;

        return {
            basicSalary, perDayRate, effectiveBasicPay, hra, da, conveyance, specialAllowance,
            overtimePay, bonus, grossSalary, pf, esi, professionalTax, tds, otherDeduction,
            lopDeduction, totalDeductions, netSalary, attendancePercent
        };
    }, [formData]);

    const handleSave = () => {
        if (!formData.employeeId || !formData.basicSalary) {
            toast.error('Please fill in Employee and Basic Salary fields');
            return;
        }
        toast.success(isEditMode ? 'Payroll updated successfully!' : 'Staff payroll added successfully!');
        navigate('/dashboardmenu/Leave', { state: { moduleTab } });
    };

    const formatCurrency = (amount) => `₹${Math.abs(amount).toLocaleString('en-IN')}`;

    const tabs = [
        { label: 'Employee Details', icon: PersonOutlineIcon },
        { label: 'Earnings', icon: TrendingUpIcon },
        { label: 'Deductions', icon: TrendingDownIcon },
        { label: 'Salary Calculation', icon: ReceiptLongIcon },
    ];

    const fieldSx = {
        '& .MuiOutlinedInput-root': {
            borderRadius: '7px', fontSize: '13px', bgcolor: '#FAFAFA',
            '&:hover': { bgcolor: '#fff' },
            '&.Mui-focused': { bgcolor: '#fff' },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: PRIMARY, borderWidth: '2px' },
        },
        '& .MuiInputLabel-root.Mui-focused': { color: PRIMARY_TEXT },
    };

    const selectSx = {
        borderRadius: '7px', fontSize: '13px', bgcolor: '#FAFAFA',
        '&:hover': { bgcolor: '#fff' },
        '&.Mui-focused': { bgcolor: '#fff' },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: PRIMARY, borderWidth: '2px' },
    };

    const smallFieldSx = {
        width: '110px',
        '& .MuiOutlinedInput-root': {
            borderRadius: '7px', fontSize: '13px', bgcolor: '#FAFAFA',
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: PRIMARY, borderWidth: '2px' },
        },
    };

    // ===== TAB 1: EMPLOYEE DETAILS =====
    const renderEmployeeTab = () => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Employee Selection Banner - only in add mode */}
            {!isEditMode && formData.employeeId && (
                <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 2, p: 2.5,
                    bgcolor: PRIMARY_LIGHT, borderRadius: CARD_RADIUS,
                    border: `1px solid ${PRIMARY}30`,
                    boxShadow: '0 2px 8px rgba(37,99,235,0.1)',
                }}>
                    <Avatar sx={{
                        width: 52, height: 52,
                        bgcolor: PRIMARY,
                        color: '#fff',
                        fontWeight: '700', fontSize: '20px',
                        boxShadow: '0 2px 8px rgba(37,99,235,0.2)',
                    }}>
                        {formData.name.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>
                            {formData.name}
                        </Typography>
                        <Typography sx={{ fontSize: '12px', color: '#64748B', mt: 0.3 }}>
                            {formData.employeeId} &bull; {formData.designation} &bull; {formData.department}
                        </Typography>
                    </Box>
                    <Chip label="Selected" size="small" sx={{
                        bgcolor: PRIMARY, color: '#fff',
                        fontWeight: '600', fontSize: '11px',
                        height: '26px',
                        boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
                    }} />
                </Box>
            )}

            {/* Personal Information */}
            <SectionCard icon={PersonOutlineIcon} title="Personal Information" subtitle="Basic employee details and identification">
                <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
                        {isEditMode ? (
                            <TextField label="Employee ID" value={formData.employeeId} size="small" fullWidth disabled
                                slotProps={{ inputLabel: { shrink: true } }} sx={fieldSx} />
                        ) : (
                            <FormControl fullWidth size="small">
                                <InputLabel shrink={!!formData.employeeId} sx={{ fontSize: '13px', '&.Mui-focused': { color: PRIMARY_TEXT } }}>Select Employee</InputLabel>
                                <Select value={formData.employeeId} onChange={handleStaffSelect} label="Select Employee"
                                    notched={!!formData.employeeId} sx={selectSx}>
                                    {availableStaff.length === 0 ? (
                                        <MenuItem disabled>All staff already added</MenuItem>
                                    ) : (
                                        availableStaff.map(staff => (
                                            <MenuItem key={staff.id} value={staff.id}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Avatar sx={{ width: 24, height: 24, fontSize: '11px', bgcolor: `${PRIMARY}40`, color: PRIMARY_TEXT }}>
                                                        {staff.name.charAt(0)}
                                                    </Avatar>
                                                    <Box>
                                                        <Typography sx={{ fontSize: '13px', fontWeight: '600' }}>{staff.name}</Typography>
                                                        <Typography sx={{ fontSize: '10px', color: '#94A3B8' }}>{staff.id} - {staff.designation}</Typography>
                                                    </Box>
                                                </Box>
                                            </MenuItem>
                                        ))
                                    )}
                                </Select>
                            </FormControl>
                        )}
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
                        <TextField label="Full Name" value={formData.name} onChange={handleChange('name')} size="small" fullWidth
                            disabled={!isEditMode && !!formData.employeeId} slotProps={{ inputLabel: { shrink: true } }} sx={fieldSx} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel shrink={!!formData.designation} sx={{ fontSize: '13px', '&.Mui-focused': { color: PRIMARY_TEXT } }}>Designation</InputLabel>
                            <Select value={formData.designation} onChange={handleChange('designation')} label="Designation"
                                notched={!!formData.designation} disabled={!isEditMode && !!formData.employeeId} sx={selectSx}>
                                {designations.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel shrink={!!formData.department} sx={{ fontSize: '13px', '&.Mui-focused': { color: PRIMARY_TEXT } }}>Department</InputLabel>
                            <Select value={formData.department} onChange={handleChange('department')} label="Department"
                                notched={!!formData.department} disabled={!isEditMode && !!formData.employeeId} sx={selectSx}>
                                {departmentsList.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                        <TextField label="Salary Type" value="Monthly" size="small" fullWidth disabled
                            slotProps={{ inputLabel: { shrink: true } }} sx={fieldSx} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
                        <TextField label="Basic Salary (per month)" value={formData.basicSalary} onChange={handleChange('basicSalary')}
                            size="small" fullWidth type="number"
                            slotProps={{ inputLabel: { shrink: true }, input: { startAdornment: <InputAdornment position="start"><Typography sx={{ fontSize: '14px', fontWeight: '700', color: PRIMARY_TEXT }}>₹</Typography></InputAdornment> } }}
                            sx={fieldSx} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
                        <TextField label="PAN Number" value={formData.panNumber} onChange={handleChange('panNumber')}
                            size="small" fullWidth placeholder="ABCDE1234F"
                            slotProps={{ inputLabel: { shrink: true } }} sx={fieldSx} />
                    </Grid>
                </Grid>
            </SectionCard>

            {/* Bank Account Details */}
            <SectionCard icon={AccountBalanceOutlinedIcon} title="Bank Account Details" subtitle="Salary credit account information">
                <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                        <TextField label="Account Number" value={formData.bankAccountNo} onChange={handleChange('bankAccountNo')}
                            size="small" fullWidth slotProps={{ inputLabel: { shrink: true } }} sx={fieldSx} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel shrink={!!formData.bankName} sx={{ fontSize: '13px', '&.Mui-focused': { color: PRIMARY_TEXT } }}>Bank Name</InputLabel>
                            <Select value={formData.bankName} onChange={handleChange('bankName')} label="Bank Name"
                                notched={!!formData.bankName} sx={selectSx}>
                                {bankNames.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                        <TextField label="IFSC Code" value={formData.ifscCode} onChange={handleChange('ifscCode')}
                            size="small" fullWidth placeholder="SBIN0001234"
                            slotProps={{ inputLabel: { shrink: true } }} sx={fieldSx} />
                    </Grid>
                </Grid>
            </SectionCard>

            {/* Statutory Details */}
            <SectionCard icon={SecurityOutlinedIcon} title="Statutory Details" subtitle="PF & ESI configuration">
                <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
                        <Box sx={{
                            border: `1px solid ${formData.isPfApplicable ? PRIMARY : '#E2E8F0'}`,
                            borderRadius: '7px', p: 2.5,
                            bgcolor: formData.isPfApplicable ? PRIMARY_LIGHT : '#F8FAFC',
                            transition: 'all 0.3s ease',
                            boxShadow: formData.isPfApplicable ? '0 2px 8px rgba(37,99,235,0.1)' : 'none',
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography sx={{ fontSize: '13px', fontWeight: '700', color: '#1a1a1a' }}>Provident Fund (PF)</Typography>
                                    <Chip label="12%" size="small" sx={{
                                        height: '20px', fontSize: '10px', fontWeight: '700',
                                        bgcolor: formData.isPfApplicable ? `${PRIMARY}30` : '#E8E8E8',
                                        color: formData.isPfApplicable ? PRIMARY_TEXT : '#999',
                                    }} />
                                </Box>
                                <Switch checked={formData.isPfApplicable} onChange={handleSwitchChange('isPfApplicable')} size="small"
                                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: PRIMARY }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: PRIMARY } }} />
                            </Box>
                            <TextField label="PF Number" value={formData.pfNumber} onChange={handleChange('pfNumber')}
                                size="small" fullWidth disabled={!formData.isPfApplicable}
                                placeholder="MH/BOM/12345/000"
                                slotProps={{ inputLabel: { shrink: true } }} sx={fieldSx} />
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
                        <Box sx={{
                            border: `1px solid ${formData.isEsiApplicable ? PRIMARY : '#E2E8F0'}`,
                            borderRadius: '7px', p: 2.5,
                            bgcolor: formData.isEsiApplicable ? PRIMARY_LIGHT : '#F8FAFC',
                            transition: 'all 0.3s ease',
                            boxShadow: formData.isEsiApplicable ? '0 2px 8px rgba(37,99,235,0.1)' : 'none',
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography sx={{ fontSize: '13px', fontWeight: '700', color: '#1a1a1a' }}>ESI</Typography>
                                    <Chip label="0.75%" size="small" sx={{
                                        height: '20px', fontSize: '10px', fontWeight: '700',
                                        bgcolor: formData.isEsiApplicable ? `${PRIMARY}30` : '#E8E8E8',
                                        color: formData.isEsiApplicable ? PRIMARY_TEXT : '#999',
                                    }} />
                                </Box>
                                <Switch checked={formData.isEsiApplicable} onChange={handleSwitchChange('isEsiApplicable')} size="small"
                                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: PRIMARY }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: PRIMARY } }} />
                            </Box>
                            <TextField label="ESI Number" value={formData.esiNumber} onChange={handleChange('esiNumber')}
                                size="small" fullWidth disabled={!formData.isEsiApplicable}
                                placeholder="31-00-123456-000-0001"
                                slotProps={{ inputLabel: { shrink: true } }} sx={fieldSx} />
                        </Box>
                    </Grid>
                </Grid>
            </SectionCard>
        </Box>
    );

    // ===== TAB 2: EARNINGS =====
    const renderEarningsTab = () => {
        const earningsRows = [
            { label: 'Basic Pay', sublabel: `₹${Math.round(calc.perDayRate).toLocaleString('en-IN')}/day × ${formData.daysPresent} days`, rateType: 'chip', chipLabel: 'Attendance Based', chipBg: '#FEF3C7', chipColor: '#92400E', amount: calc.effectiveBasicPay, icon: '💰' },
            { label: 'House Rent Allowance (HRA)', sublabel: `${formData.hraPercent}% of Effective Basic`, rateType: 'percent', field: 'hraPercent', amount: calc.hra, icon: '🏠' },
            { label: 'Dearness Allowance (DA)', sublabel: `${formData.daPercent}% of Effective Basic`, rateType: 'percent', field: 'daPercent', amount: calc.da, icon: '📊' },
            { label: 'Conveyance Allowance', sublabel: 'Pro-rated for days present', rateType: 'currency', field: 'conveyance', amount: calc.conveyance, icon: '🚌' },
            { label: 'Special Allowance', sublabel: 'Pro-rated for days present', rateType: 'currency', field: 'specialAllowance', amount: calc.specialAllowance, icon: '⭐' },
            { label: 'Overtime Pay', sublabel: `${formData.overtimeHours} hrs × 2x hourly rate`, rateType: 'chip', chipLabel: 'Auto-calculated', chipBg: '#F3F0FE', chipColor: '#1D4ED8', amount: calc.overtimePay, icon: '⏰' },
            { label: 'Bonus / Incentives', sublabel: 'Fixed amount', rateType: 'currency', field: 'bonus', amount: calc.bonus, icon: '🎁' },
        ];

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* Attendance Info Banner */}
                <Box sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    p: 2.5, borderRadius: CARD_RADIUS,
                    bgcolor: '#F8FAFC',
                    border: `1px solid #E2E8F0`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                            width: '44px', height: '44px', borderRadius: '7px',
                            bgcolor: PRIMARY_LIGHT,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: `1px solid ${PRIMARY}20`,
                        }}>
                            <InfoOutlinedIcon sx={{ fontSize: '20px', color: PRIMARY }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '13px', fontWeight: '700', color: '#1a1a1a' }}>
                                Earnings pro-rated by attendance
                            </Typography>
                            <Typography sx={{ fontSize: '11px', color: '#64748B', mt: 0.3 }}>
                                <strong>{formData.daysPresent}</strong> present / <strong>{formData.totalWorkingDays}</strong> working days ({calc.attendancePercent}%)
                            </Typography>
                        </Box>
                    </Box>
                    <Chip label={`${calc.attendancePercent}% Present`} size="small" sx={{
                        bgcolor: PRIMARY, color: '#fff',
                        fontWeight: '700', fontSize: '11px',
                        height: '28px',
                        boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
                    }} />
                </Box>

                {/* Earnings Table Card */}
                <Box sx={{
                    bgcolor: '#fff', borderRadius: CARD_RADIUS, overflow: 'hidden',
                    border: '1px solid #E8E8E8',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                    {/* Table Header */}
                    <Box sx={{
                        display: 'flex', alignItems: 'center',
                        bgcolor: '#FAFAFA',
                        borderBottom: '2px solid #F1F5F9', py: 2, px: 2.5,
                        position: 'relative',
                    }}>
                        <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', bgcolor: '#7FB4FF' }} />
                        <Typography sx={{ width: '40px', fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' }}>#</Typography>
                        <Typography sx={{ flex: 1, fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Component</Typography>
                        <Typography sx={{ width: '150px', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rate / Input</Typography>
                        <Typography sx={{ width: '140px', textAlign: 'right', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</Typography>
                    </Box>

                    {/* Table Rows */}
                    {earningsRows.map((row, index) => (
                        <Box key={row.label} sx={{
                            display: 'flex', alignItems: 'center', py: 2, px: 2.5,
                            bgcolor: '#fff',
                            borderBottom: index < earningsRows.length - 1 ? '1px solid #F1F5F9' : 'none',
                            transition: 'all 0.2s ease',
                            '&:hover': { bgcolor: '#F8FAFC', transform: 'translateX(2px)' },
                        }}>
                            <Box sx={{
                                width: '30px', height: '30px', borderRadius: '7px',
                                bgcolor: '#F8F9FA', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                mr: '10px',
                            }}>
                                <Typography sx={{ fontSize: '14px' }}>{row.icon}</Typography>
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography sx={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{row.label}</Typography>
                                <Typography sx={{ fontSize: '11px', color: '#94A3B8', mt: 0.2 }}>{row.sublabel}</Typography>
                            </Box>
                            <Box sx={{ width: '150px', display: 'flex', justifyContent: 'center' }}>
                                {row.rateType === 'chip' && (
                                    <Chip label={row.chipLabel} size="small" sx={{
                                        fontSize: '10px', bgcolor: row.chipBg, color: row.chipColor,
                                        fontWeight: '600', borderRadius: '7px',
                                    }} />
                                )}
                                {row.rateType === 'percent' && (
                                    <TextField value={formData[row.field]} onChange={handleChange(row.field)} size="small" type="number"
                                        slotProps={{ input: { endAdornment: <InputAdornment position="end"><Typography sx={{ fontSize: '12px', fontWeight: '600', color: '#94A3B8' }}>%</Typography></InputAdornment> } }}
                                        sx={smallFieldSx} />
                                )}
                                {row.rateType === 'currency' && (
                                    <TextField value={formData[row.field]} onChange={handleChange(row.field)} size="small" type="number"
                                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><Typography sx={{ fontSize: '12px', fontWeight: '600', color: '#94A3B8' }}>₹</Typography></InputAdornment> } }}
                                        sx={smallFieldSx} />
                                )}
                            </Box>
                            <Typography sx={{
                                width: '140px', textAlign: 'right',
                                fontSize: '15px', fontWeight: '700',
                                color: row.amount > 0 ? '#16A34A' : '#CBD5E1',
                            }}>
                                {row.amount > 0 ? formatCurrency(row.amount) : '—'}
                            </Typography>
                        </Box>
                    ))}
                </Box>

                {/* Gross Salary Total */}
                <Box sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    bgcolor: '#EFF5FF',
                    borderRadius: CARD_RADIUS, p: 3,
                    border: '1px solid #DBEAFE',
                    boxShadow: '0 2px 8px rgba(52,211,153,0.15)',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                            width: '48px', height: '48px', borderRadius: '7px',
                            bgcolor: '#7FB4FF',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(52,211,153,0.25)',
                        }}>
                            <TrendingUpIcon sx={{ fontSize: '24px', color: '#fff' }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '11px', color: '#15803D', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Earnings</Typography>
                            <Typography sx={{ fontSize: '12px', color: '#22C55E', mt: 0.3 }}>Gross Salary</Typography>
                        </Box>
                    </Box>
                    <Typography sx={{ fontSize: '28px', fontWeight: '800', color: '#16A34A' }}>{formatCurrency(calc.grossSalary)}</Typography>
                </Box>
            </Box>
        );
    };

    // ===== TAB 3: DEDUCTIONS =====
    const renderDeductionsTab = () => {
        const deductionRows = [
            { label: 'Provident Fund (PF)', sublabel: formData.isPfApplicable ? '12% of Effective Basic Pay' : 'Not applicable', rateType: 'text', rateText: formData.isPfApplicable ? '12% of Basic' : 'Disabled', amount: calc.pf, disabled: !formData.isPfApplicable, icon: '🏦' },
            { label: 'ESI', sublabel: formData.isEsiApplicable ? '0.75% of Gross (if Gross < ₹21,000)' : 'Not applicable', rateType: 'text', rateText: formData.isEsiApplicable ? '0.75% of Gross' : 'Disabled', amount: calc.esi, disabled: !formData.isEsiApplicable, icon: '🛡️' },
            { label: 'Professional Tax', sublabel: 'State-based monthly deduction', rateType: 'input', field: 'professionalTax', amount: calc.professionalTax, icon: '📋' },
            { label: 'Income Tax (TDS)', sublabel: 'Tax deducted at source', rateType: 'input', field: 'tds', amount: calc.tds, icon: '🏛️' },
            { label: 'Other Deduction', sublabel: 'Any other monthly deductions', rateType: 'input', field: 'otherDeduction', amount: calc.otherDeduction, icon: '📑' },
            { label: 'Late Coming / LOP Deduction', sublabel: `${formData.lopDays} LOP days × ₹${Math.round(calc.perDayRate).toLocaleString('en-IN')}/day`, rateType: 'chip', chipLabel: 'Auto-calculated', amount: calc.lopDeduction, icon: '⏳' },
        ];

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* Deductions Table Card */}
                <Box sx={{
                    bgcolor: '#fff', borderRadius: CARD_RADIUS, overflow: 'hidden',
                    border: '1px solid #E8E8E8',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                    {/* Table Header */}
                    <Box sx={{
                        display: 'flex', alignItems: 'center',
                        bgcolor: '#FAFAFA',
                        borderBottom: '2px solid #F1F5F9', py: 2, px: 2.5,
                        position: 'relative',
                    }}>
                        <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', bgcolor: '#F87171' }} />
                        <Typography sx={{ width: '40px', fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' }}>#</Typography>
                        <Typography sx={{ flex: 1, fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deduction</Typography>
                        <Typography sx={{ width: '150px', textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rate / Input</Typography>
                        <Typography sx={{ width: '140px', textAlign: 'right', fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</Typography>
                    </Box>

                    {/* Table Rows */}
                    {deductionRows.map((row, index) => (
                        <Box key={row.label} sx={{
                            display: 'flex', alignItems: 'center', py: 2, px: 2.5,
                            bgcolor: '#fff',
                            borderBottom: index < deductionRows.length - 1 ? '1px solid #F1F5F9' : 'none',
                            transition: 'all 0.2s ease',
                            opacity: row.disabled ? 0.5 : 1,
                            '&:hover': { bgcolor: row.disabled ? undefined : '#F8FAFC', transform: row.disabled ? undefined : 'translateX(2px)' },
                        }}>
                            <Box sx={{
                                width: '30px', height: '30px', borderRadius: '7px',
                                bgcolor: '#F8F9FA', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                mr: '10px',
                            }}>
                                <Typography sx={{ fontSize: '14px' }}>{row.icon}</Typography>
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography sx={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{row.label}</Typography>
                                    {row.disabled && (
                                        <Chip label="Disabled" size="small" sx={{
                                            height: '18px', fontSize: '9px', fontWeight: '600',
                                            bgcolor: '#F3F4F6', color: '#9CA3AF',
                                        }} />
                                    )}
                                </Box>
                                <Typography sx={{ fontSize: '11px', color: '#94A3B8', mt: 0.2 }}>{row.sublabel}</Typography>
                            </Box>
                            <Box sx={{ width: '150px', display: 'flex', justifyContent: 'center' }}>
                                {row.rateType === 'text' && (
                                    <Chip label={row.rateText} size="small" variant="outlined" sx={{
                                        fontSize: '10px', fontWeight: '600', borderRadius: '7px',
                                        borderColor: row.disabled ? '#E8E8E8' : '#FECACA', color: row.disabled ? '#9CA3AF' : '#DC2626',
                                    }} />
                                )}
                                {row.rateType === 'input' && (
                                    <TextField value={formData[row.field]} onChange={handleChange(row.field)} size="small" type="number"
                                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><Typography sx={{ fontSize: '12px', fontWeight: '600', color: '#94A3B8' }}>₹</Typography></InputAdornment> } }}
                                        sx={smallFieldSx} />
                                )}
                                {row.rateType === 'chip' && (
                                    <Chip label={row.chipLabel} size="small" sx={{
                                        fontSize: '10px', bgcolor: '#FEE2E2', color: '#991B1B',
                                        fontWeight: '600', borderRadius: '7px',
                                    }} />
                                )}
                            </Box>
                            <Typography sx={{
                                width: '140px', textAlign: 'right',
                                fontSize: '15px', fontWeight: '700',
                                color: row.amount > 0 ? '#DC2626' : '#CBD5E1',
                            }}>
                                {row.amount > 0 ? `-${formatCurrency(row.amount)}` : '—'}
                            </Typography>
                        </Box>
                    ))}
                </Box>

                {/* Total Deductions */}
                <Box sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    bgcolor: '#FEF2F2',
                    borderRadius: CARD_RADIUS, p: 3,
                    border: '1px solid #FECACA',
                    boxShadow: '0 2px 8px rgba(248,113,113,0.15)',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                            width: '48px', height: '48px', borderRadius: '7px',
                            bgcolor: '#F87171',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(248,113,113,0.25)',
                        }}>
                            <TrendingDownIcon sx={{ fontSize: '24px', color: '#fff' }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '11px', color: '#991B1B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Deductions</Typography>
                            <Typography sx={{ fontSize: '12px', color: '#EF4444', mt: 0.3 }}>Monthly deductions</Typography>
                        </Box>
                    </Box>
                    <Typography sx={{ fontSize: '28px', fontWeight: '800', color: '#DC2626' }}>-{formatCurrency(calc.totalDeductions)}</Typography>
                </Box>
            </Box>
        );
    };

    // ===== TAB 4: SALARY CALCULATION =====
    const renderSalaryTab = () => {
        const attendanceCards = [
            { label: 'Working Days', value: formData.totalWorkingDays, icon: CalendarMonthOutlinedIcon, color: '#60A5FA', bgColor: PRIMARY_LIGHT },
            { label: 'Days Present', value: formData.daysPresent, icon: AccessTimeOutlinedIcon, color: '#7FB4FF', bgColor: '#EFF5FF' },
            { label: 'Leave Taken', value: formData.leaveTaken, icon: WorkHistoryOutlinedIcon, color: '#A78BFA', bgColor: '#F3F0FE' },
            { label: 'LOP Days', value: formData.lopDays, icon: EventBusyOutlinedIcon, color: '#F87171', bgColor: '#FEF2F2' },
            { label: 'Overtime Hrs', value: formData.overtimeHours, icon: TimerOutlinedIcon, color: '#38BDF8', bgColor: '#F1EEFE' },
        ];

        const earningItems = [
            { label: 'Basic Pay', sublabel: `(${formData.daysPresent}/${formData.totalWorkingDays} days)`, value: calc.effectiveBasicPay },
            { label: `HRA (${formData.hraPercent}%)`, value: calc.hra },
            { label: `DA (${formData.daPercent}%)`, value: calc.da },
            { label: 'Conveyance', value: calc.conveyance },
            ...(calc.specialAllowance > 0 ? [{ label: 'Special Allowance', value: calc.specialAllowance }] : []),
            ...(calc.overtimePay > 0 ? [{ label: 'Overtime Pay', value: calc.overtimePay }] : []),
            ...(calc.bonus > 0 ? [{ label: 'Bonus / Incentives', value: calc.bonus }] : []),
        ];

        const deductionItems = [
            ...(calc.pf > 0 ? [{ label: 'PF (12%)', value: calc.pf }] : []),
            ...(calc.esi > 0 ? [{ label: 'ESI (0.75%)', value: calc.esi }] : []),
            ...(calc.professionalTax > 0 ? [{ label: 'Professional Tax', value: calc.professionalTax }] : []),
            ...(calc.tds > 0 ? [{ label: 'Income Tax (TDS)', value: calc.tds }] : []),
            ...(calc.otherDeduction > 0 ? [{ label: 'Other Deduction', value: calc.otherDeduction }] : []),
            ...(calc.lopDeduction > 0 ? [{ label: `LOP (${formData.lopDays} days)`, value: calc.lopDeduction }] : []),
        ];

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* Auto-fetched Info */}
                <Box sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    p: 2.5, borderRadius: CARD_RADIUS,
                    bgcolor: '#F8FAFC',
                    border: `1px solid #E2E8F0`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{
                            width: '44px', height: '44px', borderRadius: '7px',
                            bgcolor: PRIMARY_LIGHT,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: `1px solid ${PRIMARY}20`,
                        }}>
                            <InfoOutlinedIcon sx={{ fontSize: '20px', color: PRIMARY }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '13px', fontWeight: '700', color: '#1a1a1a' }}>Auto-fetched from Leave Management</Typography>
                            <Typography sx={{ fontSize: '11px', color: '#64748B', mt: 0.3 }}>Attendance data synced for current pay period</Typography>
                        </Box>
                    </Box>
                </Box>

                {/* Attendance Rate */}
                <Box sx={{
                    bgcolor: '#fff', border: '1px solid #E8E8E8', borderRadius: CARD_RADIUS,
                    p: 2.5, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    position: 'relative', overflow: 'hidden',
                }}>
                    <Box sx={{
                        position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
                        background: calc.attendancePercent >= 90 ? 'linear-gradient(180deg, #7FB4FF, #93C5FD)' :
                            calc.attendancePercent >= 75 ? 'linear-gradient(180deg, #FBBF24, #FCD34D)' :
                                'linear-gradient(180deg, #F87171, #FCA5A5)',
                    }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography sx={{ fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>Attendance Rate</Typography>
                        <Chip label={`${calc.attendancePercent}%`} size="small"
                            sx={{
                                bgcolor: calc.attendancePercent >= 90 ? '#DBEAFE' : calc.attendancePercent >= 75 ? '#FEF3C7' : '#FEE2E2',
                                color: calc.attendancePercent >= 90 ? '#15803D' : calc.attendancePercent >= 75 ? '#92400E' : '#991B1B',
                                fontWeight: '700', fontSize: '13px', px: 1,
                            }} />
                    </Box>
                    <LinearProgress variant="determinate" value={calc.attendancePercent}
                        sx={{
                            height: 12, borderRadius: 6, bgcolor: '#F1F5F9',
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 6,
                                background: calc.attendancePercent >= 90 ? 'linear-gradient(90deg, #7FB4FF, #93C5FD)' :
                                    calc.attendancePercent >= 75 ? 'linear-gradient(90deg, #FBBF24, #FCD34D)' :
                                        'linear-gradient(90deg, #F87171, #FCA5A5)',
                            }
                        }} />
                    <Typography sx={{ fontSize: '12px', color: '#64748B', mt: 1.2 }}>
                        {formData.daysPresent} present out of {formData.totalWorkingDays} working days
                    </Typography>
                </Box>

                {/* Attendance Cards */}
                <Grid container spacing={2}>
                    {attendanceCards.map((card, index) => (
                        <Grid key={index} size={{ xs: 6, sm: 4, md: 2.4, lg: 2.4 }}>
                            <Box sx={{
                                bgcolor: '#fff', border: '1px solid #E8E8E8', borderRadius: CARD_RADIUS,
                                p: 2, textAlign: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                transition: 'all 0.3s',
                                position: 'relative', overflow: 'hidden',
                                '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', borderColor: card.color },
                            }}>
                                <Box sx={{
                                    position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                                    bgcolor: card.color, opacity: 0.6,
                                }} />
                                <Box sx={{
                                    width: '46px', height: '46px', borderRadius: '7px',
                                    bgcolor: card.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    mx: 'auto', mb: 1.5, border: `1px solid ${card.color}25`,
                                }}>
                                    <card.icon sx={{ fontSize: '22px', color: card.color }} />
                                </Box>
                                <Typography sx={{ fontSize: '28px', fontWeight: '800', color: card.color, lineHeight: 1 }}>{card.value}</Typography>
                                <Typography sx={{ fontSize: '11px', color: '#64748B', mt: 0.8, fontWeight: '500' }}>{card.label}</Typography>
                            </Box>
                        </Grid>
                    ))}
                </Grid>

                {/* Payslip Breakdown */}
                <Box sx={{
                    bgcolor: '#fff', border: '1px solid #E8E8E8', borderRadius: CARD_RADIUS,
                    overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}>
                    <Box sx={{
                        background: `linear-gradient(135deg, ${PRIMARY_LIGHT} 0%, #fff 60%)`,
                        px: 2.5, py: 2, borderBottom: '2px solid #F0F0F0',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        position: 'relative',
                    }}>
                        <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: PRIMARY_GRADIENT }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{
                                width: '36px', height: '36px', borderRadius: '7px',
                                background: PRIMARY_GRADIENT,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <ReceiptLongIcon sx={{ fontSize: '18px', color: '#fff' }} />
                            </Box>
                            <Typography sx={{ fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>Salary Breakdown</Typography>
                        </Box>
                        {formData.name && (
                            <Chip
                                avatar={<Avatar sx={{ bgcolor: PRIMARY, color: '#1a1a1a', width: 22, height: 22, fontSize: '11px' }}>{formData.name.charAt(0)}</Avatar>}
                                label={`${formData.name} (${formData.employeeId})`}
                                size="small" variant="outlined"
                                sx={{ fontSize: '11px', fontWeight: '600', borderColor: '#E8E8E8' }}
                            />
                        )}
                    </Box>

                    <Box sx={{ p: 2.5 }}>
                        <Grid container spacing={3}>
                            {/* Earnings Column */}
                            <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
                                <Box sx={{
                                    bgcolor: '#EFF5FF', borderRadius: '7px', p: 2,
                                    border: '1px solid #C9BEFB',
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                        <Box sx={{ width: '8px', height: '8px', borderRadius: '50%', bgcolor: '#7FB4FF' }} />
                                        <Typography sx={{ fontSize: '12px', fontWeight: '700', color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Earnings</Typography>
                                    </Box>
                                    {earningItems.map((item, i) => (
                                        <Box key={i} sx={{
                                            display: 'flex', justifyContent: 'space-between', py: 0.8,
                                            borderBottom: i < earningItems.length - 1 ? '1px dashed #DBEAFE' : 'none',
                                        }}>
                                            <Box>
                                                <Typography sx={{ fontSize: '13px', color: '#334155' }}>{item.label}</Typography>
                                                {item.sublabel && <Typography sx={{ fontSize: '10px', color: '#94A3B8' }}>{item.sublabel}</Typography>}
                                            </Box>
                                            <Typography sx={{ fontSize: '13px', fontWeight: '600', color: '#15803D' }}>{formatCurrency(item.value)}</Typography>
                                        </Box>
                                    ))}
                                    <Divider sx={{ my: 1.5, borderColor: '#86EFAC' }} />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography sx={{ fontSize: '14px', fontWeight: '700', color: '#15803D' }}>Gross Salary</Typography>
                                        <Typography sx={{ fontSize: '17px', fontWeight: '800', color: '#15803D' }}>{formatCurrency(calc.grossSalary)}</Typography>
                                    </Box>
                                </Box>
                            </Grid>

                            {/* Deductions Column */}
                            <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
                                <Box sx={{
                                    bgcolor: '#FEF2F2', borderRadius: '7px', p: 2,
                                    border: '1px solid #FECACA',
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                        <Box sx={{ width: '8px', height: '8px', borderRadius: '50%', bgcolor: '#F87171' }} />
                                        <Typography sx={{ fontSize: '12px', fontWeight: '700', color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deductions</Typography>
                                    </Box>
                                    {deductionItems.length > 0 ? deductionItems.map((item, i) => (
                                        <Box key={i} sx={{
                                            display: 'flex', justifyContent: 'space-between', py: 0.8,
                                            borderBottom: i < deductionItems.length - 1 ? '1px dashed #FED7D7' : 'none',
                                        }}>
                                            <Typography sx={{ fontSize: '13px', color: '#334155' }}>{item.label}</Typography>
                                            <Typography sx={{ fontSize: '13px', fontWeight: '600', color: '#DC2626' }}>-{formatCurrency(item.value)}</Typography>
                                        </Box>
                                    )) : (
                                        <Typography sx={{ fontSize: '13px', color: '#94A3B8', py: 0.8 }}>No deductions applicable</Typography>
                                    )}
                                    <Divider sx={{ my: 1.5, borderColor: '#FCA5A5' }} />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography sx={{ fontSize: '14px', fontWeight: '700', color: '#DC2626' }}>Total Deductions</Typography>
                                        <Typography sx={{ fontSize: '17px', fontWeight: '800', color: '#DC2626' }}>-{formatCurrency(calc.totalDeductions)}</Typography>
                                    </Box>
                                </Box>
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Net Salary Banner */}
                    <Box sx={{
                        bgcolor: '#60A5FA',
                        p: 3.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        position: 'relative', overflow: 'hidden',
                        boxShadow: '0 4px 12px rgba(96,165,250,0.25)',
                    }}>
                        {/* Decorative circles */}
                        <Box sx={{ position: 'absolute', right: -20, top: -20, width: '120px', height: '120px', borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.1)' }} />
                        <Box sx={{ position: 'absolute', right: 60, bottom: -30, width: '80px', height: '80px', borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
                        <Box sx={{ position: 'relative', zIndex: 1 }}>
                            <Typography sx={{ fontSize: '12px', color: '#E0F2FE', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '700' }}>Net Salary (Take Home)</Typography>
                            {formData.employeeId && (
                                <Typography sx={{ fontSize: '12px', color: '#DBEAFE', mt: 0.8, fontWeight: '500' }}>
                                    {calc.attendancePercent}% Attendance &bull; {formData.daysPresent}/{formData.totalWorkingDays} days
                                </Typography>
                            )}
                        </Box>
                        <Typography sx={{
                            fontSize: '36px', fontWeight: '800', color: '#fff',
                            position: 'relative', zIndex: 1,
                        }}>
                            {formatCurrency(calc.netSalary)}
                        </Typography>
                    </Box>
                </Box>
            </Box>
        );
    };

    return (
        <Box sx={{ height: '86vh', display: 'flex', flexDirection: 'column', bgcolor: '#FAFAFA', borderRadius: '20px', border: '1px solid #E8E8E8', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            {/* Header */}
            <Box sx={{
                bgcolor: '#fff',
                borderBottom: '2px solid #F1F5F9',
                px: 3, py: 2, flexShrink: 0,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={() => navigate('/dashboardmenu/Leave', { state: { moduleTab } })} sx={{
                        width: '40px', height: '40px',
                        bgcolor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '7px',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                            bgcolor: PRIMARY_LIGHT,
                            borderColor: PRIMARY,
                            transform: 'translateX(-2px)',
                        },
                    }}>
                        <ArrowBackIcon sx={{ fontSize: 20, color: '#64748B' }} />
                    </IconButton>
                    <Box>
                        <Typography sx={{ fontSize: '18px', fontWeight: '800', color: '#1a1a1a' }}>
                            {isEditMode ? 'Edit Staff Payroll' : 'Add Staff Payroll'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.3 }}>
                            <Typography sx={{ fontSize: '12px', color: '#94A3B8' }}>Payroll</Typography>
                            <Typography sx={{ fontSize: '12px', color: '#94A3B8' }}>/</Typography>
                            <Typography sx={{ fontSize: '12px', color: PRIMARY_TEXT, fontWeight: '600' }}>
                                {isEditMode ? 'Edit Entry' : 'New Entry'}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
                {/* Quick salary summary in header */}
                {formData.basicSalary && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography sx={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gross</Typography>
                            <Typography sx={{ fontSize: '14px', fontWeight: '700', color: '#16A34A' }}>{formatCurrency(calc.grossSalary)}</Typography>
                        </Box>
                        <Box sx={{ width: '1px', height: '28px', bgcolor: '#E8E8E8' }} />
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography sx={{ fontSize: '10px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net</Typography>
                            <Typography sx={{ fontSize: '14px', fontWeight: '700', color: '#6246E0' }}>{formatCurrency(calc.netSalary)}</Typography>
                        </Box>
                    </Box>
                )}
            </Box>

            {/* Tab Navigation - Stepper Style */}
            <Box sx={{
                bgcolor: '#FAFAFA', borderBottom: '2px solid #F1F5F9',
                px: 3, flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 0,
            }}>
                {tabs.map((tab, i) => {
                    const isActive = activeTab === i;
                    const isCompleted = activeTab > i;
                    const TabIcon = tab.icon;
                    return (
                        <React.Fragment key={i}>
                            <Box
                                onClick={() => setActiveTab(i)}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 1.5,
                                    px: 2.5, py: 2,
                                    cursor: 'pointer',
                                    borderBottom: isActive ? `3px solid ${PRIMARY}` : '3px solid transparent',
                                    transition: 'all 0.25s ease',
                                    position: 'relative',
                                    bgcolor: isActive ? '#fff' : 'transparent',
                                    '&:hover': { bgcolor: isActive ? '#fff' : '#F8FAFC' },
                                }}
                            >
                                <Box sx={{
                                    width: '36px', height: '36px', borderRadius: '7px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    bgcolor: isActive ? PRIMARY : isCompleted ? '#7FB4FF' : '#E2E8F0',
                                    color: '#fff',
                                    transition: 'all 0.25s ease',
                                    boxShadow: isActive ? `0 2px 8px rgba(59,130,246,0.3)` : isCompleted ? '0 2px 8px rgba(52,211,153,0.25)' : 'none',
                                }}>
                                    {isCompleted ? (
                                        <CheckCircleIcon sx={{ fontSize: '18px' }} />
                                    ) : (
                                        <TabIcon sx={{ fontSize: '16px' }} />
                                    )}
                                </Box>
                                <Box>
                                    <Typography sx={{
                                        fontSize: '11px', fontWeight: '500', color: '#94A3B8',
                                        lineHeight: 1,
                                    }}>
                                        Step {i + 1}
                                    </Typography>
                                    <Typography sx={{
                                        fontSize: '13px', fontWeight: '700',
                                        color: isActive ? '#1a1a1a' : isCompleted ? '#16A34A' : '#64748B',
                                        lineHeight: 1.3,
                                    }}>
                                        {tab.label}
                                    </Typography>
                                </Box>
                            </Box>
                            {/* Connector line between tabs */}
                            {i < tabs.length - 1 && (
                                <Box sx={{
                                    width: '24px', height: '2px', mx: 0.5,
                                    bgcolor: activeTab > i ? '#7FB4FF' : '#CBD5E1',
                                    borderRadius: '2px',
                                    transition: 'all 0.3s ease',
                                }} />
                            )}
                        </React.Fragment>
                    );
                })}
            </Box>

            {/* Tab Content */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
                {activeTab === 0 && renderEmployeeTab()}
                {activeTab === 1 && renderEarningsTab()}
                {activeTab === 2 && renderDeductionsTab()}
                {activeTab === 3 && renderSalaryTab()}
            </Box>

            {/* Bottom Action Bar */}
            <Box sx={{
                flexShrink: 0, bgcolor: '#fff', borderTop: '2px solid #F1F5F9',
                px: 3, py: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 -2px 8px rgba(0,0,0,0.05)',
            }}>
                <Box sx={{ display: 'flex', gap: 3.5, alignItems: 'center' }}>
                    {/* Summary chips */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: '8px', height: '8px', borderRadius: '50%', bgcolor: '#7FB4FF' }} />
                        <Box>
                            <Typography sx={{ fontSize: '10px', color: '#94A3B8', fontWeight: '500', lineHeight: 1 }}>Gross</Typography>
                            <Typography sx={{ fontSize: '16px', fontWeight: '700', color: '#16A34A' }}>{formatCurrency(calc.grossSalary)}</Typography>
                        </Box>
                    </Box>
                    <Typography sx={{ fontSize: '18px', color: '#E8E8E8', fontWeight: '300' }}>−</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: '8px', height: '8px', borderRadius: '50%', bgcolor: '#F87171' }} />
                        <Box>
                            <Typography sx={{ fontSize: '10px', color: '#94A3B8', fontWeight: '500', lineHeight: 1 }}>Deductions</Typography>
                            <Typography sx={{ fontSize: '16px', fontWeight: '700', color: '#DC2626' }}>-{formatCurrency(calc.totalDeductions)}</Typography>
                        </Box>
                    </Box>
                    <Typography sx={{ fontSize: '18px', color: '#E8E8E8', fontWeight: '300' }}>=</Typography>
                    <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 2,
                        bgcolor: PRIMARY_LIGHT, px: 3, py: 1.5, borderRadius: '7px',
                        border: `1px solid #60A5FA30`,
                        boxShadow: '0 2px 8px rgba(96,165,250,0.15)',
                    }}>
                        <Box sx={{
                            width: '36px', height: '36px', borderRadius: '7px',
                            bgcolor: '#60A5FA',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(96,165,250,0.2)',
                        }}>
                            <Typography sx={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>₹</Typography>
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '10px', color: '#64748B', fontWeight: '600', lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Net Salary</Typography>
                            <Typography sx={{ fontSize: '20px', fontWeight: '800', color: '#6246E0', mt: 0.5 }}>{formatCurrency(calc.netSalary)}</Typography>
                        </Box>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    {/* Previous / Next Tab buttons */}
                    {activeTab > 0 && (
                        <Button
                            onClick={() => setActiveTab(prev => prev - 1)}
                            startIcon={<ArrowBackIosNewIcon sx={{ fontSize: '14px !important' }} />}
                            sx={{
                                textTransform: 'none', color: '#666', border: '1px solid #E5E7EB',
                                borderRadius: '7px', fontSize: '13px', fontWeight: '600', px: 2.5,
                                '&:hover': { bgcolor: '#F9FAFB', borderColor: '#D1D5DB' },
                            }}>
                            Back
                        </Button>
                    )}
                    {activeTab < 3 && (
                        <Button
                            onClick={() => setActiveTab(prev => prev + 1)}
                            endIcon={<ArrowForwardIcon sx={{ fontSize: '16px !important' }} />}
                            sx={{
                                textTransform: 'none', color: '#666', border: '1px solid #E5E7EB',
                                borderRadius: '7px', fontSize: '13px', fontWeight: '600', px: 2.5,
                                '&:hover': { bgcolor: '#F9FAFB', borderColor: '#D1D5DB' },
                            }}>
                            Next
                        </Button>
                    )}
                    <Button onClick={() => navigate('/dashboardmenu/Leave', { state: { moduleTab } })}
                        sx={{
                            textTransform: 'none', color: '#666', border: '1px solid #E5E7EB',
                            borderRadius: '7px', fontSize: '13px', fontWeight: '600', px: 3,
                            '&:hover': { bgcolor: '#F9FAFB', borderColor: '#D1D5DB' },
                        }}>
                        Cancel
                    </Button>
                    <Button variant="contained" startIcon={<SaveOutlinedIcon />} onClick={handleSave}
                        sx={{
                            textTransform: 'none',
                            bgcolor: PRIMARY,
                            color: '#fff',
                            borderRadius: '7px', fontSize: '13px', fontWeight: '700', px: 3.5, py: 1,
                            boxShadow: `0 2px 8px rgba(37,99,235,0.3)`,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                bgcolor: PRIMARY_DARK,
                                boxShadow: `0 4px 12px rgba(37,99,235,0.4)`,
                                transform: 'translateY(-1px)',
                            },
                        }}>
                        {isEditMode ? 'Update Payroll' : 'Save Payroll'}
                    </Button>
                </Box>
            </Box>
        </Box>
    );
}
