import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Box, Typography, Grid, Button, Stack, Chip, IconButton, Tooltip, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert,
} from '@mui/material';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import BusinessCenterRoundedIcon from '@mui/icons-material/BusinessCenterRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { useSelector } from 'react-redux';
import { sanitizeCode } from '../redux/slices/orgSlice';
import { selectIsMasterAdmin, selectUserEntityId } from '../redux/slices/authSlice';
import { PRIMARY, PRIMARY_LIGHT } from '../theme';
import { card, solidBtn, ghostBtn, field, PageHeader, StatCards, EmptyState, StatusToggle, ConfirmDialog } from '../components/uiKit';
import http, { apiErrorMessage } from '../Api/http';
import {
    GetBusinessEntitiesDashboard, GetBusinessEntityById, PostBusinessEntity, UpdateBusinessEntityById, DeleteBusinessEntityById,
} from '../Api/Api';

// Entities get a colour so they are instantly tellable apart in the Entity field.
const COLORS = ['#7C5CFC', '#0EA5E9', '#16A34A', '#F59E0B', '#E11D48', '#0891B2', '#6246E0'];

const EMPTY = {
    name: '', code: '', legalName: '', gstin: '', pan: '', cin: '',
    email: '', phone: '', address: '', city: '', state: '', pincode: '',
    color: PRIMARY, status: 'Active',
};

// Map one API entity onto the shape this page renders. The server already
// returns per-entity employee/department/designation counts, so nothing is
// derived locally any more.
const normalizeEntity = (e) => ({
    id: e.id,
    name: e.companyName ?? '',
    code: e.shortCode ?? '',
    legalName: e.registeredLegalName ?? '',
    gstin: e.gstin ?? '',
    pan: e.pan ?? '',
    cin: e.cin ?? '',
    email: e.billingEmail ?? '',
    phone: e.phone ?? '',
    address: e.registeredAddress ?? '',
    city: e.city ?? '',
    state: e.state ?? '',
    pincode: e.pincode ?? '',
    color: e.entityColour || PRIMARY,
    status: e.status || (e.isActive ? 'Active' : 'Inactive'),
    employees: Number(e.employees) || 0,
    departments: Number(e.departments) || 0,
    designations: Number(e.designations) || 0,
});

