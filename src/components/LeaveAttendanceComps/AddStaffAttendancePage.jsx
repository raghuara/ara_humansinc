import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import {
    Box, Card, CardContent, Grid, Typography, Button, Chip,
    Avatar, Select, MenuItem, TextField, InputAdornment,
    Switch, Tooltip, CircularProgress, Alert, IconButton, Menu, Divider,
    Popover, Paper, Tabs, Tab,
} from '@mui/material';
import { List } from 'react-window';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LogoutIcon from '@mui/icons-material/Logout';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditNoteIcon from '@mui/icons-material/EditNote';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import StickyNote2Icon from '@mui/icons-material/StickyNote2';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlineRounded';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineRounded';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LoginIcon from '@mui/icons-material/Login';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { GetAttendanceTeacherBefore, PostTeachersManualAttendance, GetTeachersAttendance } from '../../Api/Api';
import SnackBar from '../SnackBar';

const today = new Date().toISOString().split('T')[0];
const token = "123";

// Academic year window (April → March) — matches the rest of the Leave &
// Attendance module. Returns format expected by the API, e.g. "2026-2027".
const getCurrentAcademicYear = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    return m >= 4 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};

// ─── Theme ───────────────────────────────────────────────────────────────────
const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_DARK = '#6246E0';
const PRIMARY_BORDER = '#C9BEFB';

// ─── Time / status logic ─────────────────────────────────────────────────────
const SCHOOL_START_HOUR = 9;       // 9:00 AM expected
const LATE_THRESHOLD_MIN = 15;     // > 9:15 → Late
const DEFAULT_CHECK_OUT = '17:00'; // 5:00 PM default for bulk fill

// ─── Display maps ────────────────────────────────────────────────────────────
const USER_TYPE_CONFIG = {
    'Teacher':     { color: '#6246E0', bg: '#F1EEFE' },
    'Staff':       { color: '#0E7490', bg: '#ECFEFF' },
    'Admin':       { color: '#1D4ED8', bg: '#F3F0FE' },
    'Super Admin': { color: '#1D4ED8', bg: '#F3F0FE' },
};

const ROLE_CONFIG = {
    'Teaching Staff':     { color: '#1D4ED8', bg: '#F3F0FE', border: '#C9BEFB' },
    'Non Teaching Staff': { color: '#0E7490', bg: '#ECFEFF', border: '#A5F3FC' },
    'Supporting Staff':   { color: '#C2410C', bg: '#FFF7ED', border: '#FED7AA' },
};

const STATUS_STYLE = {
    'Present':  { color: '#6246E0', bg: '#F1EEFE', border: '#C9BEFB' },
    'Absent':   { color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' },
    'Late':     { color: '#B45309', bg: '#E0F2FE', border: '#BAE6FD' },
    'On Leave': { color: '#1D4ED8', bg: '#F3F0FE', border: '#C9BEFB' },
};

const AVATAR_PALETTE = ['#0E7490', '#1D4ED8', '#C2410C', '#6246E0', '#1D4ED8', '#BE185D', '#A16207', '#0F766E'];
const avatarColorFor = (name = '') => {
    const code = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0);
    return AVATAR_PALETTE[code % AVATAR_PALETTE.length];
};

const USER_TYPE_DISPLAY = {
    'teacher':    'Teacher',
    'staff':      'Staff',
    'admin':      'Admin',
    'superadmin': 'Super Admin',
};

const ROLE_FROM_USER_TYPE = {
    'teacher':    'Teaching Staff',
    'staff':      'Supporting Staff',
    'admin':      'Non Teaching Staff',
    'superadmin': 'Non Teaching Staff',
};

const STATUS_API_TO_UI = {
    'present': 'Present',
    'absent':  'Absent',
    'late':    'Late',
    'leave':   'On Leave',
};

const STATUS_UI_TO_API = {
    'Present':  'present',
    'Absent':   'absent',
    'Late':     'late',
    'On Leave': 'leave',
};

const UI_TO_API_USER_TYPE = {
    'Teacher':     'teacher',
    'Staff':       'staff',
    'Admin':       'admin',
    'Super Admin': 'superadmin',
};

const FETCH_USER_TYPES = ['teacher', 'staff', 'admin'];

const STATUS_OPTIONS = ['Present', 'Late', 'Absent', 'On Leave'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const toHHmm = (date = new Date()) =>
    `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

const getCurrentTime = () => toHHmm(new Date());

const isoToApiDate = (isoDate) => {
    const [y, m, d] = isoDate.split('-');
    return `${d}-${m}-${y}`;
};

const parseHHmm = (hhmm) => {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
};

const isLateTime = (checkInHHmm) => {
    const mins = parseHHmm(checkInHHmm);
    if (mins === null) return false;
    return mins > (SCHOOL_START_HOUR * 60 + LATE_THRESHOLD_MIN);
};

const computeWorkingHours = (checkIn, checkOut) => {
    const a = parseHHmm(checkIn);
    const b = parseHHmm(checkOut);
    if (a === null || b === null || b <= a) return null;
    const diff = b - a;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return { hours: h, minutes: m, label: `${h}h ${m}m`, totalMinutes: diff };
};

// ─── Break helpers ────────────────────────────────────────────────────────────
const formatMinutes = (mins) => {
    if (!Number.isFinite(mins) || mins <= 0) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const computeBreakDuration = (out, back) => {
    const a = parseHHmm(out);
    const b = parseHHmm(back);
    if (a === null || b === null || b <= a) return 0;
    return b - a;
};

const computeTotalBreakMinutes = (breaks = []) =>
    breaks.reduce((sum, br) => sum + computeBreakDuration(br.out, br.in), 0);

// Default break presets used when "Add break" is clicked without prefilled times.
const BREAK_PRESETS = [
    { label: 'Morning Tea', out: '11:00', in: '11:15', icon: LocalCafeIcon, accent: '#0EA5E9', accentBg: '#E0F2FE', accentBorder: '#BAE6FD' },
    { label: 'Lunch',       out: '13:00', in: '13:30', icon: RestaurantIcon, accent: '#C2410C', accentBg: '#FFF7ED', accentBorder: '#FED7AA' },
    { label: 'Evening Tea', out: '16:00', in: '16:15', icon: LocalCafeIcon, accent: '#A16207', accentBg: '#FEFCE8', accentBorder: '#FEF08A' },
];

const makeBreakId = () => `br_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ─── Memoized status pill ────────────────────────────────────────────────────
const StatusPill = memo(function StatusPill({ value, selected, onClick, locked }) {
    const s = STATUS_STYLE[value];
    return (
        <Box
            onClick={locked ? undefined : onClick}
            sx={{
                px: 1.1, py: '3px', borderRadius: '50px',
                cursor: locked ? 'not-allowed' : 'pointer',
                border: `1px solid ${selected ? s.color : '#E5E7EB'}`,
                bgcolor: selected ? s.bg : '#fff',
                opacity: locked && !selected ? 0.45 : 1,
                transition: 'all 0.15s',
                '&:hover': locked ? {} : { borderColor: s.color, bgcolor: s.bg },
            }}
        >
            <Typography sx={{
                fontSize: '10.5px', fontWeight: selected ? 700 : 600,
                color: selected ? s.color : '#6B7280', whiteSpace: 'nowrap',
            }}>
                {value}
            </Typography>
        </Box>
    );
});

// ─── Memoized time cell ──────────────────────────────────────────────────────
const TimeCell = memo(function TimeCell({
    id, value, mark, onChange, icon, activeColor, mode, sameTimeEnabled,
}) {
    const needs = mark === 'Present' || mark === 'Late';
    if (!needs) {
        return (
            <Typography sx={{
                fontSize: '11px', fontStyle: 'italic', fontWeight: 500,
                color: mark === 'Absent' ? '#DC2626' : '#6246E0',
            }}>
                {mark === 'On Leave' ? 'On Leave' : '—'}
            </Typography>
        );
    }
    const disabled = sameTimeEnabled;
    const isEmpty = !value;
    return (
        <Tooltip
            title={disabled ? 'Controlled by "Same time for all" — disable toggle to edit individually' : ''}
            placement="top" arrow disableHoverListener={!disabled}
        >
            <span>
                <TextField
                    type="time"
                    size="small"
                    value={value}
                    disabled={disabled}
                    onChange={(e) => onChange(id, e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    {icon}
                                </InputAdornment>
                            ),
                        },
                    }}
                    sx={{
                        width: 125,
                        '& .MuiOutlinedInput-root': {
                            fontSize: '12px', fontWeight: 600, height: 32, bgcolor: '#fff',
                            '& fieldset': {
                                borderColor: isEmpty && mode === 'in' ? '#FCA5A5' : '#E5E7EB',
                                borderWidth: 1,
                            },
                            '&:hover fieldset': { borderColor: activeColor },
                            '&.Mui-focused fieldset': { borderColor: activeColor, borderWidth: 1.5 },
                            '&.Mui-disabled': {
                                bgcolor: '#F9FAFB',
                                '& input': { color: '#6B7280', WebkitTextFillColor: '#6B7280' },
                            },
                        },
                    }}
                />
            </span>
        </Tooltip>
    );
});

// ─── Column widths shared between header + virtual rows ────────────────────
// Both tabs render via react-window, so the original <TableCell> sizing has
// been replaced with explicit pixel widths so the flex header and the
// virtualized flex rows stay aligned.
const COL_STAFF = {
    serial:  46,
    member:  { flex: '1 1 220px', minWidth: 220 },
    role:    150,
    status:  300,
    checkIn: 150,
    checkOut: 150,
    work:    110,
    notes:   60,
};
const COL_BREAK = {
    serial:  46,
    member:  { flex: '0 0 220px', width: 220 },
    breaks:  { flex: '1 1 380px', minWidth: 380 },
    total:   120,
    count:   120,
};

