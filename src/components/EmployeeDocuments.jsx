import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box, Typography, Button, Stack, Chip, IconButton, Tooltip, TextField, MenuItem, CircularProgress, Snackbar, Alert,
} from '@mui/material';
import FolderSharedRoundedIcon from '@mui/icons-material/FolderSharedRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { fmtSize } from '../utils/fileStore';
import { Panel, ConfirmDialog } from './uiKit';
import { PRIMARY, PRIMARY_LIGHT } from '../theme';
import http, { apiErrorMessage } from '../Api/http';
import { UploadEmployeeDoc, GetEmployeeDocs, DownloadEmployeeDoc, DeleteEmployeeDoc } from '../Api/Api';
import { fetchFileBlob, saveBlob, blobErrorMessage } from '../utils/download';

// The document-type vocabulary the API accepts. Exported so the onboard page can
// map its picker labels to the same slugs.
export const EMP_DOC_TYPES = [
    { slug: 'profile-photo', label: 'Profile Photo' },
    { slug: 'aadhaar-card', label: 'Aadhaar Card' },
    { slug: 'pan-card', label: 'PAN Card' },
    { slug: 'passport', label: 'Passport' },
    { slug: 'resume', label: 'Resume' },
    { slug: 'educational-certificates', label: 'Educational Certificates' },
    { slug: 'experience-certificates', label: 'Experience Certificates' },
    { slug: 'offer-letter', label: 'Offer Letter' },
    { slug: 'appointment-letter', label: 'Appointment Letter' },
    { slug: 'joining-letter', label: 'Joining Letter' },
    { slug: 'relieving-letter', label: 'Relieving Letter' },
    { slug: 'bank-passbook', label: 'Bank Passbook / Cancelled Cheque' },
    { slug: 'address-proof', label: 'Address Proof' },
    { slug: 'signature', label: 'Signature' },
    { slug: 'other', label: 'Other' },
];
const labelForSlug = (slug) => EMP_DOC_TYPES.find((t) => t.slug === slug)?.label || slug;

const normalizeDoc = (d) => ({
    id: d.id,
    documentType: d.documentType ?? '',
    fileName: d.fileName ?? '',
    url: d.url ?? '',
    contentType: d.contentType ?? '',
    sizeBytes: Number(d.sizeBytes) || 0,
    uploadedOn: d.uploadedOn ?? '',
});

