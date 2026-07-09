import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    Typography,
    IconButton,
    TextField,
    Select,
    MenuItem,
    Avatar,
    Divider,
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CancelIcon from '@mui/icons-material/Cancel';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import DateRangeIcon from '@mui/icons-material/DateRange';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getStaffAttendanceOverview } from '../../Api/Api';
import SnackBar from '../SnackBar';

const token = "123";

const USER_TYPES = ['All User Types', 'Super Admin', 'Admin', 'Staff', 'Teacher'];

const VIEW_OPTIONS = [
    { label: '7 Days',    value: '7days' },
    { label: '15 Days',   value: '15days' },
    { label: 'From - To', value: 'custom' },
];

// Format JS Date → "DD-MM-YYYY" for API
const formatDateForApi = (dateObj) => {
    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const y = dateObj.getFullYear();
    return `${d}-${m}-${y}`;
};

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

// Academic year window (April → March) — matches the rest of the module.
const getCurrentAcademicYear = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    return m >= 4 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
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
        none:    { bgcolor: '#F9FAFB', color: '#bbb',    border: '1px solid #E8E8E8' },
    };
    return styles[status] || styles.none;
};

const LEGEND = [
    { label: 'Present', bgcolor: '#E8F5E9', border: '#A5D6A7' },
    { label: 'Late',    bgcolor: '#FFF3E0', border: '#FFCC80' },
    { label: 'Absent',  bgcolor: '#FFEBEE', border: '#EF9A9A' },
    { label: 'Leave',   bgcolor: '#E3F2FD', border: '#90CAF9' },
];

// Capitalize first letter
const capitalize = (str = '') => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

// Get initials from name
const getInitials = (name = '') =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

const today = new Date().toISOString().split('T')[0];

