import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Grid, Button, Avatar, Chip, Stack, Tooltip, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, InputAdornment,
    Snackbar, Alert, MenuItem,
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
import { useSelector, useDispatch } from 'react-redux';
import {
    selectOtSlabs, selectOtRecords, selectOtGrace, otPayFor,
    addSlab, updateSlab, removeSlab, setGraceMinutes, approveOtRecord, rejectOtRecord,
} from '../redux/slices/overtimeSlice';

const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_DARK = '#6246E0';
const PRIMARY_BORDER = '#C9BEFB';
const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
const solidBtn = { bgcolor: PRIMARY, color: '#fff', fontWeight: 700, borderRadius: '7px', boxShadow: 'none', textTransform: 'none', '&:hover': { bgcolor: PRIMARY_DARK, boxShadow: 'none' } };

const PALETTE = ['#7C5CFC', '#0EA5E9', '#F59E0B', '#16A34A', '#E11D48', '#6246E0', '#0891B2'];
const initials = (n = '') => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const colorFor = (s = '') => PALETTE[(s.charCodeAt(0) || 0) % PALETTE.length];
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtHrs = (h) => `${Number(h) % 1 === 0 ? h : Number(h).toFixed(1)} hr${h === 1 ? '' : 's'}`;
const fmtTime = (t) => {
    if (!t) return '—';
    const [h, m] = t.split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM'; const hr = h % 12 || 12;
    return `${hr}:${String(m).padStart(2, '0')} ${ap}`;
};
const slabRange = (s) => s.toHr === null ? `${s.fromHr}+ hrs` : `${s.fromHr}–${s.toHr} hrs`;

const EMPTY_SLAB = { label: '', fromHr: '', toHr: '', andAbove: false, payType: 'perhour', amount: '' };

