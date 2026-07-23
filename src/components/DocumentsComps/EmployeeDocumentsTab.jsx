import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Stack, Chip, Avatar, IconButton, Tooltip, InputBase, Collapse, Snackbar, Alert, CircularProgress,
} from '@mui/material';
import FolderSharedRoundedIcon from '@mui/icons-material/FolderSharedRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectEmployees } from '../../redux/slices/employeesSlice';
import { PRIMARY, PRIMARY_LIGHT } from '../../theme';
import { fmtDate, initialsFromName as initials, paletteColor as colorFor } from '../../utils/format';
import { fmtSize } from '../../utils/fileStore';
import { ghostBtn, Panel, EmptyState, FileBadge, ConfirmDialog } from '../uiKit';
import http, { apiErrorMessage } from '../../Api/http';
import { GetEmployeeDocuments, DownloadEmployeeDocument, DeleteEmployeeDocument } from '../../Api/Api';
import { fetchFileBlob, saveBlob, blobErrorMessage } from '../../utils/download';

// The GetEmployeeDocuments response shape wasn't shared, so field names are read
// defensively (camelCase or PascalCase). Send a sample and this can be tightened.
const pick = (o, ...keys) => { for (const k of keys) if (o?.[k] !== undefined && o[k] !== null) return o[k]; return undefined; };
const isoFromDMY = (s) => {
    const m = String(s || '').match(/^(\d{2})-(\d{2})-(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : (s || '');
};
const normalizeDoc = (d) => {
    const recipientId = pick(d, 'recipientId', 'RecipientId', 'id', 'Id');
    return {
        id: recipientId,
        recipientId,
        employeeId: pick(d, 'employeeCode', 'EmployeeCode', 'employeeId') ?? '',
        employeeName: pick(d, 'employeeName', 'EmployeeName') ?? '',
        name: pick(d, 'documentName', 'DocumentName', 'name') ?? '',
        category: pick(d, 'category', 'Category') ?? 'General',
        fileName: pick(d, 'fileName', 'FileName') ?? '',
        fileSize: Number(pick(d, 'sizeBytes', 'SizeBytes', 'fileSize') ?? 0),
        approvedBy: pick(d, 'approvedByName', 'ApprovedByName', 'reviewedByName', 'approvedBy') ?? '',
        approvedOn: isoFromDMY(pick(d, 'approvedOn', 'ApprovedOn', 'reviewedOn')),
    };
};

// The approved repository, grouped by employee — the same files the Employee
// module shows on each person's record.
export default function EmployeeDocumentsTab() {
    const navigate = useNavigate();
    const employees = useSelector(selectEmployees);

    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [downloading, setDownloading] = useState(null);   // recipientId
    const [deleting, setDeleting] = useState(false);

    const [q, setQ] = useState('');
    const [open, setOpen] = useState({});
    const [confirm, setConfirm] = useState(null);
    const [snack, setSnack] = useState(null);       // { msg, sev }

    const notify = (msg, sev = 'success') => setSnack({ msg, sev });

    const loadDocs = useCallback(async () => {
        setLoading(true);
        try {
            const { data: body } = await http.get(GetEmployeeDocuments);
            if (body?.error) throw new Error(body.message || 'Could not load employee documents.');
            const items = Array.isArray(body?.data?.items) ? body.data.items : (Array.isArray(body?.data) ? body.data : []);
            setDocs(items.map(normalizeDoc));
            setLoadError('');
        } catch (err) {
            setLoadError(apiErrorMessage(err, 'Could not load employee documents.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadDocs(); }, [loadDocs]);

    // Group by employee so a person's folder reads as one unit.
    const folders = useMemo(() => {
        const s = q.trim().toLowerCase();
        const byEmp = new Map();
        docs.forEach((d) => {
            if (s && ![d.employeeName, d.employeeId, d.name, d.fileName].some((v) => String(v || '').toLowerCase().includes(s))) return;
            if (!byEmp.has(d.employeeId)) byEmp.set(d.employeeId, { employeeId: d.employeeId, employeeName: d.employeeName, docs: [] });
            byEmp.get(d.employeeId).docs.push(d);
        });
        return [...byEmp.values()];
    }, [docs, q]);

    // Route id is the employee's numeric record id, not the EMP-00x code.
    const recordId = (employeeId) => employees.find((e) => e.employeeId === employeeId)?.id;

    const download = async (d) => {
        if (downloading) return;
        setDownloading(d.recipientId);
        try {
            const { blob, name } = await fetchFileBlob(DownloadEmployeeDocument, { recipientId: d.recipientId });
            saveBlob(blob, name || d.fileName);
        } catch (err) {
            notify(await blobErrorMessage(err, 'Could not download the file.'), 'error');
        } finally {
            setDownloading(null);
        }
    };

    const doDelete = async () => {
        if (!confirm || deleting) return;
        setDeleting(true);
        try {
            const { data: body } = await http.delete(DeleteEmployeeDocument, { params: { recipientId: confirm.recipientId } });
            if (body?.error) throw new Error(body.message || 'Could not remove the document.');
            notify(body?.message || `${confirm.name} removed from ${confirm.employeeName}'s record.`);
            setConfirm(null);
            await loadDocs();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not remove the document.'), 'error');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Box>
            <Panel
                title="Employee Documents"
                icon={FolderSharedRoundedIcon}
                chip={`${docs.length} approved file${docs.length === 1 ? '' : 's'}`}
                chipColor="#16A34A"
                chipBg="#DCFCE7"
                hint="Only approved documents are filed here — and in the employee's own record"
                action={(
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', px: 1.4, height: 38, width: { xs: 160, sm: 240 } }}>
                            <SearchRoundedIcon sx={{ fontSize: 18, color: '#98A0AE' }} />
                            <InputBase placeholder="Search by employee or document…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ fontSize: 13, flex: 1 }} />
                        </Stack>
                        <Tooltip arrow title="Reload">
                            <IconButton onClick={loadDocs} disabled={loading} sx={{ border: '1px solid #E6EAF1', borderRadius: '7px', color: '#64748B', height: 38, width: 38, '&:hover': { bgcolor: PRIMARY_LIGHT, color: PRIMARY } }}>
                                <RefreshRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
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
                ) : folders.length === 0 ? (
                    <EmptyState
                        icon={FolderSharedRoundedIcon}
                        title={q ? 'No documents match that search' : 'No approved documents yet'}
                        hint={q ? 'Try another employee or document name.' : 'Approve a submission from the Approvals tab and it lands in the employee’s folder.'}
                    />
                ) : (
                    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                        {folders.map((f) => {
                            const isOpen = open[f.employeeId] !== false;   // folders start open
                            const rid = recordId(f.employeeId);
                            return (
                                <Box key={f.employeeId} sx={{ border: '1px solid #EEF0F6', borderRadius: '9px', overflow: 'hidden' }}>
                                    <Stack
                                        direction="row"
                                        onClick={() => setOpen((o) => ({ ...o, [f.employeeId]: !isOpen }))}
                                        sx={{ alignItems: 'center', gap: 1.4, p: 1.6, cursor: 'pointer', bgcolor: '#FBFAFE', '&:hover': { bgcolor: '#F5F3FD' } }}
                                    >
                                        <Avatar sx={{ width: 38, height: 38, bgcolor: colorFor(f.employeeName), fontSize: 13, fontWeight: 700 }}>{initials(f.employeeName)}</Avatar>
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography sx={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{f.employeeName}</Typography>
                                            <Typography sx={{ fontSize: 11.5, color: '#98A0AE' }}>{f.employeeId}</Typography>
                                        </Box>
                                        <Chip label={`${f.docs.length} document${f.docs.length === 1 ? '' : 's'}`} size="small" sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: PRIMARY_LIGHT, color: PRIMARY }} />
                                        {rid && (
                                            <Button
                                                onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/employees/${rid}`); }}
                                                endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 15 }} />}
                                                sx={{ ...ghostBtn, height: 32, px: 1.3, fontSize: 11.5, display: { xs: 'none', sm: 'inline-flex' } }}
                                            >
                                                Open record
                                            </Button>
                                        )}
                                        <ExpandMoreRoundedIcon sx={{ fontSize: 22, color: '#94A3B8', transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
                                    </Stack>

                                    <Collapse in={isOpen} timeout="auto" unmountOnExit>
                                        <Box sx={{ borderTop: '1px solid #EEF0F6' }}>
                                            {f.docs.map((d) => (
                                                <Stack key={d.id} direction="row" sx={{ alignItems: 'center', gap: 1.5, px: 1.8, py: 1.3, borderBottom: '1px solid #F5F5FA', flexWrap: 'wrap', '&:last-of-type': { borderBottom: 'none' } }}>
                                                    <Box sx={{ minWidth: 200, flex: 1 }}>
                                                        <FileBadge fileName={d.fileName} fileSize={d.fileSize} sub={`${fmtSize(d.fileSize)} · ${d.name}`} />
                                                    </Box>
                                                    <Chip label={d.category} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: PRIMARY_LIGHT, color: PRIMARY }} />
                                                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 210 }}>
                                                        <VerifiedRoundedIcon sx={{ fontSize: 15, color: '#16A34A' }} />
                                                        <Typography sx={{ fontSize: 11.5, color: '#64748B' }}>
                                                            Approved{d.approvedBy ? ` by ${d.approvedBy}` : ''}{d.approvedOn ? ` · ${fmtDate(d.approvedOn)}` : ''}
                                                        </Typography>
                                                    </Stack>
                                                    <Stack direction="row" spacing={0.3}>
                                                        <Tooltip arrow title="Download">
                                                            <span>
                                                                <IconButton size="small" onClick={() => download(d)} disabled={downloading === d.recipientId} sx={{ color: '#94A3B8', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}>
                                                                    {downloading === d.recipientId ? <CircularProgress size={15} /> : <DownloadRoundedIcon sx={{ fontSize: 17 }} />}
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                        <Tooltip arrow title="Remove from record"><IconButton size="small" onClick={() => setConfirm(d)} sx={{ color: '#94A3B8', '&:hover': { color: '#E11D48', bgcolor: '#FEF2F2' } }}><DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
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

            <ConfirmDialog
                open={Boolean(confirm)}
                onClose={() => { if (!deleting) setConfirm(null); }}
                onConfirm={doDelete}
                title="Remove from employee record?"
                body={confirm ? `${confirm.name} (${confirm.fileName}) will be removed from ${confirm.employeeName}'s documents. The original request history is kept.` : ''}
                confirmLabel="Remove"
            />

            <Snackbar open={Boolean(snack)} autoHideDuration={3400} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack(null)} severity={snack?.sev || 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack?.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
