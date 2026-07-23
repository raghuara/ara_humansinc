// ── Role → screen access ────────────────────────────────────────────────────
// Two ways a login decides which screens it may open:
//
//   • The three BUILT-IN system roles (userTypeId 1 / 2 / 3) are decided HERE,
//     in hard code. Their access does NOT depend on the login's `modules` array
//     — we own these rules, so they live in one editable place.
//
//   • Any OTHER role (a custom role the organisation defines) is driven by the
//     `modules` array PostLogin returns: if a module key is present, that screen
//     shows and the role gets full access to it; if it's absent, it's hidden.
//
// resolveModules() below turns a (user, serverModules) pair into the single
// "effective module list" the rest of the app already gates on — so the sidebar,
// the route guard and the in-page tabs all obey the same decision automatically.

// Every module key the app knows about — the union of every screen's key, in
// sidebar order. Master Admin sees all of these; it's also the menu the two
// other built-in lists are carved out of. Keep it in sync when a screen is added.
export const ALL_MODULES = [
    // Main
    'dashboard', 'inbox', 'employees', 'employee-onboarding',
    'recruitment-interviews', 'recruitment-vacancies', 'recruitment-candidates',
    'document-requests', 'document-approvals', 'organisation-documents', 'employee-documents',
    // Payroll
    'run-payroll', 'payroll-register', 'payslips', 'advances', 'overtime',
    // Attendance & Leave
    'attendance-overview', 'attendance', 'attendance-reports', 'leave-management',
    // Setup
    'entities', 'departments', 'designations',
    'salary-structures', 'statutory-deductions', 'bank-details',
    'policy-setup', 'leave-types', 'working-calendar', 'assign-shifts',
    'roles-access', 'settings',
];

// The built-in role ids, matching authSlice USER_TYPE.
export const ROLE = { MASTER_ADMIN: 1, ADMIN: 2, EMPLOYEE: 3 };

// ── Hard-coded access for the three built-in roles ──────────────────────────
// This object is the ONE place that decides what each built-in role can open.
// The arrays are computed once at module load, so each role keeps a stable list
// reference (no re-render churn in useSelector). Edit these as the per-role
// rules are finalised — adding/removing a key here adds/removes the screen, its
// route guard and its tab in a single stroke.
export const DEFAULT_ROLE_MODULES = {
    // Master Admin — the entire product, across every entity.
    [ROLE.MASTER_ADMIN]: ALL_MODULES,

    // Admin — every screen, but only for their OWN entity (data is entity-scoped
    // per page via user.entityId). That includes Roles & Access: an Admin defines
    // the roles their own staff sign in with.
    //
    // Same screens as Master Admin, different reach. What stays exclusive to
    // userTypeId 1 isn't a module — it's cross-entity scope: the All Entities
    // dashboard and the sidebar's entity switcher, both gated on the user type
    // directly (see DashboardLayout / MasterAdminRoute).
    [ROLE.ADMIN]: ALL_MODULES,

    // Employee — self-service only: their dashboard, messages, payslips, own
    // documents, and their own leave & attendance. No org/setup/admin screens.
    // Employee — self-service only. Deliberately NO 'dashboard' module: without
    // it the home route renders the personal "My Info" page (not the company
    // dashboard with everyone's numbers) and the sidebar home row reads "My Info".
    // No 'attendance-overview' either — that's the all-staff attendance matrix.
    // What's left maps to the employee's own screens: inbox, their leave (apply +
    // my requests), their advance/OT requests, their payslip requests, and the
    // documents HR asked them to upload.
    [ROLE.EMPLOYEE]: [
        'inbox',
        'leave-management',
        'advances',
        'overtime',
        'payslips',
        // Organisation documents (company files shared with their role — read
        // only), NOT employee-documents (the upload-what-HR-asked-for screen).
        'organisation-documents',
    ],
};

// The effective module list for a login.
//   • Built-in role (1/2/3, or the isMasterAdmin flag) → its hard-coded set.
//   • Any other (custom) role                          → the server's list.
// Returns a STABLE array reference per role so useSelector doesn't re-render on
// every dispatch. A custom role with an empty/absent list falls through to the
// existing fail-open rule in serverModules (empty list = "nothing gated").
// ── Who may put a user INTO a role ──────────────────────────────────────────
// Reaching Roles & Access is one thing; handing out Master Admin is another.
// Only a Master Admin may create another one — otherwise an Admin could assign
// themselves (or anyone) the role that unlocks every entity, which is exactly
// the boundary their own entity scoping exists to enforce.
//
// An Admin can still assign every other role, Admin included: growing their own
// entity's admin team is normal, and it grants nothing they don't already have.
export const isMasterAdminRole = (roleId) => Number(roleId) === ROLE.MASTER_ADMIN;

export const canAssignRole = (currentUserTypeId, roleId) => (
    isMasterAdminRole(roleId) ? Number(currentUserTypeId) === ROLE.MASTER_ADMIN : true
);

export const resolveModules = (user, serverModules) => {
    if (user?.isMasterAdmin === true) return DEFAULT_ROLE_MODULES[ROLE.MASTER_ADMIN];
    const roleId = user?.userTypeId;
    if (roleId != null && DEFAULT_ROLE_MODULES[roleId]) return DEFAULT_ROLE_MODULES[roleId];
    return Array.isArray(serverModules) ? serverModules : [];
};
