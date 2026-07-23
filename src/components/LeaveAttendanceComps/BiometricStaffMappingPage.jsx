import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
    Box, Card, CardContent, Grid, Typography, IconButton, Button, Chip,
    Avatar, TextField, InputAdornment, CircularProgress, Tooltip,
    Dialog, DialogContent, DialogActions, Checkbox,
} from '@mui/material';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import { List } from 'react-window';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import HistoryIcon from '@mui/icons-material/History';
import EditNoteIcon from '@mui/icons-material/EditNote';
import GroupsIcon from '@mui/icons-material/Groups';
import http from '../../Api/http';
import { useNavigate } from 'react-router-dom';
import SnackBar from '../SnackBar';
import { GetBiometricMappings, PostBiometricMappings, UpdateBiometricMappings } from '../../Api/Api';
import useFinancialYear from '../../hooks/useFinancialYear';


// ─── Theme (matches Leave & Attendance) ────────────────────────────────────
const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_DARK = '#6246E0';
const PRIMARY_BORDER = '#C9BEFB';

const AVATAR_PALETTE = ['#0E7490', '#1D4ED8', '#C2410C', '#6246E0', '#1D4ED8', '#BE185D', '#A16207', '#0F766E'];
const avatarColorFor = (name = '') => {
    const code = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0);
    return AVATAR_PALETTE[code % AVATAR_PALETTE.length];
};
const getInitials = (name = '') =>
    name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

// Normalize one item from /GetBiometricMappings into the flat row shape the
// page uses. The API returns `biometricEmployeeId` (string|null) + a derived
// `status` ('Mapped' / 'Unmapped'). We keep `userType` because the POST/PUT
// payload requires it per row.
const normalizeEmployee = (emp) => {
    // The row is keyed by the employee's code. GetBiometricMappings calls it
    // `employeeCode`; older shapes used `rollNumber`/`id` — accept any of them so
    // rows never collapse onto an empty key.
    const code = emp.rollNumber || emp.employeeCode || emp.id || '';
    return {
    id: code,
    rollNumber: code,
    name: emp.name || emp.fullName || '',
    designation: emp.designation || emp.role || '',
    department: emp.department || '',
    userType: emp.userType || '',
    biometricEmployeeId: emp.biometricEmployeeId == null
        ? ''
        : String(emp.biometricEmployeeId).trim(),
    serverFinancialYear: emp.financialYear || emp.academicYear || null,
    status: emp.status || (emp.biometricEmployeeId ? 'Mapped' : 'Unmapped'),
    };
};

// ─── Column widths (px) — header row & virtual rows MUST share these to keep
// columns visually aligned, since both are flex-based after the migration off
// MUI Table. Update both places if the row layout ever changes.
const COL = {
    select: 42,
    serial: 42,
    member: { flex: '1 1 220px', minWidth: 220 },
    desig:  160,
    bio:    220,
    status: 130,
    actions: 80,
};

