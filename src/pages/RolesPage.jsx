import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Grid, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Stack, Chip, IconButton, Divider, Snackbar, Alert, Tooltip, LinearProgress,
    CircularProgress, Skeleton,
} from '@mui/material';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { syncRolesFromApi } from '../redux/slices/rolesSlice';
import { selectUserTypeId } from '../redux/slices/authSlice';
import { canAssignRole } from '../data/roleAccess';
import http, { apiErrorMessage } from '../Api/http';
import { GetUserTypes, PostUserType, UpdateUserType, DeleteUserType } from '../Api/Api';

const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_BORDER = '#C9BEFB';
const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
const tonalBtn = { bgcolor: PRIMARY_LIGHT, color: PRIMARY, border: `1px solid ${PRIMARY_BORDER}`, fontWeight: 700, borderRadius: '7px', boxShadow: 'none', textTransform: 'none', '&:hover': { bgcolor: '#E7DFFC' } };
const label = { fontSize: 12.5, fontWeight: 600, color: '#334155', mb: 0.6 };
const field = { '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 14, bgcolor: '#F8FAFC', '& fieldset': { borderColor: '#E5E7EB' }, '&.Mui-focused fieldset': { borderColor: PRIMARY, borderWidth: 1.5 } } };

// The palette offered when creating a role. Any hex the API already holds is
// rendered as-is — this list only seeds the picker.
const COLORS = ['#7C5CFC', '#0EA5E9', '#16A34A', '#F59E0B', '#E11D48', '#6246E0', '#0891B2', '#DB2777', '#2D9CDB', '#F5A623'];
const initials = (s = '') => s.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

const EMPTY_FORM = { name: '', description: '', accentColour: PRIMARY };

export default function RolesPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    // Master Admin membership is only editable by another Master Admin.
    const myUserTypeId = useSelector(selectUserTypeId);

    // Server state. `summary` and `totalModules` come straight from the API —
    // the KPI row is not recomputed locally, so it can't drift from the backend.
    const [roles, setRoles] = useState([]);
    const [summary, setSummary] = useState(null);
    const [totalModules, setTotalModules] = useState(0);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);      // role id being edited, null = creating
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [confirmDel, setConfirmDel] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [snack, setSnack] = useState({ msg: '', severity: 'success' });

    const notify = (msg, severity = 'success') => setSnack({ msg, severity });

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const { data: body } = await http.get(GetUserTypes);
            if (body?.error) throw new Error(body.message || 'Could not load roles.');

            const d = body?.data || {};
            const list = d.roles || [];
            setRoles(list);
            setSummary(d.summary || null);
            setTotalModules(d.totalModules || 0);

            // Keep the store in step so /roles/:id/users and /roles/:id/access
            // can still resolve a role by the id these cards link with.
            dispatch(syncRolesFromApi(list));
        } catch (err) {
            setLoadError(err?.response || err?.request ? apiErrorMessage(err, 'Could not load roles.') : err.message);
        } finally {
            setLoading(false);
        }
    }, [dispatch]);

    useEffect(() => { load(); }, [load]);

    // ── Create / edit ───────────────────────────────────────────────────────
    // One dialog does both. `editing` holds the role's id when we're updating,
    // and is null when we're creating.
    const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setFormError(''); setOpen(true); };
    const openEdit = (r) => {
        setEditing(r.id);
        setForm({ name: r.name, description: r.description || '', accentColour: r.accentColour || PRIMARY });
        setFormError('');
        setOpen(true);
    };

    const save = async () => {
        const name = form.name.trim();
        if (!name) { setFormError('Enter a role name.'); return; }

        // A cheap local check for the obvious case — ignoring the role being
        // edited, so re-saving it under its own name isn't rejected. The server
        // is still the authority (it answers 409); that's handled below.
        if (roles.some((r) => r.id !== editing && r.name.trim().toLowerCase() === name.toLowerCase())) {
            setFormError(`A role named "${name}" already exists.`);
            return;
        }

        setSaving(true);
        setFormError('');
        try {
            const payload = { name, description: form.description.trim(), accentColour: form.accentColour };
            const { data: body } = editing
                ? await http.put(UpdateUserType, { id: editing, ...payload })
                : await http.post(PostUserType, payload);

            if (body?.error) throw new Error(body.message || 'Could not save the role.');

            setOpen(false);
            notify(editing ? `Role "${name}" updated.` : `Role "${name}" created.`);
            await load();   // re-read, so counts and summary come from the server
        } catch (err) {
            // 409 = duplicate name. The API sends a usable message; show it in
            // the dialog rather than a toast, since the field needs correcting.
            setFormError(apiErrorMessage(err, 'Could not save the role.'));
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ──────────────────────────────────────────────────────────────
    // Two rules, and the UI enforces both up front rather than letting the call
    // fail:
    //   1. Built-in roles can't be deleted (the server answers 400) — so the
    //      action isn't offered on them at all.
    //   2. A role can only be deleted when NOBODY is assigned to it. Deleting a
    //      role out from under its users would leave them with no login type,
    //      so they have to be moved off it first.
    const canDelete = (r) => !r.isSystem && (r.usersCount ?? 0) === 0;

    const remove = async () => {
        const r = confirmDel;

        // Second line of defence. `usersCount` comes from the last GetUserTypes,
        // so it can be stale if someone assigned a user in another tab — refuse
        // here too rather than trusting the dialog to have been right.
        if (!canDelete(r)) {
            setConfirmDel(null);
            notify(`"${r.name}" still has ${r.usersCount} user(s). Move them to another role first.`, 'warning');
            return;
        }

        setDeleting(true);
        try {
            const { data: body } = await http.delete(`${DeleteUserType}?id=${r.id}`);

            // The API answers 200 with { error, data: { id, deleted } }. Treat a
            // response that didn't actually delete as a failure, instead of
            // reporting success off the HTTP status alone.
            if (body?.error || body?.data?.deleted !== true) {
                throw new Error(body?.message || 'The role was not deleted.');
            }

            setConfirmDel(null);
            notify(`Role "${r.name}" deleted.`);
            await load();   // re-read so the summary counts come from the server
        } catch (err) {
            setConfirmDel(null);
            notify(apiErrorMessage(err, 'Could not delete the role.'), 'error');
        } finally {
            setDeleting(false);
        }
    };

    const KPIS = [
        { label: 'User Roles', value: summary?.userRoles ?? 0, icon: AdminPanelSettingsRoundedIcon, color: PRIMARY, bg: PRIMARY_LIGHT },
        { label: 'Total Users', value: summary?.totalUsers ?? 0, icon: GroupsRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE' },
        { label: 'System Roles', value: summary?.systemRoles ?? 0, icon: ShieldRoundedIcon, color: '#16A34A', bg: '#DCFCE7' },
        { label: 'Custom Roles', value: summary?.customRoles ?? 0, icon: TuneRoundedIcon, color: '#F59E0B', bg: '#FFF7ED' },
    ];

    return (
        <Box sx={{ p: 2 }}>
            {/* Header */}
            <Box sx={{ pb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexWrap: 'wrap', gap: 1.5 }}>
                <Box>
                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>Roles &amp; Access</Typography>
                    <Typography sx={{ fontSize: 13, color: '#6B7280', mt: 0.3 }}>Define login roles and control what each user type can access</Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Tooltip arrow title="Reload from server">
                        <span>
                            <IconButton onClick={load} disabled={loading} sx={{ width: 42, height: 42, border: '1px solid #E6EAF1', borderRadius: '7px', bgcolor: '#fff', color: '#5B6472', '&:hover': { bgcolor: PRIMARY_LIGHT, color: PRIMARY } }}>
                                <RefreshRoundedIcon sx={{ fontSize: 19 }} />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Button startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ ...tonalBtn, height: 42, px: 2.2 }}>
                        Create User Type
                    </Button>
                </Stack>
            </Box>

            {/* KPI cards — straight from the API summary */}
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                {KPIS.map((k) => (
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={k.label}>
                        <Box sx={{ ...card, p: 2.5, bgcolor: k.bg, border: `1px solid ${k.color}22` }}>
                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: k.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</Typography>
                                    {loading
                                        ? <Skeleton variant="text" width={44} height={40} sx={{ mt: 0.5 }} />
                                        : <Typography sx={{ fontSize: 28, fontWeight: 800, color: '#0F172A', mt: 0.5 }}>{k.value}</Typography>}
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
                {!loading && !loadError && (
                    <Chip label={`${roles.length} role${roles.length === 1 ? '' : 's'}`} size="small" sx={{ bgcolor: PRIMARY_LIGHT, color: PRIMARY, fontWeight: 600, fontSize: 11.5 }} />
                )}
            </Stack>

            {/* Failed to load — say so and offer a retry, rather than showing an
                empty grid that looks like "you have no roles". */}
            {loadError && !loading && (
                <Box sx={{ ...card, p: 4, textAlign: 'center' }}>
                    <ErrorOutlineRoundedIcon sx={{ fontSize: 38, color: '#F87171' }} />
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#0F172A', mt: 1 }}>Couldn’t load roles</Typography>
                    <Typography sx={{ fontSize: 13, color: '#6B7280', mt: 0.5 }}>{loadError}</Typography>
                    <Button onClick={load} startIcon={<RefreshRoundedIcon />} sx={{ ...tonalBtn, mt: 2, height: 40, px: 2.4 }}>Try again</Button>
                </Box>
            )}

            {/* Role cards */}
            <Grid container spacing={1.5}>
                {loading && [0, 1, 2].map((i) => (
                    <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={i}>
                        <Box sx={{ ...card, p: 2.5, height: 250 }}>
                            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                                <Skeleton variant="rounded" width={48} height={48} />
                                <Box sx={{ flex: 1 }}>
                                    <Skeleton variant="text" width="60%" height={24} />
                                    <Skeleton variant="text" width="30%" height={18} />
                                </Box>
                            </Stack>
                            <Skeleton variant="text" width="100%" height={20} sx={{ mt: 2 }} />
                            <Skeleton variant="text" width="80%" height={20} />
                            <Skeleton variant="rounded" width="100%" height={7} sx={{ mt: 3 }} />
                            <Skeleton variant="rounded" width="100%" height={38} sx={{ mt: 3 }} />
                        </Box>
                    </Grid>
                ))}

                {!loading && !loadError && roles.map((r) => {
                    const colour = r.accentColour || PRIMARY;
                    const access = r.accessCount ?? 0;
                    const users = r.usersCount ?? 0;
                    const pct = totalModules ? Math.round((access / totalModules) * 100) : 0;
                    return (
                        <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={r.id}>
                            <Box sx={{ ...card, p: 0, height: '100%', display: 'flex', flexDirection: 'column', transition: 'box-shadow .18s, transform .18s', '&:hover': { boxShadow: '0 8px 24px rgba(16,24,40,0.10)', transform: 'translateY(-2px)' } }}>
                                {/* top accent — the role's own colour from the API */}
                                <Box sx={{ height: 4, bgcolor: colour, borderRadius: '7px 7px 0 0' }} />
                                <Box sx={{ p: 2.5, flexGrow: 1 }}>
                                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
                                            <Box sx={{ width: 48, height: 48, borderRadius: '12px', background: `linear-gradient(135deg, ${colour}, ${colour}BB)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 12px ${colour}44` }}>
                                                <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{initials(r.name)}</Typography>
                                            </Box>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography sx={{ fontSize: 15.5, fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }} noWrap>{r.name}</Typography>
                                                <Chip
                                                    size="small"
                                                    icon={r.isSystem ? <LockRoundedIcon sx={{ fontSize: '13px !important' }} /> : undefined}
                                                    label={r.isSystem ? 'System' : 'Custom'}
                                                    sx={{ mt: 0.5, height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: r.isSystem ? '#EEF2FF' : '#FEF3C7', color: r.isSystem ? '#4F46E5' : '#B45309', '& .MuiChip-icon': { color: '#4F46E5', ml: 0.6 } }}
                                                />
                                            </Box>
                                        </Stack>

                                        {/* Built-in roles can't be renamed or removed — the server
                                            rejects both — so the actions only appear on custom ones. */}
                                        {!r.isSystem && (
                                            <Stack direction="row" spacing={0.3} sx={{ flexShrink: 0 }}>
                                                <Tooltip arrow title="Edit role">
                                                    <IconButton size="small" onClick={() => openEdit(r)} sx={{ color: '#94A3B8', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}>
                                                        <EditRoundedIcon sx={{ fontSize: 17 }} />
                                                    </IconButton>
                                                </Tooltip>
                                                {/* Blocked while the role still has users. The button stays
                                                    clickable so the dialog can explain the rule — a silently
                                                    disabled icon just reads as broken. */}
                                                <Tooltip
                                                    arrow
                                                    title={canDelete(r)
                                                        ? 'Delete role'
                                                        : `Can't delete — ${users} user${users === 1 ? '' : 's'} still assigned`}
                                                >
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => setConfirmDel(r)}
                                                        sx={{
                                                            color: canDelete(r) ? '#94A3B8' : '#CBD2DD',
                                                            '&:hover': canDelete(r)
                                                                ? { color: '#DC2626', bgcolor: '#FEF2F2' }
                                                                : { color: '#B45309', bgcolor: '#FFF7ED' },
                                                        }}
                                                    >
                                                        <DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        )}
                                    </Stack>

                                    <Typography sx={{ fontSize: 12.5, color: '#64748B', mt: 1.5, lineHeight: 1.55, minHeight: 38 }}>
                                        {r.description || 'No description.'}
                                    </Typography>

                                    {/* Module access — server's accessCount against its totalModules */}
                                    <Box sx={{ mt: 1.8 }}>
                                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 0.6 }}>
                                            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4 }}>Module Access</Typography>
                                            <Typography sx={{ fontSize: 12, fontWeight: 800, color: colour }}>
                                                {access}<Box component="span" sx={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}> / {totalModules}</Box>
                                            </Typography>
                                        </Stack>
                                        <LinearProgress variant="determinate" value={pct} sx={{ height: 7, borderRadius: 5, bgcolor: '#EEF1F6', '& .MuiLinearProgress-bar': { borderRadius: 5, bgcolor: colour } }} />
                                    </Box>

                                    {/* Users on this role */}
                                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1.8 }}>
                                        <Box sx={{ width: 30, height: 30, borderRadius: '8px', bgcolor: `${colour}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <PeopleAltRoundedIcon sx={{ fontSize: 16, color: colour }} />
                                        </Box>
                                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: users ? '#0F172A' : '#B4BBC6' }}>
                                            {users} user{users === 1 ? '' : 's'}
                                        </Typography>
                                        {users === 0 && <Typography sx={{ fontSize: 11.5, color: '#B4BBC6', fontStyle: 'italic' }}>· nobody assigned yet</Typography>}
                                    </Stack>
                                </Box>

                                <Divider />
                                <Stack direction="row" sx={{ p: 1.2, gap: 1 }}>
                                    <Button
                                        fullWidth
                                        onClick={() => navigate(`/dashboard/roles/${r.id}/users`)}
                                        startIcon={canAssignRole(myUserTypeId, r.id)
                                            ? <PeopleAltRoundedIcon sx={{ fontSize: 17 }} />
                                            : <LockRoundedIcon sx={{ fontSize: 15 }} />}
                                        sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, color: '#334155', bgcolor: '#F1F5F9', borderRadius: '7px', height: 38, '&:hover': { bgcolor: '#E2E8F0' } }}
                                    >
                                        {canAssignRole(myUserTypeId, r.id) ? 'Users' : 'View Users'}
                                    </Button>
                                    {r.isSystem ? (
                                        <Tooltip arrow title="Predefined role — its access is locked and can't be edited">
                                            <Box sx={{ flex: 1 }}>
                                                <Button
                                                    fullWidth disabled
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

                {!loading && !loadError && roles.length === 0 && (
                    <Grid size={12}>
                        <Box sx={{ ...card, p: 5, textAlign: 'center' }}>
                            <AdminPanelSettingsRoundedIcon sx={{ fontSize: 38, color: '#CBD2DD' }} />
                            <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#64748B', mt: 1 }}>No login roles yet</Typography>
                            <Typography sx={{ fontSize: 13, color: '#98A0AE', mt: 0.4 }}>Create a user type to start controlling what people can reach.</Typography>
                        </Box>
                    </Grid>
                )}
            </Grid>

            {/* ── Create user type ──────────────────────────────────────────── */}
            <Dialog open={open} onClose={() => !saving && setOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ p: 2.5, pb: 1.5 }}>
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                        <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
                            <Box sx={{ width: 40, height: 40, borderRadius: '7px', bgcolor: PRIMARY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <AdminPanelSettingsRoundedIcon sx={{ color: PRIMARY }} />
                            </Box>
                            <Box>
                                <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>{editing ? 'Edit User Type' : 'Create User Type'}</Typography>
                                <Typography sx={{ fontSize: 12.5, color: '#98A0AE' }}>
                                    {editing ? 'Rename this role or change how it looks' : 'Define a new login role for your organisation'}
                                </Typography>
                            </Box>
                        </Stack>
                        <IconButton onClick={() => setOpen(false)} size="small" disabled={saving}><CloseRoundedIcon /></IconButton>
                    </Stack>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ p: 2.5 }}>
                    {/* Server-side rejections (409 duplicate name, validation) land here */}
                    {formError && (
                        <Alert severity="error" onClose={() => setFormError('')} sx={{ mb: 2, borderRadius: '7px', fontSize: 12.5 }}>
                            {formError}
                        </Alert>
                    )}

                    <Typography sx={label}>Role name *</Typography>
                    <TextField
                        fullWidth size="small" placeholder="e.g. Finance Officer" autoFocus disabled={saving}
                        value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        sx={{ ...field, mb: 2 }}
                    />

                    <Typography sx={label}>Description</Typography>
                    <TextField
                        fullWidth size="small" multiline minRows={2} placeholder="e.g. Handles payroll finance" disabled={saving}
                        value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        sx={{ ...field, mb: 2 }}
                    />

                    <Typography sx={label}>Accent colour</Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                        {COLORS.map((c) => (
                            <Box
                                key={c}
                                onClick={() => !saving && setForm((f) => ({ ...f, accentColour: c }))}
                                sx={{
                                    width: 30, height: 30, borderRadius: '50%', bgcolor: c, cursor: saving ? 'default' : 'pointer',
                                    border: form.accentColour === c ? '3px solid #fff' : '3px solid transparent',
                                    boxShadow: form.accentColour === c ? `0 0 0 2px ${c}` : '0 0 0 1px #E5E7EB',
                                }}
                            />
                        ))}
                    </Stack>

                    {/* Live preview of the card this will produce */}
                    <Box sx={{ mt: 2.2, p: 1.8, borderRadius: '9px', border: '1px solid #EEF1F6', bgcolor: '#F8FAFC' }}>
                        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4, mb: 1 }}>Preview</Typography>
                        <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
                            <Box sx={{ width: 40, height: 40, borderRadius: '10px', background: `linear-gradient(135deg, ${form.accentColour}, ${form.accentColour}BB)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: '#fff' }}>{initials(form.name) || '—'}</Typography>
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }} noWrap>{form.name.trim() || 'Role name'}</Typography>
                                <Typography sx={{ fontSize: 11.5, color: '#98A0AE' }} noWrap>{form.description.trim() || 'No description'}</Typography>
                            </Box>
                        </Stack>
                    </Box>

                    {!editing && (
                        <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '7px' }}>
                            <Typography sx={{ fontSize: 11.5, color: '#78350F' }}>
                                The new role starts with <strong>Dashboard</strong> access only. Grant the rest from its <strong>Access</strong> screen.
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <Divider />
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={() => setOpen(false)} disabled={saving} sx={{ color: '#64748B', textTransform: 'none', fontWeight: 600, borderRadius: '7px' }}>Cancel</Button>
                    <Button
                        onClick={save}
                        disabled={saving}
                        startIcon={saving
                            ? <CircularProgress size={16} thickness={5} sx={{ color: PRIMARY }} />
                            : (editing ? <SaveRoundedIcon sx={{ fontSize: 18 }} /> : <AddRoundedIcon />)}
                        sx={{ ...tonalBtn, px: 2.5, height: 40 }}
                    >
                        {saving ? (editing ? 'Saving…' : 'Creating…') : (editing ? 'Save Changes' : 'Create Role')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Delete: blocked, or confirm ───────────────────────────────────
                A role with users on it can't be deleted. Rather than a dead
                button, the dialog opens and explains the rule, and offers the
                one action that unblocks it — going to the role's users. */}
            <Dialog open={Boolean(confirmDel)} onClose={() => !deleting && setConfirmDel(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                {confirmDel && !canDelete(confirmDel) ? (
                    <>
                        <DialogContent sx={{ pt: 3.5, pb: 2, textAlign: 'center' }}>
                            <Box sx={{ width: 60, height: 60, borderRadius: '50%', bgcolor: '#FFF7ED', border: '4px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.8 }}>
                                <GroupsRoundedIcon sx={{ fontSize: 30, color: '#B45309' }} />
                            </Box>
                            <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#111827', mb: 0.8 }}>This role still has users</Typography>
                            <Typography sx={{ fontSize: 12.5, color: '#6B7280', px: 1, lineHeight: 1.6 }}>
                                <strong style={{ color: '#111827' }}>{confirmDel.name}</strong> is assigned to{' '}
                                <strong style={{ color: '#B45309' }}>{confirmDel.usersCount} user{confirmDel.usersCount === 1 ? '' : 's'}</strong>.
                                A role can only be deleted once nobody is using it — otherwise those users would be left without a login type.
                            </Typography>
                            <Box sx={{ mt: 2, p: 1.5, bgcolor: '#F8FAFC', border: '1px solid #EEF1F6', borderRadius: '7px' }}>
                                <Typography sx={{ fontSize: 11.5, color: '#64748B', textAlign: 'left' }}>
                                    Move {confirmDel.usersCount === 1 ? 'the user' : 'all users'} to another role first, then delete this one.
                                </Typography>
                            </Box>
                        </DialogContent>
                        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
                            <Button fullWidth onClick={() => setConfirmDel(null)} sx={{ textTransform: 'none', fontSize: 13, fontWeight: 600, borderRadius: '7px', height: 40, border: '1px solid #E5E7EB', color: '#374151' }}>
                                Close
                            </Button>
                            <Button
                                fullWidth
                                onClick={() => { const id = confirmDel.id; setConfirmDel(null); navigate(`/dashboard/roles/${id}/users`); }}
                                endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />}
                                sx={{ ...tonalBtn, height: 40, fontSize: 13 }}
                            >
                                View users
                            </Button>
                        </DialogActions>
                    </>
                ) : (
                    <>
                        <DialogContent sx={{ pt: 3.5, pb: 2, textAlign: 'center' }}>
                            <Box sx={{ width: 60, height: 60, borderRadius: '50%', bgcolor: '#FEF2F2', border: '4px solid #FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.8 }}>
                                <DeleteOutlineRoundedIcon sx={{ fontSize: 30, color: '#DC2626' }} />
                            </Box>
                            <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#111827', mb: 0.8 }}>Delete this role?</Typography>
                            <Typography sx={{ fontSize: 12.5, color: '#6B7280', px: 1.5, lineHeight: 1.5 }}>
                                <strong style={{ color: '#111827' }}>{confirmDel?.name}</strong> and its access configuration will be removed. No users are assigned to it. This cannot be undone.
                            </Typography>
                        </DialogContent>
                        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
                            <Button fullWidth onClick={() => setConfirmDel(null)} disabled={deleting} sx={{ textTransform: 'none', fontSize: 13, fontWeight: 600, borderRadius: '7px', height: 40, border: '1px solid #E5E7EB', color: '#374151' }}>Cancel</Button>
                            <Button
                                fullWidth variant="contained" onClick={remove} disabled={deleting}
                                startIcon={deleting ? <CircularProgress size={15} thickness={5} sx={{ color: '#fff' }} /> : <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />}
                                sx={{ textTransform: 'none', fontSize: 13, fontWeight: 700, borderRadius: '7px', height: 40, bgcolor: '#DC2626', color: '#fff', boxShadow: 'none', '&:hover': { bgcolor: '#B91C1C' }, '&.Mui-disabled': { bgcolor: '#DC2626', color: '#fff', opacity: 0.7 } }}
                            >
                                {deleting ? 'Deleting…' : 'Delete'}
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            <Snackbar open={Boolean(snack.msg)} autoHideDuration={3200} onClose={() => setSnack({ msg: '', severity: 'success' })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack({ msg: '', severity: 'success' })} severity={snack.severity} variant="filled" sx={{ borderRadius: '7px' }}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
