import React from 'react';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import FingerprintRoundedIcon from '@mui/icons-material/FingerprintRounded';
import TabbedPage from '../components/TabbedPage';
import StaffAttendanceOverviewPage from '../components/LeaveAttendanceComps/StaffAttendanceOverviewPage';
import AddStaffAttendancePage from '../components/LeaveAttendanceComps/AddStaffAttendancePage';
import AttendanceReportsPage from '../components/LeaveAttendanceComps/AttendanceReportsPage';
import BiometricStaffMappingPage from '../components/LeaveAttendanceComps/BiometricStaffMappingPage';

// The daily attendance workflow: see where the day stands → correct it → pull
// the report, with device setup (biometric mapping) at the end as a config step.
// Leave Management is its own sidebar page now, so it's no longer a tab here.
// `module` gates each tab on the login's access — hidden if not held, and
// unreachable by ?tab= URL too. Biometric mapping rides along with attendance.
const TABS = [
    { key: 'overview', label: 'Overview', icon: GridViewRoundedIcon, module: 'attendance-overview', render: () => <StaffAttendanceOverviewPage /> },
    { key: 'attendance', label: 'Attendance', icon: HowToRegRoundedIcon, module: 'attendance', render: () => <AddStaffAttendancePage /> },
    { key: 'reports', label: 'Reports', icon: AssessmentRoundedIcon, module: 'attendance-reports', render: () => <AttendanceReportsPage /> },
    { key: 'biometric-mapping', label: 'Biometric Mapping', icon: FingerprintRoundedIcon, module: 'attendance', render: () => <BiometricStaffMappingPage isEmbedded /> },
];

export default function AttendanceLeavePage() {
    return <TabbedPage tabs={TABS} />;
}
