import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Stack, Grid, Chip, Button, IconButton, Tooltip, CircularProgress, Alert,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar,
} from '@mui/material';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import http, { apiErrorMessage } from '../../Api/http';
import { RequestPayslip, GetMyPayslipRequests } from '../../Api/Api';
import { PRIMARY, PRIMARY_LIGHT } from '../../theme';
import { card, solidBtn, ghostBtn, field, Panel, EmptyState } from '../uiKit';

// The month inputs give "YYYY-MM"; the API wants "MM-yyyy".
const toApiMonth = (v) => (v && /^\d{4}-\d{2}$/.test(v) ? `${v.slice(5, 7)}-${v.slice(0, 4)}` : '');
const monthLabel = (v) => {
    if (!v) return '';
    // Accepts "YYYY-MM" or "MM-YYYY".
    const m = /^(\d{4})-(\d{2})$/.test(v) ? { y: v.slice(0, 4), mo: v.slice(5, 7) }
        : /^(\d{2})-(\d{4})$/.test(v) ? { y: v.slice(3, 7), mo: v.slice(0, 2) } : null;
    if (!m) return v;
    const d = new Date(Number(m.y), Number(m.mo) - 1, 1);
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};

const STATUS_TONE = {
    approved: { c: '#16A34A', bg: '#DCFCE7', icon: CheckCircleRoundedIcon },
    pending: { c: '#B45309', bg: '#FEF3C7', icon: HourglassEmptyRoundedIcon },
    rejected: { c: '#DC2626', bg: '#FEE2E2', icon: CancelRoundedIcon },
};
const toneFor = (s) => STATUS_TONE[String(s || '').toLowerCase()] || { c: '#64748B', bg: '#F1F5F9', icon: HourglassEmptyRoundedIcon };

// The current YYYY-MM, so the pickers default to something sensible.
const thisMonthInput = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Self-service payslip requests. Any signed-in user can ask to see their own
// payslips for a span of months; the request lands in an approver's queue and,
// once approved, the payslip becomes viewable. Keyed off the token — a caller
// only ever sees and creates their own requests.
export default function PayslipRequestScreen() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ from: thisMonthInput(), to: thisMonthInput(), note: '' });
    const [tried, setTried] = useState(false);
    const [saving, setSaving] = useState(false);
    const [snack, setSnack] = useState(null);   // { msg, sev }

    const notify = (msg, sev = 'success') => setSnack({ msg, sev });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data: body } = await http.get(GetMyPayslipRequests);
            if (body?.error) throw new Error(body.message || 'Could not load your requests.');
            const d = body?.data;
            const list = Array.isArray(d) ? d : (d?.requests || d?.items || []);
            setRows(list);
            setLoadError('');
        } catch (err) {
            // "You have no payslip requests" comes back as a 404 — that's an
            // empty list, not an error.
            if (err?.response?.status === 404) { setRows([]); setLoadError(''); }
            else setLoadError(apiErrorMessage(err, 'Could not load your requests.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openDialog = () => { setForm({ from: thisMonthInput(), to: thisMonthInput(), note: '' }); setTried(false); setOpen(true); };
    const rangeBad = form.from && form.to && form.to < form.from;
    const valid = form.from && form.to && !rangeBad;

    const submit = async () => {
        setTried(true);
        if (!valid) {
            notify(rangeBad ? 'The "to" month cannot be before the "from" month.' : 'Pick the months you need.', 'warning');
            return;
        }
        setSaving(true);
        try {
            const { data: body } = await http.post(RequestPayslip, {
                FromMonth: toApiMonth(form.from),
                ToMonth: toApiMonth(form.to),
                Note: form.note.trim(),
            });
            if (body?.error) throw new Error(body.message || 'Could not raise the request.');
            notify(body?.message || 'Payslip request raised.');
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
                title="My Payslip Requests"
                icon={ReceiptLongRoundedIcon}
                chip={`${rows.length}`}
                action={(
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Tooltip arrow title="Reload">
                            <IconButton onClick={load} disabled={loading} sx={{ border: '1px solid #E6EAF1', borderRadius: '7px', color: '#64748B', height: 38, width: 38, '&:hover': { bgcolor: PRIMARY_LIGHT, color: PRIMARY } }}>
                                <RefreshRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                        <Button startIcon={<AddRoundedIcon />} onClick={openDialog} sx={{ ...solidBtn, height: 38, px: 1.8, fontSize: 13 }}>Request Payslip</Button>
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
                        icon={ReceiptLongRoundedIcon}
                        title="No payslip requests yet"
                        hint="Request a payslip for the months you need — once it's approved, you can view it here."
                    />
                ) : (
                    <Box sx={{ p: 1.8 }}>
                        <Grid container spacing={1.2}>
                            {rows.map((r, idx) => {
                                const tone = toneFor(r.status);
                                const Icon = tone.icon;
                                return (
                                    <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={r.id ?? `${r.month}-${idx}`}>
                                        <Box sx={{ ...card, p: 1.8, height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: '#0F172A' }}>{r.monthLabel || monthLabel(r.month)}</Typography>
                                                <Chip icon={<Icon sx={{ fontSize: '15px !important', color: `${tone.c} !important` }} />} label={r.status} size="small" sx={{ height: 22, fontSize: 10.5, fontWeight: 800, bgcolor: tone.bg, color: tone.c }} />
                                            </Stack>
                                            {r.note && <Typography sx={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>{r.note}</Typography>}
                                            {r.rejectReason && (
                                                <Typography sx={{ fontSize: 11.5, color: '#B91C1C', bgcolor: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '7px', px: 1, py: 0.6 }}>
                                                    Rejected: {r.rejectReason}
                                                </Typography>
                                            )}
                                            <Box sx={{ flexGrow: 1 }} />
                                            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', pt: 0.6, borderTop: '1px solid #F1F0F9' }}>
                                                <Typography sx={{ fontSize: 11, color: '#98A0AE' }}>{r.requestedOn ? `Requested ${r.requestedOn}` : ''}</Typography>
                                                {(r.payslipReady || String(r.status).toLowerCase() === 'approved') && (
                                                    <Chip label="Ready to view" size="small" sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: '#DCFCE7', color: '#16A34A' }} />
                                                )}
                                            </Stack>
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
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Request Payslip</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>Pick the month range. One request is raised per month; each needs approval before you can view it.</Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    <Grid container spacing={1.8}>
                        <Grid size={6}>
                            <TextField label="From month" type="month" size="small" fullWidth value={form.from}
                                onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))} error={tried && !form.from}
                                slotProps={{ inputLabel: { shrink: true } }} sx={field} />
                        </Grid>
                        <Grid size={6}>
                            <TextField label="To month" type="month" size="small" fullWidth value={form.to}
                                onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))} error={tried && (!form.to || rangeBad)}
                                helperText={rangeBad ? 'Must be on/after the from month.' : ' '}
                                slotProps={{ inputLabel: { shrink: true } }} sx={field} />
                        </Grid>
                        <Grid size={12}>
                            <TextField label="Note (optional)" size="small" fullWidth multiline minRows={2} value={form.note}
                                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="e.g. Need for a loan application" sx={field} />
                        </Grid>
                        {form.from && form.to && !rangeBad && (
                            <Grid size={12}>
                                <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                                    Requesting <strong>{monthLabel(form.from)}</strong>{form.to !== form.from ? <> to <strong>{monthLabel(form.to)}</strong></> : ''}.
                                </Typography>
                            </Grid>
                        )}
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
