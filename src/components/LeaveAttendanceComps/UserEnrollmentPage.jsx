import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Grid,
    Typography,
    IconButton,
    Button,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Avatar,
    Divider,
    Select,
    MenuItem,
    Tabs,
    Tab,
    LinearProgress,
    Alert,
    AlertTitle
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PanToolIcon from '@mui/icons-material/PanTool';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import SettingsIcon from '@mui/icons-material/Settings';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import EditIcon from '@mui/icons-material/Edit';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineRounded';
import WarningIcon from '@mui/icons-material/Warning';
import GroupIcon from '@mui/icons-material/Group';
import BadgeIcon from '@mui/icons-material/Badge';
import { useNavigate } from 'react-router-dom';

// Mock data for pending enrollment requests
const enrollmentRequests = [
    {
        id: 1,
        name: "Michael Knight",
        role: "ID: 82463 • Product Design",
        avatar: "MK",
        avatarColor: "#9B87FB",
        department: "Logistics",
        requestType: "New Hire",
        missingInfo: "Contact Details",
        status: "Pending Approval",
        statusColor: "warning",
        action: "Complete Profile"
    },
    {
        id: 2,
        name: "Sarah Jenkins",
        role: "ID: 82464 • Product Design",
        avatar: "SJ",
        avatarColor: "#7C5CFC",
        department: "Design",
        requestType: "Profile Update",
        missingInfo: "Emergency Contact",
        status: "Info Required",
        statusColor: "warning",
        action: "Update Info"
    },
    {
        id: 3,
        name: "Anita Lopez",
        role: "ID: 89234 • Sales",
        avatar: "AL",
        avatarColor: "#22C55E",
        department: "Sales",
        requestType: "New Hire",
        missingInfo: "Documents",
        status: "Pending Verification",
        statusColor: "info",
        action: "Verify"
    },
    {
        id: 4,
        name: "David Ross",
        role: "ID: 24479 • Marketing Lead",
        avatar: "DR",
        avatarColor: "#F97316",
        department: "Marketing",
        requestType: "Data Update",
        missingInfo: "Address",
        status: "Action Required",
        statusColor: "error",
        action: "Update"
    }
];

// Mock data for department enrollment progress
const departmentProgress = [
    { name: "HR", percentage: 95, color: "#9B87FB" },
    { name: "Sales & Marketing", percentage: 82, color: "#7C5CFC" },
    { name: "Administration", percentage: 100, color: "#22C55E" },
    { name: "Operations", percentage: 65, color: "#F97316" }
];

// Mock data for recent activity
const recentActivity = [
    {
        title: "New Staff Added",
        description: "Jane Smith (Operations) • 10m ago",
        icon: "add",
        color: "#22C55E"
    },
    {
        title: "Profile Completed",
        description: "Bryan Jenkins • 45m ago",
        icon: "check",
        color: "#7C5CFC"
    },
    {
        title: "Profile Updated",
        description: "Emma Hart • 1h ago",
        icon: "edit",
        color: "#9B87FB"
    }
];

