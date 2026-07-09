import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Grid, IconButton, Divider,
    Dialog, TextField, Switch, CircularProgress, Autocomplete, Chip, Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import CloseIcon from '@mui/icons-material/Close';
import ListAltIcon from '@mui/icons-material/ListAlt';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive';
import PaidIcon from '@mui/icons-material/Paid';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import SnackBar from '../../SnackBar';
import { leavePolicyDashboard, postLeaveType, updateLeaveTypeById } from '../../../Api/Api';

const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_DARK = '#6246E0';

const LEAVE_COLORS = [
    '#7C5CFC', '#EF4444', '#9B87FB', '#EC4899', '#06B6D4',
    '#9B87FB', '#F59E0B', '#6B7280', '#FF6B35', '#7C5CFC',
];

const ALLOCATION_PERIODS = [
    { key: 'Monthly', label: 'Monthly', months: 1 },
    { key: 'Quarterly', label: 'Quarterly', months: 3 },
    { key: 'Half-Yearly', label: 'Half-Yearly', months: 6 },
    { key: 'Yearly', label: 'Yearly', months: 12 },
];

const emptyForm = {
    name: '',
    shortCode: '',
    daysPerMonth: 1,
    allocationPeriod: 'Monthly',
    encashUnused: false,
    color: '#7C5CFC',
    description: '',
};

