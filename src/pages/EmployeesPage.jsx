import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Grid, Button, Avatar, Chip, Stack, InputAdornment, TextField,
    Snackbar, Alert, Tooltip, Skeleton, IconButton, CircularProgress,
} from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { useNavigate, useLocation } from 'react-router-dom';
import { sanitizePrefix } from '../redux/slices/employeesSlice';
import http, { apiErrorMessage } from '../Api/http';
import { GetEmployees, GetLoginIdFormat, UpdateLoginIdFormat } from '../Api/Api';
import { fmtApiDate } from '../utils/apiFields';

const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_BORDER = '#C9BEFB';
const PAGE_SIZE = 20;
const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
const tonalBtn = { bgcolor: PRIMARY_LIGHT, color: PRIMARY, border: `1px solid ${PRIMARY_BORDER}`, fontWeight: 700, borderRadius: '7px', boxShadow: 'none', textTransform: 'none', '&:hover': { bgcolor: '#E7DFFC' } };

const PALETTE = ['#7C5CFC', '#0EA5E9', '#F59E0B', '#16A34A', '#E11D48', '#6246E0', '#0891B2'];
const initials = (name = '') => name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const colorFor = (s = '') => PALETTE[(s.charCodeAt(0) || 0) % PALETTE.length];

const fmtDate = (v) => fmtApiDate(v) || '—';

