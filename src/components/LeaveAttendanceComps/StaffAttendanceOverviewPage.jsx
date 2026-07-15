import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    Typography,
    TextField,
    Select,
    MenuItem,
    Avatar,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    InputAdornment,
    CircularProgress,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CancelIcon from '@mui/icons-material/Cancel';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import DateRangeIcon from '@mui/icons-material/DateRange';
import http from '../../Api/http';
import { GetEmployeeAttendanceOverview } from '../../Api/Api';
import useFinancialYear from '../../hooks/useFinancialYear';
import { toApiDate } from '../../utils/apiFields';
import SnackBar from '../SnackBar';



const VIEW_OPTIONS = [
    { label: '7 Days',    value: '7days' },
    { label: '15 Days',   value: '15days' },
    { label: 'From - To', value: 'custom' },
];

// JS Date → "YYYY-MM-DD" (the format the GetStaffAttendanceOverview API expects).
const toIsoDate = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// Compute the From/To date pair (ISO format) for a given viewBy preset.
// 7days  → last 7 days ending today  (today − 6 → today)
// 15days → last 15 days ending today (today − 14 → today)
const datesForViewPreset = (preset) => {
    const today = new Date();
    const from = new Date();
    const span = preset === '15days' ? 14 : 6; // 7-day window spans 6 prior days + today
    from.setDate(today.getDate() - span);
    return { from: toIsoDate(from), to: toIsoDate(today) };
};

// "DD-MM-YYYY" → "DD" for header display
const getDayNum = (dateStr) => dateStr.split('-')[0];

// "DD-MM-YYYY" → short day name
const getDayName = (dateStr) => {
    const [d, m, y] = dateStr.split('-');
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(`${y}-${m}-${d}`).getDay()];
};

// Map API status to display info
const mapStatus = (status = '') => {
    const s = status.toLowerCase().trim();
    if (s === 'present')                     return 'present';
    if (s === 'late')                        return 'late';
    if (s === 'absent')                      return 'absent';
    if (s === 'onleave' || s === 'on leave') return 'leave';
    return 'none'; // empty string → not marked yet
};

const getCellStyle = (status) => {
    const styles = {
        present: { bgcolor: '#E8F5E9', color: '#2E7D32', border: '1px solid #A5D6A7' },
        late:    { bgcolor: '#FFF3E0', color: '#E65100', border: '1px solid #FFCC80' },
        absent:  { bgcolor: '#FFEBEE', color: '#C62828', border: '1px solid #EF9A9A' },
        leave:   { bgcolor: '#E3F2FD', color: '#1565C0', border: '1px solid #90CAF9' },
        none:    { bgcolor: '#F4F3FB', color: '#bbb',    border: '1px solid #E8E8E8' },
    };
    return styles[status] || styles.none;
};

const LEGEND = [
    { label: 'Present', bgcolor: '#E8F5E9', border: '#A5D6A7' },
    { label: 'Late',    bgcolor: '#FFF3E0', border: '#FFCC80' },
    { label: 'Absent',  bgcolor: '#FFEBEE', border: '#EF9A9A' },
    { label: 'Leave',   bgcolor: '#E3F2FD', border: '#90CAF9' },
];


// Get initials from name
const getInitials = (name = '') =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

const today = new Date().toISOString().split('T')[0];

