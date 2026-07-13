// Canonical list of access-controllable modules — mirrors the sidebar navigation.
// Only the string `key`s are stored in Redux (per-role access maps); icons/labels
// live here so the UI can render them without putting components in the store.
import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
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

// Grouped to mirror the sidebar, so granting access reads the same way you
// navigate. The `key`s are deliberately unchanged from before the nav was
// reorganised — they're what every role's saved access map is keyed by, and
// renaming one would silently revoke that permission for existing roles.
export const MODULE_GROUPS = [
    {
        group: 'Main',
        color: '#7C5CFC',
        items: [
            { key: 'dashboard', label: 'Dashboard', icon: SpaceDashboardRoundedIcon },
            { key: 'inbox', label: 'Inbox', icon: MarkEmailUnreadRoundedIcon },
            { key: 'employees', label: 'Employees', icon: GroupsRoundedIcon },
            { key: 'documents', label: 'Documents', icon: FolderSharedRoundedIcon },
        ],
    },
    {
        group: 'Payroll',
        color: '#0EA5E9',
        items: [
            { key: 'salary-credited', label: 'Run Payroll', icon: PaidRoundedIcon },
            { key: 'salary-register', label: 'Payroll Register', icon: ReceiptLongRoundedIcon },
            { key: 'approve-payroll', label: 'Payslips', icon: FactCheckRoundedIcon },
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
        group: 'Setup — Organisation',
        color: '#0891B2',
        items: [
            { key: 'entities', label: 'Business Entities', icon: ApartmentRoundedIcon },
            { key: 'departments', label: 'Departments', icon: AccountTreeRoundedIcon },
            { key: 'designations', label: 'Designations', icon: WorkspacePremiumRoundedIcon },
            { key: 'roles', label: 'Roles & Access', icon: AdminPanelSettingsRoundedIcon },
        ],
    },
    {
        group: 'Setup — Payroll',
        color: '#6246E0',
        items: [
            { key: 'salary-structures', label: 'Salary Structures', icon: RequestQuoteRoundedIcon },
            { key: 'compliance', label: 'Statutory Deductions', icon: VerifiedUserRoundedIcon },
            { key: 'bank-details', label: 'Bank Details', icon: AccountBalanceWalletRoundedIcon },
        ],
    },
    {
        group: 'Setup — Leave Policy',
        color: '#F59E0B',
        items: [
            { key: 'policy-setup', label: 'Policy Setup', icon: RuleRoundedIcon },
            { key: 'leave-types', label: 'Leave Types', icon: CategoryRoundedIcon },
            { key: 'working-calendar', label: 'Working Calendar', icon: CalendarMonthRoundedIcon },
            { key: 'assign-shifts', label: 'Assign Shifts', icon: ScheduleRoundedIcon },
        ],
    },
];

export const ALL_MODULES = MODULE_GROUPS.flatMap((g) => g.items);
export const ALL_MODULE_KEYS = ALL_MODULES.map((i) => i.key);
export const TOTAL_MODULES = ALL_MODULE_KEYS.length;

export const accessFromKeys = (keys) =>
    ALL_MODULE_KEYS.reduce((acc, k) => ({ ...acc, [k]: keys.includes(k) }), {});
export const accessAll = () =>
    ALL_MODULE_KEYS.reduce((acc, k) => ({ ...acc, [k]: true }), {});
export const countEnabled = (access = {}) =>
    ALL_MODULE_KEYS.filter((k) => access[k]).length;
