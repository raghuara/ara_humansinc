import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Grid, Button, Stack, Chip, Snackbar, Alert, Skeleton,
    CircularProgress,
} from '@mui/material';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import EastRoundedIcon from '@mui/icons-material/EastRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useDispatch, useSelector } from 'react-redux';
import {
    MONTHS, monthName, setFinancialYearConfig, selectFinancialYearConfig,
} from '../redux/slices/financialYearSlice';
import http, { apiErrorMessage } from '../Api/http';
import { GetFinancialYearConfig, PostFinancialYearConfig } from '../Api/Api';

const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_BORDER = '#C9BEFB';
const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
const solidBtn = { bgcolor: PRIMARY, color: '#fff', fontWeight: 700, borderRadius: '7px', textTransform: 'none', boxShadow: 'none', '&:hover': { bgcolor: '#6246E0', boxShadow: 'none' }, '&.Mui-disabled': { bgcolor: '#E2E8F0', color: '#94A3B8' } };

// End month is start - 1, wrapped: April (4) -> March (3); January (1) -> December (12).
const endMonthFor = (start) => (Number(start) === 1 ? 12 : Number(start) - 1);

// Which financial year today falls in, given a start month. Shown as a preview
// only — the server assigns the authoritative label on save.
const previewYear = (start) => {
    const now = new Date();
    const y = now.getFullYear();
    const base = now.getMonth() + 1 >= Number(start) ? y : y - 1;
    return `${base}-${base + 1}`;
};

