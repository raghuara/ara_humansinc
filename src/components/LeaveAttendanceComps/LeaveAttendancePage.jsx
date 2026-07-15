import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Box, Card, CardContent, Grid, Typography, IconButton, Button, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Avatar, Divider, Tabs, Tab, CircularProgress, Tooltip, Menu, MenuItem,
    Dialog, DialogContent, DialogActions, TextField, InputAdornment,
    Stack, LinearProgress, Paper, Backdrop,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventIcon from '@mui/icons-material/Event';
import AddIcon from '@mui/icons-material/Add';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import EditNoteIcon from '@mui/icons-material/EditNote';
import FaceIcon from '@mui/icons-material/Face';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import KeyIcon from '@mui/icons-material/Key';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import InsertChartOutlinedIcon from '@mui/icons-material/InsertChartOutlined';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import TodayIcon from '@mui/icons-material/Today';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import CircleIcon from '@mui/icons-material/Circle';
import CheckIcon from '@mui/icons-material/Check';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import HistoryToggleOffIcon from '@mui/icons-material/HistoryToggleOff';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineRounded';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import http from '../../Api/http';
import { SyncStatus, TriggerManualSync, GetTeachersAttendance } from '../../Api/Api';
import useFinancialYear from '../../hooks/useFinancialYear';
import SnackBar from '../SnackBar';

import StaffAttendanceOverviewPage from './StaffAttendanceOverviewPage';
import LeaveManagementPage from './LeaveManagementPage';
import AttendanceReportsPage from './AttendanceReportsPage';
import AddStaffAttendancePage from './AddStaffAttendancePage';



// ─── Theme ──────────────────────────────────────────────────────────────────
const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_DARK = '#6246E0';
const PRIMARY_BORDER = '#C9BEFB';

// ─── Config ─────────────────────────────────────────────────────────────────
const SCHOOL_START_HOUR = 9;      // 9:00 AM
const LATE_THRESHOLD_MIN = 15;    // > 9:15 → Late

// ─── Utils ──────────────────────────────────────────────────────────────────
const mapRole = (role = '') => {
    const r = role.toLowerCase();
    if (r === 'teaching') return 'Teaching Staff';
    if (r === 'nonteaching') return 'Non Teaching Staff';
    return 'Supporting Staff';
};

const mapStatus = (status = '', attendance = '') => {
    const s = (status || attendance || '').toLowerCase();
    if (s === 'present') return 'Present';
    if (s === 'late') return 'Late';
    if (s === 'onleave' || s === 'on leave') return 'On Leave';
    if (s === 'absent') return 'Absent';
    return 'Absent';
};

const getInitials = (name = '') =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

const capitalize = (str = '') =>
    str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

