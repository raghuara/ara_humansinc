import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Stack, Grid, Chip, Button, IconButton, Tooltip, CircularProgress, Alert,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, InputAdornment,
    LinearProgress, Snackbar,
} from '@mui/material';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import http, { apiErrorMessage } from '../../Api/http';
import { GetAdvanceFormOptions, RequestAdvance, GetMyAdvanceRequests } from '../../Api/Api';
import { PRIMARY, PRIMARY_LIGHT } from '../../theme';
import { card, solidBtn, ghostBtn, field, Panel, EmptyState } from '../uiKit';

const inr = (v) => `₹${(Number(v) || 0).toLocaleString('en-IN')}`;

const STATUS_TONE = {
    active: { c: '#0891B2', bg: '#E0F2FE' },
    pending: { c: '#B45309', bg: '#FEF3C7' },
    approved: { c: '#16A34A', bg: '#DCFCE7' },
    completed: { c: '#16A34A', bg: '#DCFCE7' },
    rejected: { c: '#DC2626', bg: '#FEE2E2' },
};
const toneFor = (s) => STATUS_TONE[String(s || '').toLowerCase()] || { c: '#64748B', bg: '#F1F5F9' };

const thisMonthInput = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (v) => {
    const m = /^(\d{4})-(\d{2})$/.exec(String(v || ''));
    if (!m) return v || '';
    return new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
};
const n = (v) => Number(v) || 0;

