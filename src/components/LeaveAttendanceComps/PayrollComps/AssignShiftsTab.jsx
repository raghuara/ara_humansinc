import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Box, Typography, TextField, InputAdornment, Avatar, IconButton, Button,
    Dialog, DialogContent, ToggleButtonGroup, ToggleButton, Menu, MenuItem,
    Tooltip, Chip, CircularProgress, Skeleton, Checkbox, ListItemIcon, Divider, Stack,
} from '@mui/material';
import http from '../../../Api/http';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import GroupAddRoundedIcon from '@mui/icons-material/GroupAddRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PersonOffRoundedIcon from '@mui/icons-material/PersonOffRounded';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import ViewListRoundedIcon from '@mui/icons-material/ViewListRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import WorkOutlineRoundedIcon from '@mui/icons-material/WorkOutlineRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import {
    GetShiftAssignedEmployees, GetUnassignedEmployees,
    AssignEmployeeToShift, UpdateAssignedEmployee, UnassignEmployee,
} from '../../../Api/Api';
import { card, StatCards, Panel } from '../../uiKit';
import { PRIMARY, PRIMARY_LIGHT } from '../../../theme';

const SHIFT_PALETTE = [
    { color: '#0891B2', soft: '#ECFEFF' },
    { color: '#2563EB', soft: '#F3F0FE' },
    { color: '#F59E0B', soft: '#FFF7ED' },
    { color: '#16A34A', soft: '#DCFCE7' },
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

// One row from GetShiftAssignedEmployees / GetUnassignedEmployees. The employee
// is identified by `employeeCode` (EMP-1) — there is no roll number here.
const normalizeMember = (e = {}) => ({
    employeeCode: String(e.employeeCode ?? '').trim(),
    name: e.name || 'Unknown',
    role: e.role || '',
    photo: e.profilePath || '',
    shiftId: e.shiftId ?? null,
    shiftName: e.shiftName || '',
    assignedOn: e.assignedOn || '',
});

// A shift with nobody in it is an empty list, not a failure — the API reports it
// as a 404 / `error: true` ("No employees currently assigned to shift 'Night'").
// Treating that as an error would blow up the whole load: one empty shift used to
// take every other shift's data down with it.
const fetchMembers = async (url, params) => {
    try {
        const { data } = await http.get(url, { params });
        if (data?.error) return [];
        return Array.isArray(data?.data) ? data.data.map(normalizeMember) : [];
    } catch (err) {
        if (err?.response?.status === 404) return [];
        throw err;   // anything else is a real problem worth surfacing
    }
};

export default function AssignShiftsTab({ shifts = [], financialYear, showSnack }) {
    // Server state, keyed by shift id. Assignments are NOT held locally — what the
    // server says a shift contains is the only thing this screen shows.
    const [assignedByShift, setAssignedByShift] = useState({});   // { [shiftId]: member[] }
    const [unassigned, setUnassigned] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState('');

    const [activeShift, setActiveShift] = useState(0);
    const [view, setView] = useState('grid');
    const [search, setSearch] = useState('');
    const [viewMember, setViewMember] = useState(null);

    const [saving, setSaving] = useState(false);
    const [moveAnchor, setMoveAnchor] = useState(null);
    const [moveTarget, setMoveTarget] = useState(null);      // the member being moved
    const [assignOpen, setAssignOpen] = useState(false);
    const [assignSearch, setAssignSearch] = useState('');
    const [assignPicked, setAssignPicked] = useState([]);    // employeeCode[]

    // Bulk selection, scoped to the tab you're looking at — selecting people in
    // one shift and then switching tabs would make "move the selected" ambiguous.
    const [selected, setSelected] = useState([]);            // employeeCode[]
    const [bulkAnchor, setBulkAnchor] = useState(null);

    const hasShifts = shifts.length > 0;

    // Only shifts the server knows about can be queried. A shift added in Policy
    // Setup but not yet saved has no id, so it has no assignments to fetch.
    const savedShifts = useMemo(() => shifts.filter((s) => s.id != null), [shifts]);

    const load = useCallback(async () => {
        if (!financialYear || savedShifts.length === 0) return;
        setLoading(true);
        setLoadError('');
        try {
            const [assignedLists, unassignedList] = await Promise.all([
                Promise.all(savedShifts.map((s) =>
                    fetchMembers(GetShiftAssignedEmployees, { financialYear, shiftId: s.id })
                )),
                fetchMembers(GetUnassignedEmployees, { financialYear }),
            ]);

            const map = {};
            savedShifts.forEach((s, i) => { map[s.id] = assignedLists[i]; });
            setAssignedByShift(map);
            setUnassigned(unassignedList);
        } catch (err) {
            // Only genuine failures land here — an empty shift is handled in
            // fetchMembers and is not an error.
            console.error('Shift assignment fetch failed:', err);
            setLoadError(err?.response?.data?.message || 'Could not load shift assignments.');
            setAssignedByShift({});
            setUnassigned([]);
        } finally {
            setLoading(false);
        }
    }, [financialYear, savedShifts]);

    useEffect(() => { load(); }, [load]);

    const membersOf = (tab) => {
        if (tab === 'unassigned') return unassigned;
        const id = shifts[tab]?.id;
        return id == null ? [] : (assignedByShift[id] || []);
    };

    const counts = useMemo(() => ({
        c: shifts.map((s) => (s.id == null ? 0 : (assignedByShift[s.id] || []).length)),
        un: unassigned.length,
    }), [shifts, assignedByShift, unassigned]);

    const totalAssigned = counts.c.reduce((a, b) => a + b, 0);
    const totalStaff = totalAssigned + counts.un;

    const currentMembers = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = membersOf(activeShift);
        if (!q) return list;
        return list.filter((m) =>
            m.name.toLowerCase().includes(q)
            || m.employeeCode.toLowerCase().includes(q)
            || (m.role || '').toLowerCase().includes(q)
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, activeShift, assignedByShift, unassigned, shifts]);

    const accentOf = (tab) => (tab === 'unassigned' ? UNASSIGNED : shiftPalette(tab));
    const tabAccent = accentOf(activeShift);

    // Two different endpoints, because they are two different operations:
    //   • assigning staff who have no shift yet  → POST, in bulk
    //   • moving someone who already has one     → PUT, one at a time
    // Both re-read afterwards: the server owns who sits in which shift, and a
    // move has to leave the old shift as well as join the new one.
    const runAssignment = async (request, successMsg) => {
        if (!financialYear) return false;
        setSaving(true);
        try {
            const { data: body } = await request();
            if (body?.error) throw new Error(body.message || 'Could not save the shift assignment.');
            await load();
            showSnack?.(body?.message || successMsg, true);
            return true;
        } catch (err) {
            console.error('Shift assignment failed:', err);
            showSnack?.(err?.response?.data?.message || 'Could not save the shift assignment. Please try again.', false);
            return false;
        } finally {
            setSaving(false);
        }
    };

    const confirmAssign = async () => {
        const shift = shifts[activeShift];
        if (!shift?.id || assignPicked.length === 0) return;
        const ok = await runAssignment(
            () => http.post(AssignEmployeeToShift, {
                financialYear,
                shiftId: shift.id,
                employeeCodes: assignPicked,
            }),
            `${assignPicked.length} staff assigned to ${shift.shiftName || 'shift'}`,
        );
        if (ok) {
            setAssignOpen(false);
            setAssignPicked([]);
            setAssignSearch('');
        }
    };

    const confirmMove = async (targetIndex) => {
        setMoveAnchor(null);
        const target = shifts[targetIndex];
        const member = moveTarget;
        if (!target?.id || !member) return;

        // Someone with no shift yet is an assignment, not a move — UpdateAssignedEmployee
        // has nothing to update for them.
        const isFirstAssignment = member.shiftId == null;

        await runAssignment(
            () => (isFirstAssignment
                ? http.post(AssignEmployeeToShift, {
                    financialYear,
                    shiftId: target.id,
                    employeeCodes: [member.employeeCode],
                })
                : http.put(UpdateAssignedEmployee, {
                    financialYear,
                    employeeCode: member.employeeCode,
                    newShiftId: target.id,
                })),
            isFirstAssignment
                ? `${member.name} assigned to ${target.shiftName || 'shift'}`
                : `${member.name} moved to ${target.shiftName || 'shift'}`,
        );
        setMoveTarget(null);
        setViewMember(null);
    };

    const confirmUnassign = async () => {
        setMoveAnchor(null);
        const member = moveTarget;
        if (!member || member.shiftId == null) return;

        await runAssignment(
            () => http.delete(UnassignEmployee, {
                params: { financialYear, employeeCode: member.employeeCode },
            }),
            `${member.name} removed from ${member.shiftName || 'their shift'}`,
        );
        setMoveTarget(null);
        setViewMember(null);
    };

    // ── Bulk selection ──────────────────────────────────────────────────────
    const toggleOne = (code) => setSelected((prev) =>
        prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );

    const visibleCodes = currentMembers.map((m) => m.employeeCode);
    const allVisibleSelected = visibleCodes.length > 0 && visibleCodes.every((c) => selected.includes(c));
    const someVisibleSelected = selected.length > 0 && !allVisibleSelected;

    const toggleAllVisible = () => setSelected(allVisibleSelected ? [] : visibleCodes);

    // Selection only means something within one tab, so drop it when the tab or
    // the year changes rather than carrying stale codes into a different shift.
    useEffect(() => { setSelected([]); }, [activeShift, financialYear]);

    // The API has a bulk endpoint for *assigning* but only a single-employee one
    // for *moving*, so a bulk move fans out into one PUT per employee. They all
    // run together and the list is re-read once, at the end.
    const bulkMove = async (targetIndex) => {
        setBulkAnchor(null);
        const target = shifts[targetIndex];
        if (!target?.id || selected.length === 0) return;

        const fromUnassigned = activeShift === 'unassigned';
        await runAssignment(
            () => (fromUnassigned
                ? http.post(AssignEmployeeToShift, {
                    financialYear,
                    shiftId: target.id,
                    employeeCodes: selected,
                })
                : Promise.all(selected.map((employeeCode) =>
                    http.put(UpdateAssignedEmployee, { financialYear, employeeCode, newShiftId: target.id })
                )).then(() => ({ data: {} }))),
            `${selected.length} staff ${fromUnassigned ? 'assigned to' : 'moved to'} ${target.shiftName || 'shift'}`,
        );
        setSelected([]);
    };

    const bulkUnassign = async () => {
        if (selected.length === 0 || activeShift === 'unassigned') return;
        await runAssignment(
            () => Promise.all(selected.map((employeeCode) =>
                http.delete(UnassignEmployee, { params: { financialYear, employeeCode } })
            )).then(() => ({ data: {} })),
            `${selected.length} staff removed from ${shifts[activeShift]?.shiftName || 'their shift'}`,
        );
        setSelected([]);
    };

    // Only unassigned staff can be picked in the Assign dialog — moving someone
    // who already has a shift is the Move action, not a second assignment.
    const assignCandidates = useMemo(() => {
        const q = assignSearch.trim().toLowerCase();
        if (!q) return unassigned;
        return unassigned.filter((m) =>
            m.name.toLowerCase().includes(q) || m.employeeCode.toLowerCase().includes(q)
        );
    }, [unassigned, assignSearch]);

    if (!hasShifts) {
        return (
            <Box sx={{ ...card, textAlign: 'center', py: 8, px: 3 }}>
                <Box sx={{ width: 56, height: 56, borderRadius: '14px', bgcolor: PRIMARY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
                    <AccessTimeRoundedIcon sx={{ fontSize: 28, color: PRIMARY }} />
                </Box>
                <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>No shifts created yet</Typography>
                <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.5, maxWidth: 420, mx: 'auto', lineHeight: 1.6 }}>
                    Add shifts in <strong>Policy Setup → Shift Timing &amp; Work Hours</strong> first, then assign staff to them here.
                </Typography>
            </Box>
        );
    }

    const unsavedShiftCount = shifts.length - savedShifts.length;
    const assignedPct = totalStaff ? Math.round((totalAssigned / totalStaff) * 100) : 0;

    const STATS = [
        { label: 'Total Staff', value: totalStaff, sub: 'Across all shifts', icon: GroupsRoundedIcon, color: PRIMARY, bg: PRIMARY_LIGHT },
        { label: 'Assigned', value: totalAssigned, sub: `${assignedPct}% placed`, icon: EventAvailableRoundedIcon, color: '#16A34A', bg: '#DCFCE7' },
        { label: 'Unassigned', value: counts.un, sub: counts.un ? 'Still need a shift' : 'Everyone placed', icon: PersonOffRoundedIcon, color: counts.un ? '#E11D48' : '#16A34A', bg: counts.un ? '#FEE2E2' : '#DCFCE7' },
        { label: 'Shifts', value: savedShifts.length, sub: unsavedShiftCount ? `${unsavedShiftCount} unsaved` : 'All saved', icon: AccessTimeRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE' },
    ];

    const panelTitle = activeShift === 'unassigned'
        ? 'Unassigned Staff'
        : (shifts[activeShift]?.shiftName || `Shift ${Number(activeShift) + 1}`);

    return (
        <Box>
            {/* Overview */}
            <StatCards items={STATS} />

            {/* Shifts that exist only in the unsaved form have no id, so the server
                has no assignments for them. Say so rather than showing an empty tab. */}
            {unsavedShiftCount > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2, p: 1.5, mb: 1.5, borderRadius: '9px', bgcolor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                    <InfoOutlinedIcon sx={{ fontSize: 17, color: '#B45309', mt: 0.2, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 12, color: '#78350F', lineHeight: 1.6 }}>
                        {unsavedShiftCount} shift{unsavedShiftCount > 1 ? 's are' : ' is'} not saved yet — save Policy Setup first, then staff can be assigned to {unsavedShiftCount > 1 ? 'them' : 'it'}.
                    </Typography>
                </Box>
            )}

            {/* Shift selector */}
            <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 1.2, mb: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flex: 1 }}>
                    {shifts.map((s, i) => {
                        const p = shiftPalette(i);
                        const active = activeShift === i;
                        return (
                            <Box
                                key={s.id ?? `new-${i}`}
                                onClick={() => setActiveShift(i)}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 1.2, cursor: 'pointer',
                                    px: 1.5, py: 1.05, borderRadius: '11px',
                                    border: `1.5px solid ${active ? p.color : '#ECEEF3'}`,
                                    // A soft tint of the shift colour when selected — light, not loud.
                                    background: active ? `linear-gradient(135deg, ${p.soft} 0%, #ffffff 130%)` : '#fff',
                                    boxShadow: active ? `0 4px 12px -8px ${p.color}66` : '0 1px 2px rgba(16,24,40,0.03)',
                                    opacity: s.id == null ? 0.55 : 1,
                                    transition: '0.18s',
                                    '&:hover': { borderColor: active ? `${p.color}88` : '#DDE1EA', bgcolor: active ? undefined : '#FBFBFD', transform: 'translateY(-1px)' },
                                }}
                            >
                                <Box sx={{
                                    width: 11, height: 11, borderRadius: '50%', flexShrink: 0,
                                    bgcolor: p.color,
                                    boxShadow: active ? `0 0 0 4px ${p.color}22` : `0 0 0 3px ${p.color}12`,
                                }} />
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: active ? p.color : '#334155', lineHeight: 1.25 }}>
                                        {s.shiftName || `Shift ${i + 1}`}
                                    </Typography>
                                    <Typography sx={{ fontSize: 10.5, color: active ? `${p.color}B0` : '#9CA3AF', lineHeight: 1.3 }}>
                                        {fmt12(s.startTime)} – {fmt12(s.endTime)}
                                    </Typography>
                                </Box>
                                <Box sx={{
                                    ml: 0.3, minWidth: 24, height: 22, px: 0.8, borderRadius: '7px',
                                    bgcolor: active ? '#fff' : '#F3F5F9',
                                    color: active ? p.color : '#7A8494',
                                    border: active ? `1px solid ${p.color}33` : '1px solid transparent',
                                    fontSize: 11.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {loading ? '·' : counts.c[i]}
                                </Box>
                            </Box>
                        );
                    })}
                    {(() => {
                        const active = activeShift === 'unassigned';
                        const has = counts.un > 0;
                        return (
                            <Box
                                onClick={() => setActiveShift('unassigned')}
                                sx={{
                                    display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer',
                                    px: 1.5, py: 1.05, borderRadius: '11px',
                                    border: `1.5px solid ${active ? '#FB7185' : '#ECEEF3'}`,
                                    background: active ? 'linear-gradient(135deg, #FFF1F2 0%, #ffffff 130%)' : '#fff',
                                    boxShadow: active ? '0 4px 12px -8px #E11D4866' : '0 1px 2px rgba(16,24,40,0.03)',
                                    transition: '0.18s', '&:hover': { borderColor: active ? '#F9A8B4' : '#DDE1EA', bgcolor: active ? undefined : '#FBFBFD', transform: 'translateY(-1px)' },
                                }}
                            >
                                <PersonOffRoundedIcon sx={{ fontSize: 18, color: active ? '#E11D48' : '#9CA3AF' }} />
                                <Typography sx={{ fontSize: 13, fontWeight: 700, color: active ? '#BE123C' : '#334155' }}>
                                    Unassigned
                                </Typography>
                                <Box sx={{
                                    ml: 0.2, minWidth: 24, height: 22, px: 0.8, borderRadius: '7px',
                                    bgcolor: has ? '#FEE2E2' : (active ? '#fff' : '#F3F5F9'),
                                    color: has ? '#DC2626' : '#7A8494',
                                    border: has ? '1px solid #FCA5A533' : '1px solid transparent',
                                    fontSize: 11.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {loading ? '·' : counts.un}
                                </Box>
                            </Box>
                        );
                    })()}
                </Box>
                <Tooltip arrow title="Reload assignments">
                    <span>
                        <IconButton onClick={load} disabled={loading}
                            sx={{ width: 40, height: 40, borderRadius: '11px', border: '1px solid #ECEEF3', bgcolor: '#fff', '&:hover': { bgcolor: PRIMARY_LIGHT, color: PRIMARY } }}>
                            <RefreshRoundedIcon sx={{ fontSize: 18, color: '#475569' }} />
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>

            {/* Members */}
            <Panel
                title={panelTitle}
                icon={activeShift === 'unassigned' ? PersonOffRoundedIcon : AccessTimeRoundedIcon}
                chip={`${currentMembers.length}${search && currentMembers.length !== membersOf(activeShift).length ? ` of ${membersOf(activeShift).length}` : ''} staff`}
                chipColor={tabAccent.color}
                chipBg={tabAccent.soft}
                action={(
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <TextField
                            size="small"
                            placeholder="Search staff…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            sx={{ width: { xs: 150, sm: 230 }, '& .MuiOutlinedInput-root': { borderRadius: '7px', height: 38, fontSize: 13, bgcolor: '#fff' } }}
                            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 19, color: '#9CA3AF' }} /></InputAdornment> }}
                        />
                        <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)}
                            sx={{ bgcolor: '#fff', '& .MuiToggleButton-root': { px: 1, py: 0.4, borderColor: '#E6EAF1', height: 38 }, '& .Mui-selected': { bgcolor: `${tabAccent.soft} !important`, color: `${tabAccent.color} !important` } }}>
                            <ToggleButton value="grid"><GridViewRoundedIcon sx={{ fontSize: 18 }} /></ToggleButton>
                            <ToggleButton value="list"><ViewListRoundedIcon sx={{ fontSize: 18 }} /></ToggleButton>
                        </ToggleButtonGroup>
                        {typeof activeShift === 'number' && shifts[activeShift]?.id != null && (
                            <Tooltip arrow title={counts.un === 0 ? 'Everyone already has a shift' : ''}>
                                <span>
                                    <Button
                                        variant="contained" disableElevation
                                        disabled={loading || saving || counts.un === 0}
                                        startIcon={<GroupAddRoundedIcon />}
                                        onClick={() => { setAssignPicked([]); setAssignSearch(''); setAssignOpen(true); }}
                                        sx={{
                                            textTransform: 'none', fontSize: 12.5, fontWeight: 700, borderRadius: '7px', height: 38,
                                            bgcolor: tabAccent.color, color: '#fff',
                                            '& .MuiButton-startIcon': { color: '#fff' },
                                            '&:hover': { bgcolor: tabAccent.color, filter: 'brightness(0.92)' },
                                            '&.Mui-disabled': { bgcolor: '#E2E8F0', color: '#94A3B8' },
                                        }}
                                    >
                                        Assign Staff
                                    </Button>
                                </span>
                            </Tooltip>
                        )}
                    </Stack>
                )}
            >
                {/* Select-all + bulk actions */}
                {!loading && !loadError && currentMembers.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', px: 2, py: 1.2, borderBottom: '1px solid #EEF0F6', bgcolor: '#FCFCFE' }}>
                        <Checkbox
                            size="small"
                            checked={allVisibleSelected}
                            indeterminate={someVisibleSelected}
                            onChange={toggleAllVisible}
                            sx={{ p: 0.4, color: '#CBD5E1', '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: tabAccent.color } }}
                        />
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#64748B' }}>
                            {selected.length > 0 ? `${selected.length} selected` : 'Select all'}
                        </Typography>
                        <Box sx={{ flex: 1 }} />
                        {selected.length > 0 && (
                            <>
                                <Button
                                    size="small" disabled={saving}
                                    onClick={(e) => setBulkAnchor(e.currentTarget)}
                                    startIcon={saving ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : <SwapHorizRoundedIcon sx={{ fontSize: 17 }} />}
                                    sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, borderRadius: '7px', height: 32, px: 1.6, bgcolor: tabAccent.color, color: '#fff', '&:hover': { bgcolor: tabAccent.color, filter: 'brightness(0.92)' }, '&.Mui-disabled': { bgcolor: '#E2E8F0', color: '#94A3B8' } }}
                                >
                                    {activeShift === 'unassigned' ? 'Assign to shift' : 'Move to shift'}
                                </Button>
                                {activeShift !== 'unassigned' && (
                                    <Button
                                        size="small" disabled={saving} onClick={bulkUnassign}
                                        startIcon={<PersonOffRoundedIcon sx={{ fontSize: 16 }} />}
                                        sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, borderRadius: '7px', height: 32, px: 1.6, color: '#B91C1C', bgcolor: '#fff', border: '1px solid #FECACA', '&:hover': { bgcolor: '#FEF2F2' } }}
                                    >
                                        Unassign
                                    </Button>
                                )}
                                <Button size="small" disabled={saving} onClick={() => setSelected([])}
                                    sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, borderRadius: '7px', height: 32, px: 1.4, color: '#475569', bgcolor: '#fff', border: '1px solid #E2E8F0', '&:hover': { bgcolor: '#F1F5F9' } }}>
                                    Clear
                                </Button>
                            </>
                        )}
                    </Box>
                )}

                {/* Bulk move / assign target picker */}
                <Menu anchorEl={bulkAnchor} open={Boolean(bulkAnchor)} onClose={() => setBulkAnchor(null)}
                    slotProps={{ paper: { sx: { borderRadius: '9px', minWidth: 200 } } }}>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#9CA3AF', px: 1.5, py: 0.7, letterSpacing: 0.4 }}>
                        {activeShift === 'unassigned' ? 'ASSIGN TO' : 'MOVE TO'} · {selected.length} STAFF
                    </Typography>
                    {shifts.map((s, i) => {
                        const p = shiftPalette(i);
                        const isCurrent = activeShift === i;
                        return (
                            <MenuItem key={s.id ?? `new-${i}`} disabled={s.id == null || isCurrent || saving}
                                onClick={() => bulkMove(i)} sx={{ fontSize: 13, gap: 1 }}>
                                <ListItemIcon sx={{ minWidth: 0 }}>
                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: p.color }} />
                                </ListItemIcon>
                                {s.shiftName || `Shift ${i + 1}`}
                                {isCurrent && <CheckRoundedIcon sx={{ fontSize: 16, color: p.color, ml: 'auto' }} />}
                            </MenuItem>
                        );
                    })}
                </Menu>

                <Box sx={{ p: 2 }}>
                    {loading ? (
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                            {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={112} sx={{ borderRadius: '9px' }} />)}
                        </Box>
                    ) : loadError ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.3, p: 2, borderRadius: '9px', bgcolor: '#FEF2F2', border: '1px solid #FECACA' }}>
                            <ErrorOutlineRoundedIcon sx={{ fontSize: 22, color: '#B91C1C' }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#991B1B' }}>Couldn't load shift assignments</Typography>
                                <Typography sx={{ fontSize: 12, color: '#B91C1C' }}>{loadError}</Typography>
                            </Box>
                            <Button onClick={load} startIcon={<RefreshRoundedIcon sx={{ fontSize: 17 }} />}
                                sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12.5, color: '#B91C1C', bgcolor: '#fff', border: '1px solid #FECACA', borderRadius: '7px', height: 36, px: 2 }}>
                                Retry
                            </Button>
                        </Box>
                    ) : currentMembers.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 6, border: '1px dashed #E5E7EB', borderRadius: '9px', bgcolor: '#FAFAFA' }}>
                            <Box sx={{ width: 48, height: 48, borderRadius: '12px', bgcolor: tabAccent.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1 }}>
                                {activeShift === 'unassigned'
                                    ? <EventAvailableRoundedIcon sx={{ fontSize: 24, color: tabAccent.color }} />
                                    : <PersonOffRoundedIcon sx={{ fontSize: 24, color: tabAccent.color }} />}
                            </Box>
                            <Typography sx={{ fontSize: 13, color: '#64748B', fontWeight: 700 }}>
                                {search
                                    ? 'No staff match your search'
                                    : activeShift === 'unassigned'
                                        ? 'Everyone is assigned to a shift 🎉'
                                        : shifts[activeShift]?.id == null
                                            ? 'Save this shift in Policy Setup before assigning staff'
                                            : 'No staff in this shift yet'}
                            </Typography>
                            {!search && activeShift !== 'unassigned' && shifts[activeShift]?.id != null && counts.un > 0 && (
                                <Typography sx={{ fontSize: 12, color: '#98A0AE', mt: 0.4 }}>Use “Assign Staff” to add people from the unassigned pool.</Typography>
                            )}
                        </Box>
                    ) : view === 'grid' ? (
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                            {currentMembers.map((m) => {
                                const picked = selected.includes(m.employeeCode);
                                return (
                                    <Box key={m.employeeCode}
                                        onClick={() => toggleOne(m.employeeCode)}
                                        sx={{
                                            border: '1px solid', borderRadius: '9px', p: 1.5, cursor: 'pointer', userSelect: 'none',
                                            borderColor: picked ? tabAccent.color : `${tabAccent.color}2E`,
                                            // Lite accent tint fading to white; a fuller tint when picked.
                                            background: picked ? tabAccent.soft : `linear-gradient(135deg, ${tabAccent.soft} 0%, #ffffff 62%)`,
                                            boxShadow: picked ? `0 6px 16px -10px ${tabAccent.color}` : '0 1px 2px rgba(16,24,40,0.04)',
                                            transition: '0.18s',
                                            '&:hover': { boxShadow: `0 10px 24px -14px ${tabAccent.color}`, borderColor: tabAccent.color, transform: 'translateY(-2px)' },
                                        }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Checkbox
                                                size="small" checked={picked}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={() => toggleOne(m.employeeCode)}
                                                sx={{ p: 0.3, color: '#CBD5E1', '&.Mui-checked': { color: tabAccent.color } }}
                                            />
                                            <Avatar src={m.photo || undefined} sx={{ width: 42, height: 42, bgcolor: tabAccent.soft, color: tabAccent.color, fontWeight: 800, fontSize: 15, border: `2px solid ${tabAccent.color}30` }}>
                                                {initials(m.name)}
                                            </Avatar>
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }} noWrap>{m.name}</Typography>
                                                <Typography sx={{ fontSize: 11, color: '#9CA3AF' }} noWrap>{m.employeeCode}{m.role ? ` · ${m.role}` : ''}</Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.2, pt: 1.2, borderTop: '1px solid #F1F0F9' }}>
                                            <Chip size="small" label={activeShift === 'unassigned' ? 'Unassigned' : (m.shiftName || shifts[activeShift]?.shiftName || 'Shift')}
                                                sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: tabAccent.soft, color: tabAccent.color, border: `1px solid ${tabAccent.color}33` }} />
                                            <Box sx={{ display: 'flex', gap: 0.3 }}>
                                                <Tooltip title="View" arrow>
                                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setViewMember(m); }} sx={{ width: 28, height: 28 }}>
                                                        <VisibilityRoundedIcon sx={{ fontSize: 16, color: '#6B7280' }} />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title={activeShift === 'unassigned' ? 'Assign to a shift' : 'Move to another shift'} arrow>
                                                    <span>
                                                        <IconButton size="small" disabled={saving}
                                                            onClick={(e) => { e.stopPropagation(); setMoveTarget(m); setMoveAnchor(e.currentTarget); }}
                                                            sx={{ width: 28, height: 28 }}>
                                                            <SwapHorizRoundedIcon sx={{ fontSize: 17, color: tabAccent.color }} />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </Box>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    ) : (
                        <Box sx={{ border: '1px solid #EEF0F6', borderRadius: '9px', overflow: 'hidden' }}>
                            {currentMembers.map((m, i) => {
                                const picked = selected.includes(m.employeeCode);
                                return (
                                    <Box key={m.employeeCode}
                                        onClick={() => toggleOne(m.employeeCode)}
                                        sx={{
                                            display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.1, cursor: 'pointer', userSelect: 'none',
                                            borderTop: i === 0 ? 'none' : `1px solid ${tabAccent.color}18`,
                                            bgcolor: picked ? tabAccent.soft : `${tabAccent.color}0A`,
                                            '&:hover': { bgcolor: picked ? tabAccent.soft : `${tabAccent.color}16` },
                                        }}>
                                        <Checkbox size="small" checked={picked}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={() => toggleOne(m.employeeCode)}
                                            sx={{ p: 0.3, color: '#CBD5E1', '&.Mui-checked': { color: tabAccent.color } }} />
                                        <Avatar src={m.photo || undefined} sx={{ width: 36, height: 36, bgcolor: tabAccent.soft, color: tabAccent.color, fontWeight: 800, fontSize: 13, border: `2px solid ${tabAccent.color}30` }}>{initials(m.name)}</Avatar>
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }} noWrap>{m.name}</Typography>
                                            <Typography sx={{ fontSize: 11, color: '#9CA3AF' }}>{m.employeeCode}{m.role ? ` · ${m.role}` : ''}</Typography>
                                        </Box>
                                        {m.assignedOn && (
                                            <Typography sx={{ fontSize: 11, color: '#9CA3AF', display: { xs: 'none', md: 'block' } }}>
                                                Assigned {m.assignedOn}
                                            </Typography>
                                        )}
                                        <Chip size="small" label={activeShift === 'unassigned' ? 'Unassigned' : (m.shiftName || 'Shift')}
                                            sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: tabAccent.soft, color: tabAccent.color, border: `1px solid ${tabAccent.color}33` }} />
                                        <Tooltip title="View" arrow>
                                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setViewMember(m); }}>
                                                <VisibilityRoundedIcon sx={{ fontSize: 17, color: '#6B7280' }} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={activeShift === 'unassigned' ? 'Assign to a shift' : 'Move to another shift'} arrow>
                                            <span>
                                                <IconButton size="small" disabled={saving}
                                                    onClick={(e) => { e.stopPropagation(); setMoveTarget(m); setMoveAnchor(e.currentTarget); }}>
                                                    <SwapHorizRoundedIcon sx={{ fontSize: 18, color: tabAccent.color }} />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Box>
                                );
                            })}
                        </Box>
                    )}
                </Box>
            </Panel>

            {/* Move / assign menu — only shifts the server knows about are targets */}
            <Menu anchorEl={moveAnchor} open={Boolean(moveAnchor)} onClose={() => setMoveAnchor(null)}
                slotProps={{ paper: { sx: { borderRadius: '9px', minWidth: 200 } } }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#9CA3AF', px: 1.5, py: 0.7, letterSpacing: 0.4 }}>
                    {moveTarget?.shiftId == null ? 'ASSIGN TO' : 'MOVE TO'}
                </Typography>
                {shifts.map((s, i) => {
                    const p = shiftPalette(i);
                    const isCurrent = moveTarget?.shiftId != null && s.id === moveTarget.shiftId;
                    return (
                        <MenuItem
                            key={s.id ?? `new-${i}`}
                            disabled={s.id == null || isCurrent || saving}
                            onClick={() => confirmMove(i)}
                            sx={{ fontSize: 13, gap: 1 }}
                        >
                            <ListItemIcon sx={{ minWidth: 0 }}>
                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: p.color }} />
                            </ListItemIcon>
                            {s.shiftName || `Shift ${i + 1}`}
                            {isCurrent && <CheckRoundedIcon sx={{ fontSize: 16, color: p.color, ml: 'auto' }} />}
                        </MenuItem>
                    );
                })}
                {/* Only offered for someone who actually has a shift to be removed from. */}
                {moveTarget?.shiftId != null && (
                    <>
                        <Divider sx={{ my: 0.5 }} />
                        <MenuItem disabled={saving} onClick={confirmUnassign} sx={{ fontSize: 13, gap: 1, color: '#DC2626' }}>
                            <ListItemIcon sx={{ minWidth: 0 }}>
                                <PersonOffRoundedIcon sx={{ fontSize: 17, color: '#DC2626' }} />
                            </ListItemIcon>
                            Remove from shift
                        </MenuItem>
                    </>
                )}
            </Menu>

            {/* Assign dialog — unassigned staff only */}
            <Dialog open={assignOpen} onClose={() => !saving && setAssignOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.5, bgcolor: tabAccent.soft }}>
                    <Box>
                        <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a' }}>Assign Staff</Typography>
                        <Typography sx={{ fontSize: 11, color: '#6B7280' }}>
                            to {shifts[activeShift]?.shiftName || 'shift'} · {financialYear}
                        </Typography>
                    </Box>
                    <IconButton size="small" disabled={saving} onClick={() => setAssignOpen(false)}>
                        <CloseRoundedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Box>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField fullWidth size="small" placeholder="Search unassigned staff…" value={assignSearch}
                        onChange={(e) => setAssignSearch(e.target.value)}
                        sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: '7px', height: 38, fontSize: 13 } }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#9CA3AF' }} /></InputAdornment> }} />
                    <Box sx={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #EEF0F3', borderRadius: '7px' }}>
                        {assignCandidates.length === 0 ? (
                            <Typography sx={{ fontSize: 12.5, color: '#9CA3AF', textAlign: 'center', py: 3 }}>
                                {assignSearch ? 'No match' : 'No unassigned staff'}
                            </Typography>
                        ) : assignCandidates.map((m) => {
                            const picked = assignPicked.includes(m.employeeCode);
                            return (
                                <Box key={m.employeeCode}
                                    onClick={() => setAssignPicked((prev) => picked
                                        ? prev.filter((c) => c !== m.employeeCode)
                                        : [...prev, m.employeeCode])}
                                    sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1, py: 0.7, cursor: 'pointer', bgcolor: picked ? tabAccent.soft : 'transparent', '&:hover': { bgcolor: picked ? tabAccent.soft : '#FAFAFA' } }}>
                                    <Checkbox size="small" checked={picked} sx={{ p: 0.5, color: '#CBD5E1', '&.Mui-checked': { color: tabAccent.color } }} />
                                    <Avatar src={m.photo || undefined} sx={{ width: 30, height: 30, fontSize: 12, fontWeight: 700, bgcolor: '#F3F4F6', color: '#6B7280' }}>{initials(m.name)}</Avatar>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#1a1a1a' }} noWrap>{m.name}</Typography>
                                        <Typography sx={{ fontSize: 10.5, color: '#9CA3AF' }} noWrap>{m.employeeCode}{m.role ? ` · ${m.role}` : ''}</Typography>
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                </DialogContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2.5, py: 1.5, borderTop: '1px solid #eee' }}>
                    <Typography sx={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>{assignPicked.length} selected</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button disabled={saving} onClick={() => setAssignOpen(false)}
                            sx={{ textTransform: 'none', borderRadius: '7px', color: '#374151', border: '1px solid #D1D5DB', fontSize: 12.5 }}>
                            Cancel
                        </Button>
                        <Button onClick={confirmAssign} disabled={assignPicked.length === 0 || saving} variant="contained" disableElevation
                            startIcon={saving ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : null}
                            sx={{ textTransform: 'none', borderRadius: '7px', fontWeight: 700, fontSize: 12.5, bgcolor: tabAccent.color, color: '#fff', '&.Mui-disabled': { bgcolor: '#E2E8F0', color: '#94A3B8' }, '&:hover': { bgcolor: tabAccent.color, filter: 'brightness(0.92)' } }}>
                            {saving ? 'Assigning…' : `Assign ${assignPicked.length || ''}`}
                        </Button>
                    </Box>
                </Box>
            </Dialog>

            {/* View member */}
            <Dialog open={Boolean(viewMember)} onClose={() => setViewMember(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
                {viewMember && (() => {
                    const p = viewMember.shiftId == null ? UNASSIGNED : tabAccent;
                    const sh = shifts.find((s) => s.id === viewMember.shiftId);
                    return (
                        <>
                            <Box sx={{ p: 2.5, textAlign: 'center', bgcolor: p.soft, position: 'relative' }}>
                                <IconButton size="small" onClick={() => setViewMember(null)} sx={{ position: 'absolute', top: 8, right: 8 }}>
                                    <CloseRoundedIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                                <Avatar src={viewMember.photo || undefined} sx={{ width: 64, height: 64, mx: 'auto', bgcolor: '#fff', color: p.color, fontWeight: 800, fontSize: 22, border: `3px solid ${p.color}40` }}>
                                    {initials(viewMember.name)}
                                </Avatar>
                                <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#1a1a1a', mt: 1 }}>{viewMember.name}</Typography>
                                <Chip size="small" label={viewMember.shiftName || 'Unassigned'} sx={{ mt: 0.5, height: 22, fontSize: 11, fontWeight: 700, bgcolor: '#fff', color: p.color }} />
                            </Box>
                            <DialogContent sx={{ pt: 2 }}>
                                {[
                                    { icon: <BadgeRoundedIcon sx={{ fontSize: 18, color: '#9CA3AF' }} />, label: 'Employee ID', value: viewMember.employeeCode || '—' },
                                    { icon: <WorkOutlineRoundedIcon sx={{ fontSize: 18, color: '#9CA3AF' }} />, label: 'Role', value: viewMember.role || '—' },
                                    { icon: <AccessTimeRoundedIcon sx={{ fontSize: 18, color: '#9CA3AF' }} />, label: 'Shift Timing', value: sh ? `${fmt12(sh.startTime)} – ${fmt12(sh.endTime)}` : 'Not assigned' },
                                    { icon: <EventAvailableRoundedIcon sx={{ fontSize: 18, color: '#9CA3AF' }} />, label: 'Assigned On', value: viewMember.assignedOn || '—' },
                                ].map((row, i, arr) => (
                                    <Box key={row.label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderBottom: i < arr.length - 1 ? '1px solid #F1F1F4' : 'none' }}>
                                        {row.icon}
                                        <Typography sx={{ fontSize: 12, color: '#9CA3AF', width: 100 }}>{row.label}</Typography>
                                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{row.value}</Typography>
                                    </Box>
                                ))}
                                <Button fullWidth disabled={saving} startIcon={<SwapHorizRoundedIcon />}
                                    onClick={(e) => { setMoveTarget(viewMember); setMoveAnchor(e.currentTarget); }}
                                    sx={{ mt: 2, textTransform: 'none', fontWeight: 700, borderRadius: '7px', border: `1.5px solid ${p.color}`, color: p.color }}>
                                    {viewMember.shiftId == null ? 'Assign to a shift' : 'Move to another shift'}
                                </Button>
                            </DialogContent>
                        </>
                    );
                })()}
            </Dialog>
        </Box>
    );
}