// ─── Time / duration helpers (for personal attendance ticker) ──────────────
const formatDuration = (ms) => {
    if (!Number.isFinite(ms) || ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return {
        h, m, s,
        hhmmss: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
        short: h > 0 ? `${h}h ${m}m` : `${m}m`,
    };
};

const formatTimeOfDay = (date) => {
    if (!date) return '—';
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const formatRelativeTime = (isoOrDate) => {
    if (!isoOrDate) return '—';
    const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return '—';
    const diffMs = Date.now() - d.getTime();
    if (diffMs < 0) return 'just now';
    const sec = Math.floor(diffMs / 1000);
    if (sec < 30) return 'just now';
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.floor(hr / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatHHMMSS = (totalSec) => {
    if (!Number.isFinite(totalSec) || totalSec < 0) return '00:00';
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// ─── Biometric sync constants ──────────────────────────────────────────────
const SYNC_COOLDOWN_MS    = 5 * 60 * 1000; // 5 min between manual triggers
const SYNC_TIMEOUT_MS     = 90 * 1000;     // 1.5 min safety timeout on the loader
const POLL_INTERVAL_IDLE  = 10 * 1000;     // poll SyncStatus every 10s when idle
const POLL_INTERVAL_BUSY  = 4 * 1000;      // poll every 4s while a sync is running

// ─── Idle redirect constants ──────────────────────────────────────────────
// If the user stays on this page without any input for N minutes, we route
// them back to the dashboard so the SyncStatus polling stops generating load.
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes of inactivity
const IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];

// ─── Theme / Config maps ────────────────────────────────────────────────────
const ROLE_CONFIG = {
    'Teaching Staff':     { color: '#1D4ED8', bg: '#F3F0FE', border: '#C9BEFB' },
    'Non Teaching Staff': { color: '#0E7490', bg: '#ECFEFF', border: '#A5F3FC' },
    'Supporting Staff':   { color: '#C2410C', bg: '#FFF7ED', border: '#FED7AA' },
};

const STATUS_STYLE = {
    Present:   { color: '#6246E0', bg: '#F1EEFE', border: '#C9BEFB' },
    Late:      { color: '#B45309', bg: '#E0F2FE', border: '#BAE6FD' },
    'On Leave':{ color: '#1D4ED8', bg: '#F3F0FE', border: '#C9BEFB' },
    Absent:    { color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' },
};

const AVATAR_PALETTE = ['#0E7490', '#1D4ED8', '#C2410C', '#6246E0', '#1D4ED8', '#BE185D', '#A16207', '#0F766E'];
const avatarColorFor = (name = '') => {
    const code = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0);
    return AVATAR_PALETTE[code % AVATAR_PALETTE.length];
};

const VERIFY_MODE_ICON = (mode = '') => {
    const m = mode.toLowerCase();
    if (m.includes('face')) return <FaceIcon sx={{ fontSize: 14 }} />;
    if (m.includes('fp') || m.includes('finger')) return <FingerprintIcon sx={{ fontSize: 14 }} />;
    if (m.includes('card')) return <CreditCardIcon sx={{ fontSize: 14 }} />;
    if (m.includes('pw') || m.includes('pass')) return <KeyIcon sx={{ fontSize: 14 }} />;
    return <FingerprintIcon sx={{ fontSize: 14 }} />;
};

const VERIFY_MODE_LABEL = (mode = '') => {
    const m = mode.toLowerCase();
    if (m === 'faceorfporcardorpw') return 'Multi-Factor';
    if (m.includes('face')) return 'Face';
    if (m.includes('fp') || m.includes('finger')) return 'Fingerprint';
    if (m.includes('card')) return 'Card';
    if (m.includes('pw')) return 'Password';
    return capitalize(mode);
};

export default function LeaveAttendancePage() {
    const navigate = useNavigate();
    const user = useSelector((state) => state.auth);
    const rollNumber = user.rollNumber;
    const userType = user.userType;
    // SyncStatus polling is admin-only — staff/teachers don't need this live data,
    // and excluding them sharply reduces backend traffic.
    const isAdminUser = userType === 'superadmin' || userType === 'admin';

    const [tabValue, setTabValue] = useState(0);
    // Sub-view of the Leave Management tab — controlled by quick-nav clicks here
    const [leaveSubView, setLeaveSubView] = useState('applications');

    // Helper for dashboard navigation that jumps into Leave Management at a specific sub-view
    const goToLeaveManagement = (subView = 'applications') => {
        setLeaveSubView(subView);
        setTabValue(4);
    };

    // SnackBar
    const [snackOpen, setSnackOpen] = useState(false);
    const [snackStatus, setSnackStatus] = useState(false);
    const [snackColor, setSnackColor] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const showSnack = (msg, success) => {
        setSnackMessage(msg); setSnackOpen(true); setSnackColor(success); setSnackStatus(success);
    };

    // ─── Biometric Sync State ──────────────────────────────────────────────
    // Full latest response from the SyncStatus endpoint (or null if not loaded).
    const [syncStatus, setSyncStatus] = useState(null);
    // True while the blocking sync overlay is visible. Driven by isPending + manual trigger.
    const [isSyncing, setIsSyncing] = useState(false);
    // Local timestamp when the user triggered the sync — used to enforce the safety timeout.
    const [syncStartedAt, setSyncStartedAt] = useState(null);
    // Manual-sync date picker
    const [manualSyncOpen, setManualSyncOpen] = useState(false);
    const [manualSyncDate, setManualSyncDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1); // default to yesterday — most common case
        return d.toISOString().split('T')[0];
    });
    const [isTriggering, setIsTriggering] = useState(false);
    // 1Hz tick to refresh cooldown timer / "X seconds ago" labels
    const [, setCooldownTick] = useState(0);

    const pollIntervalRef = useRef(null);
    const syncTimeoutRef = useRef(null);

    // The year is chosen once, in the app header — this page just follows it.
    const financialYear = useFinancialYear();

    // Today's Attendance tab filters
    const [todayAttSearch, setTodayAttSearch] = useState('');
    const [todayAttRoleFilter, setTodayAttRoleFilter] = useState('all');
    const [todayAttStatusFilter, setTodayAttStatusFilter] = useState('all');
    const [todayRoleMenuAnchor, setTodayRoleMenuAnchor] = useState(null);
    const [todayStatusMenuAnchor, setTodayStatusMenuAnchor] = useState(null);

    // Today's Attendance live data — fetched directly from GetTeachersAttendance
    // (independent of the dashboard payload so we can refresh in isolation).
    const [todayAttendanceList, setTodayAttendanceList] = useState([]);
    const [isLoadingTodayList, setIsLoadingTodayList] = useState(false);

    const clearTodayFilters = () => {
        setTodayAttSearch('');
        setTodayAttRoleFilter('all');
        setTodayAttStatusFilter('all');
    };

    // ─── Personal attendance (read-only display) ────────────────────────────
    // Driven by the logged-in user's own record from todayAttendanceList
    // (populated by GetTeachersAttendance). Falls back gracefully when the
    // user has no record yet — the LOGIN tile shows "—", the ticker reads 0.
    const [currentTime, setCurrentTime] = useState(new Date());

    // Live ticker — increments the "logged in for" counter every second.
    useEffect(() => {
        const id = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    // Parse "HH:MM" / "HH:MM:SS" → Date object anchored to today.
    const hhmmToTodayDate = (timeStr) => {
        if (!timeStr || typeof timeStr !== 'string') return null;
        const parts = timeStr.split(':').map(Number);
        if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
        const d = new Date();
        d.setHours(parts[0], parts[1], parts[2] || 0, 0);
        return d;
    };

    // The logged-in user's row from today's attendance fetch.
    const myAttendanceRecord = useMemo(() => {
        if (!rollNumber || !Array.isArray(todayAttendanceList) || todayAttendanceList.length === 0) return null;
        return todayAttendanceList.find(r => String(r.rollNumber) === String(rollNumber)) || null;
    }, [todayAttendanceList, rollNumber]);

    // First punch's loginTime — null until the user has clocked in today.
    const loginTime = useMemo(() => {
        const first = myAttendanceRecord?.rawPunches?.[0];
        return hhmmToTodayDate(first?.loginTime || myAttendanceRecord?.loginTime || '');
    }, [myAttendanceRecord]);

    // Completed-break list: [{ start: Date, end: Date }] — only fully-closed
    // breaks (both breakOut + breakIn present) are counted.
    const breaks = useMemo(() => {
        const list = myAttendanceRecord?.rawBreaks || [];
        return list
            .map(b => ({
                start: hhmmToTodayDate(b.breakOutTime),
                end:   hhmmToTodayDate(b.breakInTime),
                breakNo: b.breakNo,
            }))
            .filter(b => b.start && b.end && b.end >= b.start);
    }, [myAttendanceRecord]);

    const loggedInMs   = loginTime ? Math.max(0, currentTime - loginTime) : 0;
    const totalBreakMs = breaks.reduce((sum, b) => sum + (b.end - b.start), 0);
    const netWorkMs    = Math.max(0, loggedInMs - totalBreakMs);

    const loggedInDur = formatDuration(loggedInMs);
    const breakDur    = formatDuration(totalBreakMs);
    const netWorkDur  = formatDuration(netWorkMs);

    // GET /teachersattendance/GetTeachersAttendance
    //   ?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD&academicYear=YYYY-YYYY
    // For the Today's Attendance tab fromDate === toDate === today, so the
    // response always contains zero or one record per staff member for today.
    //
    // Each row's status is derived in this order:
    //   1. leaves[0].isOnApprovedLeave === true  → "On Leave"
    //      (approvedLeaveIsHalfDay decorates the chip with a half-day badge)
    //   2. punches has entries                   → "Late" if loginTime > 09:15
    //                                              else "Present"
    //   3. otherwise                             → "Absent"
    // The normalized record uses the same field names the existing render
    // already consumes (rollNumber, name, role, status, loginTime, logoutTime,
    // source) so the table / filters / chips keep working unchanged.
    const normalizeTodayRecord = (rec) => {
        const userType = String(rec.userType || '').toLowerCase();
        const role = userType === 'teacher' ? 'teaching' : 'nonteaching';

        const firstPunch = Array.isArray(rec.punches) && rec.punches.length > 0 ? rec.punches[0] : null;
        const lastPunch  = Array.isArray(rec.punches) && rec.punches.length > 0 ? rec.punches[rec.punches.length - 1] : null;
        const loginRaw   = firstPunch?.loginTime  || '';
        const logoutRaw  = lastPunch?.logoutTime  || '';
        // Server gives "HH:MM:SS" — trim to "HH:MM" for display consistency.
        const trimSec = (t) => (t && t.length >= 5 ? t.slice(0, 5) : t || '');

        const onLeave = Array.isArray(rec.leaves) && rec.leaves.some(l => l?.isOnApprovedLeave === true);
        const isHalfDay = onLeave && rec.leaves.some(l => l?.isOnApprovedLeave === true && l?.approvedLeaveIsHalfDay === true);

        let status = 'absent';
        if (onLeave) {
            status = 'onleave';
        } else if (loginRaw) {
            const [hh, mm] = loginRaw.split(':').map(Number);
            const lateAfter = SCHOOL_START_HOUR * 60 + LATE_THRESHOLD_MIN;
            status = (hh * 60 + (mm || 0)) > lateAfter ? 'late' : 'present';
        }

        const source = firstPunch
            ? (String(firstPunch.loginSource || '').toLowerCase() === 'manual' ? 'manual' : 'biometric')
            : '';

        return {
            rollNumber: rec.rollNumber || '',
            name: rec.name || '',
            userType: rec.userType || '',
            role,
            status,
            attendance: status,
            loginTime: trimSec(loginRaw),
            logoutTime: trimSec(logoutRaw),
            source,
            isHalfDayLeave: isHalfDay,
            rawPunches: rec.punches || [],
            rawBreaks: rec.breaks || [],
            rawLeaves: rec.leaves || [],
        };
    };

    const fetchTodaysAttendance = async () => {
        setIsLoadingTodayList(true);
        try {
            const todayIso = new Date().toISOString().split('T')[0];
            const res = await http.get(GetTeachersAttendance, {
                params: {
                    fromDate: todayIso,
                    toDate: todayIso,
                    // Legacy field name; the value is the company's financial year.
                    academicYear: financialYear,
                },
            });
            if (res?.data && !res.data.error) {
                const rows = Array.isArray(res.data.data) ? res.data.data : [];
                setTodayAttendanceList(rows.map(normalizeTodayRecord));
            } else {
                setTodayAttendanceList([]);
            }
        } catch (err) {
            console.error("Failed to load today's attendance:", err);
            setTodayAttendanceList([]);
            showSnack("Failed to load today's attendance", false);
        } finally {
            setIsLoadingTodayList(false);
        }
    };

    const handleTabChange = (_e, newValue) => setTabValue(newValue);

    // ─── Biometric Sync ────────────────────────────────────────────────────
    // Stop the loader: cleans up the safety timeout + flips isSyncing off.
    const stopSyncLoader = () => {
        setIsSyncing(false);
        setSyncStartedAt(null);
        if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
            syncTimeoutRef.current = null;
        }
    };

    // GET SyncStatus — pulls latest status of the biometric worker + device.
    const fetchSyncStatus = async () => {
        try {
            const res = await http.get(SyncStatus);
            if (res?.data && !res.data.error) {
                setSyncStatus(res.data);
                // If we were waiting for a sync to finish and the backend says it's done,
                // close the loader + refresh dashboard so the new punches show.
                if (isSyncing && res.data.isPending === false) {
                    stopSyncLoader();
                    fetchTodaysAttendance();
                    showSnack('Sync completed — attendance data refreshed', true);
                }
            }
        } catch (err) {
            console.error('SyncStatus fetch failed:', err);
        }
    };

    // POST TriggerManualSync — kicks off a sync from the chosen "from date"
    // through to today. The user only picks the FROM date; the TO date is
    // always the current date so we catch everything missed up to now.
    const handleTriggerManualSync = async () => {
        if (!manualSyncDate) {
            showSnack('Please pick a from-date to sync', false);
            return;
        }
        const todayIso = new Date().toISOString().split('T')[0];
        setIsTriggering(true);
        try {
            const res = await http.post(TriggerManualSync, null, {
                params: { fromDate: manualSyncDate, toDate: todayIso },
            });
            if (res?.data && res.data.error) {
                showSnack(res.data.message || 'Failed to trigger sync', false);
            } else {
                // Open the blocking loader. The polling watcher will close it when isPending=false.
                setManualSyncOpen(false);
                setIsSyncing(true);
                setSyncStartedAt(Date.now());
                showSnack('Sync started — fetching previous punches from device…', true);
                // Safety timeout: force-close after 90s even if backend never flips isPending.
                if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
                syncTimeoutRef.current = setTimeout(() => {
                    stopSyncLoader();
                    fetchTodaysAttendance();
                    showSnack('Sync still running in the background — refreshing now', true);
                }, SYNC_TIMEOUT_MS);
                // Trigger an immediate status fetch so the UI reflects the new lastTriggeredAt.
                fetchSyncStatus();
            }
        } catch (err) {
            console.error('TriggerManualSync failed:', err);
            const msg = err?.response?.data?.message || 'Failed to trigger sync';
            showSnack(msg, false);
        } finally {
            setIsTriggering(false);
        }
    };

    // Polling guard — SyncStatus only runs when ALL of these hold:
    //   1. The user is an admin / superadmin (existing rule)
    //   2. The user is currently on the Dashboard tab (tab index 0). The
    //      Sync Worker (PC) + Biometric Reachability tiles that consume this
    //      data only render on the dashboard, so polling on any other tab is
    //      wasted backend load.
    const isDashboardTab = tabValue === 0;
    const shouldPollSyncStatus = isAdminUser && isDashboardTab;

    // Fetch the Today's Attendance list whenever the tab becomes active OR the
    // academic year changes. Both the Dashboard (preview, top 10) and the
    // Today's Attendance tab (full list) share the same fetch + state.
    useEffect(() => {
        if (tabValue === 0 || tabValue === 2) {
            fetchTodaysAttendance();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tabValue, financialYear]);

    // Initial fetch + polling — admin/superadmin AND on the Dashboard tab only.
    // Switching to any other tab tears down the poll; switching back re-fires it.
    useEffect(() => {
        if (!shouldPollSyncStatus) return;
        fetchSyncStatus();
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldPollSyncStatus]);

    useEffect(() => {
        if (!shouldPollSyncStatus) return;
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        const interval = isSyncing ? POLL_INTERVAL_BUSY : POLL_INTERVAL_IDLE;
        pollIntervalRef.current = setInterval(fetchSyncStatus, interval);
        return () => clearInterval(pollIntervalRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSyncing, shouldPollSyncStatus]);

    // ─── Idle redirect ─────────────────────────────────────────────────────
    // If the user doesn't touch the page for IDLE_TIMEOUT_MS we route them
    // away to /dashboardmenu/dashboard, which unmounts this component and
    // tears down the SyncStatus polling. Saves backend load when people
    // leave a tab open in the corner of their screen all day.
    //
    // Same guard as polling: only matters when we'd actually be polling, i.e.
    // an admin sitting on the Dashboard tab. On other tabs there's no poll
    // to suppress, so the redirect would just be obnoxious.
    useEffect(() => {
        if (!shouldPollSyncStatus) return;

        let idleTimer = null;
        const resetIdle = () => {
            if (idleTimer) clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                // Don't yank an admin away mid-sync — they need to wait it out.
                if (isSyncing) {
                    resetIdle(); // give them another full window
                    return;
                }
                navigate('/dashboardmenu/dashboard');
            }, IDLE_TIMEOUT_MS);
        };

        IDLE_EVENTS.forEach((evt) => window.addEventListener(evt, resetIdle, { passive: true }));
        resetIdle(); // start the timer

        return () => {
            if (idleTimer) clearTimeout(idleTimer);
            IDLE_EVENTS.forEach((evt) => window.removeEventListener(evt, resetIdle));
        };
    }, [shouldPollSyncStatus, isSyncing, navigate]);

    // 1Hz tick to refresh cooldown / "X seconds ago" labels (only when needed).
    useEffect(() => {
        const lastTrig = syncStatus?.lastTriggeredAt ? new Date(syncStatus.lastTriggeredAt).getTime() : 0;
        const cooldownEnds = lastTrig + SYNC_COOLDOWN_MS;
        const inCooldown = cooldownEnds > Date.now();
        if (!inCooldown && !isSyncing) return;
        const id = setInterval(() => setCooldownTick(t => t + 1), 1000);
        return () => clearInterval(id);
    }, [syncStatus, isSyncing]);

    // Derived sync values
    const lastTrigTs = syncStatus?.lastTriggeredAt ? new Date(syncStatus.lastTriggeredAt).getTime() : 0;
    const cooldownEndsAt = lastTrigTs + SYNC_COOLDOWN_MS;
    const cooldownLeftSec = Math.max(0, Math.ceil((cooldownEndsAt - Date.now()) / 1000));
    const inCooldown = cooldownLeftSec > 0;
    const elapsedSec = syncStartedAt ? Math.floor((Date.now() - syncStartedAt) / 1000) : 0;
    const isWorkerAlive = !!syncStatus?.isWorkerAlive;
    const isDeviceReachable = !!syncStatus?.isDeviceReachable;
    // Both devices must be online before a manual sync can be triggered.
    const devicesOnline = isWorkerAlive && isDeviceReachable;
    const offlineDeviceLabel = !isWorkerAlive && !isDeviceReachable
        ? 'Worker PC and Biometric device'
        : !isWorkerAlive ? 'Worker PC' : !isDeviceReachable ? 'Biometric device' : '';
    const canTrigger = !isSyncing && !inCooldown && devicesOnline;


    // ─── Dashboard render ──────────────────────────────────────────────────
    const renderDashboard = () => {
        // Dashboard's Today's Attendance preview + KPI cards are both derived
        // from GetTeachersAttendance (normalized). One fetch powers everything.
        const todaysAttendance = todayAttendanceList;

        // KPI counts derived in a single pass over the list.
        const counts = todaysAttendance.reduce((acc, emp) => {
            const s = (emp.status || '').toLowerCase();
            if (s === 'present')  acc.present += 1;
            else if (s === 'late')    acc.late    += 1;
            else if (s === 'absent')  acc.absent  += 1;
            else if (s === 'onleave' || s === 'on leave') acc.onLeave += 1;
            return acc;
        }, { present: 0, late: 0, absent: 0, onLeave: 0 });

        const totalStaff = todaysAttendance.length;
        const presentCount = counts.present;

        const kpiCards = [
            { label: 'Present',    value: presentCount,    sub: `/${totalStaff}`, color: '#7C5CFC', bg: '#F1EEFE', border: '#C9BEFB', icon: CheckCircleIcon },
            { label: 'Absent',     value: counts.absent,                          color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: CancelIcon },
            { label: 'Late',       value: counts.late,                            color: '#0EA5E9', bg: '#E0F2FE', border: '#BAE6FD', icon: AccessTimeIcon },
            { label: 'On Leave',   value: counts.onLeave,                         color: '#6246E0', bg: '#F3F0FE', border: '#C9BEFB', icon: EventIcon },
        ];

        return (
            <Box>
                {/* ─── Biometric Device Status + Manual Sync (admin/superadmin only) ─── */}
                {isAdminUser && (
                <Paper elevation={0} sx={{
                    mb: 2, borderRadius: '7px',
                    border: '1px solid #E5E7EB', bgcolor: '#fff',
                    overflow: 'hidden',
                }}>
                    <Box sx={{ p: 1.8 }}>
                        <Grid container spacing={1.5} alignItems="center">
                            {/* Worker (laptop) card */}
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <Box sx={{
                                    p: 1.2, borderRadius: '7px',
                                    border: `1px solid ${isWorkerAlive ? '#C9BEFB' : '#FECACA'}`,
                                    bgcolor: isWorkerAlive ? '#F1EEFE' : '#FEF2F2',
                                    display: 'flex', alignItems: 'center', gap: 1.2,
                                }}>
                                    <Box sx={{
                                        width: 38, height: 38, borderRadius: '7px', flexShrink: 0,
                                        bgcolor: '#fff', border: `1px solid ${isWorkerAlive ? '#C9BEFB' : '#FECACA'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <LaptopMacIcon sx={{ fontSize: 20, color: isWorkerAlive ? '#6246E0' : '#B91C1C' }} />
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                            <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#111827', lineHeight: 1.1 }} noWrap>
                                                Sync Worker (PC)
                                            </Typography>
                                            <Chip
                                                size="small"
                                                icon={isWorkerAlive
                                                    ? <CircleIcon sx={{ fontSize: '8px !important' }} />
                                                    : <CircleIcon sx={{ fontSize: '8px !important' }} />}
                                                label={isWorkerAlive ? 'Online' : 'Offline'}
                                                sx={{
                                                    height: 18, fontSize: 9.5, fontWeight: 800,
                                                    bgcolor: '#fff',
                                                    color: isWorkerAlive ? '#6246E0' : '#B91C1C',
                                                    border: `1px solid ${isWorkerAlive ? '#C9BEFB' : '#FECACA'}`,
                                                    '& .MuiChip-icon': { color: 'inherit', ml: '4px' },
                                                }}
                                            />
                                        </Box>
                                        <Typography sx={{ fontSize: 10.5, color: '#4B5563', mt: 0.3 }} noWrap>
                                            Last heartbeat:{' '}
                                            <strong>{formatRelativeTime(syncStatus?.lastHeartbeatAt)}</strong>
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>

                            {/* Biometric device card */}
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <Box sx={{
                                    p: 1.2, borderRadius: '7px',
                                    border: `1px solid ${isDeviceReachable ? '#C9BEFB' : '#FECACA'}`,
                                    bgcolor: isDeviceReachable ? '#F1EEFE' : '#FEF2F2',
                                    display: 'flex', alignItems: 'center', gap: 1.2,
                                }}>
                                    <Box sx={{
                                        width: 38, height: 38, borderRadius: '7px', flexShrink: 0,
                                        bgcolor: '#fff', border: `1px solid ${isDeviceReachable ? '#C9BEFB' : '#FECACA'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {isDeviceReachable
                                            ? <FingerprintIcon sx={{ fontSize: 20, color: '#6246E0' }} />
                                            : <WifiOffIcon sx={{ fontSize: 20, color: '#B91C1C' }} />}
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                            <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#111827', lineHeight: 1.1 }} noWrap>
                                                Biometric Reachability
                                            </Typography>
                                            <Chip
                                                size="small"
                                                icon={<CircleIcon sx={{ fontSize: '8px !important' }} />}
                                                label={isDeviceReachable ? 'Reachable' : 'Unreachable'}
                                                sx={{
                                                    height: 18, fontSize: 9.5, fontWeight: 800,
                                                    bgcolor: '#fff',
                                                    color: isDeviceReachable ? '#6246E0' : '#B91C1C',
                                                    border: `1px solid ${isDeviceReachable ? '#C9BEFB' : '#FECACA'}`,
                                                    '& .MuiChip-icon': { color: 'inherit', ml: '4px' },
                                                }}
                                            />
                                        </Box>
                                        <Tooltip arrow title={syncStatus?.lastDeviceError || ''}>
                                            <Typography sx={{ fontSize: 10.5, color: '#4B5563', mt: 0.3 }} noWrap>
                                                Last contact:{' '}
                                                <strong>{formatRelativeTime(syncStatus?.lastDeviceContactAt)}</strong>
                                            </Typography>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            </Grid>

                            {/* Sync action */}
                            <Grid size={{ xs: 12, md: 4 }}>
                                <Box sx={{
                                    display: 'flex', flexDirection: 'column',
                                    gap: 0.5, alignItems: { xs: 'stretch', md: 'flex-end' },
                                }}>
                                    {userType !== 'teacher' && (
                                        <Tooltip
                                            arrow
                                            title={
                                                isSyncing ? 'A sync is currently running'
                                                : !devicesOnline ? `${offlineDeviceLabel} is offline — both must be online to sync`
                                                : inCooldown ? `Cooldown — try again in ${formatHHMMSS(cooldownLeftSec)}`
                                                : 'Manually sync past punches from the biometric device'
                                            }
                                        >
                                            <Box sx={{ display: 'inline-flex', width: '100%', justifyContent: { md: 'flex-end' } }}>
                                                <Button
                                                    onClick={() => setManualSyncOpen(true)}
                                                    disabled={!canTrigger}
                                                    startIcon={
                                                        isSyncing
                                                            ? <CircularProgress size={14} sx={{ color: '#fff' }} />
                                                            : !devicesOnline
                                                                ? <WifiOffIcon sx={{ fontSize: 18 }} />
                                                                : <CloudSyncIcon sx={{ fontSize: 18 }} />
                                                    }
                                                    sx={{
                                                        textTransform: 'none',
                                                        bgcolor: '#4338CA', color: '#fff',
                                                        borderRadius: '7px',
                                                        fontSize: 13, fontWeight: 700,
                                                        px: 2.5, height: 38,
                                                        boxShadow: '0 4px 12px rgba(67,56,202,0.35)',
                                                        '&:hover': {
                                                            bgcolor: '#3730A3',
                                                            boxShadow: '0 6px 16px rgba(67,56,202,0.5)',
                                                        },
                                                        '&.Mui-disabled': {
                                                            bgcolor: '#E5E7EB', color: '#9CA3AF', boxShadow: 'none',
                                                        },
                                                    }}
                                                >
                                                    {isSyncing
                                                        ? 'Syncing…'
                                                        : !devicesOnline
                                                            ? 'Device Offline'
                                                            : inCooldown
                                                                ? `Cooldown ${formatHHMMSS(cooldownLeftSec)}`
                                                                : 'Sync Last Data'}
                                                </Button>
                                            </Box>
                                        </Tooltip>
                                    )}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#6B7280', flexWrap: 'wrap', justifyContent: { md: 'flex-end' } }}>
                                        <HistoryToggleOffIcon sx={{ fontSize: 13, color: '#9CA3AF' }} />
                                        <Typography sx={{ fontSize: 10.5 }}>
                                            Last triggered:{' '}
                                            <strong style={{ color: '#374151' }}>
                                                {syncStatus?.lastTriggeredAt
                                                    ? formatRelativeTime(syncStatus.lastTriggeredAt)
                                                    : 'never'}
                                            </strong>
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>
                        </Grid>
                    </Box>
                </Paper>
                )}

                {/* ─── My Attendance Today (personal ticker + break tracking) ─── */}
                <Paper elevation={0} sx={{
                    mb: 2,
                    borderRadius: '7px',
                    border: `1px solid ${PRIMARY_BORDER}`,
                    bgcolor: '#fff',
                    overflow: 'hidden',
                    background: `linear-gradient(135deg, ${PRIMARY_LIGHT} 0%, #fff 55%)`,
                }}>
                    <Box sx={{ p: 1.8 }}>
                        <Grid container spacing={1.5} alignItems="center">
                            {/* Left: avatar + live ticker */}
                            <Grid size={{ xs: 12, md: 4 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Box sx={{ position: 'relative' }}>
                                        <Avatar sx={{
                                            width: 52, height: 52,
                                            bgcolor: '#fff',
                                            color: PRIMARY_DARK,
                                            fontWeight: 800,
                                            fontSize: '16px',
                                            border: `2px solid ${PRIMARY_BORDER}`,
                                        }}>
                                            {getInitials(user.name || 'You')}
                                        </Avatar>
                                        {/* Active status pulse dot */}
                                        <Box sx={{
                                            position: 'absolute',
                                            bottom: -2, right: -2,
                                            width: 14, height: 14, borderRadius: '50%',
                                            bgcolor: '#22C55E',
                                            border: '2px solid #fff',
                                            boxShadow: `0 0 0 4px #DBEAFE`,
                                            animation: 'pulse 1.6s infinite',
                                            '@keyframes pulse': {
                                                '0%, 100%': { transform: 'scale(1)', opacity: 1 },
                                                '50%': { transform: 'scale(1.12)', opacity: 0.85 },
                                            },
                                        }} />
                                    </Box>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography sx={{
                                            fontSize: '10px', color: PRIMARY_DARK, fontWeight: 700,
                                            textTransform: 'uppercase', letterSpacing: 0.6,
                                        }}>
                                            Logged In For
                                        </Typography>
                                        <Typography sx={{
                                            fontSize: '26px', fontWeight: 800, color: PRIMARY_DARK,
                                            fontFamily: 'monospace', lineHeight: 1.05, letterSpacing: 1,
                                        }}>
                                            {loggedInDur.hhmmss}
                                        </Typography>
                                        <Typography sx={{ fontSize: '10.5px', color: '#4B5563', mt: 0.2 }}>
                                            Since <strong>{formatTimeOfDay(loginTime)}</strong> · Punches synced from device
                                        </Typography>
                                    </Box>
                                </Box>
                            </Grid>

                            {/* Right: mini stats (fills the space left by the action buttons) */}
                            <Grid size={{ xs: 12, md: 8 }}>
                                <Grid container spacing={1}>
                                    {[
                                        { label: 'Login',      value: formatTimeOfDay(loginTime),                                                color: '#7C5CFC', icon: CheckCircleIcon,    bg: '#F1EEFE', border: '#C9BEFB' },
                                        { label: 'Break Time', value: breakDur.h > 0 ? `${breakDur.h}h ${breakDur.m}m` : `${breakDur.m}m`,        color: '#0EA5E9', icon: LocalCafeIcon,      bg: '#E0F2FE', border: '#BAE6FD' },
                                        { label: 'Net Hours',  value: netWorkDur.h > 0 ? `${netWorkDur.h}h ${netWorkDur.m}m` : `${netWorkDur.m}m`, color: '#4338CA', icon: TimerOutlinedIcon,  bg: '#EEF2FF', border: '#C7D2FE' },
                                    ].map((s) => {
                                        const SIcon = s.icon;
                                        return (
                                            <Grid size={4} key={s.label}>
                                                <Box sx={{
                                                    p: 1, borderRadius: '7px',
                                                    bgcolor: s.bg, border: `1px solid ${s.border}`,
                                                    display: 'flex', alignItems: 'center', gap: 0.8,
                                                }}>
                                                    <Box sx={{
                                                        width: 28, height: 28, borderRadius: '7px',
                                                        bgcolor: '#fff', border: `1px solid ${s.border}`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        flexShrink: 0,
                                                    }}>
                                                        <SIcon sx={{ fontSize: 16, color: s.color }} />
                                                    </Box>
                                                    <Box sx={{ minWidth: 0 }}>
                                                        <Typography sx={{
                                                            fontSize: '9.5px', color: s.color, fontWeight: 700,
                                                            textTransform: 'uppercase', letterSpacing: 0.4, lineHeight: 1.1,
                                                        }}>
                                                            {s.label}
                                                        </Typography>
                                                        <Typography sx={{
                                                            fontSize: '13px', fontWeight: 700, color: '#111827',
                                                            lineHeight: 1.1, mt: 0.2,
                                                        }} noWrap>
                                                            {s.value}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </Grid>
                                        );
                                    })}
                                </Grid>
                            </Grid>

                        </Grid>

                        {/* Today's breaks chips */}
                        {breaks.length > 0 && (
                            <Box sx={{ mt: 1.5, pt: 1.2, borderTop: `1px dashed ${PRIMARY_BORDER}` }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.6, flexWrap: 'wrap' }}>
                                    <Typography sx={{
                                        fontSize: '10px', color: '#6B7280', fontWeight: 700,
                                        textTransform: 'uppercase', letterSpacing: 0.5,
                                    }}>
                                        Today's Breaks
                                    </Typography>
                                    <Chip
                                        label={`${breaks.length} · ${breakDur.h > 0 ? `${breakDur.h}h ` : ''}${breakDur.m}m total`}
                                        size="small"
                                        sx={{ height: 18, fontSize: '9.5px', fontWeight: 700, bgcolor: '#F3F4F6', color: '#374151' }}
                                    />
                                </Box>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                                    {breaks.map((b, idx) => {
                                        const dur = formatDuration(b.end - b.start);
                                        return (
                                            <Chip
                                                key={idx}
                                                icon={<LocalCafeIcon sx={{ fontSize: '12px !important' }} />}
                                                label={`${formatTimeOfDay(b.start)} → ${formatTimeOfDay(b.end)} · ${dur.h > 0 ? `${dur.h}h ` : ''}${dur.m}m`}
                                                size="small"
                                                sx={{
                                                    height: 22, fontSize: '10.5px', fontWeight: 600,
                                                    bgcolor: '#E0F2FE', color: '#92400E',
                                                    border: '1px solid #BAE6FD',
                                                    '& .MuiChip-icon': { color: '#0EA5E9', ml: '6px' },
                                                }}
                                            />
                                        );
                                    })}
                                </Box>
                            </Box>
                        )}
                    </Box>
                </Paper>


                <Grid container spacing={2}>
                    {/* Main Column */}
                    <Grid size={{ xs: 12, lg: 9 }}>
                        {/* KPI Cards */}
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                            {kpiCards.map((card) => {
                                const Icon = card.icon;
                                return (
                                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.label}>
                                        <Card sx={{
                                            border: `1px solid ${card.border}`,
                                            borderRadius: '7px',
                                            boxShadow: 'none',
                                            bgcolor: card.bg,
                                            height: '100%',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            transition: 'transform 0.15s, box-shadow 0.15s',
                                            '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 6px 16px ${card.color}22` },
                                        }}>
                                            <CardContent sx={{ py: 1.8, '&:last-child': { pb: 1.8 } }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <Box>
                                                        <Typography sx={{ fontSize: '11px', color: card.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                            {card.label}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '28px', fontWeight: 800, color: '#111827', lineHeight: 1.2, mt: 0.5 }}>
                                                            {card.value}
                                                            {card.sub && <Typography component="span" sx={{ fontSize: '14px', color: '#9CA3AF', fontWeight: 600 }}>{card.sub}</Typography>}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{
                                                        width: 38, height: 38, borderRadius: '7px',
                                                        bgcolor: '#fff', border: `1px solid ${card.border}`,
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

                        {/* Today's Attendance */}
                        <Card sx={{ border: '1px solid #E5E7EB', borderRadius: '7px', boxShadow: 'none', bgcolor: '#fff' }}>
                            <CardContent sx={{ pb: '12px !important' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                        <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                                            Today's Attendance
                                        </Typography>
                                        <Chip label={`${todaysAttendance.length} records`} size="small"
                                            sx={{ bgcolor: '#F3F4F6', color: '#374151', fontWeight: 600, fontSize: '11px', height: 20 }} />
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <TextField
                                            size="small"
                                            placeholder="Search..."
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
                                                width: 180,
                                                '& .MuiOutlinedInput-root': {
                                                    height: 32, fontSize: '12px', borderRadius: '50px', bgcolor: '#F9FAFB',
                                                    '& fieldset': { borderColor: '#E5E7EB' },
                                                },
                                            }}
                                        />
                                        <Button size="small" startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
                                            sx={{ textTransform: 'none', fontSize: '12px', fontWeight: 600, color: '#374151', borderRadius: '50px', border: '1px solid #E5E7EB', px: 1.5, '&:hover': { bgcolor: '#F9FAFB' } }}>
                                            Export
                                        </Button>
                                    </Box>
                                </Box>

                                {isLoadingTodayList ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                                        <CircularProgress size={28} sx={{ color: PRIMARY }} />
                                    </Box>
                                ) : (
                                    <TableContainer sx={{ borderRadius: '7px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{
                                                    bgcolor: PRIMARY_LIGHT,
                                                    borderBottom: `1px solid ${PRIMARY_BORDER}`,
                                                }}>
                                                    {['S.No', 'Staff Member', 'Role', 'Source', 'Check-In', 'Check-Out', 'Status'].map(h => (
                                                        <TableCell key={h} sx={{
                                                            fontWeight: 700, fontSize: '10px', color: PRIMARY_DARK,
                                                            textTransform: 'uppercase', whiteSpace: 'nowrap',
                                                            letterSpacing: 0.6, py: 1.3, borderBottom: 'none',
                                                        }}>{h}</TableCell>
                                                    ))}
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {todaysAttendance.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={7} align="center" sx={{ py: 5, color: '#9CA3AF', fontSize: '13px', borderBottom: 'none' }}>
                                                            No attendance records yet today
                                                        </TableCell>
                                                    </TableRow>
                                                ) : todaysAttendance.slice(0, 10).map((emp, idx) => {
                                                    const roleLabel = mapRole(emp.role);
                                                    const statusLabel = mapStatus(emp.status, emp.attendance);
                                                    const roleConf = ROLE_CONFIG[roleLabel] || { color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };
                                                    const statConf = STATUS_STYLE[statusLabel] || STATUS_STYLE.Absent;
                                                    const isBiometric = (emp.source || '').toLowerCase() === 'biometric';
                                                    const showTime = statusLabel === 'Present' || statusLabel === 'Late';
                                                    const avColor = avatarColorFor(emp.name || '');

                                                    return (
                                                        <TableRow key={emp.rollNumber || idx} sx={{
                                                            '&:hover': { bgcolor: PRIMARY_LIGHT },
                                                            borderBottom: '1px solid #F3F4F6',
                                                            transition: 'background-color 0.15s',
                                                        }}>
                                                            <TableCell sx={{ width: 40, borderBottom: '1px solid #F3F4F6' }}>
                                                                <Typography sx={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 500 }}>{idx + 1}</Typography>
                                                            </TableCell>
                                                            <TableCell sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                                                    <Avatar sx={{
                                                                        width: 32, height: 32,
                                                                        bgcolor: `${avColor}15`,
                                                                        color: avColor,
                                                                        fontSize: '11px', fontWeight: 700,
                                                                        border: `1px solid ${avColor}33`,
                                                                    }}>
                                                                        {getInitials(emp.name)}
                                                                    </Avatar>
                                                                    <Box>
                                                                        <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{emp.name}</Typography>
                                                                        <Typography sx={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 500 }}>{emp.rollNumber}</Typography>
                                                                    </Box>
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                                <Chip label={roleLabel} size="small"
                                                                    sx={{
                                                                        bgcolor: roleConf.bg, color: roleConf.color,
                                                                        border: `1px solid ${roleConf.border}`,
                                                                        fontWeight: 600, fontSize: '10px', height: 22,
                                                                    }} />
                                                            </TableCell>
                                                            <TableCell sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                                <Tooltip title={isBiometric ? `Biometric · ${VERIFY_MODE_LABEL(emp.verifyMode || '')}` : 'Manual Entry'} arrow>
                                                                    <Chip
                                                                        size="small"
                                                                        icon={isBiometric ? VERIFY_MODE_ICON(emp.verifyMode || '') : <EditNoteIcon sx={{ fontSize: 14 }} />}
                                                                        label={isBiometric ? 'Biometric' : 'Manual'}
                                                                        sx={{
                                                                            height: 22, fontSize: '10px', fontWeight: 600,
                                                                            bgcolor: isBiometric ? '#EEF2FF' : '#F9FAFB',
                                                                            color: isBiometric ? '#4338CA' : '#4B5563',
                                                                            border: `1px solid ${isBiometric ? '#C7D2FE' : '#E5E7EB'}`,
                                                                            '& .MuiChip-icon': { color: 'inherit', ml: '6px' },
                                                                        }}
                                                                    />
                                                                </Tooltip>
                                                            </TableCell>
                                                            <TableCell sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                                {showTime && emp.loginTime ? (
                                                                    <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{emp.loginTime}</Typography>
                                                                ) : <Typography sx={{ fontSize: '12px', color: '#D1D5DB' }}>—</Typography>}
                                                            </TableCell>
                                                            <TableCell sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                                {showTime && emp.logoutTime ? (
                                                                    <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>{emp.logoutTime}</Typography>
                                                                ) : <Typography sx={{ fontSize: '12px', color: '#D1D5DB' }}>—</Typography>}
                                                            </TableCell>
                                                            <TableCell sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                                <Chip label={statusLabel} size="small"
                                                                    sx={{
                                                                        bgcolor: statConf.bg, color: statConf.color,
                                                                        fontWeight: 700, fontSize: '10px', height: 22,
                                                                        border: `1px solid ${statConf.border}`,
                                                                    }} />
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}

                                {todaysAttendance.length > 0 && (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
                                        <Button onClick={() => setTabValue(2)}
                                            sx={{ textTransform: 'none', fontSize: '12px', fontWeight: 700, color: PRIMARY_DARK, '&:hover': { bgcolor: PRIMARY_LIGHT } }}>
                                            View All Records →
                                        </Button>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Right Panel */}
                    <Grid size={{ xs: 12, lg: 3 }}>
                        {/* Attendance Rate */}
                      
                        {/* Leave Center quick links */}
                        <Card sx={{ border: '1px solid #E5E7EB', borderRadius: '7px', boxShadow: 'none', bgcolor: '#fff' }}>
                            <CardContent sx={{ pb: '12px !important' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2 }}>
                                    <Box sx={{
                                        width: 28, height: 28, borderRadius: '7px',
                                        bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <EventIcon sx={{ color: PRIMARY, fontSize: 16 }} />
                                    </Box>
                                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                                        Leave Center
                                    </Typography>
                                </Box>

                                {/* Apply Leave row */}
                                <Box sx={{
                                    p: 1.2, borderRadius: '7px',
                                    bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`,
                                    mb: 1,
                                }}>
                                    <Typography sx={{ fontSize: '12px', fontWeight: 700, color: PRIMARY_DARK, mb: 0.2 }}>
                                        Apply for Leave
                                    </Typography>
                                    <Typography sx={{ fontSize: '10.5px', color: '#4B5563', mb: 1 }}>
                                        Submit a new leave request with dates and reason.
                                    </Typography>
                                    <Button fullWidth variant="contained"
                                        onClick={() => goToLeaveManagement('apply')}
                                        sx={{
                                            textTransform: 'none', fontSize: '12px', fontWeight: 700,
                                            bgcolor: PRIMARY, color: '#fff', borderRadius: '7px',
                                            boxShadow: `0 2px 6px ${PRIMARY}33`,
                                            '&:hover': { bgcolor: PRIMARY_DARK, boxShadow: `0 4px 12px ${PRIMARY}55` },
                                        }}>
                                        Go to Apply Leave
                                    </Button>
                                </Box>

                            </CardContent>
                        </Card>

                        {/* ─── Quick Navigation card ─── */}
                        <Card sx={{ mt: 2, border: '1px solid #E5E7EB', borderRadius: '7px', boxShadow: 'none', bgcolor: '#fff' }}>
                            <CardContent sx={{ pb: '12px !important' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2 }}>
                                    <Box sx={{
                                        width: 28, height: 28, borderRadius: '7px',
                                        bgcolor: '#EEF2FF', border: '1px solid #C7D2FE',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <SpaceDashboardOutlinedIcon sx={{ color: '#4338CA', fontSize: 16 }} />
                                    </Box>
                                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                                        Quick Navigation
                                    </Typography>
                                </Box>

                                <Stack spacing={0.8}>
                                    {[
                                        { label: "Today's Attendance", desc: 'Logins of all staff today',  icon: TodayIcon,                  color: '#0891B2', bg: '#E0F7FA', border: '#A5F3FC', target: 2 },
                                        { label: 'Overview',            desc: 'Monthly attendance trends', icon: VisibilityOutlinedIcon,    color: '#2563EB', bg: '#F3F0FE', border: '#C9BEFB', target: 3 },
                                        { label: 'Leave Management',    desc: 'View your leave history',   icon: ListAltOutlinedIcon,       color: '#7C5CFC', bg: '#F1EEFE', border: '#C9BEFB', target: 4, subView: 'applications' },
                                        ...(userType === 'superadmin' || userType === 'admin' ? [
                                            { label: 'Leave Approval',  desc: 'Approve pending requests',  icon: FactCheckOutlinedIcon,     color: '#6246E0', bg: '#F3F0FE', border: '#C9BEFB', target: 4, subView: 'approval' },
                                        ] : []),
                                        { label: 'Reports',             desc: 'Attendance & leave reports',icon: InsertChartOutlinedIcon,   color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', target: 5 },
                                    ].map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <Box
                                                key={item.label}
                                                onClick={() => {
                                                    if (item.subView) setLeaveSubView(item.subView);
                                                    setTabValue(item.target);
                                                }}
                                                sx={{
                                                    p: 1, borderRadius: '7px',
                                                    border: '1px solid #E5E7EB',
                                                    bgcolor: '#fff',
                                                    display: 'flex', alignItems: 'center', gap: 1,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s',
                                                    '&:hover': {
                                                        bgcolor: item.bg,
                                                        borderColor: item.border,
                                                        transform: 'translateX(2px)',
                                                        '& .arrowIcon': { opacity: 1, transform: 'translateX(2px)' },
                                                    },
                                                }}
                                            >
                                                <Box sx={{
                                                    width: 30, height: 30, borderRadius: '7px',
                                                    bgcolor: item.bg, border: `1px solid ${item.border}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}>
                                                    <Icon sx={{ color: item.color, fontSize: 16 }} />
                                                </Box>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>
                                                        {item.label}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: '10px', color: '#6B7280', mt: 0.2 }} noWrap>
                                                        {item.desc}
                                                    </Typography>
                                                </Box>
                                                <ArrowForwardIcon className="arrowIcon" sx={{
                                                    fontSize: 14, color: item.color,
                                                    opacity: 0, transition: 'all 0.2s',
                                                }} />
                                            </Box>
                                        );
                                    })}
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Box>
        );
    };

    // ─── Today's Attendance (full-page view of all staff today) ───────────
    // Data source: GetTeachersAttendance (fromDate=toDate=today), normalized
    // into the shape the existing render code already expects.
    const renderTodaysAttendance = () => {
        const todaysAttendance = todayAttendanceList;

        // Parse HH:MM / HH:MM:SS → minutes since midnight.
        const toMinutes = (timeStr) => {
            if (!timeStr || typeof timeStr !== 'string') return null;
            const [h, m] = timeStr.split(':').map(Number);
            if (Number.isNaN(h) || Number.isNaN(m)) return null;
            return h * 60 + m;
        };

        // Sum break minutes from the rawBreaks array (each entry has
        // breakOutTime + breakInTime). Skips incomplete / invalid breaks.
        const sumBreakMinutes = (rawBreaks = []) => rawBreaks.reduce((sum, b) => {
            const out = toMinutes(b.breakOutTime);
            const inn = toMinutes(b.breakInTime);
            if (out == null || inn == null || inn < out) return sum;
            return sum + (inn - out);
        }, 0);

        // "8h 15m" string for minutes — empty when 0.
        const formatMinutes = (mins) => {
            if (!Number.isFinite(mins) || mins <= 0) return '0m';
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            return h > 0 ? `${h}h ${m}m` : `${m}m`;
        };

        // Net worked hours = (logout − login) − Σ breaks. Returns the gross /
        // break / net minutes so the cell can show a tooltip breakdown too.
        const computeWorkedBreakdown = (loginStr, logoutStr, rawBreaks) => {
            const loginMin = toMinutes(loginStr);
            const logoutMin = toMinutes(logoutStr);
            if (loginMin == null || logoutMin == null) return null;
            let gross = logoutMin - loginMin;
            if (gross < 0) gross += 24 * 60; // overnight safety
            const breakMin = sumBreakMinutes(rawBreaks);
            const net = Math.max(0, gross - breakMin);
            return { gross, breakMin, net, breakCount: (rawBreaks || []).length };
        };

        // Filter
        const q = todayAttSearch.trim().toLowerCase();
        const filtered = todaysAttendance.filter((emp) => {
            const roleLabel = mapRole(emp.role);
            const statusLabel = mapStatus(emp.status, emp.attendance);
            const matchesSearch = !q
                || (emp.name || '').toLowerCase().includes(q)
                || String(emp.rollNumber || '').toLowerCase().includes(q);
            const matchesRole = todayAttRoleFilter === 'all' || roleLabel === todayAttRoleFilter;
            const matchesStatus = todayAttStatusFilter === 'all' || statusLabel === todayAttStatusFilter;
            return matchesSearch && matchesRole && matchesStatus;
        });

        // Stats over filtered set
        const stats = {
            total:   filtered.length,
            present: filtered.filter(e => mapStatus(e.status, e.attendance) === 'Present').length,
            late:    filtered.filter(e => mapStatus(e.status, e.attendance) === 'Late').length,
            onLeave: filtered.filter(e => mapStatus(e.status, e.attendance) === 'On Leave').length,
            absent:  filtered.filter(e => mapStatus(e.status, e.attendance) === 'Absent').length,
        };

        return (
            <Box>
                {/* Header strip */}
                <Paper elevation={0} sx={{
                    p: 1.8, mb: 2, borderRadius: '7px',
                    border: `1px solid ${PRIMARY_BORDER}`,
                    background: `linear-gradient(135deg, ${PRIMARY_LIGHT} 0%, #fff 60%)`,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{
                                width: 42, height: 42, borderRadius: '7px',
                                bgcolor: '#fff', border: `1px solid ${PRIMARY_BORDER}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <TodayIcon sx={{ color: PRIMARY, fontSize: 22 }} />
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: '16px', fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>
                                    Today's Staff Attendance
                                </Typography>
                                <Typography sx={{ fontSize: '11px', color: '#4B5563', mt: 0.2 }}>
                                    {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                    {' · '}
                                    Login times for each staff member
                                </Typography>
                            </Box>
                        </Box>
                        <Button
                            size="small"
                            startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
                            sx={{
                                textTransform: 'none', fontSize: '12px', fontWeight: 700,
                                color: PRIMARY_DARK, bgcolor: '#fff',
                                border: `1px solid ${PRIMARY_BORDER}`, borderRadius: '7px',
                                px: 1.5, height: 32,
                                '&:hover': { bgcolor: PRIMARY_LIGHT, borderColor: PRIMARY },
                            }}
                        >
                            Export
                        </Button>
                    </Box>

                    {/* Summary chips */}
                    <Box sx={{ display: 'flex', gap: 0.8, mt: 1.5, flexWrap: 'wrap' }}>
                        {[
                            { label: 'Total',    value: stats.total,    color: '#374151', bg: '#F3F4F6', border: '#E5E7EB' },
                            { label: 'Present',  value: stats.present,  color: '#6246E0', bg: '#F1EEFE', border: '#C9BEFB' },
                            { label: 'Late',     value: stats.late,     color: '#B45309', bg: '#E0F2FE', border: '#BAE6FD' },
                            { label: 'On Leave', value: stats.onLeave,  color: '#1D4ED8', bg: '#F3F0FE', border: '#C9BEFB' },
                            { label: 'Absent',   value: stats.absent,   color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA' },
                        ].map(s => (
                            <Chip
                                key={s.label}
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.6 }}>
                                        <Typography sx={{ fontSize: '10px', color: s.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>{s.label}</Typography>
                                        <Typography sx={{ fontSize: '13px', color: s.color, fontWeight: 800 }}>{s.value}</Typography>
                                    </Box>
                                }
                                sx={{
                                    bgcolor: s.bg, border: `1px solid ${s.border}`,
                                    height: 26, px: 0.6, borderRadius: '7px',
                                    '& .MuiChip-label': { px: 0.6 },
                                }}
                            />
                        ))}
                    </Box>
                </Paper>

                {/* Filters toolbar — search + dropdowns + active filter indicators */}
                {(() => {
                    // Per-role / per-status counts (computed over unfiltered set so dropdowns are honest)
                    const roleCounts = todaysAttendance.reduce((acc, e) => {
                        const r = mapRole(e.role); acc[r] = (acc[r] || 0) + 1; return acc;
                    }, {});
                    const statusCounts = todaysAttendance.reduce((acc, e) => {
                        const s = mapStatus(e.status, e.attendance); acc[s] = (acc[s] || 0) + 1; return acc;
                    }, {});

                    const roleItems = [
                        { key: 'all',                  label: 'All Roles',          color: '#6B7280' },
                        { key: 'Teaching Staff',       label: 'Teaching Staff',     color: '#1D4ED8' },
                        { key: 'Non Teaching Staff',   label: 'Non Teaching Staff', color: '#0E7490' },
                        { key: 'Supporting Staff',     label: 'Supporting Staff',   color: '#C2410C' },
                    ];
                    const statusItems = [
                        { key: 'all',       label: 'All Status', color: '#6B7280' },
                        { key: 'Present',   label: 'Present',    color: STATUS_STYLE.Present.color },
                        { key: 'Late',      label: 'Late',       color: STATUS_STYLE.Late.color },
                        { key: 'On Leave',  label: 'On Leave',   color: STATUS_STYLE['On Leave'].color },
                        { key: 'Absent',    label: 'Absent',     color: STATUS_STYLE.Absent.color },
                    ];

                    const roleActive = todayAttRoleFilter !== 'all';
                    const statusActive = todayAttStatusFilter !== 'all';
                    const searchActive = todayAttSearch.trim().length > 0;
                    const anyActive = roleActive || statusActive || searchActive;

                    const activeRoleColor = roleItems.find(r => r.key === todayAttRoleFilter)?.color || '#6B7280';
                    const activeStatusColor = statusItems.find(s => s.key === todayAttStatusFilter)?.color || '#6B7280';

                    const filterButtonSx = (isActive, accent) => ({
                        textTransform: 'none', fontSize: '12.5px', fontWeight: 600,
                        height: 34, borderRadius: '7px', px: 1.5, gap: 0.4,
                        color: isActive ? '#fff' : '#374151',
                        bgcolor: isActive ? accent : '#fff',
                        border: `1px solid ${isActive ? accent : '#E5E7EB'}`,
                        boxShadow: isActive ? `0 1px 3px ${accent}33` : 'none',
                        '&:hover': {
                            bgcolor: isActive ? accent : '#F9FAFB',
                            borderColor: isActive ? accent : '#D1D5DB',
                            filter: isActive ? 'brightness(0.95)' : 'none',
                        },
                    });

                    const renderFilterMenu = (anchor, setAnchor, items, currentKey, onPick, getCount, totalCount) => (
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
                                const count = opt.key === 'all' ? totalCount : (getCount[opt.key] || 0);
                                return (
                                    <MenuItem
                                        key={opt.key}
                                        onClick={() => { onPick(opt.key); setAnchor(null); }}
                                        sx={{
                                            py: 0.8, px: 1.2, gap: 1,
                                            bgcolor: isActive ? `${opt.color}10` : 'transparent',
                                            '&:hover': { bgcolor: `${opt.color}15` },
                                        }}
                                    >
                                        <CircleIcon sx={{ fontSize: 9, color: opt.color, flexShrink: 0 }} />
                                        <Typography sx={{
                                            fontSize: '13px', fontWeight: isActive ? 700 : 500,
                                            color: isActive ? opt.color : '#374151', flex: 1,
                                        }}>
                                            {opt.label}
                                        </Typography>
                                        <Box sx={{
                                            px: 0.7, py: 0.1, borderRadius: '7px',
                                            bgcolor: isActive ? '#fff' : '#F3F4F6',
                                            border: `1px solid ${isActive ? `${opt.color}30` : '#E5E7EB'}`,
                                        }}>
                                            <Typography sx={{ fontSize: '10.5px', fontWeight: 700, color: isActive ? opt.color : '#6B7280' }}>
                                                {count}
                                            </Typography>
                                        </Box>
                                        {isActive && <CheckIcon sx={{ fontSize: 15, color: opt.color, ml: 0.4 }} />}
                                    </MenuItem>
                                );
                            })}
                        </Menu>
                    );

                    return (
                        <Card sx={{ border: '1px solid #E5E7EB', borderRadius: '7px', boxShadow: 'none', bgcolor: '#fff', mb: 2 }}>
                            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                                    {/* Search */}
                                    <TextField
                                        size="small"
                                        placeholder="Search by name or roll no..."
                                        value={todayAttSearch}
                                        onChange={(e) => setTodayAttSearch(e.target.value)}
                                        slotProps={{
                                            input: {
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <SearchIcon sx={{ fontSize: 16, color: searchActive ? PRIMARY : '#9CA3AF' }} />
                                                    </InputAdornment>
                                                ),
                                                endAdornment: searchActive ? (
                                                    <InputAdornment position="end">
                                                        <IconButton size="small" onClick={() => setTodayAttSearch('')} sx={{ p: 0.3 }}>
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
                                                bgcolor: searchActive ? PRIMARY_LIGHT : '#F9FAFB',
                                                '& fieldset': { borderColor: searchActive ? PRIMARY_BORDER : '#E5E7EB' },
                                                '&:hover fieldset': { borderColor: '#D1D5DB' },
                                                '&.Mui-focused fieldset': { borderColor: PRIMARY },
                                            },
                                        }}
                                    />

                                    {/* Vertical divider */}
                                    <Box sx={{ width: '1px', height: 24, bgcolor: '#E5E7EB' }} />

                                    {/* Role filter button */}
                                    <Button
                                        onClick={(e) => setTodayRoleMenuAnchor(e.currentTarget)}
                                        startIcon={<PeopleAltOutlinedIcon sx={{ fontSize: 16 }} />}
                                        endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
                                        sx={filterButtonSx(roleActive, activeRoleColor)}
                                    >
                                        {roleActive ? todayAttRoleFilter : 'Role'}
                                    </Button>
                                    {renderFilterMenu(
                                        todayRoleMenuAnchor, setTodayRoleMenuAnchor,
                                        roleItems, todayAttRoleFilter, setTodayAttRoleFilter,
                                        roleCounts, todaysAttendance.length,
                                    )}

                                    {/* Status filter button */}
                                    <Button
                                        onClick={(e) => setTodayStatusMenuAnchor(e.currentTarget)}
                                        startIcon={<CircleIcon sx={{ fontSize: 10, color: statusActive ? '#fff' : activeStatusColor }} />}
                                        endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
                                        sx={filterButtonSx(statusActive, activeStatusColor)}
                                    >
                                        {statusActive ? todayAttStatusFilter : 'Status'}
                                    </Button>
                                    {renderFilterMenu(
                                        todayStatusMenuAnchor, setTodayStatusMenuAnchor,
                                        statusItems, todayAttStatusFilter, setTodayAttStatusFilter,
                                        statusCounts, todaysAttendance.length,
                                    )}

                                    {/* Clear filters — only when something is active */}
                                    {anyActive && (
                                        <Button
                                            size="small"
                                            startIcon={<RestartAltIcon sx={{ fontSize: 15 }} />}
                                            onClick={clearTodayFilters}
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

                                    {/* Result count — pushed to the right */}
                                    <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                        <Typography sx={{ fontSize: '11.5px', color: '#6B7280' }}>
                                            Showing
                                        </Typography>
                                        <Typography sx={{ fontSize: '13px', fontWeight: 800, color: anyActive ? PRIMARY_DARK : '#111827' }}>
                                            {filtered.length}
                                        </Typography>
                                        <Typography sx={{ fontSize: '11.5px', color: '#6B7280' }}>
                                            of {todaysAttendance.length} records
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Active filter pills row — only when active */}
                                {anyActive && (
                                    <Box sx={{
                                        mt: 1.2, pt: 1.2, borderTop: '1px dashed #E5E7EB',
                                        display: 'flex', alignItems: 'center', gap: 0.7, flexWrap: 'wrap',
                                    }}>
                                        <Typography sx={{ fontSize: '10.5px', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            Active filters:
                                        </Typography>
                                        {searchActive && (
                                            <Chip
                                                size="small"
                                                icon={<SearchIcon sx={{ fontSize: '12px !important' }} />}
                                                label={`"${todayAttSearch}"`}
                                                onDelete={() => setTodayAttSearch('')}
                                                deleteIcon={<CloseIcon sx={{ fontSize: '13px !important' }} />}
                                                sx={{
                                                    height: 22, fontSize: '11px', fontWeight: 600,
                                                    bgcolor: PRIMARY_LIGHT, color: PRIMARY_DARK,
                                                    border: `1px solid ${PRIMARY_BORDER}`,
                                                    '& .MuiChip-icon': { color: 'inherit', ml: '6px' },
                                                    '& .MuiChip-deleteIcon': { color: 'inherit', '&:hover': { color: PRIMARY_DARK } },
                                                }}
                                            />
                                        )}
                                        {roleActive && (
                                            <Chip
                                                size="small"
                                                icon={<PeopleAltOutlinedIcon sx={{ fontSize: '12px !important' }} />}
                                                label={`Role: ${todayAttRoleFilter}`}
                                                onDelete={() => setTodayAttRoleFilter('all')}
                                                deleteIcon={<CloseIcon sx={{ fontSize: '13px !important' }} />}
                                                sx={{
                                                    height: 22, fontSize: '11px', fontWeight: 600,
                                                    bgcolor: `${activeRoleColor}15`, color: activeRoleColor,
                                                    border: `1px solid ${activeRoleColor}40`,
                                                    '& .MuiChip-icon': { color: 'inherit', ml: '6px' },
                                                    '& .MuiChip-deleteIcon': { color: 'inherit' },
                                                }}
                                            />
                                        )}
                                        {statusActive && (
                                            <Chip
                                                size="small"
                                                icon={<CircleIcon sx={{ fontSize: '9px !important' }} />}
                                                label={`Status: ${todayAttStatusFilter}`}
                                                onDelete={() => setTodayAttStatusFilter('all')}
                                                deleteIcon={<CloseIcon sx={{ fontSize: '13px !important' }} />}
                                                sx={{
                                                    height: 22, fontSize: '11px', fontWeight: 600,
                                                    bgcolor: `${activeStatusColor}15`, color: activeStatusColor,
                                                    border: `1px solid ${activeStatusColor}40`,
                                                    '& .MuiChip-icon': { color: 'inherit', ml: '6px' },
                                                    '& .MuiChip-deleteIcon': { color: 'inherit' },
                                                }}
                                            />
                                        )}
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    );
                })()}

                {/* Table */}
                <Card sx={{ border: '1px solid #E5E7EB', borderRadius: '7px', boxShadow: 'none', bgcolor: '#fff' }}>
                    <CardContent sx={{ pb: '12px !important' }}>
                        {isLoadingTodayList ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                                <CircularProgress size={32} sx={{ color: PRIMARY }} />
                            </Box>
                        ) : filtered.length === 0 ? (
                            <Box sx={{ py: 6, textAlign: 'center' }}>
                                <Typography sx={{ fontSize: '13px', color: '#9CA3AF', fontWeight: 600 }}>
                                    No attendance records match your filters.
                                </Typography>
                                <Typography sx={{ fontSize: '11px', color: '#9CA3AF', mt: 0.5 }}>
                                    Try changing or clearing your filters above.
                                </Typography>
                            </Box>
                        ) : (
                            <TableContainer sx={{ borderRadius: '7px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: PRIMARY_LIGHT, borderBottom: `1px solid ${PRIMARY_BORDER}` }}>
                                            {['S.No', 'Staff Member', 'Role', 'Source', 'Login Time', 'Logout Time', 'Hours', 'Status'].map(h => (
                                                <TableCell key={h} sx={{
                                                    fontWeight: 700, fontSize: '10px', color: PRIMARY_DARK,
                                                    textTransform: 'uppercase', whiteSpace: 'nowrap',
                                                    letterSpacing: 0.6, py: 1.3, borderBottom: 'none',
                                                }}>{h}</TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filtered.map((emp, idx) => {
                                            const roleLabel = mapRole(emp.role);
                                            const statusLabel = mapStatus(emp.status, emp.attendance);
                                            const roleConf = ROLE_CONFIG[roleLabel] || { color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };
                                            const statConf = STATUS_STYLE[statusLabel] || STATUS_STYLE.Absent;
                                            const isBiometric = (emp.source || '').toLowerCase() === 'biometric';
                                            const showTime = statusLabel === 'Present' || statusLabel === 'Late';
                                            const workedInfo = showTime ? computeWorkedBreakdown(emp.loginTime, emp.logoutTime, emp.rawBreaks) : null;
                                            const avColor = avatarColorFor(emp.name || '');

                                            return (
                                                <TableRow key={emp.rollNumber || idx} sx={{
                                                    '&:hover': { bgcolor: PRIMARY_LIGHT },
                                                    borderBottom: '1px solid #F3F4F6',
                                                    transition: 'background-color 0.15s',
                                                }}>
                                                    <TableCell sx={{ width: 50, borderBottom: '1px solid #F3F4F6' }}>
                                                        <Typography sx={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 500 }}>{idx + 1}</Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                                            <Avatar sx={{
                                                                width: 34, height: 34,
                                                                bgcolor: `${avColor}15`, color: avColor,
                                                                fontSize: '11px', fontWeight: 700,
                                                                border: `1px solid ${avColor}33`,
                                                            }}>
                                                                {getInitials(emp.name)}
                                                            </Avatar>
                                                            <Box>
                                                                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{emp.name}</Typography>
                                                                <Typography sx={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 500, fontFamily: 'monospace' }}>
                                                                    {emp.rollNumber}
                                                                </Typography>
                                                            </Box>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                        <Chip label={roleLabel} size="small"
                                                            sx={{
                                                                bgcolor: roleConf.bg, color: roleConf.color,
                                                                border: `1px solid ${roleConf.border}`,
                                                                fontWeight: 600, fontSize: '10px', height: 22,
                                                            }} />
                                                    </TableCell>
                                                    <TableCell sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                        <Tooltip title={isBiometric ? `Biometric · ${VERIFY_MODE_LABEL(emp.verifyMode || '')}` : 'Manual Entry'} arrow>
                                                            <Chip
                                                                size="small"
                                                                icon={isBiometric ? VERIFY_MODE_ICON(emp.verifyMode || '') : <EditNoteIcon sx={{ fontSize: 14 }} />}
                                                                label={isBiometric ? 'Biometric' : 'Manual'}
                                                                sx={{
                                                                    height: 22, fontSize: '10px', fontWeight: 600,
                                                                    bgcolor: isBiometric ? '#EEF2FF' : '#F9FAFB',
                                                                    color: isBiometric ? '#4338CA' : '#4B5563',
                                                                    border: `1px solid ${isBiometric ? '#C7D2FE' : '#E5E7EB'}`,
                                                                    '& .MuiChip-icon': { color: 'inherit', ml: '6px' },
                                                                }}
                                                            />
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                        {showTime && emp.loginTime ? (
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                                                <AccessTimeIcon sx={{ fontSize: 13, color: '#7C5CFC' }} />
                                                                <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#111827', fontFamily: 'monospace' }}>
                                                                    {emp.loginTime}
                                                                </Typography>
                                                            </Box>
                                                        ) : <Typography sx={{ fontSize: '12px', color: '#D1D5DB' }}>—</Typography>}
                                                    </TableCell>
                                                    <TableCell sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                        {showTime && emp.logoutTime ? (
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                                                <AccessTimeIcon sx={{ fontSize: 13, color: '#DC2626' }} />
                                                                <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#111827', fontFamily: 'monospace' }}>
                                                                    {emp.logoutTime}
                                                                </Typography>
                                                            </Box>
                                                        ) : showTime ? (
                                                            <Chip label="Active" size="small"
                                                                sx={{
                                                                    height: 20, fontSize: '10px', fontWeight: 700,
                                                                    bgcolor: '#F1EEFE', color: '#6246E0',
                                                                    border: '1px solid #C9BEFB',
                                                                }}
                                                            />
                                                        ) : (
                                                            <Typography sx={{ fontSize: '12px', color: '#D1D5DB' }}>—</Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                        {workedInfo ? (
                                                            <Tooltip
                                                                arrow placement="top"
                                                                title={
                                                                    <Box sx={{ fontSize: '11px', lineHeight: 1.6 }}>
                                                                        <div>Gross: <strong>{formatMinutes(workedInfo.gross)}</strong></div>
                                                                        <div>Breaks: <strong>{formatMinutes(workedInfo.breakMin)}</strong> ({workedInfo.breakCount})</div>
                                                                        <div>Net: <strong>{formatMinutes(workedInfo.net)}</strong></div>
                                                                    </Box>
                                                                }
                                                            >
                                                                <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                                    <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#4338CA', fontFamily: 'monospace' }}>
                                                                        {formatMinutes(workedInfo.net)}
                                                                    </Typography>
                                                                    {workedInfo.breakMin > 0 && (
                                                                        <Typography sx={{ fontSize: '9.5px', fontWeight: 600, color: '#0EA5E9', fontFamily: 'monospace' }}>
                                                                            − {formatMinutes(workedInfo.breakMin)} brk
                                                                        </Typography>
                                                                    )}
                                                                </Box>
                                                            </Tooltip>
                                                        ) : (
                                                            <Typography sx={{ fontSize: '12px', color: '#D1D5DB' }}>—</Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell sx={{ borderBottom: '1px solid #F3F4F6' }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                                            <Chip label={statusLabel} size="small"
                                                                sx={{
                                                                    bgcolor: statConf.bg, color: statConf.color,
                                                                    fontWeight: 700, fontSize: '10px', height: 22,
                                                                    border: `1px solid ${statConf.border}`,
                                                                }} />
                                                            {statusLabel === 'On Leave' && emp.isHalfDayLeave && (
                                                                <Chip label="Half Day" size="small"
                                                                    sx={{
                                                                        bgcolor: '#FFF7ED', color: '#C2410C',
                                                                        fontWeight: 700, fontSize: '9.5px', height: 20,
                                                                        border: '1px solid #FED7AA',
                                                                    }} />
                                                            )}
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </CardContent>
                </Card>
            </Box>
        );
    };

    const renderTabContent = () => {
        if (userType === "teacher") {
            // Teachers see Leave Management (with Apply Leave sub-tab inside)
            return <LeaveManagementPage
                isEmbedded={true}
                initialSubView={leaveSubView}
                onSubViewChange={setLeaveSubView}
            />;
        }

        // Staff and admin now share the same tab layout —
        // Apply Leave and Leave Approval are rendered inside Leave Management.
        switch (tabValue) {
            case 0: return renderDashboard();
            case 1: return <AddStaffAttendancePage />;
            case 2: return renderTodaysAttendance();
            case 3: return <StaffAttendanceOverviewPage isEmbedded={true} />;
            case 4: return <LeaveManagementPage
                isEmbedded={true}
                initialSubView={leaveSubView}
                onSubViewChange={setLeaveSubView}
            />;
            case 5: return <AttendanceReportsPage isEmbedded={true} />;
            default: return renderDashboard();
        }
    };

    // ─── Manual Sync Date-Picker Dialog ────────────────────────────────────
    const todayStr = new Date().toISOString().split('T')[0];
    const renderManualSyncDialog = () => (
        <Dialog
            open={manualSyncOpen}
            onClose={() => !isTriggering && setManualSyncOpen(false)}
            maxWidth="xs" fullWidth
            slotProps={{ paper: { sx: { borderRadius: '14px' } } }}
        >
            <Box sx={{
                px: 3, py: 2,
                background: 'linear-gradient(135deg, #EEF2FF 0%, #fff 60%)',
                borderBottom: '1px solid #C7D2FE',
                display: 'flex', alignItems: 'center', gap: 1.2,
            }}>
                <Box sx={{
                    width: 38, height: 38, borderRadius: '7px',
                    bgcolor: '#fff', border: '1px solid #C7D2FE',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <CloudSyncIcon sx={{ color: '#4338CA', fontSize: 22 }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
                        Sync Past Punches
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: '#6B7280', mt: 0.2 }}>
                        Fetch missed punches from the biometric device
                    </Typography>
                </Box>
                <IconButton size="small" onClick={() => setManualSyncOpen(false)} disabled={isTriggering}>
                    <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
            </Box>
            <DialogContent sx={{ p: 3 }}>
                <Typography sx={{ fontSize: 12.5, color: '#374151', lineHeight: 1.55, mb: 2 }}>
                    Pick the <strong>From Date</strong> — the day you want to start syncing from.
                    All punches from that date <strong>up to today</strong> will be fetched.
                    Use this when the Worker PC was off and punches weren't captured automatically.
                </Typography>
                <TextField
                    fullWidth
                    type="date"
                    label="From Date"
                    value={manualSyncDate}
                    onChange={(e) => setManualSyncDate(e.target.value)}
                    slotProps={{
                        inputLabel: { shrink: true },
                        htmlInput: { max: todayStr },
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '7px', fontSize: 13,
                            '&.Mui-focused fieldset': { borderColor: '#4338CA' },
                        },
                    }}
                />

                {/* Live range preview — "May 11, 2026  →  May 13, 2026 (today)" */}
                {manualSyncDate && (
                    <Box sx={{
                        mt: 1.5, p: 1.2, borderRadius: '7px',
                        bgcolor: '#EEF2FF', border: '1px solid #C7D2FE',
                        display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center', flexWrap: 'wrap',
                    }}>
                        <Typography sx={{ fontSize: 11.5, color: '#4338CA', fontWeight: 700, fontFamily: 'monospace' }}>
                            {new Date(manualSyncDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Typography>
                        <ArrowForwardIcon sx={{ fontSize: 14, color: '#4338CA' }} />
                        <Typography sx={{ fontSize: 11.5, color: '#4338CA', fontWeight: 700, fontFamily: 'monospace' }}>
                            {new Date(todayStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Typography>
                        <Chip
                            label="today"
                            size="small"
                            sx={{
                                height: 17, fontSize: 9.5, fontWeight: 800,
                                bgcolor: '#4338CA', color: '#fff', ml: 0.4,
                            }}
                        />
                    </Box>
                )}
                {/* Device-offline warning — blocks the Start button */}
                {!devicesOnline && (
                    <Box sx={{
                        mt: 2, p: 1.2, borderRadius: '7px',
                        bgcolor: '#FEF2F2', border: '1px solid #FECACA',
                        display: 'flex', alignItems: 'flex-start', gap: 1,
                    }}>
                        <WifiOffIcon sx={{ fontSize: 16, color: '#DC2626', mt: 0.2, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 10.5, color: '#991B1B', lineHeight: 1.55 }}>
                            <strong>{offlineDeviceLabel}</strong>{' '}
                            {offlineDeviceLabel.includes('and') ? 'are' : 'is'} <strong>offline</strong>.
                            Sync cannot start until both the Worker PC and Biometric Device are reachable.
                        </Typography>
                    </Box>
                )}

                <Box sx={{
                    mt: 2, p: 1.2, borderRadius: '7px',
                    bgcolor: '#FEF3C7', border: '1px solid #BAE6FD',
                    display: 'flex', alignItems: 'flex-start', gap: 1,
                }}>
                    <ErrorOutlineIcon sx={{ fontSize: 16, color: '#0EA5E9', mt: 0.2, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 10.5, color: '#92400E', lineHeight: 1.55 }}>
                        After triggering, the sync runs for up to <strong>1.5 minutes</strong>.
                        You'll be blocked from leaving the page during that time.
                        Cooldown of <strong>5 minutes</strong> between triggers.
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button
                    onClick={() => setManualSyncOpen(false)}
                    disabled={isTriggering}
                    sx={{
                        textTransform: 'none', borderRadius: '7px',
                        color: '#374151', fontSize: 12.5, fontWeight: 600,
                        border: '1px solid #E5E7EB', px: 2, height: 36,
                        '&:hover': { bgcolor: '#F9FAFB' },
                    }}
                >
                    Cancel
                </Button>
                <Tooltip
                    arrow
                    title={!devicesOnline
                        ? `${offlineDeviceLabel} is offline`
                        : inCooldown ? `Cooldown — try again in ${formatHHMMSS(cooldownLeftSec)}`
                        : ''}
                >
                    <Box sx={{ display: 'inline-flex' }}>
                        <Button
                            onClick={handleTriggerManualSync}
                            disabled={isTriggering || !manualSyncDate || inCooldown || !devicesOnline}
                            startIcon={
                                isTriggering
                                    ? <CircularProgress size={14} sx={{ color: '#fff' }} />
                                    : !devicesOnline
                                        ? <WifiOffIcon sx={{ fontSize: 16 }} />
                                        : <CloudSyncIcon sx={{ fontSize: 16 }} />
                            }
                            sx={{
                                textTransform: 'none', borderRadius: '7px',
                                bgcolor: '#4338CA', color: '#fff',
                                fontSize: 13, fontWeight: 700, px: 2.5, height: 36,
                                boxShadow: '0 4px 12px rgba(67,56,202,0.35)',
                                '&:hover': { bgcolor: '#3730A3', boxShadow: '0 6px 16px rgba(67,56,202,0.5)' },
                                '&.Mui-disabled': { bgcolor: '#C7D2FE', color: '#fff', boxShadow: 'none' },
                            }}
                        >
                            {isTriggering
                                ? 'Starting…'
                                : !devicesOnline
                                    ? 'Device Offline'
                                    : 'Start Sync'}
                        </Button>
                    </Box>
                </Tooltip>
            </DialogActions>
        </Dialog>
    );

    // ─── Blocking Sync Overlay (Backdrop) ──────────────────────────────────
    const renderSyncOverlay = () => {
        const safetyPct = Math.min(100, (elapsedSec / 90) * 100);
        return (
            <Backdrop
                open={isSyncing}
                sx={{
                    zIndex: (t) => t.zIndex.modal + 1,
                    bgcolor: 'rgba(15,23,42,0.7)',
                    backdropFilter: 'blur(4px)',
                }}
            >
                <Box sx={{
                    width: { xs: '90%', sm: 420 },
                    bgcolor: '#fff', borderRadius: '16px',
                    p: 3, textAlign: 'center',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
                }}>
                    {/* Pulsing icon */}
                    <Box sx={{
                        width: 72, height: 72, borderRadius: '50%', mx: 'auto', mb: 1.5,
                        bgcolor: '#EEF2FF', border: '2px solid #C7D2FE',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: 'syncPulse 1.6s infinite ease-in-out',
                        '@keyframes syncPulse': {
                            '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(67,56,202,0.4)' },
                            '50%':      { transform: 'scale(1.08)', boxShadow: '0 0 0 14px rgba(67,56,202,0)' },
                        },
                    }}>
                        <CloudSyncIcon sx={{
                            color: '#4338CA', fontSize: 36,
                            animation: 'spin 2s linear infinite',
                            '@keyframes spin': { from: { transform: 'rotate(0)' }, to: { transform: 'rotate(360deg)' } },
                        }} />
                    </Box>
                    <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>
                        Syncing Previous Data from Biometric
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#6B7280', mt: 0.6, lineHeight: 1.55 }}>
                        Fetching punches from <strong>{manualSyncDate}</strong> · Estimated time <strong>~1.5 min</strong>
                        <br />Please do not navigate away or close the page.
                    </Typography>

                    {/* Progress bar (counts toward 1.5 min) */}
                    <Box sx={{ mt: 2.5, mb: 1 }}>
                        <LinearProgress
                            variant="determinate"
                            value={safetyPct}
                            sx={{
                                height: 8, borderRadius: 4, bgcolor: '#EEF2FF',
                                '& .MuiLinearProgress-bar': {
                                    bgcolor: '#4338CA', borderRadius: 4,
                                    transition: 'transform 1s linear',
                                },
                            }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.6 }}>
                            <Typography sx={{ fontSize: 10.5, color: '#6B7280', fontFamily: 'monospace', fontWeight: 700 }}>
                                Elapsed: {formatHHMMSS(elapsedSec)}
                            </Typography>
                            <Typography sx={{ fontSize: 10.5, color: '#6B7280', fontFamily: 'monospace', fontWeight: 700 }}>
                                Max: 01:30
                            </Typography>
                        </Box>
                    </Box>

                    {/* Live status of device while we wait */}
                    <Box sx={{
                        mt: 2, p: 1.2, borderRadius: '7px',
                        bgcolor: '#F9FAFB', border: '1px solid #E5E7EB',
                        display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center',
                    }}>
                        <Box sx={{
                            width: 8, height: 8, borderRadius: '50%',
                            bgcolor: isDeviceReachable ? '#22C55E' : '#DC2626',
                            boxShadow: isDeviceReachable
                                ? '0 0 0 3px rgba(34,197,94,0.2)'
                                : '0 0 0 3px rgba(220,38,38,0.2)',
                        }} />
                        <Typography sx={{ fontSize: 11, color: '#374151', fontWeight: 600 }}>
                            Device {isDeviceReachable ? 'reachable' : 'unreachable'} ·
                            Worker {isWorkerAlive ? 'alive' : 'offline'}
                        </Typography>
                    </Box>
                </Box>
            </Backdrop>
        );
    };

    return (
        <>
            <SnackBar open={snackOpen} color={snackColor} setOpen={setSnackOpen} status={snackStatus} message={snackMessage} />
            <Box sx={{
                border: '1px solid #E5E7EB',
                borderRadius: '20px',
                p: 2,
                height: '86vh',
                overflow: 'hidden',
                bgcolor: '#F9FAFB',
                display: 'flex',
                flexDirection: 'column',
            }}>
                {/* Header */}
                <Box sx={{ flexShrink: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <IconButton onClick={() => navigate(-1)} sx={{ width: 32, height: 32 }}>
                                <ArrowBackIcon sx={{ fontSize: 18, color: '#000' }} />
                            </IconButton>
                            <Box sx={{
                                width: 36, height: 36, borderRadius: '7px',
                                bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <EventIcon sx={{ color: PRIMARY, fontSize: 20 }} />
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: '20px', fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>
                                    Leave & Attendance
                                </Typography>
                                <Typography sx={{ fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>
                                    {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                </Typography>
                            </Box>
                        </Box>
                        {userType !== "teacher" && (
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                {/* Biometric Mapping — opens the staff ↔ device-ID sync page on its own route */}
                                <Button
                                    onClick={() => navigate('biometric-mapping')}
                                    startIcon={<FingerprintIcon />}
                                    variant="outlined"
                                    sx={{
                                        textTransform: 'none', borderRadius: '50px',
                                        bgcolor: '#fff', color: PRIMARY_DARK,
                                        border: `1px solid ${PRIMARY_BORDER}`,
                                        fontSize: '13px', fontWeight: 700, px: 2.2,
                                        boxShadow: 'none',
                                        '&:hover': { bgcolor: PRIMARY_LIGHT, borderColor: PRIMARY, boxShadow: 'none' },
                                    }}
                                >
                                    Biometric Mapping
                                </Button>
                                <Button
                                    onClick={() => setTabValue(1)}
                                    startIcon={<AddIcon />}
                                    variant="contained"
                                    sx={{
                                        textTransform: 'none', borderRadius: '50px',
                                        bgcolor: PRIMARY, color: '#fff',
                                        fontSize: '13px', fontWeight: 700, px: 2.5,
                                        boxShadow: `0 2px 6px ${PRIMARY}33`,
                                        '&:hover': { bgcolor: PRIMARY_DARK, boxShadow: `0 4px 12px ${PRIMARY}55` },
                                    }}
                                >
                                    Mark Attendance
                                </Button>
                            </Box>
                        )}
                    </Box>

                    <Divider sx={{ mb: 1.2 }} />

                    {userType !== "teacher" && (
                        <Box sx={{ borderBottom: '1px solid #E5E7EB', mb: 1.5 }}>
                            <Tabs
                                value={tabValue}
                                onChange={handleTabChange}
                                variant="scrollable"
                                scrollButtons="auto"
                                sx={{
                                    minHeight: 44,
                                    '& .MuiTab-root': {
                                        textTransform: 'none', fontSize: '13px',
                                        fontWeight: 600, color: '#6B7280',
                                        minHeight: 44, px: 2, py: 1,
                                        gap: 0.6,
                                        '& .MuiSvgIcon-root': { fontSize: 18 },
                                    },
                                    '& .Mui-selected': { color: `${PRIMARY_DARK} !important` },
                                    '& .MuiTabs-indicator': {
                                        backgroundColor: PRIMARY, height: 2.5,
                                        borderRadius: '2px 2px 0 0',
                                    },
                                }}
                            >
                                <Tab icon={<SpaceDashboardOutlinedIcon />} iconPosition="start" label="Dashboard" />
                                <Tab icon={<HowToRegOutlinedIcon />} iconPosition="start" label="Add Attendance" />
                                <Tab icon={<TodayIcon />} iconPosition="start" label="Today's Attendance" />
                                <Tab icon={<VisibilityOutlinedIcon />} iconPosition="start" label="Overview" />
                                <Tab icon={<ListAltOutlinedIcon />} iconPosition="start" label="Leave Management" />
                                <Tab icon={<InsertChartOutlinedIcon />} iconPosition="start" label="Reports" />
                            </Tabs>
                        </Box>
                    )}
                </Box>

                {/* Scrollable content */}
                <Box sx={{
                    flex: 1,
                    overflowY: 'auto',
                    pr: 0.5,
                    '&::-webkit-scrollbar': { width: 5 },
                    '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { bgcolor: '#D1D5DB', borderRadius: 10 },
                }}>
                    {renderTabContent()}
                </Box>
            </Box>

            {renderManualSyncDialog()}
            {renderSyncOverlay()}
        </>
    );
}
