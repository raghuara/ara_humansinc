import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Stack, Grid, Chip, Button, IconButton, Tooltip, CircularProgress, Alert,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar,
} from '@mui/material';
import MoreTimeRoundedIcon from '@mui/icons-material/MoreTimeRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ArrowRightAltRoundedIcon from '@mui/icons-material/ArrowRightAltRounded';
import http, { apiErrorMessage } from '../../Api/http';
import { RequestOvertime, GetMyOvertimeRequests } from '../../Api/Api';
import { PRIMARY, PRIMARY_LIGHT } from '../../theme';
import { card, solidBtn, ghostBtn, field, Panel, EmptyState } from '../uiKit';

const inr = (v) => `₹${(Number(v) || 0).toLocaleString('en-IN')}`;
const n = (v) => Number(v) || 0;

// date input gives "YYYY-MM-DD"; the API wants "dd-MM-yyyy".
const toApiDate = (v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v.slice(8, 10)}-${v.slice(5, 7)}-${v.slice(0, 4)}` : '');
const fmtDate = (v) => {
    // Accepts YYYY-MM-DD or dd-MM-yyyy.
    let d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) d = new Date(v);
    else if (/^\d{2}-\d{2}-\d{4}$/.test(v)) d = new Date(`${v.slice(6, 10)}-${v.slice(3, 5)}-${v.slice(0, 2)}`);
    return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (v || '—');
};
const fmtClock = (t) => {
    if (!t) return '—';
    const [h, m] = String(t).split(':').map(Number);
    if (!Number.isFinite(h)) return String(t);
    return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

const STATUS_TONE = {
    approved: { c: '#16A34A', bg: '#DCFCE7' },
    pending: { c: '#B45309', bg: '#FEF3C7' },
    rejected: { c: '#DC2626', bg: '#FEE2E2' },
};
const toneFor = (s) => STATUS_TONE[String(s || '').toLowerCase()] || { c: '#64748B', bg: '#F1F5F9' };

const todayInput = () => new Date().toISOString().slice(0, 10);

// Self-service overtime. An employee claims OT for a day by entering their shift
// end and actual sign-off; the server computes the hours (past the grace window),
// picks the matching slab and the pay, and files it Pending for approval.
// Keyed off the token — the caller only ever sees and creates their own.
export default function OvertimeRequestScreen() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ date: todayInput(), shiftEnd: '18:00', signOff: '' });
    const [tried, setTried] = useState(false);
    const [saving, setSaving] = useState(false);
    const [snack, setSnack] = useState(null);

    const notify = (msg, sev = 'success') => setSnack({ msg, sev });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data: body } = await http.get(GetMyOvertimeRequests);
            if (body?.error) throw new Error(body.message || 'Could not load your overtime.');
            const d = body?.data;
            setRows(Array.isArray(d) ? d : (d?.entries || d?.requests || d?.items || []));
            setLoadError('');
        } catch (err) {
            if (err?.response?.status === 404) { setRows([]); setLoadError(''); }   // "no overtime entries" = empty
            else setLoadError(apiErrorMessage(err, 'Could not load your overtime.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openDialog = () => { setForm({ date: todayInput(), shiftEnd: '18:00', signOff: '' }); setTried(false); setOpen(true); };
    const valid = form.date && form.shiftEnd && form.signOff;

    const submit = async () => {
        setTried(true);
        if (!valid) { notify('Enter the date, shift end and your sign-off time.', 'warning'); return; }
        setSaving(true);
        try {
            const { data: body } = await http.post(RequestOvertime, {
                Date: toApiDate(form.date),
                ShiftEnd: form.shiftEnd,
                SignOff: form.signOff,
            });
            if (body?.error) throw new Error(body.message || 'Could not claim overtime.');
            notify(body?.message || 'Overtime claim raised.');
            setOpen(false);
            await load();
        } catch (err) {
            // A sign-off within the grace window returns 400 "no overtime" — show it.
            notify(apiErrorMessage(err, 'Could not claim overtime.'), 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Box sx={{ p: 2, pt: 1.5 }}>
            <Panel
                title="My Overtime"
                icon={MoreTimeRoundedIcon}
                chip={`${rows.length}`}
                action={(
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Tooltip arrow title="Reload">
                            <IconButton onClick={load} disabled={loading} sx={{ border: '1px solid #E6EAF1', borderRadius: '7px', color: '#64748B', height: 38, width: 38, '&:hover': { bgcolor: PRIMARY_LIGHT, color: PRIMARY } }}>
                                <RefreshRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                        <Button startIcon={<AddRoundedIcon />} onClick={openDialog} sx={{ ...solidBtn, height: 38, px: 1.8, fontSize: 13 }}>Claim Overtime</Button>
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
                        icon={MoreTimeRoundedIcon}
                        title="No overtime claims yet"
                        hint="Claim OT for a day by entering your shift end and actual sign-off — the pay is worked out for you."
                    />
                ) : (
                    <Box sx={{ p: 1.8 }}>
                        <Grid container spacing={1.2}>
                            {rows.map((r, idx) => {
                                const tone = toneFor(r.status);
                                const otPay = n(r.otPay ?? r.pay ?? r.amount);
                                return (
                                    <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={r.id ?? idx}>
                                        <Box sx={{ ...card, p: 1.8, height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: '#0F172A' }}>{r.dateLabel || fmtDate(r.date)}</Typography>
                                                <Chip label={r.status} size="small" sx={{ height: 22, fontSize: 10.5, fontWeight: 800, bgcolor: tone.bg, color: tone.c }} />
                                            </Stack>
                                            <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
                                                <Typography sx={{ fontSize: 22, fontWeight: 800, color: PRIMARY }}>{r.otHoursLabel || `${n(r.otHours)}h`}</Typography>
                                                <Typography sx={{ fontSize: 12, color: '#64748B' }}>overtime</Typography>
                                            </Stack>
                                            <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center', color: '#64748B' }}>
                                                <Typography sx={{ fontSize: 12 }}>{fmtClock(r.shiftEnd)}</Typography>
                                                <ArrowRightAltRoundedIcon sx={{ fontSize: 16, color: '#CBD2DD' }} />
                                                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>{fmtClock(r.signOff)}</Typography>
                                                {r.slab && <Chip label={r.slab} size="small" sx={{ ml: 0.5, height: 18, fontSize: 9.5, fontWeight: 700, bgcolor: PRIMARY_LIGHT, color: PRIMARY }} />}
                                            </Stack>
                                            <Box sx={{ flexGrow: 1 }} />
                                            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', pt: 0.6, borderTop: '1px solid #F1F0F9' }}>
                                                <Typography sx={{ fontSize: 11, color: '#98A0AE' }}>OT pay</Typography>
                                                <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#16A34A' }}>{inr(otPay)}</Typography>
                                            </Stack>
                                            {r.rejectReason && (
                                                <Typography sx={{ fontSize: 11.5, color: '#B91C1C', bgcolor: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '7px', px: 1, py: 0.6 }}>Rejected: {r.rejectReason}</Typography>
                                            )}
                                        </Box>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </Box>
                )}
            </Panel>

            {/* Claim dialog */}
            <Dialog open={open} onClose={() => !saving && setOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Claim Overtime</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>Enter when your shift ended and when you actually signed off. OT and pay are computed for you.</Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    <Grid container spacing={1.8}>
                        <Grid size={12}>
                            <TextField label="Date" type="date" size="small" fullWidth value={form.date}
                                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} error={tried && !form.date}
                                slotProps={{ inputLabel: { shrink: true } }} sx={field} />
                        </Grid>
                        <Grid size={6}>
                            <TextField label="Shift end" type="time" size="small" fullWidth value={form.shiftEnd}
                                onChange={(e) => setForm((f) => ({ ...f, shiftEnd: e.target.value }))} error={tried && !form.shiftEnd}
                                slotProps={{ inputLabel: { shrink: true } }} sx={field} />
                        </Grid>
                        <Grid size={6}>
                            <TextField label="Signed off at" type="time" size="small" fullWidth value={form.signOff}
                                onChange={(e) => setForm((f) => ({ ...f, signOff: e.target.value }))} error={tried && !form.signOff}
                                slotProps={{ inputLabel: { shrink: true } }} sx={field} />
                        </Grid>
                        <Grid size={12}>
                            <Typography sx={{ fontSize: 11.5, color: '#94A3B8' }}>Overtime only counts once you're past the grace window after shift end.</Typography>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setOpen(false)} disabled={saving} sx={{ ...ghostBtn, height: 40, px: 2 }}>Cancel</Button>
                    <Button onClick={submit} disabled={saving} startIcon={saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null} sx={{ ...solidBtn, height: 40, px: 2.4 }}>
                        {saving ? 'Sending…' : 'Claim OT'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={Boolean(snack)} autoHideDuration={3400} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack(null)} severity={snack?.sev || 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack?.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
