import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Card, CardContent, Grid, Typography, IconButton, Button,
    Chip, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Dialog, DialogTitle, DialogContent, DialogActions,
    LinearProgress, CircularProgress, Avatar, Menu, MenuItem,
    InputAdornment, Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CloseIcon from '@mui/icons-material/Close';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import CircleIcon from '@mui/icons-material/Circle';
import CheckIcon from '@mui/icons-material/Check';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import InsertChartOutlinedIcon from '@mui/icons-material/InsertChartOutlined';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { reportsLeaveManagement, reportsLeaveManagementFullReport } from '../../Api/Api';
import SnackBar from '../SnackBar';

const token = "123";

// ─── Theme (matches other Leave & Attendance tabs) ─────────────────────────
const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_DARK = '#6246E0';
const PRIMARY_BORDER = '#C9BEFB';

// ─── Status / category config ──────────────────────────────────────────────
const STATUS_STYLE = {
    Present: { color: '#6246E0', bg: '#F1EEFE', border: '#C9BEFB', icon: CheckCircleIcon },
    Late:    { color: '#B45309', bg: '#E0F2FE', border: '#BAE6FD', icon: AccessTimeIcon  },
    Absent:  { color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', icon: CancelIcon      },
    Leave:   { color: '#5B21B6', bg: '#F3F0FE', border: '#C9BEFB', icon: EventBusyIcon   },
};

const CATEGORY_STYLE = {
    'Teaching Staff':     { color: '#1D4ED8', bg: '#F3F0FE', border: '#C9BEFB' },
    'Non Teaching Staff': { color: '#0E7490', bg: '#ECFEFF', border: '#A5F3FC' },
    'Supporting Staff':   { color: '#C2410C', bg: '#FFF7ED', border: '#FED7AA' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
const isoFromDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const getTodayInput = () => isoFromDate(new Date());
const inputToApi = (str) => {
    if (!str) return '';
    const [y, m, d] = str.split('-');
    return `${d}-${m}-${y}`;
};

const mapCategory = (cat = '') => {
    const c = cat.toLowerCase();
    if (c === 'teaching')    return 'Teaching Staff';
    if (c === 'nonteaching') return 'Non Teaching Staff';
    if (c === 'supporting')  return 'Supporting Staff';
    return cat;
};

const mapCategoryToApi = (display) => {
    if (display === 'Teaching Staff')     return 'teaching';
    if (display === 'Non Teaching Staff') return 'nonteaching';
    if (display === 'Supporting Staff')   return 'supporting';
    return '';
};

const normalizeStatus = (status = '') => {
    const s = String(status).toLowerCase().trim();
    if (s === 'present') return 'Present';
    if (s === 'late') return 'Late';
    if (s === 'absent') return 'Absent';
    if (s === 'leave' || s === 'on leave' || s === 'onleave') return 'Leave';
    return '';
};

// Avatar color
const AVATAR_PALETTE = ['#0E7490', '#1D4ED8', '#C2410C', '#6246E0', '#1D4ED8', '#BE185D', '#A16207', '#0F766E'];
const avatarColorFor = (name = '') => {
    const code = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0);
    return AVATAR_PALETTE[code % AVATAR_PALETTE.length];
};

const getInitials = (name = '') =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

// ─── Date presets (improvement) ────────────────────────────────────────────
const buildPresets = () => {
    const today = new Date();
    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const todayIso = isoFromDate(today);

    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

    const sevenAgo = new Date(today); sevenAgo.setDate(today.getDate() - 6);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd   = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const thirtyAgo = new Date(today); thirtyAgo.setDate(today.getDate() - 29);

    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd   = new Date(today.getFullYear(), today.getMonth(), 0);

    return [
        { key: 'today',     label: 'Today',          from: todayIso,                       to: todayIso },
        { key: 'yesterday', label: 'Yesterday',      from: isoFromDate(yesterday),         to: isoFromDate(yesterday) },
        { key: 'last7',     label: 'Last 7 Days',    from: isoFromDate(sevenAgo),          to: todayIso },
        { key: 'thisMonth', label: 'This Month',     from: isoFromDate(monthStart),        to: isoFromDate(monthEnd) },
        { key: 'last30',    label: 'Last 30 Days',   from: isoFromDate(thirtyAgo),         to: todayIso },
        { key: 'lastMonth', label: 'Last Month',     from: isoFromDate(lastMonthStart),    to: isoFromDate(lastMonthEnd) },
    ];
};

export default function AttendanceReportsPage({ isEmbedded = false }) {
    const navigate = useNavigate();

    // ── Filters ────────────────────────────────────────────────────────────
    const [fromDate, setFromDate] = useState(getTodayInput);
    const [toDate, setToDate]     = useState(getTodayInput);
    const [activePreset, setActivePreset] = useState('today');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter]     = useState('all');
    const [staffSearch, setStaffSearch]       = useState('');

    // Menu anchors
    const [categoryAnchor, setCategoryAnchor] = useState(null);
    const [statusAnchor, setStatusAnchor]     = useState(null);

    // ── API data ───────────────────────────────────────────────────────────
    const [cards, setCards] = useState({ totalStaff: 0, presentDays: 0, lateArrivals: 0, absentDays: 0, leaveDays: 0 });
    const [summary, setSummary] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Full report dialog
    const [reportDialog, setReportDialog] = useState({ open: false, data: null, isLoading: false });

    // SnackBar
    const [snackOpen, setSnackOpen]       = useState(false);
    const [snackStatus, setSnackStatus]   = useState(false);
    const [snackColor, setSnackColor]     = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const showSnack = (msg, success) => {
        setSnackMessage(msg); setSnackOpen(true); setSnackColor(success); setSnackStatus(success);
    };

    const presets = buildPresets();

    // ── Fetch summary ──────────────────────────────────────────────────────
    // GET /reportsLeaveManagement
    //   ?FromDate=YYYY-MM-DD&ToDate=YYYY-MM-DD&Category=<cat>&AttendanceStatus=<status>
    // Dates are sent in the same YYYY-MM-DD format the <input type="date">
    // already produces — no DD-MM-YYYY conversion.
    const fetchReports = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(reportsLeaveManagement, {
                params: {
                    FromDate:         fromDate,
                    ToDate:           toDate,
                    Category:         mapCategoryToApi(categoryFilter === 'all' ? '' : categoryFilter),
                    AttendanceStatus: statusFilter !== 'all' ? statusFilter : '',
                },
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data && !res.data.error) {
                setCards(res.data.cards || {});
                // The new API returns `rollNumber`; older shape used `staffId`.
                // Normalize so the rest of the page can keep reading row.staffId.
                const list = Array.isArray(res.data.summary) ? res.data.summary : [];
                setSummary(list.map(r => ({
                    ...r,
                    staffId: r.staffId || r.rollNumber || '',
                })));
            } else {
                showSnack(res.data?.message || 'Failed to load reports', false);
            }
        } catch (err) {
            console.error('Report fetch error:', err);
            showSnack('Failed to load attendance reports', false);
        } finally {
            setIsLoading(false);
        }
    }, [fromDate, toDate, categoryFilter, statusFilter]);

    useEffect(() => { fetchReports(); }, [fetchReports]);

    // ── Full report ────────────────────────────────────────────────────────
    // GET /reportsLeaveManagementFullReport
    //   ?RollNumber=<roll>&FromDate=YYYY-MM-DD&ToDate=YYYY-MM-DD
    // The dialog stays open in three states:
    //   isLoading: true                → spinner
    //   data: { ...record, hasData }   → full report
    //   data: { empty: true, message } → friendly "no data" view (no toast)
    const fetchFullReport = async (staffId) => {
        // Don't fire the request when the row had no roll number — skip
        // straight to the empty state. Saves a guaranteed-to-fail round-trip.
        if (!staffId || String(staffId).trim().length === 0) {
            setReportDialog({
                open: true,
                isLoading: false,
                data: { empty: true, message: 'This staff member has no roll number on file.' },
            });
            return;
        }

        setReportDialog({ open: true, data: null, isLoading: true });
        try {
            const res = await axios.get(reportsLeaveManagementFullReport, {
                params: {
                    RollNumber: staffId,
                    FromDate:   fromDate,
                    ToDate:     toDate,
                },
                headers: { Authorization: `Bearer ${token}` },
            });
            const body = res?.data || {};

            // Backend signalled an issue OR returned a record with no usable
            // content (no name AND no working days AND no calendar entries).
            const hasContent =
                (body.name && body.name.trim().length > 0)
                || (body.workingDays && body.workingDays > 0)
                || (Array.isArray(body.calendar)  && body.calendar.length > 0)
                || (Array.isArray(body.dailyLog) && body.dailyLog.length > 0);

            if (body.error || !hasContent) {
                setReportDialog({
                    open: true,
                    isLoading: false,
                    data: { empty: true, message: body.message || 'No attendance data found for this staff member in the selected range.' },
                });
                return;
            }

            // Normalize so the dialog can keep reading fullData.staffId.
            setReportDialog({
                open: true,
                isLoading: false,
                data: { ...body, staffId: body.staffId || body.rollNumber || staffId },
            });
        } catch (err) {
            console.error('Full report fetch error:', err);
            const msg = err?.response?.data?.message || 'Could not load the full report. Please try again.';
            setReportDialog({
                open: true,
                isLoading: false,
                data: { empty: true, message: msg },
            });
        }
    };

    const closeDialog = () => setReportDialog({ open: false, data: null, isLoading: false });

    // ── Filter helpers ─────────────────────────────────────────────────────
    const applyPreset = (key) => {
        const p = presets.find(x => x.key === key);
        if (!p) return;
        setFromDate(p.from);
        setToDate(p.to);
        setActivePreset(key);
    };

    const handleFromChange = (val) => { setFromDate(val); setActivePreset(null); };
    const handleToChange   = (val) => { setToDate(val);   setActivePreset(null); };

    const clearAllFilters = () => {
        applyPreset('today');
        setCategoryFilter('all');
        setStatusFilter('all');
        setStaffSearch('');
    };

    // Client-side search on fetched summary
    const filteredSummary = staffSearch.trim()
        ? summary.filter(row =>
            (row.staffMember || '').toLowerCase().includes(staffSearch.toLowerCase()) ||
            String(row.staffId || '').toLowerCase().includes(staffSearch.toLowerCase())
          )
        : summary;

    const searchActive = staffSearch.trim().length > 0;
    const categoryActive = categoryFilter !== 'all';
    const statusActive   = statusFilter   !== 'all';
    const anyFilterActive = searchActive || categoryActive || statusActive;

    const activeCategoryColor = (CATEGORY_STYLE[categoryFilter]?.color) || '#6B7280';
    const activeStatusColor   = (STATUS_STYLE[statusFilter]?.color)   || '#6B7280';

    // ── Export ─────────────────────────────────────────────────────────────
    const handleExportSummary = () => {
        const headers = ['S.No', 'Staff Name', 'Staff ID', 'Category', 'Working Days', 'Present', 'Late', 'Absent', 'Leave', 'Attendance %'];
        const rows = filteredSummary.map((row, idx) => [
            idx + 1, row.staffMember, row.staffId, mapCategory(row.category),
            row.workingDays, row.present, row.late, row.absent, row.leave, `${row.attendancePercent}%`,
        ]);
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        ws['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 10 }, { wch: 20 }, { wch: 14 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 14 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Attendance Summary');
        XLSX.writeFile(wb, `Staff_Attendance_Summary_${inputToApi(fromDate)}_to_${inputToApi(toDate)}.xlsx`);
    };

    const handleExportFullReport = () => {
        const { data } = reportDialog;
        if (!data?.dailyLog?.length) return;
        const headers = ['Date', 'Day', 'Status', 'Login Time'];
        const rows = data.dailyLog.map(rec => [rec.date, rec.day, rec.status, rec.loginTime]);
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        ws['!cols'] = [{ wch: 18 }, { wch: 8 }, { wch: 10 }, { wch: 14 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Daily Log');
        XLSX.writeFile(wb, `${(data.name || 'Staff').replace(/\s+/g, '_')}_Attendance_Log.xlsx`);
    };

    // ── Sub-renderers ──────────────────────────────────────────────────────
    const categoryChip = (cat) => {
        const label = mapCategory(cat);
        const cfg = CATEGORY_STYLE[label] || { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' };
        return (
            <Chip label={label} size="small" sx={{
                bgcolor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                fontWeight: 600, fontSize: '10px', height: 22,
            }} />
        );
    };

    const renderRateBar = (rate = 0) => {
        const color = rate >= 90 ? PRIMARY : rate >= 70 ? '#0EA5E9' : '#DC2626';
        return (
            <Box sx={{ minWidth: 76 }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 800, color, mb: 0.4, fontFamily: 'monospace' }}>
                    {rate}%
                </Typography>
                <LinearProgress variant="determinate" value={Math.min(100, rate)} sx={{
                    height: 5, borderRadius: 3, bgcolor: '#F3F4F6',
                    '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
                }} />
            </Box>
        );
    };

    const filterButtonSx = (isActive, accent) => ({
        textTransform: 'none', fontSize: '12.5px', fontWeight: 600,
        height: 34, borderRadius: '7px', px: 1.5,
        color: isActive ? '#fff' : '#374151',
        bgcolor: isActive ? accent : '#fff',
        border: `1px solid ${isActive ? accent : '#E5E7EB'}`,
        boxShadow: isActive ? `0 1px 3px ${accent}33` : 'none',
        '&:hover': {
            bgcolor: isActive ? accent : '#F9FAFB',
            filter: isActive ? 'brightness(0.95)' : 'none',
        },
    });

    const renderFilterMenu = (anchor, setAnchor, items, currentKey, onPick, getColor) => (
        <Menu
            anchorEl={anchor}
            open={Boolean(anchor)}
            onClose={() => setAnchor(null)}
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
            {items.map((opt) => {
                const isActive = currentKey === opt.key;
                const color = opt.key === 'all' ? '#6B7280' : (getColor(opt.key) || '#6B7280');
                return (
                    <MenuItem
                        key={opt.key}
                        onClick={() => { onPick(opt.key); setAnchor(null); }}
                        sx={{
                            py: 0.8, px: 1.2, gap: 1,
                            bgcolor: isActive ? `${color}10` : 'transparent',
                            '&:hover': { bgcolor: `${color}15` },
                        }}
                    >
                        <CircleIcon sx={{ fontSize: 9, color, flexShrink: 0 }} />
                        <Typography sx={{
                            fontSize: '13px',
                            fontWeight: isActive ? 700 : 500,
                            color: isActive ? color : '#374151', flex: 1,
                        }}>
                            {opt.label}
                        </Typography>
                        {isActive && <CheckIcon sx={{ fontSize: 15, color, ml: 0.4 }} />}
                    </MenuItem>
                );
            })}
        </Menu>
    );

    const categoryItems = [
        { key: 'all', label: 'All Categories' },
        ...Object.keys(CATEGORY_STYLE).map(k => ({ key: k, label: k })),
    ];
    const statusItems = [
        { key: 'all', label: 'All Status' },
        ...Object.keys(STATUS_STYLE).map(k => ({ key: k, label: k })),
    ];

    // ── KPI cards data ─────────────────────────────────────────────────────
    const kpiCards = [
        { label: 'Total Staff',   value: cards.totalStaff   ?? 0, sub: 'In scope',       color: '#7C5CFC', bg: '#F1EEFE', icon: PersonIcon },
        { label: 'Present Days',  value: cards.presentDays  ?? 0, sub: 'On-time + late', color: '#16A34A', bg: '#DCFCE7', icon: CheckCircleIcon },
        { label: 'Late Arrivals', value: cards.lateArrivals ?? 0, sub: 'Crossed grace',  color: '#F59E0B', bg: '#FFF7ED', icon: AccessTimeIcon },
        { label: 'Absent Days',   value: cards.absentDays   ?? 0, sub: 'No-show',        color: '#E11D48', bg: '#FEE2E2', icon: CancelIcon },
        { label: 'Leave Days',    value: cards.leaveDays    ?? 0, sub: 'Approved leave', color: '#0EA5E9', bg: '#E0F2FE', icon: EventBusyIcon },
    ];

    const { data: fullData } = reportDialog;
    const fullRate = fullData?.attendancePercent ?? 0;
    const fullRateColor = fullRate >= 90 ? PRIMARY : fullRate >= 70 ? '#0EA5E9' : '#DC2626';

    return (
        <>
            <SnackBar open={snackOpen} color={snackColor} setOpen={setSnackOpen} status={snackStatus} message={snackMessage} />

            <Box sx={{ p: isEmbedded ? 0 : 2 }}>
                {/* Standalone Header */}
                {!isEmbedded && (
                    <Box sx={{ mb: 2.5 }}>
                        <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>
                            Attendance Reports
                        </Typography>
                        <Typography sx={{ fontSize: 13, color: '#6B7280', mt: 0.3 }}>
                            Analyse and export staff attendance data
                        </Typography>
                    </Box>
                )}

                {/* ─── Filter toolbar ───────────────────────────────────────── */}
                <Card sx={{ border: '1px solid #E5E7EB', borderRadius: '7px', boxShadow: 'none', bgcolor: '#fff', mb: 2 }}>
                    <CardContent sx={{ pb: '14px !important' }}>
                        {/* Date presets row */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.5, flexWrap: 'wrap' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <CalendarMonthIcon sx={{ fontSize: 16, color: PRIMARY }} />
                                <Typography sx={{ fontSize: '11.5px', fontWeight: 700, color: '#374151', mr: 0.5 }}>
                                    Date Range:
                                </Typography>
                            </Box>
                            {presets.map(p => {
                                const active = activePreset === p.key;
                                return (
                                    <Chip
                                        key={p.key}
                                        label={p.label}
                                        size="small"
                                        onClick={() => applyPreset(p.key)}
                                        sx={{
                                            height: 26, fontSize: '11.5px', fontWeight: 600,
                                            borderRadius: '7px', cursor: 'pointer',
                                            bgcolor: active ? PRIMARY : '#fff',
                                            color: active ? '#fff' : '#374151',
                                            border: `1px solid ${active ? PRIMARY : '#E5E7EB'}`,
                                            '&:hover': { bgcolor: active ? PRIMARY_DARK : '#F9FAFB' },
                                        }}
                                    />
                                );
                            })}
                            <Box sx={{ flex: 1 }} />
                            <TextField
                                type="date" size="small" label="From"
                                value={fromDate}
                                onChange={e => handleFromChange(e.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                                sx={{
                                    width: 150,
                                    '& .MuiOutlinedInput-root': {
                                        height: 34, fontSize: '12px', borderRadius: '7px',
                                        '&.Mui-focused fieldset': { borderColor: PRIMARY },
                                    },
                                }}
                            />
                            <TextField
                                type="date" size="small" label="To"
                                value={toDate}
                                onChange={e => handleToChange(e.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                                sx={{
                                    width: 150,
                                    '& .MuiOutlinedInput-root': {
                                        height: 34, fontSize: '12px', borderRadius: '7px',
                                        '&.Mui-focused fieldset': { borderColor: PRIMARY },
                                    },
                                }}
                            />
                        </Box>

                        {/* Search + dropdowns + clear + counter */}
                        <Box sx={{
                            p: 1.2, borderRadius: '7px',
                            border: '1px solid #E5E7EB', bgcolor: '#FAFAFA',
                            display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center',
                        }}>
                            <TextField
                                size="small"
                                placeholder="Search by name or staff ID..."
                                value={staffSearch}
                                onChange={(e) => setStaffSearch(e.target.value)}
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon sx={{ fontSize: 16, color: searchActive ? PRIMARY : '#9CA3AF' }} />
                                            </InputAdornment>
                                        ),
                                        endAdornment: searchActive ? (
                                            <InputAdornment position="end">
                                                <IconButton size="small" onClick={() => setStaffSearch('')} sx={{ p: 0.3 }}>
                                                    <CloseIcon sx={{ fontSize: 14, color: '#9CA3AF' }} />
                                                </IconButton>
                                            </InputAdornment>
                                        ) : null,
                                    },
                                }}
                                sx={{
                                    flex: 1, minWidth: 220, maxWidth: 300,
                                    '& .MuiOutlinedInput-root': {
                                        height: 34, fontSize: '12.5px', borderRadius: '7px',
                                        bgcolor: searchActive ? PRIMARY_LIGHT : '#fff',
                                        '& fieldset': { borderColor: searchActive ? PRIMARY_BORDER : '#E5E7EB' },
                                        '&:hover fieldset': { borderColor: '#D1D5DB' },
                                        '&.Mui-focused fieldset': { borderColor: PRIMARY },
                                    },
                                }}
                            />

                            <Button
                                onClick={(e) => setCategoryAnchor(e.currentTarget)}
                                startIcon={<PeopleAltOutlinedIcon sx={{ fontSize: 16 }} />}
                                endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
                                sx={filterButtonSx(categoryActive, activeCategoryColor)}
                            >
                                {categoryActive ? categoryFilter : 'Category'}
                            </Button>
                            {renderFilterMenu(
                                categoryAnchor, setCategoryAnchor,
                                categoryItems, categoryFilter, setCategoryFilter,
                                (k) => CATEGORY_STYLE[k]?.color,
                            )}

                            <Button
                                onClick={(e) => setStatusAnchor(e.currentTarget)}
                                startIcon={<CircleIcon sx={{ fontSize: 10, color: statusActive ? '#fff' : activeStatusColor }} />}
                                endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
                                sx={filterButtonSx(statusActive, activeStatusColor)}
                            >
                                {statusActive ? statusFilter : 'Status'}
                            </Button>
                            {renderFilterMenu(
                                statusAnchor, setStatusAnchor,
                                statusItems, statusFilter, setStatusFilter,
                                (k) => STATUS_STYLE[k]?.color,
                            )}

                            {anyFilterActive && (
                                <Button
                                    size="small"
                                    startIcon={<RestartAltIcon sx={{ fontSize: 15 }} />}
                                    onClick={clearAllFilters}
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

                            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                <Typography sx={{ fontSize: '11.5px', color: '#6B7280' }}>Showing</Typography>
                                <Typography sx={{ fontSize: '13px', fontWeight: 800, color: anyFilterActive ? PRIMARY_DARK : '#111827' }}>
                                    {filteredSummary.length}
                                </Typography>
                                <Typography sx={{ fontSize: '11.5px', color: '#6B7280' }}>
                                    of {summary.length} staff
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                {/* ─── KPI Cards ─────────────────────────────────────────────── */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    {kpiCards.map((c) => {
                        const Icon = c.icon;
                        return (
                            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }} key={c.label}>
                                <Box sx={{
                                    p: 2.5, borderRadius: '7px', bgcolor: c.bg,
                                    border: `1px solid ${c.color}22`,
                                    boxShadow: '0 1px 3px rgba(16,24,40,0.06)', height: '100%',
                                    transition: 'transform 0.15s, box-shadow 0.15s',
                                    '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 20px ${c.color}22` },
                                }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography sx={{ fontSize: '11px', color: c.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                {c.label}
                                            </Typography>
                                            <Typography sx={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', lineHeight: 1.2, mt: 0.5 }}>
                                                {c.value}
                                            </Typography>
                                            <Typography sx={{ fontSize: '10.5px', color: '#6B7280', fontWeight: 600, mt: 0.3 }}>
                                                {c.sub}
                                            </Typography>
                                        </Box>
                                        <Box sx={{
                                            width: 44, height: 44, borderRadius: '7px',
                                            bgcolor: '#fff', boxShadow: '0 1px 3px rgba(16,24,40,0.08)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ml: 1,
                                        }}>
                                            <Icon sx={{ color: c.color, fontSize: 22 }} />
                                        </Box>
                                    </Box>
                                </Box>
                            </Grid>
                        );
                    })}
                </Grid>

                {/* ─── Summary Table ─────────────────────────────────────────── */}
                <Card sx={{ border: '1px solid #E5E7EB', borderRadius: '7px', boxShadow: 'none', bgcolor: '#fff' }}>
                    <CardContent sx={{ pb: '12px !important' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                            <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                    <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                                        Staff Attendance Summary
                                    </Typography>
                                    <Chip
                                        label={`${filteredSummary.length} staff`}
                                        size="small"
                                        sx={{ bgcolor: '#F3F4F6', color: '#374151', fontWeight: 600, fontSize: '11px', height: 20 }}
                                    />
                                </Box>
                                <Typography sx={{ fontSize: '11px', color: '#6B7280', mt: 0.2 }}>
                                    {inputToApi(fromDate)} → {inputToApi(toDate)}
                                </Typography>
                            </Box>
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<FileDownloadIcon sx={{ fontSize: 16 }} />}
                                onClick={handleExportSummary}
                                disabled={filteredSummary.length === 0 || isLoading}
                                sx={{
                                    textTransform: 'none', fontSize: '12.5px', fontWeight: 700,
                                    bgcolor: PRIMARY, color: '#fff',
                                    borderRadius: '7px', px: 1.8, height: 34,
                                    boxShadow: `0 2px 6px ${PRIMARY}33`,
                                    '&:hover': { bgcolor: PRIMARY_DARK, boxShadow: `0 4px 12px ${PRIMARY}55` },
                                    '&.Mui-disabled': { bgcolor: '#E5E7EB', color: '#9CA3AF', boxShadow: 'none' },
                                }}
                            >
                                Export Excel
                            </Button>
                        </Box>

                        <TableContainer sx={{ borderRadius: '7px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: PRIMARY_LIGHT, borderBottom: `1px solid ${PRIMARY_BORDER}` }}>
                                        {['S.No', 'Staff Member', 'Category', 'Working', 'Present', 'Late', 'Absent', 'Leave', 'Attendance %', 'Action'].map(h => (
                                            <TableCell key={h} sx={{
                                                fontWeight: 700, fontSize: '10px', color: PRIMARY_DARK,
                                                textTransform: 'uppercase', whiteSpace: 'nowrap',
                                                letterSpacing: 0.6, py: 1.3, borderBottom: 'none',
                                            }}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={10} align="center" sx={{ py: 6, borderBottom: 'none' }}>
                                                <CircularProgress size={28} sx={{ color: PRIMARY }} />
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredSummary.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={10} align="center" sx={{ py: 6, borderBottom: 'none' }}>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.6 }}>
                                                    <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <AssessmentIcon sx={{ fontSize: 24, color: PRIMARY }} />
                                                    </Box>
                                                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#374151' }}>
                                                        No records found
                                                    </Typography>
                                                    <Typography sx={{ fontSize: '11px', color: '#9CA3AF' }}>
                                                        Adjust the date range or filters to see data
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredSummary.map((row, idx) => {
                                        const avColor = avatarColorFor(row.staffMember || '');
                                        return (
                                            <TableRow key={row.staffId || idx} sx={{
                                                '&:hover': { bgcolor: PRIMARY_LIGHT },
                                                borderBottom: '1px solid #F3F4F6',
                                                transition: 'background-color 0.15s',
                                            }}>
                                                <TableCell sx={{ borderBottom: '1px solid #F3F4F6', width: 50 }}>
                                                    <Typography sx={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 500 }}>
                                                        {row.sNo ?? idx + 1}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                                        <Avatar sx={{
                                                            width: 34, height: 34,
                                                            bgcolor: `${avColor}15`, color: avColor,
                                                            fontSize: '11px', fontWeight: 700,
                                                            border: `1px solid ${avColor}33`,
                                                        }}>
                                                            {getInitials(row.staffMember)}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                                                                {row.staffMember}
                                                            </Typography>
                                                            <Typography sx={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 500, fontFamily: 'monospace' }}>
                                                                {row.staffId}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                    {categoryChip(row.category)}
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                                                        {row.workingDays}
                                                    </Typography>
                                                </TableCell>
                                                {[
                                                    { v: row.present, color: PRIMARY },
                                                    { v: row.late,    color: '#0EA5E9' },
                                                    { v: row.absent,  color: '#DC2626' },
                                                    { v: row.leave,   color: '#2563EB' },
                                                ].map((cell, i) => (
                                                    <TableCell key={i} sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                        <Typography sx={{
                                                            fontSize: '13px',
                                                            fontWeight: 800,
                                                            color: cell.v > 0 ? cell.color : '#D1D5DB',
                                                            fontFamily: 'monospace',
                                                        }}>
                                                            {cell.v ?? 0}
                                                        </Typography>
                                                    </TableCell>
                                                ))}
                                                <TableCell sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                    {renderRateBar(row.attendancePercent ?? 0)}
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        startIcon={<VisibilityOutlinedIcon sx={{ fontSize: '13px !important' }} />}
                                                        onClick={() => fetchFullReport(row.staffId)}
                                                        sx={{
                                                            textTransform: 'none', fontSize: '11px', fontWeight: 700,
                                                            borderRadius: '7px',
                                                            color: PRIMARY_DARK,
                                                            borderColor: PRIMARY_BORDER,
                                                            bgcolor: PRIMARY_LIGHT,
                                                            '&:hover': { borderColor: PRIMARY, bgcolor: '#E7DFFC' },
                                                        }}
                                                    >
                                                        View
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>

                {/* ─── Full Report Dialog ───────────────────────────────────── */}
                <Dialog open={reportDialog.open} onClose={closeDialog} maxWidth="md" fullWidth
                    PaperProps={{ sx: { borderRadius: '14px', overflow: 'hidden' } }}>
                    {reportDialog.isLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
                            <CircularProgress size={36} sx={{ color: PRIMARY }} />
                        </Box>
                    ) : fullData?.empty ? (
                        <Box sx={{ px: 4, py: 6, textAlign: 'center' }}>
                            <Box sx={{
                                width: 64, height: 64, borderRadius: '50%',
                                bgcolor: '#F3F4F6', border: '1px solid #E5E7EB',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                mb: 1.5,
                            }}>
                                <Typography sx={{ fontSize: '28px' }}>📭</Typography>
                            </Box>
                            <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#111827', mb: 0.6 }}>
                                No report data available
                            </Typography>
                            <Typography sx={{ fontSize: '12.5px', color: '#6B7280', maxWidth: 380, mx: 'auto', lineHeight: 1.6 }}>
                                {fullData.message || 'No attendance records were found for this staff member in the selected range.'}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2.5 }}>
                                <Button
                                    onClick={closeDialog}
                                    variant="contained"
                                    disableElevation
                                    sx={{
                                        textTransform: 'none', fontSize: '13px', fontWeight: 700,
                                        bgcolor: PRIMARY, color: '#fff',
                                        borderRadius: '7px', px: 2.4, height: 36,
                                        '&:hover': { bgcolor: PRIMARY_DARK },
                                    }}
                                >
                                    Close
                                </Button>
                            </Box>
                        </Box>
                    ) : fullData && (
                        <>
                            <DialogTitle sx={{ p: 0 }}>
                                <Box sx={{
                                    background: `linear-gradient(135deg, ${PRIMARY_LIGHT} 0%, #fff 60%)`,
                                    borderBottom: `1px solid ${PRIMARY_BORDER}`,
                                    px: 3, pt: 2.2, pb: 2,
                                }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                                            <Avatar sx={{
                                                width: 48, height: 48,
                                                bgcolor: `${avatarColorFor(fullData.name || '')}15`,
                                                color: avatarColorFor(fullData.name || ''),
                                                fontWeight: 800, fontSize: '15px',
                                                border: `1px solid ${avatarColorFor(fullData.name || '')}33`,
                                            }}>
                                                {getInitials(fullData.name)}
                                            </Avatar>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography sx={{ fontSize: '17px', fontWeight: 800, color: '#111827', lineHeight: 1.15 }} noWrap>
                                                    {fullData.name}
                                                </Typography>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.4, flexWrap: 'wrap' }}>
                                                    <Typography sx={{ fontSize: '11px', color: '#6B7280', fontFamily: 'monospace', fontWeight: 600 }}>
                                                        {fullData.staffId}
                                                    </Typography>
                                                    {fullData.department && (
                                                        <>
                                                            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: '#D1D5DB' }} />
                                                            <Typography sx={{ fontSize: '11px', color: '#6B7280' }}>{fullData.department}</Typography>
                                                        </>
                                                    )}
                                                    <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: '#D1D5DB' }} />
                                                    {categoryChip(fullData.category)}
                                                </Box>
                                            </Box>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                                            <Box sx={{ textAlign: 'right' }}>
                                                <Typography sx={{ fontSize: '9px', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                    Report Period
                                                </Typography>
                                                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>
                                                    {fullData.reportFromDate} → {fullData.reportToDate}
                                                </Typography>
                                            </Box>
                                            <IconButton onClick={closeDialog} size="small"
                                                sx={{ bgcolor: '#fff', border: '1px solid #E5E7EB', borderRadius: '7px',
                                                      '&:hover': { bgcolor: '#F9FAFB', borderColor: '#D1D5DB' } }}>
                                                <CloseIcon sx={{ fontSize: 18, color: '#6B7280' }} />
                                            </IconButton>
                                        </Box>
                                    </Box>

                                    {/* Attendance Rate Bar */}
                                    <Box sx={{ mt: 1.6, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' }}>
                                            Attendance Rate
                                        </Typography>
                                        <Box sx={{ flex: 1 }}>
                                            <LinearProgress variant="determinate" value={Math.min(100, fullRate)} sx={{
                                                height: 8, borderRadius: 4, bgcolor: '#fff',
                                                '& .MuiLinearProgress-bar': { bgcolor: fullRateColor, borderRadius: 4 },
                                            }} />
                                        </Box>
                                        <Typography sx={{
                                            fontSize: '15px', fontWeight: 800, color: fullRateColor,
                                            minWidth: 50, textAlign: 'right', fontFamily: 'monospace',
                                        }}>
                                            {fullRate}%
                                        </Typography>
                                    </Box>
                                </Box>
                            </DialogTitle>

                            <DialogContent sx={{ p: 0, bgcolor: '#F9FAFB' }}>
                                {/* Stats strip */}
                                <Box sx={{ display: 'flex', borderBottom: '1px solid #E5E7EB', bgcolor: '#fff' }}>
                                    {[
                                        { label: 'Working',  value: fullData.workingDays, color: '#6246E0' },
                                        { label: 'Present',  value: fullData.present,     color: PRIMARY   },
                                        { label: 'Late',     value: fullData.late,        color: '#0EA5E9' },
                                        { label: 'Absent',   value: fullData.absent,      color: '#DC2626' },
                                        { label: 'Leave',    value: fullData.leave,       color: '#2563EB' },
                                    ].map((s, i, arr) => (
                                        <Box key={s.label} sx={{
                                            flex: 1, textAlign: 'center', py: 1.8,
                                            borderRight: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none',
                                            borderTop: `3px solid ${s.color}`,
                                        }}>
                                            <Typography sx={{ fontSize: '22px', fontWeight: 800, color: s.color, lineHeight: 1, fontFamily: 'monospace' }}>
                                                {s.value ?? 0}
                                            </Typography>
                                            <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#9CA3AF', mt: 0.4, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                                {s.label}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>

                                <Box sx={{ p: 2.2 }}>
                                    {/* Calendar */}
                                    {fullData.calendar?.length > 0 && (
                                        <Card sx={{ mb: 2, border: '1px solid #E5E7EB', borderRadius: '7px', boxShadow: 'none', bgcolor: '#fff' }}>
                                            <Box sx={{
                                                px: 2, py: 1.2, bgcolor: PRIMARY_LIGHT,
                                                borderBottom: `1px solid ${PRIMARY_BORDER}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1,
                                            }}>
                                                <Typography sx={{ fontSize: '12px', fontWeight: 700, color: PRIMARY_DARK }}>
                                                    Attendance Calendar
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap' }}>
                                                    {Object.entries(STATUS_STYLE).map(([s, cfg]) => (
                                                        <Box key={s} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: cfg.bg, border: `1px solid ${cfg.color}50` }} />
                                                            <Typography sx={{ fontSize: '10px', color: '#6B7280', fontWeight: 600 }}>{s}</Typography>
                                                        </Box>
                                                    ))}
                                                </Box>
                                            </Box>
                                            <Box sx={{ p: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                                                {fullData.calendar.map((cal, i) => {
                                                    const key = normalizeStatus(cal.status);
                                                    const cfg = STATUS_STYLE[key] || { bg: '#F3F4F6', color: '#D1D5DB', border: '#E5E7EB' };
                                                    return (
                                                        <Tooltip key={i}
                                                            title={`${cal.dayName} ${cal.dayNumber} · ${key || 'Not Marked'}`}
                                                            placement="top" arrow>
                                                            <Box sx={{
                                                                width: 48, height: 48, borderRadius: '7px',
                                                                bgcolor: cfg.bg, border: `1.5px solid ${cfg.border || `${cfg.color}40`}`,
                                                                display: 'flex', flexDirection: 'column',
                                                                alignItems: 'center', justifyContent: 'center', cursor: 'default',
                                                            }}>
                                                                <Typography sx={{ fontSize: '14px', fontWeight: 800, color: cfg.color, lineHeight: 1, fontFamily: 'monospace' }}>
                                                                    {cal.dayNumber}
                                                                </Typography>
                                                                <Typography sx={{ fontSize: '9px', fontWeight: 700, color: cfg.color, opacity: 0.75, mt: 0.25 }}>
                                                                    {cal.dayName}
                                                                </Typography>
                                                            </Box>
                                                        </Tooltip>
                                                    );
                                                })}
                                            </Box>
                                        </Card>
                                    )}

                                    {/* Daily Log */}
                                    <Card sx={{ border: '1px solid #E5E7EB', borderRadius: '7px', boxShadow: 'none', bgcolor: '#fff' }}>
                                        <Box sx={{
                                            px: 2, py: 1.2, bgcolor: PRIMARY_LIGHT,
                                            borderBottom: `1px solid ${PRIMARY_BORDER}`,
                                        }}>
                                            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: PRIMARY_DARK }}>
                                                Daily Log
                                            </Typography>
                                        </Box>
                                        <TableContainer sx={{ maxHeight: 320 }}>
                                            <Table size="small" stickyHeader>
                                                <TableHead>
                                                    <TableRow>
                                                        {['Date', 'Day', 'Status', 'Login Time'].map(h => (
                                                            <TableCell key={h} sx={{
                                                                fontWeight: 700, fontSize: '10px', color: '#6B7280',
                                                                textTransform: 'uppercase', letterSpacing: 0.4,
                                                                bgcolor: '#F9FAFB', borderBottom: '1px solid #E5E7EB',
                                                            }}>{h}</TableCell>
                                                        ))}
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {(!fullData.dailyLog || fullData.dailyLog.length === 0) ? (
                                                        <TableRow>
                                                            <TableCell colSpan={4} align="center" sx={{ py: 4, borderBottom: 'none' }}>
                                                                <Typography sx={{ fontSize: '13px', color: '#9CA3AF' }}>
                                                                    No records for this period
                                                                </Typography>
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : fullData.dailyLog.map((rec, idx) => {
                                                        const key = normalizeStatus(rec.status);
                                                        const cfg = STATUS_STYLE[key] || { color: '#9CA3AF', bg: '#F3F4F6', border: '#E5E7EB' };
                                                        return (
                                                            <TableRow key={idx} sx={{ '&:hover': { bgcolor: PRIMARY_LIGHT } }}>
                                                                <TableCell sx={{ fontSize: '12px', fontWeight: 600, color: '#1F2937', borderBottom: '1px solid #F3F4F6', whiteSpace: 'nowrap' }}>
                                                                    {rec.date}
                                                                </TableCell>
                                                                <TableCell sx={{ fontSize: '12px', color: '#6B7280', borderBottom: '1px solid #F3F4F6' }}>
                                                                    {rec.day}
                                                                </TableCell>
                                                                <TableCell sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                                    {key ? (
                                                                        <Chip
                                                                            size="small" label={key}
                                                                            icon={React.createElement(cfg.icon, { sx: { fontSize: '12px !important' } })}
                                                                            sx={{
                                                                                bgcolor: cfg.bg, color: cfg.color,
                                                                                border: `1px solid ${cfg.border || `${cfg.color}40`}`,
                                                                                fontWeight: 700, fontSize: '10.5px', height: 22,
                                                                                '& .MuiChip-icon': { color: 'inherit', ml: '6px' },
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <Typography sx={{ fontSize: '12px', color: '#D1D5DB' }}>—</Typography>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell sx={{
                                                                    fontSize: '12px',
                                                                    color: key === 'Late' ? '#0EA5E9' : '#374151',
                                                                    fontWeight: key === 'Late' ? 800 : 500,
                                                                    fontFamily: 'monospace',
                                                                    borderBottom: '1px solid #F3F4F6',
                                                                }}>
                                                                    {rec.loginTime || '—'}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Card>
                                </Box>
                            </DialogContent>

                            <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: '1px solid #E5E7EB', bgcolor: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                                <Button
                                    variant="outlined"
                                    startIcon={<FileDownloadIcon sx={{ fontSize: 16 }} />}
                                    onClick={handleExportFullReport}
                                    disabled={!fullData?.dailyLog?.length}
                                    sx={{
                                        textTransform: 'none', fontSize: '12.5px', fontWeight: 700,
                                        borderRadius: '7px',
                                        color: PRIMARY_DARK, borderColor: PRIMARY_BORDER,
                                        bgcolor: PRIMARY_LIGHT,
                                        '&:hover': { borderColor: PRIMARY, bgcolor: '#E7DFFC' },
                                    }}
                                >
                                    Export Excel
                                </Button>
                                <Button
                                    onClick={closeDialog}
                                    sx={{
                                        textTransform: 'none', fontSize: '12.5px', fontWeight: 700,
                                        color: '#374151', borderRadius: '7px',
                                        border: '1px solid #E5E7EB', px: 2, height: 34,
                                        '&:hover': { bgcolor: '#F9FAFB' },
                                    }}
                                >
                                    Close
                                </Button>
                            </DialogActions>
                        </>
                    )}
                </Dialog>
            </Box>
        </>
    );
}
