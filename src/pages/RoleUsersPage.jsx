import React, { useState } from 'react';
import {
    Box, Typography, Button, Stack, Chip, Avatar, TextField, InputAdornment, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, Divider, Snackbar, Alert, Tooltip, Grid,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectRoleById, addUser, removeUser } from '../redux/slices/rolesSlice';
import { countEnabled, TOTAL_MODULES } from '../data/accessModules';

const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_BORDER = '#C9BEFB';
const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
const tonalBtn = { bgcolor: PRIMARY_LIGHT, color: PRIMARY, border: `1px solid ${PRIMARY_BORDER}`, fontWeight: 700, borderRadius: '7px', boxShadow: 'none', textTransform: 'none', '&:hover': { bgcolor: '#E7DFFC' } };
const label = { fontSize: 12.5, fontWeight: 600, color: '#334155', mb: 0.6 };
const field = { '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 14, bgcolor: '#F8FAFC', '& fieldset': { borderColor: '#E5E7EB' }, '&.Mui-focused fieldset': { borderColor: PRIMARY, borderWidth: 1.5 } } };
const initials = (s = '') => s.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

const STATUS_STYLE = {
    Active: { bg: '#DCFCE7', color: '#16A34A' },
    Invited: { bg: '#FEF3C7', color: '#B45309' },
    Suspended: { bg: '#FEE2E2', color: '#DC2626' },
};

export default function RoleUsersPage() {
    const navigate = useNavigate();
    const { roleId } = useParams();
    const dispatch = useDispatch();
    const role = useSelector(selectRoleById(roleId));

    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ name: '', email: '' });
    const [snack, setSnack] = useState('');

    if (!role) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Role not found.</Typography>
                <Button onClick={() => navigate('/dashboard/roles')} startIcon={<ArrowBackRoundedIcon />} sx={{ ...tonalBtn, mt: 2, height: 40, px: 2 }}>Back to Roles</Button>
            </Box>
        );
    }

    const filtered = role.users.filter((u) => {
        const q = search.toLowerCase();
        return !q || `${u.name} ${u.email}`.toLowerCase().includes(q);
    });

    const add = () => {
        if (!form.name.trim() || !form.email.trim()) { setSnack('Please enter a name and email.'); return; }
        dispatch(addUser({ roleId, user: { name: form.name.trim(), email: form.email.trim() } }));
        setOpen(false);
        setForm({ name: '', email: '' });
        setSnack(`${form.name.trim()} assigned to ${role.name} 🎉`);
    };

    return (
        <Box sx={{ p: 2 }}>
            {/* Header */}
            <Box sx={{ pb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexWrap: 'wrap', gap: 1.5 }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <IconButton onClick={() => navigate('/dashboard/roles')} sx={{ bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', '&:hover': { bgcolor: '#F8FAFC' } }}>
                        <ArrowBackRoundedIcon sx={{ fontSize: 20, color: '#334155' }} />
                    </IconButton>
                    <Box sx={{ width: 46, height: 46, borderRadius: '10px', bgcolor: `${role.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography sx={{ fontSize: 15, fontWeight: 800, color: role.color }}>{initials(role.name)}</Typography>
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>{role.name}</Typography>
                        <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>Users assigned to this login role</Typography>
                    </Box>
                </Stack>
                <Stack direction="row" spacing={1}>
                    <Button onClick={() => navigate(`/dashboard/roles/${roleId}/access`)} startIcon={<TuneRoundedIcon sx={{ fontSize: 18 }} />} sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, color: '#334155', bgcolor: '#F1F5F9', borderRadius: '7px', height: 42, px: 2, '&:hover': { bgcolor: '#E2E8F0' } }}>
                        {role.system ? 'View Access' : 'Manage Access'}
                    </Button>
                    <Button startIcon={<PersonAddAlt1RoundedIcon />} onClick={() => setOpen(true)} sx={{ ...tonalBtn, height: 42, px: 2.2 }}>Assign User</Button>
                </Stack>
            </Box>

            {/* Mini summary cards */}
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ ...card, p: 2.5, bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY}22` }}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box><Typography sx={{ fontSize: 11, fontWeight: 700, color: PRIMARY, textTransform: 'uppercase', letterSpacing: 0.5 }}>Assigned Users</Typography><Typography sx={{ fontSize: 28, fontWeight: 800, color: '#0F172A', mt: 0.5 }}>{role.users.length}</Typography></Box>
                            <Box sx={{ width: 44, height: 44, borderRadius: '7px', bgcolor: '#fff', boxShadow: '0 1px 3px rgba(16,24,40,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PeopleAltRoundedIcon sx={{ color: PRIMARY, fontSize: 22 }} /></Box>
                        </Stack>
                    </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ ...card, p: 2.5, bgcolor: '#E0F2FE', border: '1px solid #0EA5E922' }}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box><Typography sx={{ fontSize: 11, fontWeight: 700, color: '#0EA5E9', textTransform: 'uppercase', letterSpacing: 0.5 }}>Modules Enabled</Typography><Typography sx={{ fontSize: 28, fontWeight: 800, color: '#0F172A', mt: 0.5 }}>{countEnabled(role.access)}<Typography component="span" sx={{ fontSize: 14, fontWeight: 600, color: '#94A3B8' }}> / {TOTAL_MODULES}</Typography></Typography></Box>
                            <Box sx={{ width: 44, height: 44, borderRadius: '7px', bgcolor: '#fff', boxShadow: '0 1px 3px rgba(16,24,40,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TuneRoundedIcon sx={{ color: '#0EA5E9', fontSize: 22 }} /></Box>
                        </Stack>
                    </Box>
                </Grid>
            </Grid>

            {/* Users table */}
            <Box sx={{ ...card, p: 0 }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', p: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
                    <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
                        <Box sx={{ width: 34, height: 34, borderRadius: '7px', bgcolor: PRIMARY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PeopleAltRoundedIcon sx={{ color: PRIMARY, fontSize: 19 }} /></Box>
                        <Typography sx={{ fontSize: 15.5, fontWeight: 700, color: '#0F172A' }}>Users</Typography>
                        <Chip label={`${filtered.length} records`} size="small" sx={{ bgcolor: PRIMARY_LIGHT, color: PRIMARY, fontWeight: 600, fontSize: 11.5 }} />
                    </Stack>
                    <TextField placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)} size="small" sx={{ width: { xs: '100%', sm: 260 }, '& .MuiOutlinedInput-root': { borderRadius: '50px', bgcolor: '#F8FAFC', fontSize: 13, height: 38 } }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: '#9CA3AF' }} /></InputAdornment> }} />
                </Stack>
                <Box sx={{ overflowX: 'auto' }}>
                    <Box component="table" sx={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}>
                        <Box component="thead" sx={{ bgcolor: PRIMARY_LIGHT }}>
                            <Box component="tr">
                                {['USER', 'EMAIL', 'STATUS', ''].map((h) => (
                                    <Box component="th" key={h} sx={{ textAlign: 'left', px: 2.5, py: 1.5, fontSize: 11, fontWeight: 700, color: PRIMARY, letterSpacing: 0.4 }}>{h}</Box>
                                ))}
                            </Box>
                        </Box>
                        <Box component="tbody">
                            {filtered.map((u) => {
                                const st = STATUS_STYLE[u.status] || STATUS_STYLE.Active;
                                return (
                                    <Box component="tr" key={u.id} sx={{ borderTop: '1px solid #F1F3F7', '&:hover': { bgcolor: '#FAFAFF' } }}>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6 }}>
                                            <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
                                                <Avatar sx={{ width: 36, height: 36, bgcolor: `${role.color}22`, color: role.color, fontSize: 13, fontWeight: 700 }}>{initials(u.name)}</Avatar>
                                                <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{u.name}</Typography>
                                            </Stack>
                                        </Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, fontSize: 13, color: '#475569' }}>{u.email}</Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6 }}><Chip label={u.status} size="small" sx={{ bgcolor: st.bg, color: st.color, fontWeight: 700, fontSize: 11 }} /></Box>
                                        <Box component="td" sx={{ px: 2.5, py: 1.6, textAlign: 'right' }}>
                                            <Tooltip arrow title="Remove from role">
                                                <IconButton size="small" onClick={() => { dispatch(removeUser({ roleId, userId: u.id })); setSnack(`${u.name} removed from ${role.name}`); }} sx={{ bgcolor: '#FEF2F2', borderRadius: '7px', border: '1px solid #FECACA', '&:hover': { bgcolor: '#FEE2E2' } }}>
                                                    <DeleteOutlineRoundedIcon sx={{ fontSize: 15, color: '#DC2626' }} />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                    {filtered.length === 0 && (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                            <PeopleAltRoundedIcon sx={{ fontSize: 34, color: '#CBD2DD' }} />
                            <Typography sx={{ fontSize: 14, color: '#98A0AE', mt: 1 }}>{search ? 'No users match your search' : 'No users assigned yet'}</Typography>
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Assign user dialog */}
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ p: 2.5, pb: 1.5 }}>
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                        <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
                            <Box sx={{ width: 40, height: 40, borderRadius: '7px', bgcolor: PRIMARY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PersonAddAlt1RoundedIcon sx={{ color: PRIMARY }} /></Box>
                            <Box><Typography sx={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>Assign User</Typography><Typography sx={{ fontSize: 12.5, color: '#98A0AE' }}>Grant a user the {role.name} role</Typography></Box>
                        </Stack>
                        <IconButton onClick={() => setOpen(false)} size="small"><CloseRoundedIcon /></IconButton>
                    </Stack>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ p: 2.5 }}>
                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, sm: 6 }}><Typography sx={label}>Full name *</Typography><TextField fullWidth size="small" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} sx={field} /></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}><Typography sx={label}>Email *</Typography><TextField fullWidth size="small" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} sx={field} /></Grid>
                    </Grid>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={() => setOpen(false)} sx={{ color: '#64748B', textTransform: 'none', fontWeight: 600, borderRadius: '7px' }}>Cancel</Button>
                    <Button onClick={add} startIcon={<PersonAddAlt1RoundedIcon />} sx={{ ...tonalBtn, px: 2.5, height: 40 }}>Assign User</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={Boolean(snack)} autoHideDuration={3000} onClose={() => setSnack('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack('')} severity={/🎉/.test(snack) ? 'success' : 'info'} variant="filled" sx={{ borderRadius: '7px' }}>{snack}</Alert>
            </Snackbar>
        </Box>
    );
}