// ─── Memoized virtual row (rendered inside react-window's <List>) ──────────
// react-window passes `index` + a positioning `style` we MUST forward to the
// outer element. Everything else comes from `rowProps`. Wrapping in memo
// prevents needless re-renders while scrolling — only ~12 rows are mounted at
// a time anyway, but this keeps typing inside a TextField cheap.
const VirtualStaffRow = memo(function VirtualStaffRow({
    index, style,
    items, draftIds, originalIds, selectedRolls,
    onSelectRow, onIdChange, onClearOne, onRevertOne,
}) {
    const s = items[index];
    if (!s) return null;

    const id = draftIds[s.rollNumber] || '';
    const isMapped = id.trim().length > 0;
    const isSelected = selectedRolls.includes(s.rollNumber);
    const dirty = (draftIds[s.rollNumber] || '') !== (originalIds[s.rollNumber] || '');
    const avColor = avatarColorFor(s.name);

    return (
        <Box
            style={style}                       // ⬅ react-window positioning
            sx={{
                display: 'flex', alignItems: 'center',
                px: 1, gap: 0,
                borderBottom: '1px solid #F3F4F6',
                bgcolor: isSelected ? '#EFF5FF' : 'transparent',
                transition: 'background-color 0.15s',
                '&:hover': { bgcolor: PRIMARY_LIGHT },
            }}
        >
            {/* Checkbox */}
            <Box sx={{ width: COL.select, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                <Checkbox
                    size="small"
                    checked={isSelected}
                    onChange={(e) => onSelectRow(s.rollNumber, e.target.checked)}
                    sx={{ p: 0.4, color: '#9CA3AF', '&.Mui-checked': { color: PRIMARY } }}
                />
            </Box>

            {/* S.No */}
            <Box sx={{ width: COL.serial, flexShrink: 0 }}>
                <Typography sx={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>
                    {index + 1}
                </Typography>
            </Box>

            {/* Staff Member */}
            <Box sx={{ ...COL.member, display: 'flex', alignItems: 'center', gap: 1.2, pr: 1 }}>
                <Avatar sx={{
                    width: 32, height: 32,
                    bgcolor: `${avColor}15`, color: avColor,
                    fontSize: 11, fontWeight: 700,
                    border: `1px solid ${avColor}33`,
                    flexShrink: 0,
                }}>
                    {getInitials(s.name)}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#111827' }} noWrap>
                        {s.name || '—'}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace', fontWeight: 600 }}>
                        {s.rollNumber}
                    </Typography>
                </Box>
            </Box>

            {/* Designation */}
            <Box sx={{ width: COL.desig, flexShrink: 0, pr: 1 }}>
                <Typography sx={{ fontSize: 12, color: '#374151', fontWeight: 500, textTransform: 'capitalize' }} noWrap>
                    {s.designation || '—'}
                </Typography>
            </Box>

            {/* Biometric Employee ID */}
            <Box sx={{ width: COL.bio, flexShrink: 0, pr: 1 }}>
                <TextField
                    size="small"
                    value={id}
                    onChange={(e) => onIdChange(s.rollNumber, e.target.value)}
                    placeholder="e.g. 4"
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <FingerprintIcon sx={{ fontSize: 14, color: isMapped ? PRIMARY : '#9CA3AF' }} />
                                </InputAdornment>
                            ),
                            inputMode: 'numeric',
                        },
                    }}
                    sx={{
                        width: 200,
                        '& .MuiOutlinedInput-root': {
                            height: 32, fontSize: 12.5, fontWeight: 700,
                            borderRadius: '7px',
                            bgcolor: dirty ? '#E0F2FE' : isMapped ? PRIMARY_LIGHT : '#fff',
                            '& fieldset': {
                                borderColor: dirty ? '#BAE6FD' : isMapped ? PRIMARY_BORDER : '#E5E7EB',
                            },
                            '&:hover fieldset': { borderColor: '#D1D5DB' },
                            '&.Mui-focused fieldset': { borderColor: PRIMARY, borderWidth: 1.5 },
                            '& input': {
                                color: isMapped ? PRIMARY_DARK : '#111827',
                                fontFamily: 'monospace',
                            },
                        },
                    }}
                />
            </Box>

            {/* Status */}
            <Box sx={{ width: COL.status, flexShrink: 0 }}>
                <Chip
                    size="small"
                    icon={isMapped
                        ? <CheckCircleIcon sx={{ fontSize: '12px !important' }} />
                        : <HourglassEmptyIcon sx={{ fontSize: '12px !important' }} />}
                    label={dirty ? 'Unsaved' : isMapped ? 'Mapped' : 'Unmapped'}
                    sx={{
                        height: 22, fontSize: 10.5, fontWeight: 700,
                        bgcolor: dirty ? '#E0F2FE' : isMapped ? '#F1EEFE' : '#F3F4F6',
                        color: dirty ? '#B45309' : isMapped ? '#6246E0' : '#6B7280',
                        border: `1px solid ${dirty ? '#BAE6FD' : isMapped ? '#C9BEFB' : '#E5E7EB'}`,
                        '& .MuiChip-icon': { color: 'inherit', ml: '6px' },
                    }}
                />
            </Box>

            {/* Actions */}
            <Box sx={{ width: COL.actions, flexShrink: 0, textAlign: 'center' }}>
                <Box sx={{ display: 'inline-flex', gap: 0.3 }}>
                    {dirty && (
                        <Tooltip arrow title="Revert this row">
                            <IconButton
                                size="small"
                                onClick={() => onRevertOne(s.rollNumber)}
                                sx={{
                                    width: 26, height: 26, borderRadius: '7px',
                                    color: '#6B7280',
                                    '&:hover': { bgcolor: '#F3F4F6', color: '#111827' },
                                }}
                            >
                                <HistoryIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                    {isMapped && (
                        <Tooltip arrow title="Clear biometric ID">
                            <IconButton
                                size="small"
                                onClick={() => onClearOne(s.rollNumber)}
                                sx={{
                                    width: 26, height: 26, borderRadius: '7px',
                                    color: '#DC2626',
                                    '&:hover': { bgcolor: '#FEF2F2' },
                                }}
                            >
                                <CloseIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </Box>
        </Box>
    );
});

export default function BiometricStaffMappingPage({ onBack, isEmbedded = false }) {
    const navigate = useNavigate();
    // When rendered as a standalone route (no onBack prop) the back button
    // pops the router stack so we land on the previous Leave & Attendance view.
    const handleBack = onBack || (() => navigate(-1));
    // The year comes from the app header now, not a second picker on this page —
    // two selectors for the same thing is exactly how they end up disagreeing.
    const financialYear = useFinancialYear();

    // ─── State ─────────────────────────────────────────────────────────────
    const [staff, setStaff] = useState([]);                  // { id, rollNumber, name, ... biometricEmployeeId }
    const [draftIds, setDraftIds] = useState({});            // rollNumber → string (pending local edits)
    const [originalIds, setOriginalIds] = useState({});      // rollNumber → string (snapshot for "is dirty")
    const [selectedRolls, setSelectedRolls] = useState([]);  // bulk-select
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

    // SnackBar
    const [snackOpen, setSnackOpen]   = useState(false);
    const [snackOk, setSnackOk]       = useState(false);
    const [snackMsg, setSnackMsg]     = useState('');
    const showSnack = (msg, ok) => { setSnackMsg(msg); setSnackOpen(true); setSnackOk(ok); };

    // ─── Data fetch — GET /GetBiometricMappings?financialYear=YYYY-YYYY ────
    // The API returns a flat list with status + biometricEmployeeId already
    // resolved per row. We keep two parallel id maps:
    //   • originalIds — snapshot of what the server currently has (drives
    //     dirty/unsaved diffing AND tells us whether to POST or PUT later)
    //   • draftIds    — what the user is currently editing
    const fetchStaff = useCallback(async () => {
        if (!financialYear) return;
        setIsLoading(true);
        try {
            const res = await http.get(GetBiometricMappings, {
                params: { financialYear },
            });
            const body = res?.data;
            if (body?.error) {
                setStaff([]); setDraftIds({}); setOriginalIds({});
                showSnack(body?.message || 'Failed to load biometric mappings', false);
                return;
            }
            // Tolerate { data: { items: [...] } } (current shape) and a few fallbacks.
            const list = Array.isArray(body?.data?.items) ? body.data.items
                : Array.isArray(body?.data) ? body.data
                : Array.isArray(body?.items) ? body.items
                : Array.isArray(body) ? body
                : [];
            const rows = list.map(normalizeEmployee);
            const idMap = {};
            rows.forEach(r => { idMap[r.rollNumber] = r.biometricEmployeeId || ''; });
            setStaff(rows);
            setDraftIds(idMap);
            setOriginalIds(idMap);
            setSelectedRolls([]);
        } catch (err) {
            console.error('Failed to load biometric mappings', err);
            showSnack(err?.response?.data?.message || 'Failed to load biometric mappings', false);
        } finally {
            setIsLoading(false);
        }
    }, [financialYear]);

    useEffect(() => { fetchStaff(); }, [fetchStaff]);

    // ─── Derived data ──────────────────────────────────────────────────────
    const q = search.trim().toLowerCase();
    const filteredStaff = useMemo(() => {
        if (!q) return staff;
        return staff.filter(s =>
            (s.name || '').toLowerCase().includes(q) ||
            (s.rollNumber || '').toLowerCase().includes(q) ||
            (s.designation || '').toLowerCase().includes(q) ||
            (draftIds[s.rollNumber] || '').toLowerCase().includes(q)
        );
    }, [staff, q, draftIds]);

    const stats = useMemo(() => {
        const total = staff.length;
        const mapped = staff.filter(s => (draftIds[s.rollNumber] || '').trim().length > 0).length;
        const unmapped = total - mapped;
        const dirty = staff.filter(s => (draftIds[s.rollNumber] || '') !== (originalIds[s.rollNumber] || '')).length;
        return { total, mapped, unmapped, dirty };
    }, [staff, draftIds, originalIds]);

    const dirtyRolls = useMemo(
        () => Object.keys(draftIds).filter(r => (draftIds[r] || '') !== (originalIds[r] || '')),
        [draftIds, originalIds]
    );

    // ─── Handlers ──────────────────────────────────────────────────────────
    // Strip everything except digits — biometric devices use numeric employee IDs.
    const cleanId = (v) => String(v || '').replace(/\D/g, '').slice(0, 10);

    // Handlers are memoized so the virtualized row component's `memo()` wrapper
    // can skip rerenders while the user types/scrolls.
    const handleIdChange = useCallback((roll, value) => {
        const v = cleanId(value);
        setDraftIds(prev => ({ ...prev, [roll]: v }));
    }, []);

    const handleClearOne = useCallback((roll) => {
        setDraftIds(prev => ({ ...prev, [roll]: '' }));
    }, []);

    const handleRevertOne = useCallback((roll) => {
        setDraftIds(prev => ({ ...prev, [roll]: originalIds[roll] || '' }));
    }, [originalIds]);

    const handleSelectRow = useCallback((roll, checked) => {
        setSelectedRolls(prev =>
            checked
                ? [...new Set([...prev, roll])]
                : prev.filter(r => r !== roll)
        );
    }, []);

    const allFilteredSelected = filteredStaff.length > 0
        && filteredStaff.every(s => selectedRolls.includes(s.rollNumber));
    const someFilteredSelected = filteredStaff.some(s => selectedRolls.includes(s.rollNumber));

    const handleSelectAllFiltered = (checked) => {
        if (checked) {
            const next = new Set(selectedRolls);
            filteredStaff.forEach(s => next.add(s.rollNumber));
            setSelectedRolls([...next]);
        } else {
            const filteredSet = new Set(filteredStaff.map(s => s.rollNumber));
            setSelectedRolls(prev => prev.filter(r => !filteredSet.has(r)));
        }
    };

    const handleBulkClear = () => {
        if (selectedRolls.length === 0) return;
        setDraftIds(prev => {
            const next = { ...prev };
            selectedRolls.forEach(r => { next[r] = ''; });
            return next;
        });
        showSnack(`Cleared biometric IDs for ${selectedRolls.length} staff (unsaved)`, true);
    };

    const handleRevertAll = () => {
        setDraftIds(originalIds);
        showSnack('Reverted all unsaved changes', true);
    };

    // ─── Save — split dirty rows into NEW (POST) vs EXISTING (PUT) ────────
    // Rows the server already holds (status 'Mapped', or an existing original
    // id) go to UpdateBiometricMappings; brand-new mappings go to
    // PostBiometricMappings. Both share the same body shape:
    //   { financialYear, items: [{ employeeCode, biometricEmployeeId }] }
    const handleSave = async () => {
        if (dirtyRolls.length === 0) {
            showSnack('No changes to save', false);
            return;
        }

        const toCreateItems = [];
        const toUpdateItems = [];
        dirtyRolls.forEach(code => {
            const row = staff.find(s => s.rollNumber === code);
            if (!row) return;
            // `row.rollNumber` holds the employee code from GetBiometricMappings.
            const item = {
                employeeCode: code,
                biometricEmployeeId: draftIds[code] || '',
            };
            // Existing server-side record? PUT. Otherwise POST a new one.
            const hadServerRecord = !!row.serverFinancialYear
                || (originalIds[code] || '').length > 0;
            (hadServerRecord ? toUpdateItems : toCreateItems).push(item);
        });

        const baseBody = { financialYear };

        setIsSaving(true);
        try {
            const calls = [];
            if (toCreateItems.length > 0) {
                calls.push(http.post(PostBiometricMappings, { ...baseBody, items: toCreateItems }));
            }
            if (toUpdateItems.length > 0) {
                calls.push(http.put(UpdateBiometricMappings, { ...baseBody, items: toUpdateItems }));
            }
            const results = await Promise.all(calls);
            // Surface any backend-flagged error embedded in a 2xx response.
            const failed = results.find(r => r?.data?.error);
            if (failed) {
                showSnack(failed.data?.message || 'Failed to save mappings', false);
                return;
            }
            // Success — snapshot new originals AND update each row's server
            // record flag so subsequent edits route to PUT, not POST.
            setOriginalIds(prev => {
                const next = { ...prev };
                dirtyRolls.forEach(r => { next[r] = draftIds[r] || ''; });
                return next;
            });
            setStaff(prev => prev.map(r => dirtyRolls.includes(r.rollNumber)
                ? { ...r, serverFinancialYear: financialYear, biometricEmployeeId: draftIds[r.rollNumber] || '' }
                : r
            ));
            showSnack(`Saved biometric IDs for ${dirtyRolls.length} staff`, true);
        } catch (err) {
            console.error('Save failed', err);
            showSnack(err?.response?.data?.message || 'Failed to save mappings', false);
        } finally {
            setIsSaving(false);
        }
    };

    // ─── KPI cards ─────────────────────────────────────────────────────────
    const kpiCards = [
        {
            label: 'Total Staff',
            value: stats.total,
            sub: 'on payroll',
            color: '#7C5CFC', bg: '#F1EEFE', border: '#C9BEFB',
            icon: PeopleAltOutlinedIcon,
        },
        {
            label: 'Mapped',
            value: stats.mapped,
            sub: stats.total > 0 ? `${Math.round((stats.mapped / stats.total) * 100)}% of staff` : '—',
            color: '#6246E0', bg: '#F3F0FE', border: '#C9BEFB',
            icon: CheckCircleIcon,
        },
        {
            label: 'Unmapped',
            value: stats.unmapped,
            sub: 'awaiting biometric ID',
            color: '#0EA5E9', bg: '#E0F2FE', border: '#BAE6FD',
            icon: LinkOffIcon,
        },
        {
            label: 'Pending Changes',
            value: stats.dirty,
            sub: stats.dirty > 0 ? 'unsaved local edits' : 'all saved',
            color: '#2563EB', bg: '#F3F0FE', border: '#C9BEFB',
            icon: EditNoteIcon,
        },
    ];

    return (
        <>
            <SnackBar open={snackOpen} color={snackOk} setOpen={setSnackOpen} status={snackOk} message={snackMsg} />

            <Box sx={{
                border: isEmbedded ? 'none' : '1px solid #E5E7EB',
                borderRadius: isEmbedded ? 0 : '20px',
                p: isEmbedded ? 0 : 2,
                bgcolor: isEmbedded ? 'transparent' : '#F9FAFB',
                minHeight: isEmbedded ? 'auto' : '86vh',
            }}>
                {/* ─── Page header ──────────────────────────────────────── */}
                <Box sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    mb: 2, flexWrap: 'wrap', gap: 1.5,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        {/* Inside a tab there's nowhere to go "back" to — the tab bar
                            is the navigation — so the arrow only shows standalone. */}
                        {!isEmbedded && (
                            <IconButton
                                onClick={handleBack}
                                sx={{
                                    width: 38, height: 38, borderRadius: '7px',
                                    bgcolor: '#fff', border: '1px solid #E5E7EB',
                                    '&:hover': { bgcolor: PRIMARY_LIGHT, borderColor: PRIMARY_BORDER },
                                }}
                            >
                                <ArrowBackIcon sx={{ fontSize: 18, color: '#374151' }} />
                            </IconButton>
                        )}
                        <Box sx={{
                            width: 40, height: 40, borderRadius: '7px',
                            bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <FingerprintIcon sx={{ color: PRIMARY, fontSize: 22 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '17px', fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>
                                Biometric Device Mapping
                            </Typography>
                            <Typography sx={{ fontSize: '11.5px', color: '#6B7280', mt: 0.3 }}>
                                Link each staff member to their biometric device employee ID
                            </Typography>
                        </Box>
                    </Box>

                    {/* The year is chosen once, in the app header — this just shows
                        which one the mappings below belong to. */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Tooltip arrow title="Change the financial year from the header">
                            <Box sx={{
                                display: 'flex', alignItems: 'center', gap: 0.6,
                                px: 1.2, height: 36, borderRadius: '7px',
                                bgcolor: '#fff', border: '1px solid #E5E7EB',
                            }}>
                                <CalendarMonthOutlinedIcon sx={{ fontSize: 16, color: PRIMARY_DARK }} />
                                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                    Financial Year
                                </Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 700, color: PRIMARY_DARK, pl: 0.5 }}>
                                    {financialYear || '—'}
                                </Typography>
                            </Box>
                        </Tooltip>
                        {stats.dirty > 0 && (
                            <Tooltip arrow title="Save your changes before switching the financial year.">
                                <Box sx={{
                                    px: 1, height: 24, borderRadius: '7px',
                                    display: 'flex', alignItems: 'center',
                                    bgcolor: '#E0F2FE', border: '1px solid #BAE6FD',
                                }}>
                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#B45309' }}>
                                        {stats.dirty} unsaved
                                    </Typography>
                                </Box>
                            </Tooltip>
                        )}
                    </Box>
                </Box>

                {/* ─── KPI cards ───────────────────────────────────────── */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    {kpiCards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.label}>
                                <Card sx={{
                                    border: `1px solid ${card.border}`,
                                    borderRadius: '7px', boxShadow: 'none',
                                    bgcolor: card.bg, height: '100%',
                                    transition: 'transform 0.15s, box-shadow 0.15s',
                                    '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 6px 16px ${card.color}22` },
                                }}>
                                    <CardContent sx={{ py: 1.8, '&:last-child': { pb: 1.8 } }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography sx={{
                                                    fontSize: '11px', color: card.color, fontWeight: 700,
                                                    textTransform: 'uppercase', letterSpacing: 0.5,
                                                }}>
                                                    {card.label}
                                                </Typography>
                                                <Typography sx={{
                                                    fontSize: '26px', fontWeight: 800, color: '#111827',
                                                    lineHeight: 1.2, mt: 0.5,
                                                }}>
                                                    {card.value}
                                                </Typography>
                                                <Typography sx={{
                                                    fontSize: '10.5px', color: card.color, fontWeight: 600, mt: 0.4,
                                                }} noWrap>
                                                    {card.sub}
                                                </Typography>
                                            </Box>
                                            <Box sx={{
                                                width: 38, height: 38, borderRadius: '7px',
                                                bgcolor: '#fff', border: `1px solid ${card.border}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <Icon sx={{ color: card.color, fontSize: 20 }} />
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>

                {/* ─── Filter / bulk-action bar ────────────────────────── */}
                <Card sx={{ border: '1px solid #E5E7EB', borderRadius: '7px', boxShadow: 'none', bgcolor: '#fff', mb: 1.5 }}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <TextField
                                size="small"
                                placeholder="Search by name, roll no, designation or biometric ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon sx={{ fontSize: 16, color: q ? PRIMARY : '#9CA3AF' }} />
                                            </InputAdornment>
                                        ),
                                        endAdornment: q ? (
                                            <InputAdornment position="end">
                                                <IconButton size="small" onClick={() => setSearch('')} sx={{ p: 0.3 }}>
                                                    <CloseIcon sx={{ fontSize: 14, color: '#9CA3AF' }} />
                                                </IconButton>
                                            </InputAdornment>
                                        ) : null,
                                    },
                                }}
                                sx={{
                                    flex: 1, minWidth: 260, maxWidth: 420,
                                    '& .MuiOutlinedInput-root': {
                                        height: 36, fontSize: '12.5px', borderRadius: '50px',
                                        bgcolor: q ? PRIMARY_LIGHT : '#fff',
                                        '& fieldset': { borderColor: q ? PRIMARY_BORDER : '#E5E7EB' },
                                        '&.Mui-focused fieldset': { borderColor: PRIMARY },
                                    },
                                }}
                            />

                            {/* Bulk action chips (only when something is selected) */}
                            {selectedRolls.length > 0 && (
                                <>
                                    <Box sx={{
                                        display: 'flex', alignItems: 'center', gap: 0.6,
                                        px: 1.2, height: 32, borderRadius: '7px',
                                        bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`,
                                    }}>
                                        <GroupsIcon sx={{ fontSize: 15, color: PRIMARY_DARK }} />
                                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: PRIMARY_DARK }}>
                                            {selectedRolls.length} selected
                                        </Typography>
                                    </Box>
                                    <Button
                                        size="small"
                                        startIcon={<EditNoteIcon sx={{ fontSize: 16 }} />}
                                        onClick={() => setBulkDialogOpen(true)}
                                        sx={{
                                            textTransform: 'none', fontSize: 12.5, fontWeight: 700,
                                            background: '#F1EEFE', color: '#7C5CFC',
                                            border: '1px solid #0F172A', borderRadius: '7px',
                                            boxShadow: 'none', px: 1.6, height: 32,
                                            '&:hover': { bgcolor: '#6246E0', borderColor: '#6246E0' },
                                        }}
                                    >
                                        Bulk Edit IDs
                                    </Button>
                                    <Button
                                        size="small"
                                        startIcon={<LinkOffIcon sx={{ fontSize: 15 }} />}
                                        onClick={handleBulkClear}
                                        sx={{
                                            textTransform: 'none', fontSize: 12, fontWeight: 600,
                                            color: '#DC2626', bgcolor: '#fff',
                                            border: '1px solid #FECACA', borderRadius: '7px',
                                            px: 1.4, height: 32,
                                            '&:hover': { bgcolor: '#FEF2F2', borderColor: '#DC2626' },
                                        }}
                                    >
                                        Clear IDs
                                    </Button>
                                    <Button
                                        size="small"
                                        startIcon={<RestartAltIcon sx={{ fontSize: 15 }} />}
                                        onClick={() => setSelectedRolls([])}
                                        sx={{
                                            textTransform: 'none', fontSize: 12, fontWeight: 600,
                                            color: '#6B7280',
                                            '&:hover': { bgcolor: '#F9FAFB' },
                                        }}
                                    >
                                        Clear selection
                                    </Button>
                                </>
                            )}

                            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                <Typography sx={{ fontSize: 11.5, color: '#6B7280' }}>Showing</Typography>
                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: q ? PRIMARY_DARK : '#111827' }}>
                                    {filteredStaff.length}
                                </Typography>
                                <Typography sx={{ fontSize: 11.5, color: '#6B7280' }}>of {staff.length}</Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                {/* ─── Staff table ─────────────────────────────────────── */}
                <Card sx={{ border: '1px solid #E5E7EB', borderRadius: '7px', boxShadow: 'none', bgcolor: '#fff', overflow: 'hidden' }}>
                    {/* ── Header row (sticky-style, matches virtual row columns) ── */}
                    <Box sx={{
                        display: 'flex', alignItems: 'center',
                        px: 1, py: 1.1,
                        bgcolor: PRIMARY_LIGHT,
                        borderBottom: `1px solid ${PRIMARY_BORDER}`,
                        position: 'sticky', top: 0, zIndex: 2,
                        '& > *': {
                            fontSize: 10, fontWeight: 700, color: PRIMARY_DARK,
                            letterSpacing: 0.6, textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                        },
                    }}>
                        <Box sx={{ width: COL.select, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                            <Checkbox
                                size="small"
                                checked={allFilteredSelected}
                                indeterminate={!allFilteredSelected && someFilteredSelected}
                                onChange={(e) => handleSelectAllFiltered(e.target.checked)}
                                sx={{
                                    p: 0.4,
                                    color: '#9CA3AF',
                                    '&.Mui-checked': { color: PRIMARY },
                                    '&.MuiCheckbox-indeterminate': { color: PRIMARY },
                                }}
                            />
                        </Box>
                        <Box sx={{ width: COL.serial, flexShrink: 0 }}>#</Box>
                        <Box sx={{ ...COL.member }}>Staff Member</Box>
                        <Box sx={{ width: COL.desig, flexShrink: 0 }}>Designation</Box>
                        <Box sx={{ width: COL.bio, flexShrink: 0 }}>Biometric Employee ID</Box>
                        <Box sx={{ width: COL.status, flexShrink: 0 }}>Status</Box>
                        <Box sx={{ width: COL.actions, flexShrink: 0, textAlign: 'center' }}>Actions</Box>
                    </Box>

                    {/* ── Body — loading / empty / virtualized list ─────────── */}
                    {isLoading ? (
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                            <CircularProgress size={28} sx={{ color: PRIMARY }} />
                            <Typography sx={{ mt: 1.2, fontSize: 12, color: '#6B7280' }}>
                                Loading staff…
                            </Typography>
                        </Box>
                    ) : filteredStaff.length === 0 ? (
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                            <Box sx={{
                                width: 56, height: 56, borderRadius: '50%',
                                bgcolor: '#F3F4F6', mx: 'auto', mb: 1.2,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <FingerprintIcon sx={{ fontSize: 30, color: '#9CA3AF' }} />
                            </Box>
                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                                {q ? `No staff match "${search}"` : 'No staff data available'}
                            </Typography>
                            <Typography sx={{ fontSize: 11.5, color: '#9CA3AF', mt: 0.4 }}>
                                {q ? 'Try a different search term.' : 'Add staff first, then map them here.'}
                            </Typography>
                        </Box>
                    ) : (
                        // react-window only mounts ~12 rows at a time even when
                        // the dataset has hundreds of entries — fixes the lag
                        // and load-hang reported on 150+ row payrolls.
                        <Box sx={{ height: 'min(60vh, 640px)', minHeight: 320 }}>
                            <List
                                rowCount={filteredStaff.length}
                                rowHeight={64}
                                rowComponent={VirtualStaffRow}
                                rowProps={{
                                    items: filteredStaff,
                                    draftIds,
                                    originalIds,
                                    selectedRolls,
                                    onSelectRow: handleSelectRow,
                                    onIdChange: handleIdChange,
                                    onClearOne: handleClearOne,
                                    onRevertOne: handleRevertOne,
                                }}
                                overscanCount={4}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </Box>
                    )}

                    {/* ── Footer action bar — Revert + Save sit inside the
                         table card now so the primary action stays close to
                         the data the user just edited. ── */}
                    <Box sx={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        flexWrap: 'wrap', gap: 1,
                        px: 2, py: 1.4,
                        borderTop: '1px solid #E5E7EB',
                        bgcolor: '#FAFBFD',
                    }}>
                        <Typography sx={{ fontSize: 11.5, color: '#6B7280' }}>
                            {stats.dirty === 0
                                ? <>All changes saved · <strong style={{ color: '#374151' }}>{stats.mapped}</strong> of <strong style={{ color: '#374151' }}>{stats.total}</strong> staff mapped</>
                                : <><strong style={{ color: '#B45309' }}>{stats.dirty}</strong> unsaved change{stats.dirty === 1 ? '' : 's'} · Save to push them to the device.</>
                            }
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {stats.dirty > 0 && (
                                <Button
                                    onClick={handleRevertAll}
                                    startIcon={<HistoryIcon sx={{ fontSize: 16 }} />}
                                    sx={{
                                        textTransform: 'none', fontSize: 12.5, fontWeight: 600,
                                        color: '#374151', bgcolor: '#fff',
                                        border: '1px solid #E5E7EB', borderRadius: '7px',
                                        px: 1.6, height: 36,
                                        '&:hover': { bgcolor: '#F9FAFB', borderColor: '#D1D5DB' },
                                    }}
                                >
                                    Revert ({stats.dirty})
                                </Button>
                            )}
                            <Button
                                onClick={handleSave}
                                disabled={isSaving || stats.dirty === 0}
                                startIcon={isSaving
                                    ? <CircularProgress size={14} sx={{ color: '#fff' }} />
                                    : <SaveOutlinedIcon sx={{ fontSize: 18 }} />}
                                variant="contained"
                                disableElevation
                                sx={{
                                    textTransform: 'none', fontSize: 13, fontWeight: 700,
                                    bgcolor: PRIMARY, color: '#fff',
                                    borderRadius: '7px', px: 2.4, height: 36,
                                    boxShadow: `0 2px 6px ${PRIMARY}33`,
                                    '&:hover': { bgcolor: PRIMARY_DARK, boxShadow: `0 4px 12px ${PRIMARY}55` },
                                    '&.Mui-disabled': { bgcolor: '#E5E7EB', color: '#9CA3AF', boxShadow: 'none' },
                                }}
                            >
                                {isSaving
                                    ? 'Saving…'
                                    : `Save${stats.dirty > 0 ? ` (${stats.dirty})` : ''}`}
                            </Button>
                        </Box>
                    </Box>
                </Card>
            </Box>

            {/* ─── Bulk Edit Dialog ────────────────────────────────────── */}
            <Dialog
                open={bulkDialogOpen}
                onClose={() => setBulkDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: '14px', overflow: 'hidden' } } }}
            >
                {/* Dialog header */}
                <Box sx={{
                    px: 2.5, py: 1.8,
                    background: `linear-gradient(135deg, ${PRIMARY_LIGHT} 0%, #fff 70%)`,
                    borderBottom: `1px solid ${PRIMARY_BORDER}`,
                    display: 'flex', alignItems: 'center', gap: 1.5,
                }}>
                    <Box sx={{
                        width: 38, height: 38, borderRadius: '7px',
                        bgcolor: '#fff', border: `1px solid ${PRIMARY_BORDER}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <EditNoteIcon sx={{ color: PRIMARY, fontSize: 22 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: '15px', fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>
                            Bulk Edit Biometric IDs
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: '#6B7280', mt: 0.3 }}>
                            Editing {selectedRolls.length} staff — changes apply only after you press Save.
                        </Typography>
                    </Box>
                    <IconButton
                        onClick={() => setBulkDialogOpen(false)}
                        sx={{
                            width: 30, height: 30, borderRadius: '7px',
                            bgcolor: '#fff', border: '1px solid #E5E7EB',
                            '&:hover': { bgcolor: '#F9FAFB' },
                        }}
                    >
                        <CloseIcon sx={{ fontSize: 15, color: '#6B7280' }} />
                    </IconButton>
                </Box>

                <DialogContent sx={{ p: 2, bgcolor: '#F9FAFB', maxHeight: '60vh' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {selectedRolls.length === 0 && (
                            <Typography sx={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', py: 3 }}>
                                No staff selected.
                            </Typography>
                        )}
                        {selectedRolls.map((roll) => {
                            const s = staff.find(x => x.rollNumber === roll);
                            if (!s) return null;
                            const avColor = avatarColorFor(s.name);
                            return (
                                <Box key={roll} sx={{
                                    p: 1.2, borderRadius: '7px',
                                    bgcolor: '#fff', border: '1px solid #E5E7EB',
                                    display: 'flex', alignItems: 'center', gap: 1.2,
                                }}>
                                    <Avatar sx={{
                                        width: 32, height: 32,
                                        bgcolor: `${avColor}15`, color: avColor,
                                        fontSize: 11, fontWeight: 700,
                                        border: `1px solid ${avColor}33`,
                                    }}>
                                        {getInitials(s.name)}
                                    </Avatar>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#111827' }} noWrap>
                                            {s.name}
                                        </Typography>
                                        <Typography sx={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace' }}>
                                            {s.rollNumber}
                                        </Typography>
                                    </Box>
                                    <TextField
                                        size="small"
                                        value={draftIds[roll] || ''}
                                        onChange={(e) => handleIdChange(roll, e.target.value)}
                                        placeholder="Biometric ID"
                                        slotProps={{
                                            input: {
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <FingerprintIcon sx={{ fontSize: 14, color: PRIMARY }} />
                                                    </InputAdornment>
                                                ),
                                                inputMode: 'numeric',
                                            },
                                        }}
                                        sx={{
                                            width: 160,
                                            '& .MuiOutlinedInput-root': {
                                                height: 32, fontSize: 12.5, fontWeight: 700,
                                                borderRadius: '7px', bgcolor: '#fff',
                                                '& fieldset': { borderColor: '#E5E7EB' },
                                                '&.Mui-focused fieldset': { borderColor: PRIMARY, borderWidth: 1.5 },
                                                '& input': { fontFamily: 'monospace' },
                                            },
                                        }}
                                    />
                                </Box>
                            );
                        })}
                    </Box>
                </DialogContent>

                <DialogActions sx={{ px: 2.5, py: 1.8, borderTop: '1px solid #E5E7EB', bgcolor: '#fff' }}>
                    <Button
                        onClick={() => setBulkDialogOpen(false)}
                        sx={{
                            textTransform: 'none', fontSize: 13, fontWeight: 600,
                            color: '#374151', borderRadius: '7px',
                            border: '1px solid #E5E7EB', px: 2, height: 36,
                            '&:hover': { bgcolor: '#F9FAFB' },
                        }}
                    >
                        Close
                    </Button>
                    <Button
                        variant="contained"
                        disableElevation
                        startIcon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                        onClick={() => setBulkDialogOpen(false)}
                        sx={{
                            textTransform: 'none', fontSize: 13, fontWeight: 700,
                            bgcolor: PRIMARY, color: '#fff',
                            borderRadius: '7px', px: 2.2, height: 36,
                            '&:hover': { bgcolor: PRIMARY_DARK },
                        }}
                    >
                        Done — Save on main page
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
