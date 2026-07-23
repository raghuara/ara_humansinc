import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Box, Typography, Grid, Button, Stack, Chip, IconButton, Tooltip, InputBase, Avatar, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Snackbar, Alert,
} from '@mui/material';
import CorporateFareRoundedIcon from '@mui/icons-material/CorporateFareRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { useSelector } from 'react-redux';
import { selectActiveEntity } from '../../redux/slices/orgSlice';
import { selectUserTypeId, USER_TYPE } from '../../redux/slices/authSlice';
import { PRIMARY, PRIMARY_LIGHT, PRIMARY_BORDER } from '../../theme';
import { fmtDate } from '../../utils/format';
import { fmtSize, fileKind } from '../../utils/fileStore';
import { solidBtn, ghostBtn, field, Panel, EmptyState, ConfirmDialog } from '../uiKit';
import { FileDrop } from './FilePicker';
import http, { apiErrorMessage } from '../../Api/http';
import {
    GetOrganisationDocuments, GetMyOrganisationDocuments, PostOrganisationDocument,
    UpdateOrganisationDocument, DeleteOrganisationDocument, DownloadOrganisationDocument, GetUserTypes,
} from '../../Api/Api';
import { fetchFileBlob, saveBlob, blobErrorMessage } from '../../utils/download';

const CATEGORIES = ['Policy', 'Statutory', 'Compliance', 'Template', 'Announcement', 'General'];
const EMPTY = { name: '', category: 'Policy', description: '', visibleTo: [], file: null, fileName: '', fileSize: 0 };