export default function OvertimePage() {
    const dispatch = useDispatch();
    const slabs = useSelector(selectOtSlabs);
    const records = useSelector(selectOtRecords);
    const grace = useSelector(selectOtGrace);

    const [snack, setSnack] = useState('');
    const [dialog, setDialog] = useState(null);   // { id? } — open when set
    const [form, setForm] = useState(EMPTY_SLAB);
    const [tried, setTried] = useState(false);

    const pending = records.filter((r) => r.status === 'pending');
    const stats = useMemo(() => {
        const monthHours = records.reduce((s, r) => s + r.otHours, 0);
        const payout = records.reduce((s, r) => s + otPayFor(r.otHours, slabs).pay, 0);
        const rates = slabs.filter((s) => s.payType === 'perhour').map((s) => s.amount);
        return { rules: slabs.length, topRate: rates.length ? Math.max(...rates) : 0, monthHours, payout, pending: pending.length };
    }, [records, slabs, pending.length]);

    const KPIS = [
        { label: 'OT Rate Slabs', value: stats.rules, sub: 'Configured bands', icon: LayersRoundedIcon, color: PRIMARY, bg: PRIMARY_LIGHT },
        { label: 'Top Hourly Rate', value: inr(stats.topRate), sub: 'Highest per-hour', icon: PaymentsRoundedIcon, color: '#16A34A', bg: '#DCFCE7' },
        { label: 'OT Hours', value: fmtHrs(stats.monthHours), sub: 'Logged this period', icon: AccessTimeFilledRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE' },
        { label: 'Pending Approvals', value: stats.pending, sub: 'Awaiting review', icon: PendingActionsRoundedIcon, color: '#F59E0B', bg: '#FFF7ED' },
    ];

    // ── Slab dialog ─────────────────────────────────────────────────────────
    const openAdd = () => { setForm(EMPTY_SLAB); setTried(false); setDialog({}); };
    const openEdit = (s) => {
        setForm({ label: s.label, fromHr: String(s.fromHr), toHr: s.toHr === null ? '' : String(s.toHr), andAbove: s.toHr === null, payType: s.payType, amount: String(s.amount) });
        setTried(false); setDialog({ id: s.id });
    };
    const closeDialog = () => setDialog(null);

    const fromN = Number(form.fromHr);
    const toN = Number(form.toHr);
    const amtN = Number(form.amount);
    const slabValid = form.label.trim()
        && form.fromHr !== '' && !Number.isNaN(fromN) && fromN >= 0
        && (form.andAbove || (form.toHr !== '' && toN > fromN))
        && amtN > 0;

    const saveSlab = () => {
        setTried(true);
        if (!slabValid) { setSnack('Please complete the slab fields correctly.'); return; }
        const payload = { label: form.label.trim(), fromHr: fromN, toHr: form.andAbove ? null : toN, payType: form.payType, amount: amtN };
        if (dialog.id) { dispatch(updateSlab({ id: dialog.id, changes: payload })); setSnack('OT slab updated.'); }
        else { dispatch(addSlab(payload)); setSnack('OT slab added.'); }
        closeDialog();
    };

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    // Preview payout for the slab being edited (sample at the from-hour)
    const previewHrs = form.andAbove ? fromN + 1 : (toN || fromN);
    const previewPay = form.payType === 'flat' ? amtN : amtN * (previewHrs || 0);

    return (
        <Box sx={{ p: 2 }}>
            {/* Header */}
            <Box sx={{ pb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexWrap: 'wrap', gap: 1.5 }}>
                <Box>
                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>Overtime (OT)</Typography>
                    <Typography sx={{ fontSize: 13, color: '#6B7280', mt: 0.3 }}>Configure OT pay slabs and approve extra hours worked beyond shift end</Typography>
                </Box>
                <Button startIcon={<AddRoundedIcon />} onClick={openAdd} sx={{ ...solidBtn, height: 42, px: 2.2 }}>Add Rate Slab</Button>
            </Box>

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
                    {/* Grace setting */}
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', ml: 'auto' }}>
                        <TuneRoundedIcon sx={{ fontSize: 17, color: '#94A3B8' }} />
                        <Typography sx={{ fontSize: 12, color: '#6B7280' }}>OT counts after</Typography>
                        <TextField
                            type="number" size="small" value={grace}
                            onChange={(e) => dispatch(setGraceMinutes(e.target.value))}
                            sx={{ width: 92, '& .MuiOutlinedInput-root': { borderRadius: '7px', bgcolor: '#fff', height: 34, fontSize: 13 } }}
                            InputProps={{ endAdornment: <InputAdornment position="end"><Typography sx={{ fontSize: 11, color: '#94A3B8' }}>min</Typography></InputAdornment> }}
                        />
                        <Typography sx={{ fontSize: 12, color: '#6B7280' }}>past shift end</Typography>
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
                                const { pay } = otPayFor(Math.max(s.fromHr, s.toHr === null ? s.fromHr + 0.5 : s.toHr - 0.5), slabs);
                                return (
                                    <Box component="tr" key={s.id} sx={{ bgcolor: idx % 2 ? '#FBFAFE' : '#fff' }}>
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
                                            <Typography sx={{ fontSize: 12.5, color: '#475569' }}>{fmtHrs(sample)} → <strong style={{ color: '#16A34A' }}>{inr(pay)}</strong></Typography>
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <Tooltip arrow title="Edit slab"><IconButton size="small" onClick={() => openEdit(s)} sx={{ color: PRIMARY, '&:hover': { bgcolor: PRIMARY_LIGHT } }}><EditRoundedIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                                            <Tooltip arrow title="Delete slab"><IconButton size="small" onClick={() => { dispatch(removeSlab(s.id)); setSnack('OT slab removed.'); }} sx={{ ml: 0.5, color: '#98A0AE', '&:hover': { color: '#E11D48', bgcolor: '#FEF2F2' } }}><DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
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
                    <Chip label={`${pending.length} pending`} size="small" sx={{ bgcolor: '#FFF7ED', color: '#B45309', fontWeight: 700, fontSize: 11.5 }} />
                    <Typography sx={{ fontSize: 11.5, color: '#98A0AE', ml: 'auto', display: { xs: 'none', sm: 'block' } }}>Derived from sign-off time vs scheduled shift end</Typography>
                </Stack>
                <Box sx={{ overflowX: 'auto' }}>
                    <Box component="table" sx={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
                        <Box component="thead" sx={{ bgcolor: '#F4F3FB' }}>
                            <Box component="tr">
                                {['EMPLOYEE', 'DATE', 'SHIFT END → SIGN OFF', 'OT HOURS', 'SLAB', 'OT PAY', 'STATUS', 'ACTIONS'].map((h) => (
                                    <Box component="th" key={h} sx={{ textAlign: h === 'ACTIONS' ? 'right' : 'left', px: 2.5, py: 1.6, fontSize: 10.5, fontWeight: 700, color: '#6E6B99', letterSpacing: 0.6, borderBottom: '1px solid #E8E6F3', whiteSpace: 'nowrap' }}>{h}</Box>
                                ))}
                            </Box>
                        </Box>
                        <Box component="tbody">
                            {records.map((r, idx) => {
                                const { slab, pay } = otPayFor(r.otHours, slabs);
                                const done = r.status === 'approved';
                                return (
                                    <Box component="tr" key={r.id} sx={{ bgcolor: idx % 2 ? '#FBFAFE' : '#fff' }}>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' }}>
                                            <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
                                                <Avatar sx={{ width: 34, height: 34, bgcolor: colorFor(r.employeeName), fontSize: 12.5, fontWeight: 700 }}>{initials(r.employeeName)}</Avatar>
                                                <Box>
                                                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{r.employeeName}</Typography>
                                                    <Typography sx={{ fontSize: 11.5, color: '#98A0AE' }}>{r.employeeId} · {r.department}</Typography>
                                                </Box>
                                            </Stack>
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6', fontSize: 12.5, color: '#475569', whiteSpace: 'nowrap' }}>{fmtDate(r.date)}</Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' }}>
                                            <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                                                <Chip label={fmtTime(r.shiftEnd)} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: '#F1F5F9', color: '#475569' }} />
                                                <LoginRoundedIcon sx={{ fontSize: 14, color: '#CBD2DD' }} />
                                                <Chip label={fmtTime(r.signOff)} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: PRIMARY_LIGHT, color: PRIMARY_DARK }} />
                                            </Stack>
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' }}>
                                            <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#0EA5E9' }}>{fmtHrs(r.otHours)}</Typography>
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' }}>
                                            {slab ? <Chip label={slab.label} size="small" sx={{ bgcolor: '#E0F2FE', color: '#0369A1', fontWeight: 700, fontSize: 11 }} /> : <Typography sx={{ fontSize: 12, color: '#E11D48' }}>No slab</Typography>}
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' }}>
                                            <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#16A34A' }}>{inr(pay)}</Typography>
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' }}>
                                            <Chip label={done ? 'Approved' : 'Pending'} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: done ? '#DCFCE7' : '#FEF3C7', color: done ? '#16A34A' : '#B45309' }} />
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            {!done ? (
                                                <Stack direction="row" spacing={0.8} sx={{ justifyContent: 'flex-end' }}>
                                                    <Button onClick={() => { dispatch(approveOtRecord(r.id)); setSnack(`OT approved — ${inr(pay)} for ${r.employeeName}.`); }} startIcon={<CheckRoundedIcon />} sx={{ ...solidBtn, height: 32, px: 1.5, fontSize: 12, bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' } }}>Approve</Button>
                                                    <Tooltip arrow title="Discard entry"><IconButton size="small" onClick={() => { dispatch(rejectOtRecord(r.id)); setSnack('OT entry discarded.'); }} sx={{ color: '#98A0AE', '&:hover': { color: '#E11D48', bgcolor: '#FEF2F2' } }}><CloseRoundedIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                                                </Stack>
                                            ) : (
                                                <CheckRoundedIcon sx={{ fontSize: 18, color: '#16A34A' }} />
                                            )}
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                    {records.length === 0 && (
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
                    <TextField label="Slab name" size="small" fullWidth value={form.label} onChange={set('label')} error={tried && !form.label.trim()} placeholder="e.g. Extended OT" sx={{ mb: 2 }} />

                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#374151', mb: 1 }}>OT duration band (in hours)</Typography>
                    <Stack direction="row" spacing={1.2} sx={{ mb: 1 }}>
                        <TextField label="From" type="number" size="small" fullWidth value={form.fromHr} onChange={set('fromHr')} error={tried && (form.fromHr === '' || fromN < 0)}
                            InputProps={{ endAdornment: <InputAdornment position="end">hr</InputAdornment> }} />
                        <TextField label="To" type="number" size="small" fullWidth value={form.toHr} onChange={set('toHr')} disabled={form.andAbove}
                            error={tried && !form.andAbove && (form.toHr === '' || toN <= fromN)}
                            InputProps={{ endAdornment: <InputAdornment position="end">hr</InputAdornment> }} />
                    </Stack>
                    <Box onClick={() => setForm((f) => ({ ...f, andAbove: !f.andAbove }))} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8, cursor: 'pointer', mb: 2 }}>
                        <Box sx={{ width: 18, height: 18, borderRadius: '5px', border: `1.5px solid ${form.andAbove ? PRIMARY : '#CBD5E1'}`, bgcolor: form.andAbove ? PRIMARY : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {form.andAbove && <CheckRoundedIcon sx={{ fontSize: 13, color: '#fff' }} />}
                        </Box>
                        <Typography sx={{ fontSize: 12.5, color: '#475569' }}>and above (no upper limit)</Typography>
                    </Box>

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
                    <Button onClick={closeDialog} sx={{ textTransform: 'none', fontWeight: 700, color: '#64748B', borderRadius: '7px' }}>Cancel</Button>
                    <Button onClick={saveSlab} sx={{ ...solidBtn, height: 40, px: 2.4 }}>{dialog?.id ? 'Save Slab' : 'Add Slab'}</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={Boolean(snack)} autoHideDuration={3200} onClose={() => setSnack('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack('')} severity="success" variant="filled" sx={{ borderRadius: '7px' }}>{snack}</Alert>
            </Snackbar>
        </Box>
    );
}