// Documents section for one employee (numeric id). Used on the employee detail
// page; self-contained list + upload + download + delete.
export default function EmployeeDocuments({ employeeId }) {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [uploadType, setUploadType] = useState('aadhaar-card');
    const [uploading, setUploading] = useState(false);
    const [downloadingId, setDownloadingId] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [snack, setSnack] = useState(null);       // { msg, sev }
    const fileInput = useRef(null);

    const notify = (msg, sev = 'success') => setSnack({ msg, sev });

    const load = useCallback(async () => {
        if (employeeId == null) { setLoading(false); return; }
        setLoading(true);
        try {
            const { data: body } = await http.get(GetEmployeeDocs, { params: { employeeId } });
            if (body?.error) throw new Error(body.message || 'Could not load documents.');
            const list = Array.isArray(body?.data?.documents) ? body.data.documents : [];
            setDocs(list.map(normalizeDoc));
            setLoadError('');
        } catch (err) {
            setLoadError(apiErrorMessage(err, 'Could not load documents.'));
        } finally {
            setLoading(false);
        }
    }, [employeeId]);

    useEffect(() => { load(); }, [load]);

    const onPickFile = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';   // let the same file be re-picked later
        if (!file || uploading) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('employeeId', String(employeeId));
            fd.append('documentType', uploadType);
            fd.append('file', file);
            const { data: body } = await http.post(UploadEmployeeDoc, fd);
            if (body?.error) throw new Error(body.message || 'Could not upload the document.');
            notify(body?.message || `${labelForSlug(uploadType)} uploaded.`);
            await load();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not upload the document.'), 'error');
        } finally {
            setUploading(false);
        }
    };

    const view = (d) => {
        if (d.url) window.open(d.url, '_blank', 'noopener');
        else notify('This document has no viewable file.', 'warning');
    };

    const download = async (d) => {
        if (downloadingId) return;
        setDownloadingId(d.id);
        try {
            const { blob, name } = await fetchFileBlob(DownloadEmployeeDoc, { id: d.id });
            saveBlob(blob, name || d.fileName);
        } catch (err) {
            notify(await blobErrorMessage(err, 'Could not download the file.'), 'error');
        } finally {
            setDownloadingId(null);
        }
    };

    const doDelete = async () => {
        if (!confirm || deleting) return;
        setDeleting(true);
        try {
            const { data: body } = await http.delete(DeleteEmployeeDoc, { params: { id: confirm.id } });
            if (body?.error) throw new Error(body.message || 'Could not remove the document.');
            notify(body?.message || `${labelForSlug(confirm.documentType)} removed.`);
            setConfirm(null);
            await load();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not remove the document.'), 'error');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Panel
            title="Documents"
            icon={FolderSharedRoundedIcon}
            chip={`${docs.length} file${docs.length === 1 ? '' : 's'}`}
            action={(
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <TextField
                        select size="small" value={uploadType} onChange={(e) => setUploadType(e.target.value)}
                        sx={{ width: 200, '& .MuiOutlinedInput-root': { borderRadius: '7px', height: 38, fontSize: 13, bgcolor: '#fff' } }}
                    >
                        {EMP_DOC_TYPES.map((t) => <MenuItem key={t.slug} value={t.slug} sx={{ fontSize: 13 }}>{t.label}</MenuItem>)}
                    </TextField>
                    <input ref={fileInput} type="file" hidden onChange={onPickFile} />
                    <Button
                        onClick={() => fileInput.current?.click()} disabled={uploading || employeeId == null}
                        startIcon={uploading ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : <UploadFileRoundedIcon />}
                        sx={{ bgcolor: PRIMARY, color: '#fff', fontWeight: 700, borderRadius: '7px', textTransform: 'none', height: 38, px: 1.8, fontSize: 13, boxShadow: 'none', '&:hover': { bgcolor: '#6246E0', boxShadow: 'none' }, '&.Mui-disabled': { bgcolor: '#E2E8F0', color: '#94A3B8' } }}
                    >
                        {uploading ? 'Uploading…' : 'Upload'}
                    </Button>
                    <Tooltip arrow title="Reload">
                        <IconButton onClick={load} disabled={loading} sx={{ border: '1px solid #E6EAF1', borderRadius: '7px', color: '#64748B', height: 38, width: 38, '&:hover': { bgcolor: PRIMARY_LIGHT, color: PRIMARY } }}>
                            <RefreshRoundedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            )}
        >
            {loading ? (
                <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress size={24} /></Box>
            ) : loadError ? (
                <Box sx={{ p: 2.5 }}>
                    <Alert severity="error" sx={{ borderRadius: '9px' }}
                        action={<Button size="small" onClick={load} sx={{ textTransform: 'none', fontWeight: 700 }}>Retry</Button>}>
                        {loadError}
                    </Alert>
                </Box>
            ) : docs.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                    <FolderSharedRoundedIcon sx={{ fontSize: 34, color: '#CBD2DD' }} />
                    <Typography sx={{ fontSize: 13.5, color: '#98A0AE', mt: 0.5 }}>No documents uploaded yet.</Typography>
                    <Typography sx={{ fontSize: 12, color: '#B8B3C5', mt: 0.2 }}>Pick a type and upload — one file per document.</Typography>
                </Box>
            ) : (
                <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {docs.map((d) => {
                        const busy = downloadingId === d.id;
                        return (
                            <Stack key={d.id} direction="row" sx={{ alignItems: 'center', gap: 1.5, px: 1.6, py: 1.2, border: '1px solid #EEF0F6', borderRadius: '9px', bgcolor: '#fff', flexWrap: 'wrap' }}>
                                <Box sx={{ width: 40, height: 40, borderRadius: '9px', bgcolor: PRIMARY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <FolderSharedRoundedIcon sx={{ fontSize: 20, color: PRIMARY }} />
                                </Box>
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                                        <Chip label={labelForSlug(d.documentType)} size="small" sx={{ height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: '#E0F2FE', color: '#0369A1' }} />
                                        <Typography sx={{ fontSize: 11.5, color: '#98A0AE' }}>{fmtSize(d.sizeBytes)}{d.uploadedOn ? ` · ${d.uploadedOn}` : ''}</Typography>
                                    </Stack>
                                    <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#334155', mt: 0.2 }} noWrap>{d.fileName}</Typography>
                                </Box>
                                <Stack direction="row" spacing={0.4}>
                                    <Tooltip arrow title="View"><IconButton size="small" onClick={() => view(d)} sx={{ color: '#64748B', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}><VisibilityRoundedIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                                    <Tooltip arrow title="Download">
                                        <span><IconButton size="small" onClick={() => download(d)} disabled={busy} sx={{ color: '#64748B', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}>
                                            {busy ? <CircularProgress size={16} /> : <DownloadRoundedIcon sx={{ fontSize: 18 }} />}
                                        </IconButton></span>
                                    </Tooltip>
                                    <Tooltip arrow title="Remove"><IconButton size="small" onClick={() => setConfirm(d)} sx={{ color: '#94A3B8', '&:hover': { color: '#E11D48', bgcolor: '#FEF2F2' } }}><DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>
                                </Stack>
                            </Stack>
                        );
                    })}
                </Box>
            )}

            <ConfirmDialog
                open={Boolean(confirm)}
                onClose={() => { if (!deleting) setConfirm(null); }}
                onConfirm={doDelete}
                title="Remove this document?"
                body={confirm ? `${labelForSlug(confirm.documentType)} (${confirm.fileName}) will be permanently removed from this employee.` : ''}
                confirmLabel="Remove"
            />

            <Snackbar open={Boolean(snack)} autoHideDuration={3400} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack(null)} severity={snack?.sev || 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack?.msg}</Alert>
            </Snackbar>
        </Panel>
    );
}
