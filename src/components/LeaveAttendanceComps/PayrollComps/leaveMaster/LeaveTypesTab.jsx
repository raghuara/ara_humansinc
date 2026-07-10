import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Grid, IconButton,
    TextField, Autocomplete, Tooltip,
    Dialog, CircularProgress, Chip,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import PolicyIcon from '@mui/icons-material/Policy';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import AllInclusiveRoundedIcon from '@mui/icons-material/AllInclusiveRounded';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import axios from 'axios';
import { GetleaveTypes, postleavetypes, UpdateleaveTypeByID, DeleteleaveTypeByID } from '../../../../Api/Api';
import {
    PRIMARY, PRIMARY_LIGHT, PRIMARY_DARK, TOKEN,
    FREQUENCY_TO_API, FREQUENCY_FROM_API, UNUSED_ACTION_TO_API, UNUSED_ACTION_FROM_API,
    Section, ToggleRow,
} from './LeaveMasterShared';

const LEAVE_COLORS = [
    '#7C5CFC', '#EF4444', '#9B87FB', '#EC4899', '#06B6D4',
    '#9B87FB', '#F59E0B', '#6B7280', '#FF6B35', '#7C5CFC',
];

const LP_ALLOCATION_PERIODS = [
    { key: 'Monthly', label: 'Monthly', months: 1 },
    { key: 'Quarterly', label: 'Quarterly', months: 3 },
    { key: 'Half-Yearly', label: 'Half-Yearly', months: 6 },
    { key: 'Yearly', label: 'Yearly', months: 12 },
];

const UNUSED_ACTIONS = [
    { key: 'encash', label: 'Encash', desc: 'Credited to salary', color: '#7C5CFC' },
    { key: 'carry_forward', label: 'Carry Forward', desc: 'Added to next period', color: '#6246E0' },
    { key: 'lapse', label: 'Lapse', desc: 'Lost at period end', color: '#DC2626' },
];

const ENCASH_TIMINGS = ['End of Period', 'End of Quarter', 'End of Half-Year', 'End of Year'];

const ENCASH_FORMULAS = [
    { key: 'gross_by_working_days', label: 'Gross / Working Days', hint: 'Salary ÷ working days of the month' },
    { key: 'gross_by_calendar_days', label: 'Gross / Calendar Days', hint: 'Salary ÷ total days in the month' },
    { key: 'gross_by_fixed_days', label: 'Gross / Fixed 30', hint: 'Salary ÷ 30 (fixed)' },
];

const emptyLeaveForm = {
    name: '',
    shortCode: '',
    color: '#7C5CFC',
    description: '',
    daysPerPeriod: 12,
    allocationPeriod: 'Yearly',
    advanceUsageAllowed: true,
    maxPerMonth: 0,
    unusedLeaveAction: 'lapse',
    encashmentTiming: 'End of Period',
    encashmentFormula: 'gross_by_working_days',
    blockContinuousLeave: false,   // block any back-to-back leave with off-days or other leaves
    requiresDocument: false,       // user must upload a supporting doc when applying
    documentHint: '',              // free-text hint shown to user (e.g., "Medical certificate")
};

const getMonthsInPeriod = (period) => {
    const p = LP_ALLOCATION_PERIODS.find(a => a.key === period);
    return p?.months || 1;
};

const getEffectiveTotalDays = (p) => Number(p?.daysPerPeriod) || 0;

const isOnDemandPolicy = (p) => Number(p?.daysPerPeriod) === 0;

const getMonthlyEquivalent = (p) => {
    const months = getMonthsInPeriod(p?.allocationPeriod);
    if (!months) return 0;
    return (Number(p?.daysPerPeriod) || 0) / months;
};

const getPeriodLabel = (period) => {
    if (period === 'Monthly') return 'month';
    if (period === 'Quarterly') return 'quarter';
    if (period === 'Half-Yearly') return 'half-year';
    return 'year';
};

