import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, TextField, Button, Grid, IconButton, Divider,
    Card, CardContent, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, InputAdornment, Dialog, DialogTitle,
    DialogContent, DialogActions, Avatar, Autocomplete, Paper, Tooltip,
    CircularProgress, Stack, LinearProgress,
} from '@mui/material';
import axios from 'axios';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlineRounded';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineRounded';
import DownloadIcon from '@mui/icons-material/Download';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useNavigate } from 'react-router-dom';
import SnackBar from '../../SnackBar';
import {
    getEmployees, postSalaryStructure, salaryStructureDashboard,
    updateSalaryStructureByRollnumber, deleteSalaryStructureByRollnumber,
} from '../../../Api/Api';
import { useSelector } from 'react-redux';
import { selectWebsiteSettings } from '../../../redux/slices/websiteSettingsSlice';

// ─── Theme (matches LeaveAttendancePage) ───────────────────────────────────
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

export default function SalaryStructures() {
    const navigate = useNavigate();
    const token = "123";

    const [structures, setStructures] = useState([]);
    const [kpiData, setKpiData] = useState({ totalStructures: 0, totalEmployees: 0 });
    const [openDialog, setOpenDialog] = useState(false);

    const [snackOpen, setSnackOpen] = useState(false);
    const [snackStatus, setSnackStatus] = useState(false);
    const [snackColor, setSnackColor] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const showSnack = (msg, success) => {
        setSnackMessage(msg); setSnackOpen(true); setSnackColor(success); setSnackStatus(success);
    };

    const [editMode, setEditMode] = useState(false);
    const [selectedStructure, setSelectedStructure] = useState(null);
    const [employeesData, setEmployeesData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [filterText, setFilterText] = useState('');
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [structureToDelete, setStructureToDelete] = useState(null);
    const isExpanded = useSelector((state) => state.sidebar.isExpanded);
    const websiteSettings = useSelector(selectWebsiteSettings);

    const [formData, setFormData] = useState({
        name: '',
        employeeRollNumber: '',
        grade: '',
        basicSalary: '',
        hra: 40,
        da: 10,
        conveyance: 1600,
        specialAllowance: 0,
    });

    const calculateTotal = () => {
        const basic = Number(formData.basicSalary) || 0;
        const hra = Math.round(basic * (Number(formData.hra) || 0) / 100);
        const da = Math.round(basic * (Number(formData.da) || 0) / 100);
        const conveyance = Number(formData.conveyance) || 0;
        const special = Number(formData.specialAllowance) || 0;
        return basic + hra + da + conveyance + special;
    };

    const handleOpenDialog = (structure = null) => {
        if (structure) {
            setEditMode(true);
            setSelectedStructure(structure);
            setFormData({
                name: structure.name,
                employeeRollNumber: structure.rollNumber || structure.employeeRollNumber || '',
                grade: structure.grade || '',
                basicSalary: structure.basicSalary,
                hra: structure.hraPercent ?? structure.hra ?? 40,
                da: structure.daPercent ?? structure.da ?? 10,
                conveyance: structure.conveyanceAllowance ?? structure.conveyance ?? 1600,
                specialAllowance: structure.specialAllowance ?? 0,
            });
            const rollNo = structure.rollNumber || structure.employeeRollNumber;
            const emp = employeesData.find(e => e.rollNumber === rollNo);
            setSelectedEmp(emp || null);
        } else {
            setEditMode(false);
            setSelectedStructure(null);
            setSelectedEmp(null);
            setFormData({
                name: '',
                employeeRollNumber: '',
                grade: '',
                basicSalary: '',
                hra: 40,
                da: 10,
                conveyance: 1600,
                specialAllowance: 0,
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditMode(false);
        setSelectedStructure(null);
        setSelectedEmp(null);
    };

    useEffect(() => {
        fetchEmployeeData();
        fetchDashboard();
    }, []);

    const fetchEmployeeData = async () => {
        try {
            const res = await axios.get(getEmployees, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setEmployeesData(res.data.data);
        } catch {
        }
    };

    const fetchDashboard = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const res = await axios.get(salaryStructureDashboard, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data && !res.data.error) {
                const { totalStructures, totalEmployees, salaryStructures } = res.data.data;
                setKpiData({ totalStructures, totalEmployees });
                setStructures(salaryStructures || []);
            } else {
                showSnack('Failed to load salary structures', false);
            }
        } catch {
            showSnack('Failed to load salary structures', false);
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.employeeRollNumber || !formData.basicSalary) {
            showSnack('Please select an employee and enter basic salary', false);
            return;
        }

        const total = calculateTotal();

        if (editMode) {
            const rollNo = selectedStructure.rollNumber || selectedStructure.employeeRollNumber;
            const body = {
                rollNumber: rollNo,
                basicSalary: Number(formData.basicSalary),
                hraPercent: Number(formData.hra),
                daPercent: Number(formData.da),
                conveyanceAllowance: String(formData.conveyance),
                specialAllowance: String(formData.specialAllowance),
                totalEarnings: total,
            };

            setIsSaving(true);
            try {
                const res = await axios.put(updateSalaryStructureByRollnumber, body, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.data && !res.data.error) {
                    await fetchDashboard();
                    showSnack('Salary structure updated successfully!', true);
                    handleCloseDialog();
                } else {
                    showSnack(res.data?.message || 'Failed to update salary structure', false);
                }
            } catch {
                showSnack('Failed to update salary structure. Please try again.', false);
            } finally {
                setIsSaving(false);
            }
            return;
        }

        const body = {
            rollNumber: formData.employeeRollNumber,
            basicSalary: Number(formData.basicSalary),
            hraPercent: Number(formData.hra),
            daPercent: Number(formData.da),
            conveyanceAllowance: String(formData.conveyance),
            specialAllowance: String(formData.specialAllowance),
            totalEarnings: total,
        };

        setIsSaving(true);
        try {
            const res = await axios.post(postSalaryStructure, body, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.data && !res.data.error) {
                await fetchDashboard();
                showSnack('Salary structure created successfully!', true);
                handleCloseDialog();
            } else {
                showSnack(res.data?.message || 'Failed to create salary structure', false);
            }
        } catch {
            showSnack('Failed to create salary structure. Please try again.', false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (structure) => {
        const rollNo = structure.rollNumber || structure.employeeRollNumber;
        if (!rollNo) {
            showSnack('Cannot delete: roll number not found', false);
            return;
        }
        try {
            const res = await axios.delete(deleteSalaryStructureByRollnumber, {
                headers: { Authorization: `Bearer ${token}` },
                params: { rollNumber: rollNo },
            });

            if (res.data && !res.data.error) {
                setStructures(prev => prev.filter(s => s.id !== structure.id));
                setKpiData(prev => ({
                    ...prev,
                    totalStructures: Math.max(0, prev.totalStructures - 1),
                }));
                showSnack('Salary structure deleted successfully!', true);
                fetchDashboard(true);
            } else {
                showSnack(res.data?.message || 'Failed to delete salary structure', false);
            }
        } catch {
            showSnack('Failed to delete salary structure. Please try again.', false);
        }
    };

    // Field styling — matches LeaveAttendancePage
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

    // ─── Derived data ──────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = filterText.toLowerCase().trim();
        if (!q) return structures;
        return structures.filter(s =>
            (s.name || '').toLowerCase().includes(q) ||
            (s.rollNumber || s.employeeRollNumber || '').toLowerCase().includes(q)
        );
    }, [structures, filterText]);

    const totals = useMemo(() => {
        let basicSum = 0;
        let grossSum = 0;
        structures.forEach(s => {
            const basic = Number(s.basicSalary) || 0;
            const hraP = s.hraPercent ?? s.hra ?? 0;
            const daP = s.daPercent ?? s.da ?? 0;
            const conv = Number(s.conveyanceAllowance ?? s.conveyance) || 0;
            const spl = Number(s.specialAllowance) || 0;
            const hraAmt = Math.round(basic * hraP / 100);
            const daAmt = Math.round(basic * daP / 100);
            const gross = s.totalEarnings ? Number(s.totalEarnings) : basic + hraAmt + daAmt + conv + spl;
            basicSum += basic;
            grossSum += gross;
        });
        const avgGross = structures.length > 0 ? Math.round(grossSum / structures.length) : 0;
        return { basicSum, grossSum, avgGross };
    }, [structures]);

    const coverage = kpiData.totalEmployees > 0
        ? Math.round((kpiData.totalStructures / kpiData.totalEmployees) * 100)
        : 0;

    const kpiCards = [
        {
            label: 'Total Structures',
            value: kpiData.totalStructures,
            sub: `/ ${kpiData.totalEmployees} staff`,
            color: '#7C5CFC', bg: '#F1EEFE', border: '#C9BEFB',
            icon: AssignmentIcon,
        },
        {
            label: 'Covered Staff',
            value: `${coverage}%`,
            sub: `${kpiData.totalStructures} of ${kpiData.totalEmployees}`,
            color: '#6246E0', bg: '#F3F0FE', border: '#C9BEFB',
            icon: PeopleAltOutlinedIcon,
        },
        {
            label: 'Avg. Gross Salary',
            value: formatINR(totals.avgGross),
            sub: 'per structure',
            color: '#2563EB', bg: '#F3F0FE', border: '#C9BEFB',
            icon: TrendingUpIcon,
        },
        {
            label: 'Monthly Payout',
            value: formatINR(totals.grossSum),
            sub: 'all structures',
            color: '#0EA5E9', bg: '#E0F2FE', border: '#BAE6FD',
            icon: PaidOutlinedIcon,
        },
    ];

    const searchActive = filterText.trim().length > 0;

    return (
        <>
            <SnackBar open={snackOpen} color={snackColor} setOpen={setSnackOpen} status={snackStatus} message={snackMessage} />

            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#F9FAFB',
                borderRadius: '16px',
                border: '1px solid #E5E7EB',
                overflow: 'hidden',
                minHeight: '88vh',
            }}>

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
                            <AssignmentIcon sx={{ color: PRIMARY, fontSize: 20 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>
                                Salary Structures
                            </Typography>
                            <Typography sx={{ fontSize: '11.5px', color: '#6B7280', mt: 0.3 }}>
                                Configure earnings components and gross pay for each staff member
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Search field — pill style, in header */}
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Search by name or roll number..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ fontSize: 18, color: searchActive ? PRIMARY : '#9CA3AF' }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: searchActive ? (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setFilterText('')} sx={{ p: 0.3 }}>
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
                            disableElevation
                            startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
                            sx={{
                                textTransform: 'none', fontSize: '12.5px', fontWeight: 700,
                                color: PRIMARY_DARK, bgcolor: PRIMARY_LIGHT,
                                border: `1.5px solid ${PRIMARY_BORDER}`,
                                borderRadius: '30px',
                                px: 2.2, height: 34,
                                boxShadow: 'none',
                                '&:hover': {
                                    bgcolor: '#DBEAFE',
                                    borderColor: PRIMARY,
                                    boxShadow: 'none',
                                },
                            }}
                        >
                            Export
                        </Button>
                        <Button
                            variant="contained"
                            disableElevation
                            startIcon={<AddCircleOutlineIcon sx={{ fontSize: 18 }} />}
                            onClick={() => handleOpenDialog()}
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
                            Create Structure
                        </Button>
                    </Box>
                </Box>

                {/* ─── Body ───────────────────────────────────────────────── */}
                <Box sx={{ flex: 1, pt:"14px", pb: 2, px:2 }}>

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
                                                        fontSize: '24px', fontWeight: 800, color: '#111827',
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

                    {/* Salary Structures Table */}
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
                                    <AssignmentIcon sx={{ fontSize: 16, color: PRIMARY }} />
                                </Box>
                                <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                                    All Salary Structures
                                </Typography>
                                <Chip
                                    label={`${structures.length} records`}
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
                                        {filtered.length}
                                    </Typography>
                                    <Typography sx={{ fontSize: '11.5px', color: '#6B7280' }}>
                                        of {structures.length}
                                    </Typography>
                                    <Button
                                        size="small"
                                        startIcon={<RestartAltIcon sx={{ fontSize: 14 }} />}
                                        onClick={() => setFilterText('')}
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

                        <TableContainer sx={{  }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: PRIMARY_LIGHT }}>
                                        {[
                                            'S.No', 'Employee', 'Roll No.', 'Basic',
                                            'HRA', 'DA', 'Conveyance', 'Special',
                                            'Gross Salary', 'Actions',
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
                                            <TableCell colSpan={10} align="center" sx={{ py: 6, borderBottom: 'none' }}>
                                                <CircularProgress size={28} sx={{ color: PRIMARY }} />
                                                <Typography sx={{ fontSize: '12px', color: '#9CA3AF', mt: 1.2 }}>
                                                    Loading salary structures…
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : filtered.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={10} align="center" sx={{ py: 6, borderBottom: 'none' }}>
                                                <Box sx={{
                                                    width: 56, height: 56, borderRadius: '50%',
                                                    bgcolor: '#F3F4F6', mx: 'auto', mb: 1.2,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <AssignmentIcon sx={{ fontSize: 28, color: '#9CA3AF' }} />
                                                </Box>
                                                <Typography sx={{ fontSize: '13px', color: '#6B7280', fontWeight: 600 }}>
                                                    {searchActive ? `No results for "${filterText}"` : 'No salary structures created yet'}
                                                </Typography>
                                                <Typography sx={{ fontSize: '11.5px', color: '#9CA3AF', mt: 0.4 }}>
                                                    {searchActive ? 'Try a different search term' : 'Click "Create Structure" to add the first one'}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : filtered.map((structure, idx) => {
                                        const basic = Number(structure.basicSalary) || 0;
                                        const hraP = structure.hraPercent ?? structure.hra ?? 0;
                                        const daP = structure.daPercent ?? structure.da ?? 0;
                                        const conveyance = Number(structure.conveyanceAllowance ?? structure.conveyance) || 0;
                                        const special = Number(structure.specialAllowance) || 0;
                                        const hraAmt = Math.round(basic * hraP / 100);
                                        const daAmt = Math.round(basic * daP / 100);
                                        const gross = structure.totalEarnings
                                            ? Number(structure.totalEarnings)
                                            : basic + hraAmt + daAmt + conveyance + special;
                                        const rollNo = structure.rollNumber || structure.employeeRollNumber || '—';
                                        const avColor = avatarColorFor(structure.name || '');

                                        return (
                                            <TableRow
                                                key={structure.id}
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
                                                            {getInitials(structure.name || '?')}
                                                        </Avatar>
                                                        <Box sx={{ minWidth: 0 }}>
                                                            <Typography sx={{
                                                                fontSize: '13px', fontWeight: 600,
                                                                color: '#111827', whiteSpace: 'nowrap',
                                                            }}>
                                                                {structure.name || '—'}
                                                            </Typography>
                                                            <Typography sx={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 500 }}>
                                                                {structure.grade ? `Grade ${structure.grade}` : 'Staff Member'}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #F3F4F6', py: 1.2 }}>
                                                    <Chip
                                                        label={rollNo}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: '#F3F4F6', color: '#374151',
                                                            fontWeight: 600, fontSize: '10.5px', height: 22,
                                                            border: '1px solid #E5E7EB',
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #F3F4F6', py: 1.2 }}>
                                                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                                                        {formatINR(basic)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #F3F4F6', py: 1.2 }}>
                                                    <Chip
                                                        label={`${hraP}%`}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: '#F3F0FE', color: '#1D4ED8',
                                                            border: '1px solid #C9BEFB',
                                                            fontWeight: 700, fontSize: '10.5px', height: 20,
                                                        }}
                                                    />
                                                    <Typography sx={{ fontSize: '10.5px', color: '#6B7280', mt: 0.3, fontWeight: 600 }}>
                                                        {formatINR(hraAmt)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #F3F4F6', py: 1.2 }}>
                                                    <Chip
                                                        label={`${daP}%`}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: '#F1EEFE', color: '#6246E0',
                                                            border: '1px solid #C9BEFB',
                                                            fontWeight: 700, fontSize: '10.5px', height: 20,
                                                        }}
                                                    />
                                                    <Typography sx={{ fontSize: '10.5px', color: '#6B7280', mt: 0.3, fontWeight: 600 }}>
                                                        {formatINR(daAmt)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #F3F4F6', py: 1.2 }}>
                                                    <Typography sx={{ fontSize: '12.5px', color: '#374151', fontWeight: 600 }}>
                                                        {formatINR(conveyance)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #F3F4F6', py: 1.2 }}>
                                                    <Typography sx={{ fontSize: '12.5px', color: '#374151', fontWeight: 600 }}>
                                                        {formatINR(special)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #F3F4F6', py: 1.2 }}>
                                                    <Box sx={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 0.5,
                                                        px: 1, py: 0.4, borderRadius: '7px',
                                                        bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`,
                                                    }}>
                                                        <Typography sx={{ fontSize: '13px', fontWeight: 800, color: PRIMARY_DARK }}>
                                                            {formatINR(gross)}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #F3F4F6', py: 1.2 }}>
                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                        <Tooltip arrow title="Edit structure">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleOpenDialog(structure)}
                                                                sx={{
                                                                    bgcolor: '#F3F0FE', borderRadius: '7px',
                                                                    border: '1px solid #C9BEFB',
                                                                    '&:hover': { bgcolor: '#DBEAFE' },
                                                                }}
                                                            >
                                                                <EditIcon sx={{ fontSize: 14, color: '#6246E0' }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip arrow title="Delete structure">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => { setStructureToDelete(structure); setDeleteConfirmOpen(true); }}
                                                                sx={{
                                                                    bgcolor: '#FEF2F2', borderRadius: '7px',
                                                                    border: '1px solid #FECACA',
                                                                    '&:hover': { bgcolor: '#FEE2E2' },
                                                                }}
                                                            >
                                                                <DeleteIcon sx={{ fontSize: 14, color: '#DC2626' }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
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

            {/* ─── Create / Edit Dialog ─────────────────────────────────── */}
            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="md"
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
                            {editMode
                                ? <EditIcon sx={{ color: PRIMARY, fontSize: 20 }} />
                                : <AddCircleOutlineIcon sx={{ color: PRIMARY, fontSize: 20 }} />}
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>
                                {editMode ? 'Edit Salary Structure' : 'Create New Salary Structure'}
                            </Typography>
                            <Typography sx={{ fontSize: '11.5px', color: '#6B7280', mt: 0.3 }}>
                                {editMode
                                    ? 'Update the earnings components for this staff member'
                                    : 'Define basic pay, allowances and gross salary for a staff member'}
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton
                        onClick={handleCloseDialog}
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
                    <Box sx={{
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
                                <PersonOutlineIcon sx={{ fontSize: 14, color: '#6246E0' }} />
                            </Box>
                            <Typography sx={{
                                fontSize: '11px', fontWeight: 700, color: '#374151',
                                textTransform: 'uppercase', letterSpacing: 0.6,
                            }}>
                                Employee Information
                            </Typography>
                        </Box>
                        <Autocomplete
                            options={employeesData}
                            getOptionLabel={(option) => `${option.rollNumber} — ${option.name}`}
                            value={selectedEmp}
                            disabled={editMode}
                            onChange={(_, newVal) => {
                                setSelectedEmp(newVal);
                                setFormData(prev => ({
                                    ...prev,
                                    name: newVal ? `${newVal.rollNumber} - ${newVal.name}` : '',
                                    employeeRollNumber: newVal ? newVal.rollNumber : '',
                                }));
                            }}
                            isOptionEqualToValue={(option, value) => option.rollNumber === value.rollNumber}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Select Employee *"
                                    size="small"
                                    slotProps={{ inputLabel: { shrink: true } }}
                                    sx={fieldSx}
                                />
                            )}
                        />
                        {editMode && (
                            <Typography sx={{ fontSize: '10.5px', color: '#9CA3AF', mt: 0.6, fontStyle: 'italic' }}>
                                Employee cannot be changed when editing an existing structure.
                            </Typography>
                        )}
                    </Box>

                    {/* Section: Components */}
                    <Box sx={{
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
                                <CalculateOutlinedIcon sx={{ fontSize: 14, color: '#2563EB' }} />
                            </Box>
                            <Typography sx={{
                                fontSize: '11px', fontWeight: 700, color: '#374151',
                                textTransform: 'uppercase', letterSpacing: 0.6,
                            }}>
                                Salary Components
                            </Typography>
                        </Box>

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="Basic Salary *"
                                    value={formData.basicSalary}
                                    onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                                    size="small"
                                    fullWidth
                                    type="number"
                                    slotProps={{
                                        inputLabel: { shrink: true },
                                        input: {
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>₹</Typography>
                                                </InputAdornment>
                                            ),
                                        },
                                    }}
                                    sx={fieldSx}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    label="Conveyance Allowance"
                                    value={formData.conveyance}
                                    onChange={(e) => setFormData({ ...formData, conveyance: e.target.value })}
                                    size="small"
                                    fullWidth
                                    type="number"
                                    slotProps={{
                                        inputLabel: { shrink: true },
                                        input: {
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>₹</Typography>
                                                </InputAdornment>
                                            ),
                                        },
                                    }}
                                    sx={fieldSx}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <TextField
                                    label="HRA (% of Basic)"
                                    value={formData.hra}
                                    onChange={(e) => setFormData({ ...formData, hra: e.target.value })}
                                    size="small"
                                    fullWidth
                                    type="number"
                                    helperText={`= ${formatINR(Math.round((Number(formData.basicSalary) || 0) * (Number(formData.hra) || 0) / 100))}`}
                                    slotProps={{
                                        inputLabel: { shrink: true },
                                        input: {
                                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                        },
                                        formHelperText: {
                                            sx: { fontSize: '10.5px', fontWeight: 600, color: '#6246E0', ml: 0.5, mt: 0.3 },
                                        },
                                    }}
                                    sx={fieldSx}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <TextField
                                    label="DA (% of Basic)"
                                    value={formData.da}
                                    onChange={(e) => setFormData({ ...formData, da: e.target.value })}
                                    size="small"
                                    fullWidth
                                    type="number"
                                    helperText={`= ${formatINR(Math.round((Number(formData.basicSalary) || 0) * (Number(formData.da) || 0) / 100))}`}
                                    slotProps={{
                                        inputLabel: { shrink: true },
                                        input: {
                                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                                        },
                                        formHelperText: {
                                            sx: { fontSize: '10.5px', fontWeight: 600, color: '#6246E0', ml: 0.5, mt: 0.3 },
                                        },
                                    }}
                                    sx={fieldSx}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 12, md: 4 }}>
                                <TextField
                                    label="Special Allowance"
                                    value={formData.specialAllowance}
                                    onChange={(e) => setFormData({ ...formData, specialAllowance: e.target.value })}
                                    size="small"
                                    fullWidth
                                    type="number"
                                    slotProps={{
                                        inputLabel: { shrink: true },
                                        input: {
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>₹</Typography>
                                                </InputAdornment>
                                            ),
                                        },
                                    }}
                                    sx={fieldSx}
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Section: Total preview */}
                    <Paper elevation={0} sx={{
                        p: 2,
                        borderRadius: '7px',
                        border: `1px solid ${PRIMARY_BORDER}`,
                        background: `linear-gradient(135deg, ${PRIMARY_LIGHT} 0%, #fff 70%)`,
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
                            <Box>
                                <Typography sx={{
                                    fontSize: '11px', fontWeight: 700, color: PRIMARY_DARK,
                                    textTransform: 'uppercase', letterSpacing: 0.6,
                                }}>
                                    Estimated Gross Earnings
                                </Typography>
                                <Typography sx={{ fontSize: '26px', fontWeight: 800, color: PRIMARY_DARK, lineHeight: 1.1, mt: 0.4 }}>
                                    {formatINR(calculateTotal())}
                                </Typography>
                                <Typography sx={{ fontSize: '10.5px', color: '#4B5563', mt: 0.4 }}>
                                    Basic + HRA + DA + Conveyance + Special Allowance
                                </Typography>
                            </Box>
                            <Box sx={{
                                width: 52, height: 52, borderRadius: '7px',
                                bgcolor: '#fff', border: `1px solid ${PRIMARY_BORDER}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <AccountBalanceWalletIcon sx={{ fontSize: 26, color: PRIMARY }} />
                            </Box>
                        </Box>
                    </Paper>
                </DialogContent>

                <DialogActions sx={{ px: 2.5, py: 1.8, borderTop: '1px solid #E5E7EB', bgcolor: '#fff' }}>
                    <Button
                        onClick={handleCloseDialog}
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
                        startIcon={isSaving ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <SaveOutlinedIcon sx={{ fontSize: 18 }} />}
                        onClick={handleSave}
                        disabled={isSaving}
                        sx={{
                            textTransform: 'none', fontSize: '13px', fontWeight: 700,
                            bgcolor: PRIMARY, color: '#fff', borderRadius: '7px',
                            px: 2.5, height: 38,
                            boxShadow: `0 2px 6px ${PRIMARY}33`,
                            '&:hover': { bgcolor: PRIMARY_DARK, boxShadow: `0 4px 12px ${PRIMARY}55` },
                            '&.Mui-disabled': { bgcolor: '#E5E7EB', color: '#9CA3AF' },
                        }}
                    >
                        {isSaving ? 'Saving…' : editMode ? 'Update Structure' : 'Create Structure'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ─── Delete Confirmation ──────────────────────────────────── */}
            <Dialog
                open={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                maxWidth="xs"
                fullWidth
                slotProps={{
                    paper: {
                        sx: { borderRadius: '7px', overflow: 'hidden' },
                    },
                }}
            >
                <DialogContent sx={{ pt: 3.5, pb: 2, textAlign: 'center' }}>
                    <Box sx={{
                        width: 64, height: 64, borderRadius: '50%',
                        bgcolor: '#FEF2F2', border: '4px solid #FEE2E2',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        mx: 'auto', mb: 1.8,
                    }}>
                        <WarningAmberIcon sx={{ fontSize: 32, color: '#DC2626' }} />
                    </Box>
                    <Typography sx={{ fontSize: '17px', fontWeight: 800, color: '#111827', mb: 0.8 }}>
                        Delete Salary Structure?
                    </Typography>
                    <Typography sx={{ fontSize: '12.5px', color: '#6B7280', px: 1.5, lineHeight: 1.5 }}>
                        Are you sure you want to delete the salary structure for{' '}
                        <strong style={{ color: '#111827' }}>
                            {structureToDelete?.name || 'this employee'}
                        </strong>
                        ? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
                    <Button
                        fullWidth
                        onClick={() => { setDeleteConfirmOpen(false); setStructureToDelete(null); }}
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
                        startIcon={<DeleteIcon sx={{ fontSize: 16 }} />}
                        onClick={() => {
                            setDeleteConfirmOpen(false);
                            handleDelete(structureToDelete);
                            setStructureToDelete(null);
                        }}
                        sx={{
                            textTransform: 'none', fontSize: '13px', fontWeight: 700,
                            borderRadius: '7px', height: 38,
                            bgcolor: '#DC2626', color: '#fff',
                            boxShadow: '0 2px 6px rgba(220,38,38,0.3)',
                            '&:hover': { bgcolor: '#B91C1C', boxShadow: '0 4px 12px rgba(220,38,38,0.4)' },
                        }}
                    >
                        Yes, Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