export default function FinancialYearPage() {
    const dispatch = useDispatch();
    const config = useSelector(selectFinancialYearConfig);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [saving, setSaving] = useState(false);
    const [startMonth, setStartMonth] = useState(4);
    const [snack, setSnack] = useState({ msg: '', severity: 'success' });

    const notify = (msg, severity = 'success') => setSnack({ msg, severity });

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const { data: body } = await http.get(GetFinancialYearConfig);
            if (body?.error) throw new Error(body.message || 'Could not load the financial year.');
            const cfg = body?.data || null;
            dispatch(setFinancialYearConfig(cfg));
            if (cfg?.startMonth) setStartMonth(Number(cfg.startMonth));
        } catch (err) {
            // 404 = this entity hasn't set its financial year yet. That's the
            // normal starting state (every new entity begins here), NOT an error —
            // clear any stale config so the picker shows and it can be set.
            if (err?.response?.status === 404) {
                dispatch(setFinancialYearConfig(null));
                setStartMonth(4);
                setLoadError('');
            } else {
                setLoadError(err?.response || err?.request ? apiErrorMessage(err, 'Could not load the financial year.') : err.message);
            }
        } finally {
            setLoading(false);
        }
    }, [dispatch]);

    useEffect(() => { load(); }, [load]);

    const locked = Boolean(config?.isLocked);
    const configured = Boolean(config?.startMonth);

    const save = async () => {
        setSaving(true);
        try {
            const { data: body } = await http.post(PostFinancialYearConfig, { startMonth: Number(startMonth) });
            if (body?.error) throw new Error(body.message || 'Could not save the financial year.');
            // The response is the new config — trust it over anything computed here.
            dispatch(setFinancialYearConfig(body?.data || null));
            if (body?.data?.startMonth) setStartMonth(Number(body.data.startMonth));
            notify('Financial year set.');
        } catch (err) {
            notify(err?.response || err?.request ? apiErrorMessage(err, 'Could not save the financial year.') : err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const endMonth = endMonthFor(startMonth);

    return (
        <Box sx={{ p: 2 }}>
            {/* Header */}
            <Box sx={{ pb: 2.5 }}>
                <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>Financial Year</Typography>
                <Typography sx={{ fontSize: 13, color: '#6B7280', mt: 0.3 }}>
                    Choose the month your financial year starts. Every payroll period, report and year label in the app follows it.
                </Typography>
            </Box>

            {loading && (
                <Stack spacing={1.5}>
                    <Skeleton variant="rounded" height={110} sx={{ borderRadius: '7px' }} />
                    <Skeleton variant="rounded" height={280} sx={{ borderRadius: '7px' }} />
                </Stack>
            )}

            {/* Only a REAL failure (network / 500) lands here. A 404 "not configured
                yet" is handled in load() as the normal unset state, not an error. */}
            {!loading && loadError && (
                <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center', ...card, p: 2.2, bgcolor: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <ErrorOutlineRoundedIcon sx={{ fontSize: 22, color: '#B91C1C' }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: '#991B1B' }}>Couldn't load the financial year</Typography>
                        <Typography sx={{ fontSize: 12.5, color: '#B91C1C' }}>{loadError}</Typography>
                    </Box>
                    <Button onClick={load} startIcon={<RefreshRoundedIcon sx={{ fontSize: 17 }} />} sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12.5, color: '#B91C1C', bgcolor: '#fff', border: '1px solid #FECACA', borderRadius: '7px', height: 38, px: 2 }}>Retry</Button>
                </Stack>
            )}

            {!loading && !loadError && (
                <Stack spacing={1.5}>
                    {/* Current period, or the "not set yet" prompt */}
                    <Box sx={{ ...card, p: 2.5, bgcolor: configured ? PRIMARY_LIGHT : '#fff', border: `1px solid ${configured ? PRIMARY_BORDER : '#E6EAF1'}` }}>
                        {configured ? (
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}>
                                <Stack direction="row" spacing={1.8} sx={{ alignItems: 'center' }}>
                                    <Box sx={{ width: 48, height: 48, borderRadius: '10px', bgcolor: '#fff', border: `1px solid ${PRIMARY_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <CalendarMonthRoundedIcon sx={{ fontSize: 24, color: PRIMARY }} />
                                    </Box>
                                    <Box>
                                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: PRIMARY, textTransform: 'uppercase', letterSpacing: 0.5 }}>Current financial year</Typography>
                                        <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center', mt: 0.3 }}>
                                            <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>{config.currentFinancialYear}</Typography>
                                            {locked && (
                                                <Chip icon={<LockRoundedIcon sx={{ fontSize: '14px !important' }} />} label="Locked" size="small"
                                                    sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: '#EEF2FF', color: '#4F46E5', border: '1px solid #DDE0FB', '& .MuiChip-icon': { color: '#4F46E5' } }} />
                                            )}
                                        </Stack>
                                        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', mt: 0.5 }}>
                                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{config.startMonthName || monthName(config.startMonth)}</Typography>
                                            <EastRoundedIcon sx={{ fontSize: 15, color: '#94A3B8' }} />
                                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{config.endMonthName || monthName(config.endMonth)}</Typography>
                                        </Stack>
                                    </Box>
                                </Stack>
                                {config.createdBy && (
                                    <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center' }}>
                                        <PersonRoundedIcon sx={{ fontSize: 15, color: '#94A3B8' }} />
                                        <Typography sx={{ fontSize: 12, color: '#6B7280' }}>Set by <strong>{config.createdBy}</strong></Typography>
                                    </Stack>
                                )}
                            </Stack>
                        ) : (
                            <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
                                <InfoOutlinedIcon sx={{ fontSize: 22, color: '#B45309' }} />
                                <Box>
                                    <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A' }}>No financial year set yet</Typography>
                                    <Typography sx={{ fontSize: 12.5, color: '#6B7280' }}>Pick a start month below to define it. In India this is usually April.</Typography>
                                </Box>
                            </Stack>
                        )}
                    </Box>

                    {/* Once set, the financial year is fixed: it anchors every leave
                        balance and payroll cycle for the entity, and the API rejects a
                        second write (409). So the month picker only shows while it is
                        still unset; after that it becomes a read-only notice. */}
                    {configured ? (
                        <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center', ...card, p: 1.8, bgcolor: '#EEF2FF', border: '1px solid #DDE0FB' }}>
                            <Box sx={{ width: 34, height: 34, borderRadius: '8px', bgcolor: '#fff', border: '1px solid #DDE0FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <LockRoundedIcon sx={{ fontSize: 18, color: '#4F46E5' }} />
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#3730A3' }}>The financial year is set and can&apos;t be changed</Typography>
                                <Typography sx={{ fontSize: 12, color: '#4F46E5' }}>
                                    {locked
                                        ? 'Payroll has already run against it, so the start month is frozen — moving it would re-date periods that are already closed.'
                                        : 'It is a one-time setting per entity: every leave balance and payroll cycle is keyed to this window, so it cannot be re-pointed later.'}
                                </Typography>
                            </Box>
                        </Stack>
                    ) : (
                        <Box sx={{ ...card, p: 0 }}>
                            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.8, borderBottom: '1px solid #F1F3F7', flexWrap: 'wrap', gap: 1 }}>
                                <Box>
                                    <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: '#0F172A' }}>Financial year starts in</Typography>
                                    <Typography sx={{ fontSize: 12, color: '#6B7280', mt: 0.2 }}>The end month follows automatically — twelve months later. This can only be set once, so choose carefully.</Typography>
                                </Box>
                                <Chip
                                    label={`${monthName(startMonth)} → ${monthName(endMonth)}  ·  ${previewYear(startMonth)}`}
                                    sx={{ height: 34, borderRadius: '7px', fontSize: 12.5, fontWeight: 700, bgcolor: PRIMARY_LIGHT, color: PRIMARY, border: `1px solid ${PRIMARY_BORDER}` }}
                                />
                            </Stack>

                            <Grid container spacing={1.2} sx={{ p: 2 }}>
                                {MONTHS.map((m) => {
                                    const on = Number(startMonth) === m.value;
                                    const isEnd = m.value === endMonth;
                                    return (
                                        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={m.value}>
                                            <Box
                                                onClick={() => setStartMonth(m.value)}
                                                sx={{
                                                    px: 1.5, py: 1.4, borderRadius: '8px', textAlign: 'center', userSelect: 'none', cursor: 'pointer',
                                                    border: '1px solid',
                                                    borderColor: on ? PRIMARY : (isEnd ? PRIMARY_BORDER : '#EEF1F6'),
                                                    bgcolor: on ? PRIMARY_LIGHT : '#F8FAFC',
                                                    transition: 'background-color .15s, border-color .15s',
                                                    '&:hover': { borderColor: on ? PRIMARY : '#D8DEE8' },
                                                }}
                                            >
                                                <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: on ? PRIMARY : '#334155' }}>{m.name}</Typography>
                                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: on ? PRIMARY : (isEnd ? '#94A3B8' : '#C4C9D4'), textTransform: 'uppercase', letterSpacing: 0.4, mt: 0.2 }}>
                                                    {on ? 'Starts' : (isEnd ? 'Ends' : ' ')}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    );
                                })}
                            </Grid>

                            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 2, borderTop: '1px solid #F1F3F7', bgcolor: '#FBFAFE', flexWrap: 'wrap', gap: 1.5 }}>
                                <Typography sx={{ fontSize: 12.5, color: '#64748B' }}>
                                    Payroll periods will run <strong>{monthName(startMonth)}</strong> to <strong>{monthName(endMonth)}</strong>.
                                </Typography>
                                <Button
                                    onClick={save}
                                    disabled={saving}
                                    startIcon={saving ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : <SaveRoundedIcon sx={{ fontSize: 17 }} />}
                                    sx={{ ...solidBtn, height: 42, px: 2.4, fontSize: 12.5 }}
                                >
                                    {saving ? 'Saving…' : 'Set Financial Year'}
                                </Button>
                            </Stack>
                        </Box>
                    )}
                </Stack>
            )}

            <Snackbar open={Boolean(snack.msg)} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, msg: '' }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack((s) => ({ ...s, msg: '' }))} severity={snack.severity} variant="filled" sx={{ borderRadius: '7px' }}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
