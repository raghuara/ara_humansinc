import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box, Typography, Button, Stack, Chip, IconButton, Switch, Grid, Snackbar, Alert, LinearProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tooltip, Skeleton, CircularProgress,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import RemoveDoneRoundedIcon from '@mui/icons-material/RemoveDoneRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectRoleById, replaceRoleAccess, renameRole } from '../redux/slices/rolesSlice';
import { groupsFromRoleAccess, groupModulesByCategory } from '../data/accessModules';
import http, { apiErrorMessage } from '../Api/http';
import { GetModules, GetRoleAccess, UpdateRoleAccess } from '../Api/Api';

const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_BORDER = '#C9BEFB';
const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
const tonalBtn = { bgcolor: PRIMARY_LIGHT, color: PRIMARY, border: `1px solid ${PRIMARY_BORDER}`, fontWeight: 700, borderRadius: '7px', boxShadow: 'none', textTransform: 'none', '&:hover': { bgcolor: '#E7DFFC' } };
const disabledBtn = { '&.Mui-disabled': { bgcolor: '#F1F5F9', color: '#94A3B8', borderColor: '#E2E8F0' } };
const initials = (s = '') => s.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

const sameMap = (a, b) => {
    if (!a || !b) return true;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every((k) => !!a[k] === !!b[k]);
};

