import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Stack, Chip, Avatar, TextField, InputAdornment, IconButton, MenuItem,
    Dialog, DialogTitle, DialogContent, DialogActions, Divider, Snackbar, Alert, Tooltip, Grid,
    CircularProgress, Skeleton,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectRoleById } from '../redux/slices/rolesSlice';
import { selectUserTypeId } from '../redux/slices/authSlice';
import { canAssignRole } from '../data/roleAccess';
import http, { apiErrorMessage } from '../Api/http';
import { GetUsersByUserType, UpdateEmployeeUserType, GetEmployees } from '../Api/Api';

const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_BORDER = '#C9BEFB';
const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
const tonalBtn = { bgcolor: PRIMARY_LIGHT, color: PRIMARY, border: `1px solid ${PRIMARY_BORDER}`, fontWeight: 700, borderRadius: '7px', boxShadow: 'none', textTransform: 'none', '&:hover': { bgcolor: '#E7DFFC' } };
const label = { fontSize: 12.5, fontWeight: 600, color: '#334155', mb: 0.6 };
const field = { '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 14, bgcolor: '#F8FAFC', '& fieldset': { borderColor: '#E5E7EB' }, '&.Mui-focused fieldset': { borderColor: PRIMARY, borderWidth: 1.5 } } };
const initials = (s = '') => s.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const fmtWhen = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never');

export default function RoleUsersPage() {
    const navigate = useNavigate();
    const { roleId } = useParams();
    // The store gives the role's colour/name for first paint; the users list and
    // the role name are read live from the server.
    const storeRole = useSelector(selectRoleById(roleId));
    const myUserTypeId = useSelector(selectUserTypeId);

    // An Admin may manage every role's membership except Master Admin's — that
    // stays exclusive to a Master Admin (see canAssignRole / roleAccess).
    const locked = !canAssignRole(myUserTypeId, roleId);

    const [users, setUsers] = useState([]);
    const [roleName, setRoleName] = useState(storeRole?.name || 'Role');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [search, setSearch] = useState('');
    const [snack, setSnack] = useState({ msg: '', sev: 'info' });

    // Assign dialog
    const [open, setOpen] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [empLoading, setEmpLoading] = useState(false);
    const [pickedCode, setPickedCode] = useState('');
    const [assigning, setAssigning] = useState(false);

    const colour = storeRole?.color || PRIMARY;
    const notify = (msg, sev = 'info') => setSnack({ msg, sev });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data: body } = await http.get(GetUsersByUserType, { params: { id: roleId } });
            if (body?.error) throw new Error(body.message || 'Could not load this role’s users.');
            const d = body?.data || {};
            setUsers(Array.isArray(d.users) ? d.users : []);
            if (d.roleName) setRoleName(d.roleName);
            setLoadError('');
        } catch (err) {
            setLoadError(apiErrorMessage(err, 'Could not load this role’s users.'));
        } finally {
            setLoading(false);
        }
    }, [roleId]);

    useEffect(() => { load(); }, [load]);

    // Employees are only fetched when the assign dialog opens — no point paying
    // for the roster on every visit.
    const openAssign = async () => {
        setPickedCode('');
        setOpen(true);
        if (employees.length) return;
        setEmpLoading(true);
        try {
            const { data: body } = await http.get(GetEmployees, { params: { page: 1, pageSize: 500 } });
            const items = Array.isArray(body?.data?.items) ? body.data.items : [];
            setEmployees(items.map((e) => ({
                code: e.employeeCode || e.code || '',
                name: e.fullName || `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.employeeCode,
                sub: [e.designation, e.department].filter(Boolean).join(' · '),
            })).filter((e) => e.code));
        } catch {
            setEmployees([]);
        } finally {
            setEmpLoading(false);
        }
    };

    const assign = async () => {
        // The button is hidden when locked, but this is the check that matters.
        if (locked) { notify('Only a Master Admin can grant the Master Admin role.', 'warning'); setOpen(false); return; }
        if (!pickedCode) { notify('Pick an employee to assign.', 'warning'); return; }
        setAssigning(true);
        try {
            // The one call that assigns a role. It needs an existing login account
            // (set at onboarding); the API 400s with a clear message if there isn't
            // one, which we surface as-is.
            const { data: body } = await http.put(UpdateEmployeeUserType, {
                EmployeeCode: pickedCode,
                UserTypeId: Number(roleId),
            });
            if (body?.error) throw new Error(body.message || 'Could not assign this role.');
            notify(`${pickedCode} assigned to ${roleName}. 🎉`, 'success');
            setOpen(false);
            await load();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not assign this role.'), 'error');
        } finally {
            setAssigning(false);
        }
    };

    const filtered = users.filter((u) => {
        const q = search.trim().toLowerCase();
        return !q || `${u.name} ${u.loginId}`.toLowerCase().includes(q);
    });

    return (
        <Box sx={{ p: 2 }}>
            {/* Header */}
            <Box sx={{ pb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexWrap: 'wrap', gap: 1.5 }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <IconButton onClick={() => navigate('/dashboard/roles')} sx={{ bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', '&:hover': { bgcolor: '#F8FAFC' } }}>
                        <ArrowBackRoundedIcon sx={{ fontSize: 20, color: '#334155' }} />
                    </IconButton>
                    <Box sx={{ width: 46, height: 46, borderRadius: '10px', bgcolor: `${colour}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography sx={{ fontSize: 15, fontWeight: 800, color: colour }}>{initials(roleName)}</Typography>
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>{roleName}</Typography>
                        <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>Users who sign in with this role</Typography>
                    </Box>
                </Stack>
                <Stack direction="row" spacing={1}>
                    <Button onClick={() => navigate(`/dashboard/roles/${roleId}/access`)} startIcon={<TuneRoundedIcon sx={{ fontSize: 18 }} />} sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, color: '#334155', bgcolor: '#F1F5F9', borderRadius: '7px', height: 42, px: 2, '&:hover': { bgcolor: '#E2E8F0' } }}>
                        Access
                    </Button>
                    {locked ? (
                        <Tooltip arrow title="Only a Master Admin can grant this role">
                            <Chip
                                icon={<LockRoundedIcon sx={{ fontSize: '16px !important' }} />}
                                label="Master Admin only"
                                sx={{ height: 42, borderRadius: '7px', px: 0.5, fontSize: 12.5, fontWeight: 700, bgcolor: '#EEF2FF', color: '#4F46E5', border: '1px solid #DDE0FB', '& .MuiChip-icon': { color: '#4F46E5' } }}
                            />
                        </Tooltip>
                    ) : (
                        <Button startIcon={<PersonAddAlt1RoundedIcon />} onClick={openAssign} sx={{ ...tonalBtn, height: 42, px: 2.2 }}>Assign User</Button>
                    )}
                </Stack>
            </Box>

            {/* Master-Admin-only notice */}
            {locked && (
                <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center', ...card, p: 1.8, mb: 1.5, bgcolor: '#EEF2FF', border: '1px solid #DDE0FB' }}>
                    <Box sx={{ width: 34, height: 34, borderRadius: '8px', bgcolor: '#fff', border: '1px solid #DDE0FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <LockRoundedIcon sx={{ fontSize: 18, color: '#4F46E5' }} />
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#3730A3' }}>Master Admin membership is view-only for you</Typography>
                        <Typography sx={{ fontSize: 12, color: '#4F46E5' }}>
                            Master Admin reaches every business entity, so only an existing Master Admin can grant it. You can assign every other role.
                        </Typography>
                    </Box>
                </Stack>
            )}

            {/* Assigned-users count */}
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ ...card, p: 2.5, bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY}22` }}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                                <Typography sx={{ fontSize: 11, fontWeight: 700, color: PRIMARY, textTransform: 'uppercase', letterSpacing: 0.5 }}>Assigned Users</Typography>
                                {loading ? <Skeleton variant="text" width={40} height={36} /> : <Typography sx={{ fontSize: 28, fontWeight: 800, color: '#0F172A', mt: 0.5 }}>{users.length}</Typography>}
                            </Box>
                            <Box sx={{ width: 44, height: 44, borderRadius: '7px', bgcolor: '#fff', boxShadow: '0 1px 3px rgba(16,24,40,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PeopleAltRoundedIcon sx={{ color: PRIMARY, fontSize: 22 }} /></Box>
                        </Stack>
                    </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ ...card, p: 2.5, bgcolor: '#E0F2FE', border: '1px solid #0EA5E922' }}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#0EA5E9', textTransform: 'uppercase', letterSpacing: 0.5 }}>Active</Typography>
                                {loading ? <Skeleton variant="text" width={40} height={36} /> : <Typography sx={{ fontSize: 28, fontWeight: 800, color: '#0F172A', mt: 0.5 }}>{users.filter((u) => u.isActive).length}</Typography>}
                            </Box>
                            <Box sx={{ width: 44, height: 44, borderRadius: '7px', bgcolor: '#fff', boxShadow: '0 1px 3px rgba(16,24,40,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TuneRoundedIcon sx={{ color: '#0EA5E9', fontSize: 22 }} /></Box>
                        </Stack>
                    </Box>
                </Grid>
            </Grid>

            {/* Load error */}
            {loadError && !loading && (
                <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center', ...card, p: 2, mb: 1.5, bgcolor: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <ErrorOutlineRoundedIcon sx={{ fontSize: 22, color: '#B91C1C' }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#991B1B' }}>Couldn't load users</Typography>
                        <Typography sx={{ fontSize: 12, color: '#B91C1C' }}>{loadError}</Typography>
                    </Box>
                    <Button onClick={load} startIcon={<RefreshRoundedIcon sx={{ fontSize: 17 }} />} sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12.5, color: '#B91C1C', bgcolor: '#fff', border: '1px solid #FECACA', borderRadius: '7px', height: 38, px: 2 }}>Retry</Button>
                </Stack>
            )}

            {/* Users table */}
            <Box sx={{ ...card, p: 0 }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', p: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
                    <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
                        <Box sx={{ width: 34, height: 34, borderRadius: '7px', bgcolor: PRIMARY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PeopleAltRoundedIcon sx={{ color: PRIMARY, fontSize: 19 }} /></Box>
                        <Typography sx={{ fontSize: 15.5, fontWeight: 700, color: '#0F172A' }}>Users</Typography>
                        <Chip label={loading ? 'Loading…' : `${filtered.length} record${filtered.length === 1 ? '' : 's'}`} size="small" sx={{ bgcolor: PRIMARY_LIGHT, color: PRIMARY, fontWeight: 600, fontSize: 11.5 }} />
                    </Stack>
                    <TextField placeholder="Search name or login id…" value={search} onChange={(e) => setSearch(e.target.value)} size="small" sx={{ width: { xs: '100%', sm: 260 }, '& .MuiOutlinedInput-root': { borderRadius: '50px', bgcolor: '#F8FAFC', fontSize: 13, height: 38 } }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: '#9CA3AF' }} /></InputAdornment> }} />
                </Stack>
                <Box sx={{ overflowX: 'auto' }}>
                    <Box component="table" sx={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}>
                        <Box component="thead" sx={{ bgcolor: PRIMARY_LIGHT }}>
                            <Box component="tr">
                                {['USER', 'LOGIN ID', 'STATUS', 'LAST LOGIN'].map((h) => (
                                    <Box component="th" key={h} sx={{ textAlign: 'left', px: 2.5, py: 1.5, fontSize: 11, fontWeight: 700, color: PRIMARY, letterSpacing: 0.4 }}>{h}</Box>
                                ))}
                            </Box>
                        </Box>
                        <Box component="tbody">
                            {loading
                                ? [0, 1, 2].map((i) => (
                                    <Box component="tr" key={i} sx={{ borderTop: '1px solid #F1F3F7' }}>
                                        {[0, 1, 2, 3].map((j) => <Box component="td" key={j} sx={{ px: 2.5, py: 1.6 }}><Skeleton variant="text" width={j === 0 ? 160 : 90} /></Box>)}
                                    </Box>
                                ))
                                : filtered.map((u) => (
                                    <Box component="tr" key={u.id ?? u.loginId} sx={{ borderTop: '1px solid #F1F3F7', '&:hover': { bgcolor: '#FAFAFF' } }}>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6 }}>
                                            <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
                                                <Avatar sx={{ width: 36, height: 36, bgcolor: `${colour}22`, color: colour, fontSize: 13, fontWeight: 700 }}>{initials(u.name)}</Avatar>
                                                <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{u.name}</Typography>
                                            </Stack>
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, fontSize: 13, fontWeight: 600, color: '#475569' }}>{u.loginId || '—'}</Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6 }}>
                                            <Chip label={u.isActive ? 'Active' : 'Inactive'} size="small" sx={{ bgcolor: u.isActive ? '#DCFCE7' : '#F1F5F9', color: u.isActive ? '#16A34A' : '#64748B', fontWeight: 700, fontSize: 11 }} />
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, fontSize: 12.5, color: '#64748B' }}>{fmtWhen(u.lastLoginOn)}</Box>
                                    </Box>
                                ))}
                        </Box>
                    </Box>
                    {!loading && filtered.length === 0 && !loadError && (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                            <PeopleAltRoundedIcon sx={{ fontSize: 34, color: '#CBD2DD' }} />
                            <Typography sx={{ fontSize: 14, color: '#98A0AE', mt: 1 }}>{search ? 'No users match your search' : 'No users hold this role yet'}</Typography>
                        </Box>
                    )}
                </Box>
                {/* There is no "remove from role" endpoint — a user always has exactly
                    one role. To move someone off this role, assign them another. */}
                {!locked && !loading && (
                    <Typography sx={{ fontSize: 11.5, color: '#98A0AE', px: 2.5, py: 1.6, borderTop: '1px solid #F1F3F7' }}>
                        To move someone off this role, open their target role and assign them there — a user holds one role at a time.
                    </Typography>
                )}
            </Box>

            {/* Assign user dialog */}
            <Dialog open={open} onClose={() => !assigning && setOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ p: 2.5, pb: 1.5 }}>
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                        <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
                            <Box sx={{ width: 40, height: 40, borderRadius: '7px', bgcolor: PRIMARY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PersonAddAlt1RoundedIcon sx={{ color: PRIMARY }} /></Box>
                            <Box><Typography sx={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>Assign User</Typography><Typography sx={{ fontSize: 12.5, color: '#98A0AE' }}>Grant an employee the {roleName} role</Typography></Box>
                        </Stack>
                        <IconButton onClick={() => !assigning && setOpen(false)} size="small"><CloseRoundedIcon /></IconButton>
                    </Stack>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ p: 2.5 }}>
                    <Typography sx={label}>Employee *</Typography>
                    <TextField
                        select fullWidth size="small" value={pickedCode} onChange={(e) => setPickedCode(e.target.value)} sx={field}
                        disabled={empLoading}
                        helperText={empLoading ? 'Loading employees…' : 'The employee must already have a login (set at onboarding).'}
                    >
                        {employees.length === 0
                            ? <MenuItem value="" disabled sx={{ fontSize: 13.5 }}>No employees found</MenuItem>
                            : employees.map((e) => (
                                <MenuItem key={e.code} value={e.code} sx={{ fontSize: 13.5 }}>
                                    {e.name} · {e.code}{e.sub ? ` — ${e.sub}` : ''}
                                </MenuItem>
                            ))}
                    </TextField>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={() => setOpen(false)} disabled={assigning} sx={{ color: '#64748B', textTransform: 'none', fontWeight: 600, borderRadius: '7px' }}>Cancel</Button>
                    <Button onClick={assign} disabled={assigning || !pickedCode} startIcon={assigning ? <CircularProgress size={15} sx={{ color: 'inherit' }} /> : <PersonAddAlt1RoundedIcon />} sx={{ ...tonalBtn, px: 2.5, height: 40, '&.Mui-disabled': { bgcolor: '#F1F5F9', color: '#94A3B8', borderColor: '#E2E8F0' } }}>
                        {assigning ? 'Assigning…' : 'Assign User'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={Boolean(snack.msg)} autoHideDuration={3400} onClose={() => setSnack((s) => ({ ...s, msg: '' }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack((s) => ({ ...s, msg: '' }))} severity={snack.sev} variant="filled" sx={{ borderRadius: '7px' }}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