export default function LeaveTypesTab({ academicYear, authUser, showSnack }) {
    const [policies, setPolicies] = useState([]);
    const [isLoadingPolicies, setIsLoadingPolicies] = useState(false);
    const [isSavingPolicy, setIsSavingPolicy] = useState(false);
    const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
    const [deletePolicyDialogOpen, setDeletePolicyDialogOpen] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState(null);
    const [policyForm, setPolicyForm] = useState(emptyLeaveForm);
    const [policyErrors, setPolicyErrors] = useState({});
    const [deletePolicyTarget, setDeletePolicyTarget] = useState(null);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeletingPolicy, setIsDeletingPolicy] = useState(false);
    const [policyStats, setPolicyStats] = useState({
        totalLeaveTypes: 0,
        totalDaysPerMonth: 0,
        onDemandUnlimited: 0,
        encashableLeaveTypes: 0,
    });

    const ffPolicy = (key, value) => {
        setPolicyForm(prev => ({ ...prev, [key]: value }));
        if (policyErrors[key]) {
            setPolicyErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
        }
    };

    const validatePolicyForm = () => {
        const e = {};
        const name = policyForm.name.trim();
        const code = policyForm.shortCode.trim();
        if (!name) e.name = 'Leave type name is required';
        else if (name.length < 2) e.name = 'Name must be at least 2 characters';
        if (!code) e.shortCode = 'Short code is required';
        else if (code.length < 2) e.shortCode = 'Short code must be at least 2 characters';
        const dpp = Number(policyForm.daysPerPeriod);
        if (isNaN(dpp) || dpp < 0) e.daysPerPeriod = 'Number of days cannot be negative';
        else if (dpp > 366) e.daysPerPeriod = 'Number of days seems too high';
        const cap = Number(policyForm.maxPerMonth);
        if (isNaN(cap) || cap < 0) e.maxPerMonth = 'Monthly cap cannot be negative';
        else if (cap > 31) e.maxPerMonth = 'Monthly cap cannot exceed 31';
        else if (cap > 0 && dpp > 0 && cap > dpp) e.maxPerMonth = `Cannot exceed total (${dpp})`;
        const dupName = policies.find(p => p.name.trim().toLowerCase() === name.toLowerCase() && p.id !== editingPolicy?.id);
        const dupCode = policies.find(p => p.shortCode.trim().toLowerCase() === code.toLowerCase() && p.id !== editingPolicy?.id);
        if (dupName && !e.name) e.name = 'A leave type with this name already exists';
        if (dupCode && !e.shortCode) e.shortCode = 'A leave type with this short code already exists';
        setPolicyErrors(e);
        return Object.keys(e).length === 0;
    };

    const fetchLeavePolicies = async (year) => {
        const ay = year || academicYear;
        if (!ay) return;
        setIsLoadingPolicies(true);
        try {
            const res = await axios.get(GetleaveTypes, {
                params: { academicYear: ay },
                headers: { Authorization: `Bearer ${TOKEN}` },
            });
            if (res?.data && res.data.error === false && res.data.data) {
                const d = res.data.data;
                const summary = d.summary || {};
                setPolicyStats({
                    totalLeaveTypes: Number(summary.totalTypes) || 0,
                    totalDaysPerMonth: Number(summary.daysPerMonth) || 0,
                    onDemandUnlimited: Number(summary.onDemand) || 0,
                    encashableLeaveTypes: Number(summary.encashable) || 0,
                });
                setPolicies((d.items || []).map(lt => ({
                    id: lt.id,
                    name: lt.name || '',
                    shortCode: lt.shortCode || '',
                    color: lt.colorTag || '#7C5CFC',
                    description: lt.description || '',
                    daysPerPeriod: Number(lt.numberOfDays) || 0,
                    allocationPeriod: FREQUENCY_FROM_API[lt.allocationPeriod] || lt.allocationPeriod || 'Yearly',
                    advanceUsageAllowed: !!lt.advanceUsageAllowed,
                    maxPerMonth: Number(lt.maxDaysPerMonth) || 0,
                    unusedLeaveAction: UNUSED_ACTION_FROM_API[lt.unusedAction] || 'lapse',
                    blockContinuousLeave: !!lt.BlockContinuousLeave,
                    requiresDocument: !!lt.requireSupportingDocument,
                    encashmentTiming: 'End of Period',
                    encashmentFormula: 'gross_by_working_days',
                    documentHint: '',
                    academicYear: lt.academicYear || ay,
                    isActive: lt.isActive !== false,
                    monthlyEquivalent: Number(lt.monthlyEquivalent) || 0,
                    createdBy: lt.createdBy || null,
                    createdOn: lt.createdOn || null,
                    updatedBy: lt.updatedBy || null,
                    updatedOn: lt.updatedOn || null,
                })));
            } else if (res?.data && res.data.error) {
                setPolicies([]);
                setPolicyStats({ totalLeaveTypes: 0, totalDaysPerMonth: 0, onDemandUnlimited: 0, encashableLeaveTypes: 0 });
            } else {
                setPolicies([]);
                setPolicyStats({ totalLeaveTypes: 0, totalDaysPerMonth: 0, onDemandUnlimited: 0, encashableLeaveTypes: 0 });
            }
        } catch (err) {
            if (err?.response?.status === 404) {
                setPolicies([]);
                setPolicyStats({ totalLeaveTypes: 0, totalDaysPerMonth: 0, onDemandUnlimited: 0, encashableLeaveTypes: 0 });
            } else {
                console.error('GetleaveTypes failed:', err);
                showSnack('Failed to load leave types', false);
            }
        } finally {
            setIsLoadingPolicies(false);
        }
    };

    useEffect(() => {
        fetchLeavePolicies(academicYear);
    }, [academicYear]);

    const handleAddPolicy = () => {
        setEditingPolicy(null);
        setPolicyForm({ ...emptyLeaveForm });
        setPolicyErrors({});
        setPolicyDialogOpen(true);
    };

    const handleEditPolicy = (policy) => {
        setEditingPolicy(policy);
        setPolicyForm({ ...emptyLeaveForm, ...policy });
        setPolicyErrors({});
        setPolicyDialogOpen(true);
    };

    const handleDeletePolicyClick = (policy) => {
        setDeletePolicyTarget(policy);
        setDeleteConfirmText('');
        setDeletePolicyDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        if (isDeletingPolicy) return;
        setDeletePolicyDialogOpen(false);
        setDeletePolicyTarget(null);
        setDeleteConfirmText('');
    };

    const handleConfirmDeletePolicy = async () => {
        if (!deletePolicyTarget?.id) return;
        if (deleteConfirmText !== 'delete') {
            showSnack('Type the word "delete" to confirm.', false);
            return;
        }
        if (!authUser?.rollNumber) {
            showSnack('Cannot delete: no logged-in user found.', false);
            return;
        }

        setIsDeletingPolicy(true);
        try {
            const url = `${DeleteleaveTypeByID}/${deletePolicyTarget.id}`;
            const res = await axios.delete(url, {
                params: { updatedByRollNumber: authUser.rollNumber },
                headers: { Authorization: `Bearer ${TOKEN}` },
            });
            const ok = !res?.data || res.data.error === false;
            if (ok) {
                showSnack(
                    res?.data?.message || `"${deletePolicyTarget.name}" deleted successfully.`,
                    true
                );
                setDeletePolicyDialogOpen(false);
                setDeletePolicyTarget(null);
                setDeleteConfirmText('');
                fetchLeavePolicies();
            } else {
                showSnack(res?.data?.message || 'Failed to delete leave type', false);
            }
        } catch (err) {
            console.error('DeleteleaveTypeByID failed:', err);
            const apiMsg = err?.response?.data?.message;
            showSnack(apiMsg || 'Failed to delete leave type. Please try again.', false);
        } finally {
            setIsDeletingPolicy(false);
        }
    };

    const handleSavePolicy = async () => {
        if (!validatePolicyForm()) {
            showSnack('Please correct the highlighted fields', false);
            return;
        }
        if (!authUser?.rollNumber) {
            showSnack('Cannot save: no logged-in user found.', false);
            return;
        }

        const body = {
            academicYear,
            name: policyForm.name.trim(),
            shortCode: policyForm.shortCode.trim().toUpperCase(),
            colorTag: policyForm.color,
            description: policyForm.description?.trim() || '',
            allocationPeriod: FREQUENCY_TO_API[policyForm.allocationPeriod] || 'Yearly',
            numberOfDays: Number(policyForm.daysPerPeriod) || 0,
            maxDaysPerMonth: Number(policyForm.maxPerMonth) || 0,
            unusedAction: UNUSED_ACTION_TO_API[policyForm.unusedLeaveAction] || 'Lapse',
            BlockContinuousLeave: !!policyForm.blockContinuousLeave,
            requireSupportingDocument: !!policyForm.requiresDocument,
            updatedByRollNumber: authUser.rollNumber,
        };

        setIsSavingPolicy(true);
        try {
            const isEdit = !!editingPolicy?.id;
            const res = isEdit
                ? await axios.put(`${UpdateleaveTypeByID}/${editingPolicy.id}`, body, {
                    headers: { Authorization: `Bearer ${TOKEN}` },
                })
                : await axios.post(postleavetypes, body, {
                    headers: { Authorization: `Bearer ${TOKEN}` },
                });
            const ok = !res?.data || res.data.error === false;
            if (ok) {
                showSnack(
                    res?.data?.message
                    || (isEdit ? 'Leave type updated successfully!' : 'Leave type added successfully!'),
                    true
                );
                setPolicyDialogOpen(false);
                fetchLeavePolicies();
            } else {
                showSnack(res?.data?.message || 'Failed to save leave type', false);
            }
        } catch (err) {
            console.error('Save leave type failed:', err);
            const apiMsg = err?.response?.data?.message;
            showSnack(
                apiMsg
                || (editingPolicy ? 'Failed to update leave type.' : 'Failed to add leave type.'),
                false
            );
        } finally {
            setIsSavingPolicy(false);
        }
    };

    return (
        <>
            <Section icon={PolicyIcon} title="Leave Policy & Allocation" color={PRIMARY}
                subtitle="Create each leave type with its own allocation period, accrual, end-of-period action, and deduction rule">

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAddPolicy}
                        sx={{
                            textTransform: 'none', bgcolor: PRIMARY, color: '#fff', borderRadius: '7px',
                            fontSize: '13px', fontWeight: 700, px: 2.2, height: 40, boxShadow: 'none',
                            '& .MuiButton-startIcon': { color: '#fff' },
                            '&:hover': { bgcolor: PRIMARY_DARK, color: '#fff', boxShadow: 'none' },
                        }}
                    >
                        Add Leave Type
                    </Button>
                </Box>

                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                    {[
                        { label: 'Total Types', value: policyStats.totalLeaveTypes, sub: 'Configured', icon: CategoryRoundedIcon, color: '#7C5CFC', bg: '#F1EEFE' },
                        { label: 'Days / Month', value: `${policyStats.totalDaysPerMonth}d`, sub: 'Combined accrual', icon: EventAvailableRoundedIcon, color: '#16A34A', bg: '#DCFCE7' },
                        { label: 'On-Demand', value: policyStats.onDemandUnlimited, sub: 'Unlimited types', icon: AllInclusiveRoundedIcon, color: '#F59E0B', bg: '#FFF7ED' },
                        { label: 'Encashable', value: policyStats.encashableLeaveTypes, sub: 'Paid on unused', icon: PaidRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE' },
                    ].map((s, i) => (
                        <Grid size={{ xs: 6, md: 3 }} key={i}>
                            <Box sx={{
                                p: 2, borderRadius: '7px', bgcolor: s.bg, border: `1px solid ${s.color}22`,
                                boxShadow: '0 1px 3px rgba(16,24,40,0.06)', height: '100%',
                                transition: 'transform .18s, box-shadow .18s',
                                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 20px ${s.color}22` },
                            }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</Typography>
                                        <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#0F172A', mt: 0.3, lineHeight: 1.1 }}>{s.value}</Typography>
                                        <Typography sx={{ fontSize: 10.5, color: '#6B7280', mt: 0.2 }}>{s.sub}</Typography>
                                    </Box>
                                    <Box sx={{ width: 40, height: 40, borderRadius: '7px', bgcolor: '#fff', boxShadow: '0 1px 3px rgba(16,24,40,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <s.icon sx={{ color: s.color, fontSize: 20 }} />
                                    </Box>
                                </Box>
                            </Box>
                        </Grid>
                    ))}
                </Grid>

                <Box sx={{
                    mb: 2, p: 1.5, borderRadius: '7px',
                    bgcolor: '#E0F2FE', border: '1px solid #BAE6FD',
                    display: 'flex', alignItems: 'flex-start', gap: 1,
                }}>
                    <InfoOutlinedIcon sx={{ fontSize: 16, color: '#F59E0B', mt: 0.2, flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 11, color: '#78350F', lineHeight: 1.7 }}>
                        Each leave type defines its <strong>allocation period</strong> (Monthly / Quarterly / Half-Yearly / Yearly),
                        its accrual rate (<strong>days per month</strong>), and an <strong>end-of-period action</strong> for unused days
                        (Encash / Carry Forward / Lapse). Set <strong>0</strong> days for on-demand leaves.
                        Salary will be deducted for any leave taken beyond the allocation when the deduction rule is on.
                    </Typography>
                </Box>

                {isLoadingPolicies ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                        <CircularProgress size={28} sx={{ color: PRIMARY }} />
                    </Box>
                ) : policies.length === 0 ? (
                    <Box sx={{
                        textAlign: 'center', py: 4, borderRadius: '7px',
                        border: '1px dashed #D1D5DB', bgcolor: '#FAFAFA',
                    }}>
                        <Typography sx={{ fontSize: '13px', color: '#888', mb: 1 }}>
                            No leave types created yet
                        </Typography>
                        <Button size="small" variant="outlined" startIcon={<AddIcon />}
                            onClick={handleAddPolicy}
                            sx={{
                                textTransform: 'none', fontSize: '12px', fontWeight: 600, borderRadius: '30px',
                                borderColor: PRIMARY, color: PRIMARY,
                                '&:hover': { borderColor: PRIMARY_DARK, bgcolor: PRIMARY_LIGHT },
                            }}>
                            Create your first leave type
                        </Button>
                    </Box>
                ) : (
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, minmax(0, 1fr))',
                            md: 'repeat(2, minmax(0, 1fr))',
                            lg: 'repeat(3, minmax(0, 1fr))',
                        },
                        gap: 2,
                        alignItems: 'stretch',
                    }}>
                        {policies.map(policy => {
                            const isOnDemand = isOnDemandPolicy(policy);
                            const totalDays = getEffectiveTotalDays(policy);
                            const action = UNUSED_ACTIONS.find(a => a.key === policy.unusedLeaveAction) || UNUSED_ACTIONS[2];
                            return (
                                <Box key={policy.id} sx={{
                                    border: `1px solid ${policy.color}40`,
                                    borderTop: `3px solid ${policy.color}`,
                                    borderRadius: '7px',
                                    bgcolor: '#fff', p: 2,
                                    display: 'flex', flexDirection: 'column',
                                    minHeight: 200, boxSizing: 'border-box',
                                    transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                                    '&:hover': { borderColor: policy.color, boxShadow: `0 6px 16px ${policy.color}25`, transform: 'translateY(-2px)' },
                                }}>
                                    <Box sx={{
                                        display: 'flex', justifyContent: 'space-between',
                                        alignItems: 'flex-start', mb: 1.5, gap: 1,
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                                            <Box sx={{
                                                width: 38, height: 38, borderRadius: '7px',
                                                bgcolor: `${policy.color}15`, flexShrink: 0,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: `1.5px solid ${policy.color}40`,
                                            }}>
                                                <Typography sx={{ fontSize: 12, fontWeight: 900, color: policy.color }}>
                                                    {policy.shortCode}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {policy.name}
                                                </Typography>
                                                {policy.description && (
                                                    <Typography sx={{ fontSize: 11, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {policy.description}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                                            <Tooltip title="Edit" arrow>
                                                <IconButton size="small" onClick={() => handleEditPolicy(policy)} sx={{ width: 26, height: 26 }}>
                                                    <EditIcon sx={{ fontSize: 14, color: '#1976D2' }} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete" arrow>
                                                <IconButton size="small" onClick={() => handleDeletePolicyClick(policy)} sx={{ width: 26, height: 26 }}>
                                                    <DeleteIcon sx={{ fontSize: 14, color: '#f44336' }} />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Box>

                                    <Box sx={{
                                        p: 1.2, borderRadius: '7px', mb: 1.2,
                                        bgcolor: `${policy.color}08`,
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    }}>
                                        <Box>
                                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                                                <Typography sx={{ fontSize: 22, fontWeight: 800, color: policy.color, lineHeight: 1 }}>
                                                    {isOnDemand ? '∞' : totalDays}
                                                </Typography>
                                                <Typography sx={{ fontSize: 11, color: '#666', fontWeight: 600 }}>
                                                    {isOnDemand ? 'on-demand' : `day(s) / ${getPeriodLabel(policy.allocationPeriod)}`}
                                                </Typography>
                                            </Box>
                                            {!isOnDemand && policy.allocationPeriod !== 'Monthly' && (
                                                <Typography sx={{ fontSize: 10, color: '#666', mt: 0.3, fontStyle: 'italic' }}>
                                                    {policy.advanceUsageAllowed
                                                        ? 'Lump sum — available from day 1'
                                                        : 'Accrues monthly across the period'}
                                                </Typography>
                                            )}
                                        </Box>
                                        <Chip label={policy.allocationPeriod} size="small"
                                            sx={{ fontSize: 10, fontWeight: 700, height: 22, bgcolor: '#fff', color: policy.color, border: `1px solid ${policy.color}40` }} />
                                    </Box>

                                    <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography sx={{ fontSize: 11, color: '#666' }}>End of period:</Typography>
                                            <Chip label={action.label} size="small"
                                                sx={{ fontSize: 10, fontWeight: 700, height: 20, bgcolor: `${action.color}15`, color: action.color, border: `1px solid ${action.color}40` }} />
                                        </Box>
                                        {policy.unusedLeaveAction === 'encash' && (
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography sx={{ fontSize: 11, color: '#666' }}>Credited:</Typography>
                                                <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#333' }}>{policy.encashmentTiming}</Typography>
                                            </Box>
                                        )}

                                        {(policy.blockContinuousLeave || policy.requiresDocument || Number(policy.maxPerMonth) > 0) && (
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.4 }}>
                                                {Number(policy.maxPerMonth) > 0 && (
                                                    <Chip
                                                        label={`Max ${policy.maxPerMonth}/month`}
                                                        size="small"
                                                        sx={{
                                                            height: 20, fontSize: 10, fontWeight: 700,
                                                            bgcolor: '#ECFEFF', color: '#155E75',
                                                            border: '1px solid #A5F3FC',
                                                        }}
                                                    />
                                                )}
                                                {policy.blockContinuousLeave && (
                                                    <Chip
                                                        label="Continuous Leave blocked"
                                                        size="small"
                                                        sx={{
                                                            height: 20, fontSize: 10, fontWeight: 700,
                                                            bgcolor: '#FEF3C7', color: '#92400E',
                                                            border: '1px solid #BAE6FD',
                                                        }}
                                                    />
                                                )}
                                                {policy.requiresDocument && (
                                                    <Chip
                                                        label="Document required"
                                                        size="small"
                                                        sx={{
                                                            height: 20, fontSize: 10, fontWeight: 700,
                                                            bgcolor: '#EEF2FF', color: '#4338CA',
                                                            border: '1px solid #C7D2FE',
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </Section>

            <Dialog
                open={policyDialogOpen}
                onClose={() => setPolicyDialogOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{ sx: { borderRadius: '7px', overflow: 'hidden' } }}
            >
                <Box sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    px: 2.5, py: 1.5, bgcolor: PRIMARY_LIGHT, borderBottom: `1px solid ${PRIMARY}30`,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        <Box sx={{
                            width: 36, height: 36, borderRadius: '7px', flexShrink: 0,
                            bgcolor: `${PRIMARY}1A`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <PolicyIcon sx={{ fontSize: 20, color: PRIMARY }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: '16px', color: '#1a1a1a', lineHeight: 1.2 }}>
                                {editingPolicy ? 'Edit Leave Type' : 'Add Leave Type'}
                            </Typography>
                            <Typography sx={{ fontSize: '11px', color: '#6B7280' }}>
                                Set allocation, accrual, end-of-period action & special rules
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton size="small" onClick={() => setPolicyDialogOpen(false)}>
                        <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Box>

                <Box sx={{ p: 2.5, maxHeight: '75vh', overflowY: 'auto' }}>

                    <Box sx={{ border: '1px solid #E5E7EB', borderRadius: '7px', p: 2, mb: 2 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: PRIMARY, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Leave Type Identity
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 8, md: 8, lg: 8 }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#555', mb: 0.5 }}>Leave Type Name *</Typography>
                                <TextField
                                    fullWidth size="small"
                                    value={policyForm.name}
                                    onChange={e => ffPolicy('name', e.target.value)}
                                    placeholder="e.g., Casual Leave"
                                    error={!!policyErrors.name}
                                    helperText={policyErrors.name || ' '}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 14 }, '& .MuiFormHelperText-root': { fontSize: 10, ml: 0 } }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4, md: 4, lg: 4 }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#555', mb: 0.5 }}>Short Code *</Typography>
                                <TextField
                                    fullWidth size="small"
                                    value={policyForm.shortCode}
                                    onChange={e => ffPolicy('shortCode', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
                                    placeholder="e.g., CL"
                                    error={!!policyErrors.shortCode}
                                    helperText={policyErrors.shortCode || 'Up to 5 chars (A-Z, 0-9)'}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 14 }, '& .MuiFormHelperText-root': { fontSize: 10, ml: 0 } }}
                                />
                            </Grid>

                            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12 }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#555', mb: 0.8 }}>Color Tag</Typography>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {LEAVE_COLORS.map(c => (
                                        <Box key={c} onClick={() => ffPolicy('color', c)}
                                            sx={{
                                                width: 24, height: 24, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                                                border: policyForm.color === c ? '3px solid #333' : '3px solid transparent',
                                                transition: '0.15s',
                                                '&:hover': { transform: 'scale(1.15)' },
                                            }}
                                        />
                                    ))}
                                </Box>
                            </Grid>

                            <Grid size={{ xs: 12, sm: 12, md: 12, lg: 12 }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#555', mb: 0.5 }}>Description</Typography>
                                <TextField
                                    fullWidth size="small" multiline rows={2}
                                    value={policyForm.description}
                                    onChange={e => ffPolicy('description', e.target.value)}
                                    placeholder="Brief description of when this leave applies"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 13 } }}
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    <Box sx={{ border: '1px solid #E5E7EB', borderRadius: '7px', p: 2, mb: 2 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: PRIMARY, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            How is leave allocated?
                        </Typography>

                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#555', mb: 1 }}>
                            Allocation Period
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                            {LP_ALLOCATION_PERIODS.map(opt => {
                                const desc = { Monthly: 'Resets every month', Quarterly: 'Resets every 3 months', 'Half-Yearly': 'Resets every 6 months', Yearly: 'Resets every year' }[opt.key];
                                const isSelected = policyForm.allocationPeriod === opt.key;
                                return (
                                    <Box
                                        key={opt.key}
                                        onClick={() => ffPolicy('allocationPeriod', opt.key)}
                                        sx={{
                                            px: 2, py: 1, borderRadius: '7px', cursor: 'pointer',
                                            border: `2px solid ${isSelected ? PRIMARY : '#E5E7EB'}`,
                                            bgcolor: isSelected ? PRIMARY_LIGHT : '#FAFAFA',
                                            transition: '0.2s',
                                            minWidth: 140, flex: 1,
                                            '&:hover': { borderColor: isSelected ? PRIMARY : '#7FB4FF' },
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                            <Box sx={{
                                                width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                                                border: `2px solid ${isSelected ? PRIMARY : '#D1D5DB'}`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                {isSelected && <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: PRIMARY }} />}
                                            </Box>
                                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: isSelected ? PRIMARY_DARK : '#333' }}>
                                                {opt.label}
                                            </Typography>
                                        </Box>
                                        <Typography sx={{ fontSize: 11, color: '#777', mt: 0.3, ml: 2.8 }}>{desc}</Typography>
                                    </Box>
                                );
                            })}
                        </Box>

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#555', mb: 0.5 }}>
                                    Number of Days <span style={{ color: '#DC2626' }}>*</span>
                                </Typography>
                                <TextField
                                    fullWidth size="small" type="number"
                                    value={policyForm.daysPerPeriod}
                                    onChange={e => {
                                        const newDays = Math.max(0, parseInt(e.target.value) || 0);
                                        setPolicyForm(prev => ({
                                            ...prev,
                                            daysPerPeriod: newDays,
                                            maxPerMonth: (newDays > 0 && Number(prev.maxPerMonth) > newDays)
                                                ? newDays
                                                : prev.maxPerMonth,
                                        }));
                                        setPolicyErrors(prev => ({ ...prev, daysPerPeriod: undefined, maxPerMonth: undefined }));
                                    }}
                                    error={!!policyErrors.daysPerPeriod}
                                    helperText={
                                        policyErrors.daysPerPeriod
                                        || `Per ${getPeriodLabel(policyForm.allocationPeriod)} · set 0 for unlimited / on-demand`
                                    }
                                    slotProps={{ input: { inputProps: { min: 0, max: 366, step: 1 } } }}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 14 }, '& .MuiFormHelperText-root': { fontSize: 10, ml: 0, minHeight: 14 } }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
                                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#555', mb: 0.5 }}>
                                    Monthly Equivalent <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>(reference)</span>
                                </Typography>
                                <Box sx={{
                                    height: 40, px: 1.5, borderRadius: '7px',
                                    border: '1px solid #E5E7EB', bgcolor: PRIMARY_LIGHT,
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                }}>
                                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: PRIMARY_DARK }}>
                                        {isOnDemandPolicy(policyForm)
                                            ? 'Unlimited'
                                            : `${getMonthlyEquivalent(policyForm).toFixed(2)} day(s) / month`}
                                    </Typography>
                                </Box>
                                <Typography sx={{ fontSize: 10, color: '#9CA3AF', mt: 0.4 }}>
                                    Auto-calculated from period & total days
                                </Typography>
                            </Grid>
                        </Grid>

                        {policyForm.allocationPeriod !== 'Monthly' && Number(policyForm.daysPerPeriod) > 1 && (
                            <Grid container spacing={2} sx={{ mt: 0 }}>
                                <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
                                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#555', mb: 0.5 }}>
                                        Max Days Per Month <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>(optional)</span>
                                    </Typography>
                                    <TextField
                                        fullWidth size="small" type="number"
                                        value={policyForm.maxPerMonth}
                                        onChange={e => {
                                            const raw = Math.max(0, parseInt(e.target.value) || 0);
                                            const totalDays = Number(policyForm.daysPerPeriod) || 0;
                                            const clamped = totalDays > 0 ? Math.min(raw, totalDays, 31) : Math.min(raw, 31);
                                            ffPolicy('maxPerMonth', clamped);
                                            if (policyErrors.maxPerMonth) {
                                                setPolicyErrors(prev => ({ ...prev, maxPerMonth: undefined }));
                                            }
                                        }}
                                        error={!!policyErrors.maxPerMonth}
                                        helperText={
                                            policyErrors.maxPerMonth
                                            || (Number(policyForm.maxPerMonth) > 0
                                                ? `At most ${policyForm.maxPerMonth} day(s) usable in any single month (max allowed: ${Number(policyForm.daysPerPeriod) || 31})`
                                                : `Set 0 to allow using all allocated days in one month (max allowed: ${Number(policyForm.daysPerPeriod) || 31})`)
                                        }
                                        slotProps={{ input: { inputProps: { min: 0, max: Number(policyForm.daysPerPeriod) > 0 ? Math.min(Number(policyForm.daysPerPeriod), 31) : 31, step: 1 } } }}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 14 }, '& .MuiFormHelperText-root': { fontSize: 10, ml: 0 } }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
                                    <Box sx={{
                                        p: 1.2, borderRadius: '7px',
                                        border: `1px dashed ${Number(policyForm.maxPerMonth) > 0 ? '#BAE6FD' : '#E5E7EB'}`,
                                        bgcolor: Number(policyForm.maxPerMonth) > 0 ? '#E0F2FE' : '#FAFAFA',
                                    }}>
                                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: Number(policyForm.maxPerMonth) > 0 ? '#92400E' : '#6B7280', mb: 0.3 }}>
                                            Why use a monthly cap?
                                        </Typography>
                                        <Typography sx={{ fontSize: 10, color: Number(policyForm.maxPerMonth) > 0 ? '#92400E' : '#6B7280', lineHeight: 1.5 }}>
                                            Spreads leaves across the {getPeriodLabel(policyForm.allocationPeriod)}. e.g. <strong>6 / year + max 3 / month</strong> means once 3 are used in a month, only the remaining balance carries to other months.
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        )}

                        {!isOnDemandPolicy(policyForm) && (
                            <Box sx={{
                                mt: 2, p: 1.2, borderRadius: '7px', borderLeft: `3px solid ${PRIMARY}`,
                                bgcolor: PRIMARY_LIGHT,
                            }}>
                                <Typography sx={{ fontSize: 11, color: PRIMARY_DARK, lineHeight: 1.7 }}>
                                    <strong>{policyForm.daysPerPeriod}</strong> day(s) per <strong>{getPeriodLabel(policyForm.allocationPeriod)}</strong>
                                    {policyForm.allocationPeriod !== 'Monthly' && (
                                        <> — {policyForm.advanceUsageAllowed
                                            ? <>all <strong>available from day 1</strong></>
                                            : <>days <strong>accrue gradually</strong> across the {getPeriodLabel(policyForm.allocationPeriod)}</>}
                                        </>
                                    )}
                                    {Number(policyForm.maxPerMonth) > 0 && (
                                        <> · capped at <strong>{policyForm.maxPerMonth} per month</strong></>
                                    )}
                                    . Counter resets at the end of each {getPeriodLabel(policyForm.allocationPeriod)}.
                                </Typography>
                            </Box>
                        )}
                    </Box>

                    {!isOnDemandPolicy(policyForm) && (
                        <Box sx={{ border: '1px solid #E5E7EB', borderRadius: '7px', p: 2, mb: 2 }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: PRIMARY, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                What happens to unused leave?
                            </Typography>

                            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
                                {UNUSED_ACTIONS.map(opt => {
                                    const isSelected = policyForm.unusedLeaveAction === opt.key;
                                    return (
                                        <Box
                                            key={opt.key}
                                            onClick={() => ffPolicy('unusedLeaveAction', opt.key)}
                                            sx={{
                                                px: 2, py: 1, borderRadius: '7px', cursor: 'pointer',
                                                border: `2px solid ${isSelected ? opt.color : '#E5E7EB'}`,
                                                bgcolor: isSelected ? `${opt.color}10` : '#FAFAFA',
                                                transition: '0.2s',
                                                minWidth: 160, flex: 1,
                                                '&:hover': { borderColor: opt.color },
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Box sx={{
                                                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0, mt: '2px',
                                                    border: `2px solid ${isSelected ? opt.color : '#D1D5DB'}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    {isSelected && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: opt.color }} />}
                                                </Box>
                                                <Box>
                                                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: isSelected ? opt.color : '#333' }}>
                                                        {opt.label}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: 11, color: '#777', mt: 0.2 }}>{opt.desc}</Typography>
                                                </Box>
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Box>

                            {policyForm.unusedLeaveAction === 'encash' && (
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
                                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#555', mb: 0.5 }}>When is encashment credited?</Typography>
                                        <Autocomplete
                                            size="small"
                                            options={ENCASH_TIMINGS}
                                            value={policyForm.encashmentTiming}
                                            onChange={(_, v) => ffPolicy('encashmentTiming', v || 'End of Period')}
                                            disableClearable
                                            renderInput={(params) => (
                                                <TextField {...params} placeholder="Select"
                                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 14 } }}
                                                />
                                            )}
                                        />
                                        <Typography sx={{ fontSize: 10, color: '#9CA3AF', mt: 0.3 }}>Unused days credited to salary at this time</Typography>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
                                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#555', mb: 0.5 }}>Encashment Formula</Typography>
                                        <Autocomplete
                                            size="small"
                                            options={ENCASH_FORMULAS}
                                            getOptionLabel={(opt) => opt.label || ''}
                                            value={ENCASH_FORMULAS.find(f => f.key === policyForm.encashmentFormula) || ENCASH_FORMULAS[0]}
                                            onChange={(_, v) => ffPolicy('encashmentFormula', v?.key || 'gross_by_working_days')}
                                            isOptionEqualToValue={(o, v) => o.key === v.key}
                                            disableClearable
                                            renderInput={(params) => (
                                                <TextField {...params} placeholder="Select formula"
                                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 14 } }}
                                                />
                                            )}
                                        />
                                        <Typography sx={{ fontSize: 10, color: '#9CA3AF', mt: 0.3 }}>
                                            {ENCASH_FORMULAS.find(f => f.key === policyForm.encashmentFormula)?.hint || ''}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            )}
                        </Box>
                    )}

                    <Box sx={{ border: '1px solid #E5E7EB', borderRadius: '7px', p: 2, mb: 2 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: PRIMARY, mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Special Rules
                        </Typography>

                        <Box sx={{ mb: 1.5 }}>
                            <ToggleRow
                                label="Continuous Leave — block any back-to-back leave"
                                description="Leave can only be taken as a single, standalone working day. The day before and the day after cannot be a holiday, weekend, or another leave — blocking every form of continuous / sandwich leave."
                                checked={policyForm.blockContinuousLeave}
                                onChange={(v) => ffPolicy('blockContinuousLeave', v)}
                            />
                            {policyForm.blockContinuousLeave && (
                                <Box sx={{
                                    mt: 1, ml: 2, p: 1.2, borderRadius: '7px',
                                    borderLeft: `3px solid ${PRIMARY}`, bgcolor: PRIMARY_LIGHT,
                                }}>
                                    <Typography sx={{ fontSize: 11, color: PRIMARY_DARK, lineHeight: 1.6 }}>
                                        <strong>Example:</strong> If Saturday & Sunday are off, this leave cannot be applied for Friday (would extend weekend) or Monday (would extend weekend) — only Tue / Wed / Thu would be allowed. Same rule blocks taking leave next to another approved leave.
                                    </Typography>
                                </Box>
                            )}
                        </Box>

                        <Box>
                            <ToggleRow
                                label="Require supporting document"
                                description="User must upload a document (e.g., medical certificate) when applying for this leave."
                                checked={policyForm.requiresDocument}
                                onChange={(v) => ffPolicy('requiresDocument', v)}
                            />
                            {policyForm.requiresDocument && (
                                <Box sx={{ mt: 1.2 }}>
                                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#555', mb: 0.5 }}>
                                        Document Hint <span style={{ color: '#9CA3AF', fontWeight: 500 }}>(shown to user)</span>
                                    </Typography>
                                    <TextField
                                        fullWidth size="small"
                                        value={policyForm.documentHint}
                                        onChange={(e) => ffPolicy('documentHint', e.target.value)}
                                        placeholder="e.g., Upload a medical certificate signed by a registered doctor"
                                        slotProps={{ htmlInput: { maxLength: 200 } }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 13 },
                                        }}
                                    />
                                    <Typography sx={{ fontSize: 10, color: '#9CA3AF', mt: 0.4 }}>
                                        Up to 200 characters. Leave blank to use the default prompt "Upload supporting document".
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>

                    <Box sx={{
                        p: 2, borderRadius: '7px',
                        bgcolor: PRIMARY_LIGHT, border: `1px solid ${policyForm.color}40`,
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Box sx={{
                                width: 28, height: 28, borderRadius: '7px',
                                bgcolor: `${policyForm.color}20`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: `1px solid ${policyForm.color}40`,
                            }}>
                                <Typography sx={{ fontSize: 10, fontWeight: 900, color: policyForm.color }}>
                                    {policyForm.shortCode || '—'}
                                </Typography>
                            </Box>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: PRIMARY_DARK }}>
                                {policyForm.name || 'Leave Type'} — Policy Summary
                            </Typography>
                        </Box>
                        <Typography sx={{ fontSize: 11, color: '#1E4C9A', lineHeight: 1.9 }}>
                            {isOnDemandPolicy(policyForm) ? (
                                <>• <strong>Unlimited / On-demand</strong> — accrual is not tracked</>
                            ) : (
                                <>
                                    • <strong>{policyForm.daysPerPeriod}</strong> day(s) per <strong>{getPeriodLabel(policyForm.allocationPeriod)}</strong>
                                    {policyForm.allocationPeriod !== 'Monthly' && (
                                        <>
                                            {' — '}
                                            {policyForm.advanceUsageAllowed
                                                ? <>all <strong>available from day 1</strong> (lump sum)</>
                                                : <>days <strong>accrue gradually</strong> (≈ {getMonthlyEquivalent(policyForm).toFixed(2)} / month)</>
                                            }
                                        </>
                                    )}
                                </>
                            )}
                            {!isOnDemandPolicy(policyForm) && Number(policyForm.maxPerMonth) > 0 && (
                                <><br />• Monthly cap: <strong>up to {policyForm.maxPerMonth} day(s) per month</strong> — once used, balance carries to other months</>
                            )}
                            {!isOnDemandPolicy(policyForm) && (
                                <><br />• Unused at period end: <strong style={{ color: UNUSED_ACTIONS.find(a => a.key === policyForm.unusedLeaveAction)?.color }}>
                                    {policyForm.unusedLeaveAction === 'encash'
                                        ? `Encashed (credited at ${policyForm.encashmentTiming.toLowerCase()})`
                                        : policyForm.unusedLeaveAction === 'carry_forward'
                                            ? 'Carried forward to next period'
                                            : 'Lapses (expires)'}
                                </strong></>
                            )}
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'end', px: 2, py: 1.5, borderTop: '1px solid #eee', gap: 1 }}>
                    <Button
                        onClick={() => setPolicyDialogOpen(false)}
                        sx={{ border: '1px solid #000', borderRadius: '30px', textTransform: 'none', width: '100px', height: '30px', color: '#000', fontSize: 13, fontWeight: 600 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSavePolicy}
                        disabled={isSavingPolicy}
                        sx={{
                            bgcolor: PRIMARY, borderRadius: '30px', textTransform: 'none',
                            px: 3, height: '30px', color: '#fff', fontSize: 13, fontWeight: 600,
                            '&:hover': { bgcolor: PRIMARY_DARK },
                            '&.Mui-disabled': { bgcolor: '#E0E0E0', color: '#aaa' },
                        }}
                    >
                        {isSavingPolicy ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : editingPolicy ? 'Update' : 'Add Leave Type'}
                    </Button>
                </Box>
            </Dialog>

            <Dialog
                open={deletePolicyDialogOpen}
                onClose={handleCloseDeleteDialog}
                PaperProps={{ sx: { borderRadius: '7px', width: 460, maxWidth: '95vw', overflow: 'hidden', border: '1px solid #E5E7EB' } }}
            >
                <Box sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    px: 2.5, py: 1.5, bgcolor: '#FEF2F2', borderBottom: '1px solid #FECACA',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        <Box sx={{
                            width: 32, height: 32, borderRadius: '7px',
                            bgcolor: '#fff', border: '1px solid #FECACA',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <DeleteIcon sx={{ fontSize: 18, color: '#DC2626' }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#7F1D1D', lineHeight: 1.2 }}>
                                Delete Leave Type
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: '#991B1B' }}>
                                This action cannot be undone
                            </Typography>
                        </Box>
                    </Box>
                    <IconButton size="small" onClick={handleCloseDeleteDialog} disabled={isDeletingPolicy}>
                        <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                </Box>

                <Box sx={{ p: 2.5 }}>
                    {deletePolicyTarget && (
                        <Box sx={{
                            display: 'flex', alignItems: 'center', gap: 1,
                            p: 1.2, mb: 2, borderRadius: '7px',
                            bgcolor: '#FAFAFA', border: '1px solid #E5E7EB',
                        }}>
                            <Box sx={{
                                width: 32, height: 32, borderRadius: '7px',
                                bgcolor: `${deletePolicyTarget.color}15`,
                                border: `1.5px solid ${deletePolicyTarget.color}40`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <Typography sx={{ fontSize: 11, fontWeight: 900, color: deletePolicyTarget.color }}>
                                    {deletePolicyTarget.shortCode}
                                </Typography>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#111' }} noWrap>
                                    {deletePolicyTarget.name}
                                </Typography>
                                <Typography sx={{ fontSize: 11, color: '#6B7280' }}>
                                    {deletePolicyTarget.daysPerPeriod} day(s) / {deletePolicyTarget.allocationPeriod}
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    <Box sx={{
                        p: 1.2, mb: 2, borderRadius: '7px',
                        bgcolor: '#E0F2FE', border: '1px solid #BAE6FD',
                        display: 'flex', alignItems: 'flex-start', gap: 0.8,
                    }}>
                        <WarningAmberIcon sx={{ fontSize: 16, color: '#B45309', mt: 0.2, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 11, color: '#92400E', lineHeight: 1.6 }}>
                            This leave type applies to <strong>all staff</strong>. Deleting it removes it from
                            future leave applications, balances and salary calculations.
                            Existing approved leaves of this type will remain on record.
                        </Typography>
                    </Box>

                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#374151', mb: 0.6 }}>
                        To confirm, type <strong style={{ color: '#DC2626' }}>delete</strong> below
                        <Typography component="span" sx={{ fontSize: 10, color: '#9CA3AF', ml: 0.5, fontWeight: 500 }}>
                            (lowercase, no spaces)
                        </Typography>
                    </Typography>
                    <TextField
                        fullWidth
                        size="small"
                        autoFocus
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="Type: delete"
                        error={deleteConfirmText.length > 0 && deleteConfirmText !== 'delete'}
                        helperText={
                            deleteConfirmText.length === 0
                                ? ' '
                                : deleteConfirmText === 'delete'
                                    ? '✓ Confirmed — you can now delete'
                                    : 'Must be exactly "delete" (lowercase, no spaces)'
                        }
                        slotProps={{ htmlInput: { spellCheck: false, autoCorrect: 'off', autoCapitalize: 'off' } }}
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '7px',
                                fontSize: 14,
                                fontFamily: 'monospace',
                                '&.Mui-focused fieldset': { borderColor: '#DC2626' },
                            },
                            '& .MuiFormHelperText-root': {
                                fontSize: 10, ml: 0,
                                color: deleteConfirmText === 'delete' ? '#16A34A' : undefined,
                            },
                        }}
                    />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2.5, py: 1.5, borderTop: '1px solid #eee', gap: 1, bgcolor: '#FAFAFA' }}>
                    <Button
                        onClick={handleCloseDeleteDialog}
                        disabled={isDeletingPolicy}
                        sx={{
                            textTransform: 'none', borderRadius: '7px',
                            color: '#374151', fontWeight: 600, fontSize: 13,
                            border: '1px solid #E5E7EB', px: 2, height: 34,
                            '&:hover': { bgcolor: '#F3F4F6' },
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmDeletePolicy}
                        disabled={deleteConfirmText !== 'delete' || isDeletingPolicy}
                        startIcon={
                            isDeletingPolicy
                                ? <CircularProgress size={14} sx={{ color: '#fff' }} />
                                : <DeleteIcon sx={{ fontSize: 16 }} />
                        }
                        sx={{
                            bgcolor: '#DC2626', color: '#fff',
                            borderRadius: '7px', textTransform: 'none',
                            px: 2.5, height: 34, fontSize: 13, fontWeight: 700,
                            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
                            transition: 'transform 0.2s, box-shadow 0.2s, background-color 0.2s',
                            '&:hover': {
                                bgcolor: '#B91C1C',
                                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.45)',
                                transform: 'translateY(-1px)',
                            },
                            '&:active': { transform: 'translateY(0)' },
                            '&.Mui-disabled': { bgcolor: '#FECACA', color: '#fff', boxShadow: 'none' },
                        }}
                    >
                        {isDeletingPolicy ? 'Deleting…' : 'Delete Permanently'}
                    </Button>
                </Box>
            </Dialog>
        </>
    );
}
