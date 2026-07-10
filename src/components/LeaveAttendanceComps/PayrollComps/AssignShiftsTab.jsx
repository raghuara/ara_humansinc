import React, { useState, useMemo, useEffect } from 'react';
import {
    Box, Typography, TextField, InputAdornment, Avatar, IconButton, Button,
    Menu, MenuItem, Dialog, DialogContent, ToggleButtonGroup, ToggleButton,
    Tooltip, Chip, Divider, Checkbox, CircularProgress, ListItemIcon,
} from '@mui/material';
import axios from 'axios';
import SearchIcon from '@mui/icons-material/Search';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import GroupAddRoundedIcon from '@mui/icons-material/GroupAddRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PersonOffRoundedIcon from '@mui/icons-material/PersonOffRounded';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import ViewListRoundedIcon from '@mui/icons-material/ViewListRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import WorkOutlineRoundedIcon from '@mui/icons-material/WorkOutlineRounded';
import { GetStaffInformation } from '../../../Api/Api';

const TOKEN = '123';

const SHIFT_PALETTE = [
    { color: '#0891B2', soft: '#ECFEFF' },
    { color: '#2563EB', soft: '#F3F0FE' },
    { color: '#F59E0B', soft: '#E0F2FE' },
    { color: '#16A34A', soft: '#EFF5FF' },
    { color: '#E11D48', soft: '#FFF1F2' },
    { color: '#6246E0', soft: '#F3F0FE' },
    { color: '#DB2777', soft: '#FDF2F8' },
    { color: '#0D9488', soft: '#F0FDFA' },
];
const UNASSIGNED = { color: '#6B7280', soft: '#F3F4F6' };

const shiftPalette = (i) => SHIFT_PALETTE[i % SHIFT_PALETTE.length];

const initials = (name) =>
    String(name || '').trim().split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?';

const fmt12 = (t) => {
    if (!t) return '';
    const [h, m] = String(t).split(':').map(Number);
    if (Number.isNaN(h)) return t;
    const ap = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
};

const SAMPLE_STAFF = [
    { rollNumber: '110097', name: 'Karthik Verma', role: 'Maths Teacher', userType: 'Teacher' },
    { rollNumber: '246001', name: 'Swathi Verma', role: 'Science Teacher', userType: 'Teacher' },
    { rollNumber: '133975', name: 'Surya Singh', role: 'English Teacher', userType: 'Teacher' },
    { rollNumber: '919160', name: 'Divya Sharma', role: 'Admin Officer', userType: 'Admin' },
    { rollNumber: '926524', name: 'Karthik Raj', role: 'Sports Coach', userType: 'Staff' },
    { rollNumber: '946267', name: 'Aarav Gupta', role: 'Lab Assistant', userType: 'Staff' },
    { rollNumber: '914585', name: 'Lakshmi Iyer', role: 'Librarian', userType: 'Staff' },
    { rollNumber: '317635', name: 'Aarav Kapoor', role: 'Hindi Teacher', userType: 'Teacher' },
    { rollNumber: '842951', name: 'Aarav Rao', role: 'Accountant', userType: 'Admin' },
    { rollNumber: '561230', name: 'Meera Nair', role: 'Receptionist', userType: 'Staff' },
    { rollNumber: '778450', name: 'Rahul Menon', role: 'Computer Teacher', userType: 'Teacher' },
    { rollNumber: '390011', name: 'Pooja Desai', role: 'Counsellor', userType: 'Staff' },
    { rollNumber: '660234', name: 'Vikram Shetty', role: 'Security Head', userType: 'Staff' },
    { rollNumber: '205981', name: 'Anita George', role: 'Art Teacher', userType: 'Teacher' },
];

const normalizeStaff = (raw) => {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((s) => ({
            rollNumber: String(s.rollNumber ?? s.RollNumber ?? s.employeeId ?? s.staffId ?? s.id ?? '').trim(),
            name: s.name ?? s.staffName ?? s.employeeName ?? s.fullName ?? 'Unknown',
            role: s.subUserType ?? s.designation ?? s.role ?? s.department ?? s.userType ?? '',
            userType: s.userType ?? s.staffType ?? 'Staff',
            photo: s.photoPath ?? s.photo ?? s.imageUrl ?? '',
        }))
        .filter((s) => s.rollNumber);
};

