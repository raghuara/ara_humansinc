import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import PlaceholderPage from './pages/PlaceholderPage';

// Payroll screens
import SalaryStructures from './components/LeaveAttendanceComps/PayrollComps/SalaryStructures';
import ComplianceSettings from './components/LeaveAttendanceComps/PayrollComps/ComplianceSettings';
import BankReports from './components/LeaveAttendanceComps/PayrollComps/BankReports';
import SalaryRegister from './components/LeaveAttendanceComps/PayrollComps/SalaryRegister';
import ApprovePayroll from './components/LeaveAttendanceComps/PayrollComps/ApprovePayroll';
import MarkSalaryCreditedPage from './components/LeaveAttendanceComps/PayrollComps/MarkSalaryCreditedPage';

// Leave & attendance screens
import StaffAttendanceOverviewPage from './components/LeaveAttendanceComps/StaffAttendanceOverviewPage';
import AddStaffAttendancePage from './components/LeaveAttendanceComps/AddStaffAttendancePage';
import LeaveManagementPage from './components/LeaveAttendanceComps/LeaveManagementPage';
import AttendanceReportsPage from './components/LeaveAttendanceComps/AttendanceReportsPage';

// Leave policy master (tabbed)
import LeaveMasterScreen from './components/LeaveAttendanceComps/PayrollComps/LeaveMasterScreen';

// Guards a route group: sends unauthenticated users to /login.
function ProtectedRoute() {
    const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

// Keeps signed-in users out of /login.
function PublicOnlyRoute({ children }) {
    const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
    return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />

            <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardLayout />}>
                    <Route index element={<DashboardPage />} />

                    {/* Payroll */}
                    <Route path="salary-structures" element={<SalaryStructures />} />
                    <Route path="compliance" element={<ComplianceSettings />} />
                    <Route path="bank-details" element={<BankReports />} />
                    <Route path="salary-register" element={<SalaryRegister />} />
                    <Route path="approve-payroll" element={<ApprovePayroll />} />
                    <Route path="salary-credited" element={<MarkSalaryCreditedPage />} />

                    {/* Leave & Attendance */}
                    <Route path="attendance-overview" element={<StaffAttendanceOverviewPage />} />
                    <Route path="attendance" element={<AddStaffAttendancePage />} />
                    <Route path="leave-management" element={<LeaveManagementPage />} />
                    <Route path="attendance-reports" element={<AttendanceReportsPage />} />

                    {/* Leave Policy — each tab as its own page (no tab bar) */}
                    <Route path="leave-policy/setup" element={<LeaveMasterScreen initialTab={0} hideTabBar />} />
                    <Route path="leave-policy/types" element={<LeaveMasterScreen initialTab={1} hideTabBar />} />
                    <Route path="leave-policy/calendar" element={<LeaveMasterScreen initialTab={2} hideTabBar />} />
                    <Route path="leave-policy/shifts" element={<LeaveMasterScreen initialTab={3} hideTabBar />} />

                    <Route path="settings" element={<PlaceholderPage title="Settings" />} />
                </Route>
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}
