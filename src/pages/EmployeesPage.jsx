import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, Typography, Grid, Button, Avatar, Chip, Stack, InputAdornment, TextField,
    Snackbar, Alert, IconButton, Tooltip,
} from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectEmployees, selectIdPrefix, setIdPrefix, sanitizePrefix, nextEmployeeCode } from '../redux/slices/employeesSlice';

const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_BORDER = '#C9BEFB';
const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
const tonalBtn = { bgcolor: PRIMARY_LIGHT, color: PRIMARY, border: `1px solid ${PRIMARY_BORDER}`, fontWeight: 700, borderRadius: '7px', boxShadow: 'none', textTransform: 'none', '&:hover': { bgcolor: '#E7DFFC' } };

const PALETTE = ['#7C5CFC', '#0EA5E9', '#F59E0B', '#16A34A', '#E11D48', '#6246E0', '#0891B2'];
const initials = (f = '', l = '') => `${f[0] || ''}${l[0] || ''}`.toUpperCase();
const colorFor = (s = '') => PALETTE[(s.charCodeAt(0) || 0) % PALETTE.length];
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function EmployeesPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const rows = useSelector(selectEmployees);
    const idPrefix = useSelector(selectIdPrefix);
    const [search, setSearch] = useState('');
    const [snack, setSnack] = useState('');

    const nextId = useMemo(() => nextEmployeeCode(rows, idPrefix), [rows, idPrefix]);

    useEffect(() => {
        if (location.state?.toast) {
            setSnack(location.state.toast);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    const stats = useMemo(() => ({
        total: rows.length,
        active: rows.filter((r) => (r.status || 'Active') === 'Active').length,
        depts: new Set(rows.map((r) => r.department)).size,
        newThisMonth: rows.filter((r) => (r.doj || '').startsWith(new Date().toISOString().slice(0, 7))).length,
    }), [rows]);

    const filtered = rows.filter((r) => {
        const q = search.toLowerCase();
        return !q || `${r.firstName} ${r.lastName} ${r.employeeId} ${r.department}`.toLowerCase().includes(q);
    });

    const KPIS = [
        { label: 'Total Employees', value: stats.total, icon: GroupsRoundedIcon, color: PRIMARY, bg: PRIMARY_LIGHT },
        { label: 'Active', value: stats.active, icon: HowToRegRoundedIcon, color: '#16A34A', bg: '#DCFCE7' },
        { label: 'Departments', value: stats.depts, icon: ApartmentRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE' },
        { label: 'New This Month', value: stats.newThisMonth, icon: PersonAddAlt1RoundedIcon, color: '#F59E0B', bg: '#FFF7ED' },
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
                                    <Typography sx={{ fontSize: 28, fontWeight: 800, color: '#0F172A', mt: 0.5 }}>{k.value}</Typography>
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
                                value={idPrefix}
                                onChange={(e) => dispatch(setIdPrefix(sanitizePrefix(e.target.value)))}
                                size="small"
                                placeholder="EMP"
                                inputProps={{ maxLength: 5, style: { textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1 } }}
                                sx={{ width: 150, '& .MuiOutlinedInput-root': { borderRadius: '7px', bgcolor: '#fff', fontSize: 14, height: 42 } }}
                                InputProps={{ startAdornment: <InputAdornment position="start"><BadgeRoundedIcon sx={{ fontSize: 17, color: '#9CA3AF' }} /></InputAdornment> }}
                            />
                            <Typography sx={{ fontSize: 10.5, color: '#98A0AE', mt: 0.4, ml: 0.3 }}>Starting letters · max 5</Typography>
                        </Box>
                        <Box sx={{ px: 2, py: 1, borderRadius: '7px', bgcolor: '#F7F6FD', border: `1px dashed ${PRIMARY_BORDER}`, textAlign: 'center' }}>
                            <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#6E6B99', textTransform: 'uppercase', letterSpacing: 0.6 }}>Next Login ID</Typography>
                            <Typography sx={{ fontSize: 17, fontWeight: 800, color: PRIMARY, letterSpacing: 0.5, mt: 0.2 }}>{nextId}</Typography>
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
                        <Chip label={`${filtered.length} records`} size="small" sx={{ bgcolor: PRIMARY_LIGHT, color: PRIMARY, fontWeight: 700, fontSize: 11.5 }} />
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
                            {filtered.map((r, idx) => {
                                const resigned = (r.status || 'Active') === 'Resigned';
                                return (
                                    <Box component="tr" key={r.id} onClick={() => navigate(`/dashboard/employees/${r.id}`)} sx={{ cursor: 'pointer', bgcolor: idx % 2 ? '#FBFAFE' : '#fff', opacity: resigned ? 0.72 : 1, '&:hover': { bgcolor: '#F5F4FC' }, transition: 'background-color .15s' }}>
                                        <Box component="td" sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #EEF0F6' }}>
                                            <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
                                                <Avatar sx={{ width: 36, height: 36, bgcolor: colorFor(r.firstName), fontSize: 13, fontWeight: 700, filter: resigned ? 'grayscale(0.4)' : 'none' }}>{initials(r.firstName, r.lastName)}</Avatar>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{r.firstName} {r.lastName}</Typography>
                                                    <Typography sx={{ fontSize: 11.5, color: '#98A0AE' }}>{r.email}</Typography>
                                                </Box>
                                            </Stack>
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.5, fontSize: 13, color: '#475569', fontWeight: 600, borderBottom: '1px solid #EEF0F6' }}>{r.employeeId}</Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #EEF0F6' }}><Chip label={r.department || '—'} size="small" sx={{ bgcolor: '#F1F5F9', fontSize: 11.5, fontWeight: 600 }} /></Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.5, fontSize: 13, color: '#475569', borderBottom: '1px solid #EEF0F6' }}>{r.designation || '—'}</Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.5, fontSize: 13, color: '#475569', borderBottom: '1px solid #EEF0F6', whiteSpace: 'nowrap' }}>{fmtDate(r.doj)}</Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #EEF0F6' }}>
                                            <Chip label={resigned ? 'Resigned' : 'Active'} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: resigned ? '#FEE2E2' : '#DCFCE7', color: resigned ? '#DC2626' : '#16A34A' }} />
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
                    {filtered.length === 0 && (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                            <GroupsRoundedIcon sx={{ fontSize: 34, color: '#CBD2DD' }} />
                            <Typography sx={{ fontSize: 14, color: '#98A0AE', mt: 1 }}>No employees match your search</Typography>
                        </Box>
                    )}
                </Box>
            </Box>

            <Snackbar open={Boolean(snack)} autoHideDuration={3000} onClose={() => setSnack('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack('')} severity="success" variant="filled" sx={{ borderRadius: '7px' }}>{snack}</Alert>
            </Snackbar>
        </Box>
    );
}
