import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Grid, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Stack, Chip, IconButton, Divider, Snackbar, Alert, Tooltip, Avatar, LinearProgress,
} from '@mui/material';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectRoles, addRole, deleteRole } from '../redux/slices/rolesSlice';
import { TOTAL_MODULES, countEnabled } from '../data/accessModules';

const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_BORDER = '#C9BEFB';
const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
const tonalBtn = { bgcolor: PRIMARY_LIGHT, color: PRIMARY, border: `1px solid ${PRIMARY_BORDER}`, fontWeight: 700, borderRadius: '7px', boxShadow: 'none', textTransform: 'none', '&:hover': { bgcolor: '#E7DFFC' } };
const label = { fontSize: 12.5, fontWeight: 600, color: '#334155', mb: 0.6 };
const field = { '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 14, bgcolor: '#F8FAFC', '& fieldset': { borderColor: '#E5E7EB' }, '&.Mui-focused fieldset': { borderColor: PRIMARY, borderWidth: 1.5 } } };

const COLORS = ['#7C5CFC', '#0EA5E9', '#16A34A', '#F59E0B', '#E11D48', '#6246E0', '#0891B2', '#DB2777'];
const initials = (s = '') => s.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export default function RolesPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const roles = useSelector(selectRoles);

    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ name: '', description: '', color: PRIMARY });
    const [snack, setSnack] = useState('');
    const [confirmDel, setConfirmDel] = useState(null);

    const stats = useMemo(() => {
        const users = roles.reduce((n, r) => n + r.users.length, 0);
        return {
            roles: roles.length,
            users,
            system: roles.filter((r) => r.system).length,
            custom: roles.filter((r) => !r.system).length,
        };
    }, [roles]);

    const KPIS = [
        { label: 'User Roles', value: stats.roles, icon: AdminPanelSettingsRoundedIcon, color: PRIMARY, bg: PRIMARY_LIGHT },
        { label: 'Total Users', value: stats.users, icon: GroupsRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE' },
        { label: 'System Roles', value: stats.system, icon: ShieldRoundedIcon, color: '#16A34A', bg: '#DCFCE7' },
        { label: 'Custom Roles', value: stats.custom, icon: TuneRoundedIcon, color: '#F59E0B', bg: '#FFF7ED' },
    ];

    const create = () => {
        if (!form.name.trim()) { setSnack('Please enter a role name.'); return; }
        if (roles.some((r) => r.name.toLowerCase() === form.name.trim().toLowerCase())) {
            setSnack('A role with that name already exists.'); return;
        }
        dispatch(addRole({ name: form.name, description: form.description, color: form.color, baseKeys: ['dashboard'] }));
        setOpen(false);
        setForm({ name: '', description: '', color: PRIMARY });
        setSnack(`Role "${form.name.trim()}" created 🎉`);
    };

    return (
        <Box sx={{ p: 2 }}>
            {/* Header */}
            <Box sx={{ pb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexWrap: 'wrap', gap: 1.5 }}>
                <Box>
                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>Roles &amp; Access</Typography>
                    <Typography sx={{ fontSize: 13, color: '#6B7280', mt: 0.3 }}>Define login roles and control what each user type can access</Typography>
                </Box>
                <Button startIcon={<AddRoundedIcon />} onClick={() => setOpen(true)} sx={{ ...tonalBtn, height: 42, px: 2.2 }}>
                    Create User Type
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

            {/* Section title */}
            <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center', mb: 1.5, mt: 0.5 }}>
                <Box sx={{ width: 34, height: 34, borderRadius: '7px', bgcolor: PRIMARY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AdminPanelSettingsRoundedIcon sx={{ color: PRIMARY, fontSize: 19 }} />
                </Box>
                <Typography sx={{ fontSize: 15.5, fontWeight: 700, color: '#0F172A' }}>All Login Roles</Typography>
                <Chip label={`${roles.length} roles`} size="small" sx={{ bgcolor: PRIMARY_LIGHT, color: PRIMARY, fontWeight: 600, fontSize: 11.5 }} />
            </Stack>

            {/* Role cards */}
            <Grid container spacing={1.5}>
                {roles.map((r) => {
                    const enabled = countEnabled(r.access);
                    return (
                        <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={r.id}>
                            <Box sx={{ ...card, p: 0, height: '100%', display: 'flex', flexDirection: 'column', transition: 'box-shadow .18s, transform .18s', '&:hover': { boxShadow: '0 8px 24px rgba(16,24,40,0.10)', transform: 'translateY(-2px)' } }}>
                                {/* top accent */}
                                <Box sx={{ height: 4, bgcolor: r.color, borderRadius: '7px 7px 0 0' }} />
                                <Box sx={{ p: 2.5, flexGrow: 1 }}>
                                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
                                            <Box sx={{ width: 48, height: 48, borderRadius: '12px', background: `linear-gradient(135deg, ${r.color}, ${r.color}BB)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 12px ${r.color}44` }}>
                                                <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{initials(r.name)}</Typography>
                                            </Box>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography sx={{ fontSize: 15.5, fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }} noWrap>{r.name}</Typography>
                                                <Chip
                                                    size="small"
                                                    icon={r.system ? <LockRoundedIcon sx={{ fontSize: '13px !important' }} /> : undefined}
                                                    label={r.system ? 'System' : 'Custom'}
                                                    sx={{ mt: 0.5, height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: r.system ? '#EEF2FF' : '#FEF3C7', color: r.system ? '#4F46E5' : '#B45309', '& .MuiChip-icon': { color: '#4F46E5', ml: 0.6 } }}
                                                />
                                            </Box>
                                        </Stack>
                                        {!r.system && (
                                            <Tooltip arrow title="Delete role">
                                                <IconButton size="small" onClick={() => setConfirmDel(r)} sx={{ bgcolor: '#FEF2F2', borderRadius: '7px', border: '1px solid #FECACA', '&:hover': { bgcolor: '#FEE2E2' } }}>
                                                    <DeleteOutlineRoundedIcon sx={{ fontSize: 16, color: '#DC2626' }} />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Stack>

                                    <Typography sx={{ fontSize: 12.5, color: '#64748B', mt: 1.5, lineHeight: 1.55, minHeight: 38 }}>{r.description}</Typography>

                                    {/* access progress */}
                                    <Box sx={{ mt: 1.8 }}>
                                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 0.6 }}>
                                            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4 }}>Module Access</Typography>
                                            <Typography sx={{ fontSize: 12, fontWeight: 800, color: r.color }}>{enabled}<Box component="span" sx={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}> / {TOTAL_MODULES}</Box></Typography>
                                        </Stack>
                                        <LinearProgress variant="determinate" value={Math.round((enabled / TOTAL_MODULES) * 100)} sx={{ height: 7, borderRadius: 5, bgcolor: '#EEF1F6', '& .MuiLinearProgress-bar': { borderRadius: 5, bgcolor: r.color } }} />
                                    </Box>

                                    {/* users row */}
                                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 1.8 }}>
                                        <Stack direction="row" sx={{ alignItems: 'center' }}>
                                            {r.users.slice(0, 4).map((u, i) => (
                                                <Avatar key={u.id} sx={{ width: 28, height: 28, fontSize: 10.5, fontWeight: 700, bgcolor: `${r.color}22`, color: r.color, border: '2px solid #fff', ml: i ? '-8px' : 0 }}>{initials(u.name)}</Avatar>
                                            ))}
                                            {r.users.length > 4 && (
                                                <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#F1F5F9', border: '2px solid #fff', ml: '-8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#64748B' }}>+{r.users.length - 4}</Typography>
                                                </Box>
                                            )}
                                            {r.users.length === 0 && <Typography sx={{ fontSize: 12, color: '#B4BBC6', fontStyle: 'italic' }}>No users yet</Typography>}
                                        </Stack>
                                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>{r.users.length} user{r.users.length !== 1 ? 's' : ''}</Typography>
                                    </Stack>
                                </Box>

                                <Divider />
                                {/* actions */}
                                <Stack direction="row" sx={{ p: 1.2, gap: 1 }}>
                                    <Button
                                        fullWidth
                                        onClick={() => navigate(`/dashboard/roles/${r.id}/users`)}
                                        startIcon={<PeopleAltRoundedIcon sx={{ fontSize: 17 }} />}
                                        sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, color: '#334155', bgcolor: '#F1F5F9', borderRadius: '7px', height: 38, '&:hover': { bgcolor: '#E2E8F0' } }}
                                    >
                                        Users
                                    </Button>
                                    {r.system ? (
                                        <Tooltip arrow title="Predefined role — access is locked and can't be edited">
                                            <Box sx={{ flex: 1 }}>
                                                <Button
                                                    fullWidth
                                                    disabled
                                                    startIcon={<LockRoundedIcon sx={{ fontSize: 15 }} />}
                                                    sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, height: 38, borderRadius: '7px', color: '#94A3B8', bgcolor: '#F1F5F9', border: '1px solid #E6EAF1', '&.Mui-disabled': { color: '#94A3B8', bgcolor: '#F1F5F9' } }}
                                                >
                                                    Locked
                                                </Button>
                                            </Box>
                                        </Tooltip>
                                    ) : (
                                        <Button
                                            fullWidth
                                            onClick={() => navigate(`/dashboard/roles/${r.id}/access`)}
                                            endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />}
                                            sx={{ ...tonalBtn, fontSize: 12.5, height: 38 }}
                                        >
                                            Access
                                        </Button>
                                    )}
                                </Stack>
                            </Box>
                        </Grid>
                    );
                })}
            </Grid>

            {/* ── Create role dialog ────────────────────────────────────────── */}
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ p: 2.5, pb: 1.5 }}>
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                        <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
                            <Box sx={{ width: 40, height: 40, borderRadius: '7px', bgcolor: PRIMARY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <AdminPanelSettingsRoundedIcon sx={{ color: PRIMARY }} />
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>Create User Type</Typography>
                                <Typography sx={{ fontSize: 12.5, color: '#98A0AE' }}>Define a new login role for your organisation</Typography>
                            </Box>
                        </Stack>
                        <IconButton onClick={() => setOpen(false)} size="small"><CloseRoundedIcon /></IconButton>
                    </Stack>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ p: 2.5 }}>
                    <Typography sx={label}>Role name *</Typography>
                    <TextField fullWidth size="small" placeholder="e.g. Finance Officer" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} sx={{ ...field, mb: 2 }} />
                    <Typography sx={label}>Description</Typography>
                    <TextField fullWidth size="small" multiline minRows={2} placeholder="What can this role do?" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} sx={{ ...field, mb: 2 }} />
                    <Typography sx={label}>Accent colour</Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                        {COLORS.map((c) => (
                            <Box key={c} onClick={() => setForm((f) => ({ ...f, color: c }))} sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: c, cursor: 'pointer', border: form.color === c ? '3px solid #fff' : '3px solid transparent', boxShadow: form.color === c ? `0 0 0 2px ${c}` : '0 0 0 1px #E5E7EB' }} />
                        ))}
                    </Stack>
                    <Box sx={{ mt: 2, p: 1.5, bgcolor: '#F8FAFC', border: '1px solid #EEF1F6', borderRadius: '7px' }}>
                        <Typography sx={{ fontSize: 11.5, color: '#64748B' }}>
                            The new role starts with <strong>Dashboard</strong> access only. Configure the rest from its <strong>Access</strong> screen after creating.
                        </Typography>
                    </Box>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={() => setOpen(false)} sx={{ color: '#64748B', textTransform: 'none', fontWeight: 600, borderRadius: '7px' }}>Cancel</Button>
                    <Button onClick={create} startIcon={<AddRoundedIcon />} sx={{ ...tonalBtn, px: 2.5, height: 40 }}>Create Role</Button>
                </DialogActions>
            </Dialog>

            {/* ── Delete confirm ────────────────────────────────────────────── */}
            <Dialog open={Boolean(confirmDel)} onClose={() => setConfirmDel(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogContent sx={{ pt: 3.5, pb: 2, textAlign: 'center' }}>
                    <Box sx={{ width: 60, height: 60, borderRadius: '50%', bgcolor: '#FEF2F2', border: '4px solid #FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.8 }}>
                        <DeleteOutlineRoundedIcon sx={{ fontSize: 30, color: '#DC2626' }} />
                    </Box>
                    <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#111827', mb: 0.8 }}>Delete this role?</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', px: 1.5, lineHeight: 1.5 }}>
                        <strong style={{ color: '#111827' }}>{confirmDel?.name}</strong> and its access configuration will be removed. This cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
                    <Button fullWidth onClick={() => setConfirmDel(null)} sx={{ textTransform: 'none', fontSize: 13, fontWeight: 600, borderRadius: '7px', height: 38, border: '1px solid #E5E7EB', color: '#374151' }}>Cancel</Button>
                    <Button fullWidth variant="contained" startIcon={<DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />} onClick={() => { dispatch(deleteRole(confirmDel.id)); setSnack(`Role "${confirmDel.name}" deleted`); setConfirmDel(null); }} sx={{ textTransform: 'none', fontSize: 13, fontWeight: 700, borderRadius: '7px', height: 38, bgcolor: '#DC2626', color: '#fff', boxShadow: 'none', '&:hover': { bgcolor: '#B91C1C' } }}>Delete</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={Boolean(snack)} autoHideDuration={3000} onClose={() => setSnack('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack('')} severity={/🎉|deleted/.test(snack) ? 'success' : 'warning'} variant="filled" sx={{ borderRadius: '7px' }}>{snack}</Alert>
            </Snackbar>
        </Box>
    );
}