export default function RoleAccessPage() {
    const navigate = useNavigate();
    const { roleId } = useParams();
    const dispatch = useDispatch();

    // The store is only consulted for the bits GetRoleAccess doesn't return
    // (the description, and the rename action). Everything the grid draws —
    // the module catalogue, the groups, and which toggles are on — comes from
    // the server, so a fresh browser shows the same thing as any other.
    const storeRole = useSelector(selectRoleById(roleId));
    const userTypeId = Number(roleId);

    const [role, setRole] = useState(null);       // { roleName, accentColour, isSystem }
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    // Toggling edits `draft` only — nothing is written to the store or the API
    // until Save. `saved` is the last state the server confirmed, so it's both
    // what Discard restores and what "unsaved changes" is measured against.
    const [draft, setDraft] = useState(null);
    const [saved, setSaved] = useState(null);
    const [saving, setSaving] = useState(false);

    const [snack, setSnack] = useState({ msg: '', severity: 'success' });
    const [editOpen, setEditOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');

    const notify = (msg, severity = 'success') => setSnack({ msg, severity });

    const load = useCallback(async () => {
        // The seed roles ('administrator', 'employee') have no numeric id, so
        // there's no user type on the server to read access for.
        if (!Number.isFinite(userTypeId)) {
            setLoading(false);
            setLoadError("This role isn't saved on the server yet, so its access can't be loaded.");
            return;
        }
        setLoading(true);
        setLoadError('');
        try {
            // Two questions, two endpoints: GetModules answers "what modules exist"
            // and GetRoleAccess answers "which does THIS role have". Reading the
            // catalogue separately means a brand-new user type still shows all 32
            // toggles even if its access response only carries what's enabled.
            const [modulesRes, accessRes] = await Promise.allSettled([
                http.get(GetModules),
                http.get(GetRoleAccess, { params: { userTypeId } }),
            ]);

            // Access is the one that can't be missing — without it there's nothing
            // to draw the switches from, and saving a guess would wipe the role.
            if (accessRes.status === 'rejected') throw accessRes.reason;
            const body = accessRes.value?.data;
            if (body?.error) throw new Error(body.message || 'Could not load this role’s access.');

            const d = body?.data || {};

            // Which modules this role currently holds, keyed by moduleKey.
            const enabled = {};
            (d.categories || []).forEach((c) => {
                (c.modules || []).forEach((m) => { enabled[m.moduleKey] = !!m.enabled; });
            });

            // The catalogue drives the grid. If GetModules is unreachable, fall back
            // to the categories GetRoleAccess sent rather than showing an empty page.
            const modulesBody = modulesRes.status === 'fulfilled' ? modulesRes.value?.data : null;
            const catalogue = Array.isArray(modulesBody?.data?.modules) && modulesBody.data.modules.length && !modulesBody.error
                ? groupModulesByCategory(modulesBody.data.modules)
                : groupsFromRoleAccess(d.categories);

            // Every catalogue module gets an entry — absent from the access response
            // means "not granted", not "doesn't exist".
            const map = {};
            catalogue.forEach((g) => { g.items.forEach((m) => { map[m.key] = !!enabled[m.key]; }); });

            setRole({ roleName: d.roleName, accentColour: d.accentColour, isSystem: Boolean(d.isSystem) });
            setGroups(catalogue);
            setDraft(map);
            setSaved(map);

            // Push server truth into the store so the role cards and the users
            // screen stop counting from a stale local map.
            dispatch(replaceRoleAccess({ roleId, access: map }));
        } catch (err) {
            setLoadError(err?.response || err?.request ? apiErrorMessage(err, 'Could not load this role’s access.') : err.message);
        } finally {
            setLoading(false);
        }
    }, [userTypeId, roleId, dispatch]);

    useEffect(() => { load(); }, [load]);

    const allItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);
    const dirty = useMemo(() => !sameMap(draft, saved), [draft, saved]);

    const setAll = (value) => setDraft((d) => {
        const next = {};
        Object.keys(d || {}).forEach((k) => { next[k] = value; });
        return next;
    });

    const save = async () => {
        setSaving(true);
        try {
            // Every module is sent, enabled or not — a complete picture of the
            // role's access. Sending only what changed would leave the backend
            // guessing whether an absent module means "unchanged" or "revoked".
            const items = allItems.map((m) => ({ moduleId: m.moduleId, enabled: !!draft[m.key] }));
            const { data: body } = await http.put(UpdateRoleAccess, { userTypeId, items });
            if (body?.error) throw new Error(body.message || 'Could not save access.');

            dispatch(replaceRoleAccess({ roleId, access: draft }));
            setSaved(draft);
            notify('Access updated');
        } catch (err) {
            notify(err?.response || err?.request ? apiErrorMessage(err, 'Could not save access.') : err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    // Identity comes from the server once loaded; the store covers the first
    // paint (and the case where the request failed outright).
    const name = role?.roleName || storeRole?.name || 'Role';
    const colour = role?.accentColour || storeRole?.color || PRIMARY;
    const locked = role ? role.isSystem : Boolean(storeRole?.system); // predefined roles are read-only

    const openEdit = () => { setEditName(name); setEditDesc(storeRole?.description || ''); setEditOpen(true); };
    const saveEdit = () => {
        if (!editName.trim()) return;
        dispatch(renameRole({ roleId, name: editName, description: editDesc }));
        setEditOpen(false);
        notify('Role details updated');
    };

    // Coverage tracks the draft, so the bar moves as you toggle — before you commit.
    const keys = Object.keys(draft || {});
    const total = keys.length;
    const enabled = keys.filter((k) => draft[k]).length;
    const pct = total ? Math.round((enabled / total) * 100) : 0;
    const ready = !loading && !loadError && !!draft;

    return (
        <Box sx={{ p: 2 }}>
            {/* Header */}
            <Box sx={{ pb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexWrap: 'wrap', gap: 1.5 }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                    <IconButton onClick={() => navigate('/dashboard/roles')} sx={{ bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', '&:hover': { bgcolor: '#F8FAFC' } }}>
                        <ArrowBackRoundedIcon sx={{ fontSize: 20, color: '#334155' }} />
                    </IconButton>
                    <Box sx={{ width: 46, height: 46, borderRadius: '10px', bgcolor: `${colour}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography sx={{ fontSize: 15, fontWeight: 800, color: colour }}>{initials(name)}</Typography>
                    </Box>
                    <Box>
                        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                            <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>{name}</Typography>
                            {!locked && storeRole && (
                                <Tooltip arrow title="Edit role name">
                                    <IconButton onClick={openEdit} size="small" sx={{ color: '#94A3B8', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}>
                                        <EditRoundedIcon sx={{ fontSize: 17 }} />
                                    </IconButton>
                                </Tooltip>
                            )}
                            {dirty && !locked && (
                                <Chip label="Unsaved changes" size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }} />
                            )}
                        </Stack>
                        <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>{locked ? 'Predefined access — view only' : 'Toggle which modules this role can access, then save'}</Typography>
                    </Box>
                </Stack>
                <Stack direction="row" spacing={1}>
                    <Button onClick={() => navigate(`/dashboard/roles/${roleId}/users`)} startIcon={<PeopleAltRoundedIcon sx={{ fontSize: 18 }} />} sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, color: '#334155', bgcolor: '#F1F5F9', borderRadius: '7px', height: 42, px: 2, '&:hover': { bgcolor: '#E2E8F0' } }}>View Users</Button>
                    {locked ? (
                        <Chip icon={<LockRoundedIcon sx={{ fontSize: '16px !important' }} />} label="Locked" sx={{ height: 42, borderRadius: '7px', px: 0.5, fontSize: 12.5, fontWeight: 700, bgcolor: '#EEF2FF', color: '#4F46E5', border: '1px solid #DDE0FB', '& .MuiChip-icon': { color: '#4F46E5' } }} />
                    ) : (
                        <>
                            <Button disabled={!ready || saving} onClick={() => setAll(true)} startIcon={<DoneAllRoundedIcon sx={{ fontSize: 17 }} />} sx={{ ...tonalBtn, ...disabledBtn, height: 42, px: 2 }}>Enable All</Button>
                            <Button disabled={!ready || saving} onClick={() => setAll(false)} startIcon={<RemoveDoneRoundedIcon sx={{ fontSize: 17 }} />} sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, color: '#B91C1C', bgcolor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '7px', height: 42, px: 2, '&:hover': { bgcolor: '#FEE2E2' }, ...disabledBtn }}>Disable All</Button>
                            <Button disabled={!dirty || saving} onClick={() => setDraft(saved)} startIcon={<UndoRoundedIcon sx={{ fontSize: 17 }} />} sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, color: '#475569', bgcolor: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '7px', height: 42, px: 2, '&:hover': { bgcolor: '#E2E8F0' }, ...disabledBtn }}>Discard</Button>
                            <Button
                                onClick={save}
                                disabled={!ready || !dirty || saving}
                                startIcon={saving ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : <SaveRoundedIcon sx={{ fontSize: 17 }} />}
                                sx={{ bgcolor: PRIMARY, color: '#fff', textTransform: 'none', fontSize: 12.5, fontWeight: 700, borderRadius: '7px', height: 42, px: 2.4, boxShadow: 'none', '&:hover': { bgcolor: '#6246E0', boxShadow: 'none' }, '&.Mui-disabled': { bgcolor: '#E2E8F0', color: '#94A3B8' } }}
                            >
                                {saving ? 'Saving…' : 'Save Changes'}
                            </Button>
                        </>
                    )}
                </Stack>
            </Box>

            {/* Locked banner for predefined roles */}
            {locked && !loading && (
                <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center', ...card, p: 1.8, mb: 1.5, bgcolor: '#EEF2FF', border: '1px solid #DDE0FB' }}>
                    <Box sx={{ width: 34, height: 34, borderRadius: '8px', bgcolor: '#fff', border: '1px solid #DDE0FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <LockRoundedIcon sx={{ fontSize: 18, color: '#4F46E5' }} />
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#3730A3' }}>This is a predefined system role</Typography>
                        <Typography sx={{ fontSize: 12, color: '#4F46E5' }}>Its access is locked and can't be modified. Create a custom role to define your own access.</Typography>
                    </Box>
                </Stack>
            )}

            {/* Access summary bar */}
            <Box sx={{ ...card, p: 2.5, mb: 1.5 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Access coverage</Typography>
                    {loading
                        ? <Skeleton variant="text" width={140} />
                        : <Typography sx={{ fontSize: 13, fontWeight: 800, color: PRIMARY }}>{enabled} / {total} modules&nbsp;·&nbsp;{pct}%</Typography>}
                </Stack>
                <LinearProgress variant={loading ? 'indeterminate' : 'determinate'} value={pct} sx={{ height: 8, borderRadius: 5, bgcolor: '#EEF1F6', '& .MuiLinearProgress-bar': { borderRadius: 5, background: `linear-gradient(90deg, ${colour}, ${PRIMARY})` } }} />
            </Box>

            {/* The access couldn't be read — showing toggles now would be a lie, and
                saving from a guessed state would wipe the role. So: nothing but a retry. */}
            {loadError && !loading && (
                <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center', ...card, p: 2, bgcolor: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <ErrorOutlineRoundedIcon sx={{ fontSize: 22, color: '#B91C1C' }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#991B1B' }}>Couldn't load this role's access</Typography>
                        <Typography sx={{ fontSize: 12, color: '#B91C1C' }}>{loadError}</Typography>
                    </Box>
                    {Number.isFinite(userTypeId) && (
                        <Button onClick={load} startIcon={<RefreshRoundedIcon sx={{ fontSize: 17 }} />} sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12.5, color: '#B91C1C', bgcolor: '#fff', border: '1px solid #FECACA', borderRadius: '7px', height: 38, px: 2, '&:hover': { bgcolor: '#FEE2E2' } }}>Retry</Button>
                    )}
                </Stack>
            )}

            {/* Loading skeleton */}
            {loading && (
                <Stack spacing={1.5}>
                    {[0, 1, 2].map((i) => (
                        <Box key={i} sx={{ ...card, p: 0 }}>
                            <Box sx={{ px: 2.5, py: 1.8, borderBottom: '1px solid #F1F3F7' }}>
                                <Skeleton variant="text" width={180} height={22} />
                            </Box>
                            <Grid container sx={{ p: 1.5 }} spacing={1.5}>
                                {[0, 1, 2].map((j) => (
                                    <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={j}>
                                        <Skeleton variant="rounded" height={70} sx={{ borderRadius: '7px' }} />
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    ))}
                </Stack>
            )}

            {/* Module groups — straight from GetRoleAccess, toggling the local draft */}
            {ready && (
                <Stack spacing={1.5} sx={{ opacity: saving ? 0.7 : 1, pointerEvents: saving ? 'none' : 'auto', transition: 'opacity .15s' }}>
                    {groups.map((g) => {
                        const groupOn = g.items.filter((i) => draft[i.key]).length;
                        return (
                            <Box key={g.group} sx={{ ...card, p: 0 }}>
                                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.8, borderBottom: '1px solid #F1F3F7' }}>
                                    <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
                                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: g.color }} />
                                        <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{g.group}</Typography>
                                        <Chip label={`${groupOn} / ${g.items.length}`} size="small" sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 700, fontSize: 11 }} />
                                    </Stack>
                                </Stack>
                                <Grid container sx={{ p: 1.5 }} spacing={1.5}>
                                    {g.items.map((m) => {
                                        const on = !!draft[m.key];
                                        const changed = saved && on !== !!saved[m.key];
                                        const Icon = m.icon;
                                        const toggle = () => setDraft((d) => ({ ...d, [m.key]: !d[m.key] }));
                                        return (
                                            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={m.key}>
                                                <Box
                                                    onClick={locked ? undefined : toggle}
                                                    sx={{
                                                        display: 'flex', alignItems: 'center', gap: 1.4, p: 1.6,
                                                        cursor: locked ? 'default' : 'pointer',
                                                        opacity: locked && !on ? 0.7 : 1,
                                                        borderRadius: '7px', border: '1px solid', userSelect: 'none',
                                                        // A pending change is outlined in amber, so it's obvious what
                                                        // Save is about to commit.
                                                        borderColor: changed ? '#F59E0B' : (on ? PRIMARY_BORDER : '#EEF1F6'),
                                                        bgcolor: on ? PRIMARY_LIGHT : '#F8FAFC',
                                                        transition: 'background-color .15s, border-color .15s',
                                                        '&:hover': locked ? {} : { borderColor: changed ? '#D97706' : (on ? PRIMARY : '#D8DEE8') },
                                                    }}
                                                >
                                                    <Box sx={{ width: 38, height: 38, borderRadius: '7px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: on ? '#fff' : '#EEF1F6', border: on ? `1px solid ${PRIMARY_BORDER}` : '1px solid #E5E7EB' }}>
                                                        <Icon sx={{ fontSize: 20, color: on ? PRIMARY : '#94A3B8' }} />
                                                    </Box>
                                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: on ? '#0F172A' : '#475569' }} noWrap>{m.label}</Typography>
                                                        <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: changed ? '#B45309' : (on ? PRIMARY : '#94A3B8') }}>
                                                            {changed ? (on ? 'Will be enabled' : 'Will be removed') : (on ? 'Enabled' : 'No access')}
                                                        </Typography>
                                                    </Box>
                                                    {locked
                                                        ? <LockRoundedIcon sx={{ fontSize: 16, color: on ? PRIMARY : '#B4BBC6', mr: 0.5 }} />
                                                        : <Switch checked={on} onClick={(e) => e.stopPropagation()} onChange={toggle} size="small"
                                                            sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: PRIMARY }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: PRIMARY } }} />}
                                                </Box>
                                            </Grid>
                                        );
                                    })}
                                </Grid>
                            </Box>
                        );
                    })}
                </Stack>
            )}

            {/* Edit role dialog */}
            <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Edit Role</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>Update this role's name and description.</Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    <TextField label="Role name" size="small" fullWidth autoFocus value={editName}
                        onChange={(e) => setEditName(e.target.value)} error={!editName.trim()}
                        helperText={!editName.trim() ? 'Name is required.' : ' '} sx={{ mb: 1.5 }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && editName.trim()) saveEdit(); }} />
                    <TextField label="Description" size="small" fullWidth multiline minRows={2} value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)} placeholder="What can this role do?" />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setEditOpen(false)} sx={{ textTransform: 'none', fontWeight: 700, color: '#64748B', borderRadius: '7px' }}>Cancel</Button>
                    <Button onClick={saveEdit} disabled={!editName.trim()} sx={{ bgcolor: PRIMARY, color: '#fff', fontWeight: 700, borderRadius: '7px', textTransform: 'none', height: 40, px: 2.4, boxShadow: 'none', '&:hover': { bgcolor: '#6246E0', boxShadow: 'none' }, '&.Mui-disabled': { bgcolor: '#E2E8F0', color: '#94A3B8' } }}>Save Changes</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={Boolean(snack.msg)} autoHideDuration={2600} onClose={() => setSnack((s) => ({ ...s, msg: '' }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack((s) => ({ ...s, msg: '' }))} severity={snack.severity} variant="filled" sx={{ borderRadius: '7px' }}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
