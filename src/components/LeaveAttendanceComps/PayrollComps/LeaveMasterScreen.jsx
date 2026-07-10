import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Button, Grid, IconButton, Divider,
    TextField, Autocomplete, Tooltip,
    Dialog, CircularProgress, Chip,
    FormControl, InputLabel, Select, MenuItem,
    Tabs, Tab,
    Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GavelIcon from '@mui/icons-material/Gavel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutlineRounded';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlineRounded';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import SnackBar from '../../SnackBar';
import AssignShiftsTab from './AssignShiftsTab';
import LeaveTypesTab from './leaveMaster/LeaveTypesTab';
import {
    Section, SubSection, ToggleRow, AmountField, NumberField, TimeField,
    PRIMARY, PRIMARY_LIGHT, PRIMARY_DARK, TOKEN,
    FREQUENCY_TO_API, FREQUENCY_FROM_API,
    parseTimeToMinutes, formatTime12, formatHrs,
} from './leaveMaster/LeaveMasterShared';
import { selectWebsiteSettings } from '../../../redux/slices/websiteSettingsSlice';
import { selectAcademicYear } from '../../../redux/slices/academicYearSlice';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import LockIcon from '@mui/icons-material/Lock';
import dayjs from 'dayjs';
import { postleavepolicy, GetLeavePolicy, postworkingcalendar, GetWorkingcalendar } from '../../../Api/Api';

const PAYOUT_FREQUENCIES = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'];

const MAX_SHIFTS = 10;

const LATE_BEYOND_OPTIONS = [
    { key: 'half_day', label: 'Half-Day Salary' },
    { key: 'full_day', label: 'Full-Day Salary' },
    { key: 'amount', label: 'Fixed Amount' },
];

const beyondLabel = (b) => {
    if (!b) return '—';
    if (b.type === 'half_day') return 'Half-Day Salary';
    if (b.type === 'full_day') return 'Full-Day Salary';
    return `₹${Number(b.amount) || 0}`;
};

