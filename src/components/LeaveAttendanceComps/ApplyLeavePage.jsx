import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
    Box, Grid, Typography, IconButton, Button, Chip, TextField, Select, MenuItem,
    FormControl, InputLabel, CircularProgress, Checkbox, FormControlLabel,
    Drawer, LinearProgress,
} from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import dayjs from 'dayjs';
import http from '../../Api/http';
import { useSelector } from 'react-redux';
import { postLeaveRequest, GetEmployeeLeaveBalance, GetWorkingCalendar, GetLeaveTypes } from '../../Api/Api';
import useFinancialYear from '../../hooks/useFinancialYear';
import SnackBar from '../SnackBar';

const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_DARK = '#6246E0';

// ─── Working Calendar (sourced from Leave Policy Master via GetWorkingcalendar) ─
// Fallback when no record exists yet: Mon–Sat working, Sunday off.
const DEFAULT_WORKING_DOW = [1, 2, 3, 4, 5, 6]; // 0 = Sun, 6 = Sat

// API day-of-week labels match the Working Calendar response.
const WC_DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// { Sun: 'Working' | 'Holiday' | 'Mandatory', ... } → array of working dow indexes.
// Both Working and Mandatory count as working days (Mandatory is just a working
// day that needs prior approval to take leave on).
const parseWeekPattern = (pattern) => {
    if (!pattern || typeof pattern !== 'object') return null;
    const result = [];
    WC_DAY_LABELS.forEach((label, idx) => {
        const v = pattern[label];
        if (v === 'Working' || v === 'Mandatory') result.push(idx);
    });
    return result;
};

