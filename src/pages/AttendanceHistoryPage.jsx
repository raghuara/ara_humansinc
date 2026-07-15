import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box, Typography, Grid, Stack, Chip, TextField, Autocomplete, IconButton,
    Button, Skeleton, Tooltip, ToggleButtonGroup, ToggleButton, Avatar,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import FreeBreakfastRoundedIcon from '@mui/icons-material/FreeBreakfastRounded';
import EastRoundedIcon from '@mui/icons-material/EastRounded';
import FingerprintRoundedIcon from '@mui/icons-material/FingerprintRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useNavigate, useSearchParams } from 'react-router-dom';
import http from '../Api/http';
import { GetEmployeeAttendance, GetEmployeeAttendanceAudit } from '../Api/Api';
import { toApiDate, fmtApiDate } from '../utils/apiFields';

const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_BORDER = '#C9BEFB';
const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
const field = { '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 14, bgcolor: '#fff', height: 42 } };

const todayIso = () => new Date().toISOString().split('T')[0];

const initials = (s = '') => s.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

// "09:05:00" → "9:05 AM". The audit stores seconds; nobody reads them.
const fmtTime = (t) => {
    if (!t) return null;
    const [h, m] = String(t).split(':').map(Number);
    if (Number.isNaN(h)) return String(t);
    const ap = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m ?? 0).padStart(2, '0')} ${ap}`;
};

// "2026-07-14T10:28:23.454431" → { day: '14 Jul 2026', time: '10:28:23' }
const splitStamp = (iso) => {
    const [datePart = '', timePart = ''] = String(iso || '').split('T');
    const [y, m, d] = datePart.split('-');
    return {
        day: y && m && d ? fmtApiDate(`${d}-${m}-${y}`) : datePart,
        time: timePart.split('.')[0] || '',
    };
};

// Which punch a row is about. Break fields carry a breakNo; everything else is
// a login/logout on the day itself.
const FIELD_META = {
    LoginTime:      { label: 'Check-in',  icon: LoginRoundedIcon,          color: '#16A34A' },
    LogoutTime:     { label: 'Check-out', icon: LogoutRoundedIcon,         color: '#E11D48' },
    BreakOutTime:   { label: 'Break out', icon: FreeBreakfastRoundedIcon,  color: '#F59E0B' },
    BreakInTime:    { label: 'Break in',  icon: FreeBreakfastRoundedIcon,  color: '#0891B2' },
};
const metaFor = (fieldName) =>
    FIELD_META[fieldName] || { label: fieldName || 'Field', icon: EditRoundedIcon, color: '#6B7280' };

export default function AttendanceHistoryPage() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();

    const [date, setDate] = useState(params.get('date') || todayIso());
    const [employeeCode, setEmployeeCode] = useState(params.get('employeeCode') || '');

    const [people, setPeople] = useState([]);          // roster for the chosen date
    const [events, setEvents] = useState([]);          // daily + break, merged
    const [counts, setCounts] = useState({ daily: 0, breaks: 0 });
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [filter, setFilter] = useState('all');       // all | punches | breaks

    // The roster for the day doubles as the employee picker — the audit endpoint
    // needs an employeeCode and there's no separate "who worked that day" call.
    useEffect(() => {
        const apiDate = toApiDate(date);
        if (!apiDate) return;
        let cancelled = false;
        http.get(GetEmployeeAttendance, { params: { fromDate: apiDate, toDate: apiDate } })
            .then(({ data }) => {
                if (cancelled || data?.error) return;
                const rows = Array.isArray(data?.data) ? data.data : [];
                setPeople(rows.map(r => ({ code: r.employeeCode, name: r.employeeName, designation: r.designation })));
            })
            .catch(() => { /* the code can still be typed by hand */ });
        return () => { cancelled = true; };
    }, [date]);

    const load = useCallback(async () => {
        const apiDate = toApiDate(date);
        if (!employeeCode || !apiDate) { setEvents([]); setCounts({ daily: 0, breaks: 0 }); return; }

        setLoading(true);
        setLoadError('');
        try {
            const { data } = await http.get(GetEmployeeAttendanceAudit, {
                params: { employeeCode, date: apiDate },
            });
            if (data?.error) throw new Error(data.message || 'Could not load the attendance history.');

            // Both streams describe the same day, so they're merged into one
            // timeline and re-sorted — a break edit and a punch edit made in the
            // same save belong together, not in two separate lists.
            const daily = Array.isArray(data?.dailyEvents) ? data.dailyEvents : [];
            const breaks = Array.isArray(data?.breakEvents) ? data.breakEvents : [];
            const merged = [
                ...daily.map(e => ({ ...e, kind: 'punch' })),
                ...breaks.map(e => ({ ...e, kind: 'break' })),
            ].sort((a, b) => String(b.changedAt).localeCompare(String(a.changedAt)));   // newest first

            setEvents(merged);
            setCounts({
                daily: Number(data?.dailyEventCount) || daily.length,
                breaks: Number(data?.breakEventCount) || breaks.length,
            });
        } catch (err) {
            if (err?.response?.status === 404) {
                setEvents([]);                // no edits on this day — not an error
                setCounts({ daily: 0, breaks: 0 });
            } else {
                console.error('GetEmployeeAttendanceAudit failed:', err);
                setLoadError(err?.response?.data?.message || err.message || 'Could not load the attendance history.');
                setEvents([]);
            }
        } finally {
            setLoading(false);
        }
    }, [employeeCode, date]);

    useEffect(() => { load(); }, [load]);

    // Keep the URL in step so a history view can be linked to / refreshed.
    useEffect(() => {
        const next = {};
        if (employeeCode) next.employeeCode = employeeCode;
        if (date) next.date = date;
        setParams(next, { replace: true });
    }, [employeeCode, date, setParams]);

    const visible = useMemo(() => events.filter(e =>
        filter === 'all' ? true : filter === 'breaks' ? e.kind === 'break' : e.kind === 'punch'
    ), [events, filter]);

    // One save can touch several fields, and the API records each as its own row
    // with an identical `changedAt`. Grouping by that timestamp turns 17 rows into
    // the handful of actual edits a person made.
    const batches = useMemo(() => {
        const map = new Map();
        visible.forEach(e => {
            const key = e.changedAt;
            if (!map.has(key)) map.set(key, { changedAt: key, changedBy: e.changedByName || e.changedBy, reason: e.reason, rows: [] });
            map.get(key).rows.push(e);
        });
        return Array.from(map.values());
    }, [visible]);

    const person = people.find(p => p.code === employeeCode);
    const employeeName = person?.name || events[0]?.employeeName || '';

    // An "update" that didn't actually change the value is noise the API records
    // anyway — call it out rather than showing "09:05 → 09:05" as if it were an edit.
    const isNoOp = (e) => e.action === 'update' && e.oldValue === e.newValue;
    const realChanges = events.filter(e => !isNoOp(e)).length;

    const KPIS = [
        { label: 'Total events', value: events.length, color: PRIMARY, bg: PRIMARY_LIGHT },
        { label: 'Actual changes', value: realChanges, color: '#16A34A', bg: '#DCFCE7' },
        { label: 'Punch edits', value: counts.daily, color: '#0EA5E9', bg: '#E0F2FE' },
        { label: 'Break edits', value: counts.breaks, color: '#F59E0B', bg: '#FFF7ED' },
    ];

    return (
        <Box sx={{ p: 2 }}>
            {/* Header */}
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', pb: 2.5 }}>
                <IconButton onClick={() => navigate('/dashboard/attendance-leave')}
                    sx={{ bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', '&:hover': { bgcolor: '#F8FAFC' } }}>
                    <ArrowBackRoundedIcon sx={{ fontSize: 20, color: '#334155' }} />
                </IconButton>
                <Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <HistoryRoundedIcon sx={{ fontSize: 22, color: PRIMARY }} />
                </Box>
                <Box>
                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>Attendance History</Typography>
                    <Typography sx={{ fontSize: 13, color: '#6B7280', mt: 0.3 }}>
                        Every punch and break edit for one person on one day — what changed, who changed it, and why.
                    </Typography>
                </Box>
            </Stack>

            {/* Pickers */}
            <Box sx={{ ...card, p: 2, mb: 1.5 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
                    <Autocomplete
                        size="small"
                        options={people}
                        getOptionLabel={(o) => (o?.name ? `${o.name} · ${o.code}` : '')}
                        isOptionEqualToValue={(o, v) => o.code === v.code}
                        value={person || null}
                        onChange={(_, v) => setEmployeeCode(v?.code || '')}
                        sx={{ width: { xs: '100%', md: 340 } }}
                        renderInput={(p) => (
                            <TextField {...p} placeholder="Select an employee" sx={field} />
                        )}
                        renderOption={(props, o) => (
                            <Box component="li" {...props} key={o.code} sx={{ display: 'flex', gap: 1.2 }}>
                                <Avatar sx={{ width: 28, height: 28, fontSize: 11, fontWeight: 700, bgcolor: PRIMARY_LIGHT, color: PRIMARY }}>
                                    {initials(o.name)}
                                </Avatar>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }} noWrap>{o.name}</Typography>
                                    <Typography sx={{ fontSize: 11, color: '#98A0AE' }} noWrap>{o.code}{o.designation ? ` · ${o.designation}` : ''}</Typography>
                                </Box>
                            </Box>
                        )}
                    />
                    <TextField
                        type="date" size="small" value={date}
                        onChange={(e) => setDate(e.target.value)}
                        sx={{ ...field, width: { xs: '100%', md: 190 } }}
                        slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <Box sx={{ flex: 1 }} />
                    <Tooltip arrow title="Reload">
                        <span>
                            <IconButton onClick={load} disabled={loading || !employeeCode}
                                sx={{ width: 42, height: 42, borderRadius: '7px', border: '1px solid #E6EAF1', bgcolor: '#fff' }}>
                                <RefreshRoundedIcon sx={{ fontSize: 19, color: '#475569' }} />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Stack>
            </Box>

            {!employeeCode ? (
                <Box sx={{ ...card, textAlign: 'center', py: 8 }}>
                    <PersonRoundedIcon sx={{ fontSize: 38, color: '#CBD2DD' }} />
                    <Typography sx={{ fontSize: 14, color: '#98A0AE', mt: 1 }}>
                        Pick an employee to see their edit trail for {fmtApiDate(toApiDate(date)) || 'this date'}.
                    </Typography>
                </Box>
            ) : (
                <>
                    {/* Summary */}
                    <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                        {KPIS.map(k => (
                            <Grid size={{ xs: 6, lg: 3 }} key={k.label}>
                                <Box sx={{ ...card, p: 2.2, bgcolor: k.bg, border: `1px solid ${k.color}22` }}>
                                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: k.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</Typography>
                                    {loading
                                        ? <Skeleton variant="text" width={48} height={36} />
                                        : <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#0F172A', mt: 0.3 }}>{k.value}</Typography>}
                                </Box>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Who / when */}
                    {employeeName && (
                        <Stack direction="row" spacing={1.3} sx={{ ...card, p: 1.8, mb: 1.5, alignItems: 'center' }}>
                            <Avatar sx={{ width: 38, height: 38, bgcolor: PRIMARY_LIGHT, color: PRIMARY, fontWeight: 700, fontSize: 13 }}>
                                {initials(employeeName)}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{employeeName}</Typography>
                                <Typography sx={{ fontSize: 12, color: '#6B7280' }}>
                                    {employeeCode} · {fmtApiDate(toApiDate(date))}
                                </Typography>
                            </Box>
                            <ToggleButtonGroup size="small" exclusive value={filter} onChange={(_, v) => v && setFilter(v)}
                                sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontSize: 12, fontWeight: 700, px: 1.4, borderColor: '#E5E7EB' }, '& .Mui-selected': { bgcolor: `${PRIMARY_LIGHT} !important`, color: `${PRIMARY} !important` } }}>
                                <ToggleButton value="all">All</ToggleButton>
                                <ToggleButton value="punches">Punches</ToggleButton>
                                <ToggleButton value="breaks">Breaks</ToggleButton>
                            </ToggleButtonGroup>
                        </Stack>
                    )}

                    {loading ? (
                        <Stack spacing={1.5}>
                            {[0, 1, 2].map(i => <Skeleton key={i} variant="rounded" height={130} sx={{ borderRadius: '7px' }} />)}
                        </Stack>
                    ) : loadError ? (
                        <Stack direction="row" spacing={1.3} sx={{ ...card, p: 2, alignItems: 'center', bgcolor: '#FEF2F2', border: '1px solid #FECACA' }}>
                            <ErrorOutlineRoundedIcon sx={{ fontSize: 22, color: '#B91C1C' }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#991B1B' }}>Couldn't load the history</Typography>
                                <Typography sx={{ fontSize: 12, color: '#B91C1C' }}>{loadError}</Typography>
                            </Box>
                            <Button onClick={load} startIcon={<RefreshRoundedIcon sx={{ fontSize: 17 }} />}
                                sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12.5, color: '#B91C1C', bgcolor: '#fff', border: '1px solid #FECACA', borderRadius: '7px', height: 38, px: 2 }}>
                                Retry
                            </Button>
                        </Stack>
                    ) : batches.length === 0 ? (
                        <Box sx={{ ...card, textAlign: 'center', py: 8 }}>
                            <HistoryRoundedIcon sx={{ fontSize: 38, color: '#CBD2DD' }} />
                            <Typography sx={{ fontSize: 14, color: '#98A0AE', mt: 1 }}>
                                No attendance edits recorded for this person on this date.
                            </Typography>
                        </Box>
                    ) : (
                        <Stack spacing={1.5}>
                            {batches.map((b, bi) => {
                                const stamp = splitStamp(b.changedAt);
                                const allNoOp = b.rows.every(isNoOp);
                                return (
                                    <Box key={`${b.changedAt}-${bi}`} sx={{ ...card, p: 0, overflow: 'hidden' }}>
                                        {/* Batch header — one save */}
                                        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.2, px: 2.2, py: 1.5, borderBottom: '1px solid #F1F3F7', bgcolor: '#F8FAFC', flexWrap: 'wrap' }}>
                                            <Box sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Typography sx={{ fontSize: 11, fontWeight: 800, color: PRIMARY }}>{batches.length - bi}</Typography>
                                            </Box>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>
                                                    {stamp.time} <Box component="span" sx={{ fontWeight: 600, color: '#94A3B8' }}>· {stamp.day}</Box>
                                                </Typography>
                                                <Typography sx={{ fontSize: 11.5, color: '#6B7280' }}>
                                                    by <strong>{b.changedBy || 'unknown'}</strong> · {b.rows.length} field{b.rows.length === 1 ? '' : 's'}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ flex: 1 }} />
                                            {allNoOp && (
                                                <Chip label="No values changed" size="small"
                                                    sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0' }} />
                                            )}
                                            {b.reason ? (
                                                <Chip label={b.reason} size="small"
                                                    sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A', maxWidth: 320 }} />
                                            ) : (
                                                <Tooltip arrow title="No reason was given for this edit">
                                                    <Chip label="No reason" size="small"
                                                        sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }} />
                                                </Tooltip>
                                            )}
                                        </Stack>

                                        {/* Field rows */}
                                        <Stack divider={<Box sx={{ borderBottom: '1px solid #F5F6FA' }} />}>
                                            {b.rows.map((e, ri) => {
                                                const meta = metaFor(e.fieldName);
                                                const Icon = meta.icon;
                                                const noOp = isNoOp(e);
                                                const isInsert = e.action === 'insert';
                                                return (
                                                    <Stack key={ri} direction="row" spacing={1.4} sx={{ alignItems: 'center', px: 2.2, py: 1.4, flexWrap: 'wrap', opacity: noOp ? 0.65 : 1 }}>
                                                        <Box sx={{ width: 32, height: 32, borderRadius: '7px', bgcolor: `${meta.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            <Icon sx={{ fontSize: 17, color: meta.color }} />
                                                        </Box>

                                                        <Box sx={{ minWidth: 128 }}>
                                                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                                                                {meta.label}
                                                                {Number.isInteger(e.breakNo) && (
                                                                    <Box component="span" sx={{ color: '#94A3B8', fontWeight: 600 }}> #{e.breakNo}</Box>
                                                                )}
                                                            </Typography>
                                                            <Typography sx={{ fontSize: 10.5, color: '#98A0AE' }}>{e.fieldName}</Typography>
                                                        </Box>

                                                        {/* old → new */}
                                                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                                                            {isInsert ? (
                                                                <Chip size="small" label="not set"
                                                                    sx={{ height: 24, fontSize: 11.5, fontWeight: 600, bgcolor: '#F1F5F9', color: '#94A3B8', border: '1px solid #E2E8F0' }} />
                                                            ) : (
                                                                <Chip size="small" label={fmtTime(e.oldValue) ?? '—'}
                                                                    sx={{ height: 24, fontSize: 11.5, fontWeight: 700, bgcolor: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA', textDecoration: noOp ? 'none' : 'line-through' }} />
                                                            )}
                                                            <EastRoundedIcon sx={{ fontSize: 15, color: '#CBD2DD' }} />
                                                            <Chip size="small" label={fmtTime(e.newValue) ?? '—'}
                                                                sx={{ height: 24, fontSize: 11.5, fontWeight: 800, bgcolor: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0' }} />
                                                        </Stack>

                                                        <Box sx={{ flex: 1 }} />

                                                        {noOp && (
                                                            <Chip size="small" label="unchanged"
                                                                sx={{ height: 22, fontSize: 10, fontWeight: 700, bgcolor: '#F1F5F9', color: '#64748B' }} />
                                                        )}
                                                        <Chip
                                                            size="small"
                                                            icon={isInsert
                                                                ? <AddCircleOutlineRoundedIcon sx={{ fontSize: '13px !important' }} />
                                                                : <EditRoundedIcon sx={{ fontSize: '13px !important' }} />}
                                                            label={isInsert ? 'Created' : 'Updated'}
                                                            sx={{
                                                                height: 22, fontSize: 10, fontWeight: 700,
                                                                bgcolor: isInsert ? '#EEF2FF' : '#FFF7ED',
                                                                color: isInsert ? '#4338CA' : '#B45309',
                                                                border: `1px solid ${isInsert ? '#C7D2FE' : '#FED7AA'}`,
                                                                '& .MuiChip-icon': { color: 'inherit' },
                                                            }}
                                                        />
                                                        <Chip
                                                            size="small"
                                                            icon={e.source === 'biometric'
                                                                ? <FingerprintRoundedIcon sx={{ fontSize: '13px !important' }} />
                                                                : <PersonRoundedIcon sx={{ fontSize: '13px !important' }} />}
                                                            label={e.source === 'biometric' ? 'Biometric' : 'Manual'}
                                                            sx={{
                                                                height: 22, fontSize: 10, fontWeight: 700,
                                                                bgcolor: e.source === 'biometric' ? '#ECFEFF' : '#F1EEFE',
                                                                color: e.source === 'biometric' ? '#155E75' : PRIMARY,
                                                                border: `1px solid ${e.source === 'biometric' ? '#A5F3FC' : PRIMARY_BORDER}`,
                                                                '& .MuiChip-icon': { color: 'inherit' },
                                                            }}
                                                        />
                                                    </Stack>
                                                );
                                            })}
                                        </Stack>
                                    </Box>
                                );
                            })}

                            {/* The API records an "update" even when the value is identical, which
                                is why an untouched punch can show a dozen times. Say so once. */}
                            {events.length > realChanges && (
                                <Stack direction="row" spacing={1.2} sx={{ ...card, p: 1.6, alignItems: 'flex-start', bgcolor: '#F8FAFC' }}>
                                    <InfoOutlinedIcon sx={{ fontSize: 17, color: '#94A3B8', mt: 0.2 }} />
                                    <Typography sx={{ fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>
                                        {events.length - realChanges} of these {events.length} events re-saved the same value
                                        (marked <strong>unchanged</strong>). The audit records every save, not just the ones that altered a time.
                                    </Typography>
                                </Stack>
                            )}
                        </Stack>
                    )}
                </>
            )}
        </Box>
    );
}
