import React, { useState, useEffect } from 'react';
import {
    Box, Card, CardContent, Grid, Typography, IconButton, Button, Chip,
    CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Avatar, TextField, InputAdornment, Menu, MenuItem, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';
import EventIcon from '@mui/icons-material/Event';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import CircleIcon from '@mui/icons-material/Circle';
import CheckIcon from '@mui/icons-material/Check';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import HistoryToggleOffIcon from '@mui/icons-material/HistoryToggleOff';
import http from '../../Api/http';
import { getLeaveApprovalDashboard, GetLeaveTypes } from '../../Api/Api';
import useFinancialYear from '../../hooks/useFinancialYear';
import SnackBar from '../SnackBar';
import { useSelector } from 'react-redux';
import ApplyLeavePage from './ApplyLeavePage';
import ApprovalWorkflowPage from './ApprovalWorkflowPage';
import MyLeaveStatusPage from './MyLeaveStatusPage';


// ─── Theme (matches other Leave & Attendance tabs) ─────────────────────────
const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_DARK = '#6246E0';
const PRIMARY_BORDER = '#C9BEFB';

// ─── Style maps ─────────────────────────────────────────────────────────────
const STATUS_STYLE = {
    Approved: { color: '#6246E0', bg: '#F1EEFE', border: '#C9BEFB', icon: CheckCircleIcon },
    Pending:  { color: '#B45309', bg: '#E0F2FE', border: '#BAE6FD', icon: PendingIcon },
    Rejected: { color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', icon: CancelIcon },
};

const LEAVE_TYPE_STYLE = {
    'Sick Leave':      { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    'Casual Leave':    { color: '#6246E0', bg: '#F3F0FE', border: '#C9BEFB' },
    'Planned Leave':   { color: '#16A34A', bg: '#EFF5FF', border: '#C9BEFB' },
    'Emergency Leave': { color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
};

const AVATAR_PALETTE = ['#0E7490', '#1D4ED8', '#C2410C', '#6246E0', '#1D4ED8', '#BE185D', '#A16207', '#0F766E'];
const avatarColorFor = (name = '') => {
    const code = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0);
    return AVATAR_PALETTE[code % AVATAR_PALETTE.length];
};

const getInitials = (name = '') =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

// API returns "Approved" / "Pending" / "Rejected" with mixed casing — normalize for our maps.
const normalizeLeaveStatus = (s) => {
    if (!s) return 'Pending';
    const v = String(s).toLowerCase();
    if (v.startsWith('approve')) return 'Approved';
    if (v.startsWith('reject'))  return 'Rejected';
    return 'Pending';
};

// ─── Period label helpers (handles both UI labels & API enum values) ───────
const PERIOD_LABEL = {
    'Monthly':     'month',
    'Quarterly':   'quarter',
    'Half-Yearly': 'half-year',
    'HalfYearly':  'half-year',
    'Yearly':      'year',
};

const periodToLabel = (p) => PERIOD_LABEL[p] || 'year';

const formatAllocation = (lt) => {
    const days = Number(lt?.daysPerPeriod) || 0;
    if (days === 0) return { value: 'On Demand', unit: '' };
    const period = periodToLabel(lt?.allocationPeriod);
    return { value: `${days} ${days === 1 ? 'day' : 'days'}`, unit: `/ ${period}` };
};

// ─── Sub-tab definitions ────────────────────────────────────────────────────
const SUB_TABS = [
    { key: 'allLeaves',       label: 'All Leaves',  color: '#374151', icon: null },
    { key: 'pendingApproval', label: 'Pending',     color: '#B45309', icon: PendingIcon },
    { key: 'approved',        label: 'Approved',    color: '#6246E0', icon: CheckCircleIcon },
    { key: 'rejected',        label: 'Rejected',    color: '#B91C1C', icon: CancelIcon },
];

export default function LeaveManagementPage({
    isEmbedded = false,
    initialSubView = 'applications',  // 'applications' | 'apply' | 'approval'
    onSubViewChange,
}) {
    const user = useSelector((state) => state.auth);
    const userType = user.userType;
    const isAdmin = userType === 'superadmin' || userType === 'admin';
    const isSuperAdmin = userType === 'superadmin';

    // ─── Sub-view (Applications / Apply Leave / Leave Approval) ──────────────
    const [subView, setSubViewState] = useState(initialSubView);
    // Sync from parent when the parent updates the requested initial view
    useEffect(() => {
        if (initialSubView && initialSubView !== subView) setSubViewState(initialSubView);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialSubView]);
    const setSubView = (v) => {
        setSubViewState(v);
        if (onSubViewChange) onSubViewChange(v);
    };
    // Non-admins should never land on approval, even if parent requests it
    const effectiveSubView =
        (!isAdmin && subView === 'approval') || (isSuperAdmin && subView === 'myStatus')
            ? 'applications'
            : subView;

    // ─── State ──────────────────────────────────────────────────────────────
    const [leaveTab, setLeaveTab] = useState(0);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [typeMenuAnchor, setTypeMenuAnchor] = useState(null);

    // SnackBar
    const [open, setOpen] = useState(false);
    const [status] = useState(false);
    const [color] = useState(false);
    const [message] = useState('');

    // API data
    const [dashboardData, setDashboardData] = useState({
        cards: { totalLeavesThisMonth: 0, approved: 0, pending: 0, rejected: 0, approvedPercentOfTotal: 0 },
        leaveBalance: [],
        applications: { allLeaves: [], pendingApproval: [], approved: [], rejected: [] },
    });
    const [isFetching, setIsFetching] = useState(false);

    // Available leave types (from Leave Master config)
    const [availableLeaveTypes, setAvailableLeaveTypes] = useState([]);
    const [isFetchingLeaveTypes, setIsFetchingLeaveTypes] = useState(false);

    // ─── Fetch (Leave Approval Dashboard) ────────────────────────────────────
    // GET /getLeaveApprovalDashboard?RollNumber=...&AcademicYear=YYYY-YYYY
    // Response shape:
    //   { error, cards: { pendingCount, approvedCount, rejectedCount },
    //     pending: [...], approved: [...], rejected: [...] }
    // We normalize the API's three buckets into the page's existing state shape:
    //   applications: { allLeaves, pendingApproval, approved, rejected }
    // and synthesise the KPI cards (totalLeavesThisMonth + approvedPercentOfTotal)
    // that the existing UI expects.
    const rollNumber = user?.rollNumber;
    const financialYear = useFinancialYear();

    const fetchDashboard = async () => {
        if (!rollNumber || !financialYear) return;
        setIsFetching(true);
        try {
            // `AcademicYear` is still the field name on this legacy endpoint; the
            // value is the company's financial year.
            const res = await http.get(getLeaveApprovalDashboard, {
                params: { RollNumber: rollNumber, AcademicYear: financialYear },
            });
            const body = res?.data;
            if (!body || body.error) {
                setDashboardData(prev => ({
                    ...prev,
                    cards: { totalLeavesThisMonth: 0, approved: 0, pending: 0, rejected: 0, approvedPercentOfTotal: 0 },
                    applications: { allLeaves: [], pendingApproval: [], approved: [], rejected: [] },
                }));
                return;
            }

            const apiCards = body.cards || {};
            const pending   = Array.isArray(body.pending)  ? body.pending  : [];
            const approved  = Array.isArray(body.approved) ? body.approved : [];
            const rejected  = Array.isArray(body.rejected) ? body.rejected : [];

            // Make sure each row carries a normalized `status` so the existing
            // chip renderer picks the right colour even if the API omits it.
            const stamp = (rows, status) => rows.map(r => ({ ...r, status: normalizeLeaveStatus(r.status) || status }));
            const pendingRows  = stamp(pending,  'Pending');
            const approvedRows = stamp(approved, 'Approved');
            const rejectedRows = stamp(rejected, 'Rejected');

            const pendingCount  = Number(apiCards.pendingCount)  || pendingRows.length;
            const approvedCount = Number(apiCards.approvedCount) || approvedRows.length;
            const rejectedCount = Number(apiCards.rejectedCount) || rejectedRows.length;
            const total = pendingCount + approvedCount + rejectedCount;
            const approvedPct = total > 0 ? Math.round((approvedCount / total) * 100) : 0;

            setDashboardData(prev => ({
                ...prev,
                cards: {
                    totalLeavesThisMonth: total,
                    approved: approvedCount,
                    pending:  pendingCount,
                    rejected: rejectedCount,
                    approvedPercentOfTotal: approvedPct,
                },
                applications: {
                    allLeaves:       [...pendingRows, ...approvedRows, ...rejectedRows],
                    pendingApproval: pendingRows,
                    approved:        approvedRows,
                    rejected:        rejectedRows,
                },
            }));
        } catch (error) {
            console.error('Error fetching leave approval dashboard:', error);
            setDashboardData(prev => ({
                ...prev,
                cards: { totalLeavesThisMonth: 0, approved: 0, pending: 0, rejected: 0, approvedPercentOfTotal: 0 },
                applications: { allLeaves: [], pendingApproval: [], approved: [], rejected: [] },
            }));
        } finally {
            setIsFetching(false);
        }
    };

    const fetchLeaveTypes = async () => {
        if (!financialYear) return;
        setIsFetchingLeaveTypes(true);
        try {
            const res = await http.get(GetLeaveTypes, {
                params: { financialYear },
            });
            // Tolerate common envelope shapes: { data: { items: [...] } }, { data: [...] },
            // { items: [...] }, { leaveTypes: [...] }, or plain array.
            const body = res?.data;
            const list = Array.isArray(body) ? body
                : Array.isArray(body?.data?.items) ? body.data.items
                : Array.isArray(body?.data) ? body.data
                : Array.isArray(body?.items) ? body.items
                : Array.isArray(body?.leaveTypes) ? body.leaveTypes
                : [];
            setAvailableLeaveTypes(list);
        } catch (error) {
            console.error('Error fetching leave types:', error);
            setAvailableLeaveTypes([]);
        } finally {
            setIsFetchingLeaveTypes(false);
        }
    };

    useEffect(() => {
        fetchLeaveTypes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [financialYear]);

    useEffect(() => {
        if (rollNumber) fetchDashboard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rollNumber, financialYear]);

    // ─── Derived data ───────────────────────────────────────────────────────
    const stats = dashboardData.cards;
    const subTabKey = SUB_TABS[leaveTab].key;
    const rawLeaves = dashboardData.applications[subTabKey] || [];

    const q = search.trim().toLowerCase();
    const filteredLeaves = rawLeaves.filter(l => {
        const matchSearch = !q
            || (l.name || '').toLowerCase().includes(q)
            || String(l.forRollNumber || '').toLowerCase().includes(q)
            || (l.reason || '').toLowerCase().includes(q);
        const matchType = typeFilter === 'all' || l.leaveType === typeFilter;
        return matchSearch && matchType;
    });

    const searchActive = q.length > 0;
    const typeActive = typeFilter !== 'all';
    const anyFilterActive = searchActive || typeActive;
    const activeTypeColor = (LEAVE_TYPE_STYLE[typeFilter]?.color) || '#6B7280';

    // Per-status counts (from allLeaves, so the sub-tab badges show absolute counts)
    const allLeavesArr = dashboardData.applications.allLeaves || [];
    const subTabCounts = {
        allLeaves:       allLeavesArr.length,
        pendingApproval: (dashboardData.applications.pendingApproval || []).length,
        approved:        (dashboardData.applications.approved || []).length,
        rejected:        (dashboardData.applications.rejected || []).length,
    };

    // Distinct leave types found in data (so the dropdown stays honest)
    const typeOptions = (() => {
        const set = new Set(allLeavesArr.map(l => l.leaveType).filter(Boolean));
        return [{ key: 'all', label: 'All Types' }, ...Array.from(set).map(t => ({ key: t, label: t }))];
    })();

    const typeCounts = allLeavesArr.reduce((acc, l) => {
        if (l.leaveType) acc[l.leaveType] = (acc[l.leaveType] || 0) + 1;
        return acc;
    }, {});

    const clearFilters = () => { setSearch(''); setTypeFilter('all'); };

    // Sub-view switchers — local; no longer dependent on parent callbacks
    const handleApplyLeave = () => setSubView('apply');
    const handleApproveLeaves = () => setSubView('approval');
    const goBackToApplications = () => setSubView('applications');

    // ─── KPI cards ──────────────────────────────────────────────────────────
    const kpiCards = [
        { label: 'Total Leaves', value: stats.totalLeavesThisMonth ?? 0, sub: 'This Month',                                     color: '#7C5CFC', bg: '#F1EEFE', icon: EventIcon },
        { label: 'Approved',     value: stats.approved ?? 0,             sub: `${stats.approvedPercentOfTotal ?? 0}% of total`, color: '#16A34A', bg: '#DCFCE7', icon: CheckCircleIcon },
        { label: 'Pending',      value: stats.pending ?? 0,              sub: 'Needs Review',                                   color: '#F59E0B', bg: '#FFF7ED', icon: PendingIcon },
        { label: 'Rejected',     value: stats.rejected ?? 0,             sub: 'Declined',                                       color: '#E11D48', bg: '#FEE2E2', icon: CancelIcon },
    ];

    // ─── Status & leave-type chip renderers ────────────────────────────────
    const renderStatusChip = (s) => {
        const cfg = STATUS_STYLE[s] || STATUS_STYLE.Pending;
        const Icon = cfg.icon;
        return (
            <Chip
                size="small" label={s}
                icon={<Icon sx={{ fontSize: '12px !important' }} />}
                sx={{
                    bgcolor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                    fontWeight: 700, fontSize: '10.5px', height: 22,
                    '& .MuiChip-icon': { color: 'inherit', ml: '6px' },
                }}
            />
        );
    };

    const renderLeaveTypeChip = (lt) => {
        const cfg = LEAVE_TYPE_STYLE[lt] || { color: '#374151', bg: '#F3F4F6', border: '#E5E7EB' };
        return (
            <Chip
                size="small" label={lt}
                sx={{
                    bgcolor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                    fontWeight: 600, fontSize: '10.5px', height: 22,
                }}
            />
        );
    };

    // ────────────────────────────────────────────────────────────────────────
    return (
        <>
            <SnackBar open={open} color={color} setOpen={setOpen} status={status} message={message} />

            <Box sx={{ p: isEmbedded ? 0 : 2 }}>
                {/* Standalone Header */}
                {!isEmbedded && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
                        <Box>
                            <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>
                                Leave Management
                            </Typography>
                            <Typography sx={{ fontSize: 13, color: '#6B7280', mt: 0.3 }}>
                                Manage staff leave applications and approvals
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button startIcon={<AddIcon />} onClick={handleApplyLeave}
                                sx={{
                                    textTransform: 'none', borderRadius: '7px',
                                    bgcolor: PRIMARY, color: '#fff', fontSize: 12.5, fontWeight: 700, px: 2.2, height: 42,
                                    boxShadow: `0 2px 6px ${PRIMARY}40`,
                                    '&:hover': { bgcolor: PRIMARY_DARK },
                                }}>
                                Apply Leave
                            </Button>
                            <Button startIcon={<FileDownloadIcon />}
                                sx={{
                                    textTransform: 'none', borderRadius: '7px',
                                    color: '#334155', bgcolor: '#F1F5F9',
                                    fontSize: 12.5, fontWeight: 700, px: 2, height: 42,
                                    '&:hover': { bgcolor: '#E2E8F0' },
                                }}>
                                Export
                            </Button>
                        </Box>
                    </Box>
                )}

                {/* ─── Sub-view switcher: Applications / Apply Leave / Approval ─── */}
                {(() => {
                    const SUB_VIEWS = [
                        { key: 'applications', label: 'Applications', icon: ListAltOutlinedIcon,    color: PRIMARY },
                        { key: 'apply',        label: 'Apply Leave',  icon: EventNoteOutlinedIcon, color: '#7C5CFC' },
                        // Super Admin leaves are auto-approved — no "My Requests" tab.
                        ...(!isSuperAdmin ? [
                            { key: 'myStatus', label: 'My Requests', icon: HistoryToggleOffIcon, color: '#2563EB' },
                        ] : []),
                        ...(isAdmin ? [
                            { key: 'approval', label: 'Leave Approval', icon: FactCheckOutlinedIcon, color: '#6246E0' },
                        ] : []),
                    ];
                    return (
                        <Box sx={{
                            display: 'flex', gap: 0.6, mb: 2,
                            p: 0.4, borderRadius: '7px',
                            bgcolor: '#F3F4F6', border: '1px solid #E5E7EB',
                            width: 'fit-content', flexWrap: 'wrap',
                        }}>
                            {SUB_VIEWS.map((v) => {
                                const Icon = v.icon;
                                const active = effectiveSubView === v.key;
                                return (
                                    <Box
                                        key={v.key}
                                        onClick={() => setSubView(v.key)}
                                        sx={{
                                            px: 1.6, py: 0.7, borderRadius: '7px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: 0.8,
                                            transition: 'all 0.15s',
                                            bgcolor: active ? '#fff' : 'transparent',
                                            boxShadow: active ? '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' : 'none',
                                            '&:hover': { bgcolor: active ? '#fff' : 'rgba(255,255,255,0.55)' },
                                        }}
                                    >
                                        <Icon sx={{ fontSize: 16, color: active ? v.color : '#9CA3AF' }} />
                                        <Typography sx={{
                                            fontSize: '12.5px',
                                            fontWeight: active ? 700 : 600,
                                            color: active ? v.color : '#6B7280',
                                        }}>
                                            {v.label}
                                        </Typography>
                                    </Box>
                                );
                            })}
                        </Box>
                    );
                })()}

                {/* ─── Apply Leave sub-view ─── */}
                {effectiveSubView === 'apply' && (
                    <ApplyLeavePage
                        onSuccess={goBackToApplications}
                        onCancel={goBackToApplications}
                    />
                )}

                {/* ─── My Requests sub-view (logged-in user's own leave status) ─── */}
                {effectiveSubView === 'myStatus' && !isSuperAdmin && (
                    <MyLeaveStatusPage />
                )}

                {/* ─── Leave Approval sub-view (admin only) ─── */}
                {effectiveSubView === 'approval' && isAdmin && (
                    <ApprovalWorkflowPage isEmbedded={true} />
                )}

                {/* ─── Applications sub-view (default) ─── */}
                {effectiveSubView === 'applications' && (
                <Grid container spacing={2}>
                    {/* ─── Main Column ─── */}
                    <Grid size={{ xs: 12, lg: 9 }}>
                        {/* KPI Cards (hidden for teacher) */}
                        {userType !== 'teacher' && (
                            <Grid container spacing={2} sx={{ mb: 2 }}>
                                {kpiCards.map((card) => {
                                    const Icon = card.icon;
                                    return (
                                        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.label}>
                                            <Box sx={{
                                                p: 2.5, borderRadius: '7px', bgcolor: card.bg,
                                                border: `1px solid ${card.color}22`,
                                                boxShadow: '0 1px 3px rgba(16,24,40,0.06)', height: '100%',
                                                transition: 'transform 0.15s, box-shadow 0.15s',
                                                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 20px ${card.color}22` },
                                            }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <Box sx={{ minWidth: 0 }}>
                                                        <Typography sx={{ fontSize: '11px', color: card.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                            {card.label}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', lineHeight: 1.2, mt: 0.5 }}>
                                                            {card.value}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '10.5px', color: '#6B7280', fontWeight: 600, mt: 0.3 }}>
                                                            {card.sub}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{
                                                        width: 44, height: 44, borderRadius: '7px',
                                                        bgcolor: '#fff', boxShadow: '0 1px 3px rgba(16,24,40,0.08)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ml: 1,
                                                    }}>
                                                        <Icon sx={{ color: card.color, fontSize: 22 }} />
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        )}

                        {/* Applications Card */}
                        <Card sx={{ border: '1px solid #E5E7EB', borderRadius: '7px', boxShadow: 'none', bgcolor: '#fff' }}>
                            <CardContent sx={{ pb: '12px !important' }}>
                                {/* Title row */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                        <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                                            Leave Applications
                                        </Typography>
                                        <Chip
                                            label={`${rawLeaves.length} total`}
                                            size="small"
                                            sx={{ bgcolor: '#F3F4F6', color: '#374151', fontWeight: 600, fontSize: '11px', height: 20 }}
                                        />
                                    </Box>
                                </Box>

                                {/* Sub-tabs as segmented pill control */}
                                <Box sx={{
                                    display: 'flex', gap: 0.6, mb: 1.5,
                                    p: 0.4, borderRadius: '7px',
                                    bgcolor: '#F3F4F6', border: '1px solid #E5E7EB',
                                    width: 'fit-content', flexWrap: 'wrap',
                                }}>
                                    {SUB_TABS.map((t, idx) => {
                                        const Icon = t.icon;
                                        const active = leaveTab === idx;
                                        const count = subTabCounts[t.key] || 0;
                                        return (
                                            <Box
                                                key={t.key}
                                                onClick={() => setLeaveTab(idx)}
                                                sx={{
                                                    px: 1.4, py: 0.6, borderRadius: '7px', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: 0.7,
                                                    transition: 'all 0.15s',
                                                    bgcolor: active ? '#fff' : 'transparent',
                                                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' : 'none',
                                                    '&:hover': { bgcolor: active ? '#fff' : 'rgba(255,255,255,0.55)' },
                                                }}
                                            >
                                                {Icon && <Icon sx={{ fontSize: 14, color: active ? t.color : '#9CA3AF' }} />}
                                                <Typography sx={{
                                                    fontSize: '12px',
                                                    fontWeight: active ? 700 : 600,
                                                    color: active ? t.color : '#6B7280',
                                                }}>
                                                    {t.label}
                                                </Typography>
                                                <Box sx={{
                                                    px: 0.7, py: 0.05, borderRadius: '7px', minWidth: 18, textAlign: 'center',
                                                    bgcolor: active ? `${t.color}15` : '#fff',
                                                    border: `1px solid ${active ? `${t.color}30` : '#E5E7EB'}`,
                                                }}>
                                                    <Typography sx={{ fontSize: '10px', fontWeight: 800, color: active ? t.color : '#9CA3AF' }}>
                                                        {count}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Box>

                                {/* Filter toolbar */}
                                <Box sx={{
                                    p: 1.2, mb: 1.5, borderRadius: '7px',
                                    border: '1px solid #E5E7EB', bgcolor: '#FAFAFA',
                                    display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center',
                                }}>
                                    {/* Search */}
                                    <TextField
                                        size="small"
                                        placeholder="Search name, roll no, or reason..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        slotProps={{
                                            input: {
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <SearchIcon sx={{ fontSize: 16, color: searchActive ? PRIMARY : '#9CA3AF' }} />
                                                    </InputAdornment>
                                                ),
                                                endAdornment: searchActive ? (
                                                    <InputAdornment position="end">
                                                        <IconButton size="small" onClick={() => setSearch('')} sx={{ p: 0.3 }}>
                                                            <CloseIcon sx={{ fontSize: 14, color: '#9CA3AF' }} />
                                                        </IconButton>
                                                    </InputAdornment>
                                                ) : null,
                                            },
                                        }}
                                        sx={{
                                            flex: 1, minWidth: 220, maxWidth: 320,
                                            '& .MuiOutlinedInput-root': {
                                                height: 34, fontSize: '12.5px', borderRadius: '7px',
                                                bgcolor: searchActive ? PRIMARY_LIGHT : '#fff',
                                                '& fieldset': { borderColor: searchActive ? PRIMARY_BORDER : '#E5E7EB' },
                                                '&:hover fieldset': { borderColor: '#D1D5DB' },
                                                '&.Mui-focused fieldset': { borderColor: PRIMARY },
                                            },
                                        }}
                                    />

                                    {/* Type dropdown button */}
                                    <Button
                                        onClick={(e) => setTypeMenuAnchor(e.currentTarget)}
                                        startIcon={<CategoryOutlinedIcon sx={{ fontSize: 16 }} />}
                                        endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
                                        sx={{
                                            textTransform: 'none', fontSize: '12.5px', fontWeight: 600,
                                            height: 34, borderRadius: '7px', px: 1.5,
                                            color: typeActive ? '#fff' : '#374151',
                                            bgcolor: typeActive ? activeTypeColor : '#fff',
                                            border: `1px solid ${typeActive ? activeTypeColor : '#E5E7EB'}`,
                                            '&:hover': {
                                                bgcolor: typeActive ? activeTypeColor : '#F9FAFB',
                                                filter: typeActive ? 'brightness(0.95)' : 'none',
                                            },
                                        }}
                                    >
                                        {typeActive ? typeFilter : 'Leave Type'}
                                    </Button>
                                    <Menu
                                        anchorEl={typeMenuAnchor}
                                        open={Boolean(typeMenuAnchor)}
                                        onClose={() => setTypeMenuAnchor(null)}
                                        slotProps={{
                                            paper: {
                                                sx: {
                                                    mt: 0.6, borderRadius: '7px',
                                                    border: '1px solid #E5E7EB',
                                                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                                                    minWidth: 220,
                                                },
                                            },
                                        }}
                                    >
                                        {typeOptions.map((opt) => {
                                            const isActive = typeFilter === opt.key;
                                            const cfg = LEAVE_TYPE_STYLE[opt.key] || { color: '#6B7280' };
                                            const count = opt.key === 'all' ? allLeavesArr.length : (typeCounts[opt.key] || 0);
                                            return (
                                                <MenuItem
                                                    key={opt.key}
                                                    onClick={() => { setTypeFilter(opt.key); setTypeMenuAnchor(null); }}
                                                    sx={{
                                                        py: 0.8, px: 1.2, gap: 1,
                                                        bgcolor: isActive ? `${cfg.color}10` : 'transparent',
                                                        '&:hover': { bgcolor: `${cfg.color}15` },
                                                    }}
                                                >
                                                    <CircleIcon sx={{ fontSize: 9, color: cfg.color, flexShrink: 0 }} />
                                                    <Typography sx={{
                                                        fontSize: '13px',
                                                        fontWeight: isActive ? 700 : 500,
                                                        color: isActive ? cfg.color : '#374151', flex: 1,
                                                    }}>
                                                        {opt.label}
                                                    </Typography>
                                                    <Box sx={{
                                                        px: 0.7, py: 0.1, borderRadius: '7px',
                                                        bgcolor: isActive ? '#fff' : '#F3F4F6',
                                                        border: `1px solid ${isActive ? `${cfg.color}30` : '#E5E7EB'}`,
                                                    }}>
                                                        <Typography sx={{ fontSize: '10.5px', fontWeight: 700, color: isActive ? cfg.color : '#6B7280' }}>
                                                            {count}
                                                        </Typography>
                                                    </Box>
                                                    {isActive && <CheckIcon sx={{ fontSize: 15, color: cfg.color, ml: 0.4 }} />}
                                                </MenuItem>
                                            );
                                        })}
                                    </Menu>

                                    {/* Clear filters */}
                                    {anyFilterActive && (
                                        <Button
                                            size="small"
                                            startIcon={<RestartAltIcon sx={{ fontSize: 15 }} />}
                                            onClick={clearFilters}
                                            sx={{
                                                textTransform: 'none', fontSize: '12px', fontWeight: 600,
                                                height: 34, borderRadius: '7px', px: 1.2,
                                                color: '#DC2626',
                                                '&:hover': { bgcolor: '#FEF2F2' },
                                            }}
                                        >
                                            Clear
                                        </Button>
                                    )}

                                    {/* Result count */}
                                    <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                        <Typography sx={{ fontSize: '11.5px', color: '#6B7280' }}>Showing</Typography>
                                        <Typography sx={{ fontSize: '13px', fontWeight: 800, color: anyFilterActive ? PRIMARY_DARK : '#111827' }}>
                                            {filteredLeaves.length}
                                        </Typography>
                                        <Typography sx={{ fontSize: '11.5px', color: '#6B7280' }}>
                                            of {rawLeaves.length}
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Table */}
                                <TableContainer sx={{ borderRadius: '7px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow sx={{ bgcolor: PRIMARY_LIGHT, borderBottom: `1px solid ${PRIMARY_BORDER}` }}>
                                                {['Staff Member', 'Leave Type', 'Duration', 'Days', 'Reason', 'Status'].map(h => (
                                                    <TableCell key={h} sx={{
                                                        fontWeight: 700, fontSize: '10px', color: PRIMARY_DARK,
                                                        textTransform: 'uppercase', whiteSpace: 'nowrap',
                                                        letterSpacing: 0.6, py: 1.3, borderBottom: 'none',
                                                    }}>{h}</TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {isFetching ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 5, borderBottom: 'none' }}>
                                                        <CircularProgress size={28} sx={{ color: PRIMARY }} />
                                                    </TableCell>
                                                </TableRow>
                                            ) : filteredLeaves.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 5, borderBottom: 'none' }}>
                                                        <Typography sx={{ fontSize: '13px', color: '#9CA3AF', fontWeight: 600 }}>
                                                            {rawLeaves.length === 0 ? 'No leave applications found' : 'No leaves match your filters'}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '11px', color: '#9CA3AF', mt: 0.5 }}>
                                                            {rawLeaves.length === 0 ? 'When applications are submitted, they will appear here.' : 'Try changing or clearing your filters above.'}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ) : filteredLeaves.map((leave, idx) => {
                                                const avColor = avatarColorFor(leave.name || '');
                                                return (
                                                    <TableRow
                                                        key={leave.leaveApplicationId || idx}
                                                        sx={{
                                                            '&:hover': { bgcolor: PRIMARY_LIGHT },
                                                            borderBottom: '1px solid #F3F4F6',
                                                            transition: 'background-color 0.15s',
                                                        }}
                                                    >
                                                        <TableCell sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                                                <Avatar sx={{
                                                                    width: 34, height: 34,
                                                                    bgcolor: `${avColor}15`, color: avColor,
                                                                    fontSize: '11px', fontWeight: 700,
                                                                    border: `1px solid ${avColor}33`,
                                                                }}>
                                                                    {getInitials(leave.name)}
                                                                </Avatar>
                                                                <Box>
                                                                    <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                                                                        {leave.name}
                                                                    </Typography>
                                                                    <Typography sx={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 500, fontFamily: 'monospace' }}>
                                                                        {leave.forRollNumber}
                                                                    </Typography>
                                                                </Box>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                            {renderLeaveTypeChip(leave.leaveType)}
                                                        </TableCell>
                                                        <TableCell sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                                                                {leave.fromDate}
                                                            </Typography>
                                                            <Typography sx={{ fontSize: '10.5px', color: '#9CA3AF' }}>
                                                                to {leave.toDate}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                            <Box sx={{
                                                                display: 'inline-flex', alignItems: 'center', gap: 0.4,
                                                                px: 0.8, py: 0.2, borderRadius: '7px',
                                                                bgcolor: '#EEF2FF', border: '1px solid #C7D2FE',
                                                            }}>
                                                                <Typography sx={{ fontSize: '12px', fontWeight: 800, color: '#4338CA', fontFamily: 'monospace' }}>
                                                                    {leave.days}
                                                                </Typography>
                                                                <Typography sx={{ fontSize: '10px', color: '#4338CA', fontWeight: 600 }}>
                                                                    {leave.days > 1 ? 'days' : 'day'}
                                                                </Typography>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell sx={{ borderBottom: '1px solid #F3F4F6', maxWidth: 220 }}>
                                                            <Tooltip title={leave.reason || ''} arrow placement="top">
                                                                <Typography sx={{
                                                                    fontSize: '12px', color: '#4B5563',
                                                                    overflow: 'hidden', textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap', maxWidth: 220,
                                                                }}>
                                                                    {leave.reason || '—'}
                                                                </Typography>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                            {renderStatusChip(leave.status)}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* ─── Right Side Panel ─── */}
                    <Grid size={{ xs: 12, lg: 3 }}>
                        {/* Available Leave Types (from Leave Master config) */}
                        <Card sx={{
                            border: '1px solid #E5E7EB', borderRadius: '7px',
                            boxShadow: 'none', bgcolor: '#fff', mb: 2,
                        }}>
                            <CardContent sx={{ pb: '12px !important' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
                                    <Box sx={{
                                        width: 28, height: 28, borderRadius: '7px',
                                        bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <EventIcon sx={{ color: PRIMARY, fontSize: 16 }} />
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>
                                            Available Leave Types
                                        </Typography>
                                        <Typography sx={{ fontSize: '10.5px', color: '#6B7280', mt: 0.1 }}>
                                            Configured in Leave Master
                                        </Typography>
                                    </Box>
                                    {availableLeaveTypes.length > 0 && (
                                        <Chip
                                            label={availableLeaveTypes.length}
                                            size="small"
                                            sx={{
                                                height: 20, minWidth: 22, fontSize: '11px', fontWeight: 800,
                                                bgcolor: PRIMARY_LIGHT, color: PRIMARY_DARK,
                                                border: `1px solid ${PRIMARY_BORDER}`,
                                            }}
                                        />
                                    )}
                                </Box>

                                {isFetchingLeaveTypes ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                                        <CircularProgress size={22} sx={{ color: PRIMARY }} />
                                    </Box>
                                ) : availableLeaveTypes.length === 0 ? (
                                    <Box sx={{ py: 2.5, textAlign: 'center' }}>
                                        <Typography sx={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 600 }}>
                                            No leave types configured
                                        </Typography>
                                        <Typography sx={{ fontSize: '10.5px', color: '#9CA3AF', mt: 0.3 }}>
                                            Create them from the Leave Master screen.
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.7 }}>
                                        {availableLeaveTypes.map((lt, i) => {
                                            const color = lt.color || PRIMARY;
                                            const shortCode = (lt.shortCode || lt.name || '?').slice(0, 3).toUpperCase();
                                            const alloc = formatAllocation(lt);
                                            const onDemand = (Number(lt.daysPerPeriod) || 0) === 0;
                                            return (
                                                <Box
                                                    key={lt.id || lt._id || i}
                                                    sx={{
                                                        p: 1, borderRadius: '7px',
                                                        bgcolor: '#FAFAFA', border: '1px solid #E5E7EB',
                                                        display: 'flex', alignItems: 'center', gap: 1,
                                                        transition: 'all 0.15s',
                                                        '&:hover': {
                                                            bgcolor: `${color}08`,
                                                            borderColor: `${color}40`,
                                                        },
                                                    }}
                                                >
                                                    {/* Short-code badge */}
                                                    <Box sx={{
                                                        minWidth: 36, height: 30, borderRadius: '7px', px: 0.7,
                                                        bgcolor: `${color}15`, border: `1px solid ${color}40`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        flexShrink: 0,
                                                    }}>
                                                        <Typography sx={{
                                                            fontSize: '10.5px', fontWeight: 800,
                                                            color, letterSpacing: 0.4, fontFamily: 'monospace',
                                                        }}>
                                                            {shortCode}
                                                        </Typography>
                                                    </Box>
                                                    {/* Name + allocation */}
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography sx={{
                                                            fontSize: '12px', fontWeight: 700, color: '#111827',
                                                            lineHeight: 1.15,
                                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                        }}>
                                                            {lt.name || '—'}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.4, mt: 0.1 }}>
                                                            <Typography sx={{
                                                                fontSize: onDemand ? '10.5px' : '12px',
                                                                fontWeight: 800,
                                                                color: onDemand ? '#9CA3AF' : color,
                                                                fontFamily: onDemand ? 'inherit' : 'monospace',
                                                            }}>
                                                                {alloc.value}
                                                            </Typography>
                                                            {alloc.unit && (
                                                                <Typography sx={{ fontSize: '10px', color: '#6B7280', fontWeight: 600 }}>
                                                                    {alloc.unit}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                )}
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <Card sx={{
                            border: '1px solid #E5E7EB', borderRadius: '7px',
                            boxShadow: 'none', bgcolor: '#fff',
                        }}>
                            <CardContent sx={{ pb: '12px !important' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2 }}>
                                    <Box sx={{
                                        width: 28, height: 28, borderRadius: '7px',
                                        bgcolor: '#EEF2FF', border: '1px solid #C7D2FE',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <AddIcon sx={{ color: '#4338CA', fontSize: 16 }} />
                                    </Box>
                                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                                        Quick Actions
                                    </Typography>
                                </Box>

                                <Box sx={{
                                    p: 1.2, mb: 1, borderRadius: '7px',
                                    bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`,
                                }}>
                                    <Typography sx={{ fontSize: '12px', fontWeight: 700, color: PRIMARY_DARK, mb: 0.2 }}>
                                        Apply for Leave
                                    </Typography>
                                    <Typography sx={{ fontSize: '10.5px', color: '#4B5563', mb: 1 }}>
                                        Submit a new leave request with dates and reason.
                                    </Typography>
                                    <Button
                                        fullWidth variant="contained"
                                        startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                                        onClick={handleApplyLeave}
                                        sx={{
                                            textTransform: 'none', fontSize: '12px', fontWeight: 700,
                                            bgcolor: PRIMARY, color: '#fff', borderRadius: '7px',
                                            boxShadow: `0 2px 6px ${PRIMARY}33`,
                                            '&:hover': { bgcolor: PRIMARY_DARK, boxShadow: `0 4px 12px ${PRIMARY}55` },
                                        }}
                                    >
                                        Apply Leave
                                    </Button>
                                </Box>

                                {(userType === 'superadmin' || userType === 'admin') && (
                                    <Box sx={{
                                        p: 1.2, borderRadius: '7px',
                                        bgcolor: '#F3F0FE', border: '1px solid #C9BEFB',
                                    }}>
                                        <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#1D4ED8', mb: 0.2 }}>
                                            Approve Leaves
                                        </Typography>
                                        <Typography sx={{ fontSize: '10.5px', color: '#4B5563', mb: 1 }}>
                                            View and approve pending leave requests.
                                        </Typography>
                                        <Button
                                            fullWidth variant="outlined"
                                            startIcon={<FactCheckOutlinedIcon sx={{ fontSize: 16 }} />}
                                            onClick={handleApproveLeaves}
                                            sx={{
                                                textTransform: 'none', fontSize: '12px', fontWeight: 700,
                                                borderColor: '#C9BEFB', color: '#1D4ED8', borderRadius: '7px',
                                                bgcolor: '#fff',
                                                '&:hover': { borderColor: '#6246E0', bgcolor: '#F3F0FE' },
                                            }}
                                        >
                                            Go to Approvals
                                        </Button>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
                )}
            </Box>
        </>
    );
}
