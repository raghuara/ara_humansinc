import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Grid, Button, Stack, Chip, Avatar, IconButton, Tooltip, Collapse, LinearProgress,
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
import { useSelector, useDispatch } from 'react-redux';
import { selectEmployees } from '../../redux/slices/employeesSlice';
import { selectDepartments, selectActiveEntityId } from '../../redux/slices/orgSlice';
import {
    selectRequests, selectDocTypes, requestProgress,
    createRequest, cancelRequest, addRequestTargets, submitDocument,
    approveSubmission, rejectSubmission, resetTarget, addDocType,
} from '../../redux/slices/documentsSlice';
import { PRIMARY, PRIMARY_LIGHT, PRIMARY_DARK, PRIMARY_BORDER } from '../../theme';
import { fmtDate, initialsFromName as initials, paletteColor as colorFor } from '../../utils/format';
import { putFile, openFile, fmtSize } from '../../utils/fileStore';
import { solidBtn, ghostBtn, successBtn, dangerBtn, field, Panel, EmptyState, StatusChip, FileBadge, ConfirmDialog } from '../uiKit';
import { FilePickButton } from './FilePicker';

const CATEGORIES = ['Identity', 'Education', 'Employment', 'Bank', 'Address', 'Medical', 'General'];
const EMPTY = { docTypeId: '', title: '', category: 'General', note: '', dueDate: '', mandatory: 'yes', employees: [] };

const fullName = (e) => `${e.firstName || ''} ${e.lastName || ''}`.trim();

export default function DocumentRequestsTab() {
    const dispatch = useDispatch();
    const requests = useSelector(selectRequests);
    const docTypes = useSelector(selectDocTypes);
    const employees = useSelector(selectEmployees);
    const departments = useSelector(selectDepartments);
    const entityId = useSelector(selectActiveEntityId);
    const auth = useSelector((s) => s.auth);

    const [open, setOpen] = useState({});          // expanded request cards
    const [dialog, setDialog] = useState(null);    // { mode: 'create' | 'add', requestId? }
    const [form, setForm] = useState(EMPTY);
    const [tried, setTried] = useState(false);
    const [reject, setReject] = useState(null);    // { requestId, employeeId, employeeName, title }
    const [reason, setReason] = useState('');
    const [confirm, setConfirm] = useState(null);
    const [snack, setSnack] = useState('');

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

    const submitRequest = () => {
        setTried(true);
        if (!formValid) {
            setSnack(!form.title.trim() ? 'Give the document a name.' : 'Pick at least one employee to request it from.');
            return;
        }

        if (dialog.mode === 'add') {
            dispatch(addRequestTargets({ requestId: dialog.requestId, employees: form.employees }));
            setSnack(`Requested from ${form.employees.length} more employee${form.employees.length === 1 ? '' : 's'}.`);
            setDialog(null);
            return;
        }

        // Reuse the catalogue entry when one was picked; otherwise register the
        // new name so it is available for reuse next time.
        let docTypeId = form.docTypeId;
        if (!docTypeId) {
            const existing = docTypes.find((t) => t.name.trim().toLowerCase() === form.title.trim().toLowerCase());
            if (existing) {
                docTypeId = existing.id;
            } else {
                const action = dispatch(addDocType({ name: form.title.trim(), category: form.category }));
                docTypeId = action.payload.id;
            }
        }

        dispatch(createRequest({
            entityId,
            docTypeId,
            title: form.title.trim(),
            note: form.note,
            dueDate: form.dueDate,
            mandatory: form.mandatory === 'yes',
            requestedBy: reviewer,
            employees: form.employees,
        }));
        setSnack(`${form.title.trim()} requested from ${form.employees.length} employee${form.employees.length === 1 ? '' : 's'}.`);
        setDialog(null);
    };

    // ── Row actions ─────────────────────────────────────────────────────────
    // Stands in for the employee uploading from their app, so the approval flow
    // can be walked end to end from this screen.
    const simulateUpload = (req, target, file) => {
        const fileKey = putFile(file);
        dispatch(submitDocument({
            requestId: req.id,
            employeeId: target.employeeId,
            employeeName: target.employeeName,
            title: req.title,
            fileName: file.name,
            fileSize: file.size,
            fileKey,
            remark: '',
        }));
        setSnack(`${target.employeeName} submitted ${req.title} — awaiting your review.`);
    };

    const approve = (req, target) => {
        dispatch(approveSubmission({ requestId: req.id, employeeId: target.employeeId, employeeName: target.employeeName, title: req.title, reviewedBy: reviewer }));
        setSnack(`${req.title} approved — now filed under ${target.employeeName}.`);
    };

    const doReject = () => {
        dispatch(rejectSubmission({ ...reject, reason: reason.trim(), reviewedBy: reviewer }));
        setSnack(`${reject.title} rejected — ${reject.employeeName} can re-upload.`);
        setReject(null);
        setReason('');
    };

    const view = (target) => {
        if (!openFile(target.fileKey)) setSnack('That file was uploaded in an earlier session, so there is nothing to preview here.');
    };

    return (
        <Box>
            <Panel
                title="Document Requests"
                icon={AssignmentRoundedIcon}
                chip={`${requests.filter((r) => r.status === 'open').length} open`}
                chipColor="#B45309"
                chipBg="#FFF7ED"
                action={<Button startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ ...solidBtn, height: 38, px: 1.8, fontSize: 13 }}>New Request</Button>}
            >
                {requests.length === 0 ? (
                    <EmptyState icon={AssignmentRoundedIcon} title="No document requests yet" hint="Name a document once — e.g. Birth Certificate — and request it from as many employees as you need." />
                ) : (
                    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                        {requests.map((req) => {
                            const p = requestProgress(req);
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
                                                            <Typography sx={{ fontSize: 12, color: '#E11D48' }}>Rejected — {t.reason}</Typography>
                                                        ) : (
                                                            <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
                                                                <PhoneIphoneRoundedIcon sx={{ fontSize: 14, color: '#CBD2DD' }} />
                                                                <Typography sx={{ fontSize: 12, color: '#98A0AE' }}>Waiting for the employee to upload from the app</Typography>
                                                            </Stack>
                                                        )}
                                                        {t.status === 'rejected' && t.fileName && (
                                                            <Typography sx={{ fontSize: 11.5, color: '#E11D48', mt: 0.3 }}>Rejected — {t.reason}</Typography>
                                                        )}
                                                        {t.status === 'approved' && (
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
                                                        {t.status === 'pending' && (
                                                            <FilePickButton label="Upload for them" onPick={(f) => simulateUpload(req, t, f)} />
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
                    <Button onClick={() => setDialog(null)} sx={{ ...ghostBtn, height: 40, px: 2 }}>Cancel</Button>
                    <Button onClick={submitRequest} startIcon={<EventRoundedIcon sx={{ fontSize: 18 }} />} sx={{ ...solidBtn, height: 40, px: 2.4 }}>
                        {dialog?.mode === 'add' ? 'Add to request' : 'Send Request'}
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
                onConfirm={() => { dispatch(cancelRequest(confirm.id)); setSnack(`${confirm.title} request cancelled.`); setConfirm(null); }}
                title="Cancel this request?"
                body={confirm ? `The ${confirm.title} request will be withdrawn from all ${confirm.targets.length} employee(s). Files already approved stay in their records.` : ''}
                confirmLabel="Cancel request"
            />

            <Snackbar open={Boolean(snack)} autoHideDuration={3600} onClose={() => setSnack('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack('')} severity={/Give|Pick|earlier session/.test(snack) ? 'warning' : 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack}</Alert>
            </Snackbar>
        </Box>
    );
}
