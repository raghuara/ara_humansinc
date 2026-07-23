import React from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectEffectiveModules, selectUserTypeId, USER_TYPE } from './redux/slices/authSlice';
import { canAccessPath, firstAccessibleRoute, hasModule } from './data/serverModules';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import MasterDashboardPage from './pages/MasterDashboardPage';
import MyInfoPage from './pages/MyInfoPage';
import EmployeesPage from './pages/EmployeesPage';
import OnboardEmployeePage from './pages/OnboardEmployeePage';
import EmployeeDetailPage from './pages/EmployeeDetailPage';
import RolesPage from './pages/RolesPage';
import RoleUsersPage from './pages/RoleUsersPage';
import RoleAccessPage from './pages/RoleAccessPage';
import SettingsPage from './pages/SettingsPage';

// Inbox, documents & recruitment
import InboxPage from './pages/InboxPage';
import DocumentsPage from './pages/DocumentsPage';
import RecruitmentPage from './pages/RecruitmentPage';

// Payroll — the monthly run
import PayslipsPage from './pages/PayslipsPage';
import PayAdjustmentsPage from './pages/PayAdjustmentsPage';

// Tabbed hosts — each groups several existing pages under one sidebar entry.
import RunPayrollPage from './pages/RunPayrollPage';
import AttendanceLeavePage from './pages/AttendanceLeavePage';
import LeaveManagementPage from './components/LeaveAttendanceComps/LeaveManagementPage';
import AttendanceHistoryPage from './pages/AttendanceHistoryPage';
import OrganisationPage from './pages/OrganisationPage';
import BusinessEntitiesPage from './pages/BusinessEntitiesPage';
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

