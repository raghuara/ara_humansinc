import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Grid, Button, Avatar, Chip, Stack, Tooltip, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, InputAdornment,
    Snackbar, Alert, MenuItem, LinearProgress, CircularProgress,
} from '@mui/material';
import AccessTimeFilledRoundedIcon from '@mui/icons-material/AccessTimeFilledRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { PRIMARY, PRIMARY_LIGHT, PRIMARY_DARK } from '../theme';
import { inr, initialsFromName as initials, paletteColor as colorFor } from '../utils/format';
import http, { apiErrorMessage } from '../Api/http';
import {
    GetOvertimeDashboard, AddOvertimeRateSlab, UpdateOvertimeRateSlab, DeleteOvertimeRateSlab,
    UpdateOvertimeCountsAfter, UpdateOvertimeEntryAction,
} from '../Api/Api';

const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
const solidBtn = { bgcolor: PRIMARY, color: '#fff', fontWeight: 700, borderRadius: '7px', boxShadow: 'none', textTransform: 'none', '&:hover': { bgcolor: PRIMARY_DARK, boxShadow: 'none' } };

// 1.75 → "1.75 hrs", 2 → "2 hrs". Trailing zeros are dropped rather than padded,
// so a quarter-hour OT stint reads exactly as the API reported it.
const fmtHrs = (h) => {
    const n = Number(h) || 0;
    return `${Number.isInteger(n) ? n : Number(n.toFixed(2))} hr${n === 1 ? '' : 's'}`;
};
const slabRange = (s) => (s.toHr === null ? `${s.fromHr}+ hrs` : `${s.fromHr}–${s.toHr} hrs`);
// What one slab pays at a sample duration — self-contained, no cross-slab matching.
const slabPayAt = (s, hours) => Math.round(s.payType === 'flat' ? s.amount : s.amount * hours);

// The dashboard's `slabs` array was empty in every sample response, so the exact
// casing the server emits is unconfirmed. Accept camelCase and PascalCase, and
// the legacy Redux field names, rather than render blank rows on a mismatch.
const pick = (o, ...keys) => { for (const k of keys) if (o?.[k] !== undefined && o[k] !== null) return o[k]; return undefined; };
const normalizeSlab = (s) => {
    const toRaw = pick(s, 'toHours', 'ToHours', 'toHr');
    const andAbove = Boolean(pick(s, 'andAbove', 'AndAbove') ?? toRaw === undefined);
    return {
        id: pick(s, 'id', 'Id'),
        label: pick(s, 'name', 'Name', 'label') ?? '',
        fromHr: Number(pick(s, 'fromHours', 'FromHours', 'fromHr') ?? 0),
        toHr: andAbove || toRaw === undefined ? null : Number(toRaw),
        payType: String(pick(s, 'payType', 'PayType') ?? 'perhour').toLowerCase() === 'flat' ? 'flat' : 'perhour',
        amount: Number(pick(s, 'rate', 'Rate', 'amount') ?? 0),
    };
};

// Entries arrive display-ready: `date` is "05 Jul 2026" and the times are
// "5:30 PM". They are rendered verbatim — running them back through a date/time
// formatter would corrupt them.
const normalizeEntry = (e) => ({
    id: e.id,
    employeeCode: e.employeeCode ?? '',
    employeeName: e.employeeName ?? '',
    department: e.department ?? '',
    date: e.date ?? '',
    shiftEnd: e.shiftEnd ?? '',
    signOff: e.signOff ?? '',
    otHours: Number(e.otHours) || 0,
    slabName: e.slabName ?? '',
    otPay: Number(e.otPay) || 0,
    status: String(e.status ?? '').toLowerCase(),
    rejectReason: e.rejectReason ?? null,
});

const EMPTY_DASH = {
    rateSlabs: 0, topHourlyRate: 0, otHoursLogged: 0, pendingApprovals: 0,
    countsAfterMinutes: 0, slabs: [], entries: [],
};
const EMPTY_SLAB = { label: '', fromHr: '', toHr: '', andAbove: false, payType: 'perhour', amount: '' };

// A grace window longer than a few hours would mean the shift itself is
// mis-defined, so the editor is capped rather than left open-ended.
const MAX_GRACE_MIN = 240;

// Canned rejection reasons for an OT entry. The employee reads this verbatim in
// the app, so each states why it was refused and, where useful, what to do next.
// All are editable after being inserted.
const OT_REJECT_TEMPLATES = [
    { label: 'Not pre-approved', text: 'This overtime was not authorised in advance by your reporting manager, so it cannot be approved.' },
    { label: 'Not enough justification', text: 'The reason given does not justify overtime for this date. Please add detail and raise it again.' },
    { label: 'Within grace period', text: 'The extra time falls within the allowed grace window past shift end and does not qualify as overtime.' },
    { label: 'Sign-off looks wrong', text: 'The sign-off time appears incorrect. Please verify your punch-out with your manager and raise the entry again.' },
    { label: 'No work assigned', text: 'No assigned task required you to stay beyond shift end on this date.' },
    { label: 'Already recorded', text: 'Overtime for this date has already been recorded, so this entry is a duplicate.' },
];

