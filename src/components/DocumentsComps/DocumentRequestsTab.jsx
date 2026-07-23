import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Box, Typography, Grid, Button, Stack, Chip, Avatar, IconButton, Tooltip, Collapse, LinearProgress, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Autocomplete, Checkbox, Snackbar, Alert,
} from '@mui/material';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import PhoneIphoneRoundedIcon from '@mui/icons-material/PhoneIphoneRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { useSelector, useDispatch } from 'react-redux';
import { selectEmployees } from '../../redux/slices/employeesSlice';
import { selectDepartments, selectActiveEntity } from '../../redux/slices/orgSlice';
import {
    selectDocTypes,
    approveSubmission, rejectSubmission, resetTarget, addDocType,
} from '../../redux/slices/documentsSlice';
import { PRIMARY, PRIMARY_LIGHT, PRIMARY_DARK, PRIMARY_BORDER } from '../../theme';
import { fmtDate, initialsFromName as initials, paletteColor as colorFor } from '../../utils/format';
import { openFile, fmtSize } from '../../utils/fileStore';
import { solidBtn, ghostBtn, successBtn, dangerBtn, field, Panel, EmptyState, StatusChip, FileBadge, ConfirmDialog } from '../uiKit';
import http, { apiErrorMessage } from '../../Api/http';
import { GetDocumentRequests, PostDocumentRequest, PostAddRecipients, DeleteDocumentRequest } from '../../Api/Api';

const CATEGORIES = ['Identity', 'Education', 'Employment', 'Bank', 'Address', 'Medical', 'General'];
const EMPTY = { docTypeId: '', title: '', category: 'General', note: '', dueDate: '', mandatory: 'yes', employees: [] };

const fullName = (e) => `${e.firstName || ''} ${e.lastName || ''}`.trim();