const BonusAmountField = ({ label, type, amount, onType, onAmount, helperText }) => (
    <Box>
        <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#555', mb: 0.5 }}>{label}</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Select
                size="small"
                value={type || 'amount'}
                onChange={(e) => onType(e.target.value)}
                sx={{ minWidth: 150, height: 36, fontSize: 13, borderRadius: '7px' }}
            >
                {LATE_BEYOND_OPTIONS.map((o) => (
                    <MenuItem key={o.key} value={o.key} sx={{ fontSize: 13 }}>{o.label}</MenuItem>
                ))}
            </Select>
            {(type || 'amount') === 'amount' && (
                <TextField
                    size="small"
                    value={amount}
                    onChange={(e) => onAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="0"
                    slotProps={{ input: { startAdornment: <Typography sx={{ fontSize: '13px', color: '#7C5CFC', fontWeight: 600, mr: 0.5 }}>₹</Typography> } }}
                    sx={{ width: 120, '& .MuiOutlinedInput-root': { fontSize: '13px', borderRadius: '7px', height: 36 } }}
                />
            )}
        </Box>
        {helperText && <Typography sx={{ fontSize: '10px', color: '#9CA3AF', mt: 0.3 }}>{helperText}</Typography>}
    </Box>
);

const DEDUCTION_APPLIED_TO_API = {
    'Same Month': 'SameMonth',
    'Next Month': 'NextMonth',
    'Quarterly': 'Quarterly',
    'Half-Yearly': 'HalfYearly',
    'Yearly': 'Yearly',
};

const DEDUCTION_FORMULA_TO_API = {
    'gross_by_working_days': 'GrossWorkingDays',
    'gross_by_calendar_days': 'GrossCalendarDays',
    'gross_by_fixed_days': 'GrossFixed30',
};

const WC_DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DAY_TYPE_TO_API = {
    working: 'Working',
    holiday: 'Holiday',
    mandatory: 'Mandatory',
};
const DAY_TYPE_FROM_API = {
    Working: 'working',
    Holiday: 'holiday',
    Mandatory: 'mandatory',
};

const buildWeekPattern = (defaultWorkingDays = []) => {
    const pattern = {};
    WC_DAY_LABELS.forEach((label, idx) => {
        pattern[label] = defaultWorkingDays.includes(idx) ? 'Working' : 'Holiday';
    });
    return pattern;
};

const parseWeekPattern = (pattern) => {
    if (!pattern || typeof pattern !== 'object') return null;
    const result = [];
    WC_DAY_LABELS.forEach((label, idx) => {
        const v = pattern[label];
        if (v === 'Working' || v === 'Mandatory') result.push(idx);
    });
    return result;
};

const DEDUCTION_APPLIED_FROM_API = Object.fromEntries(
    Object.entries(DEDUCTION_APPLIED_TO_API).map(([k, v]) => [v, k])
);

const DEDUCTION_FORMULA_FROM_API = Object.fromEntries(
    Object.entries(DEDUCTION_FORMULA_TO_API).map(([k, v]) => [v, k])
);

const parseApiDate = (s) => {
    if (!s || typeof s !== 'string') return null;
    const parts = s.split('-');
    if (parts.length !== 3) return null;
    const [d, m, y] = parts;
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    const parsed = dayjs(iso);
    return parsed.isValid() ? parsed : null;
};

const INITIAL_CONFIG = {
    attendanceBonusEnabled: false,
    attendanceBonusType: 'amount',
    attendanceBonusAmount: '',
    minWorkingDaysForBonus: 15,
    mustJoinFirstDay: true,
    mandatoryDayAttendanceRequired: true,
    leaveDeductionStillApplies: true,

    punctualityBonusEnabled: false,
    punctualityBonusType: 'amount',
    punctualityBonusAmount: '',
    lateArrivalThresholdMinutes: 15,
    emergencyLatesPerMonth: 1,
    informedLeavesAllowed: 1,
    latePenaltyEnabled: false,
    latePenaltySlabs: [
        { uptoMinutes: 20, amount: 50 },
        { uptoMinutes: 60, amount: 100 },
        { uptoMinutes: 120, amount: 200 },
    ],
    latePenaltyBeyond: { type: 'half_day', amount: 0 },
    permissionDeductionEnabled: false,
    permissionFreeHoursPerMonth: 3,
    permissionAmountPerHour: '',
    uninformedLeaveDisqualifies: true,

    deductionAppliesToPaidLeave: true,
    paidLeaveDeductionAppliedOn: 'Same Month',
    paidLeaveCreditBackEnabled: false,
    paidLeaveCreditBackOn: 'Next Month',
    paidLeaveCarryForward: false,
    paidLeaveDaysPerMonth: 1,

    bonusCalculationFrequency: 'Monthly',
    bonusCreditFrequency: 'Quarterly',

    deductionFormula: 'gross_by_working_days',

    shiftStartTime: '08:00',
    shiftEndTime: '16:00',
    gracePeriodMinutes: 10,
    lunchBreakMinutes: 60,
    shortBreakMinutes: 15,

    shifts: [
        {
            shiftName: 'Morning Shift',
            startTime: '08:00',
            endTime: '16:00',
            gracePeriodMinutes: 10,
            lunchBreakMinutes: 45,
            shortBreakMinutes: 15,
        },
    ],

    defaultWorkingDays: [1, 2, 3, 4, 5, 6],
};

const getCurrentAcademicYear = () => {
    const today = new Date();
    const start = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    return `${start}-${start + 1}`;
};

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_NAMES_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const computeEndMonth = (startMonth) => ((startMonth - 1 + 11) % 12) + 1;

// Per-page header meta for the standalone (hideTabBar) Leave Policy routes.
const LP_PAGES = [
    { title: 'Policy Setup', subtitle: 'Auto-renew, shift timing, work hours, punctuality & bonus rules' },
    { title: 'Leave Types', subtitle: 'Create and configure each leave type, its allocation and deduction rules' },
    { title: 'Working Calendar', subtitle: 'Define working days, holidays and mandatory days for each month' },
    { title: 'Assign Shifts', subtitle: 'Assign each staff member to a work shift for the year' },
];


export default function LeaveMasterScreen({ initialTab = 0, hideTabBar = false }) {
    const navigate = useNavigate();
    const isExpanded = useSelector((state) => state.sidebar.isExpanded);
    const authUser = useSelector((state) => state.auth);
    const websiteSettings = useSelector(selectWebsiteSettings);
    const [isSavingMaster, setIsSavingMaster] = useState(false);
    const [isLoadingMaster, setIsLoadingMaster] = useState(false);

    const academicYear = useSelector(selectAcademicYear) || getCurrentAcademicYear();

    const [activeTab, setActiveTab] = useState(initialTab);

    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState(false);
    const [color, setColor] = useState(false);
    const [message, setMessage] = useState('');
    const showSnack = (msg, success) => {
        setMessage(msg); setOpen(true); setColor(success); setStatus(success);
    };

    const [config, setConfig] = useState({ ...INITIAL_CONFIG });

    const [shiftsOpen, setShiftsOpen] = useState(false);

    const update = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));

    const anyBonusEnabled = config.attendanceBonusEnabled || config.punctualityBonusEnabled;

    const updateShift = (index, field, value) => setConfig(prev => {
        const next = [...(prev.shifts || [])];
        next[index] = { ...(next[index] || {}), [field]: value };
        return { ...prev, shifts: next };
    });

    const addShift = () => {
        const len = (config.shifts || []).length;
        if (len >= MAX_SHIFTS) {
            showSnack(`You can create up to ${MAX_SHIFTS} shifts only.`, false);
            return;
        }
        const newShift = {
            shiftName: len === 0 ? 'Morning Shift' : `Shift ${len + 1}`,
            startTime: '09:00',
            endTime: '17:00',
            gracePeriodMinutes: 10,
            lunchBreakMinutes: 45,
            shortBreakMinutes: 15,
        };
        setConfig(prev => ({ ...prev, shifts: [...(prev.shifts || []), newShift] }));
        setShiftsOpen(true);
    };

    const removeShift = (index) => {
        setConfig(prev => ({
            ...prev,
            shifts: (prev.shifts || []).filter((_, i) => i !== index),
        }));
    };

    const updateSlab = (index, field, value) => setConfig(prev => {
        const slabs = [...(prev.latePenaltySlabs || [])];
        slabs[index] = { ...slabs[index], [field]: value };
        return { ...prev, latePenaltySlabs: slabs };
    });

    const addSlab = () => setConfig(prev => {
        const slabs = [...(prev.latePenaltySlabs || [])];
        const last = slabs.length ? Number(slabs[slabs.length - 1].uptoMinutes) || 0 : 0;
        slabs.push({ uptoMinutes: last + 30, amount: 0 });
        return { ...prev, latePenaltySlabs: slabs };
    });

    const removeSlab = (index) => setConfig(prev => ({
        ...prev,
        latePenaltySlabs: (prev.latePenaltySlabs || []).filter((_, i) => i !== index),
    }));

    const updateBeyond = (field, value) => setConfig(prev => ({
        ...prev,
        latePenaltyBeyond: { ...(prev.latePenaltyBeyond || {}), [field]: value },
    }));

    const handleClearAll = () => {
        setConfig({ ...INITIAL_CONFIG });
        setStartMonth(4); // April — typical academic year start
        setAutoRenew(true);
        setHasExistingPolicy(false);
        showSnack('All policy fields reset to defaults', true);
    };

    useEffect(() => {
        const grace = Number(config.gracePeriodMinutes) || 0;
        if (grace > 0 && grace !== Number(config.lateArrivalThresholdMinutes)) {
            setConfig(prev => ({ ...prev, lateArrivalThresholdMinutes: grace }));
        }
    }, [config.gracePeriodMinutes]);

    const [startMonth, setStartMonth] = useState(4); // April (default academic-year start)
    const [autoRenew, setAutoRenew] = useState(true); // roll policy over into the next academic year

    const [hasExistingPolicy, setHasExistingPolicy] = useState(false);

    const [renewDialog, setRenewDialog] = useState({ open: false, prevPolicy: null, prevAY: null });
    const closeRenewDialog = () => setRenewDialog({ open: false, prevPolicy: null, prevAY: null });
    const endMonth = computeEndMonth(startMonth); // still sent in the save payload (defaults to the academic-year cycle)

    const [calendarMonth, setCalendarMonth] = useState(dayjs());
    const [dayOverrides, setDayOverrides] = useState({});
    const [savedMonths, setSavedMonths] = useState({}); // { "2026-04": true } — server has a record (insert or update)
    const [dirtyMonths, setDirtyMonths] = useState({}); // { "2026-04": true } — local edits since last sync
    const [isSavingMonth, setIsSavingMonth] = useState(false);
    const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);

    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const DAY_COLORS = {
        working: { bg: '#EFF5FF', color: '#16A34A', border: '#C9BEFB' },
        holiday: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
        mandatory: { bg: '#FFF7ED', color: '#EA580C', border: '#FED7AA' },
    };

    const currentMonth = dayjs().startOf('month');
    const maxMonth = currentMonth.add(11, 'month');

    const nextMonthKey = useMemo(
        () => dayjs().add(1, 'month').startOf('month').format('YYYY-MM'),
        [],
    );
    const nextMonthLabel = useMemo(
        () => dayjs().add(1, 'month').format('MMMM YYYY'),
        [],
    );
    const isNextMonthMissing = !savedMonths[nextMonthKey];
    const canGoPrev = calendarMonth.isAfter(currentMonth, 'month');
    const canGoNext = calendarMonth.isBefore(maxMonth, 'month');
    const calendarMonthKey = calendarMonth.format('YYYY-MM');
    const isMonthSaved = !!savedMonths[calendarMonthKey];
    const isMonthDirty = !!dirtyMonths[calendarMonthKey];
    const canSaveMonth = isMonthDirty || !isMonthSaved || isMonthSaved;
    const isMonthUpdate = isMonthSaved;
    const isCurrentMonth = calendarMonth.isSame(currentMonth, 'month');
    const isPastMonth = calendarMonth.isBefore(currentMonth, 'month');
    const isReadOnlyMonth = isCurrentMonth || isPastMonth;

    const getDaysInMonth = () => {
        const start = calendarMonth.startOf('month');
        const daysCount = calendarMonth.daysInMonth();
        const days = [];
        for (let i = 0; i < daysCount; i++) {
            days.push(start.add(i, 'day'));
        }
        return days;
    };

    const getDayType = (date) => {
        const key = date.format('YYYY-MM-DD');
        if (dayOverrides[key]) return dayOverrides[key];
        const dayOfWeek = date.day();
        return config.defaultWorkingDays.includes(dayOfWeek) ? 'working' : 'holiday';
    };

    const cycleDayType = (date) => {
        if (isReadOnlyMonth) return;
        const key = date.format('YYYY-MM-DD');
        const current = getDayType(date);
        const cycle = { working: 'holiday', holiday: 'mandatory', mandatory: 'working' };
        const next = cycle[current];
        const dayOfWeek = date.day();
        const isDefaultType = config.defaultWorkingDays.includes(dayOfWeek) ? 'working' : 'holiday';

        if (next === isDefaultType) {
            setDayOverrides(prev => { const n = { ...prev }; delete n[key]; return n; });
        } else {
            setDayOverrides(prev => ({ ...prev, [key]: next }));
        }
        setDirtyMonths(prev => ({ ...prev, [calendarMonthKey]: true }));
    };

    const buildMonthOverrides = (monthDayjs) => {
        const result = [];
        const daysInMonth = monthDayjs.daysInMonth();
        for (let i = 0; i < daysInMonth; i++) {
            const date = monthDayjs.startOf('month').add(i, 'day');
            const type = getDayType(date);
            if (type === 'holiday' || type === 'mandatory') {
                result.push({
                    dayDate: date.format('YYYY-MM-DD'),
                    dayType: DAY_TYPE_TO_API[type],
                });
            }
        }
        return result;
    };

    const buildMonthWeekPattern = (monthDayjs) => {
        const pattern = {};
        const start = monthDayjs.startOf('month');
        const daysInMonth = monthDayjs.daysInMonth();

        WC_DAY_LABELS.forEach((label, idx) => {
            let foundAny = false;
            let allHoliday = true;
            for (let i = 0; i < daysInMonth; i++) {
                const d = start.add(i, 'day');
                if (d.day() === idx) {
                    foundAny = true;
                    if (getDayType(d) !== 'holiday') {
                        allHoliday = false;
                        break;
                    }
                }
            }
            if (!foundAny) {
                pattern[label] = config.defaultWorkingDays.includes(idx) ? 'Working' : 'Holiday';
            } else {
                pattern[label] = allHoliday ? 'Holiday' : 'Working';
            }
        });
        return pattern;
    };

    const handleSaveMonth = async () => {
        if (isReadOnlyMonth) {
            showSnack('You can only edit and save upcoming months. The current and past months are read-only.', false);
            return;
        }
        if (!authUser?.rollNumber) {
            showSnack('Cannot save: no logged-in user found.', false);
            return;
        }

        const body = {
            academicYear,
            year: calendarMonth.year(),
            month: calendarMonth.month() + 1,        // dayjs month is 0-indexed
            weekPattern: buildMonthWeekPattern(calendarMonth),
            overrides: buildMonthOverrides(calendarMonth),
            updatedByRollNumber: authUser.rollNumber,
        };

        setIsSavingMonth(true);
        try {
            const res = await axios.post(postworkingcalendar, body, {
                headers: { Authorization: `Bearer ${TOKEN}` },
            });
            const ok = !res?.data || res.data.error === false;
            if (ok) {
                const wasUpdate = !!savedMonths[calendarMonthKey];
                setSavedMonths(prev => ({ ...prev, [calendarMonthKey]: true }));
                setDirtyMonths(prev => { const n = { ...prev }; delete n[calendarMonthKey]; return n; });
                showSnack(
                    res?.data?.message
                    || `Working calendar for ${calendarMonth.format('MMMM YYYY')} ${wasUpdate ? 'updated' : 'saved'} successfully`,
                    true
                );
            } else {
                showSnack(res.data.message || 'Failed to save working calendar', false);
            }
        } catch (err) {
            console.error('postworkingcalendar failed:', err);
            const apiMsg = err?.response?.data?.message;
            showSnack(apiMsg || 'Failed to save working calendar. Please try again.', false);
        } finally {
            setIsSavingMonth(false);
        }
    };

    const fetchWorkingCalendar = async (monthDayjs) => {
        const year = monthDayjs.year();
        const month = monthDayjs.month() + 1;
        const monthKey = monthDayjs.format('YYYY-MM');

        const markNoRecord = () => {
            setSavedMonths(prev => { const n = { ...prev }; delete n[monthKey]; return n; });
            setDirtyMonths(prev => { const n = { ...prev }; delete n[monthKey]; return n; });
            setDayOverrides(prev => {
                const next = { ...prev };
                let changed = false;
                Object.keys(next).forEach(k => {
                    if (k.startsWith(monthKey)) { delete next[k]; changed = true; }
                });
                return changed ? next : prev;
            });
        };

        setIsLoadingCalendar(true);
        try {
            const res = await axios.get(GetWorkingcalendar, {
                params: { academicYear, year, month },
                headers: { Authorization: `Bearer ${TOKEN}` },
            });

            const d = res?.data?.data;
            const hasWeekPattern = !!(
                d
                && d.weekPattern
                && typeof d.weekPattern === 'object'
                && Object.keys(d.weekPattern).length > 0
            );
            const hasOverrides = !!(d && Array.isArray(d.overrides) && d.overrides.length > 0);
            const hasRecord = res?.data?.error === false && (hasWeekPattern || hasOverrides);

            if (hasRecord) {
                if (hasWeekPattern) {
                    const parsedDow = parseWeekPattern(d.weekPattern);
                    if (parsedDow) update('defaultWorkingDays', parsedDow);
                }

                setDayOverrides(prev => {
                    const next = { ...prev };
                    Object.keys(next).forEach(k => {
                        if (k.startsWith(monthKey)) delete next[k];
                    });
                    (d.overrides || []).forEach(o => {
                        const t = DAY_TYPE_FROM_API[o.dayType];
                        if (o.dayDate && t) next[o.dayDate] = t;
                    });
                    return next;
                });

                setSavedMonths(prev => ({ ...prev, [monthKey]: true }));
                setDirtyMonths(prev => { const n = { ...prev }; delete n[monthKey]; return n; });
            } else {
                markNoRecord();
            }
        } catch (err) {
            if (err?.response?.status === 404) {
                markNoRecord();
            } else {
                console.error('GetWorkingcalendar failed:', err);
            }
        } finally {
            setIsLoadingCalendar(false);
        }
    };

    useEffect(() => {
        fetchWorkingCalendar(calendarMonth);
    }, [calendarMonthKey, academicYear]);

    const probeNextMonthBadge = async () => {
        try {
            const probeMonth = dayjs().add(1, 'month').startOf('month');
            const res = await axios.get(GetWorkingcalendar, {
                params: {
                    academicYear,
                    year: probeMonth.year(),
                    month: probeMonth.month() + 1,
                },
                headers: { Authorization: `Bearer ${TOKEN}` },
            });
            const d = res?.data?.data;
            const hasWeekPattern = !!(d && d.weekPattern && Object.keys(d.weekPattern).length > 0);
            const hasOverrides = !!(d && Array.isArray(d.overrides) && d.overrides.length > 0);
            const hasRecord = res?.data?.error === false && (hasWeekPattern || hasOverrides);
            setSavedMonths(prev => {
                const next = { ...prev };
                if (hasRecord) next[nextMonthKey] = true;
                else delete next[nextMonthKey];
                return next;
            });
        } catch (err) {
            if (err?.response?.status === 404) {
                setSavedMonths(prev => { const n = { ...prev }; delete n[nextMonthKey]; return n; });
            }
        }
    };

    useEffect(() => {
        probeNextMonthBadge();
    }, [academicYear]);

    const calendarDays = getDaysInMonth();
    const calendarStats = {
        working: calendarDays.filter(d => getDayType(d) === 'working').length,
        holiday: calendarDays.filter(d => getDayType(d) === 'holiday').length,
        mandatory: calendarDays.filter(d => getDayType(d) === 'mandatory').length,
    };

    const toggleDefaultWorkingDay = (dayIndex) => {
        const current = config.defaultWorkingDays;
        if (current.includes(dayIndex)) {
            update('defaultWorkingDays', current.filter(d => d !== dayIndex));
        } else {
            update('defaultWorkingDays', [...current, dayIndex].sort());
        }
        setDirtyMonths(prev => ({ ...prev, [calendarMonthKey]: true }));
    };

    const applyFetchedPolicy = (d) => {
        if (!d) return;
        setHasExistingPolicy(true);


        const sm = Number(d.policyApplicabilityPeriod?.startMonth);
        if (sm >= 1 && sm <= 12) setStartMonth(sm);
        if (typeof d.policyApplicabilityPeriod?.autoRenew === 'boolean') {
            setAutoRenew(d.policyApplicabilityPeriod.autoRenew);
        }

        setConfig(prev => ({
            ...prev,

            attendanceBonusEnabled: !!d.attendanceBonus?.enabled,
            attendanceBonusType: d.attendanceBonus?.amountType || 'amount',
            attendanceBonusAmount: d.attendanceBonus?.amount != null ? String(d.attendanceBonus.amount) : '',
            minWorkingDaysForBonus: Number(d.attendanceBonus?.minWorkingDays) || 0,
            mustJoinFirstDay: !!d.attendanceBonus?.mustJoinFirstDay,
            mandatoryDayAttendanceRequired: !!d.attendanceBonus?.mandatoryDayRequired,
            leaveDeductionStillApplies: !!d.attendanceBonus?.salaryDeductStillApplies,

            punctualityBonusEnabled: !!d.punctuality?.enabled,
            punctualityBonusType: d.punctuality?.bonusAmountType || 'amount',
            punctualityBonusAmount: d.punctuality?.bonusAmount != null ? String(d.punctuality.bonusAmount) : '',
            lateArrivalThresholdMinutes: Number(d.punctuality?.lateThresholdMinutes) || 15,
            emergencyLatesPerMonth: Number(d.punctuality?.emergencyLatesAllowed) || 1,
            informedLeavesAllowed: Number(d.punctuality?.informedLeavesAllowed) || 0,
            latePenaltyEnabled: !!d.punctuality?.latePenaltyEnabled,
            latePenaltySlabs: Array.isArray(d.punctuality?.latePenaltySlabs) && d.punctuality.latePenaltySlabs.length
                ? d.punctuality.latePenaltySlabs.map(s => ({ uptoMinutes: Number(s.uptoMinutes) || 0, amount: Number(s.amount) || 0 }))
                : INITIAL_CONFIG.latePenaltySlabs,
            latePenaltyBeyond: d.punctuality?.latePenaltyBeyond
                ? { type: d.punctuality.latePenaltyBeyond.type || 'half_day', amount: Number(d.punctuality.latePenaltyBeyond.amount) || 0 }
                : INITIAL_CONFIG.latePenaltyBeyond,
            permissionDeductionEnabled: !!d.punctuality?.permissionDeductionEnabled,
            permissionFreeHoursPerMonth: d.punctuality?.permissionFreeHoursPerMonth != null ? Number(d.punctuality.permissionFreeHoursPerMonth) : 3,
            permissionAmountPerHour: d.punctuality?.permissionAmountPerHour != null ? String(d.punctuality.permissionAmountPerHour) : '',
            uninformedLeaveDisqualifies: !!d.punctuality?.uninformedLeaveDisqualifies,

            deductionAppliesToPaidLeave: !!d.leaveSalaryDeduction?.appliesToPaidLeave,
            paidLeaveDeductionAppliedOn: DEDUCTION_APPLIED_FROM_API[d.leaveSalaryDeduction?.deductionAppliedWhen] || 'Same Month',
            paidLeaveCreditBackEnabled: !!d.leaveSalaryDeduction?.creditBackEnabled,
            paidLeaveCreditBackOn: DEDUCTION_APPLIED_FROM_API[d.leaveSalaryDeduction?.creditBackWhen] || 'Next Month',
            deductionFormula: DEDUCTION_FORMULA_FROM_API[d.leaveSalaryDeduction?.formula] || 'gross_by_working_days',

            bonusCalculationFrequency: FREQUENCY_FROM_API[d.bonusPayout?.calcFrequency] || 'Monthly',
            bonusCreditFrequency: FREQUENCY_FROM_API[d.bonusPayout?.creditFrequency] || 'Quarterly',

            shifts: Array.isArray(d.shifts) && d.shifts.length > 0
                ? d.shifts
                    .slice()
                    .sort((a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0))
                    .map(s => ({
                        id: s.id,
                        shiftName: s.shiftName || '',
                        startTime: s.startTime || '08:00',
                        endTime: s.endTime || '16:00',
                        gracePeriodMinutes: Number(s.gracePeriodMinutes) || 0,
                        lunchBreakMinutes: Number(s.lunchBreakMinutes) || 0,
                        shortBreakMinutes: Number(s.shortBreakMinutes) || 0,
                    }))
                : (d.shiftTiming
                    ? [{
                        shiftName: 'Default Shift',
                        startTime: d.shiftTiming.startTime || d.shiftTiming.shiftStartTime || '08:00',
                        endTime: d.shiftTiming.endTime || d.shiftTiming.shiftEndTime || '16:00',
                        gracePeriodMinutes: Number(d.shiftTiming.gracePeriodMinutes) || 0,
                        lunchBreakMinutes: Number(d.shiftTiming.lunchBreakMinutes) || 0,
                        shortBreakMinutes: Number(d.shiftTiming.shortBreakMinutes) || 0,
                    }]
                    : (prev.shifts || INITIAL_CONFIG.shifts)
                ),

            shiftStartTime: (d.shifts?.[0]?.startTime) || d.shiftTiming?.startTime || prev.shiftStartTime,
            shiftEndTime: (d.shifts?.[0]?.endTime) || d.shiftTiming?.endTime || prev.shiftEndTime,
            gracePeriodMinutes: Number(d.shifts?.[0]?.gracePeriodMinutes ?? d.shiftTiming?.gracePeriodMinutes) || 0,
            lunchBreakMinutes: Number(d.shifts?.[0]?.lunchBreakMinutes ?? d.shiftTiming?.lunchBreakMinutes) || 0,
            shortBreakMinutes: Number(d.shifts?.[0]?.shortBreakMinutes ?? d.shiftTiming?.shortBreakMinutes) || 0,
        }));
    };

    const applyPolicyAsTemplate = (prevPolicy, targetAY) => {
        if (!prevPolicy) return;
        applyFetchedPolicy({ ...prevPolicy, academicYear: targetAY });
    };

    const buildPayloadFromPolicy = (prev, targetAY) => ({
        academicYear: targetAY,
        policyApplicabilityPeriod: {
            startMonth: Number(prev.policyApplicabilityPeriod?.startMonth) || 4,
            endMonth: Number(prev.policyApplicabilityPeriod?.endMonth) || 3,
            autoRenew: !!prev.policyApplicabilityPeriod?.autoRenew,
        },
        shifts: Array.isArray(prev.shifts) && prev.shifts.length > 0
            ? prev.shifts.map((s, i) => ({
                shiftName: s.shiftName || `Shift ${i + 1}`,
                startTime: s.startTime || '08:00',
                endTime: s.endTime || '16:00',
                gracePeriodMinutes: Number(s.gracePeriodMinutes) || 0,
                lunchBreakMinutes: Number(s.lunchBreakMinutes) || 0,
                shortBreakMinutes: Number(s.shortBreakMinutes) || 0,
                displayOrder: i,
            }))
            : (prev.shiftTiming
                ? [{
                    shiftName: 'Default Shift',
                    startTime: prev.shiftTiming.startTime || '08:00',
                    endTime: prev.shiftTiming.endTime || '16:00',
                    gracePeriodMinutes: Number(prev.shiftTiming.gracePeriodMinutes) || 0,
                    lunchBreakMinutes: Number(prev.shiftTiming.lunchBreakMinutes) || 0,
                    shortBreakMinutes: Number(prev.shiftTiming.shortBreakMinutes) || 0,
                    displayOrder: 0,
                }]
                : []
            ),
        attendanceBonus: prev.attendanceBonus || {},
        punctuality: prev.punctuality || {},
        leaveSalaryDeduction: prev.leaveSalaryDeduction || {},
        bonusPayout: prev.bonusPayout || {},
        updatedByRollNumber: authUser?.rollNumber || '',
    });

    const autoRenewPolicy = async (prevPolicy, targetAY) => {
        try {
            const payload = buildPayloadFromPolicy(prevPolicy, targetAY);
            const res = await axios.post(postleavepolicy, payload, {
                headers: { Authorization: `Bearer ${TOKEN}` },
            });
            if (res?.data?.error === false) {
                applyPolicyAsTemplate(prevPolicy, targetAY);
                showSnack(`Policy auto-renewed from ${prevPolicy.academicYear} for ${targetAY}`, true);
            } else {
                showSnack(res?.data?.message || 'Auto-renew failed — please save manually', false);
            }
        } catch (err) {
            console.error('Auto-renew POST failed:', err);
            showSnack('Auto-renew failed — please save manually', false);
        }
    };

    const checkAutoRenewWindow = async (ay) => {
        const today = dayjs();
        const currentAY = getCurrentAcademicYear();
        if (ay !== currentAY) return;

        const [ysStr] = ay.split('-');
        const ys = parseInt(ysStr, 10);
        if (!Number.isFinite(ys)) return;
        const prevAY = `${ys - 1}-${ys}`;

        try {
            const res = await axios.get(GetLeavePolicy, {
                params: { academicYear: prevAY },
                headers: { Authorization: `Bearer ${TOKEN}` },
            });
            if (!res?.data || res.data.error !== false || !res.data.data) return;

            const prevPolicy = res.data.data;
            const prevStartMonth = Number(prevPolicy.policyApplicabilityPeriod?.startMonth);
            if (!(prevStartMonth >= 1 && prevStartMonth <= 12)) return;

            const todayMonth = today.month() + 1;
            const todayDay = today.date();
            const inWindow = todayMonth === prevStartMonth && todayDay <= 20;
            if (!inWindow) return;

            const prevAutoRenew = !!prevPolicy.policyApplicabilityPeriod?.autoRenew;
            if (prevAutoRenew) {
                await autoRenewPolicy(prevPolicy, ay);
            } else {
                setRenewDialog({ open: true, prevPolicy, prevAY });
            }
        } catch (err) {
            if (err?.response?.status !== 404) {
                console.warn('checkAutoRenewWindow failed:', err);
            }
        }
    };

    const handleRestorePrev = () => {
        if (renewDialog.prevPolicy) {
            applyPolicyAsTemplate(renewDialog.prevPolicy, academicYear);
            showSnack(`Restored policy from ${renewDialog.prevAY}. Review and save.`, true);
        }
        closeRenewDialog();
    };

    const handleCreateNewPolicy = () => {
        setConfig({ ...INITIAL_CONFIG });
        setStartMonth(4);
        setAutoRenew(true);
        closeRenewDialog();
    };

    const fetchLeavePolicy = async (year) => {
        const ay = year || academicYear;
        if (!ay) return;
        setIsLoadingMaster(true);
        try {
            const res = await axios.get(GetLeavePolicy, {
                params: { academicYear: ay },
                headers: { Authorization: `Bearer ${TOKEN}` },
            });
            if (res?.data && res.data.error === false && res.data.data) {
                applyFetchedPolicy(res.data.data);
            } else {
                setConfig({ ...INITIAL_CONFIG });
                setStartMonth(4);
                setAutoRenew(true);
                setHasExistingPolicy(false);
                checkAutoRenewWindow(ay);
            }
        } catch (err) {
            if (err?.response?.status === 404) {
                setConfig({ ...INITIAL_CONFIG });
                setStartMonth(4);
                setAutoRenew(true);
                setHasExistingPolicy(false);
                checkAutoRenewWindow(ay);
            } else {
                console.error('GetLeavePolicy failed:', err);
                showSnack('Failed to load existing leave policy', false);
            }
        } finally {
            setIsLoadingMaster(false);
        }
    };

    useEffect(() => {
        fetchLeavePolicy(academicYear);
    }, [academicYear]);

    const buildLeavePolicyPayload = () => ({
        academicYear,
        policyApplicabilityPeriod: {
            startMonth: Number(startMonth),
            endMonth: Number(endMonth),
            autoRenew: !!autoRenew,
        },
        shifts: (config.shifts || []).map((s, i) => ({
            shiftName: (s.shiftName || `Shift ${i + 1}`).trim(),
            startTime: s.startTime || '',
            endTime: s.endTime || '',
            gracePeriodMinutes: Number(config.gracePeriodMinutes) || 0,
            lunchBreakMinutes: Number(s.lunchBreakMinutes) || 0,
            shortBreakMinutes: Number(s.shortBreakMinutes) || 0,
            displayOrder: i,
        })),
        attendanceBonus: {
            enabled: !!config.attendanceBonusEnabled,
            amountType: config.attendanceBonusType || 'amount',
            amount: config.attendanceBonusType === 'amount' ? (Number(config.attendanceBonusAmount) || 0) : 0,
            minWorkingDays: Number(config.minWorkingDaysForBonus) || 0,
            mustJoinFirstDay: !!config.mustJoinFirstDay,
            mandatoryDayRequired: !!config.mandatoryDayAttendanceRequired,
            salaryDeductStillApplies: !!config.leaveDeductionStillApplies,
        },
        punctuality: {
            enabled: !!config.punctualityBonusEnabled,
            bonusAmountType: config.punctualityBonusType || 'amount',
            bonusAmount: config.punctualityBonusType === 'amount' ? (Number(config.punctualityBonusAmount) || 0) : 0,
            lateThresholdMinutes: Number(config.lateArrivalThresholdMinutes) || 0,
            emergencyLatesAllowed: Number(config.emergencyLatesPerMonth) || 0,
            informedLeavesAllowed: Number(config.informedLeavesAllowed) || 0,
            latePenaltyEnabled: !!config.latePenaltyEnabled,
            latePenaltySlabs: config.latePenaltyEnabled
                ? (config.latePenaltySlabs || []).map(s => ({ uptoMinutes: Number(s.uptoMinutes) || 0, amount: Number(s.amount) || 0 }))
                : [],
            latePenaltyBeyond: config.latePenaltyEnabled
                ? { type: config.latePenaltyBeyond?.type || 'half_day', amount: Number(config.latePenaltyBeyond?.amount) || 0 }
                : null,
            permissionDeductionEnabled: !!config.permissionDeductionEnabled,
            permissionFreeHoursPerMonth: config.permissionDeductionEnabled ? (Number(config.permissionFreeHoursPerMonth) || 0) : 0,
            permissionAmountPerHour: config.permissionDeductionEnabled ? (Number(config.permissionAmountPerHour) || 0) : 0,
            uninformedLeaveDisqualifies: !!config.uninformedLeaveDisqualifies,
        },
        leaveSalaryDeduction: {
            appliesToPaidLeave: !!config.deductionAppliesToPaidLeave,
            deductionAppliedWhen: DEDUCTION_APPLIED_TO_API[config.paidLeaveDeductionAppliedOn] || 'SameMonth',
            creditBackEnabled: !!config.paidLeaveCreditBackEnabled,
            creditBackWhen: DEDUCTION_APPLIED_TO_API[config.paidLeaveCreditBackOn] || 'NextMonth',
            formula: DEDUCTION_FORMULA_TO_API[config.deductionFormula] || 'GrossWorkingDays',
        },
        bonusPayout: {
            calcFrequency: FREQUENCY_TO_API[config.bonusCalculationFrequency] || 'Monthly',
            creditFrequency: FREQUENCY_TO_API[config.bonusCreditFrequency] || 'Quarterly',
        },
        updatedByRollNumber: authUser?.rollNumber || '',
    });

    const validateLeavePolicyPayload = () => {
        if (!authUser?.rollNumber) {
            showSnack('Cannot save: no logged-in user found.', false);
            return false;
        }
        if (!startMonth || startMonth < 1 || startMonth > 12) {
            showSnack('Please choose a valid start month for the policy.', false);
            return false;
        }
        if (!academicYear) {
            showSnack('Please choose the academic year first.', false);
            return false;
        }
        if (config.attendanceBonusEnabled && config.attendanceBonusType === 'amount' && (Number(config.attendanceBonusAmount) || 0) <= 0) {
            showSnack('Please enter the Attendance Bonus amount.', false);
            return false;
        }
        if (config.punctualityBonusEnabled && config.punctualityBonusType === 'amount' && (Number(config.punctualityBonusAmount) || 0) <= 0) {
            showSnack('Please enter the Punctuality Bonus amount.', false);
            return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateLeavePolicyPayload()) return;
        const payload = buildLeavePolicyPayload();
        setIsSavingMaster(true);
        try {
            const res = await axios.post(postleavepolicy, payload, {
                headers: { Authorization: `Bearer ${TOKEN}` },
            });
            if (res?.data && res.data.error === false) {
                showSnack(res.data.message || 'Leave policy saved successfully', true);
                setHasExistingPolicy(true);
            } else if (res?.data && res.data.error) {
                showSnack(res.data.message || 'Failed to save leave policy', false);
            } else {
                showSnack('Leave policy saved successfully', true);
                setHasExistingPolicy(true);
            }
        } catch (err) {
            console.error('postleavepolicy failed:', err);
            const apiMsg = err?.response?.data?.message;
            showSnack(apiMsg || 'Failed to save leave policy. Please try again.', false);
        } finally {
            setIsSavingMaster(false);
        }
    };


    return (
        <>
            <SnackBar open={open} color={color} setOpen={setOpen} status={status} message={message} />

            <Box sx={{ width: '100%' }}>
                {hideTabBar ? (
                    <Box sx={{ px: 2, pt: 2, pb: 0.5 }}>
                        <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>
                            {LP_PAGES[activeTab]?.title}
                        </Typography>
                        <Typography sx={{ fontSize: 13, color: '#6B7280', mt: 0.3 }}>
                            {isLoadingMaster ? 'Loading…' : LP_PAGES[activeTab]?.subtitle}
                        </Typography>
                    </Box>
                ) : (
                <Box sx={{
                    position: 'fixed',
                    top: '60px',
                    left: isExpanded ? '260px' : '80px',
                    right: 0,
                    backgroundColor: '#f2f2f2',
                    px: 2,
                    borderBottom: '1px solid #ddd',
                    zIndex: 1200,
                    transition: 'left 0.3s ease-in-out',
                    overflow: 'hidden',
                    py: 0.7,
                }}>
                    <Grid container sx={{ alignItems: 'center' }} spacing={1}>
                        <Grid size={{ xs: 6, md: 3 }} sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ ml: 1, minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 600, fontSize: '17px', lineHeight: 1.1 }} noWrap>
                                    Leave Policy Master
                                </Typography>
                                {isLoadingMaster ? (
                                    <Box sx={{
                                        display: 'inline-flex', alignItems: 'center', gap: 0.4,
                                        px: 0.8, py: 0.1, mt: 0.2, borderRadius: '20px',
                                        bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY}40`,
                                    }}>
                                        <CircularProgress size={9} sx={{ color: PRIMARY }} />
                                        <Typography sx={{ fontSize: 9, fontWeight: 700, color: PRIMARY_DARK }}>
                                            Loading…
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Typography sx={{ fontSize: 11, color: '#888' }} noWrap>
                                        Configure rules, leave types & calendar
                                    </Typography>
                                )}
                            </Box>
                        </Grid>

                        {!hideTabBar && (
                        <Grid size={{ xs: 12, md: 6 }} sx={{
                            display: 'flex', justifyContent: 'center',
                            order: { xs: 3, md: 2 },
                            mt: { xs: 1, md: 0 },
                        }}>
                            <Tabs
                                value={activeTab}
                                onChange={(_, v) => setActiveTab(v)}
                                variant="scrollable"
                                scrollButtons="auto"
                                slotProps={{ indicator: { sx: { display: 'none' } } }}
                                sx={{
                                    bgcolor: '#fff',
                                    minHeight: 36,
                                    borderRadius: '50px',
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                    overflow: 'visible',
                                    '& .MuiTabs-scroller': { overflow: 'visible !important' },
                                    '& .MuiTabs-flexContainer': { gap: 0.3 },
                                    '& .MuiTab-root': {
                                        textTransform: 'none',
                                        fontSize: '12.5px',
                                        color: '#555',
                                        fontWeight: 700,
                                        minWidth: 0,
                                        minHeight: 30, height: 30,
                                        px: 2,
                                        m: 0.4,
                                        borderRadius: '50px',
                                        transition: 'all 0.2s',
                                        overflow: 'visible',
                                    },
                                    '& .Mui-selected': {
                                        color: `${websiteSettings.textColor} !important`,
                                        bgcolor: websiteSettings.mainColor,
                                        boxShadow: '1px 1px 2px 0.5px rgba(0, 0, 0, 0.2)',
                                        border: '1px solid rgba(0,0,0,0.1)',
                                    },
                                    '& .MuiTabScrollButton-root': { width: 28 },
                                }}
                            >
                                <Tab label="Policy Setup" />
                                <Tab label="Leave Types" />
                                <Tab
                                    label={
                                        <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', pr: isNextMonthMissing ? 1.2 : 0 }}>
                                            Working Calendar
                                            {isNextMonthMissing && (
                                                <Tooltip
                                                    arrow
                                                    title={`Save the working calendar for ${nextMonthLabel} before it begins — plan ahead.`}
                                                >
                                                    <Box sx={{
                                                        position: 'absolute',
                                                        top: -7, right: -12,
                                                        width: 17, height: 17, borderRadius: '50%',
                                                        bgcolor: '#DC2626', color: '#fff',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        boxShadow: '0 0 0 2px #fff, 0 2px 5px rgba(220,38,38,0.55)',
                                                        zIndex: 2,
                                                        animation: 'wcPulse 1.8s infinite',
                                                        '@keyframes wcPulse': {
                                                            '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 2px #fff, 0 2px 5px rgba(220,38,38,0.55)' },
                                                            '50%': { transform: 'scale(1.18)', boxShadow: '0 0 0 2px #fff, 0 0 0 5px rgba(220,38,38,0.22), 0 3px 8px rgba(220,38,38,0.6)' },
                                                        },
                                                    }}>
                                                        <InfoOutlinedIcon sx={{ fontSize: 12 }} />
                                                    </Box>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    }
                                />
                                <Tab label="Assign Shifts" />
                            </Tabs>
                        </Grid>
                        )}

                    </Grid>
                </Box>
                )}

                <Box sx={{ px: 2, pt: hideTabBar ? 1.5 : '26px', pb: 4 }}>

                    {activeTab === 0 && (<>
                        <Section icon={RestartAltIcon} title="Auto-Renew" color="#2563EB"
                            subtitle="Roll this policy over into the next academic year automatically.">
                            <ToggleRow
                                label="Auto-renew for the next academic year"
                                description={
                                    autoRenew
                                        ? 'This policy will roll forward to the next academic year automatically — no manual setup needed.'
                                        : "The next academic year starts blank — you'll be prompted to renew or recreate when the next cycle starts."
                                }
                                checked={autoRenew}
                                onChange={setAutoRenew}
                            />
                        </Section>

                        <Section icon={AccessTimeIcon} title="Shift Timing & Work Hours" color="#0891B2"
                            subtitle="Add one or more shift schedules — timing and breaks are per shift; the grace period below is common and applies to every shift">

                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', p: 2, mb: 2, borderRadius: '7px', border: '1px solid #BAE6FD', bgcolor: '#F0F9FA' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                    <AccessTimeIcon sx={{ fontSize: 22, color: '#0891B2' }} />
                                    <Box>
                                        <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#0E7490' }}>Grace Period — common for all shifts</Typography>
                                        <Typography sx={{ fontSize: '11px', color: '#64748B' }}>A late mark is applied after this many minutes past each shift's start time.</Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ width: 200 }}>
                                    <NumberField
                                        label="Grace Period"
                                        value={config.gracePeriodMinutes}
                                        onChange={(v) => update('gracePeriodMinutes', v)}
                                        suffix="minutes"
                                    />
                                </Box>
                            </Box>

                            <Accordion
                                expanded={shiftsOpen}
                                onChange={(_, isExp) => setShiftsOpen(isExp)}
                                disableGutters
                                elevation={0}
                                sx={{
                                    border: '1px solid #BAE6FD',
                                    borderRadius: '10px !important',
                                    overflow: 'hidden',
                                    '&:before': { display: 'none' },
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={<ExpandMoreIcon sx={{ color: '#0891B2' }} />}
                                    sx={{
                                        bgcolor: '#F0F9FA',
                                        minHeight: 50,
                                        '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.2, my: 1 },
                                    }}
                                >
                                    <AccessTimeIcon sx={{ fontSize: 20, color: '#0891B2' }} />
                                    <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#0E7490' }}>
                                        Shifts
                                    </Typography>
                                    <Box sx={{ minWidth: 22, height: 20, px: 0.8, borderRadius: '7px', bgcolor: '#0891B2', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {(config.shifts || []).length}
                                    </Box>
                                    <Typography sx={{ fontSize: '11px', color: '#64748B' }}>
                                        {shiftsOpen ? 'Click to collapse' : 'Click to expand & edit shifts'}
                                    </Typography>
                                </AccordionSummary>

                                <AccordionDetails sx={{ p: 2, bgcolor: '#fff' }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {(config.shifts || []).map((shift, idx) => {
                                    const startMins = parseTimeToMinutes(shift.startTime);
                                    const endMins = parseTimeToMinutes(shift.endTime);
                                    let shiftMinutes = 0;
                                    if (startMins != null && endMins != null) {
                                        shiftMinutes = endMins - startMins;
                                        if (shiftMinutes < 0) shiftMinutes += 24 * 60;
                                    }
                                    const totalBreakMinutes =
                                        (Number(shift.lunchBreakMinutes) || 0) +
                                        (Number(shift.shortBreakMinutes) || 0);
                                    const effectiveMinutes = Math.max(0, shiftMinutes - totalBreakMinutes);
                                    const lateAfter = startMins != null
                                        ? (startMins + (Number(config.gracePeriodMinutes) || 0)) % (24 * 60)
                                        : null;
                                    const lateAfterStr = lateAfter != null
                                        ? formatTime12(`${String(Math.floor(lateAfter / 60)).padStart(2, '0')}:${String(lateAfter % 60).padStart(2, '0')}`)
                                        : '—';
                                    const breakExceedsShift = totalBreakMinutes > shiftMinutes && shiftMinutes > 0;
                                    const onlyOne = (config.shifts || []).length <= 1;

                                    return (
                                        <Box key={idx} sx={{
                                            border: '1.5px solid #BAE6FD',
                                            borderRadius: '7px',
                                            bgcolor: '#FAFEFF',
                                            overflow: 'hidden',
                                        }}>
                                            <Box sx={{
                                                display: 'flex', alignItems: 'center', gap: 1.5,
                                                px: 2, py: 1.2,
                                                bgcolor: '#F0F9FA', borderBottom: '1px solid #BAE6FD',
                                            }}>
                                                <Box sx={{
                                                    minWidth: 26, height: 26, borderRadius: '50%',
                                                    bgcolor: '#0891B2', color: '#fff',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '12px', fontWeight: 700, flexShrink: 0,
                                                }}>
                                                    {idx + 1}
                                                </Box>
                                                <TextField
                                                    size="small"
                                                    variant="standard"
                                                    placeholder="Shift name (e.g. Morning Shift)"
                                                    value={shift.shiftName || ''}
                                                    onChange={(e) => updateShift(idx, 'shiftName', e.target.value)}
                                                    sx={{
                                                        flex: 1, minWidth: 110,
                                                        '& .MuiInputBase-input': {
                                                            fontSize: '14px', fontWeight: 700, color: '#0E7490',
                                                        },
                                                        '& .MuiInput-underline:before': { borderBottomColor: '#BAE6FD' },
                                                    }}
                                                />
                                                <Chip
                                                    size="small"
                                                    label={`${formatTime12(shift.startTime)} – ${formatTime12(shift.endTime)} · ${formatHrs(effectiveMinutes)}`}
                                                    sx={{ height: 22, fontSize: '11px', fontWeight: 600, bgcolor: '#E0F2FE', color: '#0E7490', display: { xs: 'none', sm: 'inline-flex' } }}
                                                />
                                                {breakExceedsShift && (
                                                    <Tooltip title="Total break exceeds shift duration" arrow>
                                                        <WarningAmberIcon sx={{ fontSize: 17, color: '#DC2626', flexShrink: 0 }} />
                                                    </Tooltip>
                                                )}
                                                <Tooltip title={onlyOne ? 'At least one shift is required' : 'Remove this shift'}>
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            disabled={onlyOne}
                                                            onClick={() => removeShift(idx)}
                                                            sx={{
                                                                color: '#DC2626',
                                                                '&:hover': { bgcolor: '#FEF2F2' },
                                                                '&.Mui-disabled': { color: '#cbd5e1' },
                                                            }}
                                                        >
                                                            <DeleteIcon sx={{ fontSize: 18 }} />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </Box>

                                            <Box sx={{ p: 2 }}>
                                                <Grid container spacing={2}>
                                                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                                                        <TimeField
                                                            label="Shift Start Time"
                                                            value={shift.startTime}
                                                            onChange={(v) => updateShift(idx, 'startTime', v)}
                                                            helperText={`Begins at ${formatTime12(shift.startTime)}`}
                                                        />
                                                    </Grid>
                                                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                                                        <TimeField
                                                            label="Shift End Time"
                                                            value={shift.endTime}
                                                            onChange={(v) => updateShift(idx, 'endTime', v)}
                                                            helperText={`Ends at ${formatTime12(shift.endTime)}`}
                                                        />
                                                    </Grid>
                                                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                                                        <NumberField
                                                            label="Lunch Break"
                                                            value={shift.lunchBreakMinutes}
                                                            onChange={(v) => updateShift(idx, 'lunchBreakMinutes', v)}
                                                            suffix="minutes"
                                                            helperText="Excluded from working hours"
                                                        />
                                                    </Grid>
                                                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                                                        <NumberField
                                                            label="Overall Break (per day)"
                                                            value={shift.shortBreakMinutes}
                                                            onChange={(v) => updateShift(idx, 'shortBreakMinutes', v)}
                                                            suffix="minutes / day"
                                                            helperText="Total of all other breaks (tea, etc.) for the whole day"
                                                        />
                                                    </Grid>
                                                </Grid>

                                                <Grid container spacing={1.5} sx={{ mt: 1.5 }}>
                                                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                                                        <Box sx={{ p: 1.5, borderRadius: '7px', bgcolor: '#F0F9FA', border: '1px solid #BAE6FD' }}>
                                                            <Typography sx={{ fontSize: '10px', color: '#0E7490', fontWeight: 700, letterSpacing: '0.4px', mb: 0.3 }}>
                                                                TOTAL SHIFT HOURS
                                                            </Typography>
                                                            <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#0891B2', lineHeight: 1.2 }}>
                                                                {formatHrs(shiftMinutes)}
                                                            </Typography>
                                                            <Typography sx={{ fontSize: '10px', color: '#64748B' }}>
                                                                {formatTime12(shift.startTime)} → {formatTime12(shift.endTime)}
                                                            </Typography>
                                                        </Box>
                                                    </Grid>
                                                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                                                        <Box sx={{ p: 1.5, borderRadius: '7px', bgcolor: '#FFF7ED', border: '1px solid #FED7AA' }}>
                                                            <Typography sx={{ fontSize: '10px', color: '#9A3412', fontWeight: 700, letterSpacing: '0.4px', mb: 0.3 }}>
                                                                TOTAL BREAK TIME
                                                            </Typography>
                                                            <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#EA580C', lineHeight: 1.2 }}>
                                                                {formatHrs(totalBreakMinutes)}
                                                            </Typography>
                                                            <Typography sx={{ fontSize: '10px', color: '#64748B' }}>
                                                                Lunch {shift.lunchBreakMinutes || 0}m + Other {shift.shortBreakMinutes || 0}m
                                                            </Typography>
                                                        </Box>
                                                    </Grid>
                                                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                                                        <Box sx={{ p: 1.5, borderRadius: '7px', bgcolor: '#EFF5FF', border: '1px solid #C9BEFB' }}>
                                                            <Typography sx={{ fontSize: '10px', color: '#1E4C9A', fontWeight: 700, letterSpacing: '0.4px', mb: 0.3 }}>
                                                                EFFECTIVE LOGIN HOURS
                                                            </Typography>
                                                            <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#7C5CFC', lineHeight: 1.2 }}>
                                                                {formatHrs(effectiveMinutes)}
                                                            </Typography>
                                                            <Typography sx={{ fontSize: '10px', color: '#64748B' }}>
                                                                Shift − Breaks
                                                            </Typography>
                                                        </Box>
                                                    </Grid>
                                                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                                                        <Box sx={{ p: 1.5, borderRadius: '7px', bgcolor: '#FEF3C7', border: '1px solid #BAE6FD' }}>
                                                            <Typography sx={{ fontSize: '10px', color: '#92400E', fontWeight: 700, letterSpacing: '0.4px', mb: 0.3 }}>
                                                                LATE MARK AFTER
                                                            </Typography>
                                                            <Typography sx={{ fontSize: '18px', fontWeight: 800, color: '#0EA5E9', lineHeight: 1.2 }}>
                                                                {lateAfterStr}
                                                            </Typography>
                                                            <Typography sx={{ fontSize: '10px', color: '#64748B' }}>
                                                                Grace: {config.gracePeriodMinutes || 0} min
                                                            </Typography>
                                                        </Box>
                                                    </Grid>
                                                </Grid>

                                                {breakExceedsShift && (
                                                    <Box sx={{
                                                        mt: 2, p: 1.2, borderRadius: '7px',
                                                        bgcolor: '#FEF2F2', border: '1px solid #FECACA',
                                                        display: 'flex', alignItems: 'center', gap: 1,
                                                    }}>
                                                        <WarningAmberIcon sx={{ fontSize: 16, color: '#DC2626', flexShrink: 0 }} />
                                                        <Typography sx={{ fontSize: '11px', color: '#991B1B' }}>
                                                            Total break time exceeds shift duration. Please review.
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>
                                    );
                                })}

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                    <Button
                                        startIcon={<AddIcon />}
                                        onClick={addShift}
                                        disabled={(config.shifts || []).length >= MAX_SHIFTS}
                                        sx={{
                                            textTransform: 'none', fontWeight: 600, fontSize: '13px',
                                            color: '#0891B2',
                                            border: '1.5px dashed #BAE6FD',
                                            borderRadius: '7px',
                                            px: 2, py: 0.8,
                                            bgcolor: '#F0F9FA',
                                            '&:hover': { bgcolor: '#E0F2FE', borderColor: '#0891B2' },
                                            '&.Mui-disabled': { color: '#9CA3AF', borderColor: '#E5E7EB', bgcolor: '#F9FAFB' },
                                        }}
                                    >
                                        Add Another Shift
                                    </Button>
                                    <Typography sx={{ fontSize: '11.5px', color: (config.shifts || []).length >= MAX_SHIFTS ? '#DC2626' : '#9CA3AF', fontWeight: 600 }}>
                                        {(config.shifts || []).length} / {MAX_SHIFTS} shifts
                                        {(config.shifts || []).length >= MAX_SHIFTS && ' · limit reached'}
                                    </Typography>
                                </Box>
                            </Box>
                                </AccordionDetails>
                            </Accordion>

                            <Box sx={{
                                mt: 2, p: 1.5, borderRadius: '7px',
                                bgcolor: '#F0F9FA', border: '1px solid #BAE6FD',
                                display: 'flex', alignItems: 'flex-start', gap: 1,
                            }}>
                                <InfoOutlinedIcon sx={{ fontSize: 16, color: '#0891B2', mt: 0.2, flexShrink: 0 }} />
                                <Typography sx={{ fontSize: '11px', color: '#0E7490', lineHeight: 1.7 }}>
                                    Each shift defines its own start time, end time, grace period and breaks. Staff arriving after <strong>start time + grace</strong> will be flagged as <strong>late</strong> for that shift. Use the Punctuality section below to set the late penalty and emergency allowance.
                                </Typography>
                            </Box>
                        </Section>

                        <Section icon={AccountBalanceWalletIcon} title="Attendance, Punctuality & Bonus Payout" color="#6246E0"
                            subtitle="Configure attendance & punctuality bonuses, then set how often bonuses are calculated and credited">

                            <SubSection icon={CalendarMonthIcon} title="Attendance Bonus" color="#6246E0"
                                subtitle="Define rules for monthly attendance bonus eligibility">

                                <ToggleRow
                                    label="Enable Attendance Bonus"
                                    description="Staff will be eligible for attendance bonus when conditions are met"
                                    checked={config.attendanceBonusEnabled}
                                    onChange={(v) => update('attendanceBonusEnabled', v)}
                                />

                                {config.attendanceBonusEnabled && (
                                    <Box sx={{ mt: 2 }}>
                                        <Grid container spacing={2} alignItems="flex-start">
                                            <Grid size={{ xs: 12, sm: 6, md: 6, lg: 4 }}>
                                                <BonusAmountField
                                                    label="Bonus Amount (per month)"
                                                    type={config.attendanceBonusType}
                                                    amount={config.attendanceBonusAmount}
                                                    onType={(v) => update('attendanceBonusType', v)}
                                                    onAmount={(v) => update('attendanceBonusAmount', v)}
                                                    helperText="Paid each month when all attendance conditions are met"
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                                                <NumberField
                                                    label="Minimum Working Days Required (in the month)"
                                                    value={config.minWorkingDaysForBonus}
                                                    onChange={(v) => update('minWorkingDaysForBonus', v)}
                                                    suffix="days / month"
                                                    helperText="Employee must work at least this many days in the month to earn the bonus"
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                                                <ToggleRow
                                                    label="New Joiners Must Join on First Working Day"
                                                    description="New employees only — must join on the 1st working day."
                                                    checked={config.mustJoinFirstDay}
                                                    onChange={(v) => update('mustJoinFirstDay', v)}
                                                    sx={{ height: '100%' }}
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                                                <ToggleRow
                                                    label="Mandatory Day Attendance Required"
                                                    description="Absence on mandatory working days disqualifies the bonus"
                                                    checked={config.mandatoryDayAttendanceRequired}
                                                    onChange={(v) => update('mandatoryDayAttendanceRequired', v)}
                                                    sx={{ height: '100%' }}
                                                />
                                            </Grid>
                                        </Grid>
                                    </Box>
                                )}
                            </SubSection>

                            <SubSection icon={AccessTimeIcon} title="Punctuality & Late Arrival" color="#F59E0B"
                                subtitle="Configure late arrival thresholds, emergency lates, and penalty rules" divider>

                                <ToggleRow
                                    label="Enable Punctuality Bonus"
                                    description="Staff will receive punctuality bonus if late arrival rules are met"
                                    checked={config.punctualityBonusEnabled}
                                    onChange={(v) => update('punctualityBonusEnabled', v)}
                                />

                                {config.punctualityBonusEnabled && (
                                    <Box sx={{ mt: 2 }}>
                                        <Grid container spacing={2}>
                                            <Grid size={{ xs: 12, sm: 6, md: 6, lg: 4 }}>
                                                <BonusAmountField
                                                    label="Punctuality Bonus Amount (per month)"
                                                    type={config.punctualityBonusType}
                                                    amount={config.punctualityBonusAmount}
                                                    onType={(v) => update('punctualityBonusType', v)}
                                                    onAmount={(v) => update('punctualityBonusAmount', v)}
                                                    helperText="Total bonus paid per month when punctuality rules are met"
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                                                <NumberField
                                                    label="Lates Allowed"
                                                    value={config.emergencyLatesPerMonth}
                                                    onChange={(v) => update('emergencyLatesPerMonth', v)}
                                                    suffix="per month"
                                                    helperText="Free late arrivals without losing bonus"
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                                                <NumberField
                                                    label="Leaves Allowed (Informed)"
                                                    value={config.informedLeavesAllowed}
                                                    onChange={(v) => update('informedLeavesAllowed', v)}
                                                    suffix="per month"
                                                    helperText="Informed leaves allowed without losing bonus"
                                                />
                                            </Grid>
                                        </Grid>
                                    </Box>
                                )}

                                <Box sx={{ mt: config.punctualityBonusEnabled ? 2 : 0 }}>
                                    <ToggleRow
                                        label="Late Arrival Penalty"
                                        description="Deduct a penalty based on how late the staff arrives — works on its own, even without the punctuality bonus."
                                        checked={config.latePenaltyEnabled}
                                        onChange={(v) => update('latePenaltyEnabled', v)}
                                    />
                                </Box>

                                {config.latePenaltyEnabled && (
                                            <Box sx={{ mt: 2, p: 2, borderRadius: '7px', border: '1px solid #BAE6FD', bgcolor: '#E0F2FE' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4, flexWrap: 'wrap' }}>
                                                    <AccessTimeIcon sx={{ fontSize: 18, color: '#0EA5E9' }} />
                                                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>Late Penalty Slabs</Typography>
                                                </Box>
                                                <Typography sx={{ fontSize: 11, color: '#B45309', mb: 1.5 }}>
                                                    Penalty increases with how late the staff arrives (counted after start time + grace).
                                                </Typography>

                                                {(config.latePenaltySlabs || []).map((slab, i, arr) => {
                                                    const from = i === 0 ? 1 : (Number(arr[i - 1].uptoMinutes) || 0) + 1;
                                                    const onlyOneSlab = (config.latePenaltySlabs || []).length <= 1;
                                                    return (
                                                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap', bgcolor: '#fff', border: '1px solid #BAE6FD', borderRadius: '7px', px: 1.2, py: 0.9 }}>
                                                            <Box sx={{ minWidth: 22, height: 22, borderRadius: '50%', bgcolor: '#F59E0B', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</Box>
                                                            <Typography sx={{ fontSize: 12.5, color: '#555', fontWeight: 600 }}>Late by</Typography>
                                                            <Box sx={{ minWidth:"40px", px:1, py: 0.4, borderRadius: '7px', bgcolor: '#FEF3C7', fontSize: 12.5, fontWeight: 700, color: '#92400E', display:"flex", justifyContent:"center" }}>{from} min</Box>
                                                            <Typography sx={{ fontSize: 12.5, color: '#999' }}>to</Typography>
                                                            <TextField
                                                                size="small" type="number"
                                                                value={slab.uptoMinutes}
                                                                onChange={(e) => updateSlab(i, 'uptoMinutes', Math.max(from, parseInt(e.target.value) || 0))}
                                                                sx={{ width: 78, '& .MuiOutlinedInput-root': { height: 34, fontSize: 13, borderRadius: '7px', bgcolor: '#fff' } }}
                                                            />
                                                            <Typography sx={{ fontSize: 12.5, color: '#555' }}>min</Typography>
                                                            <ArrowForwardIcon sx={{ fontSize: 16, color: '#0EA5E9' }} />
                                                            <Typography sx={{ fontSize: 12.5, color: '#555', fontWeight: 600 }}>Deduct</Typography>
                                                            <TextField
                                                                size="small"
                                                                value={slab.amount}
                                                                onChange={(e) => updateSlab(i, 'amount', e.target.value.replace(/[^0-9.]/g, ''))}
                                                                slotProps={{ input: { startAdornment: <Typography sx={{ fontSize: 13, color: '#7C5CFC', fontWeight: 700, mr: 0.3 }}>₹</Typography> } }}
                                                                sx={{ width: 100, '& .MuiOutlinedInput-root': { height: 34, fontSize: 13, borderRadius: '7px', bgcolor: '#fff' } }}
                                                            />
                                                            <Box sx={{ flexGrow: 1 }} />
                                                            <Tooltip title={onlyOneSlab ? 'At least one slab is required' : 'Remove slab'}>
                                                                <span>
                                                                    <IconButton size="small" disabled={onlyOneSlab} onClick={() => removeSlab(i)} sx={{ color: '#DC2626', '&.Mui-disabled': { color: '#E5E7EB' } }}>
                                                                        <DeleteIcon sx={{ fontSize: 17 }} />
                                                                    </IconButton>
                                                                </span>
                                                            </Tooltip>
                                                        </Box>
                                                    );
                                                })}

                                                {(() => {
                                                    const slabs = config.latePenaltySlabs || [];
                                                    const lastUpto = slabs.length ? (Number(slabs[slabs.length - 1].uptoMinutes) || 0) : 0;
                                                    const beyond = config.latePenaltyBeyond || { type: 'half_day' };
                                                    return (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', bgcolor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '7px', px: 1.2, py: 0.9 }}>
                                                            <Box sx={{ minWidth: 22, height: 22, borderRadius: '50%', bgcolor: '#DC2626', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>∞</Box>
                                                            <Typography sx={{ fontSize: 12.5, color: '#555', fontWeight: 600 }}>More than</Typography>
                                                            <Box sx={{ px: 1, py: 0.4, borderRadius: '7px', bgcolor: '#FEE2E2', fontSize: 12.5, fontWeight: 700, color: '#991B1B' }}>{lastUpto} min</Box>
                                                            <ArrowForwardIcon sx={{ fontSize: 16, color: '#DC2626' }} />
                                                            <Typography sx={{ fontSize: 12.5, color: '#555', fontWeight: 600 }}>Deduct</Typography>
                                                            <Select
                                                                size="small"
                                                                value={beyond.type || 'half_day'}
                                                                onChange={(e) => updateBeyond('type', e.target.value)}
                                                                sx={{ minWidth: 150, height: 34, fontSize: 13, borderRadius: '7px', bgcolor: '#fff' }}
                                                            >
                                                                {LATE_BEYOND_OPTIONS.map(o => <MenuItem key={o.key} value={o.key} sx={{ fontSize: 13 }}>{o.label}</MenuItem>)}
                                                            </Select>
                                                            {beyond.type === 'amount' && (
                                                                <TextField
                                                                    size="small"
                                                                    value={beyond.amount}
                                                                    onChange={(e) => updateBeyond('amount', e.target.value.replace(/[^0-9.]/g, ''))}
                                                                    slotProps={{ input: { startAdornment: <Typography sx={{ fontSize: 13, color: '#7C5CFC', fontWeight: 700, mr: 0.3 }}>₹</Typography> } }}
                                                                    sx={{ width: 100, '& .MuiOutlinedInput-root': { height: 34, fontSize: 13, borderRadius: '7px', bgcolor: '#fff' } }}
                                                                />
                                                            )}
                                                        </Box>
                                                    );
                                                })()}

                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 1.2, flexWrap: 'wrap' }}>
                                                    <Button
                                                        size="small" startIcon={<AddIcon />} onClick={addSlab}
                                                        sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12.5, color: '#0EA5E9', border: '1.5px dashed #FCD34D', borderRadius: '7px', px: 1.5, '&:hover': { bgcolor: '#FEF3C7' } }}
                                                    >
                                                        Add Slab
                                                    </Button>
                                                    <Typography sx={{ fontSize: 11, color: '#92400E', fontWeight: 600 }}>
                                                        {(config.latePenaltySlabs || []).map((s, i, arr) => {
                                                            const f = i === 0 ? 1 : (Number(arr[i - 1].uptoMinutes) || 0) + 1;
                                                            return `${f}–${s.uptoMinutes}m: ₹${s.amount || 0}`;
                                                        }).join('   ·   ')}
                                                        {(config.latePenaltySlabs || []).length ? `   ·   >${Number(config.latePenaltySlabs[config.latePenaltySlabs.length - 1].uptoMinutes) || 0}m: ${beyondLabel(config.latePenaltyBeyond)}` : ''}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        )}

                                <Box sx={{ mt: 2 }}>
                                    <ToggleRow
                                        label="Permission Deduction"
                                        description="Charge for approved hourly permission. If the staff is also late, this adds on top of the late penalty."
                                        checked={config.permissionDeductionEnabled}
                                        onChange={(v) => update('permissionDeductionEnabled', v)}
                                    />
                                </Box>

                                {config.permissionDeductionEnabled && (
                                    <Box sx={{ mt: 2, p: 2, borderRadius: '7px', border: '1px solid #C7D2FE', bgcolor: '#EEF2FF' }}>
                                        <Grid container spacing={2} alignItems="flex-start">
                                            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                                                <NumberField
                                                    label="Free Permission (per month)"
                                                    value={config.permissionFreeHoursPerMonth}
                                                    onChange={(v) => update('permissionFreeHoursPerMonth', v)}
                                                    suffix="hours / month"
                                                    helperText="Permission hours allowed free each month"
                                                />
                                            </Grid>
                                            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                                                <AmountField
                                                    label="Permission Amount (per hour)"
                                                    value={config.permissionAmountPerHour}
                                                    onChange={(v) => update('permissionAmountPerHour', v)}
                                                    helperText="Charged per hour beyond the free allowance"
                                                />
                                            </Grid>
                                        </Grid>

                                        <Box sx={{ mt: 1.5, p: 1.5, borderRadius: '7px', bgcolor: '#fff', border: '1px dashed #C7D2FE', display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                            <InfoOutlinedIcon sx={{ fontSize: 16, color: '#4F46E5', mt: 0.2, flexShrink: 0 }} />
                                            <Typography sx={{ fontSize: 11, color: '#3730A3', lineHeight: 1.7 }}>
                                                First <strong>{Number(config.permissionFreeHoursPerMonth) || 0} hour(s)</strong> of permission each month are <strong>free</strong>. Beyond that, <strong>₹{Number(config.permissionAmountPerHour) || 0}/hour</strong> is deducted, and it stacks with the late penalty.
                                                Example: <strong>1 extra billable hour</strong> (₹{Number(config.permissionAmountPerHour) || 0}) + <strong>late by 1 min</strong> (₹{(config.latePenaltySlabs?.[0]?.amount) || 0}) = <strong>₹{(Number(config.permissionAmountPerHour) || 0) + (Number(config.latePenaltySlabs?.[0]?.amount) || 0)}</strong>.
                                            </Typography>
                                        </Box>
                                    </Box>
                                )}
                            </SubSection>

                            {anyBonusEnabled && (
                            <SubSection icon={AccountBalanceWalletIcon} title="Bonus Payout Schedule" color="#2563EB"
                                subtitle="Choose when the auto-calculated bonus is credited to salary" divider>

                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 8, md: 5, lg: 4 }}>
                                        <Box>
                                            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#555', mb: 0.5 }}>When is the bonus credited?</Typography>
                                            <Autocomplete
                                                size="small"
                                                options={PAYOUT_FREQUENCIES}
                                                value={config.bonusCreditFrequency}
                                                onChange={(_, v) => update('bonusCreditFrequency', v || 'Quarterly')}
                                                renderInput={(params) => (
                                                    <TextField {...params} placeholder="Select"
                                                        sx={{ '& .MuiOutlinedInput-root': { fontSize: '13px', borderRadius: '7px', height: 36 } }}
                                                    />
                                                )}
                                            />
                                            <Typography sx={{ fontSize: '10px', color: '#9CA3AF', mt: 0.3 }}>The eligible bonus is auto-calculated each month and paid out on this schedule</Typography>
                                        </Box>
                                    </Grid>
                                </Grid>

                                <Box sx={{
                                    mt: 2, p: 1.5, borderRadius: '7px',
                                    bgcolor: '#F3F0FE', border: '1px solid #C9BEFB',
                                    display: 'flex', alignItems: 'center', gap: 1,
                                }}>
                                    <InfoOutlinedIcon sx={{ fontSize: 16, color: '#2563EB', flexShrink: 0 }} />
                                    <Typography sx={{ fontSize: '11px', color: '#5B21B6' }}>
                                        The bonus is <strong>auto-calculated each month</strong> and <strong>credited {config.bonusCreditFrequency.toLowerCase()}</strong>.
                                        Only months where eligibility criteria are met will be included in the payout.
                                    </Typography>
                                </Box>
                            </SubSection>
                            )}
                        </Section>

                        <Section icon={EventBusyIcon} title="Leave & Salary Deduction" color="#DC2626"
                            subtitle="Define how leave affects salary — deduction rules and paid leave allocation">

                            <ToggleRow
                                label="Applies to Paid Leave Too"
                                description="If a paid leave is taken, its salary is first deducted and then credited back later — set the deduct & credit-back schedule below."
                                checked={config.deductionAppliesToPaidLeave}
                                onChange={(v) => update('deductionAppliesToPaidLeave', v)}
                            />

                            {config.deductionAppliesToPaidLeave && (
                                <Box sx={{ mt: 2, p: 2, border: '1px solid #FECACA', borderRadius: '7px', bgcolor: '#FFF8F8' }}>
                                    <Grid container spacing={2} alignItems="flex-start">
                                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#555', mb: 0.5 }}>
                                                Deduct salary in
                                            </Typography>
                                            <Autocomplete
                                                size="small"
                                                options={['Same Month', 'Next Month', 'Quarterly', 'Half-Yearly', 'Yearly']}
                                                value={config.paidLeaveDeductionAppliedOn}
                                                onChange={(_, v) => update('paidLeaveDeductionAppliedOn', v || 'Same Month')}
                                                renderInput={(params) => (
                                                    <TextField {...params} placeholder="Select"
                                                        sx={{ '& .MuiOutlinedInput-root': { fontSize: '13px', borderRadius: '7px', height: 36, bgcolor: '#fff' } }}
                                                    />
                                                )}
                                            />
                                            <Typography sx={{ fontSize: '10px', color: '#9CA3AF', mt: 0.4 }}>
                                                Salary register where the leave amount is deducted
                                            </Typography>
                                        </Grid>

                                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                            <ToggleRow
                                                label="Credit Back (Refund)"
                                                description="Refund the deducted paid-leave amount in a later salary"
                                                checked={config.paidLeaveCreditBackEnabled}
                                                onChange={(v) => update('paidLeaveCreditBackEnabled', v)}
                                            />
                                        </Grid>

                                        {config.paidLeaveCreditBackEnabled && (
                                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                                <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#555', mb: 0.5 }}>
                                                    Credit back in
                                                </Typography>
                                                <Autocomplete
                                                    size="small"
                                                    options={['Next Month', 'Quarterly', 'Half-Yearly', 'Yearly']}
                                                    value={config.paidLeaveCreditBackOn}
                                                    onChange={(_, v) => update('paidLeaveCreditBackOn', v || 'Next Month')}
                                                    renderInput={(params) => (
                                                        <TextField {...params} placeholder="Select"
                                                            sx={{ '& .MuiOutlinedInput-root': { fontSize: '13px', borderRadius: '7px', height: 36, bgcolor: '#fff' } }}
                                                        />
                                                    )}
                                                />
                                                <Typography sx={{ fontSize: '10px', color: '#9CA3AF', mt: 0.4 }}>
                                                    Salary register where the amount is refunded
                                                </Typography>
                                            </Grid>
                                        )}
                                    </Grid>

                                    <Box sx={{ mt: 2, p: 1.5, borderRadius: '7px', bgcolor: '#fff', border: '1px dashed #FCA5A5', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                            <Box sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <RemoveCircleOutlineIcon sx={{ fontSize: 18, color: '#DC2626' }} />
                                            </Box>
                                            <Box>
                                                <Typography sx={{ fontSize: '9px', color: '#9CA3AF', fontWeight: 700, letterSpacing: '0.4px' }}>DEDUCTED</Typography>
                                                <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#DC2626', lineHeight: 1.2 }}>{config.paidLeaveDeductionAppliedOn}</Typography>
                                            </Box>
                                        </Box>

                                        {config.paidLeaveCreditBackEnabled && (
                                            <>
                                                <ArrowForwardIcon sx={{ fontSize: 18, color: '#9CA3AF' }} />
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                                    <Box sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <AddCircleOutlineIcon sx={{ fontSize: 18, color: '#16A34A' }} />
                                                    </Box>
                                                    <Box>
                                                        <Typography sx={{ fontSize: '9px', color: '#9CA3AF', fontWeight: 700, letterSpacing: '0.4px' }}>CREDITED BACK</Typography>
                                                        <Typography sx={{ fontSize: '12.5px', fontWeight: 700, color: '#16A34A', lineHeight: 1.2 }}>{config.paidLeaveCreditBackOn}</Typography>
                                                    </Box>
                                                </Box>
                                            </>
                                        )}

                                        <Typography sx={{ fontSize: '11px', color: '#555', flexBasis: '100%', mt: 0.3, lineHeight: 1.6 }}>
                                            {config.paidLeaveCreditBackEnabled ? (
                                                <>For paid leave (e.g. <strong>1 casual leave / month</strong>), salary is <strong style={{ color: '#DC2626' }}>deducted in the {config.paidLeaveDeductionAppliedOn.toLowerCase()}</strong> register and <strong style={{ color: '#16A34A' }}>credited back in the {config.paidLeaveCreditBackOn.toLowerCase()}</strong> register — so the employee is effectively not charged.</>
                                            ) : (
                                                <>The paid-leave amount is <strong style={{ color: '#DC2626' }}>deducted in the {config.paidLeaveDeductionAppliedOn.toLowerCase()}</strong> register and is <strong>not refunded</strong>. Turn on <strong>Credit Back</strong> if the school refunds it later.</>
                                            )}
                                        </Typography>
                                    </Box>
                                </Box>
                            )}

                            <Box sx={{ mt: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                    <GavelIcon sx={{ fontSize: 16, color: '#DC2626' }} />
                                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#333' }}>
                                        Salary Deduction Formula
                                    </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                                    {[
                                        { key: 'gross_by_working_days', label: 'Gross / Working Days', formula: 'Monthly Gross Salary ÷ Total Working Days of the Month', example: 'e.g., ₹30,000 / 26 working days = ₹1,153.84 per leave day' },
                                        { key: 'gross_by_calendar_days', label: 'Gross / Calendar Days', formula: 'Monthly Gross Salary ÷ Total Days in the Month', example: 'e.g., ₹30,000 / 30 calendar days = ₹1,000 per leave day' },
                                        { key: 'gross_by_fixed_days', label: 'Gross / Fixed (30)', formula: 'Monthly Gross Salary ÷ 30 (fixed)', example: 'e.g., ₹30,000 / 30 = ₹1,000 per leave day (every month)' },
                                    ].map((opt) => {
                                        const isSelected = config.deductionFormula === opt.key;
                                        return (
                                            <Box
                                                key={opt.key}
                                                onClick={() => update('deductionFormula', opt.key)}
                                                sx={{
                                                    px: 2,
                                                    py: 1.5,
                                                    borderRadius: '7px',
                                                    cursor: 'pointer',
                                                    border: `2px solid ${isSelected ? '#DC2626' : '#E5E7EB'}`,
                                                    bgcolor: isSelected ? '#FEF2F2' : '#FAFAFA',
                                                    transition: '0.2s',
                                                    minWidth: 200,
                                                    flex: 1,
                                                    '&:hover': { borderColor: isSelected ? '#DC2626' : '#F87171' },
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    <Box sx={{
                                                        width: 16, height: 16, borderRadius: '50%', flexShrink: 0, mt: '2px',
                                                        border: `2px solid ${isSelected ? '#DC2626' : '#D1D5DB'}`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }}>
                                                        {isSelected && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#DC2626' }} />}
                                                    </Box>
                                                    <Box>
                                                        <Typography sx={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#991B1B' : '#333' }}>
                                                            {opt.label}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '11px', color: isSelected ? '#B91C1C' : '#777', fontStyle: 'italic', mt: 0.2 }}>
                                                            {opt.formula}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: '10px', color: isSelected ? '#DC2626' : '#9CA3AF', fontWeight: 600, mt: 0.5 }}>
                                                            {opt.example}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Box>
                        </Section>

                        {(() => {
                            const today = dayjs();
                            const todayMonth = today.month() + 1;
                            const todayDay = today.date();
                            const inEditWindow = todayMonth === Number(startMonth) && todayDay <= 20;
                            const updateLocked = hasExistingPolicy && !inEditWindow;
                            const isUpdate = hasExistingPolicy;
                            const buttonLabel = isUpdate ? 'Update Policy' : 'Save Policy';
                            const buttonLoadingLabel = isUpdate ? 'Updating…' : 'Saving…';
                            const startMonthName = MONTH_NAMES[startMonth - 1];

                            const thisYearStart = today.month(startMonth - 1).date(1).startOf('day');
                            const nextWindowOpens =
                                today.isBefore(thisYearStart) ? thisYearStart
                                    : todayDay <= 20 && todayMonth === Number(startMonth) ? thisYearStart
                                        : thisYearStart.add(1, 'year');

                            return (
                                <Box sx={{ py: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                                    {updateLocked && (
                                        <Box sx={{
                                            width: '100%', maxWidth: 640,
                                            p: 1.4, borderRadius: '7px',
                                            bgcolor: '#FEF3C7', border: '1px solid #BAE6FD',
                                            display: 'flex', alignItems: 'flex-start', gap: 1,
                                        }}>
                                            <LockIcon sx={{ fontSize: 18, color: '#0EA5E9', mt: 0.2, flexShrink: 0 }} />
                                            <Box>
                                                <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#92400E', letterSpacing: 0.2 }}>
                                                    EDITING LOCKED
                                                </Typography>
                                                <Typography sx={{ fontSize: 11.5, color: '#92400E', mt: 0.3, lineHeight: 1.55 }}>
                                                    You can only update this policy within the first <strong>20 days</strong> of{' '}
                                                    <strong>{startMonthName}</strong>. The next edit window opens on{' '}
                                                    <strong>{nextWindowOpens.format('D MMMM YYYY')}</strong>.
                                                </Typography>
                                            </Box>
                                        </Box>
                                    )}

                                    {hasExistingPolicy && inEditWindow && (
                                        <Box sx={{
                                            width: '100%', maxWidth: 640,
                                            p: 1.2, borderRadius: '7px',
                                            bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY}30`,
                                            display: 'flex', alignItems: 'center', gap: 1,
                                        }}>
                                            <InfoOutlinedIcon sx={{ fontSize: 16, color: PRIMARY, flexShrink: 0 }} />
                                            <Typography sx={{ fontSize: 11.5, color: PRIMARY_DARK, lineHeight: 1.55 }}>
                                                Edit window is <strong>open</strong> — you have until{' '}
                                                <strong>{thisYearStart.date(20).format('D MMMM YYYY')}</strong> to update this year's policy.
                                            </Typography>
                                        </Box>
                                    )}

                                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                        <Button
                                            onClick={handleClearAll}
                                            disabled={isSavingMaster || isLoadingMaster}
                                            startIcon={<RestartAltIcon sx={{ fontSize: 18 }} />}
                                            sx={{
                                                borderRadius: '999px', textTransform: 'none',
                                                fontSize: 13, fontWeight: 700,
                                                color: '#374151', bgcolor: '#fff',
                                                border: '1px solid #E5E7EB',
                                                px: 2.5, height: 38, minWidth: 120,
                                                boxShadow: '0 2px 6px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                                                transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                                                '&:hover': {
                                                    bgcolor: '#F9FAFB', borderColor: '#D1D5DB',
                                                    boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                                                    transform: 'translateY(-1px)',
                                                },
                                                '&:active': { transform: 'translateY(0)' },
                                                '&.Mui-disabled': {
                                                    bgcolor: '#F9FAFB', color: '#9CA3AF',
                                                    border: '1px solid #E5E7EB', boxShadow: 'none',
                                                },
                                            }}
                                        >
                                            Clear All
                                        </Button>

                                        <Tooltip
                                            arrow
                                            title={updateLocked
                                                ? `Updates open in the first 20 days of ${startMonthName}. Next window: ${nextWindowOpens.format('D MMM YYYY')}.`
                                                : ''}
                                        >
                                            <Box sx={{ display: 'inline-flex' }}>
                                                <Button
                                                    onClick={handleSave}
                                                    disabled={isSavingMaster || isLoadingMaster || updateLocked}
                                                    startIcon={
                                                        isSavingMaster
                                                            ? <CircularProgress size={14} sx={{ color: '#fff' }} />
                                                            : updateLocked
                                                                ? <LockIcon sx={{ fontSize: 16 }} />
                                                                : <SaveIcon sx={{ fontSize: 18 }} />
                                                    }
                                                    sx={{
                                                        borderRadius: '999px', textTransform: 'none',
                                                        fontSize: 13, fontWeight: 700,
                                                        color: '#fff',
                                                        background: `linear-gradient(90deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)`,
                                                        px: 3, height: 38, minWidth: 150,
                                                        boxShadow: `0 4px 12px ${PRIMARY}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
                                                        transition: 'transform 0.2s, box-shadow 0.2s, filter 0.2s',
                                                        '&:hover': {
                                                            filter: 'brightness(1.06)',
                                                            boxShadow: `0 8px 20px ${PRIMARY}55, inset 0 1px 0 rgba(255,255,255,0.2)`,
                                                            transform: 'translateY(-1px)',
                                                        },
                                                        '&:active': {
                                                            transform: 'translateY(0)',
                                                            boxShadow: `0 3px 10px ${PRIMARY}35`,
                                                        },
                                                        '&.Mui-disabled': {
                                                            background: '#E5E7EB', color: '#9CA3AF',
                                                            boxShadow: 'none',
                                                        },
                                                    }}
                                                >
                                                    {isSavingMaster ? buttonLoadingLabel : buttonLabel}
                                                </Button>
                                            </Box>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            );
                        })()}
                    </>)}

                    {activeTab === 1 && (
                        <LeaveTypesTab
                            academicYear={academicYear}
                            authUser={authUser}
                            showSnack={showSnack}
                        />
                    )}

                    {activeTab === 2 && (<>
                        <Section icon={CalendarMonthIcon} title="Working Calendar" color="#0D9488"
                            subtitle="Define default working days and customize each month — click a date to cycle: Working → Holiday → Mandatory">

                            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#555', mb: 1 }}>
                                Default Working Days (applied to every month)
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mb: 2.5, flexWrap: 'wrap' }}>
                                {DAY_LABELS.map((label, idx) => {
                                    const isActive = config.defaultWorkingDays.includes(idx);
                                    return (
                                        <Box
                                            key={idx}
                                            onClick={() => toggleDefaultWorkingDay(idx)}
                                            sx={{
                                                width: 52,
                                                py: 0.8,
                                                textAlign: 'center',
                                                borderRadius: '7px',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                border: `1.5px solid ${isActive ? '#16A34A' : '#E5E7EB'}`,
                                                bgcolor: isActive ? '#EFF5FF' : '#FAFAFA',
                                                color: isActive ? '#16A34A' : '#999',
                                                transition: '0.2s',
                                                '&:hover': { borderColor: isActive ? '#DC2626' : '#16A34A', transform: 'scale(1.05)' },
                                            }}
                                        >
                                            {label}
                                        </Box>
                                    );
                                })}
                            </Box>
                            <Typography sx={{ fontSize: '10px', color: '#9CA3AF', mb: 2 }}>
                                Click a day to toggle. Green = working day, grey = holiday. These defaults apply to all months unless overridden below.
                            </Typography>

                            <Box sx={{
                                mb: 2, p: 1.2, borderRadius: '7px',
                                bgcolor: '#F3F0FE', border: '1px solid #C9BEFB',
                                display: 'flex', alignItems: 'flex-start', gap: 1,
                            }}>
                                <InfoOutlinedIcon sx={{ fontSize: 16, color: '#6246E0', mt: 0.2, flexShrink: 0 }} />
                                <Typography sx={{ fontSize: 11, color: '#1E3A8A', lineHeight: 1.7 }}>
                                    You can edit and save the working calendar only for <strong>upcoming months</strong>.
                                    The <strong>current month</strong> and <strong>past months</strong> are read-only — once a month has started, its working-day pattern is locked.
                                    Plan ahead by saving each upcoming month before it begins.
                                </Typography>
                            </Box>

                            {isReadOnlyMonth && (
                                <Box sx={{
                                    mb: 2, p: 1.2, borderRadius: '7px',
                                    bgcolor: '#FEF2F2', border: '1px solid #FECACA',
                                    display: 'flex', alignItems: 'center', gap: 1,
                                }}>
                                    <InfoOutlinedIcon sx={{ fontSize: 16, color: '#DC2626', flexShrink: 0 }} />
                                    <Typography sx={{ fontSize: 11, color: '#991B1B', lineHeight: 1.6 }}>
                                        <strong>{calendarMonth.format('MMMM YYYY')}</strong> {isCurrentMonth ? 'is the current month' : 'is in the past'} and is <strong>read-only</strong>. You cannot edit or save changes for this month — navigate to an upcoming month using the arrow.
                                    </Typography>
                                </Box>
                            )}

                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <IconButton
                                        size="small"
                                        disabled={!canGoPrev}
                                        onClick={() => canGoPrev && setCalendarMonth(prev => prev.subtract(1, 'month'))}
                                        sx={{ border: '1px solid #E5E7EB', width: 28, height: 28, '&:hover': { bgcolor: '#F3F4F6' }, '&.Mui-disabled': { opacity: 0.3 } }}
                                    >
                                        <ChevronLeftIcon sx={{ fontSize: 18 }} />
                                    </IconButton>
                                    <Box sx={{ minWidth: 180, textAlign: 'center' }}>
                                        <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#111' }}>
                                            {calendarMonth.format('MMMM YYYY')}
                                        </Typography>
                                        <Typography sx={{ fontSize: '10px', fontWeight: 600, color: isReadOnlyMonth ? '#DC2626' : calendarMonth.isSame(currentMonth.add(1, 'month'), 'month') ? '#0891B2' : '#9CA3AF' }}>
                                            {isPastMonth ? 'Past Month · Read-only' : isCurrentMonth ? 'Current Month · Read-only' : calendarMonth.isSame(currentMonth.add(1, 'month'), 'month') ? 'Next Month · Editable' : 'Upcoming · Editable'}
                                        </Typography>
                                    </Box>
                                    <IconButton
                                        size="small"
                                        disabled={!canGoNext}
                                        onClick={() => canGoNext && setCalendarMonth(prev => prev.add(1, 'month'))}
                                        sx={{ border: '1px solid #E5E7EB', width: 28, height: 28, '&:hover': { bgcolor: '#F3F4F6' }, '&.Mui-disabled': { opacity: 0.3 } }}
                                    >
                                        <ChevronRightIcon sx={{ fontSize: 18 }} />
                                    </IconButton>

                                    {(() => {
                                        let pill;
                                        if (isReadOnlyMonth) {
                                            pill = { label: 'Read-only', color: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB' };
                                        } else if (isMonthSaved && isMonthDirty) {
                                            pill = { label: 'Modified', color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC' };
                                        } else if (isMonthSaved) {
                                            pill = { label: 'Saved', color: '#16A34A', bg: '#EFF5FF', border: '#C9BEFB' };
                                        } else {
                                            pill = { label: 'Unsaved', color: '#F59E0B', bg: '#E0F2FE', border: '#BAE6FD' };
                                        }
                                        return (
                                            <Typography sx={{
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                color: pill.color,
                                                bgcolor: pill.bg,
                                                border: `1px solid ${pill.border}`,
                                                borderRadius: '7px',
                                                px: 1.5,
                                                py: 0.3,
                                                ml: 1,
                                            }}>
                                                {pill.label}
                                            </Typography>
                                        );
                                    })()}
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                    {[
                                        { label: 'Working', count: calendarStats.working, ...DAY_COLORS.working },
                                        { label: 'Holiday', count: calendarStats.holiday, ...DAY_COLORS.holiday },
                                        { label: 'Mandatory', count: calendarStats.mandatory, ...DAY_COLORS.mandatory },
                                    ].map((s) => (
                                        <Box key={s.label} sx={{
                                            display: 'flex', alignItems: 'center', gap: 0.8,
                                            px: 1.5, py: 0.5, borderRadius: '20px',
                                            bgcolor: s.bg, border: `1px solid ${s.border}`,
                                        }}>
                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color, flexShrink: 0 }} />
                                            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: s.color }}>
                                                {s.count} {s.label}
                                            </Typography>
                                        </Box>
                                    ))}
                                    <Tooltip title={isReadOnlyMonth ? 'You cannot edit the current or past months. Navigate to an upcoming month to make changes.' : ''} arrow disableHoverListener={!isReadOnlyMonth}>
                                        <span>
                                            <Button
                                                variant="contained"
                                                startIcon={
                                                    isSavingMonth
                                                        ? <CircularProgress size={14} sx={{ color: '#fff' }} />
                                                        : isMonthUpdate
                                                            ? <EditIcon sx={{ fontSize: 16 }} />
                                                            : <SaveIcon sx={{ fontSize: 16 }} />
                                                }
                                                disabled={isReadOnlyMonth || isSavingMonth || !canSaveMonth}
                                                onClick={handleSaveMonth}
                                                sx={{
                                                    textTransform: 'none',
                                                    bgcolor: '#0D9488',
                                                    color: '#fff',
                                                    borderRadius: '7px',
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    letterSpacing: 0.2,
                                                    px: 2,
                                                    height: 32,
                                                    boxShadow: '0 2px 6px rgba(13, 148, 136, 0.25)',
                                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
                                                    '&:hover': {
                                                        bgcolor: '#0F766E',
                                                        boxShadow: '0 4px 12px rgba(13, 148, 136, 0.4)',
                                                        transform: 'translateY(-1px)',
                                                    },
                                                    '&:active': {
                                                        transform: 'translateY(0)',
                                                        boxShadow: '0 1px 4px rgba(13, 148, 136, 0.25)',
                                                    },
                                                    '&.Mui-disabled': {
                                                        bgcolor: (isMonthSaved && !isMonthDirty && !isReadOnlyMonth) ? '#DBEAFE' : '#F3F4F6',
                                                        color: (isMonthSaved && !isMonthDirty && !isReadOnlyMonth) ? '#6246E0' : '#9CA3AF',
                                                        boxShadow: 'none',
                                                        border: (isMonthSaved && !isMonthDirty && !isReadOnlyMonth) ? '1px solid #C9BEFB' : '1px solid #E5E7EB',
                                                    },
                                                }}
                                            >
                                                {isReadOnlyMonth
                                                    ? 'Read-only'
                                                    : isSavingMonth
                                                        ? (isMonthUpdate ? 'Updating…' : 'Saving…')
                                                        : isMonthUpdate
                                                            ? `Update ${calendarMonth.format('MMM YYYY')}`
                                                            : `Save ${calendarMonth.format('MMM YYYY')}`}
                                            </Button>
                                        </span>
                                    </Tooltip>
                                </Box>
                            </Box>

                            <Box sx={{ border: '1px solid #E8DDEA', borderRadius: '7px', overflow: 'hidden', position: 'relative' }}>
                                {isLoadingCalendar && (
                                    <Box sx={{
                                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                        bgcolor: 'rgba(255,255,255,0.6)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        zIndex: 2, backdropFilter: 'blur(1px)',
                                    }}>
                                        <Box sx={{
                                            display: 'flex', alignItems: 'center', gap: 1,
                                            px: 1.5, py: 0.6, borderRadius: '20px',
                                            bgcolor: '#fff', border: '1px solid #99F6E4',
                                            boxShadow: '0 2px 8px rgba(13, 148, 136, 0.2)',
                                        }}>
                                            <CircularProgress size={12} sx={{ color: '#0D9488' }} />
                                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#0D9488' }}>
                                                Loading {calendarMonth.format('MMM YYYY')}…
                                            </Typography>
                                        </Box>
                                    </Box>
                                )}
                                <Grid container>
                                    {DAY_LABELS.map((label, idx) => (
                                        <Grid key={idx} size={{ xs: 12 / 7 }} sx={{
                                            textAlign: 'center',
                                            py: 1,
                                            bgcolor: '#faf6fc',
                                            borderBottom: '1px solid #E8DDEA',
                                            borderRight: idx < 6 ? '1px solid #E8DDEA' : 'none',
                                        }}>
                                            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: idx === 0 ? '#DC2626' : '#555' }}>
                                                {label}
                                            </Typography>
                                        </Grid>
                                    ))}
                                </Grid>

                                <Grid container>
                                    {Array.from({ length: calendarMonth.startOf('month').day() }).map((_, i) => (
                                        <Grid key={`empty-${i}`} size={{ xs: 12 / 7 }} sx={{
                                            minHeight: 56,
                                            borderBottom: '1px solid #E8DDEA',
                                            borderRight: '1px solid #E8DDEA',
                                            bgcolor: '#FAFAFA',
                                        }} />
                                    ))}

                                    {calendarDays.map((date) => {
                                        const type = getDayType(date);
                                        const dc = DAY_COLORS[type];
                                        const isToday = date.isSame(dayjs(), 'day');
                                        const dayNum = date.date();
                                        const cellIndex = (calendarMonth.startOf('month').day() + dayNum - 1) % 7;

                                        return (
                                            <Grid key={date.format('YYYY-MM-DD')} size={{ xs: 12 / 7 }}>
                                                <Box
                                                    onClick={() => cycleDayType(date)}
                                                    sx={{
                                                        minHeight: 56,
                                                        px: 0.5,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: isReadOnlyMonth ? 'not-allowed' : 'pointer',
                                                        bgcolor: dc.bg,
                                                        opacity: isReadOnlyMonth ? 0.7 : 1,
                                                        borderBottom: '1px solid #E8DDEA',
                                                        borderRight: cellIndex < 6 ? '1px solid #E8DDEA' : 'none',
                                                        transition: '0.15s',
                                                        userSelect: 'none',
                                                        '&:hover': isReadOnlyMonth ? {} : { filter: 'brightness(0.95)' },
                                                        '&:active': isReadOnlyMonth ? {} : { filter: 'brightness(0.88)' },
                                                    }}
                                                >
                                                    <Typography sx={{
                                                        fontSize: '13px',
                                                        fontWeight: isToday ? 800 : 600,
                                                        color: dc.color,
                                                    }}>
                                                        {dayNum}
                                                    </Typography>
                                                    {isToday && (
                                                        <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: dc.color, mt: 0.2 }} />
                                                    )}
                                                    <Typography sx={{ fontSize: '8px', fontWeight: 600, color: dc.color, opacity: 0.7, mt: 0.2, minHeight: 10 }}>
                                                        {type === 'mandatory' ? 'MWD' : type === 'holiday' ? 'OFF' : '\u00A0'}
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                        );
                                    })}
                                </Grid>
                            </Box>

                            <Box sx={{
                                mt: 2, p: 1.5, borderRadius: '7px',
                                bgcolor: '#F0FDFA', border: '1px solid #99F6E4',
                                display: 'flex', alignItems: 'flex-start', gap: 1,
                            }}>
                                <InfoOutlinedIcon sx={{ fontSize: 16, color: '#0D9488', mt: 0.2, flexShrink: 0 }} />
                                <Box>
                                    <Typography sx={{ fontSize: '11px', color: '#134E4A', lineHeight: 1.7 }}>
                                        <strong>Click any date</strong> (in an upcoming month) to cycle through: <strong style={{ color: '#16A34A' }}>Working</strong> → <strong style={{ color: '#DC2626' }}>Holiday</strong> → <strong style={{ color: '#EA580C' }}>Mandatory Working Day (MWD)</strong> → Working.
                                        Days without overrides follow the default weekly pattern above. The <strong>Total Working Days ({calendarStats.working + calendarStats.mandatory})</strong> value is used in the salary deduction formula.
                                        The <strong>current month</strong> and <strong>past months</strong> are read-only — only future months can be edited.
                                    </Typography>
                                </Box>
                            </Box>
                        </Section>
                    </>)}

                    {activeTab === 3 && (
                        <AssignShiftsTab
                            shifts={config.shifts || []}
                            websiteSettings={websiteSettings}
                            academicYear={academicYear}
                            showSnack={showSnack}
                        />
                    )}

                </Box>
            </Box>

            <Dialog
                open={renewDialog.open}
                onClose={closeRenewDialog}
                maxWidth="xs"
                fullWidth
                PaperProps={{ sx: { borderRadius: '7px', overflow: 'hidden' } }}
            >
                <Box sx={{
                    px: 3, py: 2,
                    background: `linear-gradient(135deg, ${PRIMARY_LIGHT} 0%, #fff 60%)`,
                    borderBottom: `1px solid ${PRIMARY}25`,
                    display: 'flex', alignItems: 'center', gap: 1.2,
                }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
                            New Academic Year Detected
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: '#6B7280', mt: 0.2 }}>
                            No policy yet for <strong>{academicYear}</strong>
                        </Typography>
                    </Box>
                    <IconButton size="small" onClick={closeRenewDialog} sx={{ width: 28, height: 28 }}>
                        <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Box>
                <Box sx={{ px: 3, py: 2 }}>
                    <Typography sx={{ fontSize: 12.5, color: '#374151', lineHeight: 1.6, mb: 2 }}>
                        We found a saved policy from <strong>{renewDialog.prevAY}</strong>.
                        Would you like to restore it for the new academic year, or start from scratch?
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Button
                            onClick={handleRestorePrev}
                            startIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
                            sx={{
                                textTransform: 'none', justifyContent: 'flex-start',
                                px: 1.6, py: 1.2, borderRadius: '7px',
                                border: `1px solid ${PRIMARY}30`,
                                bgcolor: PRIMARY_LIGHT,
                                color: PRIMARY_DARK,
                                fontSize: 13, fontWeight: 700,
                                '&:hover': { bgcolor: '#DBEAFE', borderColor: PRIMARY },
                            }}
                        >
                            <Box sx={{ textAlign: 'left' }}>
                                <Box>Restore Previous Year ({renewDialog.prevAY})</Box>
                                <Box sx={{ fontSize: 10.5, fontWeight: 500, color: '#6B7280', mt: 0.2 }}>
                                    Loads last year's data into the form — review then save
                                </Box>
                            </Box>
                        </Button>
                        <Button
                            onClick={handleCreateNewPolicy}
                            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                            sx={{
                                textTransform: 'none', justifyContent: 'flex-start',
                                px: 1.6, py: 1.2, borderRadius: '7px',
                                border: '1px solid #E5E7EB', bgcolor: '#fff',
                                color: '#374151',
                                fontSize: 13, fontWeight: 700,
                                '&:hover': { bgcolor: '#F9FAFB', borderColor: '#D1D5DB' },
                            }}
                        >
                            <Box sx={{ textAlign: 'left' }}>
                                <Box>Create New From Scratch</Box>
                                <Box sx={{ fontSize: 10.5, fontWeight: 500, color: '#9CA3AF', mt: 0.2 }}>
                                    Starts with defaults — fill in fresh values
                                </Box>
                            </Box>
                        </Button>
                    </Box>
                </Box>
            </Dialog>
        </>
    );
}
