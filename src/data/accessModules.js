// Canonical list of access-controllable modules — mirrors the app's routes.
//
// The BACKEND owns which modules exist: GetModules returns the catalogue, and
// UpdateRoleAccess keys off `moduleId`. This file owns only how they *look* —
// the icon per `moduleKey` and the colour per category — plus a static mirror of
// the same list (MODULE_GROUPS) used for seeding and persistence backfill.
//
// Keep MODULE_GROUPS in step with the API catalogue. If they drift, the access
// screen (API-driven) and the role cards (static) will disagree on the total.
import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import MoreTimeRoundedIcon from '@mui/icons-material/MoreTimeRounded';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import BeachAccessRoundedIcon from '@mui/icons-material/BeachAccessRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import FolderSharedRoundedIcon from '@mui/icons-material/FolderSharedRounded';
import MarkEmailUnreadRoundedIcon from '@mui/icons-material/MarkEmailUnreadRounded';
import WorkOutlineRoundedIcon from '@mui/icons-material/WorkOutlineRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import PersonSearchRoundedIcon from '@mui/icons-material/PersonSearchRounded';
import NoteAddRoundedIcon from '@mui/icons-material/NoteAddRounded';
import ApprovalRoundedIcon from '@mui/icons-material/ApprovalRounded';
import ContactPageRoundedIcon from '@mui/icons-material/ContactPageRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';

export const MODULE_GROUPS = [
    {
        group: 'Main',
        color: '#7C5CFC',
        items: [
            { key: 'dashboard', label: 'Dashboard', icon: SpaceDashboardRoundedIcon },
            { key: 'inbox', label: 'Inbox', icon: MarkEmailUnreadRoundedIcon },
            { key: 'employees', label: 'Employees', icon: GroupsRoundedIcon },
            { key: 'employee-onboarding', label: 'Onboard Employee', icon: PersonAddAlt1RoundedIcon },
        ],
    },
    {
        group: 'Recruitment',
        color: '#E11D48',
        items: [
            { key: 'recruitment-interviews', label: 'Interviews', icon: EventAvailableRoundedIcon },
            { key: 'recruitment-vacancies', label: 'Vacancies', icon: WorkOutlineRoundedIcon },
            { key: 'recruitment-candidates', label: 'Candidates', icon: PersonSearchRoundedIcon },
        ],
    },
    {
        group: 'Documents',
        color: '#DB2777',
        items: [
            { key: 'document-requests', label: 'Requests', icon: NoteAddRoundedIcon },
            { key: 'document-approvals', label: 'Approvals', icon: ApprovalRoundedIcon },
            { key: 'organisation-documents', label: 'Organisation Documents', icon: FolderSharedRoundedIcon },
            { key: 'employee-documents', label: 'Employee Documents', icon: ContactPageRoundedIcon },
        ],
    },
    {
        group: 'Payroll',
        color: '#0EA5E9',
        items: [
            { key: 'run-payroll', label: 'Run Payroll', icon: PaidRoundedIcon },
            { key: 'payroll-register', label: 'Payroll Register', icon: ReceiptLongRoundedIcon },
            { key: 'payslips', label: 'Payslips', icon: FactCheckRoundedIcon },
            { key: 'advances', label: 'Salary Advances', icon: SavingsRoundedIcon },
            { key: 'overtime', label: 'Overtime (OT)', icon: MoreTimeRoundedIcon },
        ],
    },
    {
        group: 'Attendance',
        color: '#16A34A',
        items: [
            { key: 'attendance-overview', label: 'Overview', icon: GridViewRoundedIcon },
            { key: 'attendance', label: 'Attendance', icon: HowToRegRoundedIcon },
            { key: 'leave-management', label: 'Leave Management', icon: BeachAccessRoundedIcon },
            { key: 'attendance-reports', label: 'Reports', icon: AssessmentRoundedIcon },
        ],
    },
    {
        group: 'Organisation',
        color: '#0891B2',
        items: [
            { key: 'entities', label: 'Business Entities', icon: ApartmentRoundedIcon },
            { key: 'departments', label: 'Departments', icon: AccountTreeRoundedIcon },
            { key: 'designations', label: 'Designations', icon: WorkspacePremiumRoundedIcon },
            { key: 'roles-access', label: 'Roles & Access', icon: AdminPanelSettingsRoundedIcon },
        ],
    },
    {
        group: 'Payroll Setup',
        color: '#6246E0',
        items: [
            { key: 'salary-structures', label: 'Salary Structures', icon: RequestQuoteRoundedIcon },
            { key: 'statutory-deductions', label: 'Statutory Deductions', icon: VerifiedUserRoundedIcon },
            { key: 'bank-details', label: 'Bank Details', icon: AccountBalanceWalletRoundedIcon },
        ],
    },
    {
        group: 'Leave Policy',
        color: '#F59E0B',
        items: [
            { key: 'policy-setup', label: 'Policy Setup', icon: RuleRoundedIcon },
            { key: 'leave-types', label: 'Leave Types', icon: CategoryRoundedIcon },
            { key: 'working-calendar', label: 'Working Calendar', icon: CalendarMonthRoundedIcon },
            { key: 'assign-shifts', label: 'Assign Shifts', icon: ScheduleRoundedIcon },
        ],
    },
    {
        group: 'System',
        color: '#64748B',
        items: [
            { key: 'settings', label: 'Settings', icon: SettingsRoundedIcon },
        ],
    },
];