export default function AssignShiftsTab({ shifts = [], academicYear, showSnack }) {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(false);
    const [assignments, setAssignments] = useState({});
    const [activeShift, setActiveShift] = useState(0);
    const [view, setView] = useState('grid');
    const [search, setSearch] = useState('');
    const [moveAnchor, setMoveAnchor] = useState(null);
    const [moveRoll, setMoveRoll] = useState(null);
    const [viewMember, setViewMember] = useState(null);
    const [assignOpen, setAssignOpen] = useState(false);
    const [assignSearch, setAssignSearch] = useState('');
    const [assignPicked, setAssignPicked] = useState([]);

    const hasShifts = shifts.length > 0;

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                const res = await axios.get(GetStaffInformation, { headers: { Authorization: `Bearer ${TOKEN}` } });
                const raw = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.staff || res.data?.result || []);
                const list = normalizeStaff(raw);
                if (alive) setStaff(list.length ? list : SAMPLE_STAFF);
            } catch {
                if (alive) setStaff(SAMPLE_STAFF);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, []);

    const shiftOf = (roll) => (assignments[roll] === undefined ? null : assignments[roll]);

    const counts = useMemo(() => {
        const c = shifts.map(() => 0);
        let un = 0;
        staff.forEach((s) => {
            const idx = shiftOf(s.rollNumber);
            if (idx == null || idx >= shifts.length) un += 1;
            else c[idx] += 1;
        });
        return { c, un };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [staff, assignments, shifts.length]);

    const membersIn = (tab) => {
        const q = search.trim().toLowerCase();
        return staff
            .filter((s) => {
                const idx = shiftOf(s.rollNumber);
                const inTab = tab === 'unassigned' ? (idx == null || idx >= shifts.length) : idx === tab;
                if (!inTab) return false;
                if (!q) return true;
                return s.name.toLowerCase().includes(q) || String(s.rollNumber).includes(q) || (s.role || '').toLowerCase().includes(q);
            });
    };

    const currentMembers = membersIn(activeShift);

    const moveMember = (roll, target) => {
        setMoveAnchor(null);
        setAssignments((prev) => {
            const next = { ...prev };
            if (target === 'unassigned') delete next[roll];
            else next[roll] = target;
            return next;
        });
    };

    const unassignedForAssign = useMemo(() => {
        const q = assignSearch.trim().toLowerCase();
        return staff.filter((s) => {
            const idx = shiftOf(s.rollNumber);
            const isUn = idx == null || idx >= shifts.length;
            if (!isUn) return false;
            if (!q) return true;
            return s.name.toLowerCase().includes(q) || String(s.rollNumber).includes(q);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [staff, assignments, assignSearch, shifts.length]);

    const confirmAssign = () => {
        if (typeof activeShift !== 'number') { setAssignOpen(false); return; }
        setAssignments((prev) => {
            const next = { ...prev };
            assignPicked.forEach((roll) => { next[roll] = activeShift; });
            return next;
        });
        setAssignOpen(false);
        setAssignPicked([]);
        setAssignSearch('');
        showSnack?.(`${assignPicked.length} staff assigned to ${shifts[activeShift]?.shiftName || 'shift'}`, true);
    };

    const accentOf = (tab) => (tab === 'unassigned' ? UNASSIGNED : shiftPalette(tab));
    const tabAccent = accentOf(activeShift);

    if (!hasShifts) {
        return (
            <Box sx={{ textAlign: 'center', py: 8, px: 3, border: '1px dashed #D1D5DB', borderRadius: '7px', bgcolor: '#FAFAFA' }}>
                <AccessTimeRoundedIcon sx={{ fontSize: 44, color: '#CBD5E1', mb: 1 }} />
                <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>No shifts created yet</Typography>
                <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.5 }}>
                    Add shifts in <strong>Policy Setup → Shift Timing &amp; Work Hours</strong> first, then assign staff to them here.
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            {/* Header — the page title lives in the standalone header; here we only
                surface the assignment progress widget on the right. */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1, borderRadius: '7px', border: '1px solid #E5E7EB', bgcolor: '#fff', minWidth: 190 }}>
                    <Box sx={{ position: 'relative', width: 38, height: 38, flexShrink: 0 }}>
                        <CircularProgress variant="determinate" value={100} size={38} thickness={4} sx={{ color: '#EEF0F3', position: 'absolute' }} />
                        <CircularProgress variant="determinate" value={staff.length ? Math.round(((staff.length - counts.un) / staff.length) * 100) : 0} size={38} thickness={4} sx={{ color: '#16A34A' }} />
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5 }}>ASSIGNED</Typography>
                        <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.1 }}>
                            {staff.length - counts.un}<Box component="span" sx={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}> / {staff.length}</Box>
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* Shift sub-tabs */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                {shifts.map((s, i) => {
                    const p = shiftPalette(i);
                    const active = activeShift === i;
                    return (
                        <Box
                            key={i}
                            onClick={() => setActiveShift(i)}
                            sx={{
                                display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer',
                                px: 1.6, py: 0.9, borderRadius: '7px',
                                border: `1.5px solid ${active ? p.color : '#E5E7EB'}`,
                                bgcolor: active ? p.soft : '#fff',
                                transition: '0.18s',
                                '&:hover': { borderColor: p.color },
                            }}
                        >
                            <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: p.color, flexShrink: 0 }} />
                            <Box>
                                <Typography sx={{ fontSize: 13, fontWeight: 700, color: active ? p.color : '#374151', lineHeight: 1.2 }}>
                                    {s.shiftName || `Shift ${i + 1}`}
                                </Typography>
                                <Typography sx={{ fontSize: 10, color: '#9CA3AF', lineHeight: 1.2 }}>
                                    {fmt12(s.startTime)} – {fmt12(s.endTime)}
                                </Typography>
                            </Box>
                            <Box sx={{ ml: 0.5, minWidth: 22, height: 20, px: 0.7, borderRadius: '7px', bgcolor: active ? p.color : '#EEF0F3', color: active ? '#fff' : '#6B7280', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {counts.c[i]}
                            </Box>
                        </Box>
                    );
                })}
                <Box
                    onClick={() => setActiveShift('unassigned')}
                    sx={{
                        display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer',
                        px: 1.6, py: 0.9, borderRadius: '7px',
                        border: `1.5px solid ${activeShift === 'unassigned' ? UNASSIGNED.color : '#E5E7EB'}`,
                        bgcolor: activeShift === 'unassigned' ? UNASSIGNED.soft : '#fff',
                        transition: '0.18s', '&:hover': { borderColor: UNASSIGNED.color },
                    }}
                >
                    <PersonOffRoundedIcon sx={{ fontSize: 16, color: UNASSIGNED.color }} />
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: activeShift === 'unassigned' ? UNASSIGNED.color : '#374151' }}>
                        Unassigned
                    </Typography>
                    <Box sx={{ ml: 0.2, minWidth: 22, height: 20, px: 0.7, borderRadius: '7px', bgcolor: counts.un > 0 ? '#FEE2E2' : '#EEF0F3', color: counts.un > 0 ? '#DC2626' : '#6B7280', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {counts.un}
                    </Box>
                </Box>
            </Box>

            {/* Toolbar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                <TextField
                    size="small"
                    placeholder="Search staff by name, ID or role…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ flex: 1, minWidth: 220, '& .MuiOutlinedInput-root': { borderRadius: '7px', height: 38, fontSize: 13, bgcolor: '#fff' } }}
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 19, color: '#9CA3AF' }} /></InputAdornment> }}
                />
                <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)}
                    sx={{ '& .MuiToggleButton-root': { px: 1, py: 0.4, borderColor: '#E5E7EB' }, '& .Mui-selected': { bgcolor: '#EEF2FF !important', color: '#4F46E5 !important' } }}>
                    <ToggleButton value="grid"><GridViewRoundedIcon sx={{ fontSize: 18 }} /></ToggleButton>
                    <ToggleButton value="list"><ViewListRoundedIcon sx={{ fontSize: 18 }} /></ToggleButton>
                </ToggleButtonGroup>
                {typeof activeShift === 'number' && (
                    <Button
                        variant="contained" disableElevation startIcon={<GroupAddRoundedIcon />}
                        onClick={() => { setAssignPicked([]); setAssignSearch(''); setAssignOpen(true); }}
                        sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, borderRadius: '7px', height: 38, bgcolor: tabAccent.color, color: '#fff', '& .MuiButton-startIcon': { color: '#fff' }, '&:hover': { bgcolor: tabAccent.color, color: '#fff', filter: 'brightness(0.92)' } }}
                    >
                        Assign Staff
                    </Button>
                )}
            </Box>

            {/* Members */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress size={28} sx={{ color: tabAccent.color }} /></Box>
            ) : currentMembers.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6, border: '1px dashed #E5E7EB', borderRadius: '7px', bgcolor: '#FAFAFA' }}>
                    <Typography sx={{ fontSize: 13, color: '#9CA3AF', fontWeight: 600 }}>
                        {activeShift === 'unassigned' ? 'Everyone is assigned to a shift 🎉' : 'No staff in this shift yet'}
                    </Typography>
                    {typeof activeShift === 'number' && (
                        <Button size="small" startIcon={<GroupAddRoundedIcon />} onClick={() => setAssignOpen(true)}
                            sx={{ mt: 1, textTransform: 'none', fontWeight: 700, color: tabAccent.color }}>
                            Assign staff to this shift
                        </Button>
                    )}
                </Box>
            ) : view === 'grid' ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                    {currentMembers.map((m) => {
                        const idx = shiftOf(m.rollNumber);
                        const p = idx == null ? UNASSIGNED : shiftPalette(idx);
                        return (
                            <Box key={m.rollNumber} sx={{ border: '1px solid #E5E7EB', borderRadius: '7px', bgcolor: '#fff', p: 1.5, transition: '0.18s', '&:hover': { boxShadow: '0 4px 14px rgba(0,0,0,0.08)', borderColor: p.color } }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                    <Avatar src={m.photo || undefined} sx={{ width: 44, height: 44, bgcolor: p.soft, color: p.color, fontWeight: 700, fontSize: 15, border: `2px solid ${p.color}30` }}>
                                        {initials(m.name)}
                                    </Avatar>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</Typography>
                                        <Typography sx={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.rollNumber}{m.role ? ` · ${m.role}` : ''}</Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.2 }}>
                                    <Chip size="small" label={idx == null ? 'Unassigned' : (shifts[idx]?.shiftName || 'Shift')} sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: p.soft, color: p.color }} />
                                    <Box sx={{ display: 'flex', gap: 0.3 }}>
                                        <Tooltip title="View" arrow>
                                            <IconButton size="small" onClick={() => setViewMember(m)} sx={{ width: 28, height: 28 }}>
                                                <VisibilityRoundedIcon sx={{ fontSize: 16, color: '#6B7280' }} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Move to another shift" arrow>
                                            <IconButton size="small" onClick={(e) => { setMoveRoll(m.rollNumber); setMoveAnchor(e.currentTarget); }} sx={{ width: 28, height: 28 }}>
                                                <SwapHorizRoundedIcon sx={{ fontSize: 17, color: tabAccent.color }} />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
            ) : (
                <Box sx={{ border: '1px solid #E5E7EB', borderRadius: '7px', overflow: 'hidden' }}>
                    {currentMembers.map((m, i) => {
                        const idx = shiftOf(m.rollNumber);
                        const p = idx == null ? UNASSIGNED : shiftPalette(idx);
                        return (
                            <Box key={m.rollNumber} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, borderTop: i === 0 ? 'none' : '1px solid #F1F1F4', '&:hover': { bgcolor: '#FAFAFA' } }}>
                                <Avatar src={m.photo || undefined} sx={{ width: 36, height: 36, bgcolor: p.soft, color: p.color, fontWeight: 700, fontSize: 13 }}>{initials(m.name)}</Avatar>
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</Typography>
                                    <Typography sx={{ fontSize: 11, color: '#9CA3AF' }}>{m.rollNumber}{m.role ? ` · ${m.role}` : ''}</Typography>
                                </Box>
                                <Chip size="small" label={idx == null ? 'Unassigned' : (shifts[idx]?.shiftName || 'Shift')} sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: p.soft, color: p.color }} />
                                <Tooltip title="View" arrow><IconButton size="small" onClick={() => setViewMember(m)}><VisibilityRoundedIcon sx={{ fontSize: 17, color: '#6B7280' }} /></IconButton></Tooltip>
                                <Tooltip title="Move" arrow><IconButton size="small" onClick={(e) => { setMoveRoll(m.rollNumber); setMoveAnchor(e.currentTarget); }}><SwapHorizRoundedIcon sx={{ fontSize: 18, color: tabAccent.color }} /></IconButton></Tooltip>
                            </Box>
                        );
                    })}
                </Box>
            )}

            {/* Move menu */}
            <Menu anchorEl={moveAnchor} open={Boolean(moveAnchor)} onClose={() => setMoveAnchor(null)}
                slotProps={{ paper: { sx: { borderRadius: '7px', minWidth: 190 } } }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#9CA3AF', px: 1.5, py: 0.7, letterSpacing: 0.4 }}>MOVE TO</Typography>
                {shifts.map((s, i) => {
                    const p = shiftPalette(i);
                    const current = shiftOf(moveRoll) === i;
                    return (
                        <MenuItem key={i} disabled={current} onClick={() => moveMember(moveRoll, i)} sx={{ fontSize: 13, gap: 1 }}>
                            <ListItemIcon sx={{ minWidth: 0 }}><Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: p.color }} /></ListItemIcon>
                            {s.shiftName || `Shift ${i + 1}`}
                            {current && <CheckRoundedIcon sx={{ fontSize: 16, color: p.color, ml: 'auto' }} />}
                        </MenuItem>
                    );
                })}
                <Divider sx={{ my: 0.5 }} />
                <MenuItem onClick={() => moveMember(moveRoll, 'unassigned')} sx={{ fontSize: 13, gap: 1, color: '#DC2626' }}>
                    <ListItemIcon sx={{ minWidth: 0 }}><PersonOffRoundedIcon sx={{ fontSize: 17, color: '#DC2626' }} /></ListItemIcon>
                    Remove from shift
                </MenuItem>
            </Menu>

            {/* View member dialog */}
            <Dialog open={Boolean(viewMember)} onClose={() => setViewMember(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
                {viewMember && (() => {
                    const idx = shiftOf(viewMember.rollNumber);
                    const p = idx == null ? UNASSIGNED : shiftPalette(idx);
                    const sh = idx == null ? null : shifts[idx];
                    return (
                        <>
                            <Box sx={{ p: 2.5, textAlign: 'center', bgcolor: p.soft, position: 'relative' }}>
                                <IconButton size="small" onClick={() => setViewMember(null)} sx={{ position: 'absolute', top: 8, right: 8 }}><CloseRoundedIcon sx={{ fontSize: 18 }} /></IconButton>
                                <Avatar src={viewMember.photo || undefined} sx={{ width: 64, height: 64, mx: 'auto', bgcolor: '#fff', color: p.color, fontWeight: 800, fontSize: 22, border: `3px solid ${p.color}40` }}>{initials(viewMember.name)}</Avatar>
                                <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a', mt: 1 }}>{viewMember.name}</Typography>
                                <Chip size="small" label={idx == null ? 'Unassigned' : (sh?.shiftName || 'Shift')} sx={{ mt: 0.5, height: 22, fontSize: 11, fontWeight: 700, bgcolor: '#fff', color: p.color }} />
                            </Box>
                            <DialogContent sx={{ pt: 2 }}>
                                {[
                                    { icon: <BadgeRoundedIcon sx={{ fontSize: 18, color: '#9CA3AF' }} />, label: 'Staff ID', value: viewMember.rollNumber },
                                    { icon: <WorkOutlineRoundedIcon sx={{ fontSize: 18, color: '#9CA3AF' }} />, label: 'Role', value: viewMember.role || viewMember.userType || '—' },
                                    { icon: <AccessTimeRoundedIcon sx={{ fontSize: 18, color: '#9CA3AF' }} />, label: 'Shift Timing', value: sh ? `${fmt12(sh.startTime)} – ${fmt12(sh.endTime)}` : 'Not assigned' },
                                ].map((row, i) => (
                                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderBottom: i < 2 ? '1px solid #F1F1F4' : 'none' }}>
                                        {row.icon}
                                        <Typography sx={{ fontSize: 12, color: '#9CA3AF', width: 90 }}>{row.label}</Typography>
                                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{row.value}</Typography>
                                    </Box>
                                ))}
                                <Button fullWidth startIcon={<SwapHorizRoundedIcon />} onClick={(e) => { setMoveRoll(viewMember.rollNumber); setMoveAnchor(e.currentTarget); }}
                                    sx={{ mt: 2, textTransform: 'none', fontWeight: 700, borderRadius: '7px', border: `1.5px solid ${p.color}`, color: p.color }}>
                                    Move to another shift
                                </Button>
                            </DialogContent>
                        </>
                    );
                })()}
            </Dialog>

            {/* Assign dialog */}
            <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, bgcolor: tabAccent.soft }}>
                    <Box>
                        <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a' }}>Assign Staff</Typography>
                        <Typography sx={{ fontSize: 11, color: '#6B7280' }}>to {typeof activeShift === 'number' ? (shifts[activeShift]?.shiftName || 'shift') : 'shift'}</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => setAssignOpen(false)}><CloseRoundedIcon sx={{ fontSize: 18 }} /></IconButton>
                </Box>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField fullWidth size="small" placeholder="Search unassigned staff…" value={assignSearch} onChange={(e) => setAssignSearch(e.target.value)}
                        sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: '7px', height: 38, fontSize: 13 } }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#9CA3AF' }} /></InputAdornment> }} />
                    <Box sx={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #EEF0F3', borderRadius: '7px' }}>
                        {unassignedForAssign.length === 0 ? (
                            <Typography sx={{ fontSize: 12.5, color: '#9CA3AF', textAlign: 'center', py: 3 }}>No unassigned staff</Typography>
                        ) : unassignedForAssign.map((m) => {
                            const picked = assignPicked.includes(m.rollNumber);
                            return (
                                <Box key={m.rollNumber} onClick={() => setAssignPicked((prev) => picked ? prev.filter((r) => r !== m.rollNumber) : [...prev, m.rollNumber])}
                                    sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.7, cursor: 'pointer', bgcolor: picked ? tabAccent.soft : 'transparent', '&:hover': { bgcolor: picked ? tabAccent.soft : '#FAFAFA' } }}>
                                    <Checkbox size="small" checked={picked} sx={{ p: 0.5, color: '#CBD5E1', '&.Mui-checked': { color: tabAccent.color } }} />
                                    <Avatar src={m.photo || undefined} sx={{ width: 30, height: 30, fontSize: 12, fontWeight: 700, bgcolor: '#F3F4F6', color: '#6B7280' }}>{initials(m.name)}</Avatar>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</Typography>
                                        <Typography sx={{ fontSize: 10.5, color: '#9CA3AF' }}>{m.rollNumber}{m.role ? ` · ${m.role}` : ''}</Typography>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                </DialogContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 1.5, borderTop: '1px solid #eee' }}>
                    <Typography sx={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>{assignPicked.length} selected</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button onClick={() => setAssignOpen(false)} sx={{ textTransform: 'none', borderRadius: '7px', color: '#374151', border: '1px solid #D1D5DB', fontSize: 12.5 }}>Cancel</Button>
                        <Button onClick={confirmAssign} disabled={assignPicked.length === 0} variant="contained" disableElevation
                            sx={{ textTransform: 'none', borderRadius: '7px', fontWeight: 700, fontSize: 12.5, bgcolor: tabAccent.color, color: '#fff', '&.Mui-disabled': { color: 'rgba(255,255,255,0.7)' }, '&:hover': { bgcolor: tabAccent.color, color: '#fff', filter: 'brightness(0.92)' } }}>
                            Assign {assignPicked.length || ''}
                        </Button>
                    </Box>
                </Box>
            </Dialog>
        </Box>
    );
}
