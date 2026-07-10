import React, { useState } from 'react';
import {
    Box, Typography, Button, Stack, Chip, IconButton, Switch, Grid, Snackbar, Alert, LinearProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tooltip,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import RemoveDoneRoundedIcon from '@mui/icons-material/RemoveDoneRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectRoleById, toggleAccess, setRoleAccess, renameRole } from '../redux/slices/rolesSlice';
import { MODULE_GROUPS, TOTAL_MODULES, countEnabled } from '../data/accessModules';

const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_BORDER = '#C9BEFB';
const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
const tonalBtn = { bgcolor: PRIMARY_LIGHT, color: PRIMARY, border: `1px solid ${PRIMARY_BORDER}`, fontWeight: 700, borderRadius: '7px', boxShadow: 'none', textTransform: 'none', '&:hover': { bgcolor: '#E7DFFC' } };
const initials = (s = '') => s.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export default function RoleAccessPage() {
    const navigate = useNavigate();
    const { roleId } = useParams();
    const dispatch = useDispatch();
    const role = useSelector(selectRoleById(roleId));
    const [snack, setSnack] = useState('');
    const [editOpen, setEditOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');

    const openEdit = () => { setEditName(role.name); setEditDesc(role.description || ''); setEditOpen(true); };
    const saveEdit = () => {
        if (!editName.trim()) return;
        dispatch(renameRole({ roleId, name: editName, description: editDesc }));
        setEditOpen(false);
        setSnack('Role details updated');
    };

    if (!role) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Role not found.</Typography>
                <Button onClick={() => navigate('/dashboard/roles')} startIcon={<ArrowBackRoundedIcon />} sx={{ ...tonalBtn, mt: 2, height: 40, px: 2 }}>Back to Roles</Button>
            </Box>
        );
    }

    const enabled = countEnabled(role.access);
    const pct = Math.round((enabled / TOTAL_MODULES) * 100);
    const locked = role.system; // predefined roles are read-only

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
                        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                            <Typography sx={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>{role.name}</Typography>
                            {!locked && (
                                <Tooltip arrow title="Edit role name">
                                    <IconButton onClick={openEdit} size="small" sx={{ color: '#94A3B8', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}>
                                        <EditRoundedIcon sx={{ fontSize: 17 }} />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Stack>
                        <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>{locked ? 'Predefined access — view only' : 'Toggle which modules this role can access'}</Typography>
                    </Box>
                </Stack>
                <Stack direction="row" spacing={1}>
                    <Button onClick={() => navigate(`/dashboard/roles/${roleId}/users`)} startIcon={<PeopleAltRoundedIcon sx={{ fontSize: 18 }} />} sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, color: '#334155', bgcolor: '#F1F5F9', borderRadius: '7px', height: 42, px: 2, '&:hover': { bgcolor: '#E2E8F0' } }}>View Users</Button>
                    {locked ? (
                        <Chip icon={<LockRoundedIcon sx={{ fontSize: '16px !important' }} />} label="Locked" sx={{ height: 42, borderRadius: '7px', px: 0.5, fontSize: 12.5, fontWeight: 700, bgcolor: '#EEF2FF', color: '#4F46E5', border: '1px solid #DDE0FB', '& .MuiChip-icon': { color: '#4F46E5' } }} />
                    ) : (
                        <>
                            <Button onClick={() => { dispatch(setRoleAccess({ roleId, value: true })); setSnack('All modules enabled'); }} startIcon={<DoneAllRoundedIcon sx={{ fontSize: 17 }} />} sx={{ ...tonalBtn, height: 42, px: 2 }}>Enable All</Button>
                            <Button onClick={() => { dispatch(setRoleAccess({ roleId, value: false })); setSnack('All modules disabled'); }} startIcon={<RemoveDoneRoundedIcon sx={{ fontSize: 17 }} />} sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, color: '#B91C1C', bgcolor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '7px', height: 42, px: 2, '&:hover': { bgcolor: '#FEE2E2' } }}>Disable All</Button>
                        </>
                    )}
                </Stack>
            </Box>

            {/* Locked banner for predefined roles */}
            {locked && (
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
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: PRIMARY }}>{enabled} / {TOTAL_MODULES} modules&nbsp;·&nbsp;{pct}%</Typography>
                </Stack>
                <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 5, bgcolor: '#EEF1F6', '& .MuiLinearProgress-bar': { borderRadius: 5, background: `linear-gradient(90deg, ${role.color}, ${PRIMARY})` } }} />
            </Box>

            {/* Module groups */}
            <Stack spacing={1.5}>
                {MODULE_GROUPS.map((g) => {
                    const groupOn = g.items.filter((i) => role.access[i.key]).length;
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
                                    const on = !!role.access[m.key];
                                    const Icon = m.icon;
                                    return (
                                        <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={m.key}>
                                            <Box
                                                onClick={locked ? undefined : () => dispatch(toggleAccess({ roleId, key: m.key }))}
                                                sx={{
                                                    display: 'flex', alignItems: 'center', gap: 1.4, p: 1.6,
                                                    cursor: locked ? 'default' : 'pointer',
                                                    opacity: locked && !on ? 0.7 : 1,
                                                    borderRadius: '7px', border: '1px solid', userSelect: 'none',
                                                    borderColor: on ? PRIMARY_BORDER : '#EEF1F6',
                                                    bgcolor: on ? PRIMARY_LIGHT : '#F8FAFC',
                                                    transition: 'background-color .15s, border-color .15s',
                                                    '&:hover': locked ? {} : { borderColor: on ? PRIMARY : '#D8DEE8' },
                                                }}
                                            >
                                                <Box sx={{ width: 38, height: 38, borderRadius: '7px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: on ? '#fff' : '#EEF1F6', border: on ? `1px solid ${PRIMARY_BORDER}` : '1px solid #E5E7EB' }}>
                                                    <Icon sx={{ fontSize: 20, color: on ? PRIMARY : '#94A3B8' }} />
                                                </Box>
                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: on ? '#0F172A' : '#475569' }} noWrap>{m.label}</Typography>
                                                    <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: on ? PRIMARY : '#94A3B8' }}>{on ? 'Enabled' : 'No access'}</Typography>
                                                </Box>
                                                {locked
                                                    ? <LockRoundedIcon sx={{ fontSize: 16, color: on ? PRIMARY : '#B4BBC6', mr: 0.5 }} />
                                                    : <Switch checked={on} onClick={(e) => e.stopPropagation()} onChange={() => dispatch(toggleAccess({ roleId, key: m.key }))} size="small"
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

            <Snackbar open={Boolean(snack)} autoHideDuration={2000} onClose={() => setSnack('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack('')} severity="success" variant="filled" sx={{ borderRadius: '7px' }}>{snack}</Alert>
            </Snackbar>
        </Box>
    );
}
