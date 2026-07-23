import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Card, CardContent, Grid, Typography, IconButton, Button, Chip,
    Avatar, TextField, InputAdornment, CircularProgress, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PendingIcon from '@mui/icons-material/Pending';
import SearchIcon from '@mui/icons-material/Search';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import RefreshIcon from '@mui/icons-material/Refresh';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import CloseIcon from '@mui/icons-material/Close';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import ContactPhoneOutlinedIcon from '@mui/icons-material/ContactPhoneOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import NotesIcon from '@mui/icons-material/Notes';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import { useNavigate } from 'react-router-dom';
import http from '../../Api/http';
import { GetLeaveApprovalStatusCheck, updateLeaveApprovalAction } from '../../Api/Api';
import useFinancialYear from '../../hooks/useFinancialYear';
import SnackBar from '../SnackBar';


// ─── Theme (matches other Leave & Attendance tabs) ─────────────────────────
const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_DARK = '#6246E0';
const PRIMARY_BORDER = '#C9BEFB';

// ─── Style maps ────────────────────────────────────────────────────────────
const LEAVE_TYPE_STYLE = {
    'Casual Leave':    { color: '#6246E0', bg: '#F3F0FE', border: '#C9BEFB' },
    'Sick Leave':      { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    'Medical Leave':   { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    'Planned Leave':   { color: '#16A34A', bg: '#EFF5FF', border: '#C9BEFB' },
    'Emergency Leave': { color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
    'Maternity Leave': { color: '#2563EB', bg: '#F3F0FE', border: '#C9BEFB' },
    'Paternity Leave': { color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC' },
    'Annual Leave':    { color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC' },
};

const AVATAR_PALETTE = ['#0E7490', '#1D4ED8', '#C2410C', '#6246E0', '#1D4ED8', '#BE185D', '#A16207', '#0F766E'];
const avatarColorFor = (name = '') => {
    const code = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0);
    return AVATAR_PALETTE[code % AVATAR_PALETTE.length];
};

const getInitials = (name = '') =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

// ─── Date helpers ──────────────────────────────────────────────────────────
const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getRelativeTime = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return '';
    const diffMs = Date.now() - d.getTime();
    if (diffMs < 0) return '';
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
};

const QUICK_REJECT_REASONS = [
    'Insufficient notice period',
    'Critical work period — please reschedule',
    'Documentation not provided',
    'Already covered by another leave',
    'Conflicting with team schedule',
];

export default function ApprovalWorkflowPage({ isEmbedded = false }) {
    const navigate = useNavigate();
    const financialYear = useFinancialYear();

    // ─── State ──────────────────────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [leaves, setLeaves] = useState([]);
    const [isFetching, setIsFetching] = useState(false);
    const [actionLoading, setActionLoading] = useState({});

    // Reject dialog
    const [rejectDialog, setRejectDialog] = useState({ open: false, leave: null });
    const [rejectReason, setRejectReason] = useState('');
    const [rejectLoading, setRejectLoading] = useState(false);

    // SnackBar
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState(false);
    const [color, setColor] = useState(false);
    const [message, setMessage] = useState('');
    const showSnack = (msg, success) => {
        setMessage(msg); setOpen(true); setColor(success); setStatus(success);
    };

    // ─── Fetch — always Status=Requested for this screen ───────────────────
    // The approval queue only shows leaves still awaiting a decision. Once a
    // leave is approved or rejected the API filters it out, so we drop the
    // row from local state on action to keep the UI in sync without refetch.
    const fetchLeaves = async () => {
        if (!financialYear) return;
        setIsFetching(true);
        try {
            // GET /Leave/GetLeaveApprovalStatusCheck?financialYear=YYYY-YYYY
            // Returns every leave still "Requested" — the whole approval queue.
            const res = await http.get(GetLeaveApprovalStatusCheck, {
                params: { financialYear },
            });
            const data = res?.data || {};
            setLeaves(!data.error && Array.isArray(data.leaves) ? data.leaves : []);
        } catch (error) {
            console.error('Error fetching leave approval status:', error);
            setLeaves([]);
            showSnack('Failed to load leave applications', false);
        } finally {
            setIsFetching(false);
        }
    };

    useEffect(() => {
        fetchLeaves();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [financialYear]);

    // ─── Filter (search across name, leave type, reason, roll number) ─────
    const q = search.trim().toLowerCase();
    const filtered = useMemo(() => {
        if (!q) return leaves;
        return leaves.filter(l =>
            (l.name || '').toLowerCase().includes(q) ||
            (l.leaveType || '').toLowerCase().includes(q) ||
            (l.reason || '').toLowerCase().includes(q) ||
            String(l.forRollNumber || '').toLowerCase().includes(q)
        );
    }, [leaves, q]);

    // ─── Action handler ────────────────────────────────────────────────────
    // PUT /Leave/UpdateLeaveApprovalAction
    //   ?leaveApplicationId=<id>&financialYear=YYYY-YYYY&action=accept|decline
    //   &reason=<text>   (reason sent only when declining)
    const handleDecision = async (leave, decision, reason = '') => {
        const id = leave.leaveApplicationId;
        const action = decision === 'approved' ? 'accept' : 'decline';
        setActionLoading(prev => ({ ...prev, [id]: true }));
        try {
            const params = { leaveApplicationId: id, financialYear, action };
            if (action === 'decline') params.reason = (reason || '').trim();
            const res = await http.put(updateLeaveApprovalAction, null, {
                params,
            });
            // Treat explicit { success: false } / { error: true } as a failure
            // even when the HTTP call itself succeeded.
            const body = res?.data;
            if (body && (body.success === false || body.error === true)) {
                showSnack(body.message || 'Failed to update leave status', false);
                return;
            }
            // Drop the row — it no longer belongs in the Requested queue.
            setLeaves(prev => prev.filter(l => l.leaveApplicationId !== id));
            showSnack(
                decision === 'approved'
                    ? `Leave approved for ${leave.name}`
                    : `Leave rejected for ${leave.name}`,
                true
            );
        } catch (error) {
            console.error('Error updating leave action:', error);
            showSnack(error?.response?.data?.message || 'Failed to update leave status', false);
        } finally {
            setActionLoading(prev => ({ ...prev, [id]: false }));
        }
    };

    const openRejectDialog = (leave) => {
        setRejectReason('');
        setRejectDialog({ open: true, leave });
    };
    const closeRejectDialog = () => {
        if (rejectLoading) return;
        setRejectDialog({ open: false, leave: null });
        setRejectReason('');
    };
    const handleRejectSubmit = async () => {
        if (!rejectDialog.leave) return;
        if (rejectReason.trim().length < 5) {
            showSnack('Please provide a rejection reason (at least 5 characters).', false);
            return;
        }
        setRejectLoading(true);
        await handleDecision(rejectDialog.leave, 'rejected', rejectReason.trim());
        setRejectLoading(false);
        setRejectDialog({ open: false, leave: null });
        setRejectReason('');
    };

    // ─── Helpers for rendering ─────────────────────────────────────────────
    const renderLeaveTypeChip = (type) => {
        const cfg = LEAVE_TYPE_STYLE[type] || { color: '#374151', bg: '#F3F4F6', border: '#E5E7EB' };
        return (
            <Chip label={type} size="small" sx={{
                bgcolor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                fontWeight: 700, fontSize: '10.5px', height: 22,
            }} />
        );
    };

    const isSingleDay = (from, to) => {
        if (!from || !to) return false;
        return new Date(from).toDateString() === new Date(to).toDateString();
    };

    return (
        <>
            <SnackBar open={open} color={color} setOpen={setOpen} status={status} message={message} />

            <Box sx={{
                border: isEmbedded ? 'none' : '1px solid #E5E7EB',
                borderRadius: isEmbedded ? '0' : '20px',
                p: isEmbedded ? 0 : 2,
                bgcolor: isEmbedded ? 'transparent' : '#F9FAFB',
                height: isEmbedded ? 'auto' : '86vh',
                overflow: isEmbedded ? 'visible' : 'auto',
            }}>
                {/* Standalone Header */}
                {!isEmbedded && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <IconButton onClick={() => navigate(-1)} sx={{ width: 32, height: 32 }}>
                            <ArrowBackIcon sx={{ fontSize: 18, color: '#000' }} />
                        </IconButton>
                        <Box sx={{
                            width: 36, height: 36, borderRadius: '7px',
                            bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <FactCheckOutlinedIcon sx={{ color: PRIMARY, fontSize: 20 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>
                                Leave Approval
                            </Typography>
                            <Typography sx={{ fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>
                                Review and act on pending leave applications
                            </Typography>
                        </Box>
                    </Box>
                )}

                {/* ─── Header strip (count + search + refresh) ────────────── */}
                <Card sx={{ border: '1px solid #E5E7EB', borderRadius: '7px', boxShadow: 'none', bgcolor: '#fff', mb: 2 }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                            {/* Pending count tile */}
                            <Box sx={{
                                display: 'flex', alignItems: 'center', gap: 1.2,
                                px: 1.4, py: 0.8, borderRadius: '7px',
                                bgcolor: '#E0F2FE', border: '1px solid #BAE6FD',
                                flexShrink: 0,
                            }}>
                                <Box sx={{
                                    width: 36, height: 36, borderRadius: '7px',
                                    bgcolor: '#fff', border: '1px solid #BAE6FD',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <PendingIcon sx={{ color: '#0EA5E9', fontSize: 22 }} />
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        Pending Review
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                        <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#111827', lineHeight: 1 }}>
                                            {leaves.length}
                                        </Typography>
                                        <Typography sx={{ fontSize: 11, color: '#92400E', fontWeight: 600 }}>
                                            request{leaves.length === 1 ? '' : 's'}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>

                            {/* Search */}
                            <TextField
                                size="small"
                                placeholder="Search by name, roll no, leave type, or reason..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon sx={{ fontSize: 16, color: q ? PRIMARY : '#9CA3AF' }} />
                                            </InputAdornment>
                                        ),
                                        endAdornment: q ? (
                                            <InputAdornment position="end">
                                                <IconButton size="small" onClick={() => setSearch('')} sx={{ p: 0.3 }}>
                                                    <CloseIcon sx={{ fontSize: 14, color: '#9CA3AF' }} />
                                                </IconButton>
                                            </InputAdornment>
                                        ) : null,
                                    },
                                }}
                                sx={{
                                    flex: 1, minWidth: 240,
                                    '& .MuiOutlinedInput-root': {
                                        height: 38, fontSize: '12.5px', borderRadius: '50px',
                                        bgcolor: q ? PRIMARY_LIGHT : '#fff',
                                        '& fieldset': { borderColor: q ? PRIMARY_BORDER : '#E5E7EB' },
                                        '&:hover fieldset': { borderColor: '#D1D5DB' },
                                        '&.Mui-focused fieldset': { borderColor: PRIMARY },
                                    },
                                }}
                            />

                            {q && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                                    <Typography sx={{ fontSize: 11.5, color: '#6B7280' }}>Showing</Typography>
                                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: PRIMARY_DARK }}>
                                        {filtered.length}
                                    </Typography>
                                    <Typography sx={{ fontSize: 11.5, color: '#6B7280' }}>
                                        of {leaves.length}
                                    </Typography>
                                </Box>
                            )}

                            <Tooltip arrow title="Refresh">
                                <IconButton
                                    onClick={fetchLeaves}
                                    disabled={isFetching}
                                    sx={{
                                        width: 38, height: 38, borderRadius: '7px',
                                        border: `1px solid ${PRIMARY_BORDER}`, bgcolor: PRIMARY_LIGHT,
                                        '&:hover': { bgcolor: '#DBEAFE', borderColor: PRIMARY },
                                    }}
                                >
                                    {isFetching
                                        ? <CircularProgress size={16} sx={{ color: PRIMARY }} />
                                        : <RefreshIcon sx={{ fontSize: 18, color: PRIMARY_DARK }} />}
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </CardContent>
                </Card>

                {/* ─── Cards grid ─────────────────────────────────────────── */}
                {isFetching && leaves.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                        <CircularProgress size={32} sx={{ color: PRIMARY }} />
                        <Typography sx={{ ml: 2, fontSize: '13px', color: '#6B7280' }}>
                            Loading approval queue…
                        </Typography>
                    </Box>
                ) : filtered.length === 0 ? (
                    <Card sx={{
                        border: '1px dashed #E5E7EB',
                        borderRadius: '7px', boxShadow: 'none', bgcolor: '#fff',
                        py: 6, textAlign: 'center',
                    }}>
                        <Box sx={{
                            width: 64, height: 64, borderRadius: '50%',
                            bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            mx: 'auto', mb: 1.5,
                        }}>
                            {q
                                ? <SearchIcon sx={{ fontSize: 30, color: PRIMARY }} />
                                : <InboxOutlinedIcon sx={{ fontSize: 32, color: PRIMARY }} />}
                        </Box>
                        <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                            {q ? `No requests match "${search}"` : 'All caught up — no pending requests'}
                        </Typography>
                        <Typography sx={{ fontSize: '11.5px', color: '#6B7280', mt: 0.4 }}>
                            {q
                                ? 'Try a different search term or clear the filter.'
                                : 'New leave applications will appear here for your approval.'}
                        </Typography>
                    </Card>
                ) : (
                    <Grid container spacing={2}>
                        {filtered.map((leave) => {
                            const id = leave.leaveApplicationId;
                            const isLoading = !!actionLoading[id];
                            const typeCfg = LEAVE_TYPE_STYLE[leave.leaveType] || { color: '#374151', bg: '#F3F4F6', border: '#E5E7EB' };
                            const avColor = avatarColorFor(leave.name || '');
                            const singleDay = isSingleDay(leave.fromDate, leave.toDate);
                            const days = Number(leave.workingDays) || 0;

                            return (
                                <Grid size={{ xs: 12, md: 6, xl: 4 }} key={id}>
                                    <Card sx={{
                                        position: 'relative',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '14px',
                                        boxShadow: 'none',
                                        bgcolor: '#fff',
                                        height: '100%',
                                        display: 'flex', flexDirection: 'column',
                                        overflow: 'hidden',
                                        transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            borderColor: PRIMARY_BORDER,
                                            boxShadow: `0 6px 20px ${PRIMARY}1A`,
                                        },
                                    }}>
                                        {/* Accent bar */}
                                        <Box sx={{
                                            position: 'absolute', left: 0, top: 0, bottom: 0,
                                            width: 4, bgcolor: typeCfg.color,
                                        }} />

                                        {/* Header */}
                                        <Box sx={{ p: 2, pb: 1, pl: 2.5 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2 }}>
                                                <Avatar sx={{
                                                    width: 40, height: 40,
                                                    bgcolor: `${avColor}15`,
                                                    color: avColor,
                                                    fontSize: '13px', fontWeight: 800,
                                                    border: `1px solid ${avColor}33`,
                                                    flexShrink: 0,
                                                }}>
                                                    {getInitials(leave.name)}
                                                </Avatar>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography sx={{
                                                        fontSize: '14px', fontWeight: 700, color: '#111827', lineHeight: 1.2,
                                                    }} noWrap>
                                                        {leave.name || '—'}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.3, flexWrap: 'wrap' }}>
                                                        <Typography sx={{
                                                            fontSize: 10.5, color: '#6B7280', fontFamily: 'monospace', fontWeight: 600,
                                                        }}>
                                                            {leave.forRollNumber}
                                                        </Typography>
                                                        {leave.createdOn && (
                                                            <>
                                                                <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: '#D1D5DB' }} />
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                                                    <AccessTimeIcon sx={{ fontSize: 11, color: '#9CA3AF' }} />
                                                                    <Typography sx={{ fontSize: 10.5, color: '#9CA3AF', fontWeight: 500 }}>
                                                                        {getRelativeTime(leave.createdOn)}
                                                                    </Typography>
                                                                </Box>
                                                            </>
                                                        )}
                                                    </Box>
                                                </Box>
                                                {renderLeaveTypeChip(leave.leaveType)}
                                            </Box>
                                        </Box>

                                        {/* Date strip */}
                                        <Box sx={{
                                            mx: 2, mt: 0.5, mb: 1.5,
                                            p: 1.2, borderRadius: '7px',
                                            bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            gap: 1, flexWrap: 'wrap',
                                        }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0 }}>
                                                <CalendarTodayIcon sx={{ fontSize: 15, color: PRIMARY_DARK, flexShrink: 0 }} />
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexWrap: 'wrap' }}>
                                                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#111827' }}>
                                                        {formatDate(leave.fromDate)}
                                                    </Typography>
                                                    {!singleDay && (
                                                        <>
                                                            <ArrowForwardIcon sx={{ fontSize: 13, color: PRIMARY }} />
                                                            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#111827' }}>
                                                                {formatDate(leave.toDate)}
                                                            </Typography>
                                                        </>
                                                    )}
                                                </Box>
                                            </Box>
                                            <Box sx={{
                                                px: 1.1, py: 0.3, borderRadius: '50px',
                                                bgcolor: '#fff', border: `1px solid ${PRIMARY}`,
                                                display: 'inline-flex', alignItems: 'center', gap: 0.4,
                                            }}>
                                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: PRIMARY_DARK, fontFamily: 'monospace' }}>
                                                    {days}
                                                </Typography>
                                                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: PRIMARY_DARK }}>
                                                    {days === 1 ? 'day' : 'days'}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* Body details */}
                                        <Box sx={{ px: 2, pb: 1.5, flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            {/* Reason */}
                                            <Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.4 }}>
                                                    <NotesIcon sx={{ fontSize: 13, color: '#9CA3AF' }} />
                                                    <Typography sx={{
                                                        fontSize: 9.5, color: '#9CA3AF', fontWeight: 700,
                                                        textTransform: 'uppercase', letterSpacing: 0.4,
                                                    }}>
                                                        Reason
                                                    </Typography>
                                                </Box>
                                                <Typography sx={{
                                                    fontSize: 12.5, color: '#374151', lineHeight: 1.5,
                                                    bgcolor: '#FAFAFA', border: '1px solid #F3F4F6',
                                                    borderRadius: '7px', px: 1.2, py: 0.8,
                                                }}>
                                                    {leave.reason || '—'}
                                                </Typography>
                                            </Box>

                                            {/* Contacts row */}
                                            <Grid container spacing={1}>
                                                <Grid size={{ xs: 6 }}>
                                                    <Box sx={{
                                                        p: 0.8, borderRadius: '7px',
                                                        bgcolor: '#FAFAFA', border: '1px solid #F3F4F6',
                                                    }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.2 }}>
                                                            <PhoneOutlinedIcon sx={{ fontSize: 12, color: '#6246E0' }} />
                                                            <Typography sx={{
                                                                fontSize: 9, color: '#9CA3AF', fontWeight: 700,
                                                                textTransform: 'uppercase', letterSpacing: 0.4,
                                                            }}>
                                                                Contact
                                                            </Typography>
                                                        </Box>
                                                        <Typography sx={{
                                                            fontSize: 11.5, fontWeight: 700, color: '#111827',
                                                            fontFamily: 'monospace',
                                                        }} noWrap>
                                                            {leave.contact || '—'}
                                                        </Typography>
                                                    </Box>
                                                </Grid>
                                                <Grid size={{ xs: 6 }}>
                                                    <Box sx={{
                                                        p: 0.8, borderRadius: '7px',
                                                        bgcolor: '#FAFAFA', border: '1px solid #F3F4F6',
                                                    }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.2 }}>
                                                            <ContactPhoneOutlinedIcon sx={{ fontSize: 12, color: '#DC2626' }} />
                                                            <Typography sx={{
                                                                fontSize: 9, color: '#9CA3AF', fontWeight: 700,
                                                                textTransform: 'uppercase', letterSpacing: 0.4,
                                                            }}>
                                                                Emergency
                                                            </Typography>
                                                        </Box>
                                                        <Typography sx={{
                                                            fontSize: 11.5, fontWeight: 700,
                                                            color: leave.emergencyContact ? '#111827' : '#9CA3AF',
                                                            fontFamily: 'monospace',
                                                            fontStyle: leave.emergencyContact ? 'normal' : 'italic',
                                                        }} noWrap>
                                                            {leave.emergencyContact || 'Not provided'}
                                                        </Typography>
                                                    </Box>
                                                </Grid>
                                            </Grid>

                                            {/* Remarks (only if meaningful) */}
                                            {leave.remarks && leave.remarks !== 'None' && (
                                                <Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.4 }}>
                                                        <EventNoteOutlinedIcon sx={{ fontSize: 13, color: '#9CA3AF' }} />
                                                        <Typography sx={{
                                                            fontSize: 9.5, color: '#9CA3AF', fontWeight: 700,
                                                            textTransform: 'uppercase', letterSpacing: 0.4,
                                                        }}>
                                                            Remarks
                                                        </Typography>
                                                    </Box>
                                                    <Typography sx={{
                                                        fontSize: 11.5, color: '#374151', lineHeight: 1.4,
                                                        fontStyle: 'italic',
                                                    }}>
                                                        “{leave.remarks}”
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>

                                        <Divider />

                                        {/* Action buttons */}
                                        <Box sx={{
                                            px: 2, py: 1.2,
                                            display: 'flex', gap: 1,
                                            bgcolor: '#FAFBFD',
                                        }}>
                                            <Button
                                                fullWidth
                                                disabled={isLoading}
                                                startIcon={<CancelIcon sx={{ fontSize: 16 }} />}
                                                onClick={() => openRejectDialog(leave)}
                                                sx={{
                                                    textTransform: 'none', fontSize: 13, fontWeight: 700,
                                                    color: '#B91C1C', bgcolor: '#fff',
                                                    border: '1px solid #FECACA', borderRadius: '7px',
                                                    height: 36, boxShadow: 'none',
                                                    '&:hover': { bgcolor: '#FEF2F2', borderColor: '#DC2626' },
                                                    '&.Mui-disabled': { color: '#FCA5A5', borderColor: '#FECACA' },
                                                }}
                                            >
                                                Reject
                                            </Button>
                                            <Button
                                                fullWidth
                                                disabled={isLoading}
                                                variant="contained"
                                                disableElevation
                                                startIcon={isLoading
                                                    ? <CircularProgress size={14} sx={{ color: '#fff' }} />
                                                    : <CheckCircleIcon sx={{ fontSize: 16 }} />}
                                                onClick={() => handleDecision(leave, 'approved')}
                                                sx={{
                                                    textTransform: 'none', fontSize: 13, fontWeight: 700,
                                                    bgcolor: PRIMARY, color: '#fff',
                                                    border: `1px solid ${PRIMARY}`,
                                                    borderRadius: '7px', height: 36,
                                                    boxShadow: 'none',
                                                    '&:hover': { bgcolor: PRIMARY_DARK, borderColor: PRIMARY_DARK },
                                                    '&.Mui-disabled': { bgcolor: '#C9BEFB', color: '#fff', borderColor: '#C9BEFB' },
                                                }}
                                            >
                                                {isLoading ? 'Working…' : 'Approve'}
                                            </Button>
                                        </Box>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                )}
            </Box>

            {/* ─── Reject Reason Dialog (mandatory) ────────────────────── */}
            <Dialog
                open={rejectDialog.open}
                onClose={closeRejectDialog}
                maxWidth="xs"
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: '14px' } } }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        <Box sx={{
                            width: 38, height: 38, borderRadius: '7px',
                            bgcolor: '#FEF2F2', border: '1px solid #FECACA',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <CancelIcon sx={{ color: '#DC2626', fontSize: 20 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                                Reject Leave
                            </Typography>
                            <Typography sx={{ fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>
                                {rejectDialog.leave
                                    ? `${rejectDialog.leave.name} · ${rejectDialog.leave.leaveType}`
                                    : 'A reason is required'}
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>

                <DialogContent sx={{ pt: '12px !important' }}>
                    <Typography sx={{
                        fontSize: 10.5, fontWeight: 700, color: '#6B7280',
                        textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.8,
                    }}>
                        Quick Reasons
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mb: 1.5 }}>
                        {QUICK_REJECT_REASONS.map(r => {
                            const isSelected = rejectReason.trim() === r;
                            return (
                                <Chip
                                    key={r}
                                    label={r}
                                    size="small"
                                    onClick={() => setRejectReason(r)}
                                    sx={{
                                        fontSize: 11, fontWeight: 600, height: 24,
                                        borderRadius: '7px', cursor: 'pointer',
                                        bgcolor: isSelected ? '#FEE2E2' : '#F3F4F6',
                                        color:   isSelected ? '#991B1B' : '#374151',
                                        border: `1px solid ${isSelected ? '#FCA5A5' : '#E5E7EB'}`,
                                        '&:hover': { bgcolor: isSelected ? '#FEE2E2' : '#FEF2F2', borderColor: '#FCA5A5' },
                                    }}
                                />
                            );
                        })}
                    </Box>

                    <Typography sx={{
                        fontSize: 10.5, fontWeight: 700, color: '#6B7280',
                        textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.6,
                    }}>
                        Reason for rejection <Box component="span" sx={{ color: '#DC2626' }}>*</Box>
                    </Typography>
                    <TextField
                        autoFocus
                        fullWidth
                        multiline
                        rows={3}
                        required
                        placeholder="Explain why this leave is being rejected — visible to the applicant"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value.slice(0, 250))}
                        error={rejectReason.length > 0 && rejectReason.trim().length < 5}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '7px', fontSize: '12.5px',
                                '&.Mui-focused fieldset': { borderColor: '#DC2626' },
                            },
                        }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                        <Typography sx={{
                            fontSize: 10,
                            color: rejectReason.length > 0 && rejectReason.trim().length < 5 ? '#DC2626' : '#9CA3AF',
                            fontWeight: 600,
                        }}>
                            Required · at least 5 characters
                        </Typography>
                        <Typography sx={{
                            fontSize: 10,
                            color: rejectReason.length > 230 ? '#DC2626' : '#9CA3AF',
                            fontWeight: 600,
                        }}>
                            {rejectReason.length}/250
                        </Typography>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button
                        onClick={closeRejectDialog}
                        disabled={rejectLoading}
                        sx={{
                            textTransform: 'none', borderRadius: '7px',
                            color: '#374151', fontWeight: 600, fontSize: '12.5px',
                            border: '1px solid #E5E7EB', px: 2, height: 34,
                            '&:hover': { bgcolor: '#F9FAFB' },
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleRejectSubmit}
                        disabled={rejectReason.trim().length < 5 || rejectLoading}
                        variant="contained"
                        disableElevation
                        startIcon={rejectLoading
                            ? <CircularProgress size={14} color="inherit" />
                            : <CancelIcon sx={{ fontSize: '15px !important' }} />}
                        sx={{
                            textTransform: 'none', borderRadius: '7px',
                            bgcolor: '#DC2626', fontWeight: 700, fontSize: '12.5px',
                            px: 2.2, height: 34, boxShadow: 'none',
                            '&:hover': { bgcolor: '#B91C1C', boxShadow: 'none' },
                            '&.Mui-disabled': { bgcolor: '#FECACA', color: '#fff' },
                        }}
                    >
                        {rejectLoading ? 'Rejecting…' : 'Reject Leave'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