// The API sends dates as "DD-MM-YYYY", which `new Date()` (and therefore
// fmtDate / the overdue check) can't parse. Flip to ISO so both work; anything
// that doesn't match is passed through untouched.
const isoFromDMY = (s) => {
    const m = String(s || '').match(/^(\d{2})-(\d{2})-(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : (s || '');
};

// The reverse — the `type="date"` input gives ISO "YYYY-MM-DD", but the API
// expects "DD-MM-YYYY" on writes. Empty stays empty (no due date).
const dmyFromIso = (s) => {
    const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : (s || '');
};

// Map one API request onto the shape this component already renders. Progress
// is taken from the server's own counts rather than recomputed, and recipients
// become `targets`. The file/submission detail isn't in this summary endpoint,
// so those fields are simply absent.
const normalizeDocRequest = (it) => {
    const total = Number(it.totalRecipients) || (Array.isArray(it.recipients) ? it.recipients.length : 0);
    const approved = Number(it.approved) || 0;
    return {
        id: it.id,
        title: it.documentName ?? '',
        category: it.category ?? '',
        status: String(it.status ?? '').toLowerCase(),   // 'open'
        mandatory: Boolean(it.isMandatory),
        requestedBy: it.requestedByName ?? '',
        requestedOn: isoFromDMY(it.requestedOn),
        dueDate: isoFromDMY(it.dueDate),
        entityId: it.entityId,
        entityName: it.entityName ?? '',
        note: it.note ?? '',
        progress: {
            total,
            approved,
            submitted: Number(it.toReview) || 0,
            pending: Number(it.pending) || 0,
            rejected: Number(it.rejected) || 0,
            pct: total ? Math.round((approved / total) * 100) : 0,
        },
        targets: (Array.isArray(it.recipients) ? it.recipients : []).map((r) => ({
            recipientId: r.recipientId,
            employeeId: r.employeeCode ?? '',
            employeeName: r.employeeName ?? '',
            department: '',
            status: String(r.status ?? '').toLowerCase(),  // pending | submitted | approved | rejected
        })),
    };
};

export default function DocumentRequestsTab() {
    const dispatch = useDispatch();
    const docTypes = useSelector(selectDocTypes);
    const employees = useSelector(selectEmployees);
    const departments = useSelector(selectDepartments);
    const activeEntity = useSelector(selectActiveEntity);
    const auth = useSelector((s) => s.auth);

    // Document requests come from the API. Create, add-recipients and cancel are
    // wired below; the per-recipient upload/approve/reject in the expanded rows
    // still dispatch to Redux (those endpoints live on the Approvals tab).
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [saving, setSaving] = useState(false);      // create / add-people in flight
    const [cancelling, setCancelling] = useState(false);

    const loadRequests = useCallback(async () => {
        setLoading(true);
        try {
            const { data: body } = await http.get(GetDocumentRequests);
            if (body?.error) throw new Error(body.message || 'Could not load document requests.');
            const items = Array.isArray(body?.data?.items) ? body.data.items : [];
            setRequests(items.map(normalizeDocRequest));
            setLoadError('');
        } catch (err) {
            setLoadError(apiErrorMessage(err, 'Could not load document requests.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadRequests(); }, [loadRequests]);

    const [open, setOpen] = useState({});          // expanded request cards
    const [dialog, setDialog] = useState(null);    // { mode: 'create' | 'add', requestId? }
    const [form, setForm] = useState(EMPTY);
    const [tried, setTried] = useState(false);
    const [reject, setReject] = useState(null);    // { requestId, employeeId, employeeName, title }
    const [reason, setReason] = useState('');
    const [confirm, setConfirm] = useState(null);
    const [snack, setSnack] = useState(null);       // { msg, sev }

    const notify = (msg, sev = 'success') => setSnack({ msg, sev });
    const reviewer = auth.userName || 'Management';
    const toggle = (id) => setOpen((o) => ({ ...o, [id]: !o[id] }));

    // Employee options carry the shape the slice stores on each target.
    const options = useMemo(() => employees.map((e) => ({
        employeeId: e.employeeId,
        employeeName: fullName(e),
        department: e.department || '',
    })), [employees]);

    // ── New request ─────────────────────────────────────────────────────────
    const openCreate = () => { setForm(EMPTY); setTried(false); setDialog({ mode: 'create' }); };
    const openAddPeople = (req) => {
        setForm({ ...EMPTY, title: req.title, employees: [] });
        setTried(false);
        setDialog({ mode: 'add', requestId: req.id, existing: req.targets.map((t) => t.employeeId) });
    };

    // Picking an existing document type fills the title; typing a new name
    // creates the type on submit, so "Birth Certificate" is defined once and
    // reused by every later request.
    const pickDocType = (_, v) => {
        if (!v) { setForm((f) => ({ ...f, docTypeId: '', title: '' })); return; }
        if (typeof v === 'string') { setForm((f) => ({ ...f, docTypeId: '', title: v })); return; }
        setForm((f) => ({ ...f, docTypeId: v.id, title: v.name, category: v.category || f.category }));
    };

    const addableOptions = dialog?.mode === 'add'
        ? options.filter((o) => !dialog.existing.includes(o.employeeId))
        : options;

    const selectDepartment = (depName) => {
        const inDep = addableOptions.filter((o) => o.department === depName);
        setForm((f) => {
            const have = new Set(f.employees.map((e) => e.employeeId));
            return { ...f, employees: [...f.employees, ...inDep.filter((o) => !have.has(o.employeeId))] };
        });
    };

    const formValid = form.title.trim() && form.employees.length > 0;

    const submitRequest = async () => {
        setTried(true);
        if (!formValid) {
            notify(!form.title.trim() ? 'Give the document a name.' : 'Pick at least one employee to request it from.', 'warning');
            return;
        }

        const codes = form.employees.map((e) => e.employeeId);
        setSaving(true);
        try {
            if (dialog.mode === 'add') {
                const { data: body } = await http.post(PostAddRecipients, {
                    requestId: dialog.requestId,
                    employeeCodes: codes,
                });
                if (body?.error) throw new Error(body.message || 'Could not add recipients.');
                notify(body?.message || `Requested from ${codes.length} more employee${codes.length === 1 ? '' : 's'}.`);
            } else {
                // Remember a newly-typed name locally so the Autocomplete suggests
                // it next time — the request itself is persisted by the API.
                if (!form.docTypeId && !docTypes.some((t) => t.name.trim().toLowerCase() === form.title.trim().toLowerCase())) {
                    dispatch(addDocType({ name: form.title.trim(), category: form.category }));
                }
                const { data: body } = await http.post(PostDocumentRequest, {
                    documentName: form.title.trim(),
                    category: form.category,
                    dueDate: dmyFromIso(form.dueDate),
                    isMandatory: form.mandatory === 'yes',
                    note: form.note,
                    employeeCodes: codes,
                    entityId: null,
                    entityName: activeEntity?.name || '',
                });
                if (body?.error) throw new Error(body.message || 'Could not create the request.');
                notify(body?.message || `${form.title.trim()} requested from ${codes.length} employee${codes.length === 1 ? '' : 's'}.`);
            }
            setDialog(null);
            await loadRequests();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not save the request.'), 'error');
        } finally {
            setSaving(false);
        }
    };

    // Cancel a whole request — removes it from every recipient.
    const doCancel = async () => {
        if (!confirm || cancelling) return;
        setCancelling(true);
        try {
            const { data: body } = await http.delete(DeleteDocumentRequest, { params: { id: confirm.id } });
            if (body?.error) throw new Error(body.message || 'Could not cancel the request.');
            notify(body?.message || `${confirm.title} request cancelled.`);
            setConfirm(null);
            await loadRequests();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not cancel the request.'), 'error');
        } finally {
            setCancelling(false);
        }
    };

    // ── Row actions ─────────────────────────────────────────────────────────
    const approve = (req, target) => {
        dispatch(approveSubmission({ requestId: req.id, employeeId: target.employeeId, employeeName: target.employeeName, title: req.title, reviewedBy: reviewer }));
        notify(`${req.title} approved — now filed under ${target.employeeName}.`);
    };

    const doReject = () => {
        dispatch(rejectSubmission({ ...reject, reason: reason.trim(), reviewedBy: reviewer }));
        notify(`${reject.title} rejected — ${reject.employeeName} can re-upload.`);
        setReject(null);
        setReason('');
    };

    const view = (target) => {
        if (!openFile(target.fileKey)) notify('That file was uploaded in an earlier session, so there is nothing to preview here.', 'warning');
    };

    return (
        <Box>
            <Panel
                title="Document Requests"
                icon={AssignmentRoundedIcon}
                chip={`${requests.filter((r) => r.status === 'open').length} open`}
                chipColor="#B45309"
                chipBg="#FFF7ED"
                action={(
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Tooltip arrow title="Reload">
                            <IconButton onClick={loadRequests} disabled={loading} sx={{ border: '1px solid #E6EAF1', borderRadius: '7px', color: '#64748B', '&:hover': { bgcolor: PRIMARY_LIGHT, color: PRIMARY } }}>
                                <RefreshRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                        <Button startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ ...solidBtn, height: 38, px: 1.8, fontSize: 13 }}>New Request</Button>
                    </Stack>
                )}
            >
                {loading ? (
                    <Box sx={{ p: 5, display: 'flex', justifyContent: 'center' }}><CircularProgress size={26} /></Box>
                ) : loadError ? (
                    <Box sx={{ p: 3 }}>
                        <Alert severity="error" sx={{ borderRadius: '9px' }}
                            action={<Button size="small" onClick={loadRequests} sx={{ textTransform: 'none', fontWeight: 700 }}>Retry</Button>}>
                            {loadError}
                        </Alert>
                    </Box>
                ) : requests.length === 0 ? (
                    <EmptyState icon={AssignmentRoundedIcon} title="No document requests yet" hint="Name a document once — e.g. Birth Certificate — and request it from as many employees as you need." />
                ) : (
                    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                        {requests.map((req) => {
                            const p = req.progress;
                            const isOpen = Boolean(open[req.id]);
                            const overdue = req.dueDate && req.status === 'open' && new Date(req.dueDate) < new Date();
                            return (
                                <Box key={req.id} sx={{ border: '1px solid #EEF0F6', borderRadius: '9px', overflow: 'hidden', bgcolor: '#fff' }}>
                                    {/* Request header */}
                                    <Box onClick={() => toggle(req.id)} sx={{ p: 1.8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.6, flexWrap: 'wrap', '&:hover': { bgcolor: '#FBFAFE' } }}>
                                        <Box sx={{ width: 42, height: 42, borderRadius: '9px', bgcolor: PRIMARY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <AssignmentRoundedIcon sx={{ fontSize: 21, color: PRIMARY }} />
                                        </Box>

                                        <Box sx={{ minWidth: 180, flex: 1 }}>
                                            <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                                                <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: '#0F172A' }}>{req.title}</Typography>
                                                <StatusChip status={req.status} />
                                                {req.mandatory && <Chip label="Mandatory" size="small" sx={{ height: 19, fontSize: 9.5, fontWeight: 800, bgcolor: '#FEE2E2', color: '#E11D48' }} />}
                                                {overdue && <Chip label="Overdue" size="small" sx={{ height: 19, fontSize: 9.5, fontWeight: 800, bgcolor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }} />}
                                            </Stack>
                                            <Typography sx={{ fontSize: 11.5, color: '#98A0AE', mt: 0.2 }}>
                                                Requested by {req.requestedBy} on {fmtDate(req.requestedOn)}
                                                {req.dueDate ? ` · due ${fmtDate(req.dueDate)}` : ''}
                                            </Typography>
                                        </Box>

                                        {/* Progress */}
                                        <Box sx={{ minWidth: 200, flex: 1 }}>
                                            <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                                                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#16A34A' }}>{p.approved} of {p.total} approved</Typography>
                                                {p.submitted > 0 && <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#0369A1' }}>{p.submitted} to review</Typography>}
                                            </Stack>
                                            <LinearProgress variant="determinate" value={p.pct} sx={{ height: 7, borderRadius: 5, bgcolor: '#EEF0F6', '& .MuiLinearProgress-bar': { bgcolor: p.pct === 100 ? '#16A34A' : PRIMARY, borderRadius: 5 } }} />
                                            <Stack direction="row" spacing={1.2} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                                                {[
                                                    { l: 'pending', v: p.pending, c: '#B45309' },
                                                    { l: 'to review', v: p.submitted, c: '#0369A1' },
                                                    { l: 'rejected', v: p.rejected, c: '#E11D48' },
                                                ].filter((x) => x.v > 0).map((x) => (
                                                    <Typography key={x.l} sx={{ fontSize: 10.5, color: x.c, fontWeight: 700 }}>{x.v} {x.l}</Typography>
                                                ))}
                                            </Stack>
                                        </Box>

                                        {/* Who it went to */}
                                        <Stack direction="row" sx={{ alignItems: 'center' }}>
                                            {req.targets.slice(0, 4).map((t, i) => (
                                                <Tooltip arrow key={t.employeeId} title={`${t.employeeName} · ${t.status}`}>
                                                    <Avatar sx={{ width: 30, height: 30, bgcolor: colorFor(t.employeeName), fontSize: 11, fontWeight: 700, border: '2px solid #fff', ml: i ? '-8px' : 0 }}>{initials(t.employeeName)}</Avatar>
                                                </Tooltip>
                                            ))}
                                            {req.targets.length > 4 && (
                                                <Avatar sx={{ width: 30, height: 30, bgcolor: '#EEF0F6', color: '#64748B', fontSize: 10.5, fontWeight: 800, border: '2px solid #fff', ml: '-8px' }}>+{req.targets.length - 4}</Avatar>
                                            )}
                                        </Stack>

                                        <Stack direction="row" spacing={0.3} sx={{ alignItems: 'center' }}>
                                            <Tooltip arrow title="Request from more employees">
                                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); openAddPeople(req); }} sx={{ color: '#94A3B8', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}>
                                                    <PersonAddAlt1RoundedIcon sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip arrow title="Cancel request">
                                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); setConfirm(req); }} sx={{ color: '#94A3B8', '&:hover': { color: '#E11D48', bgcolor: '#FEF2F2' } }}>
                                                    <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            </Tooltip>
                                            <ExpandMoreRoundedIcon sx={{ fontSize: 22, color: '#94A3B8', transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
                                        </Stack>
                                    </Box>

                                    {/* Per-employee rows */}
                                    <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                        {req.note && (
                                            <Box sx={{ mx: 1.8, mb: 1.2, p: 1.4, borderRadius: '7px', bgcolor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                                                <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: 0.5 }}>Note to employees</Typography>
                                                <Typography sx={{ fontSize: 12.5, color: '#78350F', mt: 0.2 }}>{req.note}</Typography>
                                            </Box>
                                        )}
                                        <Box sx={{ borderTop: '1px solid #EEF0F6', bgcolor: '#FBFAFE' }}>
                                            {req.targets.map((t) => (
                                                <Stack key={t.employeeId} direction="row" sx={{ alignItems: 'center', gap: 1.5, px: 1.8, py: 1.4, borderBottom: '1px solid #F1F0F9', flexWrap: 'wrap' }}>
                                                    <Avatar sx={{ width: 36, height: 36, bgcolor: colorFor(t.employeeName), fontSize: 12.5, fontWeight: 700 }}>{initials(t.employeeName)}</Avatar>
                                                    <Box sx={{ minWidth: 150 }}>
                                                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{t.employeeName}</Typography>
                                                        <Typography sx={{ fontSize: 11.5, color: '#98A0AE' }}>{t.employeeId}{t.department ? ` · ${t.department}` : ''}</Typography>
                                                    </Box>

                                                    <Box sx={{ minWidth: 130 }}><StatusChip status={t.status} /></Box>

                                                    {/* Submission */}
                                                    <Box sx={{ flex: 1, minWidth: 200 }}>
                                                        {t.fileName ? (
                                                            <>
                                                                <FileBadge fileName={t.fileName} fileSize={t.fileSize} sub={`${fmtSize(t.fileSize)} · submitted ${fmtDate(t.submittedOn)}`} />
                                                                {t.remark && <Typography sx={{ fontSize: 11.5, color: '#64748B', mt: 0.4, fontStyle: 'italic' }}>“{t.remark}”</Typography>}
                                                            </>
                                                        ) : t.status === 'rejected' ? (
                                                            <Typography sx={{ fontSize: 12, color: '#E11D48' }}>Rejected{t.reason ? ` — ${t.reason}` : ''}</Typography>
                                                        ) : t.status === 'submitted' ? (
                                                            <Typography sx={{ fontSize: 12, color: '#0369A1', fontWeight: 600 }}>Submitted — awaiting your review</Typography>
                                                        ) : t.status === 'approved' ? (
                                                            <Typography sx={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>Approved · filed in their record</Typography>
                                                        ) : (
                                                            <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
                                                                <PhoneIphoneRoundedIcon sx={{ fontSize: 14, color: '#CBD2DD' }} />
                                                                <Typography sx={{ fontSize: 12, color: '#98A0AE' }}>Waiting for the employee to upload from the app</Typography>
                                                            </Stack>
                                                        )}
                                                        {t.status === 'approved' && t.reviewedBy && (
                                                            <Typography sx={{ fontSize: 11, color: '#16A34A', mt: 0.3, fontWeight: 600 }}>Approved by {t.reviewedBy} on {fmtDate(t.reviewedOn)} · filed in their record</Typography>
                                                        )}
                                                    </Box>

                                                    {/* Actions per state */}
                                                    <Stack direction="row" spacing={0.8} sx={{ flexWrap: 'wrap', gap: 0.8 }}>
                                                        {t.fileName && (
                                                            <Tooltip arrow title="View file">
                                                                <IconButton size="small" onClick={() => view(t)} sx={{ color: '#94A3B8', border: '1px solid #E6EAF1', borderRadius: '7px', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}>
                                                                    <VisibilityRoundedIcon sx={{ fontSize: 17 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                        {t.status === 'submitted' && (
                                                            <>
                                                                <Button onClick={() => approve(req, t)} startIcon={<CheckRoundedIcon sx={{ fontSize: 16 }} />} sx={{ ...successBtn, height: 32, px: 1.4, fontSize: 11.5 }}>Approve</Button>
                                                                <Button onClick={() => { setReject({ requestId: req.id, employeeId: t.employeeId, employeeName: t.employeeName, title: req.title }); setReason(''); }} startIcon={<CloseRoundedIcon sx={{ fontSize: 16 }} />} sx={{ ...dangerBtn, height: 32, px: 1.4, fontSize: 11.5 }}>Reject</Button>
                                                            </>
                                                        )}
                                                        {t.status === 'rejected' && (
                                                            <Button onClick={() => dispatch(resetTarget({ requestId: req.id, employeeId: t.employeeId }))} startIcon={<ReplayRoundedIcon sx={{ fontSize: 16 }} />} sx={{ ...ghostBtn, height: 32, px: 1.4, fontSize: 11.5 }}>Ask again</Button>
                                                        )}
                                                    </Stack>
                                                </Stack>
                                            ))}
                                        </Box>
                                    </Collapse>
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </Panel>

            {/* New request / add people */}
            <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
                        {dialog?.mode === 'add' ? `Request ${form.title} from more employees` : 'Request a Document'}
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>
                        {dialog?.mode === 'add'
                            ? 'The people you add are asked for the same document under this request.'
                            : 'Name the document once, then pick everyone it should be collected from. It appears in each employee’s app.'}
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    {dialog?.mode === 'create' && (
                        <Grid container spacing={1.8} sx={{ mb: 1.8 }}>
                            <Grid size={{ xs: 12, sm: 7 }}>
                                <Autocomplete
                                    freeSolo
                                    options={docTypes}
                                    getOptionLabel={(o) => (typeof o === 'string' ? o : o.name)}
                                    onChange={pickDocType}
                                    onInputChange={(_, v, r) => { if (r === 'input') setForm((f) => ({ ...f, title: v, docTypeId: '' })); }}
                                    renderOption={(props, o) => (
                                        <Box component="li" {...props} key={o.id}>
                                            <Box>
                                                <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{o.name}</Typography>
                                                <Typography sx={{ fontSize: 11, color: '#98A0AE' }}>{o.category}{o.description ? ` · ${o.description}` : ''}</Typography>
                                            </Box>
                                        </Box>
                                    )}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Document name" size="small" sx={field}
                                            error={tried && !form.title.trim()}
                                            helperText="Pick a saved document, or type a new name like “Birth Certificate”" />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 5 }}>
                                <TextField select label="Category" size="small" fullWidth value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} sx={field}>
                                    {CATEGORIES.map((c) => <MenuItem key={c} value={c} sx={{ fontSize: 13.5 }}>{c}</MenuItem>)}
                                </TextField>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField label="Due date" type="date" size="small" fullWidth value={form.dueDate}
                                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                                    slotProps={{ inputLabel: { shrink: true } }} sx={field} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField select label="Mandatory?" size="small" fullWidth value={form.mandatory} onChange={(e) => setForm((f) => ({ ...f, mandatory: e.target.value }))} sx={field}>
                                    <MenuItem value="yes" sx={{ fontSize: 13.5 }}>Yes — must be submitted</MenuItem>
                                    <MenuItem value="no" sx={{ fontSize: 13.5 }}>No — optional</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid size={12}>
                                <TextField label="Note to employees (optional)" size="small" fullWidth multiline minRows={2}
                                    placeholder="e.g. Please upload a clear scan of the original."
                                    value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} sx={field} />
                            </Grid>
                        </Grid>
                    )}

                    {/* Employee picker */}
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#374151', mb: 0.8 }}>Request from</Typography>
                    <Autocomplete
                        multiple
                        disableCloseOnSelect
                        options={addableOptions}
                        value={form.employees}
                        onChange={(_, v) => setForm((f) => ({ ...f, employees: v }))}
                        getOptionLabel={(o) => `${o.employeeName} (${o.employeeId})`}
                        isOptionEqualToValue={(a, b) => a.employeeId === b.employeeId}
                        renderOption={(props, o, { selected }) => {
                            const { key, ...rest } = props;
                            return (
                                <Box component="li" key={o.employeeId} {...rest}>
                                    <Checkbox checked={selected} size="small" sx={{ mr: 0.5, color: '#CBD2DD', '&.Mui-checked': { color: PRIMARY } }} />
                                    <Avatar sx={{ width: 26, height: 26, bgcolor: colorFor(o.employeeName), fontSize: 10.5, fontWeight: 700, mr: 1.2 }}>{initials(o.employeeName)}</Avatar>
                                    <Box>
                                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{o.employeeName}</Typography>
                                        <Typography sx={{ fontSize: 11, color: '#98A0AE' }}>{o.employeeId}{o.department ? ` · ${o.department}` : ''}</Typography>
                                    </Box>
                                </Box>
                            );
                        }}
                        renderTags={(value, getTagProps) =>
                            value.map((o, i) => {
                                const { key, ...rest } = getTagProps({ index: i });
                                return <Chip key={o.employeeId} {...rest} label={o.employeeName} size="small" sx={{ fontWeight: 700, fontSize: 11.5, bgcolor: PRIMARY_LIGHT, color: PRIMARY_DARK, border: `1px solid ${PRIMARY_BORDER}` }} />;
                            })
                        }
                        renderInput={(params) => (
                            <TextField {...params} size="small" placeholder={form.employees.length ? '' : 'Search employees…'}
                                error={tried && form.employees.length === 0} sx={field} />
                        )}
                    />

                    {/* Bulk pick helpers */}
                    <Stack direction="row" spacing={0.8} sx={{ mt: 1.2, flexWrap: 'wrap', gap: 0.8, alignItems: 'center' }}>
                        <Typography sx={{ fontSize: 11.5, color: '#98A0AE', fontWeight: 600 }}>Quick add:</Typography>
                        <Chip label={`Everyone (${addableOptions.length})`} size="small" onClick={() => setForm((f) => ({ ...f, employees: addableOptions }))}
                            sx={{ cursor: 'pointer', fontWeight: 700, fontSize: 11.5, bgcolor: '#F1F5F9', color: '#475569', '&:hover': { bgcolor: '#E2E8F0' } }} />
                        {departments.map((d) => {
                            const n = addableOptions.filter((o) => o.department === d.name).length;
                            if (!n) return null;
                            return (
                                <Chip key={d.id} label={`${d.name} (${n})`} size="small" onClick={() => selectDepartment(d.name)}
                                    sx={{ cursor: 'pointer', fontWeight: 700, fontSize: 11.5, bgcolor: '#F1F5F9', color: '#475569', '&:hover': { bgcolor: '#E2E8F0' } }} />
                            );
                        })}
                        {form.employees.length > 0 && (
                            <Chip label="Clear" size="small" onClick={() => setForm((f) => ({ ...f, employees: [] }))}
                                sx={{ cursor: 'pointer', fontWeight: 700, fontSize: 11.5, bgcolor: '#FEF2F2', color: '#E11D48', '&:hover': { bgcolor: '#FEE2E2' } }} />
                        )}
                    </Stack>

                    {/* Live preview */}
                    {formValid && (
                        <Box sx={{ mt: 2, p: 1.6, borderRadius: '9px', bgcolor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.4 }}>What happens next</Typography>
                            <Typography sx={{ fontSize: 12.5, color: '#166534' }}>
                                <strong>{form.title.trim()}</strong> is requested from <strong>{form.employees.length} employee{form.employees.length === 1 ? '' : 's'}</strong>.
                                It shows up in their app{form.dueDate ? ` with a due date of ${fmtDate(form.dueDate)}` : ''}; once each one uploads, it lands in <strong>Approvals</strong> for you to review.
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setDialog(null)} disabled={saving} sx={{ ...ghostBtn, height: 40, px: 2 }}>Cancel</Button>
                    <Button onClick={submitRequest} disabled={saving}
                        startIcon={saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <EventRoundedIcon sx={{ fontSize: 18 }} />}
                        sx={{ ...solidBtn, height: 40, px: 2.4 }}>
                        {saving ? 'Saving…' : dialog?.mode === 'add' ? 'Add to request' : 'Send Request'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Reject with a reason — the employee sees this in their app */}
            <Dialog open={Boolean(reject)} onClose={() => setReject(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ pb: 0.5 }}>
                    <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>Reject submission</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>{reject?.employeeName} · {reject?.title}</Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    <TextField
                        label="Reason" size="small" fullWidth multiline minRows={3} autoFocus
                        placeholder="e.g. The scan is cut off — please re-upload the full page."
                        value={reason} onChange={(e) => setReason(e.target.value)} sx={field}
                    />
                    <Typography sx={{ fontSize: 11.5, color: '#98A0AE', mt: 1 }}>They will be asked to upload it again with this reason attached.</Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setReject(null)} sx={{ ...ghostBtn, height: 40, px: 2 }}>Cancel</Button>
                    <Button onClick={doReject} sx={{ height: 40, px: 2.4, fontWeight: 700, textTransform: 'none', borderRadius: '7px', bgcolor: '#DC2626', color: '#fff', '&:hover': { bgcolor: '#B91C1C' } }}>Reject</Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={Boolean(confirm)}
                onClose={() => setConfirm(null)}
                onConfirm={doCancel}
                title="Cancel this request?"
                body={confirm ? `The ${confirm.title} request will be withdrawn from all ${confirm.targets.length} employee(s). Files already approved stay in their records.` : ''}
                confirmLabel="Cancel request"
            />

            <Snackbar open={Boolean(snack)} autoHideDuration={3600} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack(null)} severity={snack?.sev || 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack?.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