// ── Band geometry ────────────────────────────────────────────────────────────
// Bands are contiguous and must not overlap: a duration matches exactly one
// slab, so two bands covering the same hour make the payout ambiguous. A new
// band therefore always starts where the current coverage ends, which is why
// "From" is derived rather than typed.
const coverageEnd = (list) => list.reduce((max, s) => (s.toHr === null ? max : Math.max(max, s.toHr)), 0);
const hasOpenEndedBand = (list) => list.some((s) => s.toHr === null);
// The band sitting immediately above `from`, if any — its start is the ceiling
// for the band being edited.
const bandAbove = (list, from) => list.filter((s) => s.fromHr > from).sort((a, b) => a.fromHr - b.fromHr)[0] || null;

export default function OvertimePage() {
    const [dash, setDash] = useState(EMPTY_DASH);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [loadError, setLoadError] = useState('');

    const [snack, setSnack] = useState(null);       // { msg, sev }
    const [dialog, setDialog] = useState(null);     // { id? } — open when set
    const [confirm, setConfirm] = useState(null);   // slab pending deletion
    const [form, setForm] = useState(EMPTY_SLAB);
    const [tried, setTried] = useState(false);

    // Grace-window editor
    const [grace, setGrace] = useState('');         // string, mirrors the field
    const [savingGrace, setSavingGrace] = useState(false);

    // OT entry approve / reject
    const [actingId, setActingId] = useState(null); // entry id with a call in flight
    const [reject, setReject] = useState(null);      // entry being rejected
    const [rejectReason, setRejectReason] = useState('');

    const notify = (msg, sev = 'success') => setSnack({ msg, sev });

    // ── Load ────────────────────────────────────────────────────────────────
    const loadDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const { data: body } = await http.get(GetOvertimeDashboard);
            if (body?.error) throw new Error(body.message || 'Could not load the overtime dashboard.');
            const d = body?.data || {};
            setDash({
                rateSlabs: Number(d.rateSlabs) || 0,
                topHourlyRate: Number(d.topHourlyRate) || 0,
                otHoursLogged: Number(d.otHoursLogged) || 0,
                pendingApprovals: Number(d.pendingApprovals) || 0,
                countsAfterMinutes: Number(d.countsAfterMinutes) || 0,
                slabs: (Array.isArray(d.slabs) ? d.slabs : []).map(normalizeSlab).sort((a, b) => a.fromHr - b.fromHr),
                entries: (Array.isArray(d.entries) ? d.entries : []).map(normalizeEntry),
            });
            setLoadError('');
        } catch (err) {
            setLoadError(apiErrorMessage(err, 'Could not load the overtime dashboard.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadDashboard(); }, [loadDashboard]);

    // Keep the editable field in step with the server value on every (re)load.
    useEffect(() => { setGrace(String(dash.countsAfterMinutes)); }, [dash.countsAfterMinutes]);

    const { slabs, entries } = dash;

    // ── Grace window (OT counts after N min) ────────────────────────────────
    const graceNum = Number(grace);
    const graceValid = grace !== '' && Number.isInteger(graceNum) && graceNum >= 0 && graceNum <= MAX_GRACE_MIN;
    const graceDirty = graceValid && graceNum !== dash.countsAfterMinutes;

    const setGraceDigits = (e) => {
        const digits = e.target.value.replace(/\D/g, '');
        if (digits === '') { setGrace(''); return; }
        const n = Number(digits);
        if (n > MAX_GRACE_MIN) return;   // reject anything over the cap outright
        setGrace(String(n));
    };

    const saveGrace = async () => {
        if (!graceDirty || savingGrace) return;
        setSavingGrace(true);
        try {
            const { data: body } = await http.put(UpdateOvertimeCountsAfter, { CountsAfterMinutes: graceNum });
            if (body?.error) throw new Error(body.message || 'Could not update the grace window.');
            notify(body?.message || `OT now counts after ${graceNum} min past shift end.`);
            await loadDashboard();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not update the grace window.'), 'error');
            setGrace(String(dash.countsAfterMinutes));   // roll the field back
        } finally {
            setSavingGrace(false);
        }
    };

    // `rateSlabs` is the server's own count; the list length is used instead so
    // this KPI can never disagree with the "N bands" chip on the table below it.
    const KPIS = [
        { label: 'OT Rate Slabs', value: slabs.length, sub: 'Configured bands', icon: LayersRoundedIcon, color: PRIMARY, bg: PRIMARY_LIGHT },
        { label: 'Top Hourly Rate', value: inr(dash.topHourlyRate), sub: 'Highest per-hour', icon: PaymentsRoundedIcon, color: '#16A34A', bg: '#DCFCE7' },
        { label: 'OT Hours', value: fmtHrs(dash.otHoursLogged), sub: 'Logged this period', icon: AccessTimeFilledRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE' },
        { label: 'Pending Approvals', value: dash.pendingApprovals, sub: 'Awaiting review', icon: PendingActionsRoundedIcon, color: '#F59E0B', bg: '#FFF7ED' },
    ];

    // ── Slab dialog ─────────────────────────────────────────────────────────
    // A new band opens pinned to the end of the existing coverage, so the very
    // first one starts at 0 and every later one continues from the last.
    const openAdd = () => { setForm({ ...EMPTY_SLAB, fromHr: String(coverageEnd(slabs)) }); setTried(false); setDialog({}); };
    const openEdit = (s) => {
        setForm({
            label: s.label,
            fromHr: String(s.fromHr),
            toHr: s.toHr === null ? '' : String(s.toHr),
            andAbove: s.toHr === null,
            payType: s.payType,
            amount: String(s.amount),
        });
        setTried(false); setDialog({ id: s.id });
    };
    const closeDialog = () => { if (!saving) setDialog(null); };

    const fromN = Number(form.fromHr);
    const toN = Number(form.toHr);
    const amtN = Number(form.amount);

    // Every rule below is measured against the OTHER bands, so editing a slab
    // is never blocked by its own name or its own hours.
    const editing = dialog?.id !== undefined && dialog?.id !== null;
    const others = dialog ? slabs.filter((s) => s.id !== dialog.id) : [];
    const nextBand = bandAbove(others, fromN);
    // An unbounded top band already covers every hour above its start, so there
    // is no room to append another.
    const blockedByOpenEnd = Boolean(dialog) && !editing && hasOpenEndedBand(others);
    // Only the topmost band can run "and above" — otherwise it would swallow
    // the bands above it.
    const canBeOpenEnded = !nextBand;
    const maxTo = nextBand ? nextBand.fromHr : Infinity;

    const nameTaken = Boolean(form.label.trim())
        && others.some((s) => s.label.trim().toLowerCase() === form.label.trim().toLowerCase());
    const toTooHigh = !form.andAbove && form.toHr !== '' && toN > maxTo;

    // "From" is disabled in the UI, but the overlap rule must not rest on that
    // alone — a disabled input is a UI affordance, not a validation. Re-derive
    // the only legal start here and compare, so a stale or tampered value can
    // never slip a 0–1 band underneath an existing 0–2.
    const expectedFrom = editing
        ? (slabs.find((s) => s.id === dialog.id)?.fromHr ?? fromN)
        : coverageEnd(others);
    const fromWrong = Boolean(dialog) && fromN !== expectedFrom;

    const slabValid = Boolean(form.label.trim())
        && !nameTaken
        && !blockedByOpenEnd
        && !fromWrong
        && form.fromHr !== '' && !Number.isNaN(fromN) && fromN >= 0
        && (form.andAbove
            ? canBeOpenEnded
            : (form.toHr !== '' && toN > fromN && toN <= maxTo))
        && amtN > 0;

    const saveSlab = async () => {
        setTried(true);
        if (!slabValid) {
            notify(
                nameTaken ? 'Another slab already uses this name.'
                    : toTooHigh ? `This band overlaps "${nextBand.label}". Lower its "To" value.`
                        : blockedByOpenEnd ? 'Close off the open-ended band before adding another.'
                            : 'Please complete the slab fields correctly.',
                'warning',
            );
            return;
        }

        const payload = {
            Name: form.label.trim(),
            FromHours: fromN,
            ToHours: form.andAbove ? null : toN,
            AndAbove: form.andAbove,
            PayType: form.payType,
            Rate: amtN,
        };

        setSaving(true);
        try {
            const editing = dialog?.id !== undefined && dialog?.id !== null;
            const { data: body } = editing
                ? await http.put(UpdateOvertimeRateSlab, { Id: dialog.id, ...payload })
                : await http.post(AddOvertimeRateSlab, payload);
            if (body?.error) throw new Error(body.message || 'Could not save the rate slab.');

            setDialog(null);
            notify(body?.message || (editing ? 'OT slab updated.' : 'OT slab added.'));
            // The server owns the id, the slab ordering and every KPI, so the
            // list is re-read rather than patched locally.
            await loadDashboard();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not save the rate slab.'), 'error');
        } finally {
            setSaving(false);
        }
    };

    const deleteSlab = async (slab) => {
        setConfirm(null);
        setDeletingId(slab.id);
        try {
            const { data: body } = await http.delete(DeleteOvertimeRateSlab, { params: { id: slab.id } });
            if (body?.error) throw new Error(body.message || 'Could not delete the rate slab.');
            notify(body?.message || 'OT slab removed.');
            await loadDashboard();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not delete the rate slab.'), 'error');
        } finally {
            setDeletingId(null);
        }
    };

    // ── OT entry approve / reject ───────────────────────────────────────────
    const openReject = (entry) => { setRejectReason(''); setReject(entry); };

    // One call for both verdicts; `Reason` rides along on a reject only.
    const runEntryAction = async (entry, action, reason = '') => {
        if (!entry || actingId) return;
        setActingId(entry.id);
        try {
            const payload = { EntryId: entry.id, Action: action };
            if (action === 'reject') payload.Reason = reason.trim();

            const { data: body } = await http.put(UpdateOvertimeEntryAction, payload);
            if (body?.error) throw new Error(body.message || `Could not ${action} this entry.`);

            setReject(null);
            notify(body?.message || (action === 'approve'
                ? `OT approved — ${inr(Number(entry.otPay) || 0)} for ${entry.employeeName}.`
                : `OT entry from ${entry.employeeName} rejected.`));
            // Status and the pending count both move server-side, so re-read.
            await loadDashboard();
        } catch (err) {
            notify(apiErrorMessage(err, `Could not ${action} this entry.`), 'error');
        } finally {
            setActingId(null);
        }
    };

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    // Preview payout for the slab being edited (sample at the from-hour)
    const previewHrs = form.andAbove ? fromN + 1 : (toN || fromN);
    const previewPay = form.payType === 'flat' ? amtN : amtN * (previewHrs || 0);

    if (loading) {
        return (
            <Box sx={{ height: '70vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <LinearProgress sx={{ width: 300 }} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            {/* Header */}
            <Box sx={{ pb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexWrap: 'wrap', gap: 1.5 }}>
                <Box>
                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>Overtime (OT)</Typography>
                    <Typography sx={{ fontSize: 13, color: '#6B7280', mt: 0.3 }}>Configure OT pay slabs and approve extra hours worked beyond shift end</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Tooltip arrow title="Reload">
                        <IconButton onClick={loadDashboard} sx={{ border: '1px solid #E6EAF1', borderRadius: '7px', color: '#64748B', '&:hover': { bgcolor: PRIMARY_LIGHT, color: PRIMARY } }}>
                            <RefreshRoundedIcon sx={{ fontSize: 19 }} />
                        </IconButton>
                    </Tooltip>
                    <Button startIcon={<AddRoundedIcon />} onClick={openAdd} sx={{ ...solidBtn, height: 42, px: 2.2 }}>Add Rate Slab</Button>
                </Stack>
            </Box>

            {loadError && (
                <Alert severity="error" sx={{ mb: 1.5, borderRadius: '7px' }}
                    action={<Button size="small" onClick={loadDashboard} sx={{ textTransform: 'none', fontWeight: 700 }}>Retry</Button>}>
                    {loadError}
                </Alert>
            )}

            {/* KPI cards */}
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                {KPIS.map((k) => (
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={k.label}>
                        <Box sx={{ ...card, p: 2.5, bgcolor: k.bg, border: `1px solid ${k.color}22`, height: '100%' }}>
                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: k.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</Typography>
                                    <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#0F172A', mt: 0.5 }}>{k.value}</Typography>
                                    <Typography sx={{ fontSize: 10.5, color: '#6B7280', mt: 0.2 }}>{k.sub}</Typography>
                                </Box>
                                <Box sx={{ width: 44, height: 44, borderRadius: '7px', bgcolor: '#fff', boxShadow: '0 1px 3px rgba(16,24,40,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <k.icon sx={{ color: k.color, fontSize: 22 }} />
                                </Box>
                            </Stack>
                        </Box>
                    </Grid>
                ))}
            </Grid>

            {/* OT rate slabs */}
            <Box sx={{ ...card, p: 0, overflow: 'hidden', mb: 1.5 }}>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1.2, p: 2.5, bgcolor: '#F7F6FD', borderBottom: '1px solid #EAE7F7', flexWrap: 'wrap' }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: '#fff', boxShadow: '0 1px 4px rgba(16,24,40,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <LayersRoundedIcon sx={{ color: PRIMARY, fontSize: 18 }} />
                    </Box>
                    <Typography sx={{ fontSize: 15.5, fontWeight: 800, color: '#0F172A' }}>OT Rate Slabs</Typography>
                    <Chip label={`${slabs.length} bands`} size="small" sx={{ bgcolor: PRIMARY_LIGHT, color: PRIMARY, fontWeight: 700, fontSize: 11.5 }} />
                    {/* Grace window — editable; saved via UpdateOvertimeCountsAfter.
                        The save button only appears once the value actually
                        changes, so there's nothing to press in the common case. */}
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', ml: 'auto' }}>
                        <TuneRoundedIcon sx={{ fontSize: 17, color: '#94A3B8' }} />
                        <Typography sx={{ fontSize: 12, color: '#6B7280' }}>OT counts after</Typography>
                        <TextField
                            size="small" value={grace} onChange={setGraceDigits} disabled={savingGrace}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveGrace(); }}
                            error={!graceValid}
                            inputProps={{ inputMode: 'numeric', maxLength: 3, 'aria-label': 'OT grace minutes' }}
                            sx={{ width: 88, '& .MuiOutlinedInput-root': { borderRadius: '7px', bgcolor: '#fff', height: 34, fontSize: 13, fontWeight: 700 } }}
                            slotProps={{ input: { endAdornment: <InputAdornment position="end"><Typography sx={{ fontSize: 11, color: '#94A3B8' }}>min</Typography></InputAdornment> } }}
                        />
                        <Typography sx={{ fontSize: 12, color: '#6B7280' }}>past shift end</Typography>
                        {graceDirty && (
                            <Tooltip arrow title={`Save — OT will count after ${graceNum} min`}>
                                <span>
                                    <IconButton onClick={saveGrace} disabled={savingGrace} size="small"
                                        sx={{ color: '#fff', bgcolor: '#16A34A', width: 30, height: 30, '&:hover': { bgcolor: '#15803D' }, '&.Mui-disabled': { bgcolor: '#A7F3D0', color: '#fff' } }}>
                                        {savingGrace ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : <CheckRoundedIcon sx={{ fontSize: 17 }} />}
                                    </IconButton>
                                </span>
                            </Tooltip>
                        )}
                    </Stack>
                </Stack>

                {/* Info line */}
                <Box sx={{ px: 2.5, py: 1.4, bgcolor: '#FFFBEB', borderBottom: '1px solid #FDE68A', display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <AccessTimeFilledRoundedIcon sx={{ fontSize: 16, color: '#B45309', mt: 0.1 }} />
                    <Typography sx={{ fontSize: 11.5, color: '#92400E', lineHeight: 1.6 }}>
                        The slab is picked by the <strong>total OT duration</strong>. e.g. a 1-hour stint uses the first band's per-hour rate,
                        while a 6-to-12-hour stretch can pay a single <strong>flat amount</strong> like a full day's salary. Add as many bands as you need.
                    </Typography>
                </Box>

                <Box sx={{ overflowX: 'auto' }}>
                    <Box component="table" sx={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
                        <Box component="thead" sx={{ bgcolor: '#F4F3FB' }}>
                            <Box component="tr">
                                {['SLAB', 'OT DURATION', 'PAY TYPE', 'RATE / AMOUNT', 'EXAMPLE PAYOUT', 'ACTIONS'].map((h) => (
                                    <Box component="th" key={h} sx={{ textAlign: h === 'ACTIONS' ? 'right' : 'left', px: 2.5, py: 1.6, fontSize: 10.5, fontWeight: 700, color: '#6E6B99', letterSpacing: 0.6, borderBottom: '1px solid #E8E6F3', whiteSpace: 'nowrap' }}>{h}</Box>
                                ))}
                            </Box>
                        </Box>
                        <Box component="tbody">
                            {slabs.map((s, idx) => {
                                const sample = s.toHr === null ? s.fromHr + 2 : s.toHr;
                                const busy = deletingId === s.id;
                                return (
                                    <Box component="tr" key={s.id ?? idx} sx={{ bgcolor: idx % 2 ? '#FBFAFE' : '#fff', opacity: busy ? 0.5 : 1 }}>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' }}>
                                            <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
                                                <Box sx={{ width: 30, height: 30, borderRadius: '8px', bgcolor: PRIMARY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: PRIMARY_DARK }}>{idx + 1}</Box>
                                                <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{s.label}</Typography>
                                            </Stack>
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' }}>
                                            <Chip label={slabRange(s)} size="small" sx={{ bgcolor: '#E0F2FE', color: '#0369A1', fontWeight: 700, fontSize: 11.5 }} />
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' }}>
                                            <Chip label={s.payType === 'flat' ? 'Flat amount' : 'Per hour'} size="small"
                                                sx={{ bgcolor: s.payType === 'flat' ? '#FFF7ED' : '#DCFCE7', color: s.payType === 'flat' ? '#B45309' : '#15803D', fontWeight: 700, fontSize: 11.5 }} />
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' }}>
                                            <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{inr(s.amount)}<Box component="span" sx={{ fontSize: 11, fontWeight: 600, color: '#98A0AE' }}>{s.payType === 'flat' ? ' total' : ' /hr'}</Box></Typography>
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' }}>
                                            <Typography sx={{ fontSize: 12.5, color: '#475569' }}>{fmtHrs(sample)} → <strong style={{ color: '#16A34A' }}>{inr(slabPayAt(s, sample))}</strong></Typography>
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <Tooltip arrow title="Edit slab">
                                                <span>
                                                    <IconButton size="small" disabled={busy} onClick={() => openEdit(s)} sx={{ color: PRIMARY, '&:hover': { bgcolor: PRIMARY_LIGHT } }}><EditRoundedIcon sx={{ fontSize: 17 }} /></IconButton>
                                                </span>
                                            </Tooltip>
                                            <Tooltip arrow title="Delete slab">
                                                <span>
                                                    <IconButton size="small" disabled={busy} onClick={() => setConfirm(s)} sx={{ ml: 0.5, color: '#98A0AE', '&:hover': { color: '#E11D48', bgcolor: '#FEF2F2' } }}>
                                                        {busy ? <CircularProgress size={15} /> : <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />}
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                    {slabs.length === 0 && (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                            <LayersRoundedIcon sx={{ fontSize: 34, color: '#CBD2DD' }} />
                            <Typography sx={{ fontSize: 14, color: '#98A0AE', mt: 1 }}>No slabs yet. Add one with "Add Rate Slab".</Typography>
                        </Box>
                    )}
                </Box>
            </Box>

            {/* OT records */}
            <Box sx={{ ...card, p: 0, overflow: 'hidden' }}>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1.2, p: 2.5, bgcolor: '#F7F6FD', borderBottom: '1px solid #EAE7F7' }}>
                    <Box sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: '#fff', boxShadow: '0 1px 4px rgba(16,24,40,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AccessTimeFilledRoundedIcon sx={{ color: PRIMARY, fontSize: 18 }} />
                    </Box>
                    <Typography sx={{ fontSize: 15.5, fontWeight: 800, color: '#0F172A' }}>Overtime Entries</Typography>
                    <Chip label={`${dash.pendingApprovals} pending`} size="small" sx={{ bgcolor: '#FFF7ED', color: '#B45309', fontWeight: 700, fontSize: 11.5 }} />
                    <Typography sx={{ fontSize: 11.5, color: '#98A0AE', ml: 'auto', display: { xs: 'none', sm: 'block' } }}>Derived from sign-off time vs scheduled shift end</Typography>
                </Stack>
                <Box sx={{ overflowX: 'auto' }}>
                    <Box component="table" sx={{ width: '100%', minWidth: 1040, borderCollapse: 'collapse' }}>
                        <Box component="thead" sx={{ bgcolor: '#F4F3FB' }}>
                            <Box component="tr">
                                {['EMPLOYEE', 'DATE', 'SHIFT END → SIGN OFF', 'OT HOURS', 'SLAB', 'OT PAY', 'STATUS', 'ACTIONS'].map((h) => (
                                    <Box component="th" key={h} sx={{ textAlign: h === 'ACTIONS' ? 'right' : 'left', px: 2.5, py: 1.6, fontSize: 10.5, fontWeight: 700, color: '#6E6B99', letterSpacing: 0.6, borderBottom: '1px solid #E8E6F3', whiteSpace: 'nowrap' }}>{h}</Box>
                                ))}
                            </Box>
                        </Box>
                        <Box component="tbody">
                            {entries.map((r, idx) => {
                                const approved = r.status === 'approved';
                                const rejected = r.status === 'rejected';
                                const pending = !approved && !rejected;
                                const busy = actingId === r.id;       // this row's call in flight
                                const acting = Boolean(actingId);      // any row's call in flight
                                return (
                                    <Box component="tr" key={r.id ?? idx} sx={{ bgcolor: idx % 2 ? '#FBFAFE' : '#fff' }}>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' }}>
                                            <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
                                                <Avatar sx={{ width: 34, height: 34, bgcolor: colorFor(r.employeeName), fontSize: 12.5, fontWeight: 700 }}>{initials(r.employeeName)}</Avatar>
                                                <Box>
                                                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{r.employeeName}</Typography>
                                                    <Typography sx={{ fontSize: 11.5, color: '#98A0AE' }}>{r.employeeCode} · {r.department}</Typography>
                                                </Box>
                                            </Stack>
                                        </Box>
                                        {/* Server-formatted — rendered as sent. */}
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6', fontSize: 12.5, color: '#475569', whiteSpace: 'nowrap' }}>{r.date || '—'}</Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' }}>
                                            <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                                                <Chip label={r.shiftEnd || '—'} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: '#F1F5F9', color: '#475569' }} />
                                                <LoginRoundedIcon sx={{ fontSize: 14, color: '#CBD2DD' }} />
                                                <Chip label={r.signOff || '—'} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: PRIMARY_LIGHT, color: PRIMARY_DARK }} />
                                            </Stack>
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' }}>
                                            <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#0EA5E9' }}>{fmtHrs(r.otHours)}</Typography>
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' }}>
                                            {r.slabName
                                                ? <Chip label={r.slabName} size="small" sx={{ bgcolor: '#E0F2FE', color: '#0369A1', fontWeight: 700, fontSize: 11 }} />
                                                : <Tooltip arrow title="No rate slab covers this OT duration"><Typography sx={{ fontSize: 12, color: '#E11D48' }}>No slab</Typography></Tooltip>}
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' }}>
                                            <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#16A34A' }}>{inr(r.otPay)}</Typography>
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' }}>
                                            <Tooltip arrow title={rejected && r.rejectReason ? r.rejectReason : ''}>
                                                <Chip
                                                    label={approved ? 'Approved' : rejected ? 'Rejected' : 'Pending'}
                                                    size="small"
                                                    sx={{
                                                        height: 22, fontSize: 11, fontWeight: 700,
                                                        bgcolor: approved ? '#DCFCE7' : rejected ? '#FEE2E2' : '#FEF3C7',
                                                        color: approved ? '#16A34A' : rejected ? '#E11D48' : '#B45309',
                                                    }}
                                                />
                                            </Tooltip>
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            {pending ? (
                                                <Stack direction="row" spacing={0.8} sx={{ justifyContent: 'flex-end' }}>
                                                    <Button
                                                        onClick={() => runEntryAction(r, 'approve')}
                                                        disabled={acting}
                                                        startIcon={busy ? <CircularProgress size={13} sx={{ color: '#fff' }} /> : <CheckRoundedIcon />}
                                                        sx={{ ...solidBtn, height: 32, px: 1.5, fontSize: 12, bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' }, '&.Mui-disabled': { bgcolor: '#A7F3D0', color: '#fff' } }}>
                                                        Approve
                                                    </Button>
                                                    <Tooltip arrow title="Reject with a reason">
                                                        <span>
                                                            <IconButton onClick={() => openReject(r)} disabled={acting} size="small"
                                                                sx={{ color: '#E11D48', border: '1px solid #FBCFE8', borderRadius: '7px', width: 32, height: 32, '&:hover': { bgcolor: '#FEF2F2' } }}>
                                                                <CloseRoundedIcon sx={{ fontSize: 17 }} />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                </Stack>
                                            ) : (
                                                <Typography sx={{ fontSize: 11.5, color: '#CBD2DD' }}>—</Typography>
                                            )}
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                    {entries.length === 0 && (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                            <AccessTimeFilledRoundedIcon sx={{ fontSize: 34, color: '#CBD2DD' }} />
                            <Typography sx={{ fontSize: 14, color: '#98A0AE', mt: 1 }}>No overtime entries for this period.</Typography>
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Add / edit slab dialog */}
            <Dialog open={Boolean(dialog)} onClose={closeDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{dialog?.id ? 'Edit Rate Slab' : 'Add Rate Slab'}</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>Define an OT-duration band and how it is paid.</Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    {blockedByOpenEnd && (
                        <Alert severity="warning" sx={{ mb: 2, borderRadius: '9px', fontSize: 12.5, py: 0.5 }}>
                            The top band has no upper limit, so it already covers every OT duration above it.
                            Give it a fixed "To" value first, then add the next band.
                        </Alert>
                    )}

                    <TextField label="Slab name" size="small" fullWidth value={form.label} onChange={set('label')}
                        error={(tried && !form.label.trim()) || nameTaken}
                        helperText={nameTaken ? `A slab named "${form.label.trim()}" already exists.` : ' '}
                        placeholder="e.g. Extended OT" sx={{ mb: 1 }} />

                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#374151', mb: 1 }}>OT duration band (in hours)</Typography>
                    <Stack direction="row" spacing={1.2} sx={{ mb: 1 }}>
                        {/* Derived, never typed — this is what keeps bands from
                            overlapping. */}
                        <Tooltip arrow title={editing ? "Fixed by the band below this one" : 'A new band starts where the last one ends'}>
                            <TextField label="From" size="small" fullWidth disabled value={form.fromHr}
                                InputProps={{ endAdornment: <InputAdornment position="end">hr</InputAdornment> }} />
                        </Tooltip>
                        <TextField label="To" type="number" size="small" fullWidth value={form.toHr} onChange={set('toHr')} disabled={form.andAbove || blockedByOpenEnd}
                            error={(tried && !form.andAbove && (form.toHr === '' || toN <= fromN)) || toTooHigh}
                            InputProps={{ endAdornment: <InputAdornment position="end">hr</InputAdornment> }} />
                    </Stack>
                    <Typography sx={{ fontSize: 11, color: toTooHigh ? '#E11D48' : '#98A0AE', mb: 1.2 }}>
                        {toTooHigh
                            ? `Must end at ${maxTo} hr or below — the "${nextBand.label}" band starts there.`
                            : editing
                                ? `This band starts at ${fromN} hr and cannot move${nextBand ? `; it must end by ${maxTo} hr, where "${nextBand.label}" begins.` : '.'}`
                                : fromN > 0
                                    ? `Bands can't overlap, so this one picks up at ${fromN} hr where the last band ends.`
                                    : 'This is the first band, so it starts at 0.'}
                    </Typography>

                    <Tooltip arrow title={canBeOpenEnded ? '' : `Only the topmost band can be open-ended — "${nextBand?.label}" sits above this one.`}>
                        <Box component="span" sx={{ display: 'inline-block', mb: 2 }}>
                            <Box
                                onClick={() => { if (canBeOpenEnded && !blockedByOpenEnd) setForm((f) => ({ ...f, andAbove: !f.andAbove })); }}
                                sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8, cursor: canBeOpenEnded && !blockedByOpenEnd ? 'pointer' : 'not-allowed', opacity: canBeOpenEnded && !blockedByOpenEnd ? 1 : 0.5 }}>
                                <Box sx={{ width: 18, height: 18, borderRadius: '5px', border: `1.5px solid ${form.andAbove ? PRIMARY : '#CBD5E1'}`, bgcolor: form.andAbove ? PRIMARY : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {form.andAbove && <CheckRoundedIcon sx={{ fontSize: 13, color: '#fff' }} />}
                                </Box>
                                <Typography sx={{ fontSize: 12.5, color: '#475569' }}>and above (no upper limit)</Typography>
                            </Box>
                        </Box>
                    </Tooltip>

                    <Stack direction="row" spacing={1.2} sx={{ mb: 2 }}>
                        <TextField select label="Pay type" size="small" fullWidth value={form.payType} onChange={set('payType')}>
                            <MenuItem value="perhour">Per hour (₹ × OT hours)</MenuItem>
                            <MenuItem value="flat">Flat amount (one lump sum)</MenuItem>
                        </TextField>
                        <TextField label={form.payType === 'flat' ? 'Flat amount' : 'Rate per hour'} type="number" size="small" fullWidth value={form.amount} onChange={set('amount')} error={tried && amtN <= 0}
                            InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
                    </Stack>

                    {slabValid && (
                        <Box sx={{ p: 1.6, borderRadius: '9px', bgcolor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.4 }}>Preview</Typography>
                            <Typography sx={{ fontSize: 12.5, color: '#166534' }}>
                                An employee doing <strong>{fmtHrs(previewHrs)}</strong> of OT
                                {form.payType === 'flat'
                                    ? <> is paid a flat <strong>{inr(amtN)}</strong>.</>
                                    : <> earns <strong>{inr(previewPay)}</strong> ({inr(amtN)}/hr).</>}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={closeDialog} disabled={saving} sx={{ textTransform: 'none', fontWeight: 700, color: '#64748B', borderRadius: '7px' }}>Cancel</Button>
                    <Button onClick={saveSlab} disabled={saving || blockedByOpenEnd} startIcon={saving ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : null} sx={{ ...solidBtn, height: 40, px: 2.4 }}>
                        {saving ? 'Saving…' : dialog?.id ? 'Save Slab' : 'Add Slab'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete confirmation — the slab is removed on the server, so this
                can't be undone from the UI. */}
            <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>Delete this rate slab?</Typography>
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: 13, color: '#475569' }}>
                        <strong>{confirm?.label}</strong> ({confirm ? slabRange(confirm) : ''}) will be removed permanently.
                        OT falling in this band will have no slab until another one covers it.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setConfirm(null)} sx={{ textTransform: 'none', fontWeight: 700, color: '#64748B', borderRadius: '7px' }}>Cancel</Button>
                    <Button onClick={() => deleteSlab(confirm)} sx={{ ...solidBtn, height: 38, px: 2.2, bgcolor: '#E11D48', '&:hover': { bgcolor: '#BE123C' } }}>Delete</Button>
                </DialogActions>
            </Dialog>

            {/* Reject OT entry — reason required */}
            <Dialog open={Boolean(reject)} onClose={() => { if (!actingId) setReject(null); }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Reject Overtime Entry</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>
                        {reject ? `${reject.employeeName} · ${reject.date} · ${fmtHrs(reject.otHours)}` : ''} — the employee sees this reason, so say what they should do next.
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#374151', mb: 1 }}>Common reasons — tap to use, then edit if needed</Typography>
                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.8, mb: 2 }}>
                        {OT_REJECT_TEMPLATES.map((t) => {
                            const active = rejectReason === t.text;
                            return (
                                <Chip
                                    key={t.label} label={t.label} size="small" onClick={() => setRejectReason(t.text)}
                                    sx={{
                                        cursor: 'pointer', fontWeight: 700, fontSize: 11.5,
                                        bgcolor: active ? PRIMARY : '#F1F5F9', color: active ? '#fff' : '#475569',
                                        '&:hover': { bgcolor: active ? PRIMARY_DARK : '#E2E8F0' },
                                    }}
                                />
                            );
                        })}
                    </Stack>
                    <TextField
                        label="Rejection reason" size="small" fullWidth multiline minRows={3}
                        value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Pick a reason above, or write your own."
                        helperText={`${rejectReason.trim().length}/400`}
                        inputProps={{ maxLength: 400 }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setReject(null)} disabled={Boolean(actingId)} sx={{ textTransform: 'none', fontWeight: 700, color: '#64748B', borderRadius: '7px' }}>Cancel</Button>
                    <Button
                        onClick={() => runEntryAction(reject, 'reject', rejectReason)}
                        disabled={Boolean(actingId) || !rejectReason.trim()}
                        startIcon={actingId ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : <CloseRoundedIcon />}
                        sx={{ ...solidBtn, height: 40, px: 2.4, bgcolor: '#E11D48', '&:hover': { bgcolor: '#BE123C' }, '&.Mui-disabled': { bgcolor: '#FBCFE8', color: '#fff' } }}>
                        {actingId ? 'Rejecting…' : 'Reject Entry'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={Boolean(snack)} autoHideDuration={3800} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack(null)} severity={snack?.sev || 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack?.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