// ─── Memoized staff row (rendered by react-window <List>) ──────────────────
// Receives { index, style } from the virtualizer; everything else comes via
// rowProps. The outer Box MUST apply `style` for the virtualizer's absolute
// positioning to work.
const StaffRow = memo(function StaffRow({
    index, style,
    items, marks, ins, outs, notes, sameTimeEnabled,
    leaveMap, sourceMap, breaksMap,
    onMarkChange, onCheckInChange, onCheckOutChange, onOpenNotes,
}) {
    const staff = items[index];
    if (!staff) return null;

    const mark = marks[staff.id] || '';
    const inT  = ins[staff.id]  || '';
    const outT = outs[staff.id] || '';
    const note = notes[staff.id] || '';
    const work = computeWorkingHours(inT, outT);
    // Net hours = gross − total break minutes. The Working Hrs cell shows the
    // net value with a small "− 55m brk" hint beneath, matching the Today's
    // Attendance tab.
    const breakMinForRow = work ? computeTotalBreakMinutes(breaksMap?.[staff.id] || []) : 0;
    const netWorkMin = work ? Math.max(0, work.totalMinutes - breakMinForRow) : 0;
    const roleConf = ROLE_CONFIG[staff.role] || { color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };
    const avColor = avatarColorFor(staff.name || '');
    const needsTime = mark === 'Present' || mark === 'Late';

    // Approved-leave lockdown — when leave is approved server-side we cannot
    // mark this staff member present/late/absent: the status is forced to
    // "On Leave" and all editable controls become read-only.
    const leaveInfo = leaveMap?.[staff.id];
    const isLeaveLocked = !!leaveInfo?.isOnApprovedLeave;
    const isHalfDayLeave = isLeaveLocked && !!leaveInfo?.approvedLeaveIsHalfDay;

    // Per-field source ("biometric" | "manual") for the small badge near times.
    const src = sourceMap?.[staff.id] || {};

    const checkInIcon = <AccessTimeIcon sx={{ fontSize: 14, color: PRIMARY }} />;
    const checkOutIcon = <LogoutIcon sx={{ fontSize: 14, color: '#1D4ED8' }} />;

    const renderSourceBadge = (source) => {
        if (!source) return null;
        const isBio = String(source).toLowerCase() === 'biometric';
        return (
            <Chip
                size="small"
                label={isBio ? 'Bio' : 'Manual'}
                sx={{
                    height: 14, fontSize: '8.5px', fontWeight: 700,
                    bgcolor: isBio ? '#EEF2FF' : '#F9FAFB',
                    color:   isBio ? '#4338CA' : '#6B7280',
                    border:  `1px solid ${isBio ? '#C7D2FE' : '#E5E7EB'}`,
                    mt: 0.3,
                    '& .MuiChip-label': { px: 0.6 },
                }}
            />
        );
    };

    return (
        <Box
            style={style}                 // ⬅ react-window positioning
            sx={{
                display: 'flex', alignItems: 'center',
                px: 1, gap: 1,
                borderBottom: '1px solid #F3F4F6',
                transition: 'background-color 0.15s',
                '&:hover': { bgcolor: PRIMARY_LIGHT },
            }}
        >
            <Box sx={{ width: COL_STAFF.serial, flexShrink: 0 }}>
                <Typography sx={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 500 }}>{index + 1}</Typography>
            </Box>
            <Box sx={{ ...COL_STAFF.member, display: 'flex', alignItems: 'center', gap: 1.1 }}>
                <Avatar src={staff.filePath || undefined}
                    sx={{
                        width: 32, height: 32,
                        bgcolor: `${avColor}15`,
                        color: avColor,
                        fontSize: '11px', fontWeight: 700,
                        border: `1px solid ${avColor}33`,
                        flexShrink: 0,
                    }}>
                    {staff.avatar}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827' }} noWrap>{staff.name}</Typography>
                        {isLeaveLocked && (
                            <Chip
                                size="small"
                                icon={<EventBusyIcon sx={{ fontSize: '11px !important' }} />}
                                label={isHalfDayLeave ? 'Half-Day Leave' : 'Approved Leave'}
                                sx={{
                                    height: 18, fontSize: '9.5px', fontWeight: 700,
                                    bgcolor: '#F3F0FE', color: '#1D4ED8',
                                    border: '1px solid #C9BEFB',
                                    '& .MuiChip-icon': { color: 'inherit', ml: '4px' },
                                    '& .MuiChip-label': { px: 0.7 },
                                }}
                            />
                        )}
                    </Box>
                    <Typography sx={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 500 }}>{staff.rollNumber}</Typography>
                </Box>
            </Box>
            <Box sx={{ width: COL_STAFF.role, flexShrink: 0 }}>
                <Chip label={staff.role} size="small"
                    sx={{
                        bgcolor: roleConf.bg, color: roleConf.color,
                        border: `1px solid ${roleConf.border}`,
                        fontWeight: 600, fontSize: '10px', height: 22,
                    }} />
            </Box>
            <Box sx={{ width: COL_STAFF.status, flexShrink: 0 }}>
                <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap' }}>
                    {STATUS_OPTIONS.map(opt => (
                        <StatusPill
                            key={opt}
                            value={opt}
                            selected={mark === opt}
                            locked={isLeaveLocked}
                            onClick={() => onMarkChange(staff.id, opt)}
                        />
                    ))}
                </Box>
            </Box>
            <Box sx={{ width: COL_STAFF.checkIn, flexShrink: 0 }}>
                <TimeCell
                    id={staff.id} value={inT} mark={mark} onChange={onCheckInChange}
                    icon={checkInIcon} activeColor={PRIMARY} mode="in" sameTimeEnabled={sameTimeEnabled}
                />
                {inT && renderSourceBadge(src.login)}
            </Box>
            <Box sx={{ width: COL_STAFF.checkOut, flexShrink: 0 }}>
                <TimeCell
                    id={staff.id} value={outT} mark={mark} onChange={onCheckOutChange}
                    icon={checkOutIcon} activeColor="#1D4ED8" mode="out" sameTimeEnabled={sameTimeEnabled}
                />
                {outT && renderSourceBadge(src.logout)}
            </Box>
            <Box sx={{ width: COL_STAFF.work, flexShrink: 0 }}>
                {needsTime && work ? (
                    <Tooltip
                        arrow placement="top"
                        title={
                            <Box sx={{ fontSize: '11px', lineHeight: 1.6 }}>
                                <div>Gross: <strong>{formatMinutes(work.totalMinutes)}</strong></div>
                                <div>Breaks: <strong>{formatMinutes(breakMinForRow)}</strong></div>
                                <div>Net: <strong>{formatMinutes(netWorkMin)}</strong></div>
                            </Box>
                        }
                    >
                        <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Chip size="small" label={formatMinutes(netWorkMin)}
                                sx={{
                                    bgcolor: PRIMARY_LIGHT, color: PRIMARY_DARK,
                                    border: `1px solid ${PRIMARY_BORDER}`,
                                    fontWeight: 700, fontSize: '11px', height: 22,
                                }} />
                            {breakMinForRow > 0 && (
                                <Typography sx={{
                                    fontSize: '9.5px', fontWeight: 600, color: '#0EA5E9',
                                    fontFamily: 'monospace', mt: 0.3,
                                }}>
                                    − {formatMinutes(breakMinForRow)} brk
                                </Typography>
                            )}
                        </Box>
                    </Tooltip>
                ) : (
                    <Typography sx={{ fontSize: '11px', color: '#D1D5DB' }}>—</Typography>
                )}
            </Box>
            <Box sx={{ width: COL_STAFF.notes, flexShrink: 0, textAlign: 'center' }}>
                <Tooltip title={note ? note : 'Add note'} placement="top" arrow>
                    <IconButton size="small"
                        onClick={(e) => onOpenNotes(e, staff.id)}
                        sx={{
                            color: note ? PRIMARY_DARK : '#9CA3AF',
                            bgcolor: note ? PRIMARY_LIGHT : 'transparent',
                            border: note ? `1px solid ${PRIMARY_BORDER}` : '1px solid transparent',
                            '&:hover': { bgcolor: PRIMARY_LIGHT, color: PRIMARY_DARK, border: `1px solid ${PRIMARY_BORDER}` },
                        }}
                    >
                        <StickyNote2Icon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
});

// ─── Helper: estimate break-row height for variable-height virtualization ──
// 64px base (avatar row) + 40px per break entry + 40px for the add-break /
// preset chip row. Returns ~64 when the row is not eligible (Absent / Leave)
// so all rows stay tightly packed for those statuses.
const estimateBreakRowHeight = (mark, breaksCount) => {
    const needsTime = mark === 'Present' || mark === 'Late';
    if (!needsTime) return 60;
    const base = 60;
    const perBreak = 40;
    const addBtnRow = 40;
    return base + (breaksCount * perBreak) + addBtnRow;
};

