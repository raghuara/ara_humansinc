import React from 'react';
import {
    Box, Typography, Stack, IconButton, Avatar, Tooltip, Menu, MenuItem,
    Divider, Drawer, useMediaQuery, Collapse, Breadcrumbs, Badge,
    Dialog, DialogContent, DialogActions, Button,
} from '@mui/material';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';
import { useTheme } from '@mui/material/styles';
import MenuOpenRoundedIcon from '@mui/icons-material/MenuOpenRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import BeachAccessRoundedIcon from '@mui/icons-material/BeachAccessRounded';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import PowerSettingsNewRoundedIcon from '@mui/icons-material/PowerSettingsNewRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import FolderSharedRoundedIcon from '@mui/icons-material/FolderSharedRounded';
import WorkOutlineRoundedIcon from '@mui/icons-material/WorkOutlineRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import DashboardCustomizeRoundedIcon from '@mui/icons-material/DashboardCustomizeRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toggleSidebar } from '../redux/slices/sidebarSlice';
import { logout } from '../redux/slices/authSlice';
import { selectEffectiveModules, selectUserTypeId, selectUserEntityId, USER_TYPE } from '../redux/slices/authSlice';
import { canAccessRoute, hasModule } from '../data/serverModules';
import { selectUnreadCount, setUnreadCount } from '../redux/slices/inboxSlice';
import { selectEntities, selectActiveEntity, selectActiveEntityId, setActiveEntity, setEntities } from '../redux/slices/orgSlice';
import {
    setFinancialYearConfig, setSelectedFinancialYear, selectFinancialYearConfig,
    selectSelectedFinancialYear, selectFinancialYearOptions,
} from '../redux/slices/financialYearSlice';
import { setEmployees, mapApiEmployee } from '../redux/slices/employeesSlice';
import http from '../Api/http';
import { GetFinancialYearConfig, GetEmployees, GetInbox, GetBusinessEntitiesDashboard } from '../Api/Api';
import { PRIMARY, PRIMARY_LIGHT, GRADIENT } from '../theme';
import brandLogo from '../images/Logo---Colour.png';
import EntitySetupGate from '../components/EntitySetupGate';

const EXPANDED = 252;
const COLLAPSED = 78;

// GetBusinessEntitiesDashboard → the shape the sidebar switcher reads
// (id / name / code / colour / city). Keeps the "Working in" list in step with
// the Business Entities page instead of the seed data.
const normalizeEntity = (e) => ({
    id: e.id,
    name: e.companyName ?? '',
    code: e.shortCode ?? '',
    legalName: e.registeredLegalName ?? '',
    color: e.entityColour || '#7C5CFC',
    city: e.city ?? '',
    status: e.status ?? (e.isActive === false ? 'Inactive' : 'Active'),
});

// ── Navigation model ────────────────────────────────────────────────────────
// Grouped by how often you use it, not by subject. The six MAIN + PAYROLL +
// ATTENDANCE rows are the monthly workflow; SETUP holds the master data you
// configure once and rarely revisit, so it stays collapsed by default.
//
// Rows that host several pages carry `tabs` — those pages are reached through
// the in-page tab bar, and the labels here also drive the breadcrumb.
const NAV = [
    {
        type: 'section', label: 'Main', defaultOpen: true, items: [
            { label: 'Dashboard', icon: SpaceDashboardRoundedIcon, to: '/dashboard' },
            { label: 'Inbox', icon: MailOutlineRoundedIcon, to: '/dashboard/inbox', badge: 'inbox' },
            { label: 'Employees', icon: GroupsRoundedIcon, to: '/dashboard/employees' },
            {
                label: 'Recruitment', icon: WorkOutlineRoundedIcon, to: '/dashboard/recruitment',
                tabs: { interviews: 'Interviews', vacancies: 'Vacancies', candidates: 'Candidates' },
            },
            {
                label: 'Documents', icon: FolderSharedRoundedIcon, to: '/dashboard/documents',
                tabs: { requests: 'Requests', approvals: 'Approvals', organisation: 'Organisation Documents', employee: 'Employee Documents' },
            },
        ],
    },
    {
        type: 'section', label: 'Payroll', defaultOpen: true, items: [
            {
                label: 'Run Payroll', icon: PaidRoundedIcon, to: '/dashboard/run-payroll',
                tabs: { register: 'Register', approve: 'Approve & Credit' },
            },
            { label: 'Payslips', icon: FactCheckRoundedIcon, to: '/dashboard/payslips' },
            {
                label: 'Advances & Overtime', icon: SavingsRoundedIcon, to: '/dashboard/pay-adjustments',
                tabs: { advances: 'Salary Advances', overtime: 'Overtime (OT)' },
            },
        ],
    },
    {
        // One tabbed page, but surfaced as two rows so the section isn't a lone
        // item. Each row deep-links to its tab and is gated on its own module,
        // so a login with only attendance (not leave) sees only the first row.
        type: 'section', label: 'Attendance & Leave', defaultOpen: true, items: [
            // Attendance is a tabbed page (Overview/Attendance/Reports/Biometric);
            // `tabKey` deep-links it, `ownTabs` is which tabs light the row up,
            // `module` is any-of. Leave is its own standalone page.
            {
                key: 'attendance', label: 'Attendance', icon: HowToRegRoundedIcon, to: '/dashboard/attendance-leave',
                tabKey: 'attendance', ownTabs: ['overview', 'attendance', 'reports', 'biometric-mapping'],
                module: ['attendance-overview', 'attendance', 'attendance-reports'],
            },
            { key: 'leave', label: 'Leave', icon: BeachAccessRoundedIcon, to: '/dashboard/leave-management', module: 'leave-management' },
        ],
    },
    {
        type: 'section', label: 'Setup', defaultOpen: true, items: [
            {
                label: 'Organisation', icon: ApartmentRoundedIcon, to: '/dashboard/organisation',
                tabs: { departments: 'Departments', designations: 'Designations' },
            },
            {
                label: 'Payroll Setup', icon: RequestQuoteRoundedIcon, to: '/dashboard/payroll-setup',
                tabs: { structures: 'Salary Structures', statutory: 'Statutory Deductions', bank: 'Bank Details' },
            },
            {
                label: 'Leave Policy', icon: RuleRoundedIcon, to: '/dashboard/leave-policy',
                tabs: { setup: 'Policy Setup', types: 'Leave Types', calendar: 'Working Calendar', shifts: 'Assign Shifts' },
            },
            { label: 'Roles & Access', icon: AdminPanelSettingsRoundedIcon, to: '/dashboard/roles' },
        ],
    },
];

