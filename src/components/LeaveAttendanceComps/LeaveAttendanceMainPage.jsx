import React, { useState } from 'react';
import {
    Box,
    Typography,
    IconButton,
    Tabs,
    Tab,
    Divider,
    Grid,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PolicyIcon from '@mui/icons-material/Policy';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Import existing page components
import StaffAttendanceOverviewPage from './StaffAttendanceOverviewPage';
import LeaveManagementPage from './LeaveManagementPage';
import ApprovalWorkflowPage from './ApprovalWorkflowPage';
import AttendanceReportsPage from './AttendanceReportsPage';

// Import the attendance dashboard content from LeaveAttendancePage
import LeaveAttendancePage from './LeaveAttendancePage';
import AddStaffAttendancePage from './AddStaffAttendancePage';

// Module cards configuration
const moduleCards = [
    {
        color: "#7C5CFC",
        icon: PolicyIcon,
        text: "Leave Policy Master",
        description: "Configure leave types, attendance bonus & deduction rules",
        bgColor: "#F1EEFE",
        iconBgColor: "#7C5CFC1A",
        moduleIndex: 2,
        disabled: false,
    },
    {
        color: "#F97316",
        icon: EventNoteIcon,
        text: "Leave & Attendance",
        description: "Daily attendance, leave requests, approvals & reports",
        bgColor: "#FFF5F2",
        iconBgColor: "#FF6B351A",
        moduleIndex: 0,
        disabled: false,
    },
    {
        color: "#6246E0",
        icon: AccountBalanceIcon,
        text: "Payroll Management",
        description: "Salary structures, statutory compliance & payroll runs",
        bgColor: "#F3F0FE",
        iconBgColor: "#6246E01A",
        moduleIndex: 1,
        disabled: false,
    },
    
];

export default function LeaveAttendanceMainPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = useSelector((state) => state.auth);
    const userType = user.userType;
    const isLeaveAttendancePath = location.pathname.endsWith('/leave-attendance');
    const [moduleTab, setModuleTab] = useState(isLeaveAttendancePath ? 0 : (location.state?.moduleTab ?? null)); // null: show cards, 0: Leave, 1: Payroll
    const [tabValue, setTabValue] = useState(0);

    const handleModuleCardClick = (moduleIndex) => {
        if (moduleIndex === 0) {
            // Dedicated Leave & Attendance route so refresh persists
            navigate('leave-attendance');
        } else if (moduleIndex === 1) {
            // Separate Payroll route
            navigate('payroll');
        } else if (moduleIndex === 2) {
            // Leave Policy Master — direct entry from main page
            navigate('payroll/leave-policy/leave-master');
        }
    };

    const handleBackToCards = () => {
        if (isLeaveAttendancePath) {
            navigate(-1);
        } else {
            setModuleTab(null);
            setTabValue(0);
        }
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    // Render content based on selected tab (only for Leave & Attendance module)
    const renderTabContent = () => {
        // Leave & Attendance Module tabs
        switch (tabValue) {
            case 0:
                return <LeaveAttendancePage isEmbedded={true} onGoToAddAttendance={() => setTabValue(1)} onGoToApprovalWorkflow={() => setTabValue(4)} />;
            case 1:
                return <AddStaffAttendancePage />;
            case 2:
                return <StaffAttendanceOverviewPage isEmbedded={true} />;
            case 3:
                return <LeaveManagementPage isEmbedded={true} onGoToApprovalWorkflow={() => setTabValue(4)} />;
            case 4:
                return <ApprovalWorkflowPage isEmbedded={true} />;
            case 5:
                return <AttendanceReportsPage isEmbedded={true} />;
            default:
                return <LeaveAttendancePage isEmbedded={true} />;
        }
    };

    return (
        <Box sx={{
            border: '1px solid #ccc',
            borderRadius: '20px',
            p: 2,
            height: '86vh',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#FAFAFA'
        }}>
            {/* Header */}
            <Box sx={{ flexShrink: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Typography sx={{ fontSize: "20px", fontWeight: "600" }}>
                        Leave & Payroll Management
                    </Typography>
                </Box>
                <Divider sx={{ mb: 1.5 }} />
                {moduleTab === 0 && (
                    <Box sx={{ borderBottom: '1px solid #E8E8E8', mb: 1.5 }}>
                        <Tabs
                            value={tabValue}
                            onChange={handleTabChange}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{
                                minHeight: '40px',
                                '& .MuiTab-root': {
                                    textTransform: 'none',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    color: '#666',
                                    minHeight: '40px',
                                    px: 2.5,
                                    py: 1
                                },
                                '& .Mui-selected': {
                                    color: '#F97316 !important'
                                },
                                '& .MuiTabs-indicator': {
                                    backgroundColor: '#F97316',
                                    height: '2px',
                                    borderRadius: '2px 2px 0 0'
                                }
                            }}
                        >
                            <Tab label="Attendance Dashboard" />
                            <Tab label="Add Attendance" />
                            <Tab label="Staff Attendance Overview" />
                            <Tab label="Leave Management" />
                            <Tab label="Leave Approval" />
                            <Tab label="Reports" />
                        </Tabs>
                    </Box>
                )}
            </Box>

            {/* Dynamic Content Area */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                {moduleTab === null ? (
                    // Show module cards when no module is selected
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        {moduleCards.filter(item => {
                            const adminGated = ["Payroll Management", "Leave Policy Master"];
                            if (!adminGated.includes(item.text)) return true;
                            return ["Super Admin", "admin", "staff"].includes(userType);
                        }).map((item, index) => {
                            const IconComponent = item.icon;
                            return (
                                <Grid
                                    sx={{ display: "flex", justifyContent: "center" }}
                                    key={index}
                                    size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                                >
                                    <Box
                                        onClick={() => !item.disabled && handleModuleCardClick(item.moduleIndex)}
                                        sx={{
                                            position: "relative",
                                            backgroundColor: item.bgColor,
                                            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
                                            border: "1px solid rgba(0, 0, 0, 0.06)",
                                            width: "100%",
                                            minHeight: "105px",
                                            borderRadius: "8px",
                                            cursor: item.disabled ? "not-allowed" : "pointer",
                                            opacity: item.disabled ? 0.6 : 1,
                                            transition: "transform 0.25s ease, box-shadow 0.25s ease",
                                            overflow: "hidden",
                                            display: "flex",
                                            alignItems: "stretch",
                                            "&:hover": {
                                                transform: item.disabled ? "none" : "translateY(-3px)",
                                                boxShadow: item.disabled ? "0 2px 6px rgba(0, 0, 0, 0.08)" : `0 6px 16px ${item.color}30`,
                                                ".arrowIcon": { opacity: item.disabled ? 0 : 1, transform: "translateX(2px)" },
                                            },
                                            "&::before": {
                                                content: '""',
                                                position: "absolute",
                                                left: 0,
                                                top: 0,
                                                height: "100%",
                                                width: "5px",
                                                background: `linear-gradient(180deg, ${item.color} 0%, ${item.color}99 100%)`,
                                            },
                                        }}
                                    >
                                        <Box sx={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            px: 2.5,
                                            py: 2,
                                            gap: 1.5,
                                            minWidth: 0,
                                        }}>
                                            <Box sx={{
                                                backgroundColor: item.iconBgColor,
                                                borderRadius: "50%",
                                                width: 44,
                                                height: 44,
                                                display: "flex",
                                                justifyContent: "center",
                                                alignItems: "center",
                                                flexShrink: 0,
                                            }}>
                                                <IconComponent sx={{ color: item.color, fontSize: 24 }} />
                                            </Box>
                                            <Box sx={{
                                                flex: 1,
                                                minWidth: 0,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'center',
                                            }}>
                                                <Typography sx={{ fontWeight: 700, fontSize: 15, color: "#1a1a1a", lineHeight: 1.3 }}>
                                                    {item.text}
                                                </Typography>
                                            
                                            </Box>
                                            <ArrowForwardIcon className="arrowIcon" sx={{
                                                opacity: 0,
                                                transition: "opacity 0.25s ease, transform 0.25s ease",
                                                color: item.color,
                                                flexShrink: 0,
                                                alignSelf: 'center',
                                            }} />
                                        </Box>
                                    </Box>
                                </Grid>
                            );
                        })}
                    </Grid>
                ) : (
                    // Show module content when a module is selected
                    renderTabContent()
                )}
            </Box>
        </Box>
    );
}