export const ALL_MODULES = MODULE_GROUPS.flatMap((g) => g.items);
export const ALL_MODULE_KEYS = ALL_MODULES.map((i) => i.key);
export const TOTAL_MODULES = ALL_MODULE_KEYS.length;

// ── API-driven module list (GetModules) ─────────────────────────────────────
// Icons and group colours are looked up by `moduleKey` / `category`, so a module
// the API adds later still renders (with a neutral fallback icon) instead of
// crashing the page.
const FALLBACK_ICON = GridViewRoundedIcon;

export const MODULE_ICONS = ALL_MODULES.reduce(
    (acc, m) => ({ ...acc, [m.key]: m.icon }),
    {
        // Keys the API shipped with before the catalogue was aligned to the app's
        // routes. Kept so the screen still renders properly against an un-migrated
        // backend; delete this block once GetModules returns the canonical keys.
        'salary-credited': PaidRoundedIcon,
        'salary-register': ReceiptLongRoundedIcon,
        'run-approve': FactCheckRoundedIcon,
        'approve-payroll': FactCheckRoundedIcon,
        compliance: VerifiedUserRoundedIcon,
        overview: GridViewRoundedIcon,
        reports: AssessmentRoundedIcon,
        roles: AdminPanelSettingsRoundedIcon,
        recruitment: WorkOutlineRoundedIcon,
        documents: FolderSharedRoundedIcon,
    },
);

export const iconForModule = (moduleKey) => MODULE_ICONS[moduleKey] || FALLBACK_ICON;

const CATEGORY_COLOURS = MODULE_GROUPS.reduce(
    (acc, g) => ({ ...acc, [g.group]: g.color }),
    // Legacy category names — see the note on MODULE_ICONS above.
    { General: '#7C5CFC', 'Leave & Attendance': '#16A34A' },
);
const DEFAULT_COLOUR = '#64748B';

// Turn the `categories` array from GetRoleAccess into the shape the access grid
// renders. That response already arrives grouped and ordered, so the only work
// here is attaching an icon and the group's colour — order is taken as sent.
export const groupsFromRoleAccess = (categories = []) =>
    categories.map((c) => ({
        group: c.category,
        color: CATEGORY_COLOURS[c.category] || DEFAULT_COLOUR,
        items: (c.modules || []).map((m) => ({
            key: m.moduleKey,
            moduleId: m.moduleId,
            label: m.name,
            icon: iconForModule(m.moduleKey),
        })),
    }));

// Turn the flat `modules` array from GetModules into the grouped shape the
// access grid renders. Categories keep first-seen order (the API already sends
// them grouped); items inside a category are ordered by `displayOrder`.
export const groupModulesByCategory = (modules = []) => {
    const groups = [];
    const byCategory = new Map();

    modules.forEach((m) => {
        const category = m.category || 'Other';
        if (!byCategory.has(category)) {
            const group = {
                group: category,
                color: CATEGORY_COLOURS[category] || DEFAULT_COLOUR,
                items: [],
            };
            byCategory.set(category, group);
            groups.push(group);
        }
        byCategory.get(category).items.push({
            key: m.moduleKey,
            moduleId: m.moduleId,
            label: m.name,
            icon: iconForModule(m.moduleKey),
            displayOrder: m.displayOrder ?? 0,
        });
    });

    groups.forEach((g) => g.items.sort((a, b) => a.displayOrder - b.displayOrder));
    return groups;
};

export const accessFromKeys = (keys) =>
    ALL_MODULE_KEYS.reduce((acc, k) => ({ ...acc, [k]: keys.includes(k) }), {});
export const accessAll = () =>
    ALL_MODULE_KEYS.reduce((acc, k) => ({ ...acc, [k]: true }), {});
export const countEnabled = (access = {}) =>
    ALL_MODULE_KEYS.filter((k) => access[k]).length;