const isoFromDMY = (s) => {
    const m = String(s || '').match(/^(\d{2})-(\d{2})-(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : (s || '');
};

const normalizeOrgDoc = (d) => ({
    id: d.id,
    name: d.documentName ?? '',
    category: d.category ?? 'General',
    description: d.description ?? '',
    fileName: d.fileName ?? '',
    fileSize: Number(d.sizeBytes) || 0,
    url: d.url ?? '',
    entityName: d.entityName ?? '',
    visibleTo: Array.isArray(d.visibleTo) ? d.visibleTo.map((v) => ({ userTypeId: v.userTypeId, name: v.name })) : [],
    visibleToIds: Array.isArray(d.visibleTo) ? d.visibleTo.map((v) => v.userTypeId) : [],
    uploadedBy: d.uploadedByName ?? '',
    createdOn: isoFromDMY(d.createdOn),
});

export default function OrgDocumentsTab() {
    const entity = useSelector(selectActiveEntity);
    // An employee only ever sees the documents shared with their role, read-only
    // (GetMyOrganisationDocuments) — no manage view, no upload/edit/delete.
    const isEmployee = useSelector(selectUserTypeId) === USER_TYPE.EMPLOYEE;

    const [scope, setScope] = useState(isEmployee ? 'mine' : 'all');   // 'all' | 'mine'
    const [docs, setDocs] = useState([]);
    const [userTypes, setUserTypes] = useState([]);  // [{ id, name, color, users }]
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [downloading, setDownloading] = useState(null);   // doc id

    const [q, setQ] = useState('');
    const [dialog, setDialog] = useState(null);      // { mode: 'create' | 'edit', id? }
    const [form, setForm] = useState(EMPTY);
    const [tried, setTried] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [snack, setSnack] = useState(null);        // { msg, sev }

    const notify = (msg, sev = 'success') => setSnack({ msg, sev });

    const typeColor = (id) => userTypes.find((t) => t.id === id)?.color || '#64748B';

    // ── Load ────────────────────────────────────────────────────────────────
    const loadDocs = useCallback(async () => {
        setLoading(true);
        try {
            const url = scope === 'mine' ? GetMyOrganisationDocuments : GetOrganisationDocuments;
            const { data: body } = await http.get(url);
            if (body?.error) throw new Error(body.message || 'Could not load organisation documents.');
            const items = Array.isArray(body?.data?.items) ? body.data.items : [];
            setDocs(items.map(normalizeOrgDoc));
            setLoadError('');
        } catch (err) {
            setLoadError(apiErrorMessage(err, 'Could not load organisation documents.'));
        } finally {
            setLoading(false);
        }
    }, [scope]);

    useEffect(() => { loadDocs(); }, [loadDocs]);

    // The visibility picker needs the real user types (roles) — id is the
    // userTypeId the API stores against each document.
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const { data: body } = await http.get(GetUserTypes);
                const list = body?.data?.roles || [];
                if (alive) setUserTypes(list.map((r) => ({ id: r.id, name: r.name, color: r.accentColour || PRIMARY, users: r.usersCount ?? 0 })));
            } catch { /* the picker just stays empty; surfaced when they open the dialog */ }
        })();
        return () => { alive = false; };
    }, []);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return docs;
        return docs.filter((d) => [d.name, d.category, d.description, d.fileName].some((v) => String(v || '').toLowerCase().includes(s)));
    }, [docs, q]);

    // ── Dialog ────────────────────────────────────────────────────────────────
    const openCreate = () => { setForm(EMPTY); setTried(false); setDialog({ mode: 'create' }); };
    const openEdit = (d) => {
        setForm({ name: d.name, category: d.category, description: d.description, visibleTo: d.visibleToIds, file: null, fileName: d.fileName, fileSize: d.fileSize });
        setTried(false); setDialog({ mode: 'edit', id: d.id });
    };
    const closeDialog = () => { if (!saving) setDialog(null); };

    const toggleType = (id) => setForm((f) => ({
        ...f,
        visibleTo: f.visibleTo.includes(id) ? f.visibleTo.filter((r) => r !== id) : [...f.visibleTo, id],
    }));

    const isEdit = dialog?.mode === 'edit';
    // A file is required to create; editing changes metadata only (the API has
    // no file field on update), so the existing file just stays.
    const valid = form.name.trim() && form.visibleTo.length > 0 && (isEdit || Boolean(form.file));

    const submit = async () => {
        setTried(true);
        if (!valid) {
            notify(!form.name.trim() ? 'Give the document a name.'
                : (!isEdit && !form.file) ? 'Attach a file to upload.'
                    : 'Pick at least one role that can see this document.', 'warning');
            return;
        }

        setSaving(true);
        try {
            if (isEdit) {
                const { data: body } = await http.put(UpdateOrganisationDocument, {
                    id: dialog.id,
                    documentName: form.name.trim(),
                    category: form.category,
                    description: form.description,
                    visibleToUserTypeIds: form.visibleTo,
                });
                if (body?.error) throw new Error(body.message || 'Could not update the document.');
                notify(body?.message || `${form.name.trim()} updated.`);
            } else {
                // Multipart — the file rides alongside the metadata. Don't set a
                // Content-Type; axios adds the boundary for FormData.
                const fd = new FormData();
                fd.append('file', form.file);
                fd.append('documentName', form.name.trim());
                fd.append('category', form.category);
                fd.append('description', form.description || '');
                form.visibleTo.forEach((id) => fd.append('visibleToUserTypeIds', id));
                fd.append('entityName', entity?.name || '');
                const { data: body } = await http.post(PostOrganisationDocument, fd);
                if (body?.error) throw new Error(body.message || 'Could not upload the document.');
                notify(body?.message || `${form.name.trim()} uploaded and shared with ${form.visibleTo.length} role(s).`);
            }
            setDialog(null);
            await loadDocs();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not save the document.'), 'error');
        } finally {
            setSaving(false);
        }
    };

    const doDelete = async () => {
        if (!confirm || deleting) return;
        setDeleting(true);
        try {
            const { data: body } = await http.delete(DeleteOrganisationDocument, { params: { id: confirm.id } });
            if (body?.error) throw new Error(body.message || 'Could not remove the document.');
            notify(body?.message || `${confirm.name} removed.`);
            setConfirm(null);
            await loadDocs();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not remove the document.'), 'error');
        } finally {
            setDeleting(false);
        }
    };

    // Open the blob's public URL in a new tab (previews images/PDFs inline).
    const view = (d) => {
        if (d.url) window.open(d.url, '_blank', 'noopener');
        else notify('This document has no viewable file.', 'warning');
    };

    const download = async (d) => {
        if (downloading) return;
        setDownloading(d.id);
        try {
            const { blob, name } = await fetchFileBlob(DownloadOrganisationDocument, { id: d.id });
            saveBlob(blob, name || d.fileName);
        } catch (err) {
            notify(await blobErrorMessage(err, 'Could not download the file.'), 'error');
        } finally {
            setDownloading(null);
        }
    };

    const ScopeButton = ({ value, label }) => (
        <Button
            onClick={() => setScope(value)}
            sx={{
                height: 38, px: 1.8, fontSize: 12.5, fontWeight: 700, textTransform: 'none', borderRadius: '7px', boxShadow: 'none',
                bgcolor: scope === value ? PRIMARY : '#fff', color: scope === value ? '#fff' : '#64748B',
                border: `1px solid ${scope === value ? PRIMARY : '#E6EAF1'}`,
                '&:hover': { bgcolor: scope === value ? PRIMARY : '#F5F3FD', boxShadow: 'none' },
            }}
        >{label}</Button>
    );

    return (
        <Box>
            <Panel
                title="Organisation Documents"
                icon={CorporateFareRoundedIcon}
                chip={entity ? entity.name : '—'}
                hint={isEmployee ? 'Company files shared with your role' : 'Shared company files — visible only to the roles you pick'}
                action={(
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        {/* Admins choose between the manage view and their own uploads;
                            an employee only ever gets the read-only shared view. */}
                        {!isEmployee && (
                            <Stack direction="row" spacing={0.6}>
                                <ScopeButton value="all" label="All documents" />
                                <ScopeButton value="mine" label="My uploads" />
                            </Stack>
                        )}
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', px: 1.4, height: 38, width: { xs: 140, sm: 200 } }}>
                            <SearchRoundedIcon sx={{ fontSize: 18, color: '#98A0AE' }} />
                            <InputBase placeholder="Search documents…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ fontSize: 13, flex: 1 }} />
                        </Stack>
                        <Tooltip arrow title="Reload">
                            <IconButton onClick={loadDocs} disabled={loading} sx={{ border: '1px solid #E6EAF1', borderRadius: '7px', color: '#64748B', height: 38, width: 38, '&:hover': { bgcolor: PRIMARY_LIGHT, color: PRIMARY } }}>
                                <RefreshRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                        {!isEmployee && (
                            <Button startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ ...solidBtn, height: 38, px: 1.8, fontSize: 13 }}>Upload</Button>
                        )}
                    </Stack>
                )}
            >
                {loading ? (
                    <Box sx={{ p: 5, display: 'flex', justifyContent: 'center' }}><CircularProgress size={26} /></Box>
                ) : loadError ? (
                    <Box sx={{ p: 3 }}>
                        <Alert severity="error" sx={{ borderRadius: '9px' }}
                            action={<Button size="small" onClick={loadDocs} sx={{ textTransform: 'none', fontWeight: 700 }}>Retry</Button>}>
                            {loadError}
                        </Alert>
                    </Box>
                ) : filtered.length === 0 ? (
                    <EmptyState
                        icon={CorporateFareRoundedIcon}
                        title={q ? 'No documents match that search' : isEmployee ? 'No documents shared with you yet' : scope === 'mine' ? 'You haven’t uploaded any documents' : 'No organisation documents yet'}
                        hint={q ? 'Try another name or category.' : isEmployee ? 'When your organisation shares a handbook or policy with your role, it will appear here.' : 'Upload handbooks, policies and statutory certificates once — everyone in the chosen roles can then open them.'}
                    />
                ) : (
                    <Box sx={{ p: 1.8 }}>
                        <Grid container spacing={1.5}>
                            {filtered.map((d) => {
                                const kind = fileKind(d.fileName);
                                const busy = downloading === d.id;
                                return (
                                    <Grid size={{ xs: 12, sm: 6, xl: 4 }} key={d.id}>
                                        <Box sx={{
                                            height: '100%', border: '1px solid #EEF0F6', borderRadius: '9px', p: 1.8, bgcolor: '#fff',
                                            display: 'flex', flexDirection: 'column', gap: 1.2,
                                            transition: 'border-color .15s, box-shadow .15s, transform .15s',
                                            '&:hover': { borderColor: PRIMARY_BORDER, boxShadow: '0 10px 24px -14px rgba(124,92,252,0.5)', transform: 'translateY(-2px)' },
                                        }}>
                                            <Stack direction="row" spacing={1.4} sx={{ alignItems: 'flex-start' }}>
                                                <Box sx={{ width: 44, height: 44, borderRadius: '9px', bgcolor: kind.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <Typography sx={{ fontSize: 11, fontWeight: 800, color: kind.color }}>{kind.label}</Typography>
                                                </Box>
                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }} noWrap>{d.name}</Typography>
                                                    <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center', mt: 0.3, flexWrap: 'wrap' }}>
                                                        <Chip label={d.category} size="small" sx={{ height: 18, fontSize: 9.5, fontWeight: 700, bgcolor: PRIMARY_LIGHT, color: PRIMARY }} />
                                                        <Typography sx={{ fontSize: 11, color: '#98A0AE' }}>{fmtSize(d.fileSize)}</Typography>
                                                    </Stack>
                                                </Box>
                                                {!isEmployee && (
                                                    <Stack direction="row" spacing={0.2}>
                                                        <Tooltip arrow title="Edit"><IconButton size="small" onClick={() => openEdit(d)} sx={{ color: '#94A3B8', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}><EditRoundedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                                        <Tooltip arrow title="Remove"><IconButton size="small" onClick={() => setConfirm(d)} sx={{ color: '#94A3B8', '&:hover': { color: '#E11D48', bgcolor: '#FEF2F2' } }}><DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                                    </Stack>
                                                )}
                                            </Stack>

                                            <Typography sx={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, flexGrow: 1 }}>
                                                {d.description || 'No description.'}
                                            </Typography>

                                            {/* Who can open it */}
                                            <Box sx={{ pt: 1.2, borderTop: '1px dashed #E6EAF1' }}>
                                                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mb: 0.7 }}>
                                                    <LockRoundedIcon sx={{ fontSize: 13, color: '#94A3B8' }} />
                                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#98A0AE', textTransform: 'uppercase', letterSpacing: 0.4 }}>Visible to</Typography>
                                                </Stack>
                                                <Stack direction="row" spacing={0.6} sx={{ flexWrap: 'wrap', gap: 0.6 }}>
                                                    {d.visibleTo.length === 0 ? (
                                                        <Typography sx={{ fontSize: 11.5, color: '#C4C9D4', fontStyle: 'italic' }}>No roles — nobody can open this</Typography>
                                                    ) : d.visibleTo.map((r) => (
                                                        <Chip key={r.userTypeId} label={r.name} size="small"
                                                            sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: `${typeColor(r.userTypeId)}18`, color: typeColor(r.userTypeId), border: `1px solid ${typeColor(r.userTypeId)}44` }} />
                                                    ))}
                                                </Stack>
                                            </Box>

                                            <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', pt: 1.2, borderTop: '1px solid #F1F0F9' }}>
                                                <Avatar sx={{ width: 22, height: 22, bgcolor: PRIMARY_LIGHT, color: PRIMARY, fontSize: 9, fontWeight: 800 }}>{(d.uploadedBy || 'M').slice(0, 1)}</Avatar>
                                                <Typography sx={{ fontSize: 11, color: '#98A0AE', flex: 1 }} noWrap>{d.uploadedBy}{d.createdOn ? ` · ${fmtDate(d.createdOn)}` : ''}</Typography>
                                                <Tooltip arrow title="View"><IconButton size="small" onClick={() => view(d)} sx={{ color: '#64748B', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}><VisibilityRoundedIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                                                <Tooltip arrow title="Download">
                                                    <span>
                                                        <IconButton size="small" onClick={() => download(d)} disabled={busy} sx={{ color: '#64748B', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}>
                                                            {busy ? <CircularProgress size={15} /> : <DownloadRoundedIcon sx={{ fontSize: 17 }} />}
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </Stack>
                                        </Box>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </Box>
                )}
            </Panel>

            {/* Upload / edit */}
            <Dialog open={Boolean(dialog)} onClose={closeDialog} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{isEdit ? 'Edit Organisation Document' : 'Upload Organisation Document'}</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>
                        Filed under <strong>{entity?.name || '—'}</strong>. Only the roles you tick below can open it.
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    <Grid container spacing={1.8}>
                        <Grid size={{ xs: 12, sm: 7 }}>
                            <TextField label="Document name" size="small" fullWidth value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                error={tried && !form.name.trim()} sx={field} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 5 }}>
                            <TextField select label="Category" size="small" fullWidth value={form.category}
                                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} sx={field}>
                                {CATEGORIES.map((c) => <MenuItem key={c} value={c} sx={{ fontSize: 13.5 }}>{c}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid size={12}>
                            <TextField label="Description (optional)" size="small" fullWidth multiline minRows={2} value={form.description}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} sx={field} />
                        </Grid>

                        <Grid size={12}>
                            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#374151', mb: 0.8 }}>File</Typography>
                            {isEdit ? (
                                // The update endpoint changes metadata only — the file can't be swapped here.
                                <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: '9px', border: '1px solid #E6EAF1', bgcolor: '#F8FAFC' }}>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }} noWrap>{form.fileName || '—'}</Typography>
                                        <Typography sx={{ fontSize: 11, color: '#98A0AE' }}>{form.fileSize ? `${fmtSize(form.fileSize)} · ` : ''}kept as-is — re-upload to replace the file</Typography>
                                    </Box>
                                </Stack>
                            ) : (
                                <FileDrop file={form.file} onPick={(f) => setForm((x) => ({ ...x, file: f }))} onClear={() => setForm((x) => ({ ...x, file: null }))} error={tried && !form.file} />
                            )}
                        </Grid>

                        {/* Role visibility */}
                        <Grid size={12}>
                            <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center', mb: 0.9 }}>
                                <GroupsRoundedIcon sx={{ fontSize: 16, color: '#64748B' }} />
                                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#374151' }}>Who can see this document?</Typography>
                            </Stack>
                            {userTypes.length === 0 ? (
                                <Typography sx={{ fontSize: 12, color: '#98A0AE' }}>No roles available to choose from.</Typography>
                            ) : (
                                <Grid container spacing={1}>
                                    {userTypes.map((r) => {
                                        const on = form.visibleTo.includes(r.id);
                                        return (
                                            <Grid size={{ xs: 12, sm: 6 }} key={r.id}>
                                                <Box onClick={() => toggleType(r.id)}
                                                    sx={{
                                                        cursor: 'pointer', p: 1.3, borderRadius: '9px', display: 'flex', alignItems: 'center', gap: 1.1,
                                                        border: `1.5px solid ${on ? r.color : '#E5E7EB'}`, bgcolor: on ? `${r.color}0F` : '#fff', transition: '.15s',
                                                    }}>
                                                    <Box sx={{ width: 30, height: 30, borderRadius: '8px', bgcolor: on ? r.color : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                        <Typography sx={{ fontSize: 12, fontWeight: 800, color: on ? '#fff' : '#94A3B8' }}>{r.name.slice(0, 1)}</Typography>
                                                    </Box>
                                                    <Box sx={{ minWidth: 0 }}>
                                                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: on ? '#0F172A' : '#475569' }} noWrap>{r.name}</Typography>
                                                        <Typography sx={{ fontSize: 10.5, color: '#98A0AE' }}>{r.users} user{r.users === 1 ? '' : 's'}</Typography>
                                                    </Box>
                                                </Box>
                                            </Grid>
                                        );
                                    })}
                                </Grid>
                            )}
                            {tried && form.visibleTo.length === 0 && (
                                <Typography sx={{ fontSize: 11.5, color: '#E11D48', mt: 0.8, fontWeight: 600 }}>Pick at least one role, or nobody will be able to open it.</Typography>
                            )}
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={closeDialog} disabled={saving} sx={{ ...ghostBtn, height: 40, px: 2 }}>Cancel</Button>
                    <Button onClick={submit} disabled={saving} startIcon={saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : null} sx={{ ...solidBtn, height: 40, px: 2.4 }}>
                        {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Upload Document'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={Boolean(confirm)}
                onClose={() => { if (!deleting) setConfirm(null); }}
                onConfirm={doDelete}
                title="Remove this document?"
                body={confirm ? `${confirm.name} will no longer be available to any role. This cannot be undone.` : ''}
                confirmLabel="Remove"
            />

            <Snackbar open={Boolean(snack)} autoHideDuration={3400} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack(null)} severity={snack?.sev || 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack?.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
