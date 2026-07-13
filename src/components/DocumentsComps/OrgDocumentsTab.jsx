import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Grid, Button, Stack, Chip, IconButton, Tooltip, InputBase, Avatar,
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
import { useSelector, useDispatch } from 'react-redux';
import { selectOrgDocs, addOrgDoc, updateOrgDoc, deleteOrgDoc } from '../../redux/slices/documentsSlice';
import { selectRoles } from '../../redux/slices/rolesSlice';
import { selectActiveEntity, selectActiveEntityId } from '../../redux/slices/orgSlice';
import { PRIMARY, PRIMARY_LIGHT, PRIMARY_BORDER } from '../../theme';
import { fmtDate } from '../../utils/format';
import { putFile, openFile, downloadFile, fmtSize, fileKind } from '../../utils/fileStore';
import { solidBtn, ghostBtn, field, Panel, EmptyState, ConfirmDialog } from '../uiKit';
import { FileDrop } from './FilePicker';

const CATEGORIES = ['Policy', 'Statutory', 'Compliance', 'Template', 'Announcement', 'General'];
const EMPTY = { name: '', category: 'Policy', description: '', visibleTo: [], file: null, fileName: '', fileSize: 0, fileKey: '' };

export default function OrgDocumentsTab() {
    const dispatch = useDispatch();
    const docs = useSelector(selectOrgDocs);
    const roles = useSelector(selectRoles);
    const entity = useSelector(selectActiveEntity);
    const entityId = useSelector(selectActiveEntityId);
    const auth = useSelector((s) => s.auth);

    const [q, setQ] = useState('');
    const [dialog, setDialog] = useState(null);   // { mode: 'create' | 'edit', id? }
    const [form, setForm] = useState(EMPTY);
    const [tried, setTried] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [snack, setSnack] = useState('');

    const roleName = (id) => roles.find((r) => r.id === id)?.name || id;
    const roleColor = (id) => roles.find((r) => r.id === id)?.color || '#64748B';

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return docs;
        return docs.filter((d) => [d.name, d.category, d.description, d.fileName].some((v) => String(v || '').toLowerCase().includes(s)));
    }, [docs, q]);

    const openCreate = () => { setForm({ ...EMPTY, visibleTo: ['administrator'] }); setTried(false); setDialog({ mode: 'create' }); };
    const openEdit = (d) => { setForm({ ...EMPTY, ...d, file: null }); setTried(false); setDialog({ mode: 'edit', id: d.id }); };

    const toggleRole = (id) => setForm((f) => ({
        ...f,
        visibleTo: f.visibleTo.includes(id) ? f.visibleTo.filter((r) => r !== id) : [...f.visibleTo, id],
    }));

    // On create a file is required; on edit, keeping the existing one is fine.
    const hasFile = Boolean(form.file) || Boolean(form.fileName);
    const valid = form.name.trim() && hasFile && form.visibleTo.length > 0;

    const submit = () => {
        setTried(true);
        if (!valid) {
            setSnack(!form.name.trim() ? 'Give the document a name.'
                : !hasFile ? 'Attach a file to upload.'
                    : 'Pick at least one role that can see this document.');
            return;
        }

        // A newly picked File goes into the session store; only its metadata is
        // persisted, so nothing unserialisable reaches Redux.
        let { fileName, fileSize, fileKey } = form;
        if (form.file) {
            fileKey = putFile(form.file);
            fileName = form.file.name;
            fileSize = form.file.size;
        }

        const payload = {
            name: form.name.trim(), category: form.category, description: form.description,
            visibleTo: form.visibleTo, fileName, fileSize, fileKey,
        };

        if (dialog.mode === 'create') {
            dispatch(addOrgDoc({ ...payload, entityId, uploadedBy: auth.userName || 'Management' }));
            setSnack(`${payload.name} uploaded and shared with ${form.visibleTo.length} role(s).`);
        } else {
            dispatch(updateOrgDoc({ id: dialog.id, changes: payload }));
            setSnack(`${payload.name} updated.`);
        }
        setDialog(null);
    };

    const view = (key) => { if (!openFile(key)) setSnack('That file was uploaded in an earlier session, so there is nothing to preview here.'); };
    const download = (d) => { if (!downloadFile(d.fileKey, d.fileName)) setSnack('That file was uploaded in an earlier session, so there is nothing to download here.'); };

    return (
        <Box>
            <Panel
                title="Organisation Documents"
                icon={CorporateFareRoundedIcon}
                chip={entity ? entity.name : '—'}
                hint="Shared company files — visible only to the roles you pick"
                action={(
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', px: 1.4, height: 38, width: { xs: 140, sm: 200 } }}>
                            <SearchRoundedIcon sx={{ fontSize: 18, color: '#98A0AE' }} />
                            <InputBase placeholder="Search documents…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ fontSize: 13, flex: 1 }} />
                        </Stack>
                        <Button startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ ...solidBtn, height: 38, px: 1.8, fontSize: 13 }}>Upload</Button>
                    </Stack>
                )}
            >
                {filtered.length === 0 ? (
                    <EmptyState
                        icon={CorporateFareRoundedIcon}
                        title={q ? 'No documents match that search' : 'No organisation documents yet'}
                        hint={q ? 'Try another name or category.' : 'Upload handbooks, policies and statutory certificates once — everyone in the chosen roles can then open them.'}
                    />
                ) : (
                    <Box sx={{ p: 1.8 }}>
                        <Grid container spacing={1.5}>
                            {filtered.map((d) => {
                                const kind = fileKind(d.fileName);
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
                                                <Stack direction="row" spacing={0.2}>
                                                    <Tooltip arrow title="Edit"><IconButton size="small" onClick={() => openEdit(d)} sx={{ color: '#94A3B8', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}><EditRoundedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                                    <Tooltip arrow title="Remove"><IconButton size="small" onClick={() => setConfirm(d)} sx={{ color: '#94A3B8', '&:hover': { color: '#E11D48', bgcolor: '#FEF2F2' } }}><DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                                                </Stack>
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
                                                    {(d.visibleTo || []).length === 0 ? (
                                                        <Typography sx={{ fontSize: 11.5, color: '#C4C9D4', fontStyle: 'italic' }}>No roles — nobody can open this</Typography>
                                                    ) : d.visibleTo.map((r) => (
                                                        <Chip key={r} label={roleName(r)} size="small"
                                                            sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: `${roleColor(r)}18`, color: roleColor(r), border: `1px solid ${roleColor(r)}44` }} />
                                                    ))}
                                                </Stack>
                                            </Box>

                                            <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', pt: 1.2, borderTop: '1px solid #F1F0F9' }}>
                                                <Avatar sx={{ width: 22, height: 22, bgcolor: PRIMARY_LIGHT, color: PRIMARY, fontSize: 9, fontWeight: 800 }}>{(d.uploadedBy || 'M').slice(0, 1)}</Avatar>
                                                <Typography sx={{ fontSize: 11, color: '#98A0AE', flex: 1 }} noWrap>{d.uploadedBy} · {fmtDate(d.uploadedOn)}</Typography>
                                                <Tooltip arrow title="View"><IconButton size="small" onClick={() => view(d.fileKey)} sx={{ color: '#64748B', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}><VisibilityRoundedIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                                                <Tooltip arrow title="Download"><IconButton size="small" onClick={() => download(d)} sx={{ color: '#64748B', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}><DownloadRoundedIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
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
            <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{dialog?.mode === 'edit' ? 'Edit Organisation Document' : 'Upload Organisation Document'}</Typography>
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
                            {form.file ? (
                                <FileDrop file={form.file} onPick={(f) => setForm((x) => ({ ...x, file: f }))} onClear={() => setForm((x) => ({ ...x, file: null }))} />
                            ) : form.fileName ? (
                                // Editing and keeping the file already on record.
                                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1.5, p: 1.5, borderRadius: '9px', border: '1px solid #E6EAF1', bgcolor: '#F8FAFC' }}>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }} noWrap>{form.fileName}</Typography>
                                        <Typography sx={{ fontSize: 11, color: '#98A0AE' }}>{fmtSize(form.fileSize)} · already on record</Typography>
                                    </Box>
                                    <Button onClick={() => setForm((x) => ({ ...x, fileName: '', fileSize: 0, fileKey: '' }))} sx={{ ...ghostBtn, height: 32, px: 1.4, fontSize: 11.5 }}>Replace</Button>
                                </Stack>
                            ) : (
                                <FileDrop file={null} onPick={(f) => setForm((x) => ({ ...x, file: f }))} error={tried && !hasFile} />
                            )}
                        </Grid>

                        {/* Role visibility */}
                        <Grid size={12}>
                            <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center', mb: 0.9 }}>
                                <GroupsRoundedIcon sx={{ fontSize: 16, color: '#64748B' }} />
                                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#374151' }}>Who can see this document?</Typography>
                            </Stack>
                            <Grid container spacing={1}>
                                {roles.map((r) => {
                                    const on = form.visibleTo.includes(r.id);
                                    return (
                                        <Grid size={{ xs: 12, sm: 6 }} key={r.id}>
                                            <Box onClick={() => toggleRole(r.id)}
                                                sx={{
                                                    cursor: 'pointer', p: 1.3, borderRadius: '9px', display: 'flex', alignItems: 'center', gap: 1.1,
                                                    border: `1.5px solid ${on ? r.color : '#E5E7EB'}`, bgcolor: on ? `${r.color}0F` : '#fff', transition: '.15s',
                                                }}>
                                                <Box sx={{ width: 30, height: 30, borderRadius: '8px', bgcolor: on ? r.color : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <Typography sx={{ fontSize: 12, fontWeight: 800, color: on ? '#fff' : '#94A3B8' }}>{r.name.slice(0, 1)}</Typography>
                                                </Box>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: on ? '#0F172A' : '#475569' }} noWrap>{r.name}</Typography>
                                                    <Typography sx={{ fontSize: 10.5, color: '#98A0AE' }}>{r.users.length} user{r.users.length === 1 ? '' : 's'}</Typography>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                            {tried && form.visibleTo.length === 0 && (
                                <Typography sx={{ fontSize: 11.5, color: '#E11D48', mt: 0.8, fontWeight: 600 }}>Pick at least one role, or nobody will be able to open it.</Typography>
                            )}
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setDialog(null)} sx={{ ...ghostBtn, height: 40, px: 2 }}>Cancel</Button>
                    <Button onClick={submit} sx={{ ...solidBtn, height: 40, px: 2.4 }}>{dialog?.mode === 'edit' ? 'Save Changes' : 'Upload Document'}</Button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={Boolean(confirm)}
                onClose={() => setConfirm(null)}
                onConfirm={() => { dispatch(deleteOrgDoc(confirm.id)); setSnack(`${confirm.name} removed.`); setConfirm(null); }}
                title="Remove this document?"
                body={confirm ? `${confirm.name} will no longer be available to any role. This cannot be undone.` : ''}
                confirmLabel="Remove"
            />

            <Snackbar open={Boolean(snack)} autoHideDuration={3400} onClose={() => setSnack('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack('')} severity={/Give|Attach|Pick|earlier session/.test(snack) ? 'warning' : 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack}</Alert>
            </Snackbar>
        </Box>
    );
}
