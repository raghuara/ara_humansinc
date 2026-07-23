// ── Server module keys → sidebar routes ─────────────────────────────────────
// PostLogin returns a `modules` array of the keys this login may see. The keys
// are the canonical module keys (the same ones GetModules / GetRoleAccess use);
// they do NOT match our route paths, so the two are mapped deliberately here
// rather than compared.
//
// Several sidebar rows are tabbed hosts — one route backing several modules:
//
//   /dashboard/attendance-leave → attendance-overview | attendance | leave-management | attendance-reports
//   /dashboard/entities         → entities (its own page, not a tab)
//   /dashboard/organisation     → departments | designations
//   /dashboard/payroll-setup    → salary-structures | statutory-deductions | bank-details
//   /dashboard/leave-policy     → policy-setup | leave-types | working-calendar | assign-shifts
//   /dashboard/recruitment      → recruitment-interviews | recruitment-vacancies | recruitment-candidates
//   /dashboard/documents        → document-requests | document-approvals | organisation-documents | employee-documents
//   /dashboard/pay-adjustments  → advances | overtime
//
// A route mapped to an ARRAY opens if the login holds ANY of those keys — you
// only need one tab's key to reach the page. (The tabs themselves aren't gated
// individually yet; that can layer on later without touching this map.)
//
// Every sidebar route now has a real server key, so there are no `null`
// (ungated) entries left. A route that were ever missing from this map is
// treated as ungated by canAccessRoute below, not as denied.
export const ROUTE_MODULES = {
    // Main
    '/dashboard': 'dashboard',
    '/dashboard/inbox': 'inbox',
    '/dashboard/employees': 'employees',
    '/dashboard/recruitment': ['recruitment-interviews', 'recruitment-vacancies', 'recruitment-candidates'],
    '/dashboard/documents': ['document-requests', 'document-approvals', 'organisation-documents', 'employee-documents'],

    // Payroll — Run Payroll is a tabbed page (Overview/Register); holding
    // either key opens it, then TabbedPage gates the tabs. Payslips is separate.
    '/dashboard/run-payroll': ['run-payroll', 'payroll-register'],
    '/dashboard/payslips': 'payslips',
    '/dashboard/pay-adjustments': ['advances', 'overtime'],

    // Attendance
    '/dashboard/attendance-leave': ['attendance-overview', 'attendance', 'attendance-reports'],
    '/dashboard/leave-management': 'leave-management',

    // Setup
    '/dashboard/entities': 'entities',
    '/dashboard/organisation': ['departments', 'designations'],
    '/dashboard/payroll-setup': ['salary-structures', 'statutory-deductions', 'bank-details'],
    '/dashboard/leave-policy': ['policy-setup', 'leave-types', 'working-calendar', 'assign-shifts'],
    '/dashboard/roles': 'roles-access',
};

// Can a login holding `modules` open this route?
//
// An empty/absent module list means the server gated nothing, so everything is
// allowed. This keeps the app usable against an older backend, and keeps the
// demo/dev path working when no real login has happened.
export const canAccessRoute = (modules, route) => {
    if (!Array.isArray(modules) || modules.length === 0) return true;

    // A route we've never mapped is treated as ungated, not as denied.
    if (!(route in ROUTE_MODULES)) return true;

    const required = ROUTE_MODULES[route];
    if (required === null) return true;
    if (Array.isArray(required)) return required.some((k) => modules.includes(k));
    return modules.includes(required);
};

// Does the login hold a specific module key? Used by route guards and by any
// screen that gates a sub-action (e.g. the Onboard button on Employees).
// Empty list → ungated, same fail-open rule as canAccessRoute.
export const hasModule = (modules, key) =>
    !Array.isArray(modules) || modules.length === 0 || modules.includes(key);

// Map a concrete pathname to the mapped route that governs it, so detail and
// child pages inherit their parent's access:
//   /dashboard/employees/onboard   → /dashboard/employees
//   /dashboard/roles/42/access     → /dashboard/roles
// The bare '/dashboard' root is exact-match only — otherwise it would swallow
// every child path as its prefix. A pathname with no mapped ancestor returns
// null and is treated as ungated.
export const routeAccessKey = (pathname) => {
    if (pathname in ROUTE_MODULES) return pathname;
    let best = null;
    Object.keys(ROUTE_MODULES).forEach((key) => {
        if (key === '/dashboard') return;
        if (pathname.startsWith(`${key}/`) && (!best || key.length > best.length)) best = key;
    });
    return best;
};

// Guard entry point: can this login open this pathname?
export const canAccessPath = (modules, pathname) => {
    if (!Array.isArray(modules) || modules.length === 0) return true;
    const key = routeAccessKey(pathname);
    if (!key) return true; // unmapped → ungated
    return canAccessRoute(modules, key);
};

// Where to send a login that's blocked from the page it asked for: the first
// sidebar route (in nav order) it CAN open. Returns null when it can open none
// of the mapped routes, so the caller can show a "no access" screen instead of
// looping redirects.
export const firstAccessibleRoute = (modules) => {
    const match = Object.keys(ROUTE_MODULES).find((route) => canAccessRoute(modules, route));
    return match || null;
};