// Gates a route group on the `modules` list the login API returned. A page the
// login can't reach — whether from a stale nav link or a typed URL — redirects
// to the first module this login CAN open, so there's no dead page and no
// redirect loop. A login that can open nothing sees a plain no-access screen.
//
// The check is the same `modules` array the sidebar filters on, so the two can
// never disagree. An empty list (older backend, or dev) fails open.
function ModuleGuard() {
    const modules = useSelector(selectEffectiveModules);
    const { pathname } = useLocation();

    if (canAccessPath(modules, pathname)) return <Outlet />;

    const fallback = firstAccessibleRoute(modules);
    if (fallback && fallback !== pathname) return <Navigate to={fallback} replace />;
    // Login can open nothing — no route to fall back to, so no redirect (that
    // would loop). Just say so.
    return (
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
            <div style={{ maxWidth: 420 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0F172A' }}>No access</h2>
                <p style={{ marginTop: 8, fontSize: 14, color: '#64748B' }}>
                    Your account doesn&apos;t have access to any modules yet. Contact your administrator.
                </p>
            </div>
        </div>
    );
}

// /dashboard is the app's home, so it always resolves to something rather than
// redirecting: the company-wide dashboard when the login's modules include
// 'dashboard', and the personal My Info page when they don't. That's why this
// route sits outside ModuleGuard — the guard would bounce a self-service user
// off the home route entirely instead of showing them their own version of it.
function DashboardHome() {
    const modules = useSelector(selectEffectiveModules);
    return hasModule(modules, 'dashboard') ? <DashboardPage /> : <MyInfoPage />;
}

// The cross-entity screens belong to userTypeId 1 alone. The module list can't
// express this — it grants pages, not scope — so the check is on the user type
// itself, and strictly on that. Anyone else lands on their own dashboard.
function MasterAdminRoute() {
    const isMasterAdmin = useSelector(selectUserTypeId) === USER_TYPE.MASTER_ADMIN;
    return isMasterAdmin ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

// ── Legacy paths ────────────────────────────────────────────────────────────
// Every page that moved into a tab keeps its old URL alive as a redirect.
// Bookmarks, the dashboard's quick actions and the Inbox deep links all point
// at these, and they would fail silently otherwise. Safe to delete once nothing
// links to them — but they cost nothing to keep.
const MOVED = [
    ['salary-credited', '/dashboard/run-payroll'],
    ['payroll-register', '/dashboard/run-payroll?tab=register'],
    ['salary-register', '/dashboard/run-payroll?tab=register'],
    ['approve-payroll', '/dashboard/payslips'],
    ['advances', '/dashboard/pay-adjustments?tab=advances'],
    ['overtime', '/dashboard/pay-adjustments?tab=overtime'],
    ['salary-structures', '/dashboard/payroll-setup?tab=structures'],
    ['compliance', '/dashboard/payroll-setup?tab=statutory'],
    ['bank-details', '/dashboard/payroll-setup?tab=bank'],
    ['attendance-overview', '/dashboard/attendance-leave?tab=overview'],
    ['attendance', '/dashboard/attendance-leave?tab=attendance'],
    ['attendance-reports', '/dashboard/attendance-leave?tab=reports'],
    ['leave-policy/setup', '/dashboard/leave-policy?tab=setup'],
    ['leave-policy/types', '/dashboard/leave-policy?tab=types'],
    ['leave-policy/calendar', '/dashboard/leave-policy?tab=calendar'],
    ['leave-policy/shifts', '/dashboard/leave-policy?tab=shifts'],
    // Financial year moved into Settings; its old route still works.
    ['financial-year', '/dashboard/settings?tab=financial-year'],
    ['org/entities', '/dashboard/entities'],
    ['org/departments', '/dashboard/organisation?tab=departments'],
    ['org/designations', '/dashboard/organisation?tab=designations'],
];

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />

            <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardLayout />}>
                    {/* Home is never gated — it picks its own page (see DashboardHome) */}
                    <Route index element={<DashboardHome />} />

                    {/* Everything below is gated on the login's module list */}
                    <Route element={<ModuleGuard />}>
                    <Route element={<MasterAdminRoute />}>
                        <Route path="master" element={<MasterDashboardPage />} />
                    </Route>

                    {/* ── Main ─────────────────────────────────────────────── */}
                    <Route path="inbox" element={<InboxPage />} />
                    <Route path="employees" element={<EmployeesPage />} />
                    <Route path="employees/onboard" element={<OnboardEmployeePage />} />
                    <Route path="employees/:id" element={<EmployeeDetailPage />} />
                    <Route path="recruitment" element={<RecruitmentPage />} />
                    <Route path="documents" element={<DocumentsPage />} />

                    {/* ── Payroll (monthly) ────────────────────────────────── */}
                    {/* Run Payroll is a tabbed page (Overview/Register); Payslips is its own page */}
                    <Route path="run-payroll" element={<RunPayrollPage />} />
                    <Route path="payslips" element={<PayslipsPage />} />
                    <Route path="pay-adjustments" element={<PayAdjustmentsPage />} />

                    {/* ── Attendance ───────────────────────────────────────── */}
                    <Route path="attendance-leave" element={<AttendanceLeavePage />} />
                    <Route path="leave-management" element={<LeaveManagementPage />} />
                    <Route path="attendance-history" element={<AttendanceHistoryPage />} />

                    {/* ── Setup ────────────────────────────────────────────── */}
                    {/* Business Entities is its own page — reached from the sidebar's
                        "Working in" switcher → Manage entities, not from a tab. */}
                    <Route path="entities" element={<BusinessEntitiesPage />} />
                    <Route path="organisation" element={<OrganisationPage />} />
                    <Route path="payroll-setup" element={<PayrollSetupPage />} />
                    <Route path="leave-policy" element={<LeavePolicyPage />} />
                    <Route path="roles" element={<RolesPage />} />
                    <Route path="roles/:roleId/users" element={<RoleUsersPage />} />
                    <Route path="roles/:roleId/access" element={<RoleAccessPage />} />

                    <Route path="settings" element={<SettingsPage />} />

                    {/* Old URLs → their new home */}
                    {MOVED.map(([from, to]) => (
                        <Route key={from} path={from} element={<Navigate to={to} replace />} />
                    ))}
                    </Route>
                </Route>
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}