// Brand logo (PNG already contains the "ARA HumanSync" wordmark).
// expanded → full horizontal logo; collapsed → just the left icon slice.
const FLAT_NAV = NAV.flatMap((n) => (n.type === 'section' ? n.items : [n]));

// Breadcrumb trail. A tabbed page resolves to two crumbs — "Organisation ›
// Departments" — so you can still see which screen you're actually on now that
// tabs have replaced a nav row each.
// Attendance & Leave is one tabbed page split across two sidebar rows, so its
// crumb is resolved here rather than from a single nav entry.
const ATTENDANCE_LEAVE_TABS = { overview: 'Overview', attendance: 'Attendance', reports: 'Reports', 'biometric-mapping': 'Biometric Mapping' };

const crumbsFor = (pathname, search) => {
    if (pathname === '/dashboard/attendance-leave') {
        const tab = new URLSearchParams(search).get('tab');
        return ['Attendance & Leave', ATTENDANCE_LEAVE_TABS[tab] || ATTENDANCE_LEAVE_TABS.overview];
    }
    const hit = FLAT_NAV.find((i) => i.to === pathname);
    if (hit) {
        const tab = new URLSearchParams(search).get('tab');
        // No ?tab yet means the page is showing its first tab.
        const tabLabel = hit.tabs ? (hit.tabs[tab] || Object.values(hit.tabs)[0]) : null;
        return tabLabel ? [hit.label, tabLabel] : [hit.label];
    }
    const seg = pathname.split('/').filter(Boolean).pop() || 'Dashboard';
    return [seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())];
};

function Logo({ expanded }) {
    return expanded ? (
        <Box component="img" src={brandLogo} alt="ARA HumanSync" sx={{ height: 46, width: 'auto', maxWidth: '100%', display: 'block' }} />
    ) : (
        <Box sx={{ width: 46, height: 46, flexShrink: 0, backgroundImage: `url(${brandLogo})`, backgroundSize: 'auto 46px', backgroundPosition: 'left center', backgroundRepeat: 'no-repeat' }} />
    );
}

const rowSx = (active, expanded) => ({
    alignItems: 'center',
    px: 1.6,
    py: 1.05,
    borderRadius: '7px',
    justifyContent: expanded ? 'flex-start' : 'center',
    color: active ? PRIMARY : '#5B6472',
    bgcolor: active ? PRIMARY_LIGHT : 'transparent',
    position: 'relative',
    cursor: 'pointer',
    transition: 'background-color .18s ease, color .18s ease, transform .18s ease',
    '&:hover': { bgcolor: active ? PRIMARY_LIGHT : '#F3F4F8', transform: 'translateX(2px)' },
    '&::before': active ? { content: '""', position: 'absolute', left: -14, top: 9, bottom: 9, width: 3.5, borderRadius: 4, background: GRADIENT } : {},
});

