import React from 'react';
import {
    Box, Typography, Stack, IconButton, Avatar, Tooltip, Menu, MenuItem,
    Divider, InputBase, Drawer, useMediaQuery, Collapse, Breadcrumbs, Badge,
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
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import MoreTimeRoundedIcon from '@mui/icons-material/MoreTimeRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PowerSettingsNewRoundedIcon from '@mui/icons-material/PowerSettingsNewRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import FolderSharedRoundedIcon from '@mui/icons-material/FolderSharedRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toggleSidebar } from '../redux/slices/sidebarSlice';
import { logout } from '../redux/slices/authSlice';
import { selectUnreadCount } from '../redux/slices/inboxSlice';
import { selectEntities, selectActiveEntity, setActiveEntity } from '../redux/slices/orgSlice';
import { selectPendingApprovals } from '../redux/slices/documentsSlice';
import { selectAdvanceRequests } from '../redux/slices/advancesSlice';
import { selectOtRecords } from '../redux/slices/overtimeSlice';
import { PRIMARY, PRIMARY_LIGHT, GRADIENT } from '../theme';
import brandLogo from '../images/Logo---Colour.png';

const EXPANDED = 252;
const COLLAPSED = 78;

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
            { label: 'Inbox', icon: NotificationsRoundedIcon, to: '/dashboard/inbox', badge: 'inbox' },
            { label: 'Employees', icon: GroupsRoundedIcon, to: '/dashboard/employees' },
            {
                label: 'Documents', icon: FolderSharedRoundedIcon, to: '/dashboard/documents',
                tabs: { requests: 'Requests', approvals: 'Approvals', organisation: 'Organisation Documents', employee: 'Employee Documents' },
            },
        ],
    },
    {
        type: 'section', label: 'Payroll', defaultOpen: true, items: [
            { label: 'Run Payroll', icon: PaidRoundedIcon, to: '/dashboard/run-payroll' },
            { label: 'Payroll Register', icon: ReceiptLongRoundedIcon, to: '/dashboard/payroll-register' },
            { label: 'Payslips', icon: FactCheckRoundedIcon, to: '/dashboard/payslips' },
            {
                label: 'Advances & Overtime', icon: SavingsRoundedIcon, to: '/dashboard/pay-adjustments',
                tabs: { advances: 'Salary Advances', overtime: 'Overtime (OT)' },
            },
        ],
    },
    {
        type: 'section', label: 'Attendance', defaultOpen: true, items: [
            {
                label: 'Attendance & Leave', icon: HowToRegRoundedIcon, to: '/dashboard/attendance-leave',
                tabs: { overview: 'Overview', attendance: 'Attendance', leave: 'Leave Management', reports: 'Reports' },
            },
        ],
    },
    {
        type: 'section', label: 'Setup', defaultOpen: false, items: [
            {
                label: 'Organisation', icon: ApartmentRoundedIcon, to: '/dashboard/organisation',
                tabs: { entities: 'Business Entities', departments: 'Departments', designations: 'Designations' },
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
const crumbsFor = (pathname, search) => {
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
    const unread = useSelector(selectUnreadCount);
    const entities = useSelector(selectEntities);
    const activeEntity = useSelector(selectActiveEntity);
    const docApprovals = useSelector(selectPendingApprovals);
    const advanceRequests = useSelector(selectAdvanceRequests);
    const otRecords = useSelector(selectOtRecords);
    const [anchor, setAnchor] = React.useState(null);
    const [entityAnchor, setEntityAnchor] = React.useState(null);
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [logoutConfirm, setLogoutConfirm] = React.useState(false);
    const [openSections, setOpenSections] = React.useState(() => {
        const o = {};
        NAV.forEach((n) => { if (n.type === 'section') o[n.label] = n.defaultOpen !== false; });
        return o;
    });

    const expanded = isMobile ? true : isExpanded;
    const width = isExpanded ? EXPANDED : COLLAPSED;
    const initials = (auth.userName || auth.email || 'U').slice(0, 2).toUpperCase();

    // Everything sitting on the admin's desk, read from the same selectors the
    // pages themselves use — so the sidebar can't disagree with the screens.
    // Zero-count rows are dropped rather than shown as "0".
    const crumbs = crumbsFor(location.pathname, location.search);

    const otPending = otRecords.filter((r) => r.status === 'pending').length;
    const todo = [
        { label: 'Documents to approve', count: docApprovals.length, icon: FactCheckRoundedIcon, color: '#0EA5E9', to: '/dashboard/documents?tab=approvals' },
        { label: 'Advance requests', count: advanceRequests.length, icon: SavingsRoundedIcon, color: '#F59E0B', to: '/dashboard/pay-adjustments?tab=advances' },
        { label: 'Overtime to approve', count: otPending, icon: MoreTimeRoundedIcon, color: '#7C5CFC', to: '/dashboard/pay-adjustments?tab=overtime' },
    ].filter((t) => t.count > 0);
    const todoCount = todo.reduce((n, t) => n + t.count, 0);

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
        return (
            <NavLink key={item.to} to={item.to} end={item.to === '/dashboard'} style={{ textDecoration: 'none' }} onClick={closeMobile}>
                {({ isActive }) => (
                    <Tooltip title={expanded ? '' : `${item.label}${count ? ` (${count})` : ''}`} placement="right" arrow>
                        <Stack direction="row" spacing={1.5} sx={rowSx(isActive, expanded)}>
                            <Badge
                                variant="dot"
                                invisible={!count || expanded}
                                sx={{ '& .MuiBadge-badge': { bgcolor: '#E11D48', minWidth: 7, height: 7, top: 3, right: 2 } }}
                            >
                                <item.icon sx={{ fontSize: 20, flexShrink: 0, opacity: isActive ? 1 : 0.9 }} />
                            </Badge>
                            {expanded && (
                                <>
                                    <Typography sx={{ fontSize: 13.5, fontWeight: isActive ? 600 : 500, letterSpacing: '-0.1px', lineHeight: 1.2 }}>{item.label}</Typography>
                                    {count > 0 && (
                                        <Box sx={{ ml: 'auto !important', minWidth: 20, height: 18, px: 0.6, borderRadius: '9px', bgcolor: '#E11D48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{count > 99 ? '99+' : count}</Typography>
                                        </Box>
                                    )}
                                </>
                            )}
                        </Stack>
                    </Tooltip>
                )}
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
                {NAV.map((n) => {
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

            {/* ── Footer: what needs doing, and which company you're doing it in ──
                This is the space the shorter nav frees up. Both blocks are things
                you want visible at all times rather than buried in a list. */}
            <Box sx={{ flexShrink: 0, borderTop: '1px solid #EDEFF4', p: expanded ? 1.4 : 1, bgcolor: '#FCFCFE' }}>
                {expanded ? (
                    <>
                        {todo.length > 0 && (
                            <Box sx={{ mb: 1.2 }}>
                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#98A1B2', letterSpacing: '0.09em', textTransform: 'uppercase', px: 0.6, mb: 0.6 }}>
                                    Needs action
                                </Typography>
                                <Stack spacing={0.4}>
                                    {todo.map((t) => (
                                        <Stack
                                            key={t.label}
                                            direction="row"
                                            spacing={1}
                                            onClick={() => { navigate(t.to); closeMobile(); }}
                                            sx={{
                                                alignItems: 'center', px: 0.9, py: 0.7, borderRadius: '7px', cursor: 'pointer',
                                                transition: 'background-color .15s',
                                                '&:hover': { bgcolor: '#F3F4F8' },
                                            }}
                                        >
                                            <t.icon sx={{ fontSize: 16, color: t.color, flexShrink: 0 }} />
                                            <Typography sx={{ fontSize: 12, color: '#5B6472', flex: 1, lineHeight: 1.3 }} noWrap>{t.label}</Typography>
                                            <Box sx={{ minWidth: 19, height: 18, px: 0.6, borderRadius: '9px', bgcolor: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{t.count}</Typography>
                                            </Box>
                                        </Stack>
                                    ))}
                                </Stack>
                            </Box>
                        )}

                        {activeEntity && (
                            <Stack
                                direction="row"
                                spacing={1.1}
                                onClick={(e) => setEntityAnchor(e.currentTarget)}
                                sx={{
                                    alignItems: 'center', cursor: 'pointer', p: 1, borderRadius: '9px',
                                    border: '1px solid #EAECF2', bgcolor: entityAnchor ? PRIMARY_LIGHT : '#fff',
                                    transition: 'background-color .18s, border-color .18s',
                                    '&:hover': { bgcolor: '#F6F5FF', borderColor: '#C9BEFB' },
                                }}
                            >
                                <Box sx={{ width: 30, height: 30, borderRadius: '7px', bgcolor: activeEntity.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{activeEntity.code.slice(0, 3)}</Typography>
                                </Box>
                                <Box sx={{ minWidth: 0, flex: 1, lineHeight: 1.25 }}>
                                    <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: '#98A0AE', textTransform: 'uppercase', letterSpacing: 0.4 }}>Working in</Typography>
                                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#111827' }} noWrap>{activeEntity.name}</Typography>
                                </Box>
                                <SwapHorizRoundedIcon sx={{ fontSize: 17, color: '#98A0AE', flexShrink: 0 }} />
                            </Stack>
                        )}
                    </>
                ) : (
                    // Collapsed rail: the entity square, with a dot if anything is waiting.
                    activeEntity && (
                        <Tooltip placement="right" arrow title={`${activeEntity.name}${todoCount ? ` · ${todoCount} need action` : ''} — click to switch`}>
                            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                <Badge
                                    variant="dot"
                                    invisible={!todoCount}
                                    sx={{ '& .MuiBadge-badge': { bgcolor: '#E11D48', minWidth: 8, height: 8 } }}
                                >
                                    <Box
                                        onClick={(e) => setEntityAnchor(e.currentTarget)}
                                        sx={{ width: 36, height: 36, borderRadius: '9px', bgcolor: activeEntity.color, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', '&:hover': { opacity: 0.88 } }}
                                    >
                                        <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#fff' }}>{activeEntity.code.slice(0, 3)}</Typography>
                                    </Box>
                                </Badge>
                            </Box>
                        </Tooltip>
                    )
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
                open={Boolean(entityAnchor)}
                onClose={() => setEntityAnchor(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                slotProps={{ paper: { sx: { ml: 1, borderRadius: '12px', minWidth: 258, border: '1px solid #EEF0F5', boxShadow: '0 18px 44px rgba(15,23,42,0.16)' } } }}
                MenuListProps={{ sx: { p: 1 } }}
            >
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#98A1B2', letterSpacing: '0.08em', textTransform: 'uppercase', px: 1.2, py: 0.8 }}>
                    Switch entity
                </Typography>
                {entities.map((ent) => {
                    const on = ent.id === activeEntity?.id;
                    return (
                        <MenuItem
                            key={ent.id}
                            onClick={() => { dispatch(setActiveEntity(ent.id)); setEntityAnchor(null); }}
                            sx={{ borderRadius: '8px', py: 1, px: 1.2, gap: 1.3, '&:hover': { bgcolor: '#F4F5F9' } }}
                        >
                            <Box sx={{ width: 30, height: 30, borderRadius: '7px', bgcolor: ent.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{ent.code.slice(0, 3)}</Typography>
                            </Box>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }} noWrap>{ent.name}</Typography>
                                <Typography sx={{ fontSize: 11, color: '#98A0AE' }} noWrap>{ent.city || ent.code}</Typography>
                            </Box>
                            {on && <CheckRoundedIcon sx={{ fontSize: 18, color: ent.color }} />}
                        </MenuItem>
                    );
                })}
                <Divider sx={{ borderColor: '#F1F3F7', my: 0.6 }} />
                <MenuItem
                    onClick={() => { setEntityAnchor(null); navigate('/dashboard/organisation?tab=entities'); closeMobile(); }}
                    sx={{ borderRadius: '8px', py: 1, px: 1.2, gap: 1.5, fontSize: 13, fontWeight: 700, color: PRIMARY, '&:hover': { bgcolor: PRIMARY_LIGHT } }}
                >
                    <ApartmentRoundedIcon sx={{ fontSize: 18 }} />
                    Manage entities
                </MenuItem>
            </Menu>

            {/* Main column */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Box sx={{ height: 68, bgcolor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #EDEFF4', display: 'flex', alignItems: 'center', px: { xs: 2, md: 3 }, gap: { xs: 1, md: 2 }, position: 'sticky', top: 0, zIndex: 10 }}>
                    <IconButton onClick={handleMenuClick} size="small" sx={{ color: '#5B6472' }}>
                        {!isMobile && isExpanded ? <MenuOpenRoundedIcon /> : <MenuRoundedIcon />}
                    </IconButton>

                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', bgcolor: '#F3F4F8', borderRadius: '7px', px: 1.5, height: 42, width: { xs: 0, sm: 300, md: 320 }, display: { xs: 'none', sm: 'flex' }, transition: 'box-shadow .2s', '&:focus-within': { boxShadow: `0 0 0 2px ${PRIMARY_LIGHT}` } }}>
                        <SearchRoundedIcon sx={{ fontSize: 19, color: '#98A0AE' }} />
                        <InputBase placeholder="Search employees, payslips…" sx={{ fontSize: 13.5, flex: 1 }} />
                    </Stack>

                    <Box sx={{ flexGrow: 1 }} />

                    <IconButton sx={{ display: { xs: 'inline-flex', sm: 'none' }, color: '#5B6472' }}>
                        <SearchRoundedIcon />
                    </IconButton>

                    {/* Inbox */}
                    <Tooltip title={unread ? `${unread} unread message${unread === 1 ? '' : 's'}` : 'Inbox'} arrow>
                        <IconButton
                            onClick={() => navigate('/dashboard/inbox')}
                            sx={{
                                width: 40, height: 40, color: '#5B6472',
                                border: '1px solid #EAECF2', borderRadius: '10px', bgcolor: '#fff',
                                transition: 'background-color .18s, border-color .18s',
                                '&:hover': { bgcolor: PRIMARY_LIGHT, borderColor: '#C9BEFB', color: PRIMARY },
                            }}
                        >
                            <Badge
                                badgeContent={unread}
                                max={99}
                                sx={{ '& .MuiBadge-badge': { bgcolor: '#E11D48', color: '#fff', fontSize: 9.5, fontWeight: 800, minWidth: 16, height: 16, top: 1, right: 1 } }}
                            >
                                <NotificationsRoundedIcon sx={{ fontSize: 20 }} />
                            </Badge>
                        </IconButton>
                    </Tooltip>

                    <Stack
                        direction="row"
                        spacing={1.1}
                        onClick={(e) => setAnchor(e.currentTarget)}
                        sx={{
                            alignItems: 'center', cursor: 'pointer',
                            pl: 0.6, pr: { xs: 0.6, md: 1.2 }, py: 0.6,
                            borderRadius: '30px',
                            border: '1px solid #EAECF2',
                            bgcolor: Boolean(anchor) ? '#F1EEFE' : '#fff',
                            transition: 'background-color .18s, border-color .18s, box-shadow .18s',
                            '&:hover': { bgcolor: '#F6F5FF', borderColor: '#C9BEFB', boxShadow: '0 2px 8px rgba(124,92,252,0.12)' },
                        }}
                    >
                        <Avatar sx={{ width: 34, height: 34, background: GRADIENT, fontSize: 13, fontWeight: 700 }}>{initials}</Avatar>
                        <Box sx={{ display: { xs: 'none', md: 'block' }, lineHeight: 1.25 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{auth.userName || 'User'}</Typography>
                            <Typography sx={{ fontSize: 11, color: '#98A0AE', fontWeight: 500 }}>{auth.role || 'Member'}</Typography>
                        </Box>
                        <KeyboardArrowDownRoundedIcon sx={{ display: { xs: 'none', md: 'block' }, fontSize: 18, color: '#98A0AE', transition: 'transform .2s', transform: Boolean(anchor) ? 'rotate(180deg)' : 'none' }} />
                    </Stack>

                    <Menu
                        anchorEl={anchor}
                        open={Boolean(anchor)}
                        onClose={() => setAnchor(null)}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        slotProps={{ paper: { sx: { mt: 1.2, borderRadius: '14px', minWidth: 250, overflow: 'hidden', border: '1px solid #EEF0F5', boxShadow: '0 18px 44px rgba(15,23,42,0.16)' } } }}
                        MenuListProps={{ sx: { p: 1 } }}
                    >
                        {/* Compact identity row */}
                        <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center', px: 1.2, py: 1, mb: 0.5 }}>
                            <Avatar sx={{ width: 40, height: 40, background: GRADIENT, fontSize: 14, fontWeight: 700 }}>{initials}</Avatar>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }} noWrap>{auth.userName || 'User'}</Typography>
                                <Typography sx={{ fontSize: 11.5, color: '#8A93A4' }} noWrap>{auth.email || '—'}</Typography>
                            </Box>
                        </Stack>
                        <Divider sx={{ borderColor: '#F1F3F7', mb: 0.5 }} />

                        {[
                            { icon: PersonRoundedIcon, label: 'My Profile', onClick: () => setAnchor(null) },
                            { icon: SettingsRoundedIcon, label: 'Settings', onClick: () => setAnchor(null) },
                        ].map((it) => (
                            <MenuItem key={it.label} onClick={it.onClick} sx={{ borderRadius: '8px', py: 1.05, px: 1.2, gap: 1.5, fontSize: 13.5, fontWeight: 600, color: '#334155', '&:hover': { bgcolor: '#F4F5F9' } }}>
                                <it.icon sx={{ fontSize: 19, color: '#5B6472' }} />
                                {it.label}
                            </MenuItem>
                        ))}
                    </Menu>

                    <Tooltip title="Log out" arrow>
                        <IconButton
                            onClick={() => setLogoutConfirm(true)}
                            sx={{
                                width: 40, height: 40, color: '#DC2626',
                                border: '1px solid #EAECF2', borderRadius: '10px', bgcolor: '#fff',
                                transition: 'background-color .18s, border-color .18s',
                                '&:hover': { bgcolor: '#FEF2F2', borderColor: '#FECACA' },
                            }}
                        >
                            <PowerSettingsNewRoundedIcon sx={{ fontSize: 19 }} />
                        </IconButton>
                    </Tooltip>
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
                    <Outlet />
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
        </Box>
    );
}