// ─── Memoized break editor row (rendered by react-window <List>) ───────────
const BreakRow = memo(function BreakRow({
    index, style,
    items, marks, ins, outs, breaksMap,
    onAddBreak, onUpdateBreak, onDeleteBreak, onAddPreset,
}) {
    const staff = items[index];
    if (!staff) return null;

    const mark = marks[staff.id] || '';
    const inT  = ins[staff.id]  || '';
    const outT = outs[staff.id] || '';
    const breaks = breaksMap[staff.id] || [];
    const totalBreakMin = computeTotalBreakMinutes(breaks);
    const avColor = avatarColorFor(staff.name || '');
    const needsTime = mark === 'Present' || mark === 'Late';

    // computeWorkingHours / netWorkMin kept for parity with the old component
    // even though they're no longer rendered after the earlier UI trim.
    /* eslint-disable no-unused-vars */
    const work = computeWorkingHours(inT, outT);
    const netWorkMin = work ? Math.max(0, work.totalMinutes - totalBreakMin) : 0;
    /* eslint-enable no-unused-vars */

    return (
        <Box
            style={style}                 // ⬅ react-window positioning
            sx={{
                display: 'flex', alignItems: 'flex-start',
                px: 1, py: 1.2, gap: 1,
                borderBottom: '1px solid #F3F4F6',
                transition: 'background-color 0.15s',
                '&:hover': { bgcolor: PRIMARY_LIGHT },
            }}
        >
            {/* S.No */}
            <Box sx={{ width: COL_BREAK.serial, flexShrink: 0, pt: 0.4 }}>
                <Typography sx={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 500 }}>{index + 1}</Typography>
            </Box>

            {/* Staff Member */}
            <Box sx={{ ...COL_BREAK.member, display: 'flex', alignItems: 'center', gap: 1.1, pt: 0.2 }}>
                <Avatar src={staff.filePath || undefined}
                    sx={{
                        width: 32, height: 32,
                        bgcolor: `${avColor}15`,
                        color: avColor,
                        fontSize: '11px', fontWeight: 700,
                        border: `1px solid ${avColor}33`,
                        flexShrink: 0,
                    }}>
                    {staff.avatar}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827' }} noWrap>{staff.name}</Typography>
                    <Typography sx={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 500 }}>{staff.rollNumber}</Typography>
                </Box>
            </Box>

            {/* Break editor */}
            <Box sx={{ ...COL_BREAK.breaks }}>
                {!needsTime ? (
                    <Typography sx={{ fontSize: '11px', fontStyle: 'italic', color: '#9CA3AF' }}>
                        Breaks not applicable
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.7 }}>
                        {breaks.length === 0 ? (
                            <Typography sx={{ fontSize: '11px', color: '#9CA3AF', fontStyle: 'italic', mb: 0.3 }}>
                                No breaks recorded yet
                            </Typography>
                        ) : breaks.map((br, i) => {
                            const dur = computeBreakDuration(br.out, br.in);
                            const isValid = dur > 0;
                            return (
                                <Box
                                    key={br.id}
                                    sx={{
                                        display: 'flex', alignItems: 'center', gap: 0.6,
                                        px: 0.8, py: 0.5,
                                        bgcolor: isValid ? '#E0F2FE' : '#F9FAFB',
                                        border: `1px solid ${isValid ? '#BAE6FD' : '#E5E7EB'}`,
                                        borderRadius: '7px',
                                    }}
                                >
                                    <Box sx={{
                                        width: 22, height: 22, borderRadius: '7px',
                                        bgcolor: isValid ? '#FFF' : '#F3F4F6',
                                        border: `1px solid ${isValid ? '#BAE6FD' : '#E5E7EB'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                    }}>
                                        <LocalCafeIcon sx={{ fontSize: 12, color: isValid ? '#0EA5E9' : '#9CA3AF' }} />
                                    </Box>
                                    <Typography sx={{ fontSize: '10.5px', fontWeight: 700, color: '#6B7280', minWidth: 42 }}>
                                        Break {i + 1}
                                    </Typography>
                                    <TextField
                                        type="time" size="small"
                                        value={br.out || ''}
                                        onChange={(e) => onUpdateBreak(staff.id, br.id, 'out', e.target.value)}
                                        sx={{
                                            width: 110,
                                            '& .MuiOutlinedInput-root': {
                                                fontSize: '11.5px', fontWeight: 600, height: 28, bgcolor: '#fff',
                                                '& fieldset': { borderColor: '#E5E7EB' },
                                                '&:hover fieldset': { borderColor: '#0EA5E9' },
                                                '&.Mui-focused fieldset': { borderColor: '#0EA5E9', borderWidth: 1.5 },
                                            },
                                        }}
                                    />
                                    <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#9CA3AF' }}>→</Typography>
                                    <TextField
                                        type="time" size="small"
                                        value={br.in || ''}
                                        onChange={(e) => onUpdateBreak(staff.id, br.id, 'in', e.target.value)}
                                        sx={{
                                            width: 110,
                                            '& .MuiOutlinedInput-root': {
                                                fontSize: '11.5px', fontWeight: 600, height: 28, bgcolor: '#fff',
                                                '& fieldset': { borderColor: '#E5E7EB' },
                                                '&:hover fieldset': { borderColor: PRIMARY },
                                                '&.Mui-focused fieldset': { borderColor: PRIMARY, borderWidth: 1.5 },
                                            },
                                        }}
                                    />
                                    <Chip
                                        size="small"
                                        label={isValid ? formatMinutes(dur) : '—'}
                                        sx={{
                                            height: 20, minWidth: 42, fontSize: '10px', fontWeight: 700,
                                            bgcolor: isValid ? '#FEF3C7' : '#F3F4F6',
                                            color: isValid ? '#92400E' : '#9CA3AF',
                                            border: `1px solid ${isValid ? '#BAE6FD' : '#E5E7EB'}`,
                                        }}
                                    />
                                </Box>
                            );
                        })}

                        {/* Add break + presets */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexWrap: 'wrap', mt: 0.2 }}>
                            <Button
                                size="small"
                                startIcon={<AddCircleOutlineIcon sx={{ fontSize: 14 }} />}
                                onClick={() => onAddBreak(staff.id)}
                                sx={{
                                    textTransform: 'none', fontSize: '11px', fontWeight: 700,
                                    height: 26, borderRadius: '7px', px: 1,
                                    color: PRIMARY_DARK,
                                    border: `1px dashed ${PRIMARY_BORDER}`,
                                    bgcolor: '#fff',
                                    '&:hover': { bgcolor: PRIMARY_LIGHT, borderStyle: 'solid' },
                                }}
                            >
                                Add Break
                            </Button>
                            {BREAK_PRESETS.map(p => {
                                const PIcon = p.icon;
                                return (
                                    <Tooltip key={p.label} arrow title={`Quick add: ${p.label} (${p.out} – ${p.in})`}>
                                        <Button
                                            size="small"
                                            startIcon={<PIcon sx={{ fontSize: 13 }} />}
                                            onClick={() => onAddPreset(staff.id, p)}
                                            sx={{
                                                textTransform: 'none', fontSize: '10.5px', fontWeight: 600,
                                                height: 26, borderRadius: '7px', px: 0.8,
                                                color: p.accent, bgcolor: p.accentBg,
                                                border: `1px solid ${p.accentBorder}`,
                                                '&:hover': { bgcolor: p.accentBg, borderColor: p.accent, filter: 'brightness(0.97)' },
                                            }}
                                        >
                                            {p.label}
                                        </Button>
                                    </Tooltip>
                                );
                            })}
                        </Box>
                    </Box>
                )}
            </Box>

            {/* Total Break Time */}
            <Box sx={{ width: COL_BREAK.total, flexShrink: 0, pt: 0.4 }}>
                {needsTime ? (
                    <Chip
                        size="small"
                        icon={<LocalCafeIcon sx={{ fontSize: '12px !important' }} />}
                        label={formatMinutes(totalBreakMin)}
                        sx={{
                            bgcolor: totalBreakMin > 0 ? '#E0F2FE' : '#F3F4F6',
                            color: totalBreakMin > 0 ? '#92400E' : '#9CA3AF',
                            border: `1px solid ${totalBreakMin > 0 ? '#BAE6FD' : '#E5E7EB'}`,
                            fontWeight: 700, fontSize: '11px', height: 22,
                            '& .MuiChip-icon': { color: 'inherit', ml: '6px' },
                        }}
                    />
                ) : (
                    <Typography sx={{ fontSize: '11px', color: '#D1D5DB' }}>—</Typography>
                )}
            </Box>

            {/* Breaks count summary */}
            <Box sx={{ width: COL_BREAK.count, flexShrink: 0, pt: 0.4 }}>
                {needsTime ? (
                    <Chip
                        size="small"
                        icon={<TimerOutlinedIcon sx={{ fontSize: '12px !important' }} />}
                        label={`${breaks.length} ${breaks.length === 1 ? 'break' : 'breaks'}`}
                        sx={{
                            bgcolor: breaks.length > 0 ? PRIMARY_LIGHT : '#F3F4F6',
                            color: breaks.length > 0 ? PRIMARY_DARK : '#9CA3AF',
                            border: `1px solid ${breaks.length > 0 ? PRIMARY_BORDER : '#E5E7EB'}`,
                            fontWeight: 700, fontSize: '11px', height: 22,
                            '& .MuiChip-icon': { color: 'inherit', ml: '6px' },
                        }}
                    />
                ) : (
                    <Typography sx={{ fontSize: '11px', color: '#D1D5DB' }}>—</Typography>
                )}
            </Box>
        </Box>
    );
});

// ─── Component ───────────────────────────────────────────────────────────────
export default function AddStaffAttendancePage() {
    const user = useSelector(state => state.auth);
    const currentUserRoll = user?.rollNumber || '';

    const [attendanceDate, setAttendanceDate] = useState(today);
    const [userTypeFilter, setUserTypeFilter] = useState('Teacher');
    const [searchText, setSearchText] = useState('');

    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isAttendanceAddedMap, setIsAttendanceAddedMap] = useState({});

    const isMounted = useRef(false);

    // Active tab: 0 = Check In/Out, 1 = Break In/Out
    const [activeTab, setActiveTab] = useState(0);

    // Per-row state
    const [attendanceMarks, setAttendanceMarks] = useState({}); // id → 'Present' | ...
    const [checkInTimes, setCheckInTimes]       = useState({}); // id → 'HH:MM'
    const [checkOutTimes, setCheckOutTimes]     = useState({}); // id → 'HH:MM'
    const [rowNotes, setRowNotes]               = useState({}); // id → text
    const [breaksMap, setBreaksMap]             = useState({}); // id → [{ id, out, in }]

    // Per-row enrichments from GetTeachersAttendance:
    //   leaveMap  → { rollNumber: { isOnApprovedLeave, approvedLeaveIsHalfDay } }
    //   sourceMap → { rollNumber: { login: 'biometric'|'manual', logout: '...' } }
    const [leaveMap, setLeaveMap]   = useState({});
    const [sourceMap, setSourceMap] = useState({});

    // Bulk-time controls
    const [sameTimeEnabled, setSameTimeEnabled] = useState(false);
    const [globalCheckIn, setGlobalCheckIn]     = useState('');
    const [globalCheckOut, setGlobalCheckOut]   = useState('');

    // Notes popover
    const [notesAnchor, setNotesAnchor] = useState(null);
    const [notesTargetId, setNotesTargetId] = useState(null);

    // Bulk menu
    const [bulkMenuAnchor, setBulkMenuAnchor] = useState(null);

    // SnackBar
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState(false);
    const [color, setColor] = useState(false);
    const [message, setMessage] = useState('');
    const showSnack = (msg, success) => {
        setMessage(msg); setOpen(true); setColor(success); setStatus(success);
    };

    // ─── Data fetch ──────────────────────────────────────────────────────────
    // Trim "HH:MM:SS" → "HH:MM" for the time inputs. The server uses seconds;
    // the UI uses HH:MM and we re-append :00 on save (via toApiTime).
    const trimSec = (t) => (t && t.length >= 5 ? t.slice(0, 5) : (t || ''));

    const mapStaffItem = (item) => {
        const apiUType = item.userType?.toLowerCase() || '';

        // Login/logout — prefer the new `punches[]` shape, fall back to the
        // legacy `dateTime` / `checkOut` fields.
        const firstPunch = Array.isArray(item.punches) && item.punches.length > 0 ? item.punches[0] : null;
        const lastPunch  = Array.isArray(item.punches) && item.punches.length > 0 ? item.punches[item.punches.length - 1] : null;
        const existingCheckIn = firstPunch?.loginTime
            ? trimSec(firstPunch.loginTime)
            : (item.dateTime ? (item.dateTime.split(' ')[1] || '') : '');
        const existingCheckOut = lastPunch?.logoutTime
            ? trimSec(lastPunch.logoutTime)
            : (item.checkOut || '');

        // Existing server breaks — KEEP the server `breakNo` so edits route
        // through update mode (per spec A4). Breaks added locally afterwards
        // will have no `breakNo`, which signals the server to assign one (A3).
        const existingBreaks = Array.isArray(item.breaks)
            ? item.breaks.map(b => ({
                id: makeBreakId(),
                out: trimSec(b.breakOutTime),
                in:  trimSec(b.breakInTime),
                breakNo: Number.isInteger(b.breakNo) ? b.breakNo : undefined,
            })).filter(b => b.out || b.in)
            : [];

        return {
            id: item.rollNumber,
            rollNumber: item.rollNumber,
            // PostTeachersManualAttendance expects EmployeeId per item — the
            // GetAttendanceTeacherBefore response calls it `biometricId`.
            employeeId: item.biometricId || item.employeeId || '',
            name: item.name,
            userType: USER_TYPE_DISPLAY[apiUType] || item.userType,
            role: ROLE_FROM_USER_TYPE[apiUType] || 'Non Teaching Staff',
            avatar: item.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
            filePath: item.filePath || '',
            existingStatus: item.status || '',
            existingCheckIn,
            existingCheckOut,
            existingNotes: item.notes || '',
            existingBreaks,
        };
    };

    const initRowState = (staff) => {
        const marks = {}, ins = {}, outs = {}, notes = {}, brks = {};
        staff.forEach(s => {
            // Only seed a status when the server already has one for this
            // staff — otherwise leave it empty so the user has to pick.
            const fromServer = STATUS_API_TO_UI[s.existingStatus.toLowerCase()];
            marks[s.id] = fromServer || '';
            ins[s.id]   = s.existingCheckIn;
            outs[s.id]  = s.existingCheckOut;
            notes[s.id] = s.existingNotes;
            brks[s.id]  = s.existingBreaks || [];
        });
        return { marks, ins, outs, notes, brks };
    };

    // GET /GetAttendanceTeacherBefore?AcademicYear=YYYY-YYYY&UserType=<role>
    // Returns { details: [{ rollNumber, name, userType, status, dateTime, ... }] }.
    // The endpoint no longer returns the top-level `isAttendanceAdded` flag, so
    // we derive it per user-type from whether any row has a populated `status`.
    const fetchStaffList = async () => {
        setLoading(true);
        const academicYear = getCurrentAcademicYear();
        try {
            const results = await Promise.allSettled(
                FETCH_USER_TYPES.map(uType =>
                    axios.get(GetAttendanceTeacherBefore, {
                        params: { AcademicYear: academicYear, UserType: uType },
                        headers: { Authorization: `Bearer ${token}` },
                    })
                )
            );

            const allStaff = [];
            const addedMap = {};
            results.forEach((result, i) => {
                const uiType = USER_TYPE_DISPLAY[FETCH_USER_TYPES[i]];
                if (result.status === 'fulfilled' && !result.value.data.error) {
                    const { details = [], isAttendanceAdded: flag } = result.value.data;
                    const isAdded = flag === 'Y' ? true
                        : flag === 'N' ? false
                        : details.some(d => d.status && String(d.status).trim().length > 0);
                    addedMap[uiType] = isAdded;
                    details.forEach(item => allStaff.push(mapStaffItem(item)));
                } else {
                    addedMap[uiType] = false;
                }
            });

            setStaffList(allStaff);
            setIsAttendanceAddedMap(addedMap);
            const { marks, ins, outs, notes, brks } = initRowState(allStaff);
            setAttendanceMarks(marks); setCheckInTimes(ins); setCheckOutTimes(outs); setRowNotes(notes);
            setBreaksMap(brks);
        } catch {
            showSnack('Failed to load staff list', false);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserType = async (uiType) => {
        const apiUType = UI_TO_API_USER_TYPE[uiType] || uiType.toLowerCase();
        setLoading(true);
        const academicYear = getCurrentAcademicYear();
        try {
            const res = await axios.get(GetAttendanceTeacherBefore, {
                params: { AcademicYear: academicYear, UserType: apiUType },
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.data.error) {
                const { details = [], isAttendanceAdded: flag } = res.data;
                const newStaff = details.map(item => mapStaffItem(item));
                const isAdded = flag === 'Y' ? true
                    : flag === 'N' ? false
                    : details.some(d => d.status && String(d.status).trim().length > 0);

                setStaffList(prev => [...prev.filter(s => s.userType !== uiType), ...newStaff]);
                setIsAttendanceAddedMap(prev => ({ ...prev, [uiType]: isAdded }));

                const apply = (prev, key) => {
                    const updated = { ...prev };
                    newStaff.forEach(s => {
                        if (key === 'marks')  updated[s.id] = STATUS_API_TO_UI[s.existingStatus.toLowerCase()] || '';
                        if (key === 'ins')    updated[s.id] = s.existingCheckIn;
                        if (key === 'outs')   updated[s.id] = s.existingCheckOut;
                        if (key === 'notes')  updated[s.id] = s.existingNotes;
                        if (key === 'brks')   updated[s.id] = s.existingBreaks || [];
                    });
                    return updated;
                };
                setAttendanceMarks(prev => apply(prev, 'marks'));
                setCheckInTimes(prev   => apply(prev, 'ins'));
                setCheckOutTimes(prev  => apply(prev, 'outs'));
                setRowNotes(prev       => apply(prev, 'notes'));
                setBreaksMap(prev      => apply(prev, 'brks'));
            }
        } catch {
            showSnack('Failed to reload staff data', false);
        } finally {
            setLoading(false);
        }
    };

    // GET /teachersattendance/GetTeachersAttendance
    //   ?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD&academicYear=YYYY-YYYY
    // Fetches the actual per-staff record for the selected date so the row
    // pre-fills with existing punches / breaks / leaves and the source
    // (biometric vs manual) for each filled field. Only enriches staff that
    // already appear in `staffList` — it does NOT add new rows.
    const fetchTodaysAttendance = async () => {
        try {
            const res = await axios.get(GetTeachersAttendance, {
                params: {
                    fromDate: attendanceDate,
                    toDate:   attendanceDate,
                    academicYear: getCurrentAcademicYear(),
                },
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res?.data || res.data.error) return;
            const rows = Array.isArray(res.data.data) ? res.data.data : [];
            if (rows.length === 0) return;

            const marksDelta  = {};
            const insDelta    = {};
            const outsDelta   = {};
            const breaksDelta = {};
            const leaveDelta  = {};
            const srcDelta    = {};

            rows.forEach(rec => {
                const id = rec.rollNumber;
                if (!id) return;

                const firstPunch = Array.isArray(rec.punches) && rec.punches.length > 0 ? rec.punches[0] : null;
                const lastPunch  = Array.isArray(rec.punches) && rec.punches.length > 0 ? rec.punches[rec.punches.length - 1] : null;
                const login  = trimSec(firstPunch?.loginTime);
                const logout = trimSec(lastPunch?.logoutTime);

                // Leaves — auto-lock to "On Leave" when approved by server.
                const leaveRow = Array.isArray(rec.leaves) ? rec.leaves.find(l => l?.isOnApprovedLeave) : null;
                if (leaveRow) {
                    leaveDelta[id] = {
                        isOnApprovedLeave: true,
                        approvedLeaveIsHalfDay: !!leaveRow.approvedLeaveIsHalfDay,
                    };
                    marksDelta[id] = 'On Leave';
                } else if (login) {
                    // Derive late vs present from the login time relative to the
                    // school start + late threshold.
                    const [hh, mm] = login.split(':').map(Number);
                    const lateAfter = SCHOOL_START_HOUR * 60 + LATE_THRESHOLD_MIN;
                    marksDelta[id] = (hh * 60 + (mm || 0)) > lateAfter ? 'Late' : 'Present';
                }

                if (login)  insDelta[id]  = login;
                if (logout) outsDelta[id] = logout;

                // Breaks — keep server breakNo so update-mode works (per A4).
                if (Array.isArray(rec.breaks) && rec.breaks.length > 0) {
                    breaksDelta[id] = rec.breaks.map(b => ({
                        id: makeBreakId(),
                        out: trimSec(b.breakOutTime),
                        in:  trimSec(b.breakInTime),
                        breakNo: Number.isInteger(b.breakNo) ? b.breakNo : undefined,
                        outSource: b.breakOutSource || '',
                        inSource:  b.breakInSource  || '',
                    }));
                }

                // Source badges next to login/logout times.
                srcDelta[id] = {
                    login:  firstPunch?.loginSource  || '',
                    logout: lastPunch?.logoutSource  || '',
                };
            });

            if (Object.keys(marksDelta).length)  setAttendanceMarks(prev => ({ ...prev, ...marksDelta }));
            if (Object.keys(insDelta).length)    setCheckInTimes(prev   => ({ ...prev, ...insDelta }));
            if (Object.keys(outsDelta).length)   setCheckOutTimes(prev  => ({ ...prev, ...outsDelta }));
            if (Object.keys(breaksDelta).length) setBreaksMap(prev      => ({ ...prev, ...breaksDelta }));
            if (Object.keys(leaveDelta).length)  setLeaveMap(prev       => ({ ...prev, ...leaveDelta }));
            if (Object.keys(srcDelta).length)    setSourceMap(prev      => ({ ...prev, ...srcDelta }));
        } catch (err) {
            console.error("Failed to enrich today's attendance:", err);
            // Soft-fail — base staff list still works without enrichment.
        }
    };

    useEffect(() => {
        isMounted.current = false;
        fetchStaffList().then(() => fetchTodaysAttendance());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attendanceDate]);

    useEffect(() => {
        if (!isMounted.current) { isMounted.current = true; return; }
        fetchUserType(userTypeFilter).then(() => fetchTodaysAttendance());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userTypeFilter]);

    // ─── Derived ─────────────────────────────────────────────────────────────
    const needsTime = (id) => {
        const s = attendanceMarks[id];
        return s === 'Present' || s === 'Late';
    };

    const userTypes = Object.keys(USER_TYPE_CONFIG);

    const filteredStaff = useMemo(() =>
        staffList.filter(s => {
            const matchUserType = s.userType === userTypeFilter;
            const q = searchText.trim().toLowerCase();
            const matchSearch = !q ||
                s.name.toLowerCase().includes(q) ||
                String(s.rollNumber).toLowerCase().includes(q);
            return matchUserType && matchSearch;
        }),
        [staffList, userTypeFilter, searchText]
    );

    const counts = useMemo(() => ({
        present: filteredStaff.filter(s => attendanceMarks[s.id] === 'Present').length,
        absent:  filteredStaff.filter(s => attendanceMarks[s.id] === 'Absent').length,
        late:    filteredStaff.filter(s => attendanceMarks[s.id] === 'Late').length,
        onLeave: filteredStaff.filter(s => attendanceMarks[s.id] === 'On Leave').length,
    }), [filteredStaff, attendanceMarks]);

    const isCurrentTypeAdded = isAttendanceAddedMap[userTypeFilter] || false;

    // ─── Handlers ────────────────────────────────────────────────────────────
    const handleMarkChange = useCallback((id, newMark) => {
        setAttendanceMarks(prev => (prev[id] === newMark ? prev : { ...prev, [id]: newMark }));
        if (newMark === 'Absent' || newMark === 'On Leave') {
            setCheckInTimes(prev => (prev[id] ? { ...prev, [id]: '' } : prev));
            setCheckOutTimes(prev => (prev[id] ? { ...prev, [id]: '' } : prev));
        }
    }, []);

    const handleCheckInChange = useCallback((id, value) => {
        setCheckInTimes(prev => ({ ...prev, [id]: value }));
        // Auto-flip Present↔Late based on the new time, but only if it would actually change.
        setAttendanceMarks(prev => {
            const cur = prev[id];
            if (cur === 'Present' && isLateTime(value)) return { ...prev, [id]: 'Late' };
            if (cur === 'Late' && value && !isLateTime(value)) return { ...prev, [id]: 'Present' };
            return prev;
        });
    }, []);

    // Keep a ref of the latest check-in times so the check-out validator can read it
    // without forcing handleCheckOutChange to depend on state (which would invalidate memo).
    const checkInTimesRef = useRef(checkInTimes);
    useEffect(() => { checkInTimesRef.current = checkInTimes; }, [checkInTimes]);

    const handleCheckOutChange = useCallback((id, value) => {
        const checkIn = checkInTimesRef.current[id];
        if (checkIn && parseHHmm(value) !== null && parseHHmm(value) <= parseHHmm(checkIn)) {
            showSnack('Check-out must be after check-in', false);
            return;
        }
        setCheckOutTimes(prev => ({ ...prev, [id]: value }));
    }, []);

    const handleOpenNotes = useCallback((e, id) => {
        setNotesAnchor(e.currentTarget);
        setNotesTargetId(id);
    }, []);

    const applyGlobalCheckIn = (time) => {
        setGlobalCheckIn(time);
        setCheckInTimes(prev => {
            const updated = { ...prev };
            filteredStaff.forEach(s => { if (needsTime(s.id)) updated[s.id] = time; });
            return updated;
        });
        // Auto-late sync
        if (time) {
            setAttendanceMarks(prev => {
                const updated = { ...prev };
                filteredStaff.forEach(s => {
                    if (updated[s.id] === 'Present' && isLateTime(time)) updated[s.id] = 'Late';
                    else if (updated[s.id] === 'Late' && !isLateTime(time)) updated[s.id] = 'Present';
                });
                return updated;
            });
        }
    };

    const applyGlobalCheckOut = (time) => {
        setGlobalCheckOut(time);
        setCheckOutTimes(prev => {
            const updated = { ...prev };
            filteredStaff.forEach(s => { if (needsTime(s.id)) updated[s.id] = time; });
            return updated;
        });
    };

    const handleFillCurrentTime = () => {
        const now = getCurrentTime();
        setCheckInTimes(prev => {
            const updated = { ...prev };
            filteredStaff.forEach(s => {
                if (needsTime(s.id) && !updated[s.id]) updated[s.id] = now;
            });
            return updated;
        });
    };

    const handleFillDefaultCheckOut = () => {
        setCheckOutTimes(prev => {
            const updated = { ...prev };
            filteredStaff.forEach(s => {
                if (needsTime(s.id) && !updated[s.id]) updated[s.id] = DEFAULT_CHECK_OUT;
            });
            return updated;
        });
    };

    const handleBulkStatus = (newMark) => {
        setBulkMenuAnchor(null);
        setAttendanceMarks(prev => {
            const updated = { ...prev };
            filteredStaff.forEach(s => { updated[s.id] = newMark; });
            return updated;
        });
        if (newMark === 'Absent' || newMark === 'On Leave') {
            setCheckInTimes(prev => {
                const updated = { ...prev };
                filteredStaff.forEach(s => { updated[s.id] = ''; });
                return updated;
            });
            setCheckOutTimes(prev => {
                const updated = { ...prev };
                filteredStaff.forEach(s => { updated[s.id] = ''; });
                return updated;
            });
        }
    };

    const handleSameTimeToggle = (enabled) => {
        setSameTimeEnabled(enabled);
        if (enabled) {
            if (globalCheckIn)  applyGlobalCheckIn(globalCheckIn);
            if (globalCheckOut) applyGlobalCheckOut(globalCheckOut);
        } else {
            setGlobalCheckIn(''); setGlobalCheckOut('');
        }
    };

    const closeNotesPopover = () => { setNotesAnchor(null); setNotesTargetId(null); };

    // ─── Break handlers ──────────────────────────────────────────────────────
    const handleAddBreak = useCallback((staffId) => {
        setBreaksMap(prev => ({
            ...prev,
            [staffId]: [...(prev[staffId] || []), { id: makeBreakId(), out: '', in: '' }],
        }));
    }, []);

    const handleAddPreset = useCallback((staffId, preset) => {
        setBreaksMap(prev => ({
            ...prev,
            [staffId]: [...(prev[staffId] || []), { id: makeBreakId(), out: preset.out, in: preset.in }],
        }));
    }, []);

    const handleUpdateBreak = useCallback((staffId, breakId, field, value) => {
        setBreaksMap(prev => {
            const list = prev[staffId] || [];
            return {
                ...prev,
                [staffId]: list.map(br => (br.id === breakId ? { ...br, [field]: value } : br)),
            };
        });
    }, []);

    const handleDeleteBreak = useCallback((staffId, breakId) => {
        setBreaksMap(prev => {
            const list = (prev[staffId] || []).filter(br => br.id !== breakId);
            return { ...prev, [staffId]: list };
        });
    }, []);

    // POST /teachersattendance/PostTeachersManualAttendance
    // Body shape:
    //   {
    //     editorRollNumber, date (YYYY-MM-DD), academicYear, reason,
    //     items: [{
    //       rollNumber, employeeId,
    //       status, loginTime (HH:MM:SS), logoutTime (HH:MM:SS),
    //       breaks: [{ breakNo?, breakOutTime, breakInTime }]
    //     }]
    //   }
    // Each item only includes the fields the user actually filled in — the
    // backend treats missing fields as "no change" so we don't overwrite
    // existing punches with empty values.
    const handleSaveAttendance = async () => {
        // Append ":00" so HH:MM from the time inputs becomes HH:MM:SS for the API.
        const toApiTime = (hhmm) => (hhmm && hhmm.length === 5 ? `${hhmm}:00` : (hhmm || ''));

        // Partial save: only include rows the user actually filled in.
        //   • No status picked      → skip (untouched row).
        //   • Present/Late w/o time → skip (incomplete — quietly counted so
        //                              the user can see the warning in a snack).
        //   • Absent / On Leave     → always include (status is the only data).
        //   • Present/Late w/ time  → include with the time/breaks.
        let skippedIncomplete = 0;
        const items = filteredStaff.map(s => {
            const statusUI = attendanceMarks[s.id];
            if (!statusUI) return null; // untouched
            const apiStatus = STATUS_UI_TO_API[statusUI] || 'present';
            const hasTime = statusUI === 'Present' || statusUI === 'Late';
            if (hasTime && !checkInTimes[s.id]) {
                skippedIncomplete += 1;
                return null;
            }
            const checkIn  = hasTime ? checkInTimes[s.id]  : '';
            const checkOut = hasTime ? (checkOutTimes[s.id] || '') : '';

            // Build breaks payload. Per the API spec:
            //   • Existing breaks (have a server `breakNo`) → send `breakNo`
            //     so the backend UPDATES that row (A4).
            //   • Brand-new breaks (no `breakNo`) → OMIT `breakNo` so the
            //     backend ASSIGNS one and creates a new row (A3).
            const breaks = (breaksMap[s.id] || [])
                .filter(br => computeBreakDuration(br.out, br.in) > 0)
                .map(br => {
                    const entry = {
                        breakOutTime: toApiTime(br.out),
                        breakInTime:  toApiTime(br.in),
                    };
                    if (Number.isInteger(br.breakNo)) entry.breakNo = br.breakNo;
                    return entry;
                });

            const item = {
                rollNumber: s.rollNumber,
                employeeId: s.employeeId || '',
                status: apiStatus,
            };
            if (hasTime && checkIn)  item.loginTime  = toApiTime(checkIn);
            if (hasTime && checkOut) item.logoutTime = toApiTime(checkOut);
            if (breaks.length > 0)   item.breaks     = breaks;
            return item;
        }).filter(Boolean);

        if (items.length === 0) {
            showSnack(
                skippedIncomplete > 0
                    ? `Add a check-in time for the ${skippedIncomplete} Present/Late member(s) to save.`
                    : 'Mark at least one staff member to save attendance.',
                false
            );
            return;
        }

        // Build the per-day reason from the row notes (the UI captures one note
        // per row; we surface the first non-empty one as the top-level reason,
        // and any others get appended). Empty string is fine.
        const allNotes = filteredStaff
            .map(s => (rowNotes[s.id] || '').trim())
            .filter(n => n.length > 0);
        const reason = allNotes.length > 0 ? allNotes.join(' · ') : '';

        const body = {
            editorRollNumber: currentUserRoll,
            date: attendanceDate, // already YYYY-MM-DD from the date input
            academicYear: getCurrentAcademicYear(),
            reason,
            items,
        };

        try {
            const res = await axios.post(PostTeachersManualAttendance, body, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res?.data && res.data.error) {
                showSnack(res.data.message || 'Failed to save attendance', false);
                return;
            }
            const baseMsg = `Attendance saved for ${items.length} member${items.length === 1 ? '' : 's'}`;
            const tail = skippedIncomplete > 0
                ? ` · ${skippedIncomplete} skipped (missing check-in)`
                : '';
            showSnack(baseMsg + tail, true);
            setIsAttendanceAddedMap(prev => ({ ...prev, [userTypeFilter]: true }));
        } catch (error) {
            showSnack(error?.response?.data?.message || 'Failed to save attendance', false);
        }
    };

    // ─── UI ──────────────────────────────────────────────────────────────────
    return (
        <Box>
            <SnackBar open={open} color={color} setOpen={setOpen} status={status} message={message} />

            {/* Sub-header */}
            <Box sx={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                mb: 2, pb: 1.5, borderBottom: '1px solid #F3F4F6', flexWrap: 'wrap', gap: 1,
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    <Box sx={{
                        width: 38, height: 38, borderRadius: '7px',
                        bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <PeopleIcon sx={{ color: PRIMARY, fontSize: 20 }} />
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                            Mark Staff Attendance
                        </Typography>
                        <Typography sx={{ fontSize: '11px', color: '#6B7280' }}>
                            Manual entry · {attendanceDate === today ? 'Today' : attendanceDate}
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 0.6,
                        bgcolor: '#fff', border: `1px solid ${PRIMARY_BORDER}`,
                        borderRadius: '7px', px: 1.3, py: 0.3,
                    }}>
                        <EventIcon sx={{ fontSize: 16, color: PRIMARY }} />
                        <TextField
                            type="date"
                            size="small"
                            value={attendanceDate}
                            onChange={(e) => setAttendanceDate(e.target.value)}
                            variant="standard"
                            sx={{ width: 130 }}
                            slotProps={{
                                input: {
                                    disableUnderline: true,
                                    style: { fontSize: '12px', fontWeight: 600, color: PRIMARY_DARK },
                                },
                            }}
                        />
                    </Box>
                </Box>
            </Box>

            {/* Manual entry / biometric fallback banner */}
            <Box sx={{
                mb: 2, px: 1.5, py: 1.2, borderRadius: '7px',
                bgcolor: '#F3F0FE', border: '1px solid #C9BEFB',
                display: 'flex', alignItems: 'flex-start', gap: 1,
            }}>
                <Box sx={{
                    width: 30, height: 30, borderRadius: '7px',
                    bgcolor: '#fff', border: '1px solid #C9BEFB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <FingerprintIcon sx={{ fontSize: 17, color: '#1D4ED8' }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#1E40AF', lineHeight: 1.2 }}>
                        Manual Entry Mode · Biometric Fallback
                    </Typography>
                    <Typography sx={{ fontSize: '11px', color: '#1E3A8A', mt: 0.3, lineHeight: 1.4 }}>
                        Use this screen <strong>only when the biometric device is offline or to correct existing punches</strong>.
                        All check-in / check-out and break records are tagged{' '}
                        <Box component="span" sx={{ display: 'inline-block', px: 0.6, borderRadius: '7px', bgcolor: '#DBEAFE', color: '#1D4ED8', fontWeight: 700, fontSize: '10px' }}>
                            source: manual
                        </Box>{' '}and audit-logged against <strong>{currentUserRoll || 'your roll number'}</strong>.
                    </Typography>
                </Box>
            </Box>

            {isCurrentTypeAdded && (
                <Box sx={{
                    mb: 2, px: 1.5, py: 1, borderRadius: '7px',
                    bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`,
                    display: 'flex', alignItems: 'center', gap: 1,
                }}>
                    <CheckCircleIcon sx={{ fontSize: 18, color: PRIMARY }} />
                    <Typography sx={{ fontSize: '12px', color: PRIMARY_DARK, fontWeight: 500 }}>
                        Attendance already marked for <strong>{userTypeFilter}</strong> on this date — edits will update the existing record.
                    </Typography>
                </Box>
            )}

            {/* Counters */}
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
                {[
                    { label: 'Present',  count: counts.present, icon: CheckCircleIcon, ...STATUS_STYLE.Present },
                    { label: 'Late',     count: counts.late,    icon: AccessTimeIcon,  ...STATUS_STYLE.Late },
                    { label: 'Absent',   count: counts.absent,  icon: ClearAllIcon,    ...STATUS_STYLE.Absent },
                    { label: 'On Leave', count: counts.onLeave, icon: EventIcon,       ...STATUS_STYLE['On Leave'] },
                ].map((item) => {
                    const Icon = item.icon;
                    return (
                        <Grid size={{ xs: 6, sm: 3 }} key={item.label}>
                            <Card sx={{
                                boxShadow: 'none', border: `1px solid ${item.border}`,
                                borderRadius: '7px', bgcolor: item.bg,
                                transition: 'transform 0.15s, box-shadow 0.15s',
                                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 6px 16px ${item.color}22` },
                            }}>
                                <CardContent sx={{ py: '14px !important', px: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Box>
                                            <Typography sx={{ fontSize: '10px', color: item.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                {item.label}
                                            </Typography>
                                            <Typography sx={{ fontSize: '24px', fontWeight: 800, color: '#111827', lineHeight: 1.2, mt: 0.3 }}>
                                                {item.count}
                                            </Typography>
                                        </Box>
                                        <Box sx={{
                                            width: 32, height: 32, borderRadius: '7px',
                                            bgcolor: '#fff', border: `1px solid ${item.border}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Icon sx={{ color: item.color, fontSize: 18 }} />
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            {/* Filters row */}
            <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.2, mb: 1.5, flexWrap: 'wrap',
            }}>
                <TextField
                    size="small"
                    placeholder="Search staff name or ID..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 16, color: '#9CA3AF' }} />
                                </InputAdornment>
                            ),
                        },
                    }}
                    sx={{
                        width: 260,
                        '& .MuiOutlinedInput-root': {
                            height: 36, fontSize: '13px', borderRadius: '50px', bgcolor: '#fff',
                            '& fieldset': { borderColor: '#E5E7EB' },
                        },
                    }}
                />
                <Select
                    value={userTypeFilter}
                    onChange={(e) => setUserTypeFilter(e.target.value)}
                    size="small"
                    sx={{
                        minWidth: 160, bgcolor: '#fff', fontSize: '13px', height: 36, borderRadius: '50px',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E5E7EB' },
                    }}
                >
                    {userTypes.map(type => (
                        <MenuItem key={type} value={type} sx={{ fontSize: '13px' }}>{type}</MenuItem>
                    ))}
                </Select>

                <Button
                    size="small" variant="outlined"
                    startIcon={<DoneAllIcon />}
                    endIcon={<MoreHorizIcon sx={{ fontSize: 16 }} />}
                    onClick={(e) => setBulkMenuAnchor(e.currentTarget)}
                    sx={{
                        textTransform: 'none', fontSize: '12px', fontWeight: 600, height: 36, borderRadius: '50px',
                        borderColor: '#D1D5DB', color: '#374151', px: 1.8,
                        '&:hover': { borderColor: '#9CA3AF', bgcolor: '#F9FAFB' },
                    }}
                >
                    Bulk Actions
                </Button>
                <Menu
                    anchorEl={bulkMenuAnchor}
                    open={Boolean(bulkMenuAnchor)}
                    onClose={() => setBulkMenuAnchor(null)}
                    slotProps={{ paper: { sx: { borderRadius: '7px', minWidth: 200, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', border: '1px solid #E5E7EB', mt: 0.5 } } }}
                >
                    {STATUS_OPTIONS.map(opt => (
                        <MenuItem key={opt} onClick={() => handleBulkStatus(opt)} sx={{ fontSize: '13px', fontWeight: 600 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: STATUS_STYLE[opt].color, mr: 1.2 }} />
                            Mark all as {opt}
                        </MenuItem>
                    ))}
                    <Divider />
                    <MenuItem onClick={handleFillCurrentTime} sx={{ fontSize: '13px', fontWeight: 600 }}>
                        <FlashOnIcon sx={{ fontSize: 16, color: PRIMARY, mr: 1 }} />
                        Fill current time (check-in)
                    </MenuItem>
                    <MenuItem onClick={handleFillDefaultCheckOut} sx={{ fontSize: '13px', fontWeight: 600 }}>
                        <LogoutIcon sx={{ fontSize: 16, color: '#1D4ED8', mr: 1 }} />
                        Fill default check-out (5:00 PM)
                    </MenuItem>
                </Menu>

                <Typography sx={{ fontSize: '12px', color: '#6B7280', ml: 'auto', fontWeight: 500 }}>
                    {loading ? 'Loading...' : `${filteredStaff.length} member${filteredStaff.length !== 1 ? 's' : ''}`}
                </Typography>
            </Box>

            {/* Same-time bar */}
            <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5,
                px: 1.5, py: 1,
                bgcolor: sameTimeEnabled ? PRIMARY_LIGHT : '#F9FAFB',
                border: `1px solid ${sameTimeEnabled ? PRIMARY_BORDER : '#E5E7EB'}`,
                borderRadius: '7px',
                transition: 'all 0.2s',
                flexWrap: 'wrap',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <Switch
                        checked={sameTimeEnabled}
                        onChange={(e) => handleSameTimeToggle(e.target.checked)}
                        size="small"
                        sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': { color: PRIMARY },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: PRIMARY },
                        }}
                    />
                    <Typography sx={{ fontSize: '12px', fontWeight: 600, color: sameTimeEnabled ? PRIMARY_DARK : '#374151' }}>
                        Same time for all
                    </Typography>
                    <Tooltip title="Sets one check-in + check-out for every Present/Late member at once" arrow placement="top">
                        <InfoOutlinedIcon sx={{ fontSize: 14, color: '#9CA3AF', cursor: 'help' }} />
                    </Tooltip>
                </Box>

                {sameTimeEnabled && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>Check-In:</Typography>
                        <TextField
                            type="time" size="small" value={globalCheckIn}
                            onChange={(e) => applyGlobalCheckIn(e.target.value)}
                            slotProps={{ input: { startAdornment: <InputAdornment position="start"><AccessTimeIcon sx={{ fontSize: 14, color: PRIMARY }} /></InputAdornment> } }}
                            sx={{ width: 140, '& .MuiOutlinedInput-root': { height: 32, fontSize: '12px', fontWeight: 600, bgcolor: '#fff' } }}
                        />
                        <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#6B7280' }}>Check-Out:</Typography>
                        <TextField
                            type="time" size="small" value={globalCheckOut}
                            onChange={(e) => applyGlobalCheckOut(e.target.value)}
                            slotProps={{ input: { startAdornment: <InputAdornment position="start"><LogoutIcon sx={{ fontSize: 14, color: '#1D4ED8' }} /></InputAdornment> } }}
                            sx={{ width: 140, '& .MuiOutlinedInput-root': { height: 32, fontSize: '12px', fontWeight: 600, bgcolor: '#fff' } }}
                        />
                    </Box>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, ml: 'auto' }}>
                    <Button size="small" startIcon={<FlashOnIcon sx={{ fontSize: 14 }} />} onClick={handleFillCurrentTime}
                        sx={{ textTransform: 'none', fontSize: '11px', fontWeight: 700, color: PRIMARY_DARK, '&:hover': { bgcolor: PRIMARY_LIGHT } }}>
                        Use Current Time
                    </Button>
                </Box>
            </Box>

            {/* Table card with tabs */}
            <Card sx={{ boxShadow: 'none', border: '1px solid #E5E7EB', borderRadius: '7px', bgcolor: '#fff', overflow: 'hidden' }}>
                {/* Tabs */}
                <Box sx={{ borderBottom: '1px solid #E5E7EB', px: 1.5, bgcolor: '#FAFBFD' }}>
                    <Tabs
                        value={activeTab}
                        onChange={(e, v) => setActiveTab(v)}
                        sx={{
                            minHeight: 42,
                            '& .MuiTab-root': {
                                textTransform: 'none', fontSize: '12.5px', fontWeight: 600,
                                minHeight: 42, color: '#6B7280', px: 2, gap: 0.6,
                            },
                            '& .Mui-selected': { color: `${PRIMARY} !important`, fontWeight: 700 },
                            '& .MuiTabs-indicator': { bgcolor: PRIMARY, height: 2.5, borderRadius: '2px 2px 0 0' },
                        }}
                    >
                        <Tab
                            icon={<AccessTimeIcon sx={{ fontSize: 16 }} />}
                            iconPosition="start"
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                    Check In / Check Out
                                    <Chip
                                        label={counts.present + counts.late}
                                        size="small"
                                        sx={{
                                            height: 18, fontSize: '10px', fontWeight: 700,
                                            bgcolor: activeTab === 0 ? PRIMARY_LIGHT : '#F3F4F6',
                                            color: activeTab === 0 ? PRIMARY_DARK : '#6B7280',
                                            border: `1px solid ${activeTab === 0 ? PRIMARY_BORDER : '#E5E7EB'}`,
                                        }}
                                    />
                                </Box>
                            }
                        />
                        <Tab
                            icon={<LocalCafeIcon sx={{ fontSize: 16 }} />}
                            iconPosition="start"
                            label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                    Break In / Break Out
                                    {(() => {
                                        const totalBreaks = filteredStaff.reduce((sum, s) => sum + ((breaksMap[s.id] || []).length), 0);
                                        return (
                                            <Chip
                                                label={totalBreaks}
                                                size="small"
                                                sx={{
                                                    height: 18, fontSize: '10px', fontWeight: 700,
                                                    bgcolor: activeTab === 1 ? '#E0F2FE' : '#F3F4F6',
                                                    color: activeTab === 1 ? '#92400E' : '#6B7280',
                                                    border: `1px solid ${activeTab === 1 ? '#BAE6FD' : '#E5E7EB'}`,
                                                }}
                                            />
                                        );
                                    })()}
                                </Box>
                            }
                        />
                    </Tabs>
                </Box>

                {/* Tab content */}
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
                        <CircularProgress size={28} sx={{ color: PRIMARY }} />
                        <Typography sx={{ ml: 2, fontSize: '13px', color: '#6B7280' }}>Loading staff list...</Typography>
                    </Box>
                ) : activeTab === 0 ? (
                    <>
                        {/* Sticky header row (matches virtual rows below) */}
                        <Box sx={{
                            display: 'flex', alignItems: 'center',
                            px: 1, py: 1.1, gap: 1,
                            bgcolor: PRIMARY_LIGHT,
                            borderBottom: `1px solid ${PRIMARY_BORDER}`,
                            position: 'sticky', top: 0, zIndex: 2,
                            '& > *': {
                                fontSize: '10px', fontWeight: 700, color: PRIMARY_DARK,
                                letterSpacing: 0.6, textTransform: 'uppercase',
                                whiteSpace: 'nowrap',
                            },
                        }}>
                            <Box sx={{ width: COL_STAFF.serial, flexShrink: 0 }}>#</Box>
                            <Box sx={{ ...COL_STAFF.member }}>Staff Member</Box>
                            <Box sx={{ width: COL_STAFF.role, flexShrink: 0 }}>Role</Box>
                            <Box sx={{ width: COL_STAFF.status, flexShrink: 0 }}>Status</Box>
                            <Box sx={{ width: COL_STAFF.checkIn, flexShrink: 0 }}>Check-In</Box>
                            <Box sx={{ width: COL_STAFF.checkOut, flexShrink: 0 }}>Check-Out</Box>
                            <Box sx={{ width: COL_STAFF.work, flexShrink: 0 }}>Working Hrs</Box>
                            <Box sx={{ width: COL_STAFF.notes, flexShrink: 0, textAlign: 'center' }}>Notes</Box>
                        </Box>

                        {filteredStaff.length === 0 ? (
                            <Typography sx={{ fontSize: '13px', color: '#9CA3AF', py: 4, textAlign: 'center' }}>
                                {staffList.length === 0 ? 'No staff data available for this date' : 'No staff found'}
                            </Typography>
                        ) : (
                            // react-window keeps only ~12 rows mounted at a
                            // time — fixes the load-hang on 150+ row payrolls.
                            <Box sx={{ height: 'min(56vh, 600px)', minHeight: 320 }}>
                                <List
                                    rowCount={filteredStaff.length}
                                    rowHeight={64}
                                    rowComponent={StaffRow}
                                    rowProps={{
                                        items: filteredStaff,
                                        marks: attendanceMarks,
                                        ins: checkInTimes,
                                        outs: checkOutTimes,
                                        notes: rowNotes,
                                        sameTimeEnabled,
                                        leaveMap,
                                        sourceMap,
                                        breaksMap,
                                        onMarkChange: handleMarkChange,
                                        onCheckInChange: handleCheckInChange,
                                        onCheckOutChange: handleCheckOutChange,
                                        onOpenNotes: handleOpenNotes,
                                    }}
                                    overscanCount={4}
                                    style={{ width: '100%', height: '100%' }}
                                />
                            </Box>
                        )}
                    </>
                ) : (
                    <>
                        {/* Breaks-tab intro strip */}
                        <Box sx={{
                            px: 2, py: 1.2,
                            bgcolor: '#E0F2FE',
                            borderBottom: '1px solid #BAE6FD',
                            display: 'flex', alignItems: 'flex-start', gap: 1,
                        }}>
                            <WarningAmberIcon sx={{ fontSize: 16, color: '#B45309', mt: 0.1, flexShrink: 0 }} />
                            <Typography sx={{ fontSize: '11px', color: '#92400E', lineHeight: 1.4 }}>
                                Record break-out → break-in pairs for each staff.
                                Use the preset chips (<strong>Morning Tea</strong>, <strong>Lunch</strong>, <strong>Evening Tea</strong>) for one-click entry, or
                                <strong> Add Break</strong> to enter custom times. Breaks apply only to <strong>Present</strong> / <strong>Late</strong> staff.
                            </Typography>
                        </Box>

                        {/* Sticky header row */}
                        <Box sx={{
                            display: 'flex', alignItems: 'center',
                            px: 1, py: 1.1, gap: 1,
                            bgcolor: PRIMARY_LIGHT,
                            borderBottom: `1px solid ${PRIMARY_BORDER}`,
                            position: 'sticky', top: 0, zIndex: 2,
                            '& > *': {
                                fontSize: '10px', fontWeight: 700, color: PRIMARY_DARK,
                                letterSpacing: 0.6, textTransform: 'uppercase',
                                whiteSpace: 'nowrap',
                            },
                        }}>
                            <Box sx={{ width: COL_BREAK.serial, flexShrink: 0 }}>#</Box>
                            <Box sx={{ ...COL_BREAK.member }}>Staff Member</Box>
                            <Box sx={{ ...COL_BREAK.breaks }}>Breaks (Out → In)</Box>
                            <Box sx={{ width: COL_BREAK.total, flexShrink: 0 }}>Total Break</Box>
                            <Box sx={{ width: COL_BREAK.count, flexShrink: 0 }}>Breaks Count</Box>
                        </Box>

                        {filteredStaff.length === 0 ? (
                            <Typography sx={{ fontSize: '13px', color: '#9CA3AF', py: 4, textAlign: 'center' }}>
                                {staffList.length === 0 ? 'No staff data available for this date' : 'No staff found'}
                            </Typography>
                        ) : (
                            // Variable-height virtualization: rows expand for
                            // every break entry, so rowHeight is a function of
                            // the row's current state. react-window stays
                            // smooth even when most rows are tall.
                            <Box sx={{ height: 'min(56vh, 600px)', minHeight: 320 }}>
                                <List
                                    rowCount={filteredStaff.length}
                                    rowHeight={(index) => {
                                        const s = filteredStaff[index];
                                        if (!s) return 60;
                                        const m = attendanceMarks[s.id] || 'Present';
                                        const brs = breaksMap[s.id] || [];
                                        return estimateBreakRowHeight(m, brs.length);
                                    }}
                                    rowComponent={BreakRow}
                                    rowProps={{
                                        items: filteredStaff,
                                        marks: attendanceMarks,
                                        ins: checkInTimes,
                                        outs: checkOutTimes,
                                        breaksMap,
                                        onAddBreak: handleAddBreak,
                                        onUpdateBreak: handleUpdateBreak,
                                        onDeleteBreak: handleDeleteBreak,
                                        onAddPreset: handleAddPreset,
                                    }}
                                    overscanCount={3}
                                    style={{ width: '100%', height: '100%' }}
                                />
                            </Box>
                        )}
                    </>
                )}

                {/* Footer */}
                {!loading && (
                    <Box sx={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        px: 2, py: 1.2, borderTop: '1px solid #E5E7EB', bgcolor: '#F9FAFB',
                        flexWrap: 'wrap', gap: 1,
                    }}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Typography sx={{ fontSize: '12px', color: '#6B7280' }}>
                                <strong style={{ color: '#111827' }}>{filteredStaff.length}</strong> staff
                            </Typography>
                            <Divider orientation="vertical" flexItem />
                            {activeTab === 0 ? (
                                <Typography sx={{ fontSize: '11px', color: '#6B7280' }}>
                                    Present <strong style={{ color: STATUS_STYLE.Present.color }}>{counts.present}</strong>
                                    {' · '}Late <strong style={{ color: STATUS_STYLE.Late.color }}>{counts.late}</strong>
                                    {' · '}Absent <strong style={{ color: STATUS_STYLE.Absent.color }}>{counts.absent}</strong>
                                    {' · '}Leave <strong style={{ color: STATUS_STYLE['On Leave'].color }}>{counts.onLeave}</strong>
                                </Typography>
                            ) : (() => {
                                const totalBreaks = filteredStaff.reduce((sum, s) => sum + ((breaksMap[s.id] || []).length), 0);
                                const totalBreakMin = filteredStaff.reduce((sum, s) => sum + computeTotalBreakMinutes(breaksMap[s.id] || []), 0);
                                const staffWithBreaks = filteredStaff.filter(s => (breaksMap[s.id] || []).length > 0).length;
                                return (
                                    <Typography sx={{ fontSize: '11px', color: '#6B7280' }}>
                                        Total Breaks <strong style={{ color: '#92400E' }}>{totalBreaks}</strong>
                                        {' · '}Staff with Breaks <strong style={{ color: '#111827' }}>{staffWithBreaks}/{counts.present + counts.late}</strong>
                                        {' · '}Combined Break Time <strong style={{ color: '#92400E' }}>{formatMinutes(totalBreakMin)}</strong>
                                    </Typography>
                                );
                            })()}
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={handleSaveAttendance}
                            disabled={staffList.length === 0}
                            sx={{
                                textTransform: 'none', fontSize: '13px', fontWeight: 700,
                                bgcolor: isCurrentTypeAdded ? '#1D4ED8' : PRIMARY,
                                borderRadius: '7px', px: 3,
                                boxShadow: `0 2px 6px ${isCurrentTypeAdded ? '#1D4ED8' : PRIMARY}33`,
                                '&:hover': {
                                    bgcolor: isCurrentTypeAdded ? '#1E40AF' : PRIMARY_DARK,
                                    boxShadow: `0 4px 12px ${isCurrentTypeAdded ? '#1D4ED8' : PRIMARY}55`,
                                },
                            }}
                        >
                            {isCurrentTypeAdded ? 'Update Attendance' : 'Save Attendance'}
                        </Button>
                    </Box>
                )}
            </Card>

            {/* Notes popover */}
            <Popover
                open={Boolean(notesAnchor)}
                anchorEl={notesAnchor}
                onClose={closeNotesPopover}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { borderRadius: '7px', border: '1px solid #E5E7EB', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', mt: 0.5 } } }}
            >
                <Paper sx={{ p: 1.5, width: 280 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 0.8 }}>
                        <StickyNote2Icon sx={{ fontSize: 14, color: PRIMARY }} />
                        <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#111827' }}>
                            Add Note
                        </Typography>
                    </Box>
                    <TextField
                        multiline minRows={3} fullWidth size="small"
                        placeholder="Remarks for this day (optional)"
                        value={notesTargetId ? (rowNotes[notesTargetId] || '') : ''}
                        onChange={(e) => setRowNotes(prev => ({ ...prev, [notesTargetId]: e.target.value }))}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                fontSize: '12px', borderRadius: '7px',
                                '&.Mui-focused fieldset': { borderColor: PRIMARY },
                            },
                        }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                        <Button size="small" variant="contained" onClick={closeNotesPopover}
                            sx={{
                                textTransform: 'none', fontSize: '12px', fontWeight: 700,
                                bgcolor: PRIMARY, borderRadius: '7px', px: 2,
                                boxShadow: 'none',
                                '&:hover': { bgcolor: PRIMARY_DARK, boxShadow: 'none' },
                            }}>
                            Done
                        </Button>
                    </Box>
                </Paper>
            </Popover>
        </Box>
    );
}