const StaffAttendanceOverviewPage = ({ isEmbedded = false }) => {
    // Filters
    const [searchQuery, setSearchQuery]             = useState('');
    const [designationFilter, setDesignationFilter] = useState('All designations');

    // View range
    const [viewBy, setViewBy]     = useState('7days'); // '7days' | '15days' | 'custom'
    const [fromDate, setFromDate] = useState(today);
    const [toDate, setToDate]     = useState(today);

    const financialYear = useFinancialYear();

    // API data
    const [overviewData, setOverviewData] = useState({
        cards: { totalPresent: 0, totalLate: 0, totalLeave: 0, totalAbsent: 0 },
        dateHeaders: [],
        details: [],
        staffCount: 0,
        fromDate: '',
        toDate: '',
    });
    const [isLoading, setIsLoading] = useState(false);

    // SnackBar
    const [snackOpen, setSnackOpen]       = useState(false);
    const [snackStatus, setSnackStatus]   = useState(false);
    const [snackColor, setSnackColor]     = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const showSnack = (msg, success) => {
        setSnackMessage(msg); setSnackOpen(true); setSnackColor(success); setSnackStatus(success);
    };

    // Fetch overview
    // GET /GetStaffAttendanceOverview
    //   ?AcademicYear=YYYY-YYYY&FromDate=YYYY-MM-DD&ToDate=YYYY-MM-DD&UserType=<userType>
    // For 7days / 15days presets we compute the date range locally; for the
    // custom range we use what the user picked in the date inputs (already
    // YYYY-MM-DD from <input type="date">).
    // GET /EmployeeAttendance/GetEmployeeAttendanceOverview
    //   ?financialYear=YYYY-YYYY&fromDate=DD-MM-YYYY&toDate=DD-MM-YYYY
    // The date inputs give YYYY-MM-DD, so the range is converted on the way out.
    // There is no user-type param any more — the API returns everyone and the
    // designation filter below is applied client-side.
    const fetchOverview = useCallback(async () => {
        // For custom range, require both dates
        if (viewBy === 'custom' && (!fromDate || !toDate)) return;
        if (!financialYear) return;

        const range = viewBy === 'custom'
            ? { from: fromDate, to: toDate }
            : datesForViewPreset(viewBy);

        setIsLoading(true);
        try {
            const res = await http.get(GetEmployeeAttendanceOverview, {
                params: {
                    financialYear,
                    fromDate: toApiDate(range.from),
                    toDate:   toApiDate(range.to),
                },
            });
            if (res.data && !res.data.error) {
                setOverviewData({
                    cards:       res.data.cards         || {},
                    dateHeaders: res.data.dateHeaders   || [],
                    details:     res.data.details       || [],
                    staffCount:  res.data.employeeCount || 0,
                    fromDate:    res.data.fromDate      || '',
                    toDate:      res.data.toDate        || '',
                });
            } else {
                showSnack(res.data?.message || 'Failed to fetch data', false);
            }
        } catch (error) {
            console.error('Employee attendance overview error:', error);
            showSnack(error?.response?.data?.message || 'Failed to load the attendance overview', false);
        } finally {
            setIsLoading(false);
        }
    }, [viewBy, fromDate, toDate, financialYear]);

    // Re-fetch when the preset or the year changes (not on every keystroke in the
    // custom range — that fires from the Apply button).
    useEffect(() => {
        if (viewBy !== 'custom') {
            fetchOverview();
        }
    }, [viewBy, financialYear]);

    // The API groups people by designation, not by the old teacher/staff/admin
    // user types, so the filter is built from what actually came back.
    const designations = useMemo(
        () => ['All designations', ...Array.from(new Set(overviewData.details.map(s => s.designation).filter(Boolean))).sort()],
        [overviewData.details]
    );

    const filteredDetails = overviewData.details.filter(s => {
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch = !q
            || (s.name || '').toLowerCase().includes(q)
            || String(s.employeeCode || '').toLowerCase().includes(q);
        const matchesDesignation = designationFilter === 'All designations' || s.designation === designationFilter;
        return matchesSearch && matchesDesignation;
    });

    const { cards, dateHeaders } = overviewData;

    const STAT_CARDS = [
        { title: 'Total Present', value: cards.totalPresent ?? 0, icon: CheckCircleIcon, color: '#16A34A', bg: '#DCFCE7' },
        { title: 'Total Late',    value: cards.totalLate    ?? 0, icon: AccessTimeIcon,  color: '#F59E0B', bg: '#FFF7ED' },
        { title: 'Total Leave',   value: cards.totalLeave   ?? 0, icon: EventBusyIcon,   color: '#7C5CFC', bg: '#F1EEFE' },
        { title: 'Total Absent',  value: cards.totalAbsent  ?? 0, icon: CancelIcon,      color: '#E11D48', bg: '#FEE2E2' },
    ];

    const viewLabel = viewBy === '7days' ? 'Last 7 days' : viewBy === '15days' ? 'Last 15 days' : 'Custom range';

    return (
        <>
        <SnackBar open={snackOpen} color={snackColor} setOpen={setSnackOpen} status={snackStatus} message={snackMessage} />
        <Box sx={{ p: isEmbedded ? 0 : 2 }}>
            {/* Header — hidden when embedded */}
            {!isEmbedded && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
                    <Box>
                        <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>Staff Attendance Overview</Typography>
                        <Typography sx={{ fontSize: 13, color: '#6B7280', mt: 0.3 }}>Track daily attendance across your workforce</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button startIcon={<PrintIcon sx={{ fontSize: 18 }} />} onClick={() => window.print()}
                            sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, color: '#334155', bgcolor: '#F1F5F9', borderRadius: '7px', height: 42, px: 2, '&:hover': { bgcolor: '#E2E8F0' } }}>
                            Print
                        </Button>
                        <Button startIcon={<FileDownloadIcon sx={{ fontSize: 18 }} />}
                            sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, color: '#7C5CFC', bgcolor: '#F1EEFE', border: '1px solid #C9BEFB', borderRadius: '7px', height: 42, px: 2.2, '&:hover': { bgcolor: '#E7DFFC' } }}>
                            Export Report
                        </Button>
                    </Box>
                </Box>
            )}

            {/* ── Filter Bar ──────────────────────────────────────────────── */}
            <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, mb: 2,
                px: 2, py: 1.2, bgcolor: '#F8FAFC', border: '1px solid #E8EFF5',
                borderRadius: '7px', flexWrap: 'wrap',
            }}>
                {/* Search */}
                <TextField
                    size="small"
                    placeholder="Search staff name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 17, color: '#aaa' }} />
                                </InputAdornment>
                            ),
                        },
                    }}
                    sx={{ width: '220px', bgcolor: '#fff', '& .MuiOutlinedInput-root': { borderRadius: '7px' } }}
                />

                {/* Designation */}
                <Select
                    value={designationFilter}
                    onChange={(e) => setDesignationFilter(e.target.value)}
                    size="small"
                    sx={{ minWidth: 180, bgcolor: '#fff', fontSize: '13px', borderRadius: '7px' }}
                >
                    {designations.map(t => (
                        <MenuItem key={t} value={t} sx={{ fontSize: '13px' }}>{t}</MenuItem>
                    ))}
                </Select>

                <Typography sx={{ fontSize: '12px', color: '#888', ml: 'auto' }}>
                    {filteredDetails.length} of {overviewData.staffCount} staff member{overviewData.staffCount !== 1 ? 's' : ''}
                </Typography>
            </Box>

            {/* ── View By bar ─────────────────────────────────────────────── */}
            <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, mb: 2,
                px: 2, py: 1.2, bgcolor: '#FAFAFA', border: '1px solid #E8E8E8',
                borderRadius: '7px', flexWrap: 'wrap',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DateRangeIcon sx={{ fontSize: 17, color: '#7C5CFC' }} />
                    <Typography sx={{ fontSize: '13px', fontWeight: '700', color: '#1a1a1a' }}>
                        View By:
                    </Typography>
                </Box>

                {VIEW_OPTIONS.map(opt => (
                    <Box
                        key={opt.value}
                        onClick={() => setViewBy(opt.value)}
                        sx={{
                            px: 2, py: 0.6, borderRadius: '20px', cursor: 'pointer',
                            fontSize: '13px', fontWeight: '600',
                            bgcolor: viewBy === opt.value ? '#7C5CFC' : '#fff',
                            color:   viewBy === opt.value ? '#fff' : '#555',
                            border: `1px solid ${viewBy === opt.value ? '#7C5CFC' : '#E0E0E0'}`,
                            transition: 'all 0.18s',
                            '&:hover': {
                                bgcolor: viewBy === opt.value ? '#6246E0' : '#F1EEFE',
                                borderColor: '#7C5CFC',
                                color: viewBy === opt.value ? '#fff' : '#7C5CFC',
                            },
                        }}
                    >
                        {opt.label}
                    </Box>
                ))}

                {/* Date pickers — only for custom From-To */}
                {viewBy === 'custom' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontSize: '12px', color: '#555', fontWeight: '500' }}>From:</Typography>
                        <TextField
                            type="date"
                            size="small"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            sx={{
                                width: '140px', bgcolor: '#fff',
                                '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: '13px', '& fieldset': { borderColor: '#7C5CFC' } },
                            }}
                        />
                        <Typography sx={{ fontSize: '12px', color: '#555', fontWeight: '500' }}>To:</Typography>
                        <TextField
                            type="date"
                            size="small"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            sx={{
                                width: '140px', bgcolor: '#fff',
                                '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: '13px', '& fieldset': { borderColor: '#7C5CFC' } },
                            }}
                        />
                        <Button
                            variant="contained"
                            size="small"
                            onClick={fetchOverview}
                            disabled={!fromDate || !toDate}
                            sx={{
                                textTransform: 'none', borderRadius: '7px',
                                bgcolor: '#7C5CFC', '&:hover': { bgcolor: '#6246E0' },
                                fontSize: '12px', fontWeight: '600', px: 2,
                            }}
                        >
                            Apply
                        </Button>
                    </Box>
                )}
            </Box>

            {/* ── Summary Cards ───────────────────────────────────────────── */}
            <Grid container spacing={2} sx={{ mb: 2.5 }}>
                {STAT_CARDS.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Grid key={card.title} size={{ xs: 6, sm: 3, md: 3, lg: 3 }}>
                            <Box sx={{
                                p: 2.5, borderRadius: '7px', bgcolor: card.bg,
                                border: `1px solid ${card.color}22`,
                                boxShadow: '0 1px 3px rgba(16,24,40,0.06)',
                                height: '100%',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 20px ${card.color}22` },
                            }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography sx={{ fontSize: '11px', color: card.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            {card.title}
                                        </Typography>
                                        <Typography sx={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', lineHeight: 1.2, mt: 0.5 }}>
                                            {card.value}
                                        </Typography>
                                        <Typography sx={{ fontSize: '10.5px', color: '#6B7280', fontWeight: 600, mt: 0.3 }}>
                                            {viewLabel}
                                        </Typography>
                                    </Box>
                                    <Box sx={{
                                        width: 44, height: 44, borderRadius: '7px', bgcolor: '#fff',
                                        boxShadow: '0 1px 3px rgba(16,24,40,0.08)',
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

            {/* ── Detailed Attendance Log ──────────────────────────────────── */}
            <Card sx={{ border: '1px solid #ECEBF5', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.05)' }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography sx={{ fontSize: '16px', fontWeight: '600' }}>
                            Detailed Attendance Log
                        </Typography>
                        <Chip
                            icon={<CalendarTodayIcon sx={{ fontSize: '13px !important' }} />}
                            label={`${filteredDetails.length} Staff · ${dateHeaders.length} Days`}
                            size="small"
                            sx={{ bgcolor: '#F1EEFE', color: '#7C5CFC', fontWeight: '600', fontSize: '11px' }}
                        />
                    </Box>

                    {isLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                            <CircularProgress size={30} sx={{ color: '#7C5CFC' }} />
                        </Box>
                    ) : filteredDetails.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 6, color: '#999' }}>
                            <Typography sx={{ fontSize: '15px', fontWeight: '600', mb: 0.5 }}>No Staff Members Found</Typography>
                            <Typography sx={{ fontSize: '12px' }}>Try adjusting your search or filter criteria</Typography>
                        </Box>
                    ) : (
                        <>
                            <TableContainer sx={{
                                overflowX: 'auto',
                                '&::-webkit-scrollbar': { height: '6px' },
                                '&::-webkit-scrollbar-track': { bgcolor: '#F5F5F5', borderRadius: '7px' },
                                '&::-webkit-scrollbar-thumb': { bgcolor: '#BDBDBD', borderRadius: '7px' },
                            }}>
                                <Table size="small" sx={{ minWidth: 800 }}>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#F4F3FB' }}>
                                            <TableCell sx={{
                                                position: 'sticky', left: 0, bgcolor: '#F4F3FB', zIndex: 2,
                                                borderRight: '2px solid #E8E8E8', fontWeight: '600',
                                                fontSize: '11px', color: '#666', textTransform: 'uppercase', minWidth: 200,
                                            }}>
                                                Staff Member
                                            </TableCell>
                                            {dateHeaders.map(dateStr => (
                                                <TableCell key={dateStr} align="center" sx={{
                                                    bgcolor: '#F4F3FB',
                                                    fontWeight: '600', fontSize: '11px', minWidth: 72,
                                                    borderLeft: '1px solid #E8E8E8', py: 1,
                                                }}>
                                                    <Typography sx={{ fontSize: '13px', fontWeight: '700', color: '#333' }}>
                                                        {getDayNum(dateStr)}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: '10px', color: '#aaa' }}>
                                                        {getDayName(dateStr)}
                                                    </Typography>
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredDetails.map(staff => (
                                            <TableRow key={staff.employeeCode} sx={{ '&:hover': { bgcolor: '#FAFAFA' } }}>
                                                <TableCell sx={{
                                                    position: 'sticky', left: 0, bgcolor: '#fff', zIndex: 1,
                                                    borderRight: '2px solid #E8E8E8',
                                                }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                                        <Avatar sx={{ width: 34, height: 34, bgcolor: '#7C5CFC', fontSize: '12px', fontWeight: '700' }}>
                                                            {getInitials(staff.name)}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography sx={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>
                                                                {staff.name}
                                                            </Typography>
                                                            <Typography sx={{ fontSize: '10px', color: '#999' }}>
                                                                {staff.employeeCode}
                                                                {staff.designation ? ` · ${staff.designation}` : ''}
                                                                {staff.department ? ` · ${staff.department}` : ''}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                                {staff.days.map((dayObj) => {
                                                    const status = mapStatus(dayObj.status);
                                                    const cellStyle = getCellStyle(status);
                                                    return (
                                                        <TableCell key={dayObj.date} align="center" sx={{
                                                            ...cellStyle,
                                                            borderLeft: '1px solid #E8E8E8', p: 0.8,
                                                            cursor: 'default',
                                                        }}>
                                                            {status === 'none' ? (
                                                                <Typography sx={{ fontSize: '12px', color: '#ccc' }}>—</Typography>
                                                            ) : status === 'absent' ? (
                                                                <Typography sx={{ fontSize: '10px', fontWeight: '700' }}>Absent</Typography>
                                                            ) : status === 'leave' ? (
                                                                <Typography sx={{ fontSize: '10px', fontWeight: '700' }}>Leave</Typography>
                                                            ) : status === 'late' ? (
                                                                <Typography sx={{ fontSize: '10px', fontWeight: '700' }}>
                                                                    {dayObj.loginTime || 'Late'}
                                                                </Typography>
                                                            ) : (
                                                                <Typography sx={{ fontSize: '10px', fontWeight: '600' }}>
                                                                    {dayObj.loginTime || '✓'}
                                                                </Typography>
                                                            )}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Legend */}
                            <Box sx={{ display: 'flex', gap: 2, mt: 2, pt: 2, borderTop: '1px solid #F0F0F0', flexWrap: 'wrap' }}>
                                {LEGEND.map(l => (
                                    <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                        <Box sx={{ width: 14, height: 14, borderRadius: '3px', bgcolor: l.bgcolor, border: `1px solid ${l.border}` }} />
                                        <Typography sx={{ fontSize: '11px', color: '#666' }}>{l.label}</Typography>
                                    </Box>
                                ))}
                            </Box>
                        </>
                    )}
                </CardContent>
            </Card>
        </Box>
        </>
    );
};

export default StaffAttendanceOverviewPage;
