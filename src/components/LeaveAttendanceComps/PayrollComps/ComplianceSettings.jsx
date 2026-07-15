import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, TextField, Button, Grid, IconButton,
    Card, CardContent, Switch, InputAdornment, Chip, Tab, Tabs,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Avatar,
    Dialog, DialogContent, DialogActions, CircularProgress, Tooltip,
} from '@mui/material';
import http from '../../../Api/http';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SecurityIcon from '@mui/icons-material/Security';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useSelector } from 'react-redux';
import { selectWebsiteSettings } from '../../../redux/slices/websiteSettingsSlice';
import SnackBar from '../../SnackBar';
import {
    employeeComplianceDashboard, postPFConfiguration, postESIConfiguration,
    postProfessionalTaxConfiguration, postTDSConfiguration, getDeductionsAndCompliance,
    updateEmployeeComplianceByRollnumber,
} from '../../../Api/Api';
import * as XLSX from 'xlsx';

// ─── Theme (matches Salary Structures / Bank Reports) ──────────────────────
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

export default function ComplianceSettings() {
    const user = useSelector((state) => state.auth);
    const rollNumber = user.rollNumber;
    const websiteSettings = useSelector(selectWebsiteSettings);
    const [activeTab, setActiveTab] = useState(0);

    const [snackOpen, setSnackOpen] = useState(false);
    const [snackStatus, setSnackStatus] = useState(false);
    const [snackColor, setSnackColor] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const showSnack = (msg, success) => {
        setSnackMessage(msg); setSnackOpen(true); setSnackColor(success); setSnackStatus(success);
    };

    const [pfSettings, setPfSettings] = useState({
        enabled: true,
        employeeContribution: 12,
        employerContribution: 12,
        wageLimit: 15000,
        adminCharges: 0.5,
        edliCharges: 0.5,
    });

    const [esiSettings, setEsiSettings] = useState({
        enabled: true,
        employeeContribution: 0.75,
        employerContribution: 3.25,
        wageLimit: 21000,
    });

    const [ptSettings, setPtSettings] = useState({
        enabled: true,
        monthlyDeduction: 200,
        annualDeduction: 2400,
        applicableFrom: 15000,
    });

    const [tdsSettings, setTdsSettings] = useState({
        enabled: true,
        standardDeduction: 50000,
        section80C: 150000,
        section80D: 25000,
        hraExemption: true,
    });

    const [stats, setStats] = useState({
        totalEmployees: 0,
        pfApplicableCount: 0,
        esiApplicableCount: 0,
        ptApplicableCount: 0,
        totalIncentives: 0,
        incentiveEmployeesCount: 0,
        totalAdditionalSalary: 0,
        additionalSalaryEmployeesCount: 0,
    });

    const [employeeData, setEmployeeData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isPFSaving, setIsPFSaving] = useState(false);
    const [isESISaving, setIsESISaving] = useState(false);
    const [isPTSaving, setIsPTSaving] = useState(false);
    const [isTDSSaving, setIsTDSSaving] = useState(false);
    const [isSavingCompliance, setIsSavingCompliance] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [editedCompliance, setEditedCompliance] = useState(null);

    useEffect(() => {
        fetchComplianceDashboard();
        fetchDeductionsConfig();
    }, []);

    const fetchDeductionsConfig = async () => {
        try {
            const res = await http.get(getDeductionsAndCompliance);
            if (res.data && !res.data.error) {
                const d = res.data.data;
                setPfSettings(prev => ({
                    ...prev,
                    employeeContribution: Number(d.pfEmployeeContribution) || prev.employeeContribution,
                    employerContribution: Number(d.pfEmployerContribution) || prev.employerContribution,
                    wageLimit:            Number(d.pfWageCellingLimite)    || prev.wageLimit,
                    adminCharges:         Number(d.pfAdminCharges)         || prev.adminCharges,
                }));
                setEsiSettings(prev => ({
                    ...prev,
                    employeeContribution: Number(d.esiEmployeeContribution) || prev.employeeContribution,
                    employerContribution: Number(d.esiEmployerContribution) || prev.employerContribution,
                    wageLimit:            Number(d.esiWageCellingLimite)    || prev.wageLimit,
                }));
                setPtSettings(prev => ({
                    ...prev,
                    monthlyDeduction: Number(d.monthlyPTDeduction)    || prev.monthlyDeduction,
                    annualDeduction:  Number(d.annualPTDeduction)     || prev.annualDeduction,
                    applicableFrom:   Number(d.applicationFromSalary) || prev.applicableFrom,
                }));
                setTdsSettings(prev => ({
                    ...prev,
                    standardDeduction: Number(d.standardDeduction) || prev.standardDeduction,
                    section80C:        Number(d.section80cLimit)   || prev.section80C,
                    section80D:        Number(d.section80DLimit)   || prev.section80D,
                    hraExemption:      d.hraExemption === 'Y',
                }));
            }
        } catch {
        }
    };

    const fetchComplianceDashboard = async () => {
        setIsLoading(true);
        try {
            const res = await http.get(employeeComplianceDashboard);
            if (res.data && !res.data.error) {
                const d = res.data.data;
                setStats({
                    totalEmployees: d.totalEmployees,
                    pfApplicableCount: d.pfApplicable,
                    esiApplicableCount: d.esiApplicable,
                    ptApplicableCount: d.ptApplicable,
                    totalIncentives: d.totalIncentives,
                    incentiveEmployeesCount: d.incentiveEmployeesCount,
                    totalAdditionalSalary: d.totalAdditionalSalary,
                    additionalSalaryEmployeesCount: d.additionalSalaryEmployeesCount,
                });
                setEmployeeData((d.employees || []).map(emp => ({
                    id: emp.id,
                    employeeId: emp.rollNumber,
                    rollNumber: emp.rollNumber,
                    name: emp.name,
                    designation: emp.designation,
                    basicSalary: emp.basicSalary,
                    incentive: emp.incentive ?? 0,
                    additionalSalary: emp.addSalary ?? 0,
                    compliance: {
                        pfApplicable: emp.pf !== null && emp.pf !== '',
                        pfPercentage: Number(emp.pf) || 0,
                        esiApplicable: emp.esi !== null && emp.esi !== '',
                        esiPercentage: Number(emp.esi) || 0,
                        ptApplicable: emp.pt !== null && emp.pt !== '',
                        ptAmount: Number(emp.pt) || 0,
                        tdsApplicable: emp.tds !== null && emp.tds !== '',
                        tdsPercentage: Number(emp.tds) || 0,
                    },
                })));
            } else {
                showSnack('Failed to load compliance data', false);
            }
        } catch {
            showSnack('Failed to load compliance data', false);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredEmployees = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return employeeData;
        return employeeData.filter(emp =>
            (emp.name || '').toLowerCase().includes(q) ||
            (emp.employeeId || '').toLowerCase().includes(q) ||
            (emp.designation || '').toLowerCase().includes(q)
        );
    }, [employeeData, searchQuery]);

    const searchActive = searchQuery.trim().length > 0;

    const handleEditEmployee = (employee) => {
        setSelectedEmployee(employee);
        setEditedCompliance({ ...employee.compliance });
        setEditDialogOpen(true);
    };

    const handleSaveEmployeeCompliance = async () => {
        if (!selectedEmployee || !editedCompliance) return;

        const body = {
            rollNumber:  selectedEmployee.rollNumber,
            incentive:   selectedEmployee.incentive,
            addSalary:   selectedEmployee.additionalSalary,
            pf:  editedCompliance.pfApplicable  ? String(editedCompliance.pfPercentage)  : '',
            esi: editedCompliance.esiApplicable ? String(editedCompliance.esiPercentage) : '',
            pt:  editedCompliance.ptApplicable  ? String(editedCompliance.ptAmount)      : '',
            tds: editedCompliance.tdsApplicable ? String(editedCompliance.tdsPercentage) : '',
        };

        setIsSavingCompliance(true);
        try {
            const res = await http.put(updateEmployeeComplianceByRollnumber, body);

            if (res.data && !res.data.error) {
                setEmployeeData(employeeData.map(emp =>
                    emp.id === selectedEmployee.id
                        ? { ...emp, compliance: editedCompliance }
                        : emp
                ));
                showSnack(`Compliance settings updated for ${selectedEmployee.name}!`, true);
                setEditDialogOpen(false);
                setSelectedEmployee(null);
                setEditedCompliance(null);
            } else {
                showSnack(res.data?.message || 'Failed to update compliance settings', false);
            }
        } catch {
            showSnack('Failed to update compliance settings. Please try again.', false);
        } finally {
            setIsSavingCompliance(false);
        }
    };

    const handleExportCompliance = () => {
        const excelData = employeeData.map((emp, index) => ({
            'S.No': index + 1,
            'Employee ID': emp.employeeId,
            'Employee Name': emp.name,
            'Designation': emp.designation,
            'Basic Salary': emp.basicSalary,
            'Additional Salary': emp.additionalSalary,
            'PF Applicable': emp.compliance.pfApplicable ? 'Yes' : 'No',
            'PF %': emp.compliance.pfApplicable ? `${emp.compliance.pfPercentage}%` : 'N/A',
            'ESI Applicable': emp.compliance.esiApplicable ? 'Yes' : 'No',
            'ESI %': emp.compliance.esiApplicable ? `${emp.compliance.esiPercentage}%` : 'N/A',
            'PT Applicable': emp.compliance.ptApplicable ? 'Yes' : 'No',
            'PT Amount': emp.compliance.ptApplicable ? `₹${emp.compliance.ptAmount}` : 'N/A',
            'TDS Applicable': emp.compliance.tdsApplicable ? 'Yes' : 'No',
            'TDS %': emp.compliance.tdsApplicable ? `${emp.compliance.tdsPercentage}%` : 'N/A',
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        const colWidths = [
            { wch: 6 }, { wch: 12 }, { wch: 20 }, { wch: 18 },
            { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 14 },
            { wch: 8 }, { wch: 14 }, { wch: 8 }, { wch: 14 },
            { wch: 10 }, { wch: 14 }, { wch: 8 }
        ];
        ws['!cols'] = colWidths;
        XLSX.utils.book_append_sheet(wb, ws, 'Employee Compliance');
        const fileName = `Employee_Compliance_Settings_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        showSnack('Employee compliance data exported successfully!', true);
    };

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

    const handleSave = async () => {
        const now = new Date().toISOString();

        if (activeTab === 1) {
            if (!pfSettings.employeeContribution || !pfSettings.employerContribution) {
                showSnack('Please fill all required PF fields', false);
                return;
            }
            const body = {
                rollNumber: rollNumber,
                createdOn: now,
                updatedOn: now,
                pfEmployeeContribution: String(pfSettings.employeeContribution),
                pfEmployerContribution: String(pfSettings.employerContribution),
                pfWageCellingLimite: String(pfSettings.wageLimit),
                pfAdminCharges: String(pfSettings.adminCharges),
            };
            setIsPFSaving(true);
            try {
                const res = await http.post(postPFConfiguration, body);
                if (res.data && !res.data.error) {
                    showSnack('PF configuration saved successfully!', true);
                } else {
                    showSnack(res.data?.message || 'Failed to save PF configuration', false);
                }
            } catch {
                showSnack('Failed to save PF configuration. Please try again.', false);
            } finally {
                setIsPFSaving(false);
            }
            return;
        }

        if (activeTab === 2) {
            if (!esiSettings.employeeContribution || !esiSettings.employerContribution) {
                showSnack('Please fill all required ESI fields', false);
                return;
            }
            const body = {
                rollNumber: rollNumber,
                createdOn: now,
                updatedOn: now,
                esiEmployeeContribution: String(esiSettings.employeeContribution),
                esiEmployerContribution: String(esiSettings.employerContribution),
                esiWageCellingLimite: String(esiSettings.wageLimit),
            };
            setIsESISaving(true);
            try {
                const res = await http.post(postESIConfiguration, body);
                if (res.data && !res.data.error) {
                    showSnack('ESI configuration saved successfully!', true);
                } else {
                    showSnack(res.data?.message || 'Failed to save ESI configuration', false);
                }
            } catch {
                showSnack('Failed to save ESI configuration. Please try again.', false);
            } finally {
                setIsESISaving(false);
            }
            return;
        }

        if (activeTab === 3) {
            if (!ptSettings.monthlyDeduction || !ptSettings.annualDeduction) {
                showSnack('Please fill all required PT fields', false);
                return;
            }
            const body = {
                rollNumber: rollNumber,
                createdOn: now,
                updatedOn: now,
                monthlyPTDeduction: String(ptSettings.monthlyDeduction),
                annualPTDeduction: String(ptSettings.annualDeduction),
                applicationFromSalary: String(ptSettings.applicableFrom),
            };
            setIsPTSaving(true);
            try {
                const res = await http.post(postProfessionalTaxConfiguration, body);
                if (res.data && !res.data.error) {
                    showSnack('PT configuration saved successfully!', true);
                } else {
                    showSnack(res.data?.message || 'Failed to save PT configuration', false);
                }
            } catch {
                showSnack('Failed to save PT configuration. Please try again.', false);
            } finally {
                setIsPTSaving(false);
            }
            return;
        }

        if (activeTab === 4) {
            const body = {
                rollNumber: rollNumber,
                createdOn: now,
                updatedOn: now,
                standardDeduction: String(tdsSettings.standardDeduction),
                section80cLimit: String(tdsSettings.section80C),
                section80DLimit: String(tdsSettings.section80D),
                hraExemption: tdsSettings.hraExemption ? 'Y' : 'N',
            };
            setIsTDSSaving(true);
            try {
                const res = await http.post(postTDSConfiguration, body);
                if (res.data && !res.data.error) {
                    showSnack('TDS configuration saved successfully!', true);
                } else {
                    showSnack(res.data?.message || 'Failed to save TDS configuration', false);
                }
            } catch {
                showSnack('Failed to save TDS configuration. Please try again.', false);
            } finally {
                setIsTDSSaving(false);
            }
            return;
        }

        showSnack('Settings saved successfully!', true);
    };

    // ─── Reusable section card (for config tabs) ───────────────────────────
    const SectionCard = ({ icon: Icon, title, subtitle, accent = PRIMARY, accentLight = PRIMARY_LIGHT, accentBorder = PRIMARY_BORDER, children }) => (
        <Card sx={{
            border: '1px solid #E5E7EB',
            borderRadius: '7px',
            boxShadow: 'none',
            mb: 2,
            bgcolor: '#fff',
        }}>
            <Box sx={{
                px: 2, py: 1.5,
                borderBottom: '1px solid #E5E7EB',
                bgcolor: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 1.2,
            }}>
                <Box sx={{
                    width: 32, height: 32, borderRadius: '7px',
                    bgcolor: accentLight, border: `1px solid ${accentBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Icon sx={{ fontSize: 18, color: accent }} />
                </Box>
                <Box>
                    <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>
                        {title}
                    </Typography>
                    <Typography sx={{ fontSize: '11px', color: '#6B7280', mt: 0.3 }}>
                        {subtitle}
                    </Typography>
                </Box>
            </Box>
            <Box sx={{ p: 2 }}>
                {children}
            </Box>
        </Card>
    );

    // ─── Toggle row used in each config card ───────────────────────────────
    const ToggleRow = ({ label, description, checked, onChange, accent = PRIMARY }) => (
        <Box sx={{
            p: 1.5, mb: 2,
            borderRadius: '7px',
            bgcolor: '#F9FAFB',
            border: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1.5,
        }}>
            <Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                    {label}
                </Typography>
                <Typography sx={{ fontSize: '11px', color: '#6B7280', mt: 0.3 }}>
                    {description}
                </Typography>
            </Box>
            <Switch
                checked={checked}
                onChange={onChange}
                sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: accent },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: accent },
                }}
            />
        </Box>
    );

    // ─── Per-tab renderers ─────────────────────────────────────────────────
    const renderPFTab = () => (
        <Box>
            <SectionCard
                icon={AccountBalanceIcon}
                title="Provident Fund (PF) Configuration"
                subtitle="Configure employee and employer PF contribution rates"
                accent="#6D28D9" accentLight="#F5F3FF" accentBorder="#DDD6FE"
            >
                <ToggleRow
                    label="Enable PF Deduction"
                    description="Automatically deduct PF from employee salary"
                    checked={pfSettings.enabled}
                    onChange={(e) => setPfSettings({ ...pfSettings, enabled: e.target.checked })}
                    accent="#6D28D9"
                />
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Employee Contribution"
                            value={pfSettings.employeeContribution}
                            onChange={(e) => setPfSettings({ ...pfSettings, employeeContribution: e.target.value })}
                            size="small" fullWidth type="number"
                            disabled={!pfSettings.enabled}
                            slotProps={{
                                inputLabel: { shrink: true },
                                input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                            }}
                            sx={fieldSx}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Employer Contribution"
                            value={pfSettings.employerContribution}
                            onChange={(e) => setPfSettings({ ...pfSettings, employerContribution: e.target.value })}
                            size="small" fullWidth type="number"
                            disabled={!pfSettings.enabled}
                            slotProps={{
                                inputLabel: { shrink: true },
                                input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                            }}
                            sx={fieldSx}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Wage Ceiling Limit"
                            value={pfSettings.wageLimit}
                            onChange={(e) => setPfSettings({ ...pfSettings, wageLimit: e.target.value })}
                            size="small" fullWidth type="number"
                            disabled={!pfSettings.enabled}
                            slotProps={{
                                inputLabel: { shrink: true },
                                input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
                            }}
                            sx={fieldSx}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Admin Charges"
                            value={pfSettings.adminCharges}
                            onChange={(e) => setPfSettings({ ...pfSettings, adminCharges: e.target.value })}
                            size="small" fullWidth type="number"
                            disabled={!pfSettings.enabled}
                            slotProps={{
                                inputLabel: { shrink: true },
                                input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                            }}
                            sx={fieldSx}
                        />
                    </Grid>
                </Grid>
            </SectionCard>
        </Box>
    );

    const renderESITab = () => (
        <Box>
            <SectionCard
                icon={SecurityIcon}
                title="Employee State Insurance (ESI) Configuration"
                subtitle="Configure ESI contribution rates and wage limits"
                accent="#6246E0" accentLight="#F1EEFE" accentBorder="#C9BEFB"
            >
                <ToggleRow
                    label="Enable ESI Deduction"
                    description="Automatically deduct ESI if salary is below wage limit"
                    checked={esiSettings.enabled}
                    onChange={(e) => setEsiSettings({ ...esiSettings, enabled: e.target.checked })}
                    accent="#6246E0"
                />
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Employee Contribution"
                            value={esiSettings.employeeContribution}
                            onChange={(e) => setEsiSettings({ ...esiSettings, employeeContribution: e.target.value })}
                            size="small" fullWidth type="number"
                            disabled={!esiSettings.enabled}
                            slotProps={{
                                inputLabel: { shrink: true },
                                input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                            }}
                            sx={fieldSx}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Employer Contribution"
                            value={esiSettings.employerContribution}
                            onChange={(e) => setEsiSettings({ ...esiSettings, employerContribution: e.target.value })}
                            size="small" fullWidth type="number"
                            disabled={!esiSettings.enabled}
                            slotProps={{
                                inputLabel: { shrink: true },
                                input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                            }}
                            sx={fieldSx}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            label="Wage Ceiling Limit"
                            value={esiSettings.wageLimit}
                            onChange={(e) => setEsiSettings({ ...esiSettings, wageLimit: e.target.value })}
                            size="small" fullWidth type="number"
                            disabled={!esiSettings.enabled}
                            slotProps={{
                                inputLabel: { shrink: true },
                                input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
                                formHelperText: { sx: { fontSize: '10.5px', fontWeight: 600, color: '#6246E0', ml: 0.5, mt: 0.3 } },
                            }}
                            helperText="ESI applicable if gross salary is below this limit"
                            sx={fieldSx}
                        />
                    </Grid>
                </Grid>
            </SectionCard>
        </Box>
    );

    const renderPTTab = () => (
        <Box>
            <SectionCard
                icon={ReceiptIcon}
                title="Professional Tax (PT) Configuration"
                subtitle="Configure state-specific professional tax slabs"
                accent="#C2410C" accentLight="#FFF7ED" accentBorder="#FED7AA"
            >
                <ToggleRow
                    label="Enable Professional Tax"
                    description="Deduct PT as per state regulations"
                    checked={ptSettings.enabled}
                    onChange={(e) => setPtSettings({ ...ptSettings, enabled: e.target.checked })}
                    accent="#C2410C"
                />
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Monthly PT Deduction"
                            value={ptSettings.monthlyDeduction}
                            onChange={(e) => setPtSettings({ ...ptSettings, monthlyDeduction: e.target.value })}
                            size="small" fullWidth type="number"
                            disabled={!ptSettings.enabled}
                            slotProps={{
                                inputLabel: { shrink: true },
                                input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
                            }}
                            sx={fieldSx}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Annual PT Deduction"
                            value={ptSettings.annualDeduction}
                            onChange={(e) => setPtSettings({ ...ptSettings, annualDeduction: e.target.value })}
                            size="small" fullWidth type="number"
                            disabled={!ptSettings.enabled}
                            slotProps={{
                                inputLabel: { shrink: true },
                                input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
                            }}
                            sx={fieldSx}
                        />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            label="Applicable From Salary"
                            value={ptSettings.applicableFrom}
                            onChange={(e) => setPtSettings({ ...ptSettings, applicableFrom: e.target.value })}
                            size="small" fullWidth type="number"
                            disabled={!ptSettings.enabled}
                            slotProps={{
                                inputLabel: { shrink: true },
                                input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
                                formHelperText: { sx: { fontSize: '10.5px', fontWeight: 600, color: '#C2410C', ml: 0.5, mt: 0.3 } },
                            }}
                            helperText="PT applicable if gross salary is above this limit"
                            sx={fieldSx}
                        />
                    </Grid>
                </Grid>
            </SectionCard>
        </Box>
    );

    const renderTDSTab = () => (
        <Box>
            <SectionCard
                icon={AccountBalanceWalletIcon}
                title="Tax Deducted at Source (TDS) Configuration"
                subtitle="Configure income tax deduction settings and exemptions"
                accent="#1D4ED8" accentLight="#F3F0FE" accentBorder="#BFDBFE"
            >
                <ToggleRow
                    label="Enable TDS Calculation"
                    description="Calculate and deduct income tax as per IT Act"
                    checked={tdsSettings.enabled}
                    onChange={(e) => setTdsSettings({ ...tdsSettings, enabled: e.target.checked })}
                    accent="#1D4ED8"
                />
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Standard Deduction"
                            value={tdsSettings.standardDeduction}
                            onChange={(e) => setTdsSettings({ ...tdsSettings, standardDeduction: e.target.value })}
                            size="small" fullWidth type="number"
                            disabled={!tdsSettings.enabled}
                            slotProps={{
                                inputLabel: { shrink: true },
                                input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
                            }}
                            sx={fieldSx}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Section 80C Limit"
                            value={tdsSettings.section80C}
                            onChange={(e) => setTdsSettings({ ...tdsSettings, section80C: e.target.value })}
                            size="small" fullWidth type="number"
                            disabled={!tdsSettings.enabled}
                            slotProps={{
                                inputLabel: { shrink: true },
                                input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
                            }}
                            sx={fieldSx}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            label="Section 80D Limit (Medical Insurance)"
                            value={tdsSettings.section80D}
                            onChange={(e) => setTdsSettings({ ...tdsSettings, section80D: e.target.value })}
                            size="small" fullWidth type="number"
                            disabled={!tdsSettings.enabled}
                            slotProps={{
                                inputLabel: { shrink: true },
                                input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
                            }}
                            sx={fieldSx}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Box sx={{
                            p: 1.5, height: '100%',
                            borderRadius: '7px',
                            bgcolor: '#F9FAFB',
                            border: '1px solid #E5E7EB',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <Box>
                                <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#111827' }}>
                                    Enable HRA Exemption
                                </Typography>
                                <Typography sx={{ fontSize: '10.5px', color: '#6B7280', mt: 0.3 }}>
                                    Exempt House Rent Allowance from TDS
                                </Typography>
                            </Box>
                            <Switch
                                checked={tdsSettings.hraExemption}
                                onChange={(e) => setTdsSettings({ ...tdsSettings, hraExemption: e.target.checked })}
                                disabled={!tdsSettings.enabled}
                                sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#1D4ED8' },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#1D4ED8' },
                                }}
                            />
                        </Box>
                    </Grid>
                </Grid>
            </SectionCard>
        </Box>
    );

    // ─── Employee Compliance tab (the table view) ───────────────────────────
    const renderEmployeeComplianceTab = () => {
        const kpiCards = [
            {
                label: 'Total Employees',
                value: stats.totalEmployees,
                sub: 'on payroll',
                color: '#7C5CFC', bg: '#F1EEFE',
                icon: PeopleAltOutlinedIcon,
            },
            {
                label: 'PF Applicable',
                value: stats.pfApplicableCount,
                sub: `of ${stats.totalEmployees}`,
                color: '#16A34A', bg: '#DCFCE7',
                icon: AccountBalanceIcon,
            },
            {
                label: 'ESI Applicable',
                value: stats.esiApplicableCount,
                sub: `of ${stats.totalEmployees}`,
                color: '#0EA5E9', bg: '#E0F2FE',
                icon: SecurityIcon,
            },
            {
                label: 'PT Applicable',
                value: stats.ptApplicableCount,
                sub: `of ${stats.totalEmployees}`,
                color: '#F59E0B', bg: '#FFF7ED',
                icon: ReceiptIcon,
            },
        ];

        return (
            <Box>
                {/* Primary KPIs */}
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

                {/* Secondary KPI — additional salary */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid size={{ xs: 12 }}>
                        <Card sx={{
                            border: '1px solid #FECACA',
                            borderRadius: '7px',
                            boxShadow: 'none',
                            bgcolor: '#FEF2F2',
                        }}>
                            <CardContent sx={{ py: 1.8, '&:last-child': { pb: 1.8 } }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Box>
                                        <Typography sx={{ fontSize: '11px', color: '#B91C1C', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            Total Additional Salary
                                        </Typography>
                                        <Typography sx={{ fontSize: '22px', fontWeight: 800, color: '#111827', lineHeight: 1.2, mt: 0.5 }}>
                                            {formatINR(stats.totalAdditionalSalary)}
                                        </Typography>
                                        <Typography sx={{ fontSize: '10.5px', color: '#6B7280', fontWeight: 600, mt: 0.4 }}>
                                            {stats.additionalSalaryEmployeesCount} employees with additional salary
                                        </Typography>
                                    </Box>
                                    <Box sx={{
                                        width: 42, height: 42, borderRadius: '7px',
                                        bgcolor: '#fff', border: '1px solid #FECACA',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <AccountBalanceWalletIcon sx={{ color: '#B91C1C', fontSize: 22 }} />
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Table */}
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
                                <VerifiedUserIcon sx={{ fontSize: 17, color: PRIMARY }} />
                            </Box>
                            <Typography sx={{ fontSize: '14.5px', fontWeight: 800, color: '#0F172A' }}>
                                Employee Compliance Settings
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
                                    {filteredEmployees.length}
                                </Typography>
                                <Typography sx={{ fontSize: '11.5px', color: '#6B7280' }}>
                                    of {employeeData.length}
                                </Typography>
                                <Button
                                    size="small"
                                    startIcon={<RestartAltIcon sx={{ fontSize: 14 }} />}
                                    onClick={() => setSearchQuery('')}
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
                                <TableRow>
                                    {[
                                        'S.No', 'Employee', 'Basic Salary',
                                        'Add. Salary', 'PF', 'ESI', 'PT', 'TDS', 'Actions',
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
                                                Loading compliance data…
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredEmployees.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 6, borderBottom: 'none' }}>
                                            <Box sx={{
                                                width: 56, height: 56, borderRadius: '50%',
                                                bgcolor: '#F3F4F6', mx: 'auto', mb: 1.2,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <VerifiedUserIcon sx={{ fontSize: 28, color: '#9CA3AF' }} />
                                            </Box>
                                            <Typography sx={{ fontSize: '13px', color: '#6B7280', fontWeight: 600 }}>
                                                {searchActive ? `No results for "${searchQuery}"` : 'No employee data found'}
                                            </Typography>
                                            <Typography sx={{ fontSize: '11.5px', color: '#9CA3AF', mt: 0.4 }}>
                                                {searchActive ? 'Try a different search term' : 'Employees will appear here once added to payroll'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredEmployees.map((emp, idx) => {
                                    const avColor = avatarColorFor(emp.name || '');
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
                                                            {emp.employeeId}{emp.designation ? ` · ${emp.designation}` : ''}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid #EEF0F6', py: 1.4 }}>
                                                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                                                    {formatINR(emp.basicSalary)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid #F3F4F6', py: 1.2, textAlign: 'center' }}>
                                                <Chip
                                                    label={emp.additionalSalary > 0 ? formatINR(emp.additionalSalary) : 'Nil'}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: emp.additionalSalary > 0 ? '#FEF2F2' : '#F3F4F6',
                                                        color: emp.additionalSalary > 0 ? '#B91C1C' : '#9CA3AF',
                                                        border: `1px solid ${emp.additionalSalary > 0 ? '#FECACA' : '#E5E7EB'}`,
                                                        fontWeight: 700, fontSize: '10.5px', height: 22,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid #F3F4F6', py: 1.2, textAlign: 'center' }}>
                                                <Chip
                                                    label={emp.compliance.pfApplicable ? `${emp.compliance.pfPercentage}%` : 'N/A'}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: emp.compliance.pfApplicable ? '#F5F3FF' : '#F3F4F6',
                                                        color: emp.compliance.pfApplicable ? '#6D28D9' : '#9CA3AF',
                                                        border: `1px solid ${emp.compliance.pfApplicable ? '#DDD6FE' : '#E5E7EB'}`,
                                                        fontWeight: 700, fontSize: '10.5px', height: 22,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid #F3F4F6', py: 1.2, textAlign: 'center' }}>
                                                <Chip
                                                    label={emp.compliance.esiApplicable ? `${emp.compliance.esiPercentage}%` : 'N/A'}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: emp.compliance.esiApplicable ? '#F1EEFE' : '#F3F4F6',
                                                        color: emp.compliance.esiApplicable ? '#6246E0' : '#9CA3AF',
                                                        border: `1px solid ${emp.compliance.esiApplicable ? '#C9BEFB' : '#E5E7EB'}`,
                                                        fontWeight: 700, fontSize: '10.5px', height: 22,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid #F3F4F6', py: 1.2, textAlign: 'center' }}>
                                                <Chip
                                                    label={emp.compliance.ptApplicable ? formatINR(emp.compliance.ptAmount) : 'N/A'}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: emp.compliance.ptApplicable ? '#FFF7ED' : '#F3F4F6',
                                                        color: emp.compliance.ptApplicable ? '#C2410C' : '#9CA3AF',
                                                        border: `1px solid ${emp.compliance.ptApplicable ? '#FED7AA' : '#E5E7EB'}`,
                                                        fontWeight: 700, fontSize: '10.5px', height: 22,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid #F3F4F6', py: 1.2, textAlign: 'center' }}>
                                                <Chip
                                                    label={emp.compliance.tdsApplicable ? `${emp.compliance.tdsPercentage}%` : 'N/A'}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: emp.compliance.tdsApplicable ? '#F3F0FE' : '#F3F4F6',
                                                        color: emp.compliance.tdsApplicable ? '#1D4ED8' : '#9CA3AF',
                                                        border: `1px solid ${emp.compliance.tdsApplicable ? '#BFDBFE' : '#E5E7EB'}`,
                                                        fontWeight: 700, fontSize: '10.5px', height: 22,
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell sx={{ borderBottom: '1px solid #F3F4F6', py: 1.2, textAlign: 'center' }}>
                                                <Tooltip arrow title="Edit compliance">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleEditEmployee(emp)}
                                                        sx={{
                                                            bgcolor: '#F3F0FE', borderRadius: '7px',
                                                            border: '1px solid #BFDBFE',
                                                            '&:hover': { bgcolor: '#DBEAFE' },
                                                        }}
                                                    >
                                                        <EditIcon sx={{ fontSize: 14, color: '#6246E0' }} />
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
        );
    };

    const anyConfigSaving = isPFSaving || isESISaving || isPTSaving || isTDSSaving;
    const showSaveButton = activeTab !== 0;
    const showExportButton = activeTab === 0;

    return (
        <>
            <SnackBar open={snackOpen} color={snackColor} setOpen={setSnackOpen} status={snackStatus} message={snackMessage} />

            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '88vh',
                p: 2,
            }}>
                {/* ─── Header (fixed) ──────────────────────────────────────── */}
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
                                Statutory Deductions
                            </Typography>
                            <Typography sx={{ fontSize: '13px', color: '#6B7280', mt: 0.3 }}>
                                Configure PF, ESI, Professional Tax &amp; TDS deductions for your workforce
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        {activeTab === 0 && (
                            <TextField
                                fullWidth
                                variant="outlined"
                                placeholder="Search by name, ID, or designation..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon sx={{ fontSize: 18, color: searchActive ? PRIMARY : '#9CA3AF' }} />
                                            </InputAdornment>
                                        ),
                                        endAdornment: searchActive ? (
                                            <InputAdornment position="end">
                                                <IconButton size="small" onClick={() => setSearchQuery('')} sx={{ p: 0.3 }}>
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
                        )}

                        {showExportButton && (
                            <Button
                                disableElevation
                                startIcon={<SaveOutlinedIcon sx={{ fontSize: 16 }} />}
                                onClick={handleExportCompliance}
                                sx={{
                                    textTransform: 'none', fontSize: '12.5px', fontWeight: 700,
                                    color: PRIMARY_DARK, bgcolor: PRIMARY_LIGHT,
                                    border: `1.5px solid ${PRIMARY_BORDER}`,
                                    borderRadius: '30px',
                                    px: 2.2, height: 34,
                                    boxShadow: 'none',
                                    '&:hover': {
                                        bgcolor: '#E7DFFC',
                                        borderColor: PRIMARY,
                                        boxShadow: 'none',
                                    },
                                }}
                            >
                                Export
                            </Button>
                        )}

                        {showSaveButton && (
                            <Button
                                variant="contained"
                                disableElevation
                                startIcon={anyConfigSaving
                                    ? <CircularProgress size={14} sx={{ color: '#fff' }} />
                                    : <SaveOutlinedIcon sx={{ fontSize: 18 }} />}
                                onClick={handleSave}
                                disabled={anyConfigSaving}
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
                                    '&.Mui-disabled': { bgcolor: '#E5E7EB', color: '#9CA3AF', borderColor: '#E5E7EB' },
                                }}
                            >
                                {anyConfigSaving ? 'Saving…' : 'Save Settings'}
                            </Button>
                        )}
                    </Box>
                </Box>

                {/* ─── Tabs ────────────────────────────────────────────────── */}
                <Box sx={{
                    mb: 1.5,
                    bgcolor: '#fff',
                    border: '1px solid #E6EAF1',
                    borderRadius: '7px',
                    boxShadow: '0 1px 3px rgba(16,24,40,0.05)',
                    px: 1,
                }}>
                    <Tabs
                        value={activeTab}
                        onChange={(e, newValue) => setActiveTab(newValue)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            minHeight: 42,
                            '& .MuiTab-root': {
                                textTransform: 'none',
                                fontSize: '12.5px',
                                fontWeight: 600,
                                minHeight: 42,
                                color: '#6B7280',
                                px: 2,
                            },
                            '& .Mui-selected': { color: `${PRIMARY} !important`, fontWeight: 700 },
                            '& .MuiTabs-indicator': { bgcolor: PRIMARY, height: 2.5, borderRadius: '2px 2px 0 0' },
                        }}
                    >
                        <Tab label="Employee Compliance" />
                        <Tab label="Provident Fund (PF)" />
                        <Tab label="ESI" />
                        <Tab label="Professional Tax" />
                        <Tab label="TDS" />
                    </Tabs>
                </Box>

                {/* ─── Body ────────────────────────────────────────────────── */}
                <Box sx={{ flex: 1 }}>
                    {activeTab === 0 && renderEmployeeComplianceTab()}
                    {activeTab === 1 && renderPFTab()}
                    {activeTab === 2 && renderESITab()}
                    {activeTab === 3 && renderPTTab()}
                    {activeTab === 4 && renderTDSTab()}
                </Box>
            </Box>

            {/* ─── Edit Employee Compliance Dialog ─────────────────────── */}
            <Dialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                maxWidth="md"
                fullWidth
                slotProps={{
                    paper: { sx: { borderRadius: '7px', overflow: 'hidden' } },
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
                            <EditIcon sx={{ color: PRIMARY, fontSize: 20 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '24px', fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>
                                Edit Compliance Settings
                            </Typography>
                            <Typography sx={{ fontSize: '13px', color: '#6B7280', mt: 0.3 }}>
                                Update statutory deductions and salary components for this employee
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton
                        onClick={() => setEditDialogOpen(false)}
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
                    {editedCompliance && selectedEmployee && (
                        <>
                            {/* Employee Identity Card */}
                            <Box sx={{
                                p: 2, mb: 2,
                                bgcolor: '#fff', borderRadius: '7px',
                                border: '1px solid #E5E7EB',
                                display: 'flex', alignItems: 'center', gap: 1.5,
                            }}>
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
                                            label={selectedEmployee.employeeId}
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
                                {selectedEmployee.basicSalary != null && (
                                    <Box sx={{
                                        textAlign: 'right',
                                        px: 1.2, py: 0.6, borderRadius: '7px',
                                        bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`,
                                    }}>
                                        <Typography sx={{ fontSize: '9.5px', color: PRIMARY_DARK, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            Basic Salary
                                        </Typography>
                                        <Typography sx={{ fontSize: '14px', fontWeight: 800, color: PRIMARY_DARK }}>
                                            {formatINR(selectedEmployee.basicSalary)}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>

                            {/* Salary Components */}
                            <Box sx={{
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
                                        <TrendingUpIcon sx={{ fontSize: 14, color: PRIMARY }} />
                                    </Box>
                                    <Typography sx={{
                                        fontSize: '11px', fontWeight: 700, color: '#374151',
                                        textTransform: 'uppercase', letterSpacing: 0.6,
                                    }}>
                                        Additional Earnings
                                    </Typography>
                                </Box>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            label="Additional Salary"
                                            value={selectedEmployee.additionalSalary}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                setEmployeeData(employeeData.map(emp =>
                                                    emp.id === selectedEmployee.id ? { ...emp, additionalSalary: val } : emp
                                                ));
                                                setSelectedEmployee({ ...selectedEmployee, additionalSalary: val });
                                            }}
                                            size="small" fullWidth type="number"
                                            slotProps={{
                                                inputLabel: { shrink: true },
                                                input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
                                                formHelperText: { sx: { fontSize: '10.5px', color: '#6B7280', ml: 0.5, mt: 0.3 } },
                                            }}
                                            helperText="One-time or special allowance"
                                            sx={fieldSx}
                                        />
                                    </Grid>
                                </Grid>
                            </Box>

                            {/* Statutory deductions — grid of 4 mini cards */}
                            <Grid container spacing={2}>
                                {/* PF */}
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Box sx={{
                                        p: 2, bgcolor: '#fff', borderRadius: '7px',
                                        border: '1px solid #DDD6FE',
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{
                                                    width: 28, height: 28, borderRadius: '7px',
                                                    bgcolor: '#F5F3FF', border: '1px solid #DDD6FE',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <AccountBalanceIcon sx={{ fontSize: 15, color: '#6D28D9' }} />
                                                </Box>
                                                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                                                    Provident Fund
                                                </Typography>
                                            </Box>
                                            <Switch
                                                checked={editedCompliance.pfApplicable}
                                                onChange={(e) => setEditedCompliance({ ...editedCompliance, pfApplicable: e.target.checked })}
                                                size="small"
                                                sx={{
                                                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#6D28D9' },
                                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#6D28D9' },
                                                }}
                                            />
                                        </Box>
                                        <TextField
                                            label="PF Percentage"
                                            value={editedCompliance.pfPercentage}
                                            onChange={(e) => setEditedCompliance({ ...editedCompliance, pfPercentage: parseFloat(e.target.value) || 0 })}
                                            size="small" fullWidth type="number"
                                            disabled={!editedCompliance.pfApplicable}
                                            slotProps={{
                                                inputLabel: { shrink: true },
                                                input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                                            }}
                                            sx={fieldSx}
                                        />
                                    </Box>
                                </Grid>

                                {/* ESI */}
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Box sx={{
                                        p: 2, bgcolor: '#fff', borderRadius: '7px',
                                        border: '1px solid #C9BEFB',
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{
                                                    width: 28, height: 28, borderRadius: '7px',
                                                    bgcolor: '#F1EEFE', border: '1px solid #C9BEFB',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <SecurityIcon sx={{ fontSize: 15, color: '#6246E0' }} />
                                                </Box>
                                                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                                                    ESI
                                                </Typography>
                                            </Box>
                                            <Switch
                                                checked={editedCompliance.esiApplicable}
                                                onChange={(e) => setEditedCompliance({ ...editedCompliance, esiApplicable: e.target.checked })}
                                                size="small"
                                                sx={{
                                                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#6246E0' },
                                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#6246E0' },
                                                }}
                                            />
                                        </Box>
                                        <TextField
                                            label="ESI Percentage"
                                            value={editedCompliance.esiPercentage}
                                            onChange={(e) => setEditedCompliance({ ...editedCompliance, esiPercentage: parseFloat(e.target.value) || 0 })}
                                            size="small" fullWidth type="number"
                                            disabled={!editedCompliance.esiApplicable}
                                            slotProps={{
                                                inputLabel: { shrink: true },
                                                input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                                            }}
                                            sx={fieldSx}
                                        />
                                    </Box>
                                </Grid>

                                {/* PT */}
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Box sx={{
                                        p: 2, bgcolor: '#fff', borderRadius: '7px',
                                        border: '1px solid #FED7AA',
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{
                                                    width: 28, height: 28, borderRadius: '7px',
                                                    bgcolor: '#FFF7ED', border: '1px solid #FED7AA',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <ReceiptIcon sx={{ fontSize: 15, color: '#C2410C' }} />
                                                </Box>
                                                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                                                    Professional Tax
                                                </Typography>
                                            </Box>
                                            <Switch
                                                checked={editedCompliance.ptApplicable}
                                                onChange={(e) => setEditedCompliance({ ...editedCompliance, ptApplicable: e.target.checked })}
                                                size="small"
                                                sx={{
                                                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#C2410C' },
                                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#C2410C' },
                                                }}
                                            />
                                        </Box>
                                        <TextField
                                            label="PT Amount"
                                            value={editedCompliance.ptAmount}
                                            onChange={(e) => setEditedCompliance({ ...editedCompliance, ptAmount: parseFloat(e.target.value) || 0 })}
                                            size="small" fullWidth type="number"
                                            disabled={!editedCompliance.ptApplicable}
                                            slotProps={{
                                                inputLabel: { shrink: true },
                                                input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> },
                                            }}
                                            sx={fieldSx}
                                        />
                                    </Box>
                                </Grid>

                                {/* TDS */}
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Box sx={{
                                        p: 2, bgcolor: '#fff', borderRadius: '7px',
                                        border: '1px solid #BFDBFE',
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{
                                                    width: 28, height: 28, borderRadius: '7px',
                                                    bgcolor: '#F3F0FE', border: '1px solid #BFDBFE',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <AccountBalanceWalletIcon sx={{ fontSize: 15, color: '#1D4ED8' }} />
                                                </Box>
                                                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                                                    TDS
                                                </Typography>
                                            </Box>
                                            <Switch
                                                checked={editedCompliance.tdsApplicable}
                                                onChange={(e) => setEditedCompliance({ ...editedCompliance, tdsApplicable: e.target.checked })}
                                                size="small"
                                                sx={{
                                                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#1D4ED8' },
                                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#1D4ED8' },
                                                }}
                                            />
                                        </Box>
                                        <TextField
                                            label="TDS Percentage"
                                            value={editedCompliance.tdsPercentage}
                                            onChange={(e) => setEditedCompliance({ ...editedCompliance, tdsPercentage: parseFloat(e.target.value) || 0 })}
                                            size="small" fullWidth type="number"
                                            disabled={!editedCompliance.tdsApplicable}
                                            slotProps={{
                                                inputLabel: { shrink: true },
                                                input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                                            }}
                                            sx={fieldSx}
                                        />
                                    </Box>
                                </Grid>
                            </Grid>
                        </>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 2.5, py: 1.8, borderTop: '1px solid #E5E7EB', bgcolor: '#fff' }}>
                    <Button
                        onClick={() => setEditDialogOpen(false)}
                        disabled={isSavingCompliance}
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
                        onClick={handleSaveEmployeeCompliance}
                        disabled={isSavingCompliance}
                        startIcon={isSavingCompliance
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
                        {isSavingCompliance ? 'Saving…' : 'Save Changes'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