// Self-service salary advances. An employee asks for an advance and the recovery
// plan (how many months it's deducted over); it lands in an approver's queue.
// Keyed off the token — the caller only ever sees and creates their own.
export default function AdvanceRequestScreen() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [options, setOptions] = useState(null);   // GetAdvanceFormOptions payload
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ amount: '', recoveryPlan: 'monthly', months: 3, startMonth: thisMonthInput(), notes: '' });
    const [tried, setTried] = useState(false);
    const [saving, setSaving] = useState(false);
    const [snack, setSnack] = useState(null);

    const notify = (msg, sev = 'success') => setSnack({ msg, sev });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data: body } = await http.get(GetMyAdvanceRequests);
            if (body?.error) throw new Error(body.message || 'Could not load your advances.');
            const d = body?.data;
            setRows(Array.isArray(d) ? d : (d?.requests || d?.items || d?.advances || []));
            setLoadError('');
        } catch (err) {
            if (err?.response?.status === 404) { setRows([]); setLoadError(''); }   // "no advance requests" = empty
            else setLoadError(apiErrorMessage(err, 'Could not load your advances.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Recovery window / plan list / month bounds for the form. Optional — the
    // form still works with sensible defaults if this can't be read.
    const openDialog = async () => {
        setForm({ amount: '', recoveryPlan: 'monthly', months: 3, startMonth: thisMonthInput(), notes: '' });
        setTried(false);
        setOpen(true);
        if (options) return;
        try {
            const { data: body } = await http.get(GetAdvanceFormOptions);
            if (!body?.error) setOptions(body?.data || null);
        } catch { /* defaults are fine */ }
    };

    const plans = Array.isArray(options?.plans) && options.plans.length
        ? options.plans.map((p) => (typeof p === 'string' ? { value: p, label: p } : { value: p.value ?? p.key, label: p.label ?? p.name ?? p.value }))
        : [{ value: 'monthly', label: 'Monthly instalments' }, { value: 'onetime', label: 'One-time (single deduction)' }];
    const minMonths = n(options?.minMonths) || 1;
    const maxMonths = n(options?.maxMonths) || 12;
    const startHint = options?.startMonthHint || options?.hint || '';

    const isMonthly = form.recoveryPlan === 'monthly';
    const amountNum = n(form.amount);
    const monthsNum = n(form.months);
    const perMonth = isMonthly && monthsNum > 0 ? Math.round(amountNum / monthsNum) : amountNum;
    const monthsBad = isMonthly && (monthsNum < minMonths || monthsNum > maxMonths);
    const valid = amountNum > 0 && form.startMonth && !monthsBad;

    const submit = async () => {
        setTried(true);
        if (!valid) {
            notify(amountNum <= 0 ? 'Enter the advance amount.'
                : monthsBad ? `Choose between ${minMonths} and ${maxMonths} months.`
                    : 'Pick the recovery start month.', 'warning');
            return;
        }
        setSaving(true);
        try {
            const { data: body } = await http.post(RequestAdvance, {
                amount: amountNum,
                recoveryPlan: form.recoveryPlan,
                months: isMonthly ? monthsNum : 1,
                startMonth: form.startMonth,   // yyyy-MM
                notes: form.notes.trim(),
            });
            if (body?.error) throw new Error(body.message || 'Could not raise the request.');
            notify(body?.message || 'Advance request raised.');
            setOpen(false);
            await load();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not raise the request.'), 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box sx={{ p: 2, pt: 1.5 }}>
            <Panel
                title="My Salary Advances"
                icon={SavingsRoundedIcon}
                chip={`${rows.length}`}
                action={(
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Tooltip arrow title="Reload">
                            <IconButton onClick={load} disabled={loading} sx={{ border: '1px solid #E6EAF1', borderRadius: '7px', color: '#64748B', height: 38, width: 38, '&:hover': { bgcolor: PRIMARY_LIGHT, color: PRIMARY } }}>
                                <RefreshRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                        <Button startIcon={<AddRoundedIcon />} onClick={openDialog} sx={{ ...solidBtn, height: 38, px: 1.8, fontSize: 13 }}>Request Advance</Button>
                    </Stack>
                )}
            >
                {loading ? (
                    <Box sx={{ p: 5, display: 'flex', justifyContent: 'center' }}><CircularProgress size={26} /></Box>
                ) : loadError ? (
                    <Box sx={{ p: 3 }}>
                        <Alert severity="error" sx={{ borderRadius: '9px' }} action={<Button size="small" onClick={load} sx={{ textTransform: 'none', fontWeight: 700 }}>Retry</Button>}>{loadError}</Alert>
                    </Box>
                ) : rows.length === 0 ? (
                    <EmptyState
                        icon={SavingsRoundedIcon}
                        title="No advance requests yet"
                        hint="Request a salary advance and choose how many months to recover it over."
                    />
                ) : (
                    <Box sx={{ p: 1.8 }}>
                        <Grid container spacing={1.2}>
                            {rows.map((r, idx) => {
                                const tone = toneFor(r.status);
                                const amount = n(r.amount);
                                const recovered = n(r.recoveredAmount ?? r.recovered);
                                const outstanding = r.outstanding != null ? n(r.outstanding) : Math.max(0, amount - recovered);
                                const pct = amount ? Math.min(100, Math.round((recovered / amount) * 100)) : 0;
                                const showProgress = ['active', 'completed'].includes(String(r.status).toLowerCase());
                                return (
                                    <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={r.id ?? idx}>
                                        <Box sx={{ ...card, p: 1.8, height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{inr(amount)}</Typography>
                                                <Chip label={r.status} size="small" sx={{ height: 22, fontSize: 10.5, fontWeight: 800, bgcolor: tone.bg, color: tone.c }} />
                                            </Stack>
                                            <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                                                {String(r.recoveryPlan).toLowerCase() === 'onetime'
                                                    ? 'One-time deduction'
                                                    : `${n(r.months) || '—'} monthly instalment${n(r.months) === 1 ? '' : 's'}${r.deductPerMonth ? ` · ${inr(r.deductPerMonth)}/mo` : (r.months ? ` · ${inr(Math.round(amount / n(r.months)))}/mo` : '')}`}
                                                {r.startMonth ? ` · from ${monthLabel(r.startMonth)}` : ''}
                                            </Typography>
                                            {showProgress && (
                                                <Box>
                                                    <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.4 }}>
                                                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#16A34A' }}>{inr(recovered)} recovered</Typography>
                                                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: outstanding ? PRIMARY : '#16A34A' }}>{outstanding ? `${inr(outstanding)} left` : 'Cleared'}</Typography>
                                                    </Stack>
                                                    <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 5, bgcolor: '#EEF0F6', '& .MuiLinearProgress-bar': { bgcolor: pct === 100 ? '#16A34A' : PRIMARY, borderRadius: 5 } }} />
                                                </Box>
                                            )}
                                            {r.rejectReason && (
                                                <Typography sx={{ fontSize: 11.5, color: '#B91C1C', bgcolor: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '7px', px: 1, py: 0.6 }}>Rejected: {r.rejectReason}</Typography>
                                            )}
                                            {r.notes && !r.rejectReason && <Typography sx={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>{r.notes}</Typography>}
                                        </Box>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </Box>
                )}
            </Panel>

            {/* Request dialog */}
            <Dialog open={open} onClose={() => !saving && setOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Request Salary Advance</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>It's recovered from your salary over the months you choose.</Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    <Grid container spacing={1.8}>
                        <Grid size={12}>
                            <TextField label="Amount" type="number" size="small" fullWidth value={form.amount}
                                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} error={tried && amountNum <= 0}
                                slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }} sx={field} />
                        </Grid>
                        <Grid size={12}>
                            <TextField select label="Recovery plan" size="small" fullWidth value={form.recoveryPlan}
                                onChange={(e) => setForm((f) => ({ ...f, recoveryPlan: e.target.value }))} sx={field}>
                                {plans.map((p) => <MenuItem key={p.value} value={p.value} sx={{ fontSize: 13.5 }}>{p.label}</MenuItem>)}
                            </TextField>
                        </Grid>
                        {isMonthly && (
                            <Grid size={6}>
                                <TextField label="Over (months)" type="number" size="small" fullWidth value={form.months}
                                    onChange={(e) => setForm((f) => ({ ...f, months: e.target.value }))} error={tried && monthsBad}
                                    helperText={`${minMonths}–${maxMonths} months`} slotProps={{ htmlInput: { min: minMonths, max: maxMonths } }} sx={field} />
                            </Grid>
                        )}
                        <Grid size={isMonthly ? 6 : 12}>
                            <TextField label="Recover from" type="month" size="small" fullWidth value={form.startMonth}
                                onChange={(e) => setForm((f) => ({ ...f, startMonth: e.target.value }))} error={tried && !form.startMonth}
                                slotProps={{ inputLabel: { shrink: true } }} sx={field} />
                        </Grid>
                        {(startHint || (isMonthly && amountNum > 0 && monthsNum > 0)) && (
                            <Grid size={12}>
                                <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                                    {isMonthly && amountNum > 0 && monthsNum > 0 && <>≈ <strong>{inr(perMonth)}</strong> deducted per month. </>}
                                    {startHint}
                                </Typography>
                            </Grid>
                        )}
                        <Grid size={12}>
                            <TextField label="Notes (optional)" size="small" fullWidth multiline minRows={2} value={form.notes}
                                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="e.g. Medical emergency" sx={field} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setOpen(false)} disabled={saving} sx={{ ...ghostBtn, height: 40, px: 2 }}>Cancel</Button>
                    <Button onClick={submit} disabled={saving} startIcon={saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null} sx={{ ...solidBtn, height: 40, px: 2.4 }}>
                        {saving ? 'Sending…' : 'Raise Request'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={Boolean(snack)} autoHideDuration={3400} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack(null)} severity={snack?.sev || 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack?.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
