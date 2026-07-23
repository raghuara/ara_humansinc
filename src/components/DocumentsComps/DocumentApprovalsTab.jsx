import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Stack, Avatar, IconButton, Tooltip, InputBase, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert,
} from '@mui/material';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { PRIMARY, PRIMARY_LIGHT, PRIMARY_DARK } from '../../theme';
import { fmtDate, initialsFromName as initials, paletteColor as colorFor } from '../../utils/format';
import { fmtSize } from '../../utils/fileStore';
import { ghostBtn, successBtn, dangerBtn, field, Panel, EmptyState, FileBadge } from '../uiKit';
import http, { apiErrorMessage } from '../../Api/http';
import { GetPendingApprovals, UpdateApprovalAction, PostApproveAll, DownloadSubmission } from '../../Api/Api';
import { fetchFileBlob, saveBlob, blobErrorMessage } from '../../utils/download';

// API dates are "DD-MM-YYYY"; fmtDate needs something `new Date()` can parse.
const isoFromDMY = (s) => {
    const m = String(s || '').match(/^(\d{2})-(\d{2})-(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : (s || '');
};

const normalizeApproval = (it) => ({
    recipientId: it.recipientId,
    requestId: it.requestId,
    employeeId: it.employeeCode ?? '',
    employeeName: it.employeeName ?? '',
    department: it.department ?? '',
    requestTitle: it.documentName ?? '',
    category: it.category ?? '',
    requestedBy: it.requestedByName ?? '',
    requestedOn: isoFromDMY(it.requestedOn),
    dueDate: isoFromDMY(it.dueDate),
    fileName: it.fileName ?? '',
    fileSize: Number(it.sizeBytes) || 0,
    submittedOn: isoFromDMY(it.submittedOn),
    remark: it.employeeNote ?? '',
});

export default function DocumentApprovalsTab() {
    const [pending, setPending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [acting, setActing] = useState(null);     // recipientId in flight, or 'all'

    const [q, setQ] = useState('');
    const [reject, setReject] = useState(null);      // the approval being rejected
    const [reason, setReason] = useState('');
    const [downloading, setDownloading] = useState(null);   // recipientId being fetched
    const [snack, setSnack] = useState(null);        // { msg, sev }

    const notify = (msg, sev = 'success') => setSnack({ msg, sev });

    // ── Load ──────────────────────────────────────────────────────────────────
    const loadApprovals = useCallback(async () => {
        setLoading(true);
        try {
            const { data: body } = await http.get(GetPendingApprovals);
            if (body?.error) throw new Error(body.message || 'Could not load pending approvals.');
            const items = Array.isArray(body?.data?.items) ? body.data.items : [];
            setPending(items.map(normalizeApproval));
            setLoadError('');
        } catch (err) {
            setLoadError(apiErrorMessage(err, 'Could not load pending approvals.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadApprovals(); }, [loadApprovals]);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return pending;
        return pending.filter((p) => [p.employeeName, p.employeeId, p.requestTitle, p.department].some((v) => String(v || '').toLowerCase().includes(s)));
    }, [pending, q]);

    // ── Actions ─────────────────────────────────────────────────────────────
    const approve = async (p) => {
        if (acting) return;
        setActing(p.recipientId);
        try {
            const { data: body } = await http.put(UpdateApprovalAction, { recipientId: p.recipientId, action: 'approve' });
            if (body?.error) throw new Error(body.message || 'Could not approve this submission.');
            notify(body?.message || `${p.requestTitle} approved — filed under ${p.employeeName}.`);
            await loadApprovals();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not approve this submission.'), 'error');
        } finally {
            setActing(null);
        }
    };

    const approveAll = async () => {
        if (acting || filtered.length === 0) return;
        setActing('all');
        try {
            const { data: body } = await http.post(PostApproveAll, { recipientIds: filtered.map((p) => p.recipientId) });
            if (body?.error) throw new Error(body.message || 'Could not approve all submissions.');
            notify(body?.message || `${filtered.length} submission${filtered.length === 1 ? '' : 's'} approved and filed.`);
            await loadApprovals();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not approve all submissions.'), 'error');
        } finally {
            setActing(null);
        }
    };

    const doReject = async () => {
        if (!reject || acting) return;
        setActing(reject.recipientId);
        try {
            const { data: body } = await http.put(UpdateApprovalAction, {
                recipientId: reject.recipientId,
                action: 'reject',
                reason: reason.trim(),
            });
            if (body?.error) throw new Error(body.message || 'Could not reject this submission.');
            notify(body?.message || `${reject.requestTitle} rejected — ${reject.employeeName} can re-upload.`);
            setReject(null);
            setReason('');
            await loadApprovals();
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not reject this submission.'), 'error');
        } finally {
            setActing(null);
        }
    };

    // Download the submitted file so the reviewer can see it before deciding.
    const download = async (p) => {
        if (downloading) return;
        setDownloading(p.recipientId);
        try {
            const { blob, name } = await fetchFileBlob(DownloadSubmission, { recipientId: p.recipientId });
            saveBlob(blob, name || p.fileName);
        } catch (err) {
            notify(await blobErrorMessage(err, 'Could not download the file.'), 'error');
        } finally {
            setDownloading(null);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Awaiting review */}
            <Panel
                title="Pending Approvals"
                icon={FactCheckRoundedIcon}
                chip={`${pending.length} awaiting review`}
                chipColor="#0369A1"
                chipBg="#E0F2FE"
                action={(
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', px: 1.4, height: 38, width: { xs: 150, sm: 220 } }}>
                            <SearchRoundedIcon sx={{ fontSize: 18, color: '#98A0AE' }} />
                            <InputBase placeholder="Search submissions…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ fontSize: 13, flex: 1 }} />
                        </Stack>
                        <Tooltip arrow title="Reload">
                            <IconButton onClick={loadApprovals} disabled={loading} sx={{ border: '1px solid #E6EAF1', borderRadius: '7px', color: '#64748B', height: 38, width: 38, '&:hover': { bgcolor: PRIMARY_LIGHT, color: PRIMARY } }}>
                                <RefreshRoundedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                        {filtered.length > 1 && (
                            <Button onClick={approveAll} disabled={Boolean(acting)}
                                startIcon={acting === 'all' ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : <DoneAllRoundedIcon sx={{ fontSize: 17 }} />}
                                sx={{ ...successBtn, height: 38, px: 1.6, fontSize: 12.5 }}>
                                {acting === 'all' ? 'Approving…' : `Approve all (${filtered.length})`}
                            </Button>
                        )}
                    </Stack>
                )}
            >
                {loading ? (
                    <Box sx={{ p: 5, display: 'flex', justifyContent: 'center' }}><CircularProgress size={26} /></Box>
                ) : loadError ? (
                    <Box sx={{ p: 3 }}>
                        <Alert severity="error" sx={{ borderRadius: '9px' }}
                            action={<Button size="small" onClick={loadApprovals} sx={{ textTransform: 'none', fontWeight: 700 }}>Retry</Button>}>
                            {loadError}
                        </Alert>
                    </Box>
                ) : filtered.length === 0 ? (
                    <EmptyState
                        icon={CheckRoundedIcon}
                        title={q ? 'Nothing matches that search' : 'Nothing waiting on you'}
                        hint={q ? 'Try another employee or document name.' : 'Every submitted document has been reviewed. New uploads land here automatically.'}
                    />
                ) : (
                    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                        {filtered.map((p) => {
                            const busy = acting === p.recipientId;
                            return (
                                <Box key={p.recipientId} sx={{ border: '1px solid #EEF0F6', borderRadius: '9px', p: 1.8, display: 'flex', alignItems: 'center', gap: 1.8, flexWrap: 'wrap', opacity: busy ? 0.6 : 1, transition: 'border-color .15s, box-shadow .15s', '&:hover': { borderColor: '#DDE3EC', boxShadow: '0 4px 14px -8px rgba(16,24,40,0.18)' } }}>
                                    {/* Who submitted */}
                                    <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center', minWidth: 190 }}>
                                        <Avatar sx={{ width: 42, height: 42, bgcolor: colorFor(p.employeeName), fontSize: 14, fontWeight: 700 }}>{initials(p.employeeName)}</Avatar>
                                        <Box>
                                            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{p.employeeName}</Typography>
                                            <Typography sx={{ fontSize: 11.5, color: '#98A0AE' }}>{p.employeeId}{p.department ? ` · ${p.department}` : ''}</Typography>
                                        </Box>
                                    </Stack>

                                    {/* What it is + who asked for it */}
                                    <Box sx={{ minWidth: 190 }}>
                                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#98A0AE', textTransform: 'uppercase', letterSpacing: 0.5 }}>Document</Typography>
                                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: PRIMARY_DARK }}>{p.requestTitle}</Typography>
                                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.3 }}>
                                            <PersonRoundedIcon sx={{ fontSize: 13, color: '#CBD2DD' }} />
                                            <Typography sx={{ fontSize: 11, color: '#98A0AE' }}>Requested by {p.requestedBy} · {fmtDate(p.requestedOn)}</Typography>
                                        </Stack>
                                    </Box>

                                    {/* The file */}
                                    <Box sx={{ flex: 1, minWidth: 210 }}>
                                        <FileBadge fileName={p.fileName} fileSize={p.fileSize} sub={`${fmtSize(p.fileSize)} · submitted ${fmtDate(p.submittedOn)}`} />
                                        {p.remark && <Typography sx={{ fontSize: 11.5, color: '#64748B', mt: 0.4, fontStyle: 'italic' }}>“{p.remark}”</Typography>}
                                        {p.dueDate && (
                                            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.4 }}>
                                                <ScheduleRoundedIcon sx={{ fontSize: 13, color: '#CBD2DD' }} />
                                                <Typography sx={{ fontSize: 11, color: '#98A0AE' }}>Due {fmtDate(p.dueDate)}</Typography>
                                            </Stack>
                                        )}
                                    </Box>

                                    {/* Decision */}
                                    <Stack direction="row" spacing={0.9} sx={{ flexWrap: 'wrap', gap: 0.9 }}>
                                        <Tooltip arrow title="Download file">
                                            <span>
                                                <IconButton onClick={() => download(p)} disabled={downloading === p.recipientId} sx={{ width: 36, height: 36, color: '#64748B', border: '1px solid #E6EAF1', borderRadius: '7px', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}>
                                                    {downloading === p.recipientId ? <CircularProgress size={16} /> : <DownloadRoundedIcon sx={{ fontSize: 18 }} />}
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <Button onClick={() => approve(p)} disabled={Boolean(acting)}
                                            startIcon={busy ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : <CheckRoundedIcon sx={{ fontSize: 17 }} />}
                                            sx={{ ...successBtn, height: 36, px: 1.8, fontSize: 12.5 }}>Approve</Button>
                                        <Button onClick={() => { setReject(p); setReason(''); }} disabled={Boolean(acting)} startIcon={<CloseRoundedIcon sx={{ fontSize: 17 }} />} sx={{ ...dangerBtn, height: 36, px: 1.6, fontSize: 12.5 }}>Reject</Button>
                                    </Stack>
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </Panel>

            {/* Reject */}
            <Dialog open={Boolean(reject)} onClose={() => { if (!acting) setReject(null); }} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ pb: 0.5 }}>
                    <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>Reject submission</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>{reject?.employeeName} · {reject?.requestTitle}</Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    <TextField label="Reason" size="small" fullWidth multiline minRows={3} autoFocus
                        placeholder="e.g. The scan is cut off — please re-upload the full page."
                        value={reason} onChange={(e) => setReason(e.target.value)} sx={field} />
                    <Typography sx={{ fontSize: 11.5, color: '#98A0AE', mt: 1 }}>They will be asked to upload it again with this reason attached.</Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setReject(null)} disabled={Boolean(acting)} sx={{ ...ghostBtn, height: 40, px: 2 }}>Cancel</Button>
                    <Button onClick={doReject} disabled={Boolean(acting) || !reason.trim()}
                        startIcon={acting && reject ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : null}
                        sx={{ height: 40, px: 2.4, fontWeight: 700, textTransform: 'none', borderRadius: '7px', bgcolor: '#DC2626', color: '#fff', '&:hover': { bgcolor: '#B91C1C' }, '&.Mui-disabled': { bgcolor: '#FCA5A5', color: '#fff' } }}>
                        {acting && reject ? 'Rejecting…' : 'Reject'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={Boolean(snack)} autoHideDuration={3600} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack(null)} severity={snack?.sev || 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack?.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