const DAY_TYPE_STYLE = {
    working:   { bg: '#EFF5FF', color: '#16A34A', border: '#C9BEFB' },
    holiday:   { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
    mandatory: { bg: '#FFF7ED', color: '#EA580C', border: '#FED7AA' },
};

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatDateForApi = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}-${m}-${y}`;
};

// ─── Per-leave-type rules from Leave Policy Master ─────────────────────────
// TODO: replace with the rules section returned by the leave-types API.
// For now we mirror the policy fields HR sets in Leave Policy Master.
// `maxPerMonth` (0 = no cap) caps how many days of this type can be taken in a single month.
const LEAVE_TYPE_RULES = {
    'Sick Leave':       { blockContinuousLeave: false, requiresDocument: true,  documentHint: 'Upload a medical certificate signed by a registered doctor', maxPerMonth: 3 },
    'Casual Leave':     { blockContinuousLeave: true,  requiresDocument: false, documentHint: '',                                                          maxPerMonth: 0 },
    'Emergency Leave':  { blockContinuousLeave: false, requiresDocument: false, documentHint: '',                                                          maxPerMonth: 0 },
    'Maternity Leave':  { blockContinuousLeave: false, requiresDocument: true,  documentHint: 'Upload medical / hospital documents',                       maxPerMonth: 0 },
    'Paternity Leave':  { blockContinuousLeave: false, requiresDocument: true,  documentHint: 'Upload birth certificate or hospital document',             maxPerMonth: 0 },
    'Annual Leave':     { blockContinuousLeave: false, requiresDocument: false, documentHint: '',                                                          maxPerMonth: 0 },
    'Unpaid Leave':     { blockContinuousLeave: false, requiresDocument: false, documentHint: '',                                                          maxPerMonth: 0 },
};

// Stable colour for each leave type based on its id.
const LEAVE_TYPE_PALETTE = ['#EF4444', '#7C5CFC', '#9B87FB', '#F59E0B', '#9B87FB', '#06B6D4', '#EC4899', '#84CC16'];
const colorForLeaveType = (id) => LEAVE_TYPE_PALETTE[Math.abs(Number(id) || 0) % LEAVE_TYPE_PALETTE.length];

// Cheap short-code: take the first letter of each word (max 3).
const shortCodeFor = (name = '') =>
    name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 3).toUpperCase() || '–';

// Shorten a period label so it fits inside compact grid cells.
//   Quarterly: "Q1 of AY 2026-2027 (Jun 2026-Aug 2026)" → "Q1"
//   Monthly:   "Jun 2026" → "Jun"
//   Yearly:    "AY 2026-2027" → "AY"
const shortenPeriodLabel = (label = '', period = 'Yearly') => {
    if (period === 'Quarterly') {
        const m = label.match(/^Q\d/);
        return m ? m[0] : label.slice(0, 4);
    }
    if (period === 'Monthly') {
        return label.split(' ')[0] || label;
    }
    return label;
};

// One-line period range used as tooltip / sub-label.
const periodSubLabel = (label = '', period = 'Yearly') => {
    if (period === 'Quarterly') {
        const m = label.match(/\(([^)]+)\)/);
        return m ? m[1] : label;
    }
    return label;
};

const STATUS_PILL = {
    current:  { color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA', text: 'Current' },
    past:     { color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', text: 'Past'    },
    lapsed:   { color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', text: 'Lapsed'  },
    upcoming: { color: '#1D4ED8', bg: '#F3F0FE', border: '#C9BEFB', text: 'Upcoming'},
};

const getPeriodStatus = (p) => {
    if (p.lapsed) return 'lapsed';
    if (p.isCurrentPeriod) return 'current';
    if (p.isPastPeriod) return 'past';
    return 'upcoming';
};

// ─── Numbered step header (matches Leave Policy Master pattern) ─────────────
const StepHeader = ({ number, title, hint }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Box sx={{
            width: 26, height: 26, borderRadius: '50%',
            bgcolor: PRIMARY, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, flexShrink: 0,
        }}>
            {number}
        </Box>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#222' }}>
            {title}
        </Typography>
        {hint && (
            <Typography sx={{ fontSize: 11, color: '#888', ml: 0.5 }}>
                — {hint}
            </Typography>
        )}
    </Box>
);

export default function ApplyLeavePage({ onSuccess, onCancel }) {
    const user = useSelector((state) => state.auth);
    const rollNumber = user?.rollNumber;

    // Form state
    const [form, setForm] = useState({
        leaveType: '',
        reason: '',
        remarks: '',
        contact: '',
        emergencyContact: '',
        isHalfDay: false,
    });
    const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    // Calendar picker state
    const [pickerMonth, setPickerMonth] = useState(() => dayjs().startOf('month'));
    const [selectedStart, setSelectedStart] = useState(null);
    const [selectedEnd, setSelectedEnd] = useState(null);
    const [mandatoryAck, setMandatoryAck] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState([]);

    // Leave type rules from the API (hydrated by an effect lower in the file).
    // Declared here so `activeRules` below can safely read it during the same render.
    //   key   = leaveTypeName
    //   value = { blockContinuousLeave, requiresDocument, documentHint, maxPerMonth }
    const [leaveTypeRules, setLeaveTypeRules] = useState({});

    // Active policy rules for the chosen leave type — API first, hardcoded
    // hints as fallback so the document upload-hint text stays helpful.
    const activeRules = useMemo(() => {
        const apiRule = leaveTypeRules[form.leaveType];
        const local  = LEAVE_TYPE_RULES[form.leaveType];
        if (apiRule) {
            return {
                ...apiRule,
                // Keep our richer document hint copy when the API doesn't supply one.
                documentHint: apiRule.documentHint || local?.documentHint || '',
            };
        }
        return local || {
            blockContinuousLeave: false,
            requiresDocument: false,
            documentHint: '',
            maxPerMonth: 0,
        };
    }, [leaveTypeRules, form.leaveType]);

    const today = useMemo(() => dayjs().startOf('day'), []);
    const maxPickerMonth = useMemo(() => today.startOf('month').add(11, 'month'), [today]);
    const canPickerPrev = pickerMonth.isAfter(today.startOf('month'), 'month');
    const canPickerNext = pickerMonth.isBefore(maxPickerMonth, 'month');

    // ─── Working Calendar state (sourced from GetWorkingcalendar) ──────────
    // Keyed by YYYY-MM so each month can carry its own weekPattern + overrides.
    //   workingDow[YYYY-MM] = [0..6]           — which DOW are working that month
    //   holidays[YYYY-MM]   = Set<YYYY-MM-DD>  — explicit holiday override dates
    //   mandatory[YYYY-MM]  = Set<YYYY-MM-DD>  — explicit mandatory override dates
    // `loadedMonthsRef` is a ref (not state) so we can guard re-fetches without
    // triggering renders or having to add ourselves to the effect dep array.
    const [workingCalendar, setWorkingCalendar] = useState({
        workingDow: {},
        holidays:   {},
        mandatory:  {},
    });
    const [isCalendarLoading, setIsCalendarLoading] = useState(false);
    const loadedMonthsRef = useRef(new Set());

    // Leave balance drawer
    const [balanceOpen, setBalanceOpen] = useState(false);
    const [balanceLoading, setBalanceLoading] = useState(false);
    const [balanceTypes, setBalanceTypes] = useState([]);
    const [balanceAsOf, setBalanceAsOf] = useState(dayjs().format('D MMM YYYY'));
    const financialYear = useFinancialYear();

    // Fetch the logged-in user's leave balance for the current academic year.
    // API returns `leaves[]` — each leave has top-level `remaining` plus a
    // `perPeriod` block with `allocationPeriod` (Quarterly/Monthly/Yearly) and
    // a `data[]` array breaking the year into periods. We derive allocated/used
    // by summing across the periods so the UI can show both yearly totals
    // and the per-period breakdown.
    const fetchLeaveBalance = async () => {
        if (!rollNumber) return;
        setBalanceLoading(true);
        try {
            const res = await http.get(GetEmployeeLeaveBalance, {
                params: { financialYear, rollNumber },
            });
            if (res?.data?.error) {
                setBalanceTypes([]);
                return;
            }
            // API has shipped under two field names — tolerate both so we
            // don't silently render an empty drawer when the contract shifts.
            const list = Array.isArray(res?.data?.data)
                ? res.data.data
                : Array.isArray(res?.data?.leaves)
                    ? res.data.leaves
                    : [];
            setBalanceTypes(list.map(d => {
                const periods = (d.perPeriod?.data || []).map(p => ({
                    index: p.index,
                    label: p.label || '',
                    cap: Number(p.cap) || 0,
                    approved: Number(p.approved) || 0,
                    pending: Number(p.pending) || 0,
                    remaining: Number(p.remaining) || 0,
                    isCurrentPeriod: !!p.isCurrentPeriod,
                    isPastPeriod: !!p.isPastPeriod,
                    lapsed: !!p.lapsed,
                }));
                const allocated = periods.reduce((s, p) => s + p.cap, 0);
                const approved  = periods.reduce((s, p) => s + p.approved, 0);
                const pending   = periods.reduce((s, p) => s + p.pending, 0);
                // "Used" reflects fully-consumed (approved) days. Pending sits
                // separately so the UI can surface it without misleading the user.
                const used = approved;
                // Total remaining across all periods (sum of per-period remaining)
                // — NOT the API's top-level `remaining` which only reflects the
                // current/active period and would make the card-level math wrong.
                const remaining = periods.length > 0
                    ? periods.reduce((s, p) => s + p.remaining, 0)
                    : (Number(d.remaining) || 0);
                const currentPeriod = periods.find(p => p.isCurrentPeriod) || null;
                return {
                    id: d.id,
                    leaveTypeId: d.leaveTypeId,
                    name: d.leaveTypeName || 'Leave',
                    shortCode: shortCodeFor(d.leaveTypeName),
                    color: colorForLeaveType(d.leaveTypeId),
                    financialYear: d.financialYear || d.academicYear,
                    allocationPeriod: d.allocationPeriod || d.perPeriod?.allocationPeriod || 'Yearly',
                    perPeriodCap: Number(d.perPeriod?.cap) || 0,
                    periods,
                    allocated,
                    used,
                    pending,
                    remaining,
                    currentPeriod,
                };
            }));
            setBalanceAsOf(dayjs().format('D MMM YYYY'));
        } catch (err) {
            console.error('GetEmployeeLeaveBalance failed:', err);
            setBalanceTypes([]);
        } finally {
            setBalanceLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaveBalance();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rollNumber, financialYear]);

    // ─── Leave Type Rules fetch (hydrates the state declared above) ───────
    // GET /GetleaveTypes?academicYear=<year>
    //   blockContinuousLeave — when true, off-days INSIDE the chosen range also
    //                          count as leave days. Drives the duration math
    //                          (Fri→Mon over a Sat/Sun off calendar = 4 days).
    //   requiresDocument     — force a supporting-document upload
    //   maxPerMonth          — per-month cap (0 = no cap)
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await http.get(GetLeaveTypes, {
                    params: { financialYear },
                });
                if (cancelled) return;
                if (res?.data?.error) {
                    setLeaveTypeRules({});
                    return;
                }
                const items = res?.data?.data?.items
                    || res?.data?.data
                    || res?.data?.items
                    || [];
                const map = {};
                items.forEach(lt => {
                    if (!lt?.name) return;
                    map[lt.name] = {
                        blockContinuousLeave:  !!lt.BlockContinuousLeave,
                        requiresDocument:      !!lt.requireSupportingDocument,
                        documentHint:          '',
                        maxPerMonth:           Number(lt.maxDaysPerMonth) || 0,
                    };
                });
                setLeaveTypeRules(map);
            } catch (err) {
                console.error('GetleaveTypes failed:', err);
                if (!cancelled) setLeaveTypeRules({});
            }
        })();
        return () => { cancelled = true; };
    }, [financialYear]);

    // Hardcoded "Others (Loss of Pay)" — always available as a fallback when an
    // employee has exhausted their allocated balance but still needs to take leave.
    // Marked unpaid so the backend can deduct salary accordingly.
    const LOSS_OF_PAY_OPTION = {
        value: 'Loss of Pay',
        label: 'Others',
        sublabel: 'Loss of Pay',
        leaveTypeId: null,
        remaining: null,
        allocated: null,
        color: '#6B7280',
        isUnpaid: true,
    };

    // Dropdown options = allocated types from API balance + "Others (LOP)" always last.
    const leaveTypeOptions = useMemo(() => {
        const fromApi = balanceTypes.map(t => ({
            value: t.name,
            label: t.name,
            sublabel: `${t.remaining} of ${t.allocated} left`,
            leaveTypeId: t.leaveTypeId,
            remaining: t.remaining,
            allocated: t.allocated,
            color: t.color,
            isUnpaid: false,
        }));
        return [...fromApi, LOSS_OF_PAY_OPTION];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [balanceTypes]);

    const selectedLeaveOption = useMemo(
        () => leaveTypeOptions.find(o => o.value === form.leaveType) || null,
        [leaveTypeOptions, form.leaveType]
    );

    // SnackBar
    const [snackOpen, setSnackOpen] = useState(false);
    const [snackStatus, setSnackStatus] = useState(false);
    const [snackColor, setSnackColor] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const showSnack = (msg, success) => {
        setSnackMessage(msg); setSnackOpen(true);
        setSnackColor(success); setSnackStatus(success);
    };

    // Reset everything (used by Reset and after successful submit)
    const resetAll = () => {
        setForm({
            leaveType: '', reason: '', remarks: '',
            contact: '', emergencyContact: '', isHalfDay: false,
        });
        setSelectedStart(null);
        setSelectedEnd(null);
        setMandatoryAck(false);
        setUploadedFiles([]);
        setPickerMonth(dayjs().startOf('month'));
    };

    // ─── Working Calendar fetcher ──────────────────────────────────────────
    // GET /GetWorkingcalendar?academicYear=YYYY-YYYY&year=YYYY&month=M
    // Response: { error, data: { weekPattern: { Sun:'Working'|... }, overrides: [{ dayDate, dayType }] } }
    // We cache by YYYY-MM in a ref so navigating back to the same month never
    // refetches.  Missing records (404 / { error: true }) fall back to the
    // default Mon-Sat working week.
    const fetchWorkingCalendar = useCallback(async (month) => {
        const key = month.format('YYYY-MM');
        if (loadedMonthsRef.current.has(key)) return;
        // Optimistically mark loaded so concurrent picker clicks don't double-fetch.
        loadedMonthsRef.current.add(key);
        setIsCalendarLoading(true);
        try {
            // Only the month is sent — the server resolves the financial year.
            const res = await http.get(GetWorkingCalendar, {
                params: { year: month.year(), month: month.month() + 1 },
            });
            const d = res?.data?.data;
            const hasRecord = res?.data?.error === false && d && (
                (d.weekPattern && Object.keys(d.weekPattern).length > 0) ||
                (Array.isArray(d.overrides) && d.overrides.length > 0)
            );
            setWorkingCalendar(prev => {
                const next = {
                    workingDow: { ...prev.workingDow },
                    holidays:   { ...prev.holidays },
                    mandatory:  { ...prev.mandatory },
                };
                if (hasRecord) {
                    const parsed = parseWeekPattern(d.weekPattern);
                    next.workingDow[key] = parsed && parsed.length > 0 ? parsed : DEFAULT_WORKING_DOW;
                    const hols = new Set();
                    const mand = new Set();
                    (d.overrides || []).forEach(o => {
                        if (!o.dayDate) return;
                        if (o.dayType === 'Holiday')   hols.add(o.dayDate);
                        if (o.dayType === 'Mandatory') mand.add(o.dayDate);
                        // 'Working' overrides override a default holiday DOW — we
                        // simply add them as mandatory-free working days by
                        // *not* placing them in either set (the dow check
                        // alone won't catch them, but `Working` overrides on
                        // a weekend are rare and handled below).
                        if (o.dayType === 'Working') {
                            hols.delete(o.dayDate);
                            mand.delete(o.dayDate);
                        }
                    });
                    next.holidays[key]  = hols;
                    next.mandatory[key] = mand;
                } else {
                    // No record yet — fall back to defaults for this month.
                    next.workingDow[key] = DEFAULT_WORKING_DOW;
                    next.holidays[key]   = new Set();
                    next.mandatory[key]  = new Set();
                }
                return next;
            });
        } catch (err) {
            // Allow retry on real network errors (404 is treated as "no record"
            // by the catch path too — there's no penalty to retrying).
            if (err?.response?.status !== 404) {
                loadedMonthsRef.current.delete(key);
            } else {
                // 404 — no record yet for this month. Seed defaults so getDayType
                // doesn't keep waiting on an empty entry.
                setWorkingCalendar(prev => ({
                    workingDow: { ...prev.workingDow, [key]: DEFAULT_WORKING_DOW },
                    holidays:   { ...prev.holidays,   [key]: new Set() },
                    mandatory:  { ...prev.mandatory,  [key]: new Set() },
                }));
            }
        } finally {
            setIsCalendarLoading(false);
        }
    }, [financialYear]);

    // Resolve a date's working/holiday/mandatory type from the cached calendar.
    // Falls back to the default Mon-Sat working week when the month hasn't
    // loaded yet, so the picker remains usable while the request is in flight.
    // Working-day "Working" override on a default-holiday DOW: we surface it as
    // mandatory so it shows up as a non-default working day in the legend.
    const getDayType = useCallback((date) => {
        const monthKey = date.format('YYYY-MM');
        const dateKey  = date.format('YYYY-MM-DD');
        const mandSet  = workingCalendar.mandatory[monthKey];
        const holSet   = workingCalendar.holidays[monthKey];
        const dow      = workingCalendar.workingDow[monthKey] || DEFAULT_WORKING_DOW;

        if (mandSet && mandSet.has(dateKey)) return 'mandatory';
        if (holSet && holSet.has(dateKey))   return 'holiday';
        return dow.includes(date.day()) ? 'working' : 'holiday';
    }, [workingCalendar]);

    // Fetch the visible month plus next month (so navigating right feels instant).
    useEffect(() => {
        fetchWorkingCalendar(pickerMonth);
        const nextMonth = pickerMonth.add(1, 'month');
        // `isSameOrBefore` is a dayjs plugin and isn't loaded — invert isAfter instead.
        if (!nextMonth.isAfter(maxPickerMonth, 'month')) {
            fetchWorkingCalendar(nextMonth);
        }
    }, [pickerMonth, fetchWorkingCalendar, maxPickerMonth]);

    // ── Monthly-cap check ──────────────────────────────────────────────────
    // For policies with maxPerMonth > 0, count working+mandatory days per calendar
    // month inside the selection. Any month exceeding the cap is a violation.
    const monthlyCapCheck = useMemo(() => {
        const cap = Number(activeRules.maxPerMonth) || 0;
        if (!cap || !selectedStart) return null;
        const end = selectedEnd || selectedStart;
        const totalDays = end.diff(selectedStart, 'day') + 1;
        const perMonth = {};
        for (let i = 0; i < totalDays; i++) {
            const d = selectedStart.add(i, 'day');
            const t = getDayType(d);
            if (t === 'working' || t === 'mandatory') {
                const key = d.format('YYYY-MM');
                perMonth[key] = (perMonth[key] || 0) + 1;
            }
        }
        const offenders = Object.entries(perMonth)
            .filter(([, n]) => n > cap)
            .map(([k, n]) => ({ month: k, monthLabel: dayjs(k + '-01').format('MMMM YYYY'), used: n, cap }));
        return { ok: offenders.length === 0, cap, offenders };
    }, [activeRules.maxPerMonth, selectedStart, selectedEnd, getDayType]);

    // ── Document upload handlers ──────────────────────────────────────────
    const MAX_FILE_MB = 5;
    const ACCEPTED_FILE_TYPES = '.pdf,.png,.jpg,.jpeg';

    const handleFilesAdded = (fileList) => {
        const incoming = Array.from(fileList || []);
        const valid = [];
        for (const f of incoming) {
            if (f.size > MAX_FILE_MB * 1024 * 1024) {
                showSnack(`"${f.name}" exceeds the ${MAX_FILE_MB} MB limit.`, false);
                continue;
            }
            valid.push({
                id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
                file: f,
                name: f.name,
                size: f.size,
                type: f.type,
            });
        }
        if (valid.length) setUploadedFiles(prev => [...prev, ...valid]);
    };

    const handleRemoveFile = (id) => {
        setUploadedFiles(prev => prev.filter(f => f.id !== id));
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    // Click handler for calendar cells
    const handleDayClick = (date) => {
        if (date.isBefore(today, 'day')) return;
        if (getDayType(date) === 'holiday') return;

        // Half-day mode: lock selection to a single day. Each click replaces
        // the previous pick — no range, no end-date — so the user can't
        // accidentally apply for multiple half-days in one go.
        if (form.isHalfDay) {
            setSelectedStart(date);
            setSelectedEnd(date);
            setMandatoryAck(false);
            return;
        }

        if (!selectedStart || (selectedStart && selectedEnd)) {
            setSelectedStart(date);
            setSelectedEnd(null);
            setMandatoryAck(false);
        } else if (date.isSame(selectedStart, 'day')) {
            setSelectedEnd(date);
        } else if (date.isBefore(selectedStart, 'day')) {
            setSelectedEnd(selectedStart);
            setSelectedStart(date);
        } else {
            setSelectedEnd(date);
        }
    };

    const handleResetSelection = () => {
        setSelectedStart(null);
        setSelectedEnd(null);
        setMandatoryAck(false);
    };

    // Compute breakdown of working / mandatory / holiday days in the selection
    const rangeBreakdown = useMemo(() => {
        if (!selectedStart) return null;
        const end = selectedEnd || selectedStart;
        const totalDays = end.diff(selectedStart, 'day') + 1;
        let working = 0, mandatory = 0, holiday = 0;
        const mandatoryDates = [];
        const holidayDates = [];
        for (let i = 0; i < totalDays; i++) {
            const d = selectedStart.add(i, 'day');
            const t = getDayType(d);
            if (t === 'working') working++;
            else if (t === 'mandatory') { mandatory++; mandatoryDates.push(d); }
            else { holiday++; holidayDates.push(d); }
        }
        // When the leave type has BlockContinuousLeave=true, off-days INSIDE
        // the selected range are *also* counted toward leave (treated as
        // continuous leave so users can't game weekends/holidays into a
        // shorter deduction).
        // Example: Fri → Mon on a Sat/Sun-off calendar:
        //   • BlockContinuousLeave=false → leaveDays = 2 (Fri + Mon)
        //   • BlockContinuousLeave=true  → leaveDays = 4 (Fri + Sat + Sun + Mon)
        const continuousMode = !!activeRules?.blockContinuousLeave;
        const leaveDays = continuousMode
            ? totalDays
            : working + mandatory;
        return {
            totalDays, working, mandatory, holiday, mandatoryDates, holidayDates,
            leaveDays,
            continuousMode,
        };
    }, [selectedStart, selectedEnd, getDayType, activeRules?.blockContinuousLeave]);

    // Balance check — leaveDays selected must not exceed remaining for paid
    // leave types. "Others (Loss of Pay)" always passes.
    const balanceCheck = useMemo(() => {
        if (!selectedLeaveOption || selectedLeaveOption.isUnpaid) return null;
        if (!rangeBreakdown) return null;
        const requested = rangeBreakdown.leaveDays;
        const remaining = selectedLeaveOption.remaining;
        return {
            ok: requested <= remaining,
            requested,
            remaining,
            shortfall: Math.max(0, requested - remaining),
        };
    }, [selectedLeaveOption, rangeBreakdown]);

    const isPickerDayInRange = (date) => {
        if (!selectedStart) return false;
        const end = selectedEnd || selectedStart;
        return (date.isAfter(selectedStart, 'day') && date.isBefore(end, 'day'));
    };

    const isPickerDayEdge = (date) => {
        if (!selectedStart) return false;
        if (date.isSame(selectedStart, 'day')) return 'start';
        if (selectedEnd && date.isSame(selectedEnd, 'day')) return 'end';
        return false;
    };

    // Cheap E.164-lite check: digits only (allow spaces, +, -), 10–15 digits.
    const isValidPhone = (raw = '') => {
        const digits = String(raw).replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 15;
    };

    const handleSubmit = async () => {
        if (!form.leaveType || !selectedStart || !form.reason.trim()) {
            showSnack('Please fill all required fields', false);
            return;
        }
        if (!form.contact.trim() || !isValidPhone(form.contact)) {
            showSnack('Please enter a valid contact number (10-15 digits).', false);
            return;
        }
        if (form.emergencyContact.trim() && !isValidPhone(form.emergencyContact)) {
            showSnack('Emergency contact number is not valid.', false);
            return;
        }
        if (rangeBreakdown && rangeBreakdown.leaveDays === 0) {
            showSnack('Selected range has no working days — leave does not need to be applied.', false);
            return;
        }
        if (form.isHalfDay) {
            // Calendar already enforces this, but double-check before posting.
            if (selectedEnd && !selectedEnd.isSame(selectedStart, 'day')) {
                showSnack('Half-day leave must be on a single day.', false);
                return;
            }
            if (rangeBreakdown && rangeBreakdown.leaveDays > 1) {
                showSnack('Half-day leave must be on a single day.', false);
                return;
            }
        }
        if (rangeBreakdown && rangeBreakdown.mandatory > 0 && !mandatoryAck) {
            showSnack(`Your leave includes ${rangeBreakdown.mandatory} Mandatory Working Day(s). Please confirm prior approval.`, false);
            return;
        }
        if (monthlyCapCheck && !monthlyCapCheck.ok) {
            const first = monthlyCapCheck.offenders[0];
            showSnack(`${form.leaveType} is capped at ${monthlyCapCheck.cap} day(s) per month. ${first.monthLabel} would have ${first.used}.`, false);
            return;
        }
        if (activeRules.requiresDocument && uploadedFiles.length === 0) {
            showSnack(`${form.leaveType} requires a supporting document. Please upload at least one file.`, false);
            return;
        }
        if (balanceCheck && !balanceCheck.ok) {
            showSnack(
                `Only ${balanceCheck.remaining} day(s) of ${form.leaveType} remaining. Reduce the range or pick "Others (Loss of Pay)".`,
                false
            );
            return;
        }

        const startStr = selectedStart.format('YYYY-MM-DD');
        const endStr = form.isHalfDay
            ? startStr
            : (selectedEnd || selectedStart).format('YYYY-MM-DD');

        // ─── Build multipart/form-data exactly per API contract ───────────
        const fd = new FormData();
        // Force the canonical "Loss of Pay" label whenever the user picked the
        // hard-coded "Others (Loss of Pay)" option, regardless of what the form
        // field happens to hold locally.
        const leaveTypeForApi = selectedLeaveOption?.isUnpaid
            ? 'Loss of Pay'
            : form.leaveType;

        fd.append('ForRollNumber',    String(rollNumber || ''));
        fd.append('AcademicYear',     financialYear);   // legacy field name; value is the financial year
        fd.append('LeaveTypeId',      String(selectedLeaveOption?.leaveTypeId ?? ''));
        fd.append('LeaveType',        leaveTypeForApi);
        fd.append('FromDate',         formatDateForApi(startStr));   // DD-MM-YYYY
        fd.append('ToDate',           formatDateForApi(endStr));     // DD-MM-YYYY
        fd.append('IsHalfDay',        form.isHalfDay ? 'true' : 'false');
        fd.append('Reason',           form.reason.trim());
        fd.append('Contact',          form.contact.trim());
        fd.append('EmergencyContact', form.emergencyContact.trim());
        fd.append('Remarks',          form.remarks.trim());
        // Optional file — only the first uploaded document is sent. Add more
        // appends here if/when the backend accepts multiple files.
        if (uploadedFiles.length > 0 && uploadedFiles[0].file) {
            fd.append('SupportingDocumentFile', uploadedFiles[0].file, uploadedFiles[0].name);
        }

        setIsSubmitting(true);
        try {
            await http.post(postLeaveRequest, fd, {
                headers: {
                    // Let axios set the multipart boundary itself.
                    'Content-Type': 'multipart/form-data',
                },
            });
            showSnack('Leave application submitted successfully', true);
            resetAll();
            // small delay so user sees the success snack before navigating
            setTimeout(() => onSuccess?.(), 800);
        } catch (err) {
            console.error('Submit leave failed', err);
            const msg = err?.response?.data?.message || 'Failed to submit leave. Please try again.';
            showSnack(msg, false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitBlockerReason = (() => {
        if (isSubmitting) return '';
        if (!form.leaveType) return 'Select a leave type to continue.';
        if (!selectedStart) return 'Pick at least a start date from the calendar.';
        if (!form.reason.trim()) return 'Enter a reason for your leave.';
        if (!form.contact.trim()) return 'Enter your contact number.';
        if (!isValidPhone(form.contact)) return 'Contact number must be 10–15 digits.';
        if (form.emergencyContact.trim() && !isValidPhone(form.emergencyContact)) return 'Emergency contact must be 10–15 digits (or leave it blank).';
        if (rangeBreakdown && rangeBreakdown.leaveDays === 0) return 'Selected range has no working days — pick a working day.';
        if (form.isHalfDay && selectedEnd && !selectedEnd.isSame(selectedStart, 'day')) return 'Half-day leave must be on a single day.';
        if (rangeBreakdown && rangeBreakdown.mandatory > 0 && !mandatoryAck) return `Confirm prior approval for ${rangeBreakdown.mandatory} mandatory working day(s).`;
        if (monthlyCapCheck && !monthlyCapCheck.ok) return `${form.leaveType} exceeds the monthly cap of ${monthlyCapCheck.cap} day(s).`;
        if (activeRules.requiresDocument && uploadedFiles.length === 0) return `${form.leaveType} requires a supporting document.`;
        if (balanceCheck && !balanceCheck.ok) return `Only ${balanceCheck.remaining} day(s) of ${form.leaveType} remaining.`;
        return '';
    })();

    const submitDisabled = isSubmitting || submitBlockerReason !== '';

    return (
        <>
            <SnackBar open={snackOpen} color={snackColor} setOpen={setSnackOpen} status={snackStatus} message={snackMessage} />

            <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
                {/* ─── Top action bar — Leave Balance trigger ─── */}
                <Box sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    mb: 1.2, flexWrap: 'wrap', gap: 1,
                }}>
                    <Typography sx={{ fontSize: 11, color: '#9CA3AF' }}>
                        Need to know how many days you've got left?
                    </Typography>
                    <Button
                        variant="outlined"
                        startIcon={<EventAvailableIcon sx={{ fontSize: 16 }} />}
                        onClick={() => setBalanceOpen(true)}
                        sx={{
                            textTransform: 'none',
                            fontSize: 12,
                            fontWeight: 700,
                            color: PRIMARY_DARK,
                            bgcolor: '#fff',
                            borderColor: '#C9BEFB',
                            borderRadius: '7px',
                            px: 2,
                            height: 32,
                            '&:hover': {
                                bgcolor: PRIMARY_LIGHT,
                                borderColor: PRIMARY,
                            },
                        }}
                    >
                        My Leave Balance
                    </Button>
                </Box>

                {/* ─── Two-column body ─── */}
                <Grid container spacing={1.5} alignItems="stretch">
                    {/* ── LEFT: form fields ── */}
                    <Grid size={{ xs: 12, md: 5 }} sx={{ display: 'flex', flexDirection: 'column' }}>
                        {/* Leave Details card */}
                        <Box sx={{ p: 2, mb: 1.5, borderRadius: '7px', bgcolor: '#fff', border: '1px solid #E5E7EB' }}>
                            <StepHeader number={1} title="Leave Details" />
                            <FormControl fullWidth required size="small" sx={{ mb: 1.5 }}>
                                <InputLabel sx={{ fontSize: 13 }}>Leave Type</InputLabel>
                                <Select
                                    value={form.leaveType}
                                    onChange={(e) => {
                                        const newType = e.target.value;
                                        updateForm('leaveType', newType);
                                        // Reset documents when switching to a type that doesn't need them.
                                        // Prefer the API-driven rules, fall back to the hardcoded map.
                                        const next = leaveTypeRules[newType] || LEAVE_TYPE_RULES[newType];
                                        if (!next?.requiresDocument) setUploadedFiles([]);
                                    }}
                                    label="Leave Type"
                                    renderValue={(selected) => {
                                        if (!selected) return '';
                                        const opt = leaveTypeOptions.find(o => o.value === selected);
                                        return opt ? (opt.isUnpaid ? `${opt.label} (Loss of Pay)` : opt.label) : selected;
                                    }}
                                    sx={{
                                        fontSize: 13,
                                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E5E7EB' },
                                    }}
                                >
                                    {balanceLoading && (
                                        <MenuItem disabled value="">
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <CircularProgress size={14} sx={{ color: PRIMARY }} />
                                                <Typography sx={{ fontSize: 12, color: '#6B7280' }}>
                                                    Loading your leave balance...
                                                </Typography>
                                            </Box>
                                        </MenuItem>
                                    )}
                                    {leaveTypeOptions.map(opt => {
                                        const exhausted = !opt.isUnpaid && opt.remaining === 0;
                                        return (
                                            <MenuItem
                                                key={opt.value}
                                                value={opt.value}
                                                disabled={exhausted}
                                                sx={{
                                                    py: 0.8, px: 1.4,
                                                    '&.Mui-disabled': { opacity: 0.55 },
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                                                    <Box sx={{
                                                        width: 9, height: 9, borderRadius: '50%',
                                                        bgcolor: opt.color, flexShrink: 0,
                                                    }} />
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#111', lineHeight: 1.2 }} noWrap>
                                                            {opt.isUnpaid ? `${opt.label} (Loss of Pay)` : opt.label}
                                                        </Typography>
                                                        {!opt.isUnpaid && (
                                                            <Typography sx={{ fontSize: 10, color: '#9CA3AF', mt: 0.1 }} noWrap>
                                                                {opt.sublabel}
                                                            </Typography>
                                                        )}
                                                        {opt.isUnpaid && (
                                                            <Typography sx={{ fontSize: 10, color: '#9CA3AF', mt: 0.1 }} noWrap>
                                                                Use this when balance is exhausted — unpaid
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                    <Chip
                                                        size="small"
                                                        label={
                                                            opt.isUnpaid ? 'LOP'
                                                                : exhausted ? 'Exhausted'
                                                                : `${opt.remaining} left`
                                                        }
                                                        sx={{
                                                            height: 20, fontSize: 10, fontWeight: 800,
                                                            bgcolor: opt.isUnpaid ? '#FEF3C7'
                                                                : exhausted ? '#FEF2F2'
                                                                : `${opt.color}15`,
                                                            color: opt.isUnpaid ? '#B45309'
                                                                : exhausted ? '#DC2626'
                                                                : opt.color,
                                                            border: `1px solid ${
                                                                opt.isUnpaid ? '#BAE6FD'
                                                                : exhausted ? '#FECACA'
                                                                : `${opt.color}40`
                                                            }`,
                                                        }}
                                                    />
                                                </Box>
                                            </MenuItem>
                                        );
                                    })}
                                </Select>
                            </FormControl>

                            {/* Live balance banner — appears after a type is chosen */}
                            {selectedLeaveOption && !selectedLeaveOption.isUnpaid && balanceCheck && !balanceCheck.ok && (
                                <Box sx={{
                                    mb: 1.5, p: 1, borderRadius: '7px',
                                    bgcolor: '#FEF2F2', border: '1px solid #FECACA',
                                    display: 'flex', alignItems: 'flex-start', gap: 0.8,
                                }}>
                                    <WarningAmberIcon sx={{ fontSize: 16, color: '#DC2626', mt: 0.2, flexShrink: 0 }} />
                                    <Box sx={{ flex: 1 }}>
                                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#991B1B', mb: 0.2 }}>
                                            Balance exceeded — short by {balanceCheck.shortfall} day(s)
                                        </Typography>
                                        <Typography sx={{ fontSize: 10, color: '#991B1B', lineHeight: 1.5 }}>
                                            You requested {balanceCheck.requested} day(s) but only {balanceCheck.remaining} of
                                            {' '}{selectedLeaveOption.label} remain. Reduce the range, or pick
                                            {' '}<strong>Others (Loss of Pay)</strong> to continue.
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                            {selectedLeaveOption?.isUnpaid && (
                                <Box sx={{
                                    mb: 1.5, p: 1, borderRadius: '7px',
                                    bgcolor: '#FEF3C7', border: '1px solid #BAE6FD',
                                    display: 'flex', alignItems: 'flex-start', gap: 0.8,
                                }}>
                                    <InfoOutlinedIcon sx={{ fontSize: 14, color: '#B45309', mt: 0.2, flexShrink: 0 }} />
                                    <Typography sx={{ fontSize: 11, color: '#92400E', lineHeight: 1.5 }}>
                                        This leave will be marked as <strong>Loss of Pay</strong> — salary for the leave days
                                        will be deducted. Use this only when your paid balance is exhausted.
                                    </Typography>
                                </Box>
                            )}

                            {/* Continuous-leave info — surfaced as soon as a type is chosen */}
                            {form.leaveType && activeRules?.blockContinuousLeave && (
                                <Box sx={{
                                    mb: 1.5, p: 1, borderRadius: '7px',
                                    bgcolor: '#FFF7ED', border: '1px solid #FED7AA',
                                    display: 'flex', alignItems: 'flex-start', gap: 0.8,
                                }}>
                                    <InfoOutlinedIcon sx={{ fontSize: 14, color: '#C2410C', mt: 0.2, flexShrink: 0 }} />
                                    <Typography sx={{ fontSize: 11, color: '#9A3412', lineHeight: 1.5 }}>
                                        <strong>{form.leaveType}</strong> is treated as <strong>continuous leave</strong>.
                                        Any weekends or holidays that fall inside your selected range will also
                                        count against your balance (or be deducted as LOP if balance is exhausted).
                                    </Typography>
                                </Box>
                            )}

                            {/* Half-Day toggle — sits with the rest of the Leave Details */}
                            <Box sx={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                px: 1.2, py: 0.6, mb: 1.5,
                                borderRadius: '7px',
                                bgcolor: form.isHalfDay ? PRIMARY_LIGHT : '#F9FAFB',
                                border: `1px solid ${form.isHalfDay ? '#C9BEFB' : '#E5E7EB'}`,
                                transition: 'all 0.15s',
                            }}>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: form.isHalfDay ? PRIMARY_DARK : '#374151' }}>
                                        Half-Day Leave
                                    </Typography>
                                    <Typography sx={{ fontSize: 10, color: '#6B7280' }} noWrap>
                                        Apply for a single half-day instead of full day(s).
                                    </Typography>
                                </Box>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={form.isHalfDay}
                                            onChange={(e) => {
                                                const v = e.target.checked;
                                                updateForm('isHalfDay', v);
                                                if (v && selectedStart) {
                                                    // Collapse any multi-day range to the start date so the
                                                    // calendar visually reflects the single-day constraint.
                                                    setSelectedEnd(selectedStart);
                                                    setMandatoryAck(false);
                                                }
                                            }}
                                            sx={{
                                                p: 0.4,
                                                '&.Mui-checked': { color: PRIMARY },
                                            }}
                                        />
                                    }
                                    label=""
                                    sx={{ m: 0 }}
                                />
                            </Box>

                            {/* Live metric tiles — Selected Range + Duration */}
                            <Grid container spacing={1}>
                                <Grid size={{ xs: 7 }}>
                                    <Box sx={{
                                        px: 1.2, py: 0.8,
                                        borderRadius: '7px',
                                        border: '1px solid',
                                        bgcolor: rangeBreakdown ? PRIMARY_LIGHT : '#F9FAFB',
                                        borderColor: rangeBreakdown ? '#C9BEFB' : '#E5E7EB',
                                        height: 52,
                                        display: 'flex', flexDirection: 'column', justifyContent: 'center',
                                    }}>
                                        <Typography sx={{ fontSize: 10, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                            Selected Range
                                        </Typography>
                                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: rangeBreakdown ? PRIMARY_DARK : '#9CA3AF', lineHeight: 1.3, mt: 0.2 }} noWrap>
                                            {selectedStart
                                                ? `${selectedStart.format('D MMM')}${selectedEnd && !selectedEnd.isSame(selectedStart, 'day') ? ` → ${selectedEnd.format('D MMM YYYY')}` : ` ${selectedStart.format('YYYY')}`}`
                                                : 'Not selected'}
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid size={{ xs: 5 }}>
                                    <Box sx={{
                                        px: 1.2, py: 0.8,
                                        borderRadius: '7px',
                                        border: '1px solid',
                                        bgcolor: rangeBreakdown ? PRIMARY : '#F9FAFB',
                                        borderColor: rangeBreakdown ? PRIMARY : '#E5E7EB',
                                        height: 52,
                                        display: 'flex', flexDirection: 'column', justifyContent: 'center',
                                    }}>
                                        <Typography sx={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, color: rangeBreakdown ? '#fff' : '#6B7280' }}>
                                            Duration
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.4, mt: 0.2 }}>
                                            <Typography sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1, color: rangeBreakdown ? '#fff' : '#9CA3AF' }}>
                                                {rangeBreakdown ? rangeBreakdown.leaveDays : 0}
                                            </Typography>
                                            <Typography sx={{ fontSize: 11, fontWeight: 600, color: rangeBreakdown ? '#fff' : '#9CA3AF' }}>
                                                day(s)
                                            </Typography>
                                        </Box>
                                        {rangeBreakdown?.continuousMode && rangeBreakdown.holiday > 0 && (
                                            <Typography sx={{ fontSize: 9, fontWeight: 600, color: '#FED7AA', mt: 0.2, lineHeight: 1.1 }} noWrap>
                                                incl. {rangeBreakdown.holiday} off-day{rangeBreakdown.holiday === 1 ? '' : 's'}
                                            </Typography>
                                        )}
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>

                        {/* Reason + contact card — fills remaining height when no upload card; otherwise stacks naturally */}
                        <Box sx={{
                            p: 2, borderRadius: '7px', bgcolor: '#fff', border: '1px solid #E5E7EB',
                            mb: activeRules.requiresDocument ? 1.5 : 0,
                            flex: activeRules.requiresDocument ? 'none' : 1,
                            display: 'flex', flexDirection: 'column',
                        }}>
                            <StepHeader number={2} title="Reason & Contact" />

                            <TextField
                                fullWidth
                                required
                                multiline
                                minRows={3}
                                placeholder="Briefly describe the reason for your leave request..."
                                value={form.reason}
                                onChange={(e) => updateForm('reason', e.target.value)}
                                label="Reason"
                                size="small"
                                slotProps={{ inputLabel: { shrink: true } }}
                                sx={{
                                    mb: 1.2,
                                    '& .MuiOutlinedInput-root': {
                                        alignItems: 'flex-start',
                                        fontSize: 13,
                                    },
                                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E5E7EB' },
                                    '& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: PRIMARY },
                                }}
                            />

                            <Grid container spacing={1} sx={{ mb: 1.2 }}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    {(() => {
                                        const contactTouched = form.contact.trim().length > 0;
                                        const contactInvalid = contactTouched && !isValidPhone(form.contact);
                                        return (
                                            <TextField
                                                fullWidth
                                                required
                                                size="small"
                                                label="Contact Number"
                                                placeholder="98xxxxxxxx"
                                                value={form.contact}
                                                onChange={(e) => updateForm('contact', e.target.value.replace(/[^\d+\s-]/g, ''))}
                                                error={contactInvalid}
                                                helperText={contactInvalid ? 'Enter a valid 10–15 digit phone number' : ' '}
                                                slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 15 } }}
                                                sx={{
                                                    '& .MuiOutlinedInput-root': { fontSize: 13 },
                                                    '& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: contactInvalid ? undefined : PRIMARY },
                                                    '& .MuiFormHelperText-root': { fontSize: 10.5, ml: 0.5, mt: 0.3, minHeight: 14 },
                                                }}
                                            />
                                        );
                                    })()}
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    {(() => {
                                        const emergencyTouched = form.emergencyContact.trim().length > 0;
                                        const emergencyInvalid = emergencyTouched && !isValidPhone(form.emergencyContact);
                                        return (
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="Emergency Contact"
                                                placeholder="Optional"
                                                value={form.emergencyContact}
                                                onChange={(e) => updateForm('emergencyContact', e.target.value.replace(/[^\d+\s-]/g, ''))}
                                                error={emergencyInvalid}
                                                helperText={emergencyInvalid ? 'Enter a valid 10–15 digit phone number' : ' '}
                                                slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 15 } }}
                                                sx={{
                                                    '& .MuiOutlinedInput-root': { fontSize: 13 },
                                                    '& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: emergencyInvalid ? undefined : PRIMARY },
                                                    '& .MuiFormHelperText-root': { fontSize: 10.5, ml: 0.5, mt: 0.3, minHeight: 14 },
                                                }}
                                            />
                                        );
                                    })()}
                                </Grid>
                            </Grid>

                            <TextField
                                fullWidth
                                size="small"
                                label="Remarks (optional)"
                                placeholder="e.g. Will resume on 24th"
                                value={form.remarks}
                                onChange={(e) => updateForm('remarks', e.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                                sx={{
                                    '& .MuiOutlinedInput-root': { fontSize: 13 },
                                    '& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: PRIMARY },
                                }}
                            />
                        </Box>

                        {/* Documents card — only when leave type requires supporting documents */}
                        {activeRules.requiresDocument && (
                            <Box sx={{
                                p: 2, borderRadius: '7px', bgcolor: '#fff', border: '1px solid #E5E7EB',
                                flex: 1, display: 'flex', flexDirection: 'column',
                            }}>
                                <StepHeader number={3} title="Supporting Documents *" />
                                <Typography sx={{ fontSize: 11, color: '#6B7280', mb: 1, lineHeight: 1.5 }}>
                                    {activeRules.documentHint || 'Upload supporting document(s) for this leave.'}
                                </Typography>

                                {/* Upload drop zone */}
                                <Box
                                    component="label"
                                    htmlFor="leave-doc-upload"
                                    sx={{
                                        display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center',
                                        textAlign: 'center',
                                        py: 1.5, px: 2,
                                        borderRadius: '7px',
                                        border: '1.5px dashed #C7D2FE',
                                        bgcolor: '#F5F7FF',
                                        cursor: 'pointer',
                                        transition: '0.15s',
                                        '&:hover': { bgcolor: '#EEF2FF', borderColor: '#A5B4FC' },
                                    }}
                                >
                                    <input
                                        id="leave-doc-upload"
                                        type="file"
                                        accept={ACCEPTED_FILE_TYPES}
                                        multiple
                                        onChange={(e) => { handleFilesAdded(e.target.files); e.target.value = ''; }}
                                        style={{ display: 'none' }}
                                    />
                                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#4338CA', mb: 0.2 }}>
                                        + Click to upload
                                    </Typography>
                                    <Typography sx={{ fontSize: 10, color: '#6B7280' }}>
                                        PDF, JPG or PNG · up to {MAX_FILE_MB} MB each · multiple allowed
                                    </Typography>
                                </Box>

                                {/* File list */}
                                {uploadedFiles.length > 0 && (
                                    <Box sx={{ mt: 1.2, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                                        {uploadedFiles.map(f => (
                                            <Box key={f.id} sx={{
                                                display: 'flex', alignItems: 'center', gap: 1,
                                                px: 1.2, py: 0.7, borderRadius: '7px',
                                                bgcolor: '#F9FAFB', border: '1px solid #E5E7EB',
                                            }}>
                                                <Box sx={{
                                                    width: 28, height: 28, borderRadius: '7px',
                                                    bgcolor: '#EEF2FF', flexShrink: 0,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <Typography sx={{ fontSize: 9, fontWeight: 800, color: '#4338CA' }}>
                                                        {f.name.split('.').pop()?.slice(0, 4).toUpperCase() || 'FILE'}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#111' }} noWrap>
                                                        {f.name}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: 10, color: '#9CA3AF' }}>
                                                        {formatFileSize(f.size)}
                                                    </Typography>
                                                </Box>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleRemoveFile(f.id)}
                                                    sx={{ width: 24, height: 24, color: '#9CA3AF', '&:hover': { color: '#DC2626', bgcolor: '#FEF2F2' } }}
                                                >
                                                    <CloseIcon sx={{ fontSize: 14 }} />
                                                </IconButton>
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                                {uploadedFiles.length === 0 && (
                                    <Typography sx={{ fontSize: 10, color: '#DC2626', mt: 0.8, fontWeight: 600 }}>
                                        At least one document is required to apply this leave.
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </Grid>

                    {/* ── RIGHT: calendar + summary + ack ── */}
                    <Grid size={{ xs: 12, md: 7 }} sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{
                            p: 2, borderRadius: '7px', bgcolor: '#fff', border: '1px solid #E5E7EB',
                            flex: 1, display: 'flex', flexDirection: 'column',
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <StepHeader number={3} title="Pick Leave Dates" />
                                {selectedStart && (
                                    <Button
                                        size="small"
                                        startIcon={<RestartAltIcon sx={{ fontSize: 14 }} />}
                                        onClick={handleResetSelection}
                                        sx={{ ml: 'auto', mb: 1.5, textTransform: 'none', fontSize: 11, fontWeight: 600, color: '#6B7280', minWidth: 'auto', px: 1, '&:hover': { bgcolor: '#F3F4F6' } }}
                                    >
                                        Reset
                                    </Button>
                                )}
                            </Box>

                            {/* Calendar shell */}
                            <Box sx={{ border: '1px solid #E5E7EB', borderRadius: '7px', overflow: 'hidden', bgcolor: '#fff' }}>
                                {/* Picker header */}
                                <Box sx={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    px: 1, py: 0.6, bgcolor: '#FAFAFA', borderBottom: '1px solid #E5E7EB',
                                    flexWrap: 'wrap', gap: 0.5,
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                        <IconButton size="small" disabled={!canPickerPrev}
                                            onClick={() => canPickerPrev && setPickerMonth(prev => prev.subtract(1, 'month'))}
                                            sx={{ width: 24, height: 24, '&.Mui-disabled': { opacity: 0.3 } }}>
                                            <ChevronLeftIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 110, justifyContent: 'center' }}>
                                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#111' }}>
                                                {pickerMonth.format('MMMM YYYY')}
                                            </Typography>
                                            {isCalendarLoading && (
                                                <CircularProgress size={11} thickness={5} sx={{ color: PRIMARY }} />
                                            )}
                                        </Box>
                                        <IconButton size="small" disabled={!canPickerNext}
                                            onClick={() => canPickerNext && setPickerMonth(prev => prev.add(1, 'month'))}
                                            sx={{ width: 24, height: 24, '&.Mui-disabled': { opacity: 0.3 } }}>
                                            <ChevronRightIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </Box>

                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                        {[
                                            { label: 'Working', ...DAY_TYPE_STYLE.working },
                                            { label: 'Mandatory', ...DAY_TYPE_STYLE.mandatory },
                                            { label: 'Holiday', ...DAY_TYPE_STYLE.holiday },
                                        ].map(s => (
                                            <Box key={s.label} sx={{
                                                display: 'flex', alignItems: 'center', gap: 0.4,
                                                px: 0.8, py: 0.2, borderRadius: '20px',
                                                bgcolor: s.bg, border: `1px solid ${s.border}`,
                                            }}>
                                                <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: s.color }} />
                                                <Typography sx={{ fontSize: 9, fontWeight: 700, color: s.color }}>{s.label}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>

                                {/* Day-of-week headers */}
                                <Grid container>
                                    {DOW_LABELS.map((label, idx) => (
                                        <Grid key={idx} size={{ xs: 12 / 7 }} sx={{
                                            textAlign: 'center', py: 0.5,
                                            bgcolor: '#FAFAFA',
                                            borderBottom: '1px solid #E5E7EB',
                                            borderRight: idx < 6 ? '1px solid #E5E7EB' : 'none',
                                        }}>
                                            <Typography sx={{ fontSize: 10, fontWeight: 700, color: idx === 0 ? '#DC2626' : '#6B7280' }}>
                                                {label}
                                            </Typography>
                                        </Grid>
                                    ))}
                                </Grid>

                                {/* Days */}
                                <Grid container>
                                    {Array.from({ length: pickerMonth.startOf('month').day() }).map((_, i) => (
                                        <Grid key={`off-${i}`} size={{ xs: 12 / 7 }} sx={{
                                            minHeight: 42, bgcolor: '#FAFAFA',
                                            borderBottom: '1px solid #E5E7EB',
                                            borderRight: '1px solid #E5E7EB',
                                        }} />
                                    ))}
                                    {Array.from({ length: pickerMonth.daysInMonth() }).map((_, i) => {
                                        const date = pickerMonth.add(i, 'day');
                                        const type = getDayType(date);
                                        const ts = DAY_TYPE_STYLE[type];
                                        const isPast = date.isBefore(today, 'day');
                                        const isToday = date.isSame(dayjs(), 'day');
                                        const edge = isPickerDayEdge(date);
                                        const inRange = isPickerDayInRange(date);
                                        const disabled = isPast || type === 'holiday';
                                        const cellIndex = (pickerMonth.startOf('month').day() + i) % 7;

                                        let bg = ts.bg;
                                        let textColor = ts.color;
                                        if (edge === 'start' || edge === 'end') {
                                            bg = PRIMARY;
                                            textColor = '#fff';
                                        } else if (inRange) {
                                            bg = '#DBEAFE';
                                            textColor = PRIMARY_DARK;
                                        }
                                        if (isPast && !edge) {
                                            bg = '#F9FAFB';
                                            textColor = '#D1D5DB';
                                        }

                                        return (
                                            <Grid key={date.format('YYYY-MM-DD')} size={{ xs: 12 / 7 }}>
                                                <Box
                                                    onClick={() => !disabled && handleDayClick(date)}
                                                    sx={{
                                                        minHeight: 42,
                                                        position: 'relative',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: disabled ? 'not-allowed' : 'pointer',
                                                        bgcolor: bg,
                                                        opacity: isPast ? 0.55 : 1,
                                                        borderBottom: '1px solid #E5E7EB',
                                                        borderRight: cellIndex < 6 ? '1px solid #E5E7EB' : 'none',
                                                        transition: '0.15s',
                                                        userSelect: 'none',
                                                        '&:hover': disabled ? {} : { filter: 'brightness(0.95)' },
                                                    }}
                                                >
                                                    <Typography sx={{
                                                        fontSize: 12,
                                                        fontWeight: isToday || edge ? 800 : 600,
                                                        color: textColor,
                                                        lineHeight: 1,
                                                    }}>
                                                        {date.date()}
                                                    </Typography>
                                                    {edge && (
                                                        <Typography sx={{ fontSize: 8, fontWeight: 700, color: '#fff', opacity: 0.95, mt: 0.2 }}>
                                                            {edge === 'start' ? 'START' : 'END'}
                                                        </Typography>
                                                    )}
                                                    {!edge && type === 'mandatory' && (
                                                        <Box sx={{
                                                            position: 'absolute', top: 3, right: 3,
                                                            width: 4, height: 4, borderRadius: '50%', bgcolor: '#EA580C',
                                                        }} />
                                                    )}
                                                    {isToday && !edge && (
                                                        <Box sx={{ position: 'absolute', bottom: 2, width: 3, height: 3, borderRadius: '50%', bgcolor: textColor }} />
                                                    )}
                                                </Box>
                                            </Grid>
                                        );
                                    })}
                                </Grid>
                            </Box>

                            {/* Selection summary */}
                            {rangeBreakdown && (
                                <Box sx={{
                                    mt: 1, p: 1, borderRadius: '7px',
                                    bgcolor: PRIMARY_LIGHT, border: '1px solid #C9BEFB',
                                    display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap',
                                }}>
                                    <InfoOutlinedIcon sx={{ fontSize: 14, color: PRIMARY, flexShrink: 0 }} />
                                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: PRIMARY_DARK }}>
                                        {selectedStart.format('D MMM')}
                                        {selectedEnd && !selectedEnd.isSame(selectedStart, 'day') && ` → ${selectedEnd.format('D MMM YYYY')}`}
                                        {(!selectedEnd || selectedEnd.isSame(selectedStart, 'day')) && ` ${selectedStart.format('YYYY')}`}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap', ml: 'auto' }}>
                                        <Chip size="small" label={`${rangeBreakdown.working}W`}
                                            sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: '#fff', color: '#16A34A', border: '1px solid #C9BEFB' }} />
                                        {rangeBreakdown.mandatory > 0 && (
                                            <Chip size="small" label={`${rangeBreakdown.mandatory}M`}
                                                sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: '#fff', color: '#EA580C', border: '1px solid #FED7AA' }} />
                                        )}
                                        {rangeBreakdown.holiday > 0 && (
                                            <Chip size="small" label={`${rangeBreakdown.holiday} off`}
                                                sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: '#fff', color: '#DC2626', border: '1px solid #FECACA' }} />
                                        )}
                                        <Chip size="small" label={`= ${rangeBreakdown.leaveDays} day(s)`}
                                            sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: PRIMARY, color: '#fff' }} />
                                    </Box>
                                </Box>
                            )}

                            {/* Mandatory acknowledgment */}
                            {rangeBreakdown && rangeBreakdown.mandatory > 0 && (
                                <Box sx={{
                                    mt: 1, p: 1, borderRadius: '7px',
                                    bgcolor: '#FFF7ED', border: '1px solid #FED7AA',
                                    display: 'flex', alignItems: 'flex-start', gap: 0.8,
                                }}>
                                    <WarningAmberIcon sx={{ fontSize: 16, color: '#EA580C', mt: 0.2, flexShrink: 0 }} />
                                    <Box sx={{ flex: 1 }}>
                                        <Typography sx={{ fontSize: 11, color: '#9A3412', lineHeight: 1.5 }}>
                                            <strong>{rangeBreakdown.mandatory} Mandatory Working Day{rangeBreakdown.mandatory > 1 ? 's' : ''}</strong> in range ({rangeBreakdown.mandatoryDates.map(d => d.format('D MMM')).join(', ')}). Needs prior approval.
                                        </Typography>
                                        <FormControlLabel
                                            sx={{ ml: 0, mt: 0.2 }}
                                            control={
                                                <Checkbox
                                                    size="small"
                                                    checked={mandatoryAck}
                                                    onChange={(e) => setMandatoryAck(e.target.checked)}
                                                    sx={{ color: '#EA580C', '&.Mui-checked': { color: '#EA580C' }, p: 0.3 }}
                                                />
                                            }
                                            label={
                                                <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#9A3412' }}>
                                                    I have prior approval for these mandatory day(s)
                                                </Typography>
                                            }
                                        />
                                    </Box>
                                </Box>
                            )}

                            {/* Continuous-leave hint (only relevant once a range is picked) */}
                            {activeRules.blockContinuousLeave && !selectedStart && (
                                <Box sx={{
                                    mt: 1, p: 1, borderRadius: '7px',
                                    bgcolor: '#FFF7ED', border: '1px solid #FED7AA',
                                    display: 'flex', alignItems: 'flex-start', gap: 0.8,
                                }}>
                                    <InfoOutlinedIcon sx={{ fontSize: 14, color: '#C2410C', mt: 0.2, flexShrink: 0 }} />
                                    <Typography sx={{ fontSize: 11, color: '#9A3412', lineHeight: 1.5 }}>
                                        <strong>{form.leaveType}</strong> is treated as <strong>continuous leave</strong>.
                                        If your range includes weekends or holidays, those off-days will also be counted
                                        toward your leave balance (e.g. Fri → Mon over a Sat/Sun weekend = 4 days, not 2).
                                    </Typography>
                                </Box>
                            )}

                            {/* Monthly cap rule — info banner before any selection */}
                            {Number(activeRules.maxPerMonth) > 0 && !selectedStart && (
                                <Box sx={{
                                    mt: 1, p: 1, borderRadius: '7px',
                                    bgcolor: '#ECFEFF', border: '1px solid #A5F3FC',
                                    display: 'flex', alignItems: 'flex-start', gap: 0.8,
                                }}>
                                    <InfoOutlinedIcon sx={{ fontSize: 14, color: '#0E7490', mt: 0.2, flexShrink: 0 }} />
                                    <Typography sx={{ fontSize: 11, color: '#155E75', lineHeight: 1.5 }}>
                                        <strong>{form.leaveType}</strong> is capped at <strong>{activeRules.maxPerMonth} day(s) per month</strong>. You can take more across the year, but not more than this in any single month.
                                    </Typography>
                                </Box>
                            )}

                            {/* Continuous-leave: off-day breakdown when the rule
                                actually catches days inside the selection */}
                            {rangeBreakdown?.continuousMode && rangeBreakdown.holiday > 0 && (
                                <Box sx={{
                                    mt: 1, p: 1, borderRadius: '7px',
                                    bgcolor: '#FFF7ED', border: '1px solid #FED7AA',
                                    display: 'flex', alignItems: 'flex-start', gap: 0.8,
                                }}>
                                    <InfoOutlinedIcon sx={{ fontSize: 14, color: '#C2410C', mt: 0.2, flexShrink: 0 }} />
                                    <Box sx={{ flex: 1 }}>
                                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#9A3412', mb: 0.2 }}>
                                            Continuous leave — {rangeBreakdown.holiday} off-day{rangeBreakdown.holiday === 1 ? '' : 's'} will also be counted
                                        </Typography>
                                        <Typography sx={{ fontSize: 10, color: '#9A3412', lineHeight: 1.5 }}>
                                            Your selection has {rangeBreakdown.working} working day{rangeBreakdown.working === 1 ? '' : 's'}
                                            {rangeBreakdown.mandatory > 0 ? ` + ${rangeBreakdown.mandatory} mandatory` : ''}
                                            {' + '}{rangeBreakdown.holiday} off-day{rangeBreakdown.holiday === 1 ? '' : 's'} (weekend / holiday)
                                            {' = '}<strong>{rangeBreakdown.leaveDays} total day{rangeBreakdown.leaveDays === 1 ? '' : 's'}</strong>.
                                            Because <strong>{form.leaveType}</strong> is continuous leave, the off-day{rangeBreakdown.holiday === 1 ? '' : 's'} inside the range
                                            {rangeBreakdown.holiday === 1 ? ' is' : ' are'} also deducted from your balance (or treated as LOP).
                                        </Typography>
                                    </Box>
                                </Box>
                            )}

                            {/* Monthly cap violation — selection exceeds the cap in some month */}
                            {monthlyCapCheck && !monthlyCapCheck.ok && (
                                <Box sx={{
                                    mt: 1, p: 1, borderRadius: '7px',
                                    bgcolor: '#FEF2F2', border: '1px solid #FECACA',
                                    display: 'flex', alignItems: 'flex-start', gap: 0.8,
                                }}>
                                    <WarningAmberIcon sx={{ fontSize: 16, color: '#DC2626', mt: 0.2, flexShrink: 0 }} />
                                    <Box sx={{ flex: 1 }}>
                                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#991B1B', mb: 0.2 }}>
                                            Monthly cap exceeded
                                        </Typography>
                                        <Typography sx={{ fontSize: 10, color: '#991B1B', lineHeight: 1.5 }}>
                                            {monthlyCapCheck.offenders.map(o =>
                                                `${o.monthLabel} would have ${o.used} day(s) — limit is ${o.cap}.`
                                            ).join(' ')}
                                            {' '}Reduce the date range or split this into multiple applications.
                                        </Typography>
                                    </Box>
                                </Box>
                            )}

                            <Typography sx={{ fontSize: 10, color: '#9CA3AF', mt: 'auto', pt: 1 }}>
                                Holidays are not selectable. Past dates are disabled. Browse up to 12 months ahead.
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>

                {/* Action bar */}
                <Box sx={{
                    px: 2, py: 1, mt: 1.5, borderRadius: '7px', bgcolor: '#fff', border: '1px solid #E5E7EB',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1,
                }}>
                    <Typography sx={{
                        fontSize: 11,
                        fontWeight: submitBlockerReason ? 600 : 400,
                        color: submitBlockerReason ? '#B45309' : '#6B7280',
                    }}>
                        {submitBlockerReason
                            ? `⚠ ${submitBlockerReason}`
                            : 'Ready to submit. Your manager will be notified for approval.'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            onClick={onCancel}
                            sx={{
                                textTransform: 'none', fontSize: 13, fontWeight: 600,
                                color: '#374151', borderRadius: '7px',
                                px: 2, height: 36, border: '1px solid #E5E7EB',
                                '&:hover': { bgcolor: '#F9FAFB', borderColor: '#D1D5DB' },
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={submitDisabled}
                            startIcon={isSubmitting
                                ? <CircularProgress size={14} sx={{ color: '#fff' }} />
                                : <SendIcon sx={{ fontSize: 16 }} />
                            }
                            sx={{
                                textTransform: 'none', fontSize: 13, fontWeight: 600,
                                bgcolor: PRIMARY, color: '#fff',
                                px: 2.5, height: 36, borderRadius: '7px',
                                boxShadow: `0 2px 6px ${PRIMARY}33`,
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
                                '&:hover': {
                                    bgcolor: PRIMARY_DARK,
                                    boxShadow: `0 4px 12px ${PRIMARY}55`,
                                    transform: 'translateY(-1px)',
                                },
                                '&:active': { transform: 'translateY(0)' },
                                '&.Mui-disabled': {
                                    bgcolor: '#E5E7EB', color: '#9CA3AF', boxShadow: 'none',
                                },
                            }}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Application'}
                        </Button>
                    </Box>
                </Box>
            </Box>

            {/* ── My Leave Balance Drawer ────────────────────────────────── */}
            <Drawer
                anchor="right"
                open={balanceOpen}
                onClose={() => setBalanceOpen(false)}
                PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, maxWidth: '100vw' } }}
            >
                {/* Drawer header */}
                <Box sx={{
                    p: 2, bgcolor: PRIMARY_LIGHT, borderBottom: '1px solid #C9BEFB',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
                        <Box sx={{
                            width: 38, height: 38, borderRadius: '7px',
                            bgcolor: '#fff', border: `1px solid ${PRIMARY}40`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                            <EventAvailableIcon sx={{ color: PRIMARY, fontSize: 22 }} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#111', lineHeight: 1.2 }}>
                                My Leave Balance
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: '#5B7A6E' }} noWrap>
                                {(user?.name || rollNumber || 'You')} · FY {financialYear} · As of {balanceAsOf}
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton size="small" onClick={() => setBalanceOpen(false)}>
                        <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Box>

                {/* Per-type cards (scrollable) */}
                <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                    {balanceLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress size={26} sx={{ color: PRIMARY }} />
                        </Box>
                    ) : balanceTypes.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                                No leave balance found
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: '#9CA3AF', mt: 0.4 }}>
                                Your HR admin has not allocated any leave for {financialYear} yet.
                            </Typography>
                        </Box>
                    ) : balanceTypes.map(t => {
                        const usedPct = t.allocated > 0 ? Math.min(100, Math.round((t.used / t.allocated) * 100)) : 0;
                        const isLow = t.remaining <= 1 && t.allocated > 0;
                        return (
                            <Box key={t.id} sx={{
                                p: 1.5, borderRadius: '7px',
                                border: `1px solid ${t.color}33`,
                                bgcolor: '#fff',
                                transition: 'box-shadow 0.2s',
                                '&:hover': { boxShadow: `0 2px 8px ${t.color}25` },
                            }}>
                                {/* Card header */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <Box sx={{
                                        width: 34, height: 34, borderRadius: '7px',
                                        bgcolor: `${t.color}15`, border: `1.5px solid ${t.color}40`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                    }}>
                                        <Typography sx={{ fontSize: 11, fontWeight: 900, color: t.color }}>
                                            {t.shortCode}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#111' }} noWrap>
                                                {t.name}
                                            </Typography>
                                            <Chip
                                                size="small"
                                                label={t.allocationPeriod}
                                                sx={{
                                                    height: 16, fontSize: 9, fontWeight: 700,
                                                    bgcolor: '#F3F4F6', color: '#374151',
                                                    border: '1px solid #E5E7EB',
                                                }}
                                            />
                                        </Box>
                                        <Typography sx={{ fontSize: 10, color: '#6B7280' }} noWrap>
                                            FY {t.financialYear}
                                            {t.currentPeriod && ` · ${shortenPeriodLabel(t.currentPeriod.label, t.allocationPeriod)} active`}
                                        </Typography>
                                    </Box>
                                    {isLow && (
                                        <Chip size="small" label="Low"
                                            sx={{ height: 18, fontSize: 9, fontWeight: 700, bgcolor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }} />
                                    )}
                                </Box>

                                {/* Stats row */}
                                <Box sx={{ display: 'flex', gap: 1, mb: 1.2 }}>
                                    {[
                                        { label: 'Allocated', value: t.allocated, color: '#374151' },
                                        { label: 'Used',      value: t.used,      color: '#DC2626' },
                                        { label: 'Remaining', value: t.remaining, color: t.color, big: true },
                                    ].map(s => (
                                        <Box key={s.label} sx={{
                                            flex: 1, py: 0.6, px: 0.5, borderRadius: '7px',
                                            bgcolor: s.big ? `${s.color}10` : '#F9FAFB',
                                            border: `1px solid ${s.big ? `${s.color}30` : '#E5E7EB'}`,
                                            textAlign: 'center',
                                        }}>
                                            <Typography sx={{
                                                fontSize: s.big ? 18 : 14,
                                                fontWeight: 800,
                                                color: s.color,
                                                lineHeight: 1,
                                            }}>
                                                {s.value}
                                            </Typography>
                                            <Typography sx={{
                                                fontSize: 9, fontWeight: 600, color: '#6B7280',
                                                textTransform: 'uppercase', letterSpacing: 0.3, mt: 0.3,
                                            }}>
                                                {s.label}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>

                                {/* Progress bar */}
                                <Box sx={{ mb: 0.6 }}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={usedPct}
                                        sx={{
                                            height: 6,
                                            borderRadius: 3,
                                            bgcolor: '#F3F4F6',
                                            '& .MuiLinearProgress-bar': { bgcolor: t.color, borderRadius: 3 },
                                        }}
                                    />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.4 }}>
                                        <Typography sx={{ fontSize: 10, color: '#6B7280' }}>
                                            {t.used} of {t.allocated} used
                                        </Typography>
                                        <Typography sx={{ fontSize: 10, color: t.color, fontWeight: 700 }}>
                                            {usedPct}%
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Per-period breakdown */}
                                {t.periods.length > 0 && (
                                    <Box sx={{
                                        mt: 1.2, p: 1, borderRadius: '7px',
                                        bgcolor: '#FAFBFD', border: '1px solid #E5E7EB',
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.8, flexWrap: 'wrap', gap: 0.5 }}>
                                            <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                                {t.allocationPeriod} Breakdown
                                            </Typography>
                                            <Chip
                                                size="small"
                                                label={`${t.perPeriodCap} / period`}
                                                sx={{
                                                    height: 16, fontSize: 9, fontWeight: 700,
                                                    bgcolor: `${t.color}15`, color: t.color,
                                                    border: `1px solid ${t.color}33`,
                                                }}
                                            />
                                        </Box>
                                        <Box sx={{
                                            display: 'grid',
                                            gridTemplateColumns: t.allocationPeriod === 'Monthly'
                                                ? 'repeat(4, minmax(0, 1fr))'
                                                : t.allocationPeriod === 'Quarterly'
                                                    ? 'repeat(2, minmax(0, 1fr))'
                                                    : '1fr',
                                            gap: 0.6,
                                        }}>
                                            {t.periods.map(p => {
                                                const status = getPeriodStatus(p);
                                                const pill = STATUS_PILL[status];
                                                const periodPct = p.cap > 0
                                                    ? Math.min(100, Math.round((p.approved / p.cap) * 100))
                                                    : 0;
                                                return (
                                                    <Box
                                                        key={p.index}
                                                        title={periodSubLabel(p.label, t.allocationPeriod)}
                                                        sx={{
                                                            p: 0.7, borderRadius: '7px',
                                                            bgcolor: p.isCurrentPeriod ? pill.bg : '#fff',
                                                            border: `1px solid ${p.isCurrentPeriod ? pill.border : '#E5E7EB'}`,
                                                            opacity: status === 'lapsed' ? 0.7 : 1,
                                                            minWidth: 0,
                                                        }}
                                                    >
                                                        {/* Top line: period label · status dot */}
                                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.3, mb: 0.3 }}>
                                                            <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#111' }} noWrap>
                                                                {shortenPeriodLabel(p.label, t.allocationPeriod)}
                                                            </Typography>
                                                            <Box sx={{
                                                                width: 6, height: 6, borderRadius: '50%',
                                                                bgcolor: pill.color, flexShrink: 0,
                                                            }} />
                                                        </Box>

                                                        {/* Compact remaining / cap pair */}
                                                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.3 }}>
                                                            <Typography sx={{
                                                                fontSize: 14, fontWeight: 800,
                                                                color: p.remaining === 0 ? '#DC2626' : t.color,
                                                                lineHeight: 1,
                                                            }}>
                                                                {p.remaining}
                                                            </Typography>
                                                            <Typography sx={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>
                                                                / {p.cap}
                                                            </Typography>
                                                        </Box>

                                                        {/* Subtle activity footer */}
                                                        {(p.approved > 0 || p.pending > 0) ? (
                                                            <Typography sx={{ fontSize: 8.5, color: '#6B7280', mt: 0.2, fontWeight: 600 }} noWrap>
                                                                {p.approved > 0 && `${p.approved} used`}
                                                                {p.approved > 0 && p.pending > 0 && ' · '}
                                                                {p.pending > 0 && `${p.pending} pending`}
                                                            </Typography>
                                                        ) : p.remaining === 0 && p.lapsed ? (
                                                            <Typography sx={{ fontSize: 8.5, color: '#9CA3AF', fontWeight: 600, fontStyle: 'italic', mt: 0.2 }} noWrap>
                                                                Lapsed
                                                            </Typography>
                                                        ) : null}

                                                        {/* Progress bar — only when there's something to show */}
                                                        {p.cap > 0 && (p.approved > 0 || p.isCurrentPeriod) && (
                                                            <LinearProgress
                                                                variant="determinate"
                                                                value={periodPct}
                                                                sx={{
                                                                    height: 3, borderRadius: 2, mt: 0.4,
                                                                    bgcolor: '#F3F4F6',
                                                                    '& .MuiLinearProgress-bar': { bgcolor: t.color, borderRadius: 2 },
                                                                }}
                                                            />
                                                        )}
                                                    </Box>
                                                );
                                            })}
                                        </Box>

                                        {/* Status legend (compact) */}
                                        <Box sx={{ display: 'flex', gap: 0.8, mt: 0.7, flexWrap: 'wrap' }}>
                                            {t.currentPeriod && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                                    <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: STATUS_PILL.current.color }} />
                                                    <Typography sx={{ fontSize: 9, color: '#6B7280', fontWeight: 600 }}>Current</Typography>
                                                </Box>
                                            )}
                                            {t.periods.some(p => p.isPastPeriod && !p.lapsed) && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                                    <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: STATUS_PILL.past.color }} />
                                                    <Typography sx={{ fontSize: 9, color: '#6B7280', fontWeight: 600 }}>Past</Typography>
                                                </Box>
                                            )}
                                            {t.periods.some(p => p.lapsed) && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                                    <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: STATUS_PILL.lapsed.color }} />
                                                    <Typography sx={{ fontSize: 9, color: '#6B7280', fontWeight: 600 }}>Lapsed</Typography>
                                                </Box>
                                            )}
                                            {t.periods.some(p => !p.isPastPeriod && !p.isCurrentPeriod && !p.lapsed) && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                                    <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: STATUS_PILL.upcoming.color }} />
                                                    <Typography sx={{ fontSize: 9, color: '#6B7280', fontWeight: 600 }}>Upcoming</Typography>
                                                </Box>
                                            )}
                                            {t.pending > 0 && (
                                                <Chip
                                                    size="small"
                                                    label={`${t.pending} pending overall`}
                                                    sx={{
                                                        height: 16, fontSize: 9, fontWeight: 700,
                                                        bgcolor: '#E0F2FE', color: '#B45309',
                                                        border: '1px solid #BAE6FD',
                                                        ml: 'auto',
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        );
                    })}
                </Box>

                {/* Drawer footer note */}
                <Box sx={{ p: 1.5, borderTop: '1px solid #E5E7EB', bgcolor: '#FAFAFA' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.8 }}>
                        <InfoOutlinedIcon sx={{ fontSize: 14, color: '#9CA3AF', mt: 0.2, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 10, color: '#6B7280', lineHeight: 1.5 }}>
                            Balances reset based on each leave type's policy cycle (monthly, quarterly, half-yearly or yearly) configured in <strong>Leave Policy Master</strong>. Pending leaves are deducted optimistically — they'll move to "Used" once approved.
                        </Typography>
                    </Box>
                </Box>
            </Drawer>
        </>
    );
}