export default function BusinessEntitiesPage() {
    // Master Admin (userTypeId 1) manages every entity; an Admin (2) is pinned to
    // their own entity and sees only that one.
    const isMasterAdmin = useSelector(selectIsMasterAdmin);
    const userEntityId = useSelector(selectUserEntityId);
    const [entities, setEntities] = useState([]);
    const [summary, setSummary] = useState({ totalEntities: 0, activeEntities: 0, totalEmployees: 0 });
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [dialog, setDialog] = useState(null);   // { mode: 'create' | 'edit', id? }
    const [form, setForm] = useState(EMPTY);
    const [tried, setTried] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [snack, setSnack] = useState(null);      // { msg, sev }

    const notify = (msg, sev = 'success') => setSnack({ msg, sev });

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        try {
            if (isMasterAdmin) {
                // Master Admin → the full dashboard across every entity.
                const { data: body } = await http.get(GetBusinessEntitiesDashboard);
                if (body?.error) throw new Error(body.message || 'Could not load business entities.');
                const d = body?.data || {};
                // Lowest id first (the API returns them unordered).
                setEntities((Array.isArray(d.entities) ? d.entities : []).map(normalizeEntity).sort((a, b) => a.id - b.id));
                setSummary({
                    totalEntities: Number(d.totalEntities) || 0,
                    activeEntities: Number(d.activeEntities) || 0,
                    totalEmployees: Number(d.totalEmployees) || 0,
                });
            } else {
                // Admin → only their own entity.
                if (userEntityId == null) throw new Error('No entity is assigned to your account. Contact a Master Admin.');
                const { data: body } = await http.get(GetBusinessEntityById, { params: { id: userEntityId } });
                if (body?.error) throw new Error(body.message || 'Could not load your entity.');
                const ent = body?.data ? normalizeEntity(body.data) : null;
                const list = ent ? [ent] : [];
                setEntities(list);
                setSummary({
                    totalEntities: list.length,
                    activeEntities: list.filter((e) => e.status === 'Active').length,
                    totalEmployees: Number(body?.data?.employees) || 0,
                });
            }
            setLoadError('');
        } catch (err) {
            setLoadError(err?.response || err?.request ? apiErrorMessage(err, 'Could not load business entities.') : err.message);
        } finally {
            setLoading(false);
        }
    }, [isMasterAdmin, userEntityId]);

    useEffect(() => { loadDashboard(); }, [loadDashboard]);

    const totals = useMemo(() => ({
        departments: entities.reduce((n, e) => n + e.departments, 0),
        designations: entities.reduce((n, e) => n + e.designations, 0),
    }), [entities]);

    const KPIS = [
        { label: 'Business Entities', value: summary.totalEntities || entities.length, sub: `${summary.activeEntities} active`, icon: ApartmentRoundedIcon, color: PRIMARY, bg: PRIMARY_LIGHT },
        { label: 'Departments', value: totals.departments, sub: 'Across all entities', icon: AccountTreeRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE' },
        { label: 'Designations', value: totals.designations, sub: 'Across all entities', icon: BusinessCenterRoundedIcon, color: '#F59E0B', bg: '#FFF7ED' },
        { label: 'Total Headcount', value: summary.totalEmployees, sub: 'All companies', icon: GroupsRoundedIcon, color: '#16A34A', bg: '#DCFCE7' },
    ];

    const openCreate = () => {
        setForm({ ...EMPTY, color: COLORS[entities.length % COLORS.length] });
        setTried(false);
        setDialog({ mode: 'create' });
    };
    const openEdit = (ent) => {
        setForm({ ...EMPTY, ...ent });
        setTried(false);
        setDialog({ mode: 'edit', id: ent.id });
    };
    const closeDialog = () => { if (!saving) setDialog(null); };

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    // A duplicate code would break entity-prefixed IDs downstream, so block it here.
    const codeTaken = entities.some((e) => e.code === sanitizeCode(form.code) && e.id !== dialog?.id);
    const valid = form.name.trim() && sanitizeCode(form.code).length >= 2 && !codeTaken;

    const submit = async () => {
        setTried(true);
        if (!valid) { notify(codeTaken ? 'That short code is already used by another entity.' : 'Company name and a short code (2+ characters) are required.', 'warning'); return; }

        const payload = {
            companyName: form.name.trim(),
            shortCode: sanitizeCode(form.code),
            registeredLegalName: form.legalName || '',
            gstin: form.gstin || '',
            pan: form.pan || '',
            cin: form.cin || '',
            billingEmail: form.email || '',
            phone: form.phone || '',
            registeredAddress: form.address || '',
            city: form.city || '',
            state: form.state || '',
            pincode: form.pincode || '',
            isActive: form.status === 'Active',
            entityColour: form.color,
        };

        setSaving(true);
        try {
            const { data: body } = dialog.mode === 'edit'
                ? await http.put(UpdateBusinessEntityById, payload, { params: { id: dialog.id } })
                : await http.post(PostBusinessEntity, payload);
            if (body?.error) throw new Error(body.message || 'Could not save the entity.');
            notify(body?.message || `${payload.companyName} ${dialog.mode === 'edit' ? 'updated' : 'created'}.`);
            setDialog(null);
            await loadDashboard();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not save the entity.'), 'error');
        } finally {
            setSaving(false);
        }
    };

    const doDelete = async () => {
        if (!confirm || deleting) return;
        setDeleting(true);
        try {
            const { data: body } = await http.delete(DeleteBusinessEntityById, { params: { id: confirm.id } });
            if (body?.error) throw new Error(body.message || 'Could not remove the entity.');
            notify(body?.message || `${confirm.name} removed.`);
            setConfirm(null);
            await loadDashboard();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not remove the entity.'), 'error');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            <PageHeader
                title="Business Entities"
                subtitle="Register the companies you run. Pick the one you need from the Entity field on Departments, Designations and Documents."
            >
                <Button onClick={loadDashboard} disabled={loading} startIcon={<RefreshRoundedIcon />} sx={{ ...ghostBtn, height: 42, px: 2 }}>Refresh</Button>
                {isMasterAdmin && (
                    <Button startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ ...solidBtn, height: 42, px: 2.2 }}>New Entity</Button>
                )}
            </PageHeader>

            <StatCards items={KPIS} />

            {loading ? (
                <Box sx={{ ...card, py: 6, display: 'flex', justifyContent: 'center' }}><CircularProgress size={28} /></Box>
            ) : loadError ? (
                <Box sx={{ ...card, p: 3 }}>
                    <Alert severity="error" sx={{ borderRadius: '9px' }}
                        action={<Button size="small" onClick={loadDashboard} sx={{ textTransform: 'none', fontWeight: 700 }}>Retry</Button>}>
                        {loadError}
                    </Alert>
                </Box>
            ) : entities.length === 0 ? (
                <Box sx={{ ...card }}>
                    <EmptyState icon={ApartmentRoundedIcon} title="No business entities yet" hint="Create your first company to start adding departments and employees." />
                </Box>
            ) : (
                <Grid container spacing={1.5}>
                    {entities.map((ent) => (
                        <Grid size={{ xs: 12, md: 6, xl: 4 }} key={ent.id}>
                            <Box sx={{
                                ...card, height: '100%', p: 0, overflow: 'hidden', position: 'relative',
                                transition: 'box-shadow .2s, transform .2s',
                                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 12px 28px -16px ${ent.color}80` },
                            }}>
                                {/* Identity strip */}
                                <Box sx={{ p: 2.2, background: `linear-gradient(135deg, ${ent.color}14 0%, ${ent.color}05 100%)`, borderBottom: '1px solid #EEF0F6' }}>
                                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                                        <Box sx={{ width: 48, height: 48, borderRadius: '10px', bgcolor: ent.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 12px ${ent.color}55` }}>
                                            <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: 0.4 }}>{ent.code.slice(0, 3)}</Typography>
                                        </Box>
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                                                <Typography sx={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }} noWrap>{ent.name}</Typography>
                                                <Chip label={ent.status} size="small"
                                                    sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: ent.status === 'Active' ? '#DCFCE7' : '#F1F5F9', color: ent.status === 'Active' ? '#16A34A' : '#64748B' }} />
                                            </Stack>
                                            <Typography sx={{ fontSize: 12, color: '#6B7280', mt: 0.2 }} noWrap>{ent.legalName || '—'}</Typography>
                                        </Box>
                                        <Stack direction="row" spacing={0.3}>
                                            {isMasterAdmin && (
                                                <>
                                                    <Tooltip arrow title="Edit entity">
                                                        <IconButton size="small" onClick={() => openEdit(ent)} sx={{ color: '#94A3B8', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}><EditRoundedIcon sx={{ fontSize: 17 }} /></IconButton>
                                                    </Tooltip>
                                                    <Tooltip arrow title="Remove entity">
                                                        <IconButton size="small" onClick={() => setConfirm(ent)} sx={{ color: '#94A3B8', '&:hover': { color: '#E11D48', bgcolor: '#FEF2F2' } }}><DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} /></IconButton>
                                                    </Tooltip>
                                                </>
                                            )}
                                        </Stack>
                                    </Stack>
                                </Box>

                                {/* Counts */}
                                <Stack direction="row" sx={{ borderBottom: '1px solid #EEF0F6' }}>
                                    {[
                                        { l: 'Employees', v: ent.employees },
                                        { l: 'Departments', v: ent.departments },
                                        { l: 'Designations', v: ent.designations },
                                    ].map((x, i) => (
                                        <Box key={x.l} sx={{ flex: 1, p: 1.6, textAlign: 'center', borderLeft: i ? '1px solid #EEF0F6' : 'none' }}>
                                            <Typography sx={{ fontSize: 19, fontWeight: 800, color: '#0F172A' }}>{x.v}</Typography>
                                            <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#98A0AE', textTransform: 'uppercase', letterSpacing: 0.4 }}>{x.l}</Typography>
                                        </Box>
                                    ))}
                                </Stack>

                                {/* Statutory + address */}
                                <Box sx={{ p: 2.2 }}>
                                    <Grid container spacing={1.6}>
                                        {[['GSTIN', ent.gstin], ['PAN', ent.pan], ['CIN', ent.cin], ['Phone', ent.phone]].map(([l, v]) => (
                                            <Grid size={6} key={l}>
                                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#98A0AE', textTransform: 'uppercase', letterSpacing: 0.4 }}>{l}</Typography>
                                                <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: v ? '#334155' : '#C4C9D4', fontStyle: v ? 'normal' : 'italic' }} noWrap>{v || 'Not set'}</Typography>
                                            </Grid>
                                        ))}
                                    </Grid>
                                    <Stack direction="row" spacing={0.7} sx={{ alignItems: 'flex-start', mt: 1.8, pt: 1.6, borderTop: '1px dashed #E6EAF1' }}>
                                        <PlaceRoundedIcon sx={{ fontSize: 15, color: '#94A3B8', mt: 0.2 }} />
                                        <Typography sx={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>
                                            {[ent.address, ent.city, ent.state, ent.pincode].filter(Boolean).join(', ') || 'No registered address on file'}
                                        </Typography>
                                    </Stack>
                                </Box>
                            </Box>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Create / edit */}
            <Dialog open={Boolean(dialog)} onClose={closeDialog} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{dialog?.mode === 'edit' ? 'Edit Business Entity' : 'New Business Entity'}</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>Each entity keeps its own departments, designations, employees and documents.</Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    <Grid container spacing={1.8}>
                        <Grid size={{ xs: 12, sm: 8 }}>
                            <TextField label="Company name" size="small" fullWidth value={form.name} onChange={set('name')} error={tried && !form.name.trim()} sx={field} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                label="Short code" size="small" fullWidth value={form.code}
                                onChange={(e) => setForm((f) => ({ ...f, code: sanitizeCode(e.target.value) }))}
                                error={tried && (sanitizeCode(form.code).length < 2 || codeTaken)}
                                helperText={codeTaken ? 'Already in use' : 'e.g. ARA'}
                                sx={field}
                            />
                        </Grid>
                        <Grid size={12}>
                            <TextField label="Registered legal name" size="small" fullWidth value={form.legalName} onChange={set('legalName')} sx={field} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}><TextField label="GSTIN" size="small" fullWidth value={form.gstin} onChange={set('gstin')} sx={field} /></Grid>
                        <Grid size={{ xs: 12, sm: 4 }}><TextField label="PAN" size="small" fullWidth value={form.pan} onChange={set('pan')} sx={field} /></Grid>
                        <Grid size={{ xs: 12, sm: 4 }}><TextField label="CIN" size="small" fullWidth value={form.cin} onChange={set('cin')} sx={field} /></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}><TextField label="Billing email" size="small" fullWidth value={form.email} onChange={set('email')} sx={field} /></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}><TextField label="Phone" size="small" fullWidth value={form.phone} onChange={set('phone')} sx={field} /></Grid>
                        <Grid size={12}><TextField label="Registered address" size="small" fullWidth value={form.address} onChange={set('address')} sx={field} /></Grid>
                        <Grid size={{ xs: 12, sm: 4 }}><TextField label="City" size="small" fullWidth value={form.city} onChange={set('city')} sx={field} /></Grid>
                        <Grid size={{ xs: 12, sm: 4 }}><TextField label="State" size="small" fullWidth value={form.state} onChange={set('state')} sx={field} /></Grid>
                        <Grid size={{ xs: 12, sm: 4 }}><TextField label="Pincode" size="small" fullWidth value={form.pincode} onChange={set('pincode')} sx={field} /></Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.8 }}>Status</Typography>
                            <StatusToggle
                                value={form.status}
                                onChange={(v) => setForm((f) => ({ ...f, status: v }))}
                                activeHint="Trading — available across the app"
                                inactiveHint="Kept on record, but dormant"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.8 }}>Entity colour</Typography>
                            <Stack direction="row" spacing={0.8}>
                                {COLORS.map((c) => (
                                    <Box key={c} onClick={() => setForm((f) => ({ ...f, color: c }))}
                                        sx={{ width: 26, height: 26, borderRadius: '50%', bgcolor: c, cursor: 'pointer', border: form.color === c ? '2px solid #0F172A' : '2px solid transparent', boxShadow: form.color === c ? `0 0 0 2px #fff inset` : 'none', transition: '.15s' }} />
                                ))}
                            </Stack>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={closeDialog} disabled={saving} sx={{ ...ghostBtn, height: 40, px: 2 }}>Cancel</Button>
                    <Button onClick={submit} disabled={saving} startIcon={saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null} sx={{ ...solidBtn, height: 40, px: 2.4 }}>
                        {saving ? 'Saving…' : dialog?.mode === 'edit' ? 'Save Changes' : 'Create Entity'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={Boolean(confirm)}
                onClose={() => { if (!deleting) setConfirm(null); }}
                onConfirm={doDelete}
                title="Remove business entity?"
                body={confirm ? `${confirm.name} and its ${confirm.departments} department(s) and ${confirm.designations} designation(s) will be removed. Employees are not deleted. This cannot be undone.` : ''}
                confirmLabel="Remove entity"
            />

            <Snackbar open={Boolean(snack)} autoHideDuration={3200} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack(null)} severity={snack?.sev || 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack?.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