export default function LeavePolicy() {
    const navigate = useNavigate();
    const token = "123";
    const isExpanded = useSelector((state) => state.sidebar.isExpanded);

    const [policies, setPolicies] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [apiStats, setApiStats] = useState({
        totalLeaveTypes: 0,
        totalDaysPerMonth: 0,
        onDemandUnlimited: 0,
        encashableLeaveTypes: 0,
    });

    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState(false);
    const [color, setColor] = useState(false);
    const [message, setMessage] = useState('');
    const showSnack = (msg, success) => {
        setMessage(msg); setOpen(true); setColor(success); setStatus(success);
    };

    const fetchLeavePolicies = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(leavePolicyDashboard, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data && !res.data.error) {
                const d = res.data.data;
                setApiStats({
                    totalLeaveTypes: d.totalLeaveTypes,
                    totalDaysPerMonth: d.totalDaysPerMonth,
                    onDemandUnlimited: d.onDemandUnlimited,
                    encashableLeaveTypes: d.encashableLeaveTypes,
                });
                setPolicies((d.leaveTypes || []).map(lt => ({
                    id: lt.id,
                    name: lt.leaveTypeName,
                    shortCode: lt.shortCode,
                    daysPerMonth: lt.daysPerMonth,
                    allocationPeriod: lt.allocationPeriod || 'Monthly',
                    encashUnused: lt.encash === 'Y',
                    color: lt.colorTag || '#7C5CFC',
                    description: lt.description || '',
                })));
            } else {
                showSnack('Failed to load leave policies', false);
            }
        } catch {
            showSnack('Failed to load leave policies', false);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLeavePolicies();
    }, []);

    const handleAdd = () => {
        setEditingPolicy(null);
        setForm({ ...emptyForm });
        setDialogOpen(true);
    };

    const handleEdit = (policy) => {
        setEditingPolicy(policy);
        setForm({ ...policy });
        setDialogOpen(true);
    };

    const handleDeleteClick = (policy) => {
        setDeleteTarget(policy);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        setPolicies(prev => prev.filter(p => p.id !== deleteTarget.id));
        showSnack(`"${deleteTarget.name}" deleted successfully.`, true);
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.shortCode.trim()) {
            showSnack('Leave type name and short code are required.', false);
            return;
        }

        const body = {
            leaveTypeName: form.name,
            shortCode: form.shortCode,
            daysPerMonth: form.daysPerMonth,
            allocationPeriod: form.allocationPeriod,
            encash: form.encashUnused ? 'Y' : 'N',
            colorTag: form.color,
            description: form.description,
        };

        setIsSaving(true);
        try {
            if (editingPolicy) {
                const res = await axios.put(updateLeaveTypeById, { ...body, id: editingPolicy.id }, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.data && !res.data.error) {
                    showSnack('Leave type updated successfully!', true);
                    setDialogOpen(false);
                    fetchLeavePolicies();
                } else {
                    showSnack(res.data?.message || 'Failed to update leave type', false);
                }
            } else {
                const res = await axios.post(postLeaveType, body, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.data && !res.data.error) {
                    showSnack('Leave type added successfully!', true);
                    setDialogOpen(false);
                    fetchLeavePolicies();
                } else {
                    showSnack(res.data?.message || 'Failed to add leave type', false);
                }
            }
        } catch {
            showSnack(editingPolicy ? 'Failed to update leave type.' : 'Failed to add leave type.', false);
        } finally {
            setIsSaving(false);
        }
    };

    const ff = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const getTotalDaysForPeriod = (daysPerMonth, period) => {
        const p = ALLOCATION_PERIODS.find(a => a.key === period);
        return daysPerMonth * (p?.months || 1);
    };

    return (
        <>
            <SnackBar open={open} color={color} setOpen={setOpen} status={status} message={message} />

            <Box sx={{ width: '100%' }}>
                {/* Fixed Header */}
                <Box sx={{
                    position: 'fixed',
                    top: '60px',
                    left: isExpanded ? '260px' : '80px',
                    right: 0,
                    backgroundColor: '#f2f2f2',
                    px: 2,
                    borderBottom: '1px solid #ddd',
                    zIndex: 1200,
                    transition: 'left 0.3s ease-in-out',
                    overflow: 'hidden',
                    py: 0.7,
                }}>
                    <Grid container sx={{ alignItems: 'center' }}>
                        <Grid size={{ xs: 12, sm: 12, md: 6, lg: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
                            <IconButton onClick={() => navigate(-1)} sx={{ width: '27px', height: '27px', mt: '2px' }}>
                                <ArrowBackIcon sx={{ fontSize: 20, color: '#000' }} />
                            </IconButton>
                            <Typography sx={{ fontWeight: '600', fontSize: '18px' }}>Leave Policy Management</Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 12, md: 6, lg: 6 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                            <Button
                                variant="outlined"
                                onClick={() => navigate('leave-master')}
                                sx={{
                                    textTransform: 'none', fontSize: '12px', fontWeight: 600,
                                    borderRadius: '30px', borderColor: PRIMARY, color: PRIMARY, px: 2, height: 32,
                                    '&:hover': { bgcolor: PRIMARY_LIGHT, borderColor: PRIMARY_DARK },
                                }}
                            >
                                Leave Master Screen
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleAdd}
                                sx={{
                                    textTransform: 'none', bgcolor: PRIMARY, borderRadius: '30px',
                                    fontSize: '12px', fontWeight: 600, px: 2, height: 32,
                                    '&:hover': { bgcolor: PRIMARY_DARK },
                                }}
                            >
                                Add Leave Type
                            </Button>
                        </Grid>
                    </Grid>
                </Box>

                {/* Content */}
                <Box sx={{ px: 2, pt: '60px', pb: 2 }}>

                    {isLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                            <CircularProgress sx={{ color: PRIMARY }} />
                        </Box>
                    ) : (
                        <>
                            {/* Stats */}
                            <Grid container spacing={2} sx={{ mb: 2 }}>
                                {[
                                    { label: 'Total Leave Types', value: apiStats.totalLeaveTypes, subtitle: 'Configured', color: '#0891B2', bgColor: '#F0F9FA', icon: ListAltIcon },
                                    { label: 'Total Days / Month', value: `${apiStats.totalDaysPerMonth}d`, subtitle: 'Monthly Allocation', color: '#22C55E', bgColor: '#F1F8F4', icon: CalendarTodayIcon },
                                    { label: 'On-demand / Unlimited', value: apiStats.onDemandUnlimited, subtitle: 'Flexible Leaves', color: '#F97316', bgColor: '#FFF8F0', icon: AllInclusiveIcon },
                                    { label: 'Encashable Types', value: apiStats.encashableLeaveTypes, subtitle: 'Salary Credited', color: '#E91E63', bgColor: '#FFF0F5', icon: PaidIcon },
                                ].map((card, i) => {
                                    const IconComp = card.icon;
                                    return (
                                        <Grid key={i} size={{ xs: 12, sm: 6, md: 3, lg: 3 }}>
                                            <Box sx={{
                                                border: `1px solid ${card.color}`,
                                                borderRadius: '7px',
                                                bgcolor: card.bgColor,
                                                p: 2.5,
                                                transition: 'transform 0.2s, box-shadow 0.2s',
                                                '&:hover': {
                                                    transform: 'translateY(-4px)',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                                },
                                            }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography sx={{ fontSize: '12px', color: '#666', mb: 0.5 }}>{card.label}</Typography>
                                                        <Typography sx={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a', mb: 0.5 }}>{card.value}</Typography>
                                                        <Typography sx={{ fontSize: '11px', color: '#999' }}>{card.subtitle}</Typography>
                                                    </Box>
                                                    <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: card.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <IconComp sx={{ color: card.color, fontSize: 24 }} />
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    );
                                })}
                            </Grid>

                            {/* Info */}
                            <Box sx={{
                                mb: 2, p: 1.5, borderRadius: '7px',
                                bgcolor: '#E0F2FE', border: '1px solid #BAE6FD',
                                display: 'flex', alignItems: 'flex-start', gap: 1,
                            }}>
                                <InfoOutlinedIcon sx={{ fontSize: 16, color: '#F59E0B', mt: 0.2, flexShrink: 0 }} />
                                <Typography sx={{ fontSize: 11, color: '#78350F', lineHeight: 1.7 }}>
                                    <strong>Days Per Month</strong> — monthly accrual rate. Set <strong>0</strong> for on-demand leaves.
                                    <strong> Allocation Period</strong> — pool days monthly, quarterly, half-yearly, or yearly.
                                    <strong> Encash</strong> — unused days are credited to salary at the end of the period.
                                </Typography>
                            </Box>

                            {/* Leave Type Cards */}
                            <Grid container spacing={2}>
                                {policies.map(policy => {
                                    const totalDays = getTotalDaysForPeriod(policy.daysPerMonth, policy.allocationPeriod);
                                    return (
                                        <Grid key={policy.id} size={{ xs: 12, sm: 6, md: 4, lg: 4 }}>
                                            <Box sx={{ border: `1px solid ${policy.color}`, borderRadius: '7px', bgcolor: `${policy.color}08`, p: 2.5 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: `${policy.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Typography sx={{ fontSize: 12, fontWeight: 900, color: policy.color }}>{policy.shortCode}</Typography>
                                                        </Box>
                                                        <Box>
                                                            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{policy.name}</Typography>
                                                            {policy.description && <Typography sx={{ fontSize: 11, color: '#999' }}>{policy.description}</Typography>}
                                                        </Box>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                        <IconButton size="small" onClick={() => handleEdit(policy)} sx={{ width: 26, height: 26 }}><EditIcon sx={{ fontSize: 14, color: '#1976D2' }} /></IconButton>
                                                        <IconButton size="small" onClick={() => handleDeleteClick(policy)} sx={{ width: 26, height: 26 }}><DeleteIcon sx={{ fontSize: 14, color: '#f44336' }} /></IconButton>
                                                    </Box>
                                                </Box>

                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                    <Box>
                                                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                                            <Typography sx={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a' }}>{policy.daysPerMonth === 0 ? '∞' : policy.daysPerMonth}</Typography>
                                                            <Typography sx={{ fontSize: 11, color: '#999' }}>{policy.daysPerMonth === 0 ? 'on-demand' : 'day(s) / month'}</Typography>
                                                        </Box>
                                                        {policy.daysPerMonth > 0 && policy.allocationPeriod !== 'Monthly' && (
                                                            <Typography sx={{ fontSize: 11, color: '#999', mt: 0.2 }}>= {totalDays} days / {policy.allocationPeriod.toLowerCase()}</Typography>
                                                        )}
                                                    </Box>
                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                        <Chip label={policy.allocationPeriod} size="small" sx={{ fontSize: 10, fontWeight: 600, height: 20, bgcolor: '#fff', color: policy.color, border: `1px solid ${policy.color}40` }} />
                                                        {policy.encashUnused && <Chip label="Encash" size="small" sx={{ fontSize: 10, fontWeight: 600, height: 20, bgcolor: '#fff', color: '#2563EB', border: '1px solid #C9BEFB' }} />}
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </>
                    )}
                </Box>
            </Box>

            {/* ── Add/Edit Dialog ────────────────────────────────────────────── */}
            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: '7px', overflow: 'hidden' } }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, py: 1.5, bgcolor: '#f2f2f2', borderBottom: '1px solid #ddd' }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '16px' }}>
                        {editingPolicy ? 'Edit Leave Type' : 'Add Leave Type'}
                    </Typography>
                    <IconButton size="small" onClick={() => setDialogOpen(false)}>
                        <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Box>

                <Box sx={{ p: 2.5 }}>
                    <Box sx={{ border: '1px solid #CCC', borderRadius: '7px', p: 2.5 }}>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 8, md: 8, lg: 8 }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#555', mb: 0.5 }}>Leave Type Name *</Typography>
                                <TextField
                                    fullWidth size="small"
                                    value={form.name}
                                    onChange={e => ff('name', e.target.value)}
                                    placeholder="e.g., Casual Leave"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 14 } }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4, md: 4, lg: 4 }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#555', mb: 0.5 }}>Short Code *</Typography>
                                <TextField
                                    fullWidth size="small"
                                    value={form.shortCode}
                                    onChange={e => ff('shortCode', e.target.value.toUpperCase().slice(0, 5))}
                                    placeholder="e.g., CL"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 14 } }}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#555', mb: 0.5 }}>Days Per Month</Typography>
                                <TextField
                                    fullWidth size="small" type="number"
                                    value={form.daysPerMonth}
                                    onChange={e => ff('daysPerMonth', Math.max(0, parseInt(e.target.value) || 0))}
                                    slotProps={{ input: { inputProps: { min: 0, step: 1 } } }}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 14 } }}
                                />
                                <Typography sx={{ fontSize: 10, color: '#9CA3AF', mt: 0.3 }}>Set 0 for unlimited / on-demand</Typography>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#555', mb: 0.5 }}>Allocation Period</Typography>
                                <Autocomplete
                                    size="small"
                                    options={ALLOCATION_PERIODS.map(a => a.key)}
                                    value={form.allocationPeriod}
                                    onChange={(_, v) => ff('allocationPeriod', v || 'Monthly')}
                                    renderInput={(params) => (
                                        <TextField {...params} placeholder="Select period"
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 14 } }}
                                        />
                                    )}
                                />
                                {form.daysPerMonth > 0 && form.allocationPeriod !== 'Monthly' && (
                                    <Typography sx={{ fontSize: 10, color: PRIMARY, fontWeight: 600, mt: 0.3 }}>
                                        = {getTotalDaysForPeriod(form.daysPerMonth, form.allocationPeriod)} days per {form.allocationPeriod.toLowerCase()}
                                    </Typography>
                                )}
                            </Grid>

                            {/* Encash Toggle */}
                            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12 }}>
                                <Box sx={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    p: 1.5, borderRadius: '7px',
                                    border: `1px solid ${form.encashUnused ? '#C9BEFB' : '#E5E7EB'}`,
                                    bgcolor: form.encashUnused ? '#F3F0FE' : '#FAFAFA',
                                    transition: '0.2s',
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                        <MonetizationOnIcon sx={{ fontSize: 18, mt: 0.2, flexShrink: 0, color: form.encashUnused ? '#2563EB' : '#999' }} />
                                        <Box>
                                            <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#333' }}>Encash Untaken Days</Typography>
                                            <Typography sx={{ fontSize: 11, color: '#777', mt: 0.2 }}>
                                                {form.encashUnused
                                                    ? 'Untaken days will be added to salary at end of period'
                                                    : 'Untaken days will lapse — not added to salary'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Switch
                                        checked={form.encashUnused}
                                        onChange={e => ff('encashUnused', e.target.checked)}
                                        size="small"
                                        sx={{
                                            flexShrink: 0,
                                            '& .MuiSwitch-switchBase.Mui-checked': { color: '#2563EB' },
                                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#2563EB' },
                                        }}
                                    />
                                </Box>
                            </Grid>

                            {/* Color Tag */}
                            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12 }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#555', mb: 0.8 }}>Color Tag</Typography>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {LEAVE_COLORS.map(c => (
                                        <Box
                                            key={c}
                                            onClick={() => ff('color', c)}
                                            sx={{
                                                width: 24, height: 24, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                                                border: form.color === c ? '3px solid #333' : '3px solid transparent',
                                                transition: '0.15s',
                                                '&:hover': { transform: 'scale(1.15)' },
                                            }}
                                        />
                                    ))}
                                </Box>
                            </Grid>

                            {/* Description */}
                            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12 }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#555', mb: 0.5 }}>Description</Typography>
                                <TextField
                                    fullWidth size="small" multiline rows={2}
                                    value={form.description}
                                    onChange={e => ff('description', e.target.value)}
                                    placeholder="Brief description of when this leave applies"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 13 } }}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'end', px: 2, py: 1.5, borderTop: '1px solid #eee', gap: 1 }}>
                    <Button
                        onClick={() => setDialogOpen(false)}
                        sx={{ border: '1px solid #000', borderRadius: '30px', textTransform: 'none', width: '100px', height: '30px', color: '#000', fontSize: 13, fontWeight: 600 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        sx={{
                            bgcolor: PRIMARY, borderRadius: '30px', textTransform: 'none',
                            px: 3, height: '30px', color: '#fff', fontSize: 13, fontWeight: 600,
                            '&:hover': { bgcolor: PRIMARY_DARK },
                            '&.Mui-disabled': { bgcolor: '#E0E0E0', color: '#aaa' },
                        }}
                    >
                        {isSaving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : editingPolicy ? 'Update' : 'Add Leave Type'}
                    </Button>
                </Box>
            </Dialog>

            {/* ── Delete Dialog ──────────────────────────────────────────────── */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                PaperProps={{ sx: { borderRadius: '7px', minWidth: 380, overflow: 'hidden', border: '1px solid #E5E7EB' } }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 3, py: 1.5, bgcolor: '#f2f2f2', borderBottom: '1px solid #ddd' }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '16px' }}>Delete Leave Type</Typography>
                    <IconButton size="small" onClick={() => setDeleteDialogOpen(false)}>
                        <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Box>
                <Box sx={{ p: 3 }}>
                    <Typography sx={{ fontSize: 13, color: '#555' }}>
                        Are you sure you want to delete <strong>"{deleteTarget?.name}"</strong>? This will remove it from all salary calculations.
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'end', px: 2, py: 1.5, borderTop: '1px solid #eee', gap: 1 }}>
                    <Button
                        onClick={() => setDeleteDialogOpen(false)}
                        sx={{ border: '1px solid #000', borderRadius: '30px', textTransform: 'none', width: '100px', height: '30px', color: '#000', fontSize: 13, fontWeight: 600 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmDelete}
                        sx={{
                            bgcolor: '#DC2626', borderRadius: '30px', textTransform: 'none',
                            px: 3, height: '30px', color: '#fff', fontSize: 13, fontWeight: 600,
                            '&:hover': { bgcolor: '#B91C1C' },
                        }}
                    >
                        Delete
                    </Button>
                </Box>
            </Dialog>
        </>
    );
}