export default function DashboardLayout() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const isExpanded = useSelector((s) => s.sidebar.isExpanded);
    const auth = useSelector((s) => s.auth);
    const modules = useSelector(selectEffectiveModules);
    // Strictly userTypeId 1. Cross-entity work — the All Entities dashboard and
    // the entity switcher — is gated on this and nothing else.
    const isMasterAdmin = useSelector(selectUserTypeId) === USER_TYPE.MASTER_ADMIN;
    const isMasterRoute = location.pathname === '/dashboard/master';
    const userEntityId = useSelector(selectUserEntityId);
    const unread = useSelector(selectUnreadCount);
    const entities = useSelector(selectEntities);
    const activeEntity = useSelector(selectActiveEntity);
    const activeEntityId = useSelector(selectActiveEntityId);
    const [anchor, setAnchor] = React.useState(null);
    const [entityAnchor, setEntityAnchor] = React.useState(null);
    const [fyAnchor, setFyAnchor] = React.useState(null);

    // Financial year — the company's own reporting period. Loaded once here so
    // every screen can read the same selected year out of the store.
    const fyConfig = useSelector(selectFinancialYearConfig);
    const fySelected = useSelector(selectSelectedFinancialYear);
    const fyOptions = useSelector(selectFinancialYearOptions);
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [logoutConfirm, setLogoutConfirm] = React.useState(false);
    const [openSections, setOpenSections] = React.useState(() => {
        const o = {};
        NAV.forEach((n) => { if (n.type === 'section') o[n.label] = n.defaultOpen !== false; });
        return o;
    });

    // A missing or failed config just leaves the header control in its "not set"
    // state — it must never block the dashboard from rendering.
    React.useEffect(() => {
        let cancelled = false;
        http.get(GetFinancialYearConfig)
            .then(({ data: body }) => {
                if (cancelled || body?.error) return;
                dispatch(setFinancialYearConfig(body?.data || null));
            })
            .catch(() => { /* header falls back to "Set financial year" */ });
        return () => { cancelled = true; };
    }, [dispatch]);

    // Hydrate the entity switcher from the same endpoint the Business Entities
    // page uses, so the sidebar "Working in" list shows the real companies (not
    // the two seed entities). Master Admin sees them all; anyone else is pinned to
    // their own entity, matching the entity scoping across the app.
    React.useEffect(() => {
        let cancelled = false;
        http.get(GetBusinessEntitiesDashboard)
            .then(({ data: body }) => {
                if (cancelled || body?.error) return;
                const full = (Array.isArray(body?.data?.entities) ? body.data.entities : [])
                    .map(normalizeEntity)
                    // Inactive entities can't be worked in — keep them out of the
                    // "Working in" switcher entirely. setEntities then snaps the
                    // active selection to a live entity if it was pointing at one
                    // that's now gone (e.g. the one just deactivated).
                    .filter((e) => e.status !== 'Inactive')
                    .sort((a, b) => a.id - b.id);   // lowest id first (API returns them unordered)
                const list = isMasterAdmin ? full : full.filter((e) => String(e.id) === String(userEntityId));
                if (list.length) dispatch(setEntities(list));
            })
            .catch(() => { /* sidebar keeps whatever entities it already has */ });
        return () => { cancelled = true; };
    }, [dispatch, isMasterAdmin, userEntityId]);

    // Hydrate the shared employee roster from the API once, so every staff
    // picker across the app (document requests, advances, overtime…) reads real
    // people instead of the seed data. A failure leaves the seed in place.
    // The roster is admin-only, so a role without the `employees` module (e.g. an
    // Employee) skips it entirely rather than firing a call the API will 403.
    React.useEffect(() => {
        if (!hasModule(modules, 'employees')) return undefined;
        let cancelled = false;
        http.get(GetEmployees)
            .then(({ data: body }) => {
                if (cancelled || body?.error) return;
                const items = Array.isArray(body?.data?.items) ? body.data.items : [];
                if (items.length) dispatch(setEmployees(items.map(mapApiEmployee)));
            })
            .catch(() => { /* keep whatever roster is already in the store */ });
        return () => { cancelled = true; };
    }, [dispatch, modules]);

    // Seed the sidebar's unread badge from the real inbox, so it's correct
    // before the user ever opens the Inbox page. The page keeps it live after.
    React.useEffect(() => {
        let cancelled = false;
        http.get(GetInbox, { params: { filter: 'all' } })
            .then(({ data: body }) => {
                if (cancelled || body?.error) return;
                const s = body?.data?.summary;
                const count = s ? s.unread
                    : (body?.data?.messages || []).filter((m) => !(m.isRead ?? m.read)).length;
                dispatch(setUnreadCount(count));
            })
            .catch(() => { /* badge just stays at its last value */ });
        return () => { cancelled = true; };
    }, [dispatch]);

    const expanded = isMobile ? true : isExpanded;
    const width = isExpanded ? EXPANDED : COLLAPSED;
    const initials = (auth.userName || auth.email || 'U').slice(0, 2).toUpperCase();

    // Everything sitting on the admin's desk, read from the same selectors the
    // pages themselves use — so the sidebar can't disagree with the screens.
    // Zero-count rows are dropped rather than shown as "0".
    // Home shows "My Info" for a login without the dashboard module, matching
    // the page App actually renders there.
    const crumbs = location.pathname === '/dashboard' && !hasModule(modules, 'dashboard')
        ? ['My Info']
        : crumbsFor(location.pathname, location.search);
    const activeTab = new URLSearchParams(location.search).get('tab');

    // Hide the rows this login has no module for, then drop any section left
    // with nothing in it — an empty "PAYROLL" header would be worse than no
    // header at all. With no module list from the server, nothing is hidden.
    // A row with an explicit `module` is gated on it (a string, or any-of an
    // array — the split Attendance/Leave rows); everything else on its route.
    const moduleAllowed = (m) => (Array.isArray(m) ? m.some((k) => hasModule(modules, k)) : hasModule(modules, m));
    // `modules` here is the role-resolved list (built-in roles get their
    // hard-coded set; custom roles get the server's), so gating a row on its
    // module is all that's needed — the role rules are already baked in.
    // The home row is never hidden — without the `dashboard` module it becomes
    // "My Info", the personal view App renders in the dashboard's place.
    const hasDashboard = hasModule(modules, 'dashboard');
    const isHomeRow = (i) => i.to === '/dashboard' && !i.module;
    const rowAllowed = (i) => (isHomeRow(i) ? true : (i.module ? moduleAllowed(i.module) : canAccessRoute(modules, i.to)));
    const asHomeRow = (i) => (isHomeRow(i) && !hasDashboard ? { ...i, label: 'My Info', icon: BadgeRoundedIcon } : i);
    const visibleNav = React.useMemo(() => (
        NAV
            .map((n) => (n.type === 'section'
                ? { ...n, items: n.items.filter(rowAllowed).map(asHomeRow) }
                : n))
            .filter((n) => (n.type === 'section' ? n.items.length > 0 : rowAllowed(n)))
            .map((n) => (n.type === 'section' ? n : asHomeRow(n)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ), [modules]);

    // Auto-open the section that owns the current route.
    React.useEffect(() => {
        NAV.forEach((n) => {
            if (n.type === 'section' && n.items.some((i) => location.pathname === i.to)) {
                setOpenSections((p) => ({ ...p, [n.label]: true }));
            }
        });
    }, [location.pathname]);

    const handleLogout = () => { dispatch(logout()); navigate('/login', { replace: true }); };
    const handleMenuClick = () => { if (isMobile) setMobileOpen((o) => !o); else dispatch(toggleSidebar()); };
    const closeMobile = () => setMobileOpen(false);

    const leaf = (item) => {
        // The Inbox row carries a live unread count — as a dot when the rail is
        // collapsed, as a number pill when it's expanded.
        const count = item.badge === 'inbox' ? unread : 0;
        // Rows that deep-link to a tab carry ?tab in their target.
        const target = item.tabKey ? `${item.to}?tab=${item.tabKey}` : item.to;
        // Two rows can share a pathname (Attendance/Leave), so key on the
        // explicit `key` when given — keying on `to` alone would collide.
        return (
            <NavLink key={item.key || target} to={target} end={item.to === '/dashboard'} style={{ textDecoration: 'none' }} onClick={closeMobile}>
                {({ isActive }) => {
                    // Two rows share the attendance-leave pathname, so NavLink marks
                    // both active — pin the highlight to the row that owns the open
                    // tab ('overview' is the page's default when ?tab is absent).
                    const active = item.ownTabs ? (isActive && item.ownTabs.includes(activeTab || 'overview')) : isActive;
                    return (
                        <Tooltip title={expanded ? '' : `${item.label}${count ? ` (${count})` : ''}`} placement="right" arrow>
                            <Stack direction="row" spacing={1.5} sx={rowSx(active, expanded)}>
                                <Badge
                                    variant="dot"
                                    invisible={!count || expanded}
                                    sx={{ '& .MuiBadge-badge': { bgcolor: '#E11D48', minWidth: 7, height: 7, top: 3, right: 2 } }}
                                >
                                    <item.icon sx={{ fontSize: 20, flexShrink: 0, opacity: active ? 1 : 0.9 }} />
                                </Badge>
                                {expanded && (
                                    <>
                                        <Typography sx={{ fontSize: 13.5, fontWeight: active ? 600 : 500, letterSpacing: '-0.1px', lineHeight: 1.2 }}>{item.label}</Typography>
                                        {count > 0 && (
                                            <Box sx={{ ml: 'auto !important', minWidth: 20, height: 18, px: 0.6, borderRadius: '9px', bgcolor: '#E11D48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{count > 99 ? '99+' : count}</Typography>
                                            </Box>
                                        )}
                                    </>
                                )}
                            </Stack>
                        </Tooltip>
                    );
                }}
            </NavLink>
        );
    };

    // ── Sidebar contents (shared by desktop rail + mobile drawer) ─────────────
    const sidebar = (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ height: 68, display: 'flex', alignItems: 'center', px: expanded ? 2 : 0, justifyContent: expanded ? 'flex-start' : 'center', flexShrink: 0 }}>
                <Logo expanded={expanded} />
            </Box>

            <Stack spacing={0.3} sx={{ px: 1.4, pb: 2, flexGrow: 1, overflowY: 'auto' }}>
                {visibleNav.map((n) => {
                    if (n.type === 'link') return leaf(n);

                    // Collapsed icon-rail: no headers, just a divider + item icons.
                    if (!expanded) {
                        return (
                            <React.Fragment key={n.label}>
                                <Divider sx={{ my: 0.8, borderColor: '#EDEFF4' }} />
                                {n.items.map(leaf)}
                            </React.Fragment>
                        );
                    }

                    // Expanded: clickable section header + collapsible flat items.
                    const open = !!openSections[n.label];
                    return (
                        <Box key={n.label}>
                            <Stack
                                direction="row"
                                onClick={() => setOpenSections((p) => ({ ...p, [n.label]: !p[n.label] }))}
                                sx={{
                                    alignItems: 'center', justifyContent: 'space-between',
                                    px: 1.6, py: 0.5, mt: 1.6, mb: 0.3, borderRadius: '7px', cursor: 'pointer',
                                    '&:hover .sec-label': { color: '#6B7482' },
                                    '&:hover .sec-chev': { color: '#8B93A1' },
                                }}
                            >
                                <Typography className="sec-label" sx={{ fontSize: 11, fontWeight: 700, color: '#98A1B2', letterSpacing: '0.09em', textTransform: 'uppercase', transition: 'color .15s' }}>
                                    {n.label}
                                </Typography>
                                <KeyboardArrowDownRoundedIcon className="sec-chev" sx={{ fontSize: 16, color: '#B4BBC6', transition: 'transform .2s, color .15s', transform: open ? 'none' : 'rotate(-90deg)' }} />
                            </Stack>
                            <Collapse in={open} timeout="auto" unmountOnExit>
                                <Stack spacing={0.3}>{n.items.map(leaf)}</Stack>
                            </Collapse>
                        </Box>
                    );
                })}
            </Stack>

            {/* ── Footer: which company you're working in ─────────────────────
                One card, not a list of blocks. The entity is the anchor — it's
                tinted in that entity's own colour so the rail tells you at a
                glance where you are — and the Master Admin's cross-entity door
                sits directly above it, inside the same card. */}
            <Box sx={{ flexShrink: 0, borderTop: '1px solid #EDEFF4', p: expanded ? 1.4 : 1, bgcolor: '#FCFCFE' }}>
                {expanded ? (
                    activeEntity && (
                        <Box sx={{ borderRadius: '12px', border: '1px solid #EAECF2', bgcolor: '#fff', overflow: 'hidden', boxShadow: '0 1px 3px rgba(16,24,40,0.05)' }}>
                            {/* Cross-entity overview — the one screen not scoped to the
                                entity below it, so only a Master Admin gets the door. */}
                            {isMasterAdmin && (
                                <Stack
                                    direction="row"
                                    spacing={1.1}
                                    onClick={() => { navigate('/dashboard/master'); closeMobile(); }}
                                    sx={{
                                        alignItems: 'center', cursor: 'pointer', px: 1.1, py: 1.15,
                                        background: isMasterRoute ? GRADIENT : PRIMARY_LIGHT,
                                        borderBottom: '1px solid #EAECF2',
                                        transition: 'filter .18s, background .18s',
                                        '&:hover': { filter: 'brightness(0.97)' },
                                    }}
                                >
                                    <DashboardCustomizeRoundedIcon sx={{ fontSize: 18, flexShrink: 0, color: isMasterRoute ? '#fff' : PRIMARY }} />
                                    <Typography sx={{ fontSize: 12, fontWeight: 800, flex: 1, color: isMasterRoute ? '#fff' : PRIMARY }} noWrap>All Entities Dashboard</Typography>
                                    <ArrowForwardRoundedIcon sx={{ fontSize: 15, flexShrink: 0, color: isMasterRoute ? '#fff' : PRIMARY }} />
                                </Stack>
                            )}

                            <Stack
                                direction="row"
                                spacing={1.1}
                                onClick={isMasterAdmin ? (e) => setEntityAnchor(e.currentTarget) : undefined}
                                sx={{
                                    alignItems: 'center', cursor: isMasterAdmin ? 'pointer' : 'default', p: 1.1,
                                    bgcolor: entityAnchor ? `${activeEntity.color}14` : '#fff',
                                    transition: 'background-color .18s',
                                    ...(isMasterAdmin && { '&:hover': { bgcolor: `${activeEntity.color}0F` } }),
                                }}
                            >
                                <Box sx={{ width: 34, height: 34, borderRadius: '9px', bgcolor: activeEntity.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 3px 8px ${activeEntity.color}55` }}>
                                    <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#fff' }}>{activeEntity.code.slice(0, 3)}</Typography>
                                </Box>
                                <Box sx={{ minWidth: 0, flex: 1, lineHeight: 1.25 }}>
                                    <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: '#98A0AE', textTransform: 'uppercase', letterSpacing: 0.4 }}>Working in</Typography>
                                    <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: '#111827' }} noWrap>{activeEntity.name}</Typography>
                                    {activeEntity.city && (
                                        <Typography sx={{ fontSize: 10.5, color: '#B4BBC6' }} noWrap>{activeEntity.city}</Typography>
                                    )}
                                </Box>
                                {/* Only a Master Admin works across entities — everyone else is
                                    pinned to their own, so the block is a read-only label. */}
                                {isMasterAdmin && (
                                    <Box sx={{ width: 26, height: 26, borderRadius: '7px', flexShrink: 0, bgcolor: '#F3F4F8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <SwapHorizRoundedIcon sx={{ fontSize: 16, color: '#5B6472' }} />
                                    </Box>
                                )}
                            </Stack>
                        </Box>
                    )
                ) : (
                    // Collapsed rail: the master-dashboard door (Master Admin only),
                    // then the entity square.
                    <>
                        {isMasterAdmin && (
                            <Tooltip placement="right" arrow title="All Entities Dashboard">
                                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                                    <Box
                                        onClick={() => { navigate('/dashboard/master'); closeMobile(); }}
                                        sx={{ width: 36, height: 36, borderRadius: '9px', background: isMasterRoute ? GRADIENT : PRIMARY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', '&:hover': { filter: 'brightness(0.97)' } }}
                                    >
                                        <DashboardCustomizeRoundedIcon sx={{ fontSize: 18, color: isMasterRoute ? '#fff' : PRIMARY }} />
                                    </Box>
                                </Box>
                            </Tooltip>
                        )}
                        {activeEntity && (
                            <Tooltip placement="right" arrow title={`${activeEntity.name}${isMasterAdmin ? ' — click to switch' : ''}`}>
                                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                    <Box
                                        onClick={isMasterAdmin ? (e) => setEntityAnchor(e.currentTarget) : undefined}
                                        sx={{ width: 36, height: 36, borderRadius: '9px', bgcolor: activeEntity.color, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isMasterAdmin ? 'pointer' : 'default', boxShadow: `0 3px 8px ${activeEntity.color}55`, ...(isMasterAdmin && { '&:hover': { opacity: 0.88 } }) }}
                                    >
                                        <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#fff' }}>{activeEntity.code.slice(0, 3)}</Typography>
                                    </Box>
                                </Box>
                            </Tooltip>
                        )}
                    </>
                )}
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F6F7FF' }}>
            {/* Desktop rail */}
            {!isMobile && (
                <Box sx={{ width, flexShrink: 0, transition: 'width 0.24s cubic-bezier(.4,0,.2,1)', bgcolor: '#fff', borderRight: '1px solid #EDEFF4', position: 'sticky', top: 0, height: '100vh' }}>
                    {sidebar}
                </Box>
            )}

            {/* Mobile drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={closeMobile}
                ModalProps={{ keepMounted: true }}
                sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: EXPANDED, boxSizing: 'border-box', border: 'none' } }}
            >
                {sidebar}
            </Drawer>

            {/* Entity switcher — anchored to the sidebar footer block */}
            <Menu
                anchorEl={entityAnchor}
                open={Boolean(entityAnchor) && isMasterAdmin}
                onClose={() => setEntityAnchor(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                slotProps={{ paper: { sx: { ml: 1, borderRadius: '14px', minWidth: 266, overflow: 'hidden', bgcolor: '#FBFAFF', border: `1px solid ${PRIMARY}2E`, boxShadow: `0 22px 50px -14px ${PRIMARY}66, 0 8px 24px rgba(15,23,42,0.12)` } } }}
                MenuListProps={{ sx: { p: 1.1 } }}
            >
                {/* Gradient header — reads clearly against the tinted body */}
                <Box sx={{ mx: -1.1, mt: -1.1, mb: 1.1, px: 1.8, py: 1.4, background: GRADIENT, color: '#fff' }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.85 }}>Switch entity</Typography>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 800, mt: 0.2 }} noWrap>{activeEntity?.name || 'Select an entity'}</Typography>
                </Box>
                {entities.map((ent) => {
                    const on = ent.id === activeEntity?.id;
                    return (
                        <MenuItem
                            key={ent.id}
                            onClick={() => { dispatch(setActiveEntity(ent.id)); setEntityAnchor(null); }}
                            sx={{
                                borderRadius: '10px', py: 1, px: 1.1, gap: 1.2, mb: 0.6,
                                border: '1px solid',
                                borderColor: on ? `${ent.color}66` : '#ECEBF6',
                                bgcolor: on ? `${ent.color}16` : '#fff',
                                transition: 'background-color .15s, border-color .15s, transform .15s',
                                '&:hover': { bgcolor: on ? `${ent.color}22` : '#F5F3FF', borderColor: on ? `${ent.color}66` : `${PRIMARY}44`, transform: 'translateX(2px)' },
                            }}
                        >
                            <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: ent.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 3px 8px ${ent.color}55` }}>
                                <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{ent.code.slice(0, 3)}</Typography>
                            </Box>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }} noWrap>{ent.name}</Typography>
                                <Typography sx={{ fontSize: 11, color: '#98A0AE' }} noWrap>{ent.city || ent.code}</Typography>
                            </Box>
                            {on && (
                                <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: ent.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <CheckRoundedIcon sx={{ fontSize: 14, color: '#fff' }} />
                                </Box>
                            )}
                        </MenuItem>
                    );
                })}
                <Divider sx={{ borderColor: `${PRIMARY}1F`, my: 0.8 }} />
                <MenuItem
                    onClick={() => { setEntityAnchor(null); navigate('/dashboard/entities'); closeMobile(); }}
                    sx={{ borderRadius: '10px', py: 1, px: 1.1, gap: 1.3, fontSize: 13, fontWeight: 800, color: PRIMARY, bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY}26`, '&:hover': { bgcolor: '#E7DFFC' } }}
                >
                    <ApartmentRoundedIcon sx={{ fontSize: 18 }} />
                    Manage entities
                </MenuItem>
            </Menu>

            {/* Main column */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Box sx={{ height: 68, bgcolor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #EDEFF4', boxShadow: '0 1px 2px rgba(16,24,40,0.03)', display: 'flex', alignItems: 'center', px: { xs: 2, md: 3 }, gap: { xs: 1, md: 1.5 }, position: 'sticky', top: 0, zIndex: 10 }}>
                    <IconButton onClick={handleMenuClick} sx={{ color: '#5B6472', border: '1px solid #EAECF2', borderRadius: '11px', width: 42, height: 42, bgcolor: '#fff', transition: 'background-color .18s, border-color .18s, color .18s', '&:hover': { bgcolor: PRIMARY_LIGHT, borderColor: '#C9BEFB', color: PRIMARY } }}>
                        {!isMobile && isExpanded ? <MenuOpenRoundedIcon /> : <MenuRoundedIcon />}
                    </IconButton>

                    {/* Which company you're working in — mirrors the sidebar's
                        "Working in" selection so the active entity is always visible
                        in the header. Switching still happens from the sidebar. */}
                    {activeEntity && (
                        <Stack direction="row" spacing={1.1} sx={{ alignItems: 'center', bgcolor: '#fff', border: '1px solid #EAECF2', borderRadius: '11px', px: 1.3, height: 42, maxWidth: { sm: 240, md: 300 }, display: { xs: 'none', sm: 'flex' }, transition: 'border-color .18s, box-shadow .18s', '&:hover': { borderColor: '#DDD6FB', boxShadow: `0 3px 10px -2px ${activeEntity.color}22` } }}>
                            <Box sx={{ width: 30, height: 30, borderRadius: '8px', flexShrink: 0, background: `linear-gradient(140deg, ${activeEntity.color}, ${activeEntity.color}D0)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 3px 8px ${activeEntity.color}55` }}>
                                <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: '#fff', letterSpacing: 0.3 }}>{(activeEntity.code || activeEntity.name).slice(0, 3).toUpperCase()}</Typography>
                            </Box>
                            <Box sx={{ minWidth: 0, lineHeight: 1.15 }}>
                                <Typography sx={{ fontSize: 8.5, fontWeight: 800, color: '#A9AEC0', textTransform: 'uppercase', letterSpacing: 0.7 }}>Working in</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#111827' }} noWrap>{activeEntity.name}</Typography>
                            </Box>
                        </Stack>
                    )}

                    <Box sx={{ flexGrow: 1 }} />

                    {/* Compact entity badge on mobile, where the labelled pill won't fit */}
                    {activeEntity && (
                        <Tooltip arrow title={`Working in ${activeEntity.name}`}>
                            <Box sx={{ display: { xs: 'flex', sm: 'none' }, width: 34, height: 34, borderRadius: '9px', bgcolor: activeEntity.color, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{(activeEntity.code || activeEntity.name).slice(0, 3).toUpperCase()}</Typography>
                            </Box>
                        </Tooltip>
                    )}

                    {/* Financial year — which reporting period the app is working in */}
                    <Tooltip arrow title={fyConfig ? `Financial year runs ${fyConfig.startMonthName} to ${fyConfig.endMonthName}` : 'No financial year set'}>
                        <Stack
                            direction="row"
                            spacing={0.9}
                            onClick={(e) => setFyAnchor(e.currentTarget)}
                            sx={{
                                alignItems: 'center', cursor: 'pointer', height: 42, px: 1.4,
                                border: '1px solid', borderRadius: '11px',
                                borderColor: fyAnchor ? '#C9BEFB' : '#EAECF2',
                                bgcolor: fyAnchor ? PRIMARY_LIGHT : '#fff',
                                transition: 'background-color .18s, border-color .18s',
                                '&:hover': { bgcolor: '#F6F5FF', borderColor: '#C9BEFB' },
                            }}
                        >
                            <CalendarMonthRoundedIcon sx={{ fontSize: 18, color: fySelected ? PRIMARY : '#98A0AE' }} />
                            <Box sx={{ display: { xs: 'none', md: 'block' }, lineHeight: 1.2, textAlign: 'left' }}>
                                <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: '#98A0AE', textTransform: 'uppercase', letterSpacing: 0.5 }}>Financial year</Typography>
                                <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: fySelected ? '#111827' : '#98A0AE' }}>
                                    {fySelected || 'Not set'}
                                </Typography>
                            </Box>
                            <KeyboardArrowDownRoundedIcon sx={{ fontSize: 17, color: '#98A0AE', transition: 'transform .2s', transform: fyAnchor ? 'rotate(180deg)' : 'none' }} />
                        </Stack>
                    </Tooltip>

                    <Menu
                        anchorEl={fyAnchor}
                        open={Boolean(fyAnchor)}
                        onClose={() => setFyAnchor(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        slotProps={{ paper: { sx: { mt: 1.2, borderRadius: '12px', minWidth: 240, border: '1px solid #EEF0F5', boxShadow: '0 18px 44px rgba(15,23,42,0.16)' } } }}
                        MenuListProps={{ sx: { p: 1 } }}
                    >
                        <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#98A0AE', textTransform: 'uppercase', letterSpacing: 0.6, px: 1.2, py: 0.8 }}>
                            Financial year
                        </Typography>

                        {fyOptions.length === 0 && (
                            <Typography sx={{ fontSize: 12.5, color: '#94A3B8', px: 1.2, py: 1 }}>
                                Not configured yet.
                            </Typography>
                        )}

                        {fyOptions.map((y) => {
                            const on = y === fySelected;
                            const isCurrent = y === fyConfig?.currentFinancialYear;
                            return (
                                <MenuItem
                                    key={y}
                                    onClick={() => { dispatch(setSelectedFinancialYear(y)); setFyAnchor(null); }}
                                    sx={{ borderRadius: '8px', py: 1, px: 1.2, gap: 1.2, '&:hover': { bgcolor: '#F4F5F9' }, bgcolor: on ? PRIMARY_LIGHT : 'transparent' }}
                                >
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                                            <Typography sx={{ fontSize: 13.5, fontWeight: on ? 800 : 600, color: on ? PRIMARY : '#334155' }}>{y}</Typography>
                                            {isCurrent && (
                                                <Box sx={{ px: 0.7, py: 0.15, borderRadius: '5px', bgcolor: '#DCFCE7' }}>
                                                    <Typography sx={{ fontSize: 9, fontWeight: 800, color: '#16A34A', textTransform: 'uppercase', letterSpacing: 0.4 }}>Current</Typography>
                                                </Box>
                                            )}
                                        </Stack>
                                    </Box>
                                    {on && <CheckRoundedIcon sx={{ fontSize: 17, color: PRIMARY }} />}
                                </MenuItem>
                            );
                        })}

                        <Divider sx={{ borderColor: '#F1F3F7', my: 0.5 }} />
                        <MenuItem
                            onClick={() => { setFyAnchor(null); navigate('/dashboard/settings?tab=financial-year'); closeMobile(); }}
                            sx={{ borderRadius: '8px', py: 1, px: 1.2, gap: 1.5, fontSize: 13, fontWeight: 700, color: PRIMARY, '&:hover': { bgcolor: PRIMARY_LIGHT } }}
                        >
                            <TuneRoundedIcon sx={{ fontSize: 18 }} />
                            Configure financial year
                        </MenuItem>
                    </Menu>

                    {/* Divider — groups the reporting-period pill apart from the
                        personal cluster (inbox · profile · logout). */}
                    <Divider orientation="vertical" flexItem sx={{ borderColor: '#EAECF2', my: 1.3, display: { xs: 'none', sm: 'block' } }} />

                    {/* Inbox */}
                    <Tooltip title={unread ? `${unread} unread message${unread === 1 ? '' : 's'}` : 'Inbox'} arrow>
                        <IconButton
                            onClick={() => navigate('/dashboard/inbox')}
                            sx={{
                                width: 42, height: 42, color: '#5B6472',
                                border: '1px solid #EAECF2', borderRadius: '11px', bgcolor: '#fff',
                                transition: 'background-color .18s, border-color .18s',
                                '&:hover': { bgcolor: PRIMARY_LIGHT, borderColor: '#C9BEFB', color: PRIMARY },
                            }}
                        >
                            <Badge
                                badgeContent={unread}
                                max={99}
                                sx={{ '& .MuiBadge-badge': { bgcolor: '#E11D48', color: '#fff', fontSize: 9.5, fontWeight: 800, minWidth: 16, height: 16, top: 1, right: 1 } }}
                            >
                                <MailOutlineRoundedIcon sx={{ fontSize: 20 }} />
                            </Badge>
                        </IconButton>
                    </Tooltip>

                    <Stack
                        direction="row"
                        spacing={1}
                        onClick={(e) => setAnchor(e.currentTarget)}
                        sx={{
                            alignItems: 'center', cursor: 'pointer', height: 42,
                            pl: 0.5, pr: { xs: 0.5, md: 1.3 },
                            borderRadius: '30px',
                            border: '1px solid #EAECF2',
                            bgcolor: Boolean(anchor) ? '#F1EEFE' : '#fff',
                            transition: 'background-color .18s, border-color .18s, box-shadow .18s',
                            '&:hover': { bgcolor: '#F6F5FF', borderColor: '#C9BEFB', boxShadow: '0 2px 8px rgba(124,92,252,0.12)' },
                        }}
                    >
                        <Avatar sx={{ width: 34, height: 34, background: GRADIENT, fontSize: 13, fontWeight: 700, boxShadow: '0 2px 6px rgba(124,92,252,0.35)' }}>{initials}</Avatar>
                        <Box sx={{ display: { xs: 'none', md: 'block' }, lineHeight: 1.2 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#111827' }} noWrap>{auth.userName || 'User'}</Typography>
                            <Typography sx={{ fontSize: 10.5, color: '#98A0AE', fontWeight: 600 }} noWrap>{auth.role || 'Member'}</Typography>
                        </Box>
                        <KeyboardArrowDownRoundedIcon sx={{ display: { xs: 'none', md: 'block' }, fontSize: 18, color: '#98A0AE', transition: 'transform .2s', transform: Boolean(anchor) ? 'rotate(180deg)' : 'none' }} />
                    </Stack>

                    <Menu
                        anchorEl={anchor}
                        open={Boolean(anchor)}
                        onClose={() => setAnchor(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        slotProps={{ paper: { sx: { mt: 1.2, borderRadius: '16px', minWidth: 268, overflow: 'hidden', border: '1px solid #EEF0F5', boxShadow: '0 20px 48px -8px rgba(15,23,42,0.22)' } } }}
                        MenuListProps={{ sx: { p: 0 } }}
                    >
                        {/* Gradient identity card */}
                        <Box sx={{ background: GRADIENT, px: 2, py: 1.9, color: '#fff', position: 'relative', overflow: 'hidden' }}>
                            <Box sx={{ position: 'absolute', top: -30, right: -20, width: 110, height: 110, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.10)' }} />
                            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', position: 'relative' }}>
                                <Avatar sx={{ width: 48, height: 48, bgcolor: 'rgba(255,255,255,0.22)', color: '#fff', fontSize: 17, fontWeight: 800, border: '2px solid rgba(255,255,255,0.5)' }}>{initials}</Avatar>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography sx={{ fontSize: 15, fontWeight: 800, lineHeight: 1.2 }} noWrap>{auth.userName || 'User'}</Typography>
                                    <Typography sx={{ fontSize: 11.5, opacity: 0.9 }} noWrap>{auth.email || '—'}</Typography>
                                    {auth.role && (
                                        <Box sx={{ mt: 0.5, display: 'inline-flex', alignItems: 'center', px: 0.9, py: 0.2, borderRadius: '6px', bgcolor: 'rgba(255,255,255,0.2)' }}>
                                            <Typography sx={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase' }}>{auth.role}</Typography>
                                        </Box>
                                    )}
                                </Box>
                            </Stack>
                        </Box>

                        {/* Actions */}
                        <Box sx={{ p: 1 }}>
                            {[
                                { icon: PersonRoundedIcon, label: 'My Profile', onClick: () => setAnchor(null) },
                                { icon: SettingsRoundedIcon, label: 'Settings', onClick: () => { setAnchor(null); navigate('/dashboard/settings'); closeMobile(); } },
                            ].map((it) => (
                                <MenuItem key={it.label} onClick={it.onClick} sx={{ borderRadius: '10px', py: 0.9, px: 1, gap: 1.3, fontSize: 13.5, fontWeight: 700, color: '#334155', '&:hover': { bgcolor: PRIMARY_LIGHT, color: PRIMARY, '& .act-ico': { bgcolor: '#fff', color: PRIMARY } } }}>
                                    <Box className="act-ico" sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: '#F4F5F9', color: '#5B6472', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color .15s, color .15s' }}>
                                        <it.icon sx={{ fontSize: 18 }} />
                                    </Box>
                                    {it.label}
                                </MenuItem>
                            ))}

                            <Divider sx={{ borderColor: '#F1F3F7', my: 0.7 }} />

                            <MenuItem
                                onClick={() => { setAnchor(null); setLogoutConfirm(true); }}
                                sx={{ borderRadius: '10px', py: 0.9, px: 1, gap: 1.3, fontSize: 13.5, fontWeight: 700, color: '#DC2626', '&:hover': { bgcolor: '#FEF2F2', '& .act-ico': { bgcolor: '#fff' } } }}
                            >
                                <Box className="act-ico" sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color .15s' }}>
                                    <PowerSettingsNewRoundedIcon sx={{ fontSize: 18 }} />
                                </Box>
                                Log out
                            </MenuItem>
                        </Box>
                    </Menu>
                </Box>

                <Box sx={{ bgcolor: '#F6F7FF', flexGrow: 1, overflow: 'auto' }}>
                    {/* Breadcrumb */}
                    <Box sx={{ px: { xs: 2, md: 3 }, pt: 2, pb: 0.5 }}>
                        <Breadcrumbs separator={<NavigateNextRoundedIcon sx={{ fontSize: 16, color: '#B4BBC6' }} />}>
                            <Box
                                component="button"
                                onClick={() => navigate('/dashboard')}
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, border: 'none', bgcolor: 'transparent', cursor: 'pointer', p: 0, fontFamily: 'inherit', fontSize: 13.5, color: '#64748B', '&:hover': { color: PRIMARY } }}
                            >
                                <HomeRoundedIcon sx={{ fontSize: 16 }} /> Home
                            </Box>
                            {crumbs.map((c, i) => (
                                <Typography
                                    key={c}
                                    sx={{ fontSize: 13.5, fontWeight: i === crumbs.length - 1 ? 600 : 500, color: i === crumbs.length - 1 ? '#0F172A' : '#64748B' }}
                                >
                                    {c}
                                </Typography>
                            ))}
                        </Breadcrumbs>
                    </Box>
                    {/* Re-key on the active entity so switching companies in the
                        sidebar remounts the current page — its load effects run
                        again and the screen shows the new entity's data instead of
                        the one it first mounted with. `display: contents` keeps the
                        wrapper out of the layout. */}
                    <Box key={`entity-${activeEntityId}`} sx={{ display: 'contents' }}>
                        <Outlet />
                    </Box>
                </Box>
            </Box>

            {/* Logout confirmation */}
            <Dialog
                open={logoutConfirm}
                onClose={() => setLogoutConfirm(false)}
                maxWidth="xs" fullWidth
                slotProps={{ paper: { sx: { borderRadius: '16px', p: 0.5 } } }}
            >
                <DialogContent sx={{ textAlign: 'center', pt: 3.5, pb: 1.5 }}>
                    <Box sx={{
                        width: 60, height: 60, borderRadius: '50%', mx: 'auto', mb: 2,
                        bgcolor: '#FEF2F2', border: '1px solid #FECACA',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <PowerSettingsNewRoundedIcon sx={{ fontSize: 30, color: '#DC2626' }} />
                    </Box>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Log out of ARA HumanSync?</Typography>
                    <Typography sx={{ fontSize: 13.5, color: '#6B7280', mt: 0.6, px: 1 }}>
                        Are you sure you want to continue? You'll need to sign in again to access your dashboard.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
                    <Button
                        onClick={() => setLogoutConfirm(false)}
                        fullWidth
                        sx={{ textTransform: 'none', fontWeight: 700, fontSize: 14, height: 44, borderRadius: '10px', color: '#334155', bgcolor: '#F1F5F9', boxShadow: 'none', '&:hover': { bgcolor: '#E2E8F0', boxShadow: 'none' } }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => { setLogoutConfirm(false); handleLogout(); }}
                        fullWidth
                        startIcon={<PowerSettingsNewRoundedIcon sx={{ fontSize: 18 }} />}
                        sx={{ textTransform: 'none', fontWeight: 700, fontSize: 14, height: 44, borderRadius: '10px', color: '#fff', bgcolor: '#DC2626', boxShadow: 'none', '& .MuiButton-startIcon': { color: '#fff' }, '&:hover': { bgcolor: '#B91C1C', color: '#fff', boxShadow: 'none' } }}
                    >
                        Log out
                    </Button>
                </DialogActions>
            </Dialog>

            {/* New-entity onboarding gate — checklist for admins, block for others,
                until the active entity's required setup is complete. */}
            <EntitySetupGate />
        </Box>
    );
}
