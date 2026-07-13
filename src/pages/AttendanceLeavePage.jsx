import React from 'react';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import BeachAccessRoundedIcon from '@mui/icons-material/BeachAccessRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import TabbedPage from '../components/TabbedPage';
import StaffAttendanceOverviewPage from '../components/LeaveAttendanceComps/StaffAttendanceOverviewPage';
import AddStaffAttendancePage from '../components/LeaveAttendanceComps/AddStaffAttendancePage';
import LeaveManagementPage from '../components/LeaveAttendanceComps/LeaveManagementPage';
import AttendanceReportsPage from '../components/LeaveAttendanceComps/AttendanceReportsPage';

// The daily attendance & leave workflow, in the order you actually work it:
// see where the day stands → correct it → handle leave → pull the report.
const TABS = [
    { key: 'overview', label: 'Overview', icon: GridViewRoundedIcon, render: () => <StaffAttendanceOverviewPage /> },
    { key: 'attendance', label: 'Attendance', icon: HowToRegRoundedIcon, render: () => <AddStaffAttendancePage /> },
    { key: 'leave', label: 'Leave Management', icon: BeachAccessRoundedIcon, render: () => <LeaveManagementPage /> },
    { key: 'reports', label: 'Reports', icon: AssessmentRoundedIcon, render: () => <AttendanceReportsPage /> },
];

export default function AttendanceLeavePage() {
    return <TabbedPage tabs={TABS} />;
}
