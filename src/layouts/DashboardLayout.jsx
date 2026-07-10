import React from 'react';
import {
    Box, Typography, Stack, IconButton, Avatar, Tooltip, Menu, MenuItem,
    Divider, ListItemIcon, InputBase, Drawer, useMediaQuery, Collapse, Breadcrumbs,
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
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toggleSidebar } from '../redux/slices/sidebarSlice';
import { logout } from '../redux/slices/authSlice';
import { PRIMARY, PRIMARY_LIGHT, GRADIENT } from '../theme';
import brandLogo from '../images/Logo---Colour.png';

const EXPANDED = 252;
const COLLAPSED = 78;

// ── Navigation model: a top link + collapsible sections of flat items ────────
const NAV = [
    { type: 'link', label: 'Dashboard', icon: SpaceDashboardRoundedIcon, to: '/dashboard' },
    { type: 'link', label: 'Employees', icon: GroupsRoundedIcon, to: '/dashboard/employees' },
    { type: 'link', label: 'Roles & Access', icon: AdminPanelSettingsRoundedIcon, to: '/dashboard/roles' },
    {
        type: 'section', label: 'Payroll', items: [
            { label: 'Salary Structures', icon: RequestQuoteRoundedIcon, to: '/dashboard/salary-structures' },
            { label: 'Statutory Deductions', icon: VerifiedUserRoundedIcon, to: '/dashboard/compliance' },
            { label: 'Bank Details', icon: AccountBalanceWalletRoundedIcon, to: '/dashboard/bank-details' },
            { label: 'Payroll Register', icon: ReceiptLongRoundedIcon, to: '/dashboard/salary-register' },
            { label: 'Salary Advances', icon: SavingsRoundedIcon, to: '/dashboard/advances' },
            { label: 'Overtime (OT)', icon: MoreTimeRoundedIcon, to: '/dashboard/overtime' },
            { label: 'Run Payroll', icon: PaidRoundedIcon, to: '/dashboard/salary-credited' },
            { label: 'Payslips', icon: FactCheckRoundedIcon, to: '/dashboard/approve-payroll' },
        ],
    },
    {
        type: 'section', label: 'Leave & Attendance', items: [
            { label: 'Overview', icon: GridViewRoundedIcon, to: '/dashboard/attendance-overview' },
            { label: 'Attendance', icon: HowToRegRoundedIcon, to: '/dashboard/attendance' },
            { label: 'Leave Management', icon: BeachAccessRoundedIcon, to: '/dashboard/leave-management' },
            { label: 'Reports', icon: AssessmentRoundedIcon, to: '/dashboard/attendance-reports' },
        ],
    },
    {
        type: 'section', label: 'Leave Policy', items: [
            { label: 'Policy Setup', icon: RuleRoundedIcon, to: '/dashboard/leave-policy/setup' },
            { label: 'Leave Types', icon: CategoryRoundedIcon, to: '/dashboard/leave-policy/types' },
            { label: 'Working Calendar', icon: CalendarMonthRoundedIcon, to: '/dashboard/leave-policy/calendar' },
            { label: 'Assign Shifts', icon: ScheduleRoundedIcon, to: '/dashboard/leave-policy/shifts' },
        ],
    },
];

// Brand logo (PNG already contains the "ARA HumanSync" wordmark).
// expanded → full horizontal logo; collapsed → just the left icon slice.
// Flatten nav to look up the page title for the breadcrumb.
const FLAT_NAV = NAV.flatMap((n) => (n.type === 'section' ? n.items : n.type === 'link' ? [n] : []));
const pageLabel = (pathname) => {
    const hit = FLAT_NAV.find((i) => i.to === pathname);
    if (hit) return hit.label;
    const seg = pathname.split('/').filter(Boolean).pop() || 'Dashboard';
    return seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
    const [anchor, setAnchor] = React.useState(null);
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const [openSections, setOpenSections] = React.useState(() => {
        const o = {};
        NAV.forEach((n) => { if (n.type === 'section') o[n.label] = n.defaultOpen !== false; });
        return o;
    });

    const expanded = isMobile ? true : isExpanded;
    const width = isExpanded ? EXPANDED : COLLAPSED;
    const initials = (auth.userName || auth.email || 'U').slice(0, 2).toUpperCase();

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

    const leaf = (item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/dashboard'} style={{ textDecoration: 'none' }} onClick={closeMobile}>
            {({ isActive }) => (
                <Tooltip title={expanded ? '' : item.label} placement="right" arrow>
                    <Stack direction="row" spacing={1.5} sx={rowSx(isActive, expanded)}>
                        <item.icon sx={{ fontSize: 20, flexShrink: 0, opacity: isActive ? 1 : 0.9 }} />
                        {expanded && <Typography sx={{ fontSize: 13.5, fontWeight: isActive ? 600 : 500, letterSpacing: '-0.1px', lineHeight: 1.2 }}>{item.label}</Typography>}
                    </Stack>
                </Tooltip>
            )}
        </NavLink>
    );

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

                        <Divider sx={{ my: 0.5, borderColor: '#F1F3F7' }} />

                        <MenuItem onClick={handleLogout} sx={{ borderRadius: '8px', py: 1.05, px: 1.2, gap: 1.5, fontSize: 13.5, fontWeight: 600, color: '#DC2626', '&:hover': { bgcolor: '#FEF2F2' } }}>
                            <LogoutRoundedIcon sx={{ fontSize: 19, color: '#DC2626' }} />
                            Log out
                        </MenuItem>
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
                            <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A' }}>{pageLabel(location.pathname)}</Typography>
                        </Breadcrumbs>
                    </Box>
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
}