const StaffAttendanceOverviewPage = ({ isEmbedded = false }) => {
    const navigate = useNavigate();
    // Filters
    const [searchQuery, setSearchQuery]       = useState('');
    const [userTypeFilter, setUserTypeFilter] = useState('All User Types');

    // View range
    const [viewBy, setViewBy]     = useState('7days'); // '7days' | '15days' | 'custom'
    const [fromDate, setFromDate] = useState(today);
    const [toDate, setToDate]     = useState(today);

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
    const fetchOverview = useCallback(async () => {
        // For custom range, require both dates
        if (viewBy === 'custom' && (!fromDate || !toDate)) return;

        const range = viewBy === 'custom'
            ? { from: fromDate, to: toDate }
            : datesForViewPreset(viewBy);

        const params = {
            AcademicYear: getCurrentAcademicYear(),
            FromDate:     range.from,
            ToDate:       range.to,
            UserType:     userTypeFilter !== 'All User Types' ? userTypeFilter : '',
        };

        setIsLoading(true);
        try {
            const res = await axios.get(getStaffAttendanceOverview, {
                params,
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data && !res.data.error) {
                setOverviewData({
                    cards:       res.data.cards       || {},
                    dateHeaders: res.data.dateHeaders || [],
                    details:     res.data.details     || [],
                    staffCount:  res.data.staffCount  || 0,
                    fromDate:    res.data.fromDate    || '',
                    toDate:      res.data.toDate      || '',
                });
            } else {
                showSnack(res.data?.message || 'Failed to fetch data', false);
            }
        } catch (error) {
            console.error('Staff attendance overview error:', error);
            showSnack('Failed to load staff attendance overview', false);
        } finally {
            setIsLoading(false);
        }
    }, [viewBy, fromDate, toDate, userTypeFilter]);

    // Re-fetch when viewBy or userType changes (not on every fromDate/toDate keystroke for custom)
    useEffect(() => {
        if (viewBy !== 'custom') {
            fetchOverview();
        }
    }, [viewBy, userTypeFilter]);

    // Filtered details (client-side search only)
    const filteredDetails = overviewData.details.filter(s => {
        const q = searchQuery.toLowerCase();
        return (
            s.name.toLowerCase().includes(q) ||
            s.rollNumber.toLowerCase().includes(q)
        );
    });

    const { cards, dateHeaders } = overviewData;

    const STAT_CARDS = [
        { title: 'Total Present', value: cards.totalPresent ?? 0, icon: CheckCircleIcon, color: '#22C55E', border: '#22C55E', bg: '#EFF5FF' },
        { title: 'Total Late',    value: cards.totalLate    ?? 0, icon: AccessTimeIcon,  color: '#F97316', border: '#F97316', bg: '#FFF7ED' },
        { title: 'Total Leave',   value: cards.totalLeave   ?? 0, icon: EventBusyIcon,   color: '#7C5CFC', border: '#7C5CFC', bg: '#F3F0FE' },
        { title: 'Total Absent',  value: cards.totalAbsent  ?? 0, icon: CancelIcon,      color: '#DC2626', border: '#DC2626', bg: '#FEF2F2' },
    ];

    const viewLabel = viewBy === '7days' ? 'Last 7 days' : viewBy === '15days' ? 'Last 15 days' : 'Custom range';

    return (
        <>
        <SnackBar open={snackOpen} color={snackColor} setOpen={setSnackOpen} status={snackStatus} message={snackMessage} />
        <Box sx={{
            border: isEmbedded ? 'none' : '1px solid #E8E8E8',
            borderRadius: isEmbedded ? '0' : '20px',
            p: isEmbedded ? 0 : 2,
            height: isEmbedded ? 'auto' : '86vh',
            overflow: 'auto',
        }}>
            {/* Header — hidden when embedded */}
            {!isEmbedded && (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <IconButton onClick={() => navigate(-1)}>
                                <ArrowBackIcon />
                            </IconButton>
                            <Typography sx={{ fontSize: '24px', fontWeight: '700' }}>
                                Staff Attendance Overview
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                            <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}
                                sx={{ textTransform: 'none', borderRadius: '7px', borderColor: '#E8E8E8', color: '#333' }}>
                                Print
                            </Button>
                            <Button variant="contained" startIcon={<FileDownloadIcon />}
                                sx={{ textTransform: 'none', borderRadius: '7px', bgcolor: '#3457D5', '&:hover': { bgcolor: '#2847C4' } }}>
                                Export Report
                            </Button>
                        </Box>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                </>
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

                {/* User Type */}
                <Select
                    value={userTypeFilter}
                    onChange={(e) => setUserTypeFilter(e.target.value)}
                    size="small"
                    sx={{ minWidth: 150, bgcolor: '#fff', fontSize: '13px', borderRadius: '7px' }}
                >
                    {USER_TYPES.map(t => (
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
                    <DateRangeIcon sx={{ fontSize: 17, color: '#3457D5' }} />
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
                            bgcolor: viewBy === opt.value ? '#3457D5' : '#fff',
                            color:   viewBy === opt.value ? '#fff' : '#555',
                            border: `1px solid ${viewBy === opt.value ? '#3457D5' : '#E0E0E0'}`,
                            transition: 'all 0.18s',
                            '&:hover': {
                                bgcolor: viewBy === opt.value ? '#2847C4' : '#EEF2FF',
                                borderColor: '#3457D5',
                                color: viewBy === opt.value ? '#fff' : '#3457D5',
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
                                '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: '13px', '& fieldset': { borderColor: '#3457D5' } },
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
                                '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: '13px', '& fieldset': { borderColor: '#3457D5' } },
                            }}
                        />
                        <Button
                            variant="contained"
                            size="small"
                            onClick={fetchOverview}
                            disabled={!fromDate || !toDate}
                            sx={{
                                textTransform: 'none', borderRadius: '7px',
                                bgcolor: '#3457D5', '&:hover': { bgcolor: '#2847C4' },
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
                            <Card sx={{
                                boxShadow: 'none', border: `1px solid ${card.border}`,
                                borderRadius: '7px', bgcolor: card.bg,
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
                            }}>
                                <CardContent sx={{ py: '14px !important' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box>
                                            <Typography sx={{ fontSize: '11px', color: '#666', mb: 0.5 }}>
                                                {card.title}
                                            </Typography>
                                            <Typography sx={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', lineHeight: 1.1 }}>
                                                {card.value}
                                            </Typography>
                                            <Typography sx={{ fontSize: '10px', color: card.color, fontWeight: '600', mt: 0.5 }}>
                                                {viewLabel}
                                            </Typography>
                                        </Box>
                                        <Box sx={{
                                            width: 38, height: 38, borderRadius: '7px', bgcolor: card.bg,
                                            border: `1px solid ${card.border}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Icon sx={{ color: card.color, fontSize: 20 }} />
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            {/* ── Detailed Attendance Log ──────────────────────────────────── */}
            <Card sx={{ border: '1px solid #E8E8E8', borderRadius: '7px', boxShadow: 'none' }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography sx={{ fontSize: '16px', fontWeight: '600' }}>
                            Detailed Attendance Log
                        </Typography>
                        <Chip
                            icon={<CalendarTodayIcon sx={{ fontSize: '13px !important' }} />}
                            label={`${filteredDetails.length} Staff · ${dateHeaders.length} Days`}
                            size="small"
                            sx={{ bgcolor: '#E8EFFE', color: '#3457D5', fontWeight: '600', fontSize: '11px' }}
                        />
                    </Box>

                    {isLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                            <CircularProgress size={30} sx={{ color: '#3457D5' }} />
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
                                        <TableRow sx={{ bgcolor: '#F9FAFB' }}>
                                            <TableCell sx={{
                                                position: 'sticky', left: 0, bgcolor: '#F9FAFB', zIndex: 2,
                                                borderRight: '2px solid #E8E8E8', fontWeight: '600',
                                                fontSize: '11px', color: '#666', textTransform: 'uppercase', minWidth: 200,
                                            }}>
                                                Staff Member
                                            </TableCell>
                                            {dateHeaders.map(dateStr => (
                                                <TableCell key={dateStr} align="center" sx={{
                                                    bgcolor: '#F9FAFB',
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
                                            <TableRow key={staff.rollNumber} sx={{ '&:hover': { bgcolor: '#FAFAFA' } }}>
                                                <TableCell sx={{
                                                    position: 'sticky', left: 0, bgcolor: '#fff', zIndex: 1,
                                                    borderRight: '2px solid #E8E8E8',
                                                }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                                        <Avatar sx={{ width: 34, height: 34, bgcolor: '#3457D5', fontSize: '12px', fontWeight: '700' }}>
                                                            {getInitials(staff.name)}
                                                        </Avatar>
                                                        <Box>
                                                            <Typography sx={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>
                                                                {staff.name}
                                                            </Typography>
                                                            <Typography sx={{ fontSize: '10px', color: '#999' }}>
                                                                {staff.rollNumber} · {capitalize(staff.userType)}
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