export default function UserEnrollmentPage({ isEmbedded = false }) {
    const navigate = useNavigate();
    const [tabValue, setTabValue] = useState(2); // Staff Management tab active
    const [requestTab, setRequestTab] = useState(0); // All Requests active
    const [filterDate, setFilterDate] = useState("This Month");
    const [filterBranch, setFilterBranch] = useState("All Branch");
    const [filterDept, setFilterDept] = useState("All Dept");

    const handleTabChange = (event, newValue) => {
        // Navigate to different pages based on tab selection
        switch(newValue) {
            case 0:
                // Attendance Dashboard
                navigate('/dashboardmenu/Leave');
                break;
            case 1:
                // Staff Attendance Overview
                navigate('/dashboardmenu/Leave/staff-attendance-overview');
                break;
            case 2:
                // Staff Management - already on this page
                setTabValue(2);
                break;
            case 3:
                // Leave Management
                navigate('/dashboardmenu/Leave/leave-management');
                break;
            case 4:
                // Approval Workflow
                navigate('/dashboardmenu/Leave/approval-workflow');
                break;
            case 5:
                // Reports
                navigate('/dashboardmenu/Leave/reports');
                break;
            default:
                setTabValue(2);
                break;
        }
    };

    const handleRequestTabChange = (event, newValue) => {
        setRequestTab(newValue);
    };

    return (
        <Box sx={{
            border: isEmbedded ? 'none' : '1px solid #ccc',
            borderRadius: isEmbedded ? '0' : '20px',
            p: isEmbedded ? 0 : 2,
            height: isEmbedded ? 'auto' : '86vh',
            overflow: 'auto',
            bgcolor: '#FAFAFA'
        }}>
            {/* Header - Hidden when embedded */}
            {!isEmbedded && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={() => navigate(-1)} sx={{ width: '35px', height: '35px' }}>
                        <ArrowBackIcon sx={{ fontSize: 20, color: '#000' }} />
                    </IconButton>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a' }}>
                            Staff Management
                        </Typography>
                        <Chip
                            icon={<CheckCircleIcon sx={{ fontSize: 10, color: '#7C5CFC' }} />}
                            label="Manual Entry Mode"
                            size="small"
                            sx={{
                                bgcolor: '#DBEAFE',
                                color: '#7C5CFC',
                                fontWeight: '600',
                                fontSize: '11px',
                                height: '22px'
                            }}
                        />
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        startIcon={<FileUploadIcon />}
                        variant="outlined"
                        sx={{
                            textTransform: 'none',
                            borderRadius: '50px',
                            border: '1px solid #333',
                            color: '#333',
                            fontSize: '13px',
                            fontWeight: '600',
                            px: 2.5,
                            '&:hover': {
                                border: '1px solid #000',
                                bgcolor: '#F5F5F5'
                            }
                        }}
                    >
                        Bulk Import
                    </Button>
                    <Button
                        startIcon={<SettingsIcon />}
                        variant="outlined"
                        sx={{
                            textTransform: 'none',
                            borderRadius: '50px',
                            border: '1px solid #666',
                            color: '#666',
                            fontSize: '13px',
                            fontWeight: '600',
                            px: 2.5,
                            '&:hover': {
                                border: '1px solid #333',
                                bgcolor: '#F5F5F5'
                            }
                        }}
                    >
                        Settings
                    </Button>
                    <Button
                        startIcon={<FileDownloadIcon />}
                        variant="contained"
                        sx={{
                            textTransform: 'none',
                            borderRadius: '50px',
                            bgcolor: '#F59E0B',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: '600',
                            px: 2.5,
                            '&:hover': {
                                bgcolor: '#0EA5E9'
                            }
                        }}
                    >
                        Export Data
                    </Button>
                </Box>
            </Box>
            )}

            {/* Tabs - Hidden when embedded */}
            {!isEmbedded && (
            <Box sx={{ borderBottom: '1px solid #E8E8E8', mb: 2 }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    sx={{
                        '& .MuiTab-root': {
                            textTransform: 'none',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#666',
                            minHeight: '40px',
                            px: 2
                        },
                        '& .Mui-selected': {
                            color: '#F97316 !important'
                        },
                        '& .MuiTabs-indicator': {
                            backgroundColor: '#F97316',
                            height: '3px'
                        }
                    }}
                >
                    <Tab label="Attendance Dashboard" />
                    <Tab label="Staff Attendance Overview" />
                    <Tab label="Staff Management" />
                    <Tab label="Leave Management" />
                    <Tab label="Approval Workflow" />
                    <Tab label="Reports" />
                </Tabs>
            </Box>
            )}

            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <Select
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    size="small"
                    sx={{
                        minWidth: 120,
                        bgcolor: '#fff',
                        borderRadius: '7px',
                        fontSize: '13px',
                        fontWeight: '500',
                        border: '1px solid #E8E8E8'
                    }}
                >
                    <MenuItem value="This Month">This Month</MenuItem>
                    <MenuItem value="Last Month">Last Month</MenuItem>
                    <MenuItem value="This Quarter">This Quarter</MenuItem>
                </Select>
                <Select
                    value={filterBranch}
                    onChange={(e) => setFilterBranch(e.target.value)}
                    size="small"
                    sx={{
                        minWidth: 120,
                        bgcolor: '#fff',
                        borderRadius: '7px',
                        fontSize: '13px',
                        fontWeight: '500',
                        border: '1px solid #E8E8E8'
                    }}
                >
                    <MenuItem value="All Branch">All Branch</MenuItem>
                    <MenuItem value="Branch 1">Branch 1</MenuItem>
                    <MenuItem value="Branch 2">Branch 2</MenuItem>
                </Select>
                <Select
                    value={filterDept}
                    onChange={(e) => setFilterDept(e.target.value)}
                    size="small"
                    sx={{
                        minWidth: 120,
                        bgcolor: '#fff',
                        borderRadius: '7px',
                        fontSize: '13px',
                        fontWeight: '500',
                        border: '1px solid #E8E8E8'
                    }}
                >
                    <MenuItem value="All Dept">All Dept</MenuItem>
                    <MenuItem value="HR">HR</MenuItem>
                    <MenuItem value="IT">IT</MenuItem>
                    <MenuItem value="Marketing">Marketing</MenuItem>
                </Select>
            </Box>

            {/* Staff Overview Section Header */}
            <Typography sx={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', mb: 2 }}>
                Staff Overview
            </Typography>

            <Grid container spacing={2}>
                {/* Main Content - Left Side */}
                <Grid size={{ xs: 12, lg: 9 }}>
                    {/* Overview Cards */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        {/* Total Users */}
                        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
                            <Card sx={{
                                border: '1px solid #E8E8E8',
                                borderRadius: '7px',
                                boxShadow: 'none',
                                bgcolor: '#fff',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                }
                            }}>
                                <CardContent sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography sx={{ fontSize: '11px', color: '#666', mb: 0.5 }}>
                                                Total Users
                                            </Typography>
                                            <Typography sx={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', lineHeight: 1.2 }}>
                                                162
                                            </Typography>
                                            <Typography sx={{ fontSize: '10px', color: '#7C5CFC', fontWeight: '600', mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                                <TrendingUpIcon sx={{ fontSize: 12 }} />
                                                +5 New vs last month
                                            </Typography>
                                        </Box>
                                        <Avatar sx={{ bgcolor: '#DBEAFE', width: 40, height: 40 }}>
                                            <PersonIcon sx={{ color: '#7C5CFC', fontSize: 24 }} />
                                        </Avatar>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Fully Enrolled */}
                        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
                            <Card sx={{
                                border: '1px solid #E8E8E8',
                                borderRadius: '7px',
                                boxShadow: 'none',
                                bgcolor: '#fff',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                }
                            }}>
                                <CardContent sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography sx={{ fontSize: '11px', color: '#666', mb: 0.5 }}>
                                                Fully Enrolled
                                            </Typography>
                                            <Typography sx={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', lineHeight: 1.2 }}>
                                                140
                                            </Typography>
                                            <Typography sx={{ fontSize: '10px', color: '#22C55E', fontWeight: '600', mt: 0.5 }}>
                                                86% Coverage
                                            </Typography>
                                        </Box>
                                        <Avatar sx={{ bgcolor: '#DBEAFE', width: 40, height: 40 }}>
                                            <CheckCircleIcon sx={{ color: '#22C55E', fontSize: 24 }} />
                                        </Avatar>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Pending Requests */}
                        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
                            <Card sx={{
                                border: '1px solid #E8E8E8',
                                borderRadius: '7px',
                                boxShadow: 'none',
                                bgcolor: '#fff',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                }
                            }}>
                                <CardContent sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography sx={{ fontSize: '11px', color: '#666', mb: 0.5 }}>
                                                Pending Requests
                                            </Typography>
                                            <Typography sx={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', lineHeight: 1.2 }}>
                                                5
                                            </Typography>
                                            <Typography sx={{ fontSize: '10px', color: '#F97316', fontWeight: '600', mt: 0.5 }}>
                                                Requires Approval
                                            </Typography>
                                        </Box>
                                        <Avatar sx={{ bgcolor: '#FFF7ED', width: 40, height: 40 }}>
                                            <PanToolIcon sx={{ color: '#F97316', fontSize: 24 }} />
                                        </Avatar>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Incomplete Profiles */}
                        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
                            <Card sx={{
                                border: '1px solid #E8E8E8',
                                borderRadius: '7px',
                                boxShadow: 'none',
                                bgcolor: '#fff',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                }
                            }}>
                                <CardContent sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography sx={{ fontSize: '11px', color: '#666', mb: 0.5 }}>
                                                Incomplete Profiles
                                            </Typography>
                                            <Typography sx={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', lineHeight: 1.2 }}>
                                                12
                                            </Typography>
                                            <Typography sx={{ fontSize: '10px', color: '#DC2626', fontWeight: '600', mt: 0.5 }}>
                                                Missing Information
                                            </Typography>
                                        </Box>
                                        <Avatar sx={{ bgcolor: '#FEF2F2', width: 40, height: 40 }}>
                                            <ErrorOutlineIcon sx={{ color: '#DC2626', fontSize: 24 }} />
                                        </Avatar>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Active Staff */}
                        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
                            <Card sx={{
                                border: '1px solid #E8E8E8',
                                borderRadius: '7px',
                                boxShadow: 'none',
                                bgcolor: '#fff',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                }
                            }}>
                                <CardContent sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography sx={{ fontSize: '11px', color: '#666', mb: 0.5 }}>
                                                Active Staff
                                            </Typography>
                                            <Typography sx={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', lineHeight: 1.2 }}>
                                                150
                                            </Typography>
                                            <Typography sx={{ fontSize: '10px', color: '#9B87FB', fontWeight: '600', mt: 0.5 }}>
                                                Currently Working
                                            </Typography>
                                        </Box>
                                        <Avatar sx={{ bgcolor: '#F3F0FE', width: 40, height: 40 }}>
                                            <GroupIcon sx={{ color: '#9B87FB', fontSize: 24 }} />
                                        </Avatar>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Departments */}
                        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
                            <Card sx={{
                                border: '1px solid #E8E8E8',
                                borderRadius: '7px',
                                boxShadow: 'none',
                                bgcolor: '#fff',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                }
                            }}>
                                <CardContent sx={{ flex: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography sx={{ fontSize: '11px', color: '#666', mb: 0.5 }}>
                                                Departments
                                            </Typography>
                                            <Typography sx={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', lineHeight: 1.2 }}>
                                                8
                                            </Typography>
                                            <Typography sx={{ fontSize: '10px', color: '#7C5CFC', fontWeight: '600', mt: 0.5 }}>
                                                Active Departments
                                            </Typography>
                                        </Box>
                                        <Avatar sx={{ bgcolor: '#DBEAFE', width: 40, height: 40 }}>
                                            <BadgeIcon sx={{ color: '#7C5CFC', fontSize: 24 }} />
                                        </Avatar>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Action Cards */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        {/* Add New User */}
                        <Grid size={{ xs: 12, sm: 6, md: 3, lg: 3 }}>
                            <Card sx={{
                                border: '1px solid #E8E8E8',
                                borderRadius: '7px',
                                boxShadow: 'none',
                                bgcolor: '#E0F2FE',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                    borderColor: '#F59E0B'
                                }
                            }}>
                                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                                    <Avatar sx={{ bgcolor: '#FEF3C7', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                                        <PersonAddIcon sx={{ color: '#F59E0B', fontSize: 28 }} />
                                    </Avatar>
                                    <Typography sx={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', mb: 0.5 }}>
                                        Add New Staff
                                    </Typography>
                                    <Typography sx={{ fontSize: '11px', color: '#666' }}>
                                        Register staff profile and generate ID
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Edit Staff Details */}
                        <Grid size={{ xs: 12, sm: 6, md: 3, lg: 3 }}>
                            <Card sx={{
                                border: '1px solid #E8E8E8',
                                borderRadius: '7px',
                                boxShadow: 'none',
                                bgcolor: '#EFF5FF',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                    borderColor: '#22C55E'
                                }
                            }}>
                                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                                    <Avatar sx={{ bgcolor: '#DBEAFE', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                                        <EditIcon sx={{ color: '#22C55E', fontSize: 28 }} />
                                    </Avatar>
                                    <Typography sx={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', mb: 0.5 }}>
                                        Edit Staff Details
                                    </Typography>
                                    <Typography sx={{ fontSize: '11px', color: '#666' }}>
                                        Update staff information
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* View All Staff */}
                        <Grid size={{ xs: 12, sm: 6, md: 3, lg: 3 }}>
                            <Card sx={{
                                border: '1px solid #E8E8E8',
                                borderRadius: '7px',
                                boxShadow: 'none',
                                bgcolor: '#F3F0FE',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                    borderColor: '#9B87FB'
                                }
                            }}>
                                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                                    <Avatar sx={{ bgcolor: '#F1EEFE', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                                        <GroupIcon sx={{ color: '#9B87FB', fontSize: 28 }} />
                                    </Avatar>
                                    <Typography sx={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', mb: 0.5 }}>
                                        View All Staff
                                    </Typography>
                                    <Typography sx={{ fontSize: '11px', color: '#666' }}>
                                        Browse complete staff directory
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Manage Departments */}
                        <Grid size={{ xs: 12, sm: 6, md: 3, lg: 3 }}>
                            <Card sx={{
                                border: '1px solid #E8E8E8',
                                borderRadius: '7px',
                                boxShadow: 'none',
                                bgcolor: '#F3F0FE',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                    borderColor: '#7C5CFC'
                                }
                            }}>
                                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                                    <Avatar sx={{ bgcolor: '#DBEAFE', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                                        <BadgeIcon sx={{ color: '#7C5CFC', fontSize: 28 }} />
                                    </Avatar>
                                    <Typography sx={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', mb: 0.5 }}>
                                        Manage Departments
                                    </Typography>
                                    <Typography sx={{ fontSize: '11px', color: '#666' }}>
                                        Organize staff by departments
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Pending Staff Requests */}
                    <Card sx={{ border: '1px solid #E8E8E8', borderRadius: '7px', boxShadow: 'none' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <FiberManualRecordIcon sx={{ fontSize: 10, color: '#F97316' }} />
                                <Typography sx={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a' }}>
                                    Pending Staff Requests
                                </Typography>
                            </Box>

                            {/* Sub-tabs */}
                            <Tabs
                                value={requestTab}
                                onChange={handleRequestTabChange}
                                sx={{
                                    mb: 2,
                                    minHeight: '36px',
                                    '& .MuiTab-root': {
                                        textTransform: 'none',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#666',
                                        minHeight: '36px',
                                        px: 2
                                    },
                                    '& .Mui-selected': {
                                        color: '#F97316 !important'
                                    },
                                    '& .MuiTabs-indicator': {
                                        backgroundColor: '#F97316',
                                        height: '2px'
                                    }
                                }}
                            >
                                <Tab label="All Requests" />
                                <Tab label="New Joiners" />
                                <Tab label="Profile Updates" />
                            </Tabs>

                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                                            <TableCell sx={{ fontWeight: '600', fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>
                                                User Details
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: '600', fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>
                                                Department
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: '600', fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>
                                                Request Type
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: '600', fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>
                                                Missing Info
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: '600', fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>
                                                Status
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: '600', fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>
                                                Action
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {enrollmentRequests.map((request) => (
                                            <TableRow
                                                key={request.id}
                                                sx={{
                                                    '&:hover': { bgcolor: '#F9FAFB' },
                                                    borderBottom: '1px solid #E8E8E8'
                                                }}
                                            >
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Avatar sx={{ width: 36, height: 36, bgcolor: request.avatarColor, fontSize: '13px' }}>
                                                            {request.avatar}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography sx={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>
                                                                {request.name}
                                                            </Typography>
                                                            <Typography sx={{ fontSize: '11px', color: '#999' }}>
                                                                {request.role}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography sx={{ fontSize: '13px', color: '#666' }}>
                                                        {request.department}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={request.requestType}
                                                        size="small"
                                                        sx={{
                                                            bgcolor:
                                                                request.requestType === 'New Hire' ? '#DBEAFE' :
                                                                    request.requestType === 'Profile Update' ? '#DBEAFE' :
                                                                        request.requestType === 'Data Update' ? '#FEF3C7' :
                                                                            '#F3F4F6',
                                                            color:
                                                                request.requestType === 'New Hire' ? '#7C5CFC' :
                                                                    request.requestType === 'Profile Update' ? '#22C55E' :
                                                                        request.requestType === 'Data Update' ? '#F59E0B' :
                                                                            '#666',
                                                            fontWeight: '600',
                                                            fontSize: '11px'
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Typography sx={{ fontSize: '13px', color: '#666' }}>
                                                        {request.missingInfo}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={request.status}
                                                        size="small"
                                                        sx={{
                                                            bgcolor:
                                                                request.statusColor === 'warning' ? '#FEF3C7' :
                                                                    request.statusColor === 'error' ? '#FEE2E2' :
                                                                        '#DBEAFE',
                                                            color:
                                                                request.statusColor === 'warning' ? '#F59E0B' :
                                                                    request.statusColor === 'error' ? '#DC2626' :
                                                                        '#7C5CFC',
                                                            fontWeight: '600',
                                                            fontSize: '11px'
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        sx={{
                                                            textTransform: 'none',
                                                            fontSize: '11px',
                                                            fontWeight: '600',
                                                            bgcolor: '#F97316',
                                                            color: '#fff',
                                                            borderRadius: '7px',
                                                            px: 2,
                                                            '&:hover': {
                                                                bgcolor: '#EA580C'
                                                            }
                                                        }}
                                                    >
                                                        {request.action}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                <Button
                                    endIcon={<ArrowBackIcon sx={{ transform: 'rotate(180deg)' }} />}
                                    sx={{
                                        textTransform: 'none',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        color: '#F59E0B',
                                        '&:hover': {
                                            bgcolor: '#E0F2FE'
                                        }
                                    }}
                                >
                                    View All Staff Requests
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Right Side Panel */}
                <Grid size={{ xs: 12, lg: 3 }}>
                    {/* System Alerts */}
                    <Card sx={{ border: '1px solid #E8E8E8', borderRadius: '7px', boxShadow: 'none', mb: 2 }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography sx={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>
                                    Enrollment Alerts
                                </Typography>
                                <Chip
                                    label="2 Alerts"
                                    size="small"
                                    sx={{
                                        bgcolor: '#FEF2F2',
                                        color: '#DC2626',
                                        fontWeight: '600',
                                        fontSize: '10px',
                                        height: '20px'
                                    }}
                                />
                            </Box>

                            <Alert
                                severity="error"
                                icon={<ErrorOutlineIcon sx={{ fontSize: 18 }} />}
                                sx={{
                                    mb: 1.5,
                                    border: '1px solid #FCA5A5',
                                    bgcolor: '#FEF2F2',
                                    '& .MuiAlert-message': { width: '100%' }
                                }}
                            >
                                <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                        <Typography sx={{ fontSize: '12px', fontWeight: '600', color: '#1a1a1a' }}>
                                            Incomplete Profiles
                                        </Typography>
                                        <Chip label="Now" size="small" sx={{ bgcolor: '#DC2626', color: '#fff', height: '18px', fontSize: '9px', fontWeight: '600' }} />
                                    </Box>
                                    <Typography sx={{ fontSize: '11px', color: '#666', mb: 0.5 }}>
                                        12 staff members have incomplete profile information.
                                    </Typography>
                                    <Button
                                        size="small"
                                        sx={{
                                            textTransform: 'none',
                                            fontSize: '10px',
                                            fontWeight: '600',
                                            color: '#DC2626',
                                            p: 0,
                                            minWidth: 'auto',
                                            '&:hover': {
                                                bgcolor: 'transparent',
                                                textDecoration: 'underline'
                                            }
                                        }}
                                    >
                                        View Details
                                    </Button>
                                </Box>
                            </Alert>

                            <Alert
                                severity="warning"
                                icon={<WarningIcon sx={{ fontSize: 18 }} />}
                                sx={{
                                    border: '1px solid #FED7AA',
                                    bgcolor: '#FFF7ED',
                                    '& .MuiAlert-message': { width: '100%' }
                                }}
                            >
                                <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                        <Typography sx={{ fontSize: '12px', fontWeight: '600', color: '#1a1a1a' }}>
                                            Pending Approvals
                                        </Typography>
                                        <Typography sx={{ fontSize: '10px', color: '#999' }}>Today</Typography>
                                    </Box>
                                    <Typography sx={{ fontSize: '11px', color: '#666' }}>
                                        5 new staff enrollments require approval.
                                    </Typography>
                                </Box>
                            </Alert>
                        </CardContent>
                    </Card>

                    {/* Staff by Department */}
                    <Card sx={{ border: '1px solid #E8E8E8', borderRadius: '7px', boxShadow: 'none', mb: 2 }}>
                        <CardContent>
                            <Typography sx={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', mb: 2 }}>
                                Staff by Department
                            </Typography>

                            {departmentProgress.map((dept, idx) => (
                                <Box key={idx} sx={{ mb: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography sx={{ fontSize: '12px', color: '#666' }}>
                                            {dept.name}
                                        </Typography>
                                        <Typography sx={{ fontSize: '12px', fontWeight: '600', color: '#1a1a1a' }}>
                                            {dept.percentage}%
                                        </Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={dept.percentage}
                                        sx={{
                                            height: 6,
                                            borderRadius: 3,
                                            bgcolor: '#E8E8E8',
                                            '& .MuiLinearProgress-bar': {
                                                bgcolor: dept.color,
                                                borderRadius: 3
                                            }
                                        }}
                                    />
                                </Box>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card sx={{ border: '1px solid #E8E8E8', borderRadius: '7px', boxShadow: 'none' }}>
                        <CardContent>
                            <Typography sx={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', mb: 2 }}>
                                Recent Activity
                            </Typography>

                            {recentActivity.map((activity, idx) => (
                                <Box
                                    key={idx}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                        mb: 1.5,
                                        p: 1,
                                        borderRadius: '7px',
                                        border: '1px solid #E8E8E8',
                                        '&:hover': {
                                            bgcolor: '#F9FAFB'
                                        }
                                    }}
                                >
                                    <Avatar sx={{ width: 32, height: 32, bgcolor: activity.color + '20' }}>
                                        {activity.icon === 'add' && <PersonAddIcon sx={{ fontSize: 16, color: activity.color }} />}
                                        {activity.icon === 'check' && <CheckCircleIcon sx={{ fontSize: 16, color: activity.color }} />}
                                        {activity.icon === 'edit' && <EditIcon sx={{ fontSize: 16, color: activity.color }} />}
                                    </Avatar>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography sx={{ fontSize: '12px', fontWeight: '600', color: '#1a1a1a' }}>
                                            {activity.title}
                                        </Typography>
                                        <Typography sx={{ fontSize: '10px', color: '#999' }}>
                                            {activity.description}
                                        </Typography>
                                    </Box>
                                </Box>
                            ))}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
