// ── Server module keys → screens ────────────────────────────────────────────
// PostLogin returns a `modules` array telling us which screens this login may
// see. Its keys do NOT match our route paths, and they pre-date several of our
// modules, so the two have to be mapped deliberately rather than compared:
//
//   server "roles-access"                       → /dashboard/roles
//   server "overview" | "attendance" | …        → /dashboard/attendance-leave  (one tabbed page)
//   server "run-approve"                        → /dashboard/payslips
//   server "salary-credited"                    → /dashboard/run-payroll
//
// A route mapped to an array is granted if the login holds ANY of those keys —
// those pages are tabbed hosts, so holding one tab's key is enough to open the
// page (the tabs themselves can be filtered later if the API starts gating
// them individually).
//
// A route mapped to `null` has NO server key yet: the API simply doesn't know
// about it. Those stay visible. The alternative — hiding anything unmapped —
// would silently delete half the app the moment a real login came back, which
// is a far worse failure than showing a page the API would refuse anyway.
export const ROUTE_MODULES = {
    '/dashboard': 'dashboard',
    '/dashboard/employees': 'employees',
    '/dashboard/roles': 'roles-access',

    '/dashboard/attendance-leave': ['overview', 'attendance', 'leave-management', 'reports'],
    '/dashboard/leave-policy': ['policy-setup', 'leave-types', 'working-calendar', 'assign-shifts'],
    '/dashboard/payroll-setup': ['salary-structures', 'compliance', 'bank-details'],

    '/dashboard/payroll-register': 'salary-register',
    '/dashboard/payslips': 'run-approve',
    '/dashboard/run-payroll': 'salary-credited',

    // Not yet issued by the API — ungated until it starts sending them.
    '/dashboard/inbox': null,
    '/dashboard/documents': null,
    '/dashboard/recruitment': null,
    '/dashboard/organisation': null,
    '/dashboard/pay-adjustments': null,
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
