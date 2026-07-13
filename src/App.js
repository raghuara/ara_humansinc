import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import PlaceholderPage from './pages/PlaceholderPage';
import EmployeesPage from './pages/EmployeesPage';
import OnboardEmployeePage from './pages/OnboardEmployeePage';
import EmployeeDetailPage from './pages/EmployeeDetailPage';
import RolesPage from './pages/RolesPage';
import RoleUsersPage from './pages/RoleUsersPage';
import RoleAccessPage from './pages/RoleAccessPage';

// Inbox & documents
import InboxPage from './pages/InboxPage';
import DocumentsPage from './pages/DocumentsPage';

// Payroll — the monthly run
import MarkSalaryCreditedPage from './components/LeaveAttendanceComps/PayrollComps/MarkSalaryCreditedPage';
import SalaryRegister from './components/LeaveAttendanceComps/PayrollComps/SalaryRegister';
import ApprovePayroll from './components/LeaveAttendanceComps/PayrollComps/ApprovePayroll';
import PayAdjustmentsPage from './pages/PayAdjustmentsPage';

// Tabbed hosts — each groups several existing pages under one sidebar entry.
import AttendanceLeavePage from './pages/AttendanceLeavePage';
import OrganisationPage from './pages/OrganisationPage';
import PayrollSetupPage from './pages/PayrollSetupPage';
import LeavePolicyPage from './pages/LeavePolicyPage';

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

// ── Legacy paths ────────────────────────────────────────────────────────────
// Every page that moved into a tab keeps its old URL alive as a redirect.
// Bookmarks, the dashboard's quick actions and the Inbox deep links all point
// at these, and they would fail silently otherwise. Safe to delete once nothing
// links to them — but they cost nothing to keep.
const MOVED = [
    ['salary-credited', '/dashboard/run-payroll'],
    ['salary-register', '/dashboard/payroll-register'],
    ['approve-payroll', '/dashboard/payslips'],
    ['advances', '/dashboard/pay-adjustments?tab=advances'],
    ['overtime', '/dashboard/pay-adjustments?tab=overtime'],
    ['salary-structures', '/dashboard/payroll-setup?tab=structures'],
    ['compliance', '/dashboard/payroll-setup?tab=statutory'],
    ['bank-details', '/dashboard/payroll-setup?tab=bank'],
    ['attendance-overview', '/dashboard/attendance-leave?tab=overview'],
    ['attendance', '/dashboard/attendance-leave?tab=attendance'],
    ['leave-management', '/dashboard/attendance-leave?tab=leave'],
    ['attendance-reports', '/dashboard/attendance-leave?tab=reports'],
    ['leave-policy/setup', '/dashboard/leave-policy?tab=setup'],
    ['leave-policy/types', '/dashboard/leave-policy?tab=types'],
    ['leave-policy/calendar', '/dashboard/leave-policy?tab=calendar'],
    ['leave-policy/shifts', '/dashboard/leave-policy?tab=shifts'],
    ['org/entities', '/dashboard/organisation?tab=entities'],
    ['org/departments', '/dashboard/organisation?tab=departments'],
    ['org/designations', '/dashboard/organisation?tab=designations'],
];

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />

            <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardLayout />}>
                    <Route index element={<DashboardPage />} />

                    {/* ── Main ─────────────────────────────────────────────── */}
                    <Route path="inbox" element={<InboxPage />} />
                    <Route path="employees" element={<EmployeesPage />} />
                    <Route path="employees/onboard" element={<OnboardEmployeePage />} />
                    <Route path="employees/:id" element={<EmployeeDetailPage />} />
                    <Route path="documents" element={<DocumentsPage />} />

                    {/* ── Payroll (monthly) ────────────────────────────────── */}
                    <Route path="run-payroll" element={<MarkSalaryCreditedPage />} />
                    <Route path="payroll-register" element={<SalaryRegister />} />
                    <Route path="payslips" element={<ApprovePayroll />} />
                    <Route path="pay-adjustments" element={<PayAdjustmentsPage />} />

                    {/* ── Attendance ───────────────────────────────────────── */}
                    <Route path="attendance-leave" element={<AttendanceLeavePage />} />

                    {/* ── Setup ────────────────────────────────────────────── */}
                    <Route path="organisation" element={<OrganisationPage />} />
                    <Route path="payroll-setup" element={<PayrollSetupPage />} />
                    <Route path="leave-policy" element={<LeavePolicyPage />} />
                    <Route path="roles" element={<RolesPage />} />
                    <Route path="roles/:roleId/users" element={<RoleUsersPage />} />
                    <Route path="roles/:roleId/access" element={<RoleAccessPage />} />

                    <Route path="settings" element={<PlaceholderPage title="Settings" />} />

                    {/* Old URLs → their new home */}
                    {MOVED.map(([from, to]) => (
                        <Route key={from} path={from} element={<Navigate to={to} replace />} />
                    ))}
                </Route>
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}