export default function EmployeesPage() {
    const navigate = useNavigate();
    const location = useLocation();

    // `search` is what's typed; `query` is what's been sent. Debouncing between
    // them keeps one keystroke from firing one request.
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);

    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [snack, setSnack] = useState({ msg: '', severity: 'success' });

    // Login ID format. The server owns both halves — the prefix and the running
    // number — so `nextLoginId` is read from it rather than guessed from the rows
    // on this page (which are only one page of the directory anyway).
    const [savedPrefix, setSavedPrefix] = useState('');
    const [prefix, setPrefix] = useState('');
    const [nextId, setNextId] = useState('');
    const [fmtLoading, setFmtLoading] = useState(true);
    const [fmtSaving, setFmtSaving] = useState(false);

    const notify = (msg, severity = 'success') => setSnack({ msg, severity });

    const loadFormat = useCallback(async () => {
        setFmtLoading(true);
        try {
            const { data: body } = await http.get(GetLoginIdFormat);
            if (body?.error) throw new Error(body.message || 'Could not load the login ID format.');
            const d = body?.data || {};
            setSavedPrefix(d.prefix || '');
            setPrefix(d.prefix || '');
            setNextId(d.nextLoginId || '');
        } catch {
            // Non-fatal: the directory is still usable without this card.
            setNextId('');
        } finally {
            setFmtLoading(false);
        }
    }, []);

    useEffect(() => { loadFormat(); }, [loadFormat]);

    const saveFormat = async () => {
        const next = sanitizePrefix(prefix);
        if (!next) { notify('Enter the starting letters for the login ID.', 'warning'); return; }
        setFmtSaving(true);
        try {
            const { data: body } = await http.put(UpdateLoginIdFormat, { prefix: next });
            if (body?.error) throw new Error(body.message || 'Could not update the login ID format.');
            // The response carries the recomputed nextLoginId; fall back to a
            // re-read if it doesn't, rather than showing a stale preview.
            const d = body?.data;
            if (d?.prefix) {
                setSavedPrefix(d.prefix);
                setPrefix(d.prefix);
                setNextId(d.nextLoginId || '');
            } else {
                await loadFormat();
            }
            notify('Login ID format updated');
        } catch (err) {
            notify(err?.response || err?.request ? apiErrorMessage(err, 'Could not update the login ID format.') : err.message, 'error');
        } finally {
            setFmtSaving(false);
        }
    };

    const prefixDirty = sanitizePrefix(prefix) !== savedPrefix;

    useEffect(() => {
        if (location.state?.toast) {
            setSnack({ msg: location.state.toast, severity: location.state.severity || 'success' });
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    useEffect(() => {
        const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [search]);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const { data: body } = await http.get(GetEmployees, {
                params: { search: query, page, pageSize: PAGE_SIZE },
            });
            if (body?.error) throw new Error(body.message || 'Could not load employees.');
            const d = body?.data || {};
            setRows(d.items || []);
            setTotal(d.total || 0);
        } catch (err) {
            setLoadError(err?.response || err?.request ? apiErrorMessage(err, 'Could not load employees.') : err.message);
            setRows([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [query, page]);

    useEffect(() => { load(); }, [load]);

    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
    const to = Math.min(page * PAGE_SIZE, total);

    // Only the total is a whole-directory figure — the rest can only be counted
    // from the page in hand, so they're shown as "—" the moment the list spans
    // more than one page rather than quietly reporting a page-sized lie.
    const pageOnly = total > rows.length;
    const activeCount = rows.filter((r) => String(r.status || '').toLowerCase() === 'active').length;
    const deptCount = new Set(rows.map((r) => r.department).filter(Boolean)).size;
    const partial = (v) => (pageOnly ? '—' : v);

    const KPIS = [
        { label: 'Total Employees', value: loading ? '—' : total, icon: GroupsRoundedIcon, color: PRIMARY, bg: PRIMARY_LIGHT },
        { label: 'Active', value: loading ? '—' : partial(activeCount), icon: HowToRegRoundedIcon, color: '#16A34A', bg: '#DCFCE7', capped: pageOnly },
        { label: 'Departments', value: loading ? '—' : partial(deptCount), icon: ApartmentRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE', capped: pageOnly },
        { label: 'On This Page', value: loading ? '—' : rows.length, icon: PersonAddAlt1RoundedIcon, color: '#F59E0B', bg: '#FFF7ED' },
    ];

    return (
        <Box sx={{ p: 2 }}>
            {/* Header */}
            <Box sx={{ pb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexWrap: 'wrap', gap: 1.5 }}>
                <Box>
                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>Employees</Typography>
                    <Typography sx={{ fontSize: 13, color: '#6B7280', mt: 0.3 }}>Onboard and manage your workforce</Typography>
                </Box>
                <Button startIcon={<PersonAddAlt1RoundedIcon />} onClick={() => navigate('/dashboard/employees/onboard')} sx={{ ...tonalBtn, height: 42, px: 2.2 }}>
                    Onboard Employee
                </Button>
            </Box>

            {/* KPI cards */}
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                {KPIS.map((k) => (
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={k.label}>
                        <Box sx={{ ...card, p: 2.5, bgcolor: k.bg, border: `1px solid ${k.color}22` }}>
                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: k.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</Typography>
                                    <Tooltip arrow title={k.capped ? 'Needs a summary from the API — this can’t be counted from one page of results.' : ''}>
                                        <Typography sx={{ fontSize: 28, fontWeight: 800, color: '#0F172A', mt: 0.5, width: 'fit-content' }}>{k.value}</Typography>
                                    </Tooltip>
                                </Box>
                                <Box sx={{ width: 44, height: 44, borderRadius: '7px', bgcolor: '#fff', boxShadow: '0 1px 3px rgba(16,24,40,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <k.icon sx={{ color: k.color, fontSize: 22 }} />
                                </Box>
                            </Stack>
                        </Box>
                    </Grid>
                ))}
            </Grid>

            {/* Login ID format */}
            <Box sx={{ ...card, p: 2.5, mb: 1.5 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between' }}>
                    <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: '9px', bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <BadgeRoundedIcon sx={{ color: PRIMARY, fontSize: 20 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: '#0F172A' }}>Login ID Format</Typography>
                            <Typography sx={{ fontSize: 12, color: '#6B7280', mt: 0.2 }}>
                                Set the starting letters — numbers are generated automatically (1, 2, 3…) for each new employee.
                            </Typography>
                        </Box>
                    </Stack>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Box>
                            <TextField
                                value={prefix}
                                disabled={fmtLoading || fmtSaving}
                                onChange={(e) => setPrefix(sanitizePrefix(e.target.value))}
                                onKeyDown={(e) => { if (e.key === 'Enter' && prefixDirty) saveFormat(); }}
                                size="small"
                                placeholder="EMP"
                                inputProps={{ maxLength: 5, style: { textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1 } }}
                                sx={{ width: 150, '& .MuiOutlinedInput-root': { borderRadius: '7px', bgcolor: '#fff', fontSize: 14, height: 42 } }}
                                InputProps={{ startAdornment: <InputAdornment position="start"><BadgeRoundedIcon sx={{ fontSize: 17, color: '#9CA3AF' }} /></InputAdornment> }}
                            />
                            <Typography sx={{ fontSize: 10.5, color: '#98A0AE', mt: 0.4, ml: 0.3 }}>Starting letters · max 5</Typography>
                        </Box>

                        <Button
                            onClick={saveFormat}
                            disabled={fmtLoading || fmtSaving || !prefixDirty}
                            startIcon={fmtSaving ? <CircularProgress size={15} sx={{ color: 'inherit' }} /> : <SaveRoundedIcon sx={{ fontSize: 17 }} />}
                            sx={{ ...tonalBtn, height: 42, px: 2, mb: 2.2, '&.Mui-disabled': { bgcolor: '#F1F5F9', color: '#94A3B8', borderColor: '#E2E8F0' } }}
                        >
                            {fmtSaving ? 'Saving…' : 'Save'}
                        </Button>

                        <Box sx={{ px: 2, py: 1, borderRadius: '7px', bgcolor: '#F7F6FD', border: `1px dashed ${PRIMARY_BORDER}`, textAlign: 'center', mb: 2.2 }}>
                            <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#6E6B99', textTransform: 'uppercase', letterSpacing: 0.6 }}>Next Login ID</Typography>
                            {fmtLoading
                                ? <Skeleton variant="text" width={80} height={24} sx={{ mx: 'auto' }} />
                                : <Typography sx={{ fontSize: 17, fontWeight: 800, color: PRIMARY, letterSpacing: 0.5, mt: 0.2 }}>{nextId || '—'}</Typography>}
                        </Box>
                    </Stack>
                </Stack>
            </Box>

            {/* Employee table */}
            <Box sx={{ ...card, p: 0, overflow: 'hidden' }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', p: 2.5, flexWrap: 'wrap', gap: 1.5, bgcolor: '#F7F6FD', borderBottom: '1px solid #EAE7F7' }}>
                    <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: '#fff', boxShadow: '0 1px 4px rgba(16,24,40,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <GroupsRoundedIcon sx={{ color: PRIMARY, fontSize: 18 }} />
                        </Box>
                        <Typography sx={{ fontSize: 15.5, fontWeight: 800, color: '#0F172A' }}>All Employees</Typography>
                        <Chip label={loading ? 'Loading…' : `${total} record${total === 1 ? '' : 's'}`} size="small" sx={{ bgcolor: PRIMARY_LIGHT, color: PRIMARY, fontWeight: 700, fontSize: 11.5 }} />
                    </Stack>
                    <TextField
                        placeholder="Search employees…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        size="small"
                        sx={{ width: { xs: '100%', sm: 260 }, '& .MuiOutlinedInput-root': { borderRadius: '50px', bgcolor: '#fff', fontSize: 13, height: 38 } }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: '#9CA3AF' }} /></InputAdornment> }}
                    />
                </Stack>
                <Box sx={{ overflowX: 'auto' }}>
                    <Box component="table" sx={{ width: '100%', minWidth: 860, borderCollapse: 'collapse' }}>
                        <Box component="thead" sx={{ bgcolor: '#F4F3FB' }}>
                            <Box component="tr">
                                {['EMPLOYEE', 'EMP ID', 'DEPARTMENT', 'DESIGNATION', 'JOINED', 'STATUS', 'ACTIONS'].map((h) => (
                                    <Box component="th" key={h} sx={{ textAlign: h === 'ACTIONS' ? 'right' : 'left', px: 2.5, py: 1.6, fontSize: 10.5, fontWeight: 700, color: '#6E6B99', letterSpacing: 0.6, borderBottom: '1px solid #E8E6F3', whiteSpace: 'nowrap' }}>{h}</Box>
                                ))}
                            </Box>
                        </Box>
                        <Box component="tbody">
                            {loading && Array.from({ length: 5 }).map((_, i) => (
                                <Box component="tr" key={`sk-${i}`}>
                                    {Array.from({ length: 7 }).map((__, j) => (
                                        <Box component="td" key={j} sx={{ px: 2.5, py: 1.7, borderBottom: '1px solid #EEF0F6' }}>
                                            <Skeleton variant="text" width={j === 0 ? 180 : 90} height={20} />
                                        </Box>
                                    ))}
                                </Box>
                            ))}

                            {!loading && rows.map((r, idx) => {
                                const active = String(r.status || '').toLowerCase() === 'active';
                                return (
                                    <Box component="tr" key={r.id} onClick={() => navigate(`/dashboard/employees/${r.id}`)} sx={{ cursor: 'pointer', bgcolor: idx % 2 ? '#FBFAFE' : '#fff', opacity: active ? 1 : 0.72, '&:hover': { bgcolor: '#F5F4FC' }, transition: 'background-color .15s' }}>
                                        <Box component="td" sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #EEF0F6' }}>
                                            <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
                                                <Avatar src={r.profilePhotoUrl || undefined} sx={{ width: 36, height: 36, bgcolor: colorFor(r.fullName), fontSize: 13, fontWeight: 700, filter: active ? 'none' : 'grayscale(0.4)' }}>{initials(r.fullName)}</Avatar>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{r.fullName}</Typography>
                                                    <Typography sx={{ fontSize: 11.5, color: '#98A0AE' }}>{r.personalEmail || r.personalMobile || '—'}</Typography>
                                                </Box>
                                            </Stack>
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.5, fontSize: 13, color: '#475569', fontWeight: 600, borderBottom: '1px solid #EEF0F6' }}>{r.employeeCode || '—'}</Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #EEF0F6' }}><Chip label={r.department || '—'} size="small" sx={{ bgcolor: '#F1F5F9', fontSize: 11.5, fontWeight: 600 }} /></Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.5, fontSize: 13, color: '#475569', borderBottom: '1px solid #EEF0F6' }}>{r.designation || '—'}</Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.5, fontSize: 13, color: '#475569', borderBottom: '1px solid #EEF0F6', whiteSpace: 'nowrap' }}>{fmtDate(r.dateOfJoining)}</Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #EEF0F6' }}>
                                            <Chip label={active ? 'Active' : (r.status || 'Inactive')} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, textTransform: 'capitalize', bgcolor: active ? '#DCFCE7' : '#FEE2E2', color: active ? '#16A34A' : '#DC2626' }} />
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #EEF0F6', textAlign: 'right' }}>
                                            <Tooltip arrow title="View details">
                                                <Button
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/employees/${r.id}`); }}
                                                    size="small"
                                                    startIcon={<VisibilityRoundedIcon sx={{ fontSize: 16 }} />}
                                                    endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 14 }} />}
                                                    sx={{ ...tonalBtn, height: 32, px: 1.4, fontSize: 12 }}
                                                >
                                                    View
                                                </Button>
                                            </Tooltip>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>

                    {!loading && loadError && (
                        <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center', p: 2.5, bgcolor: '#FEF2F2', borderTop: '1px solid #FECACA' }}>
                            <ErrorOutlineRoundedIcon sx={{ fontSize: 22, color: '#B91C1C' }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#991B1B' }}>Couldn't load employees</Typography>
                                <Typography sx={{ fontSize: 12, color: '#B91C1C' }}>{loadError}</Typography>
                            </Box>
                            <Button onClick={load} startIcon={<RefreshRoundedIcon sx={{ fontSize: 17 }} />} sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12.5, color: '#B91C1C', bgcolor: '#fff', border: '1px solid #FECACA', borderRadius: '7px', height: 38, px: 2, '&:hover': { bgcolor: '#FEE2E2' } }}>Retry</Button>
                        </Stack>
                    )}

                    {!loading && !loadError && rows.length === 0 && (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                            <GroupsRoundedIcon sx={{ fontSize: 34, color: '#CBD2DD' }} />
                            <Typography sx={{ fontSize: 14, color: '#98A0AE', mt: 1 }}>
                                {query ? 'No employees match your search' : 'No employees yet — onboard your first one'}
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* Pagination — the API pages server-side, so this drives the request */}
                {!loadError && total > 0 && (
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.6, borderTop: '1px solid #EEF0F6', bgcolor: '#FBFAFE', flexWrap: 'wrap', gap: 1 }}>
                        <Typography sx={{ fontSize: 12.5, color: '#64748B' }}>
                            Showing <strong>{from}–{to}</strong> of <strong>{total}</strong>
                        </Typography>
                        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                            <IconButton size="small" disabled={loading || page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                                sx={{ border: '1px solid #E6EAF1', borderRadius: '7px', bgcolor: '#fff', width: 32, height: 32 }}>
                                <ChevronLeftRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#475569', px: 0.8 }}>Page {page} of {pageCount}</Typography>
                            <IconButton size="small" disabled={loading || page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                                sx={{ border: '1px solid #E6EAF1', borderRadius: '7px', bgcolor: '#fff', width: 32, height: 32 }}>
                                <ChevronRightRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Stack>
                    </Stack>
                )}
            </Box>

            <Snackbar open={Boolean(snack.msg)} autoHideDuration={snack.severity === 'warning' ? 8000 : 3000} onClose={() => setSnack((s) => ({ ...s, msg: '' }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack((s) => ({ ...s, msg: '' }))} severity={snack.severity} variant="filled" sx={{ borderRadius: '7px' }}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
