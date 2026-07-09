import React from 'react';
import {
    Box, Typography, Stack, IconButton, Avatar, Tooltip, Menu, MenuItem,
    Divider, ListItemIcon, Badge, InputBase, Drawer, useMediaQuery, Collapse,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuOpenRoundedIcon from '@mui/icons-material/MenuOpenRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded';
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
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
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toggleSidebar } from '../redux/slices/sidebarSlice';
import { logout } from '../redux/slices/authSlice';
import { PRIMARY, PRIMARY_LIGHT, GRADIENT } from '../theme';

const EXPANDED = 252;
const COLLAPSED = 78;

// ── Navigation model: a top link + collapsible sections of flat items ────────
const NAV = [
    { type: 'link', label: 'Dashboard', icon: SpaceDashboardRoundedIcon, to: '/dashboard' },
    {
        type: 'section', label: 'Payroll', items: [
            { label: 'Salary Structures', icon: RequestQuoteRoundedIcon, to: '/dashboard/salary-structures' },
            { label: 'Compliance', icon: VerifiedUserRoundedIcon, to: '/dashboard/compliance' },
            { label: 'Bank Details', icon: AccountBalanceWalletRoundedIcon, to: '/dashboard/bank-details' },
            { label: 'Salary Register', icon: ReceiptLongRoundedIcon, to: '/dashboard/salary-register' },
            { label: 'Run & Approve', icon: FactCheckRoundedIcon, to: '/dashboard/approve-payroll' },
            { label: 'Salary Credited', icon: PaidRoundedIcon, to: '/dashboard/salary-credited' },
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

function Logo() {
    return (
        <Box sx={{ width: 34, height: 34, borderRadius: '7px', background: GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Box sx={{ width: 13, height: 13, bgcolor: '#fff', borderRadius: '3px', transform: 'rotate(45deg)' }} />
        </Box>
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
                    <Stack direction="row" spacing={1.6} sx={rowSx(isActive, expanded)}>
                        <item.icon sx={{ fontSize: 21, flexShrink: 0 }} />
                        {expanded && <Typography sx={{ fontSize: 13.5, fontWeight: isActive ? 700 : 500 }}>{item.label}</Typography>}
                    </Stack>
                </Tooltip>
            )}
        </NavLink>
    );

    // ── Sidebar contents (shared by desktop rail + mobile drawer) ─────────────
    const sidebar = (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ height: 68, display: 'flex', alignItems: 'center', px: expanded ? 2.5 : 0, justifyContent: expanded ? 'flex-start' : 'center', gap: 1.3, flexShrink: 0 }}>
                <Logo />
                {expanded && <Typography sx={{ fontWeight: 800, fontSize: 17, color: '#111827', letterSpacing: '-0.3px' }}>ARA Payroll</Typography>}
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
                                <Typography className="sec-label" sx={{ fontSize: 10.5, fontWeight: 700, color: '#9AA3B2', letterSpacing: '0.8px', textTransform: 'uppercase', transition: 'color .15s' }}>
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
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#EBEFF5' }}>
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

                    <IconButton size="small" sx={{ color: '#5B6472' }}>
                        <Badge color="error" variant="dot" overlap="circular"><NotificationsNoneRoundedIcon /></Badge>
                    </IconButton>

                    <Stack direction="row" spacing={1.2} onClick={(e) => setAnchor(e.currentTarget)} sx={{ alignItems: 'center', cursor: 'pointer', pl: { xs: 0, sm: 1 }, borderLeft: { xs: 'none', sm: '1px solid #EDEFF4' } }}>
                        <Avatar sx={{ width: 38, height: 38, background: GRADIENT, fontSize: 14, fontWeight: 700 }}>{initials}</Avatar>
                        <Box sx={{ display: { xs: 'none', md: 'block' }, lineHeight: 1.2 }}>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#111827' }}>{auth.userName || 'User'}</Typography>
                            <Typography sx={{ fontSize: 11.5, color: '#98A0AE' }}>{auth.role || 'Member'}</Typography>
                        </Box>
                    </Stack>

                    <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { mt: 1, borderRadius: '14px', minWidth: 210, boxShadow: '0 12px 34px rgba(15,23,42,0.14)' } } }}>
                        <Box sx={{ px: 2, py: 1.2 }}>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{auth.userName || 'User'}</Typography>
                            <Typography sx={{ fontSize: 12, color: '#98A0AE' }}>{auth.email}</Typography>
                        </Box>
                        <Divider />
                        <MenuItem onClick={() => setAnchor(null)} sx={{ fontSize: 13.5, py: 1 }}>
                            <ListItemIcon><PersonRoundedIcon sx={{ fontSize: 19 }} /></ListItemIcon> My Profile
                        </MenuItem>
                        <MenuItem onClick={() => setAnchor(null)} sx={{ fontSize: 13.5, py: 1 }}>
                            <ListItemIcon><SettingsRoundedIcon sx={{ fontSize: 19 }} /></ListItemIcon> Settings
                        </MenuItem>
                        <Divider />
                        <MenuItem onClick={handleLogout} sx={{ fontSize: 13.5, py: 1, color: '#DC2626' }}>
                            <ListItemIcon><LogoutRoundedIcon sx={{ fontSize: 19, color: '#DC2626' }} /></ListItemIcon> Log out
                        </MenuItem>
                    </Menu>
                </Box>

                <Box sx={{ p: 0, flexGrow: 1, overflow: 'auto' }}>
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
}
