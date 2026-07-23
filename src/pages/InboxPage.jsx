import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
    Box, Typography, Button, Stack, Chip, Avatar, IconButton, Tooltip, InputBase, Snackbar, Alert, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import MarkEmailUnreadRoundedIcon from '@mui/icons-material/MarkEmailUnreadRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DraftsRoundedIcon from '@mui/icons-material/DraftsRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import MoreTimeRoundedIcon from '@mui/icons-material/MoreTimeRounded';
import BeachAccessRoundedIcon from '@mui/icons-material/BeachAccessRounded';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import InboxRoundedIcon from '@mui/icons-material/InboxRounded';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUnreadCount } from '../redux/slices/inboxSlice';
import { PRIMARY, PRIMARY_LIGHT } from '../theme';
import { initialsFromName as initials, paletteColor as colorFor } from '../utils/format';
import { solidBtn, ghostBtn, PageHeader, StatCards, Panel, EmptyState, ConfirmDialog } from '../components/uiKit';
import http, { apiErrorMessage } from '../Api/http';
import { GetInbox, UpdateMessageReadStatus, MarkAllRead, DeleteMessage, ClearAll, GetMyDocumentRequests, PostMyDocumentUpload } from '../Api/Api';

// Each message kind gets its own icon + accent, so the feed is scannable
// without reading every line.
const KINDS = {
    'document-request': { icon: AssignmentRoundedIcon, color: PRIMARY, bg: PRIMARY_LIGHT, label: 'Document request' },
    'document-submitted': { icon: UploadFileRoundedIcon, color: '#0369A1', bg: '#E0F2FE', label: 'Submission' },
    'document-approved': { icon: CheckCircleRoundedIcon, color: '#16A34A', bg: '#DCFCE7', label: 'Approved' },
    'document-rejected': { icon: CancelRoundedIcon, color: '#E11D48', bg: '#FEE2E2', label: 'Rejected' },
    advance: { icon: SavingsRoundedIcon, color: '#B45309', bg: '#FFF7ED', label: 'Salary advance' },
    overtime: { icon: MoreTimeRoundedIcon, color: '#0891B2', bg: '#ECFEFF', label: 'Overtime' },
    leave: { icon: BeachAccessRoundedIcon, color: '#7C3AED', bg: '#F3E8FF', label: 'Leave' },
    announcement: { icon: CampaignRoundedIcon, color: '#64748B', bg: '#F1F5F9', label: 'Announcement' },
};
const kindOf = (k) => KINDS[k] || KINDS.announcement;

// The message "kind" drives the icon/accent; it's inferred from the server's
// `type` first, then its `category` as a fallback.
const inferKind = (type, category) => {
    const t = String(type || '').toLowerCase();
    if (KINDS[t]) return t;
    if (t.includes('request')) return 'document-request';
    if (t.includes('submiss') || t.includes('submit') || t.includes('upload')) return 'document-submitted';
    if (t.includes('approv')) return 'document-approved';
    if (t.includes('reject') || t.includes('declin')) return 'document-rejected';
    if (t.includes('advance')) return 'advance';
    if (t.includes('overtime')) return 'overtime';
    if (t.includes('leave')) return 'leave';
    if (t.includes('announce')) return 'announcement';
    return String(category || '').toLowerCase().includes('doc') ? 'document-request' : 'announcement';
};
const normalizeMessage = (m, i) => ({
    id: m.id ?? `msg-${i}`,
    kind: inferKind(m.type, m.category),
    title: m.title ?? '',
    body: m.message ?? '',
    from: m.actorName ?? 'System',
    initials: m.actorInitials ?? '',
    timeAgo: m.timeAgo ?? m.createdOn ?? '',
    needsAction: Boolean(m.needsAction),
    read: Boolean(m.isRead),
    refId: m.refId ?? null,
    actionPath: m.actionPath ?? null,
    // A document REQUEST addressed to the caller — they can upload straight from
    // the inbox. (type "Request" + a documents category.)
    isDocRequest: String(m.type || '').toLowerCase() === 'request' && String(m.category || '').toLowerCase().includes('doc'),
});

export default function InboxPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [items, setItems] = useState([]);
    const [docReqs, setDocReqs] = useState([]);   // GetMyDocumentRequests items — for upload state
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const [q, setQ] = useState('');
    const [confirm, setConfirm] = useState(false);
    const [snack, setSnack] = useState(null);       // { msg, sev }

    const notify = (msg, sev = 'success') => setSnack({ msg, sev });
    const unread = useMemo(() => items.filter((m) => !m.read).length, [items]);

    // Keep the sidebar badge in step with the list — including after an
    // optimistic mark-read/delete, so it drops the moment the user acts.
    useEffect(() => { dispatch(setUnreadCount(unread)); }, [unread, dispatch]);

    const loadInbox = useCallback(async () => {
        setLoading(true);
        // The inbox and the caller's document requests load together — the latter
        // tells us which requested documents have already been uploaded, so the
        // inbox can hide the Upload button on those. A failure there is harmless
        // (best-effort): the Upload button just stays available.
        const [inboxRes, docRes] = await Promise.allSettled([
            http.get(GetInbox, { params: { filter: 'all' } }),
            http.get(GetMyDocumentRequests),
        ]);
        try {
            if (inboxRes.status === 'rejected') throw inboxRes.reason;
            const body = inboxRes.value?.data;
            if (body?.error) throw new Error(body.message || 'Could not load your inbox.');
            const list = Array.isArray(body?.data?.messages) ? body.data.messages : [];
            setItems(list.map(normalizeMessage));
            setLoadError('');
        } catch (err) {
            setLoadError(apiErrorMessage(err, 'Could not load your inbox.'));
        }
        const docBody = docRes.status === 'fulfilled' ? docRes.value?.data : null;
        setDocReqs(docBody && !docBody.error && Array.isArray(docBody.data?.items) ? docBody.data.items : []);
        setLoading(false);
    }, []);

    useEffect(() => { loadInbox(); }, [loadInbox]);

    // Each action updates the list optimistically for a snappy feel, then calls
    // the API; a failure re-reads the server so the UI can't drift out of sync.
    const setRead = async (id, read) => {
        setItems((list) => list.map((m) => (m.id === id ? { ...m, read } : m)));
        try {
            const { data: body } = await http.put(UpdateMessageReadStatus, { Id: id, IsRead: read });
            if (body?.error) throw new Error(body.message);
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not update the message.'), 'error');
            loadInbox();
        }
    };

    const markAllRead = async () => {
        setItems((list) => list.map((m) => ({ ...m, read: true })));
        try {
            const { data: body } = await http.put(MarkAllRead);
            if (body?.error) throw new Error(body.message);
            notify('All messages marked as read.');
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not mark all as read.'), 'error');
            loadInbox();
        }
    };

    const removeMessage = async (id) => {
        setItems((list) => list.filter((m) => m.id !== id));
        try {
            const { data: body } = await http.delete(DeleteMessage, { params: { id } });
            if (body?.error) throw new Error(body.message);
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not delete the message.'), 'error');
            loadInbox();
        }
    };

    const clearInbox = async () => {
        setItems([]);
        try {
            const { data: body } = await http.delete(ClearAll);
            if (body?.error) throw new Error(body.message);
            notify('Inbox cleared.');
        } catch (err) {
            notify(apiErrorMessage(err, 'Could not clear the inbox.'), 'error');
            loadInbox();
        }
    };

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return items;
        return items.filter((m) => [m.title, m.body, m.from].some((v) => String(v || '').toLowerCase().includes(s)));
    }, [items, q]);

    const counts = useMemo(() => ({
        total: items.length,
        unread,
        docs: items.filter((m) => String(m.kind || '').startsWith('document')).length,
        actionable: items.filter((m) => m.needsAction && !m.read).length,
    }), [items, unread]);

    const KPIS = [
        { label: 'Unread', value: counts.unread, sub: `${counts.total} message(s) total`, icon: MarkEmailUnreadRoundedIcon, color: PRIMARY, bg: PRIMARY_LIGHT },
        { label: 'Needs Action', value: counts.actionable, sub: 'Unread and waiting on you', icon: CheckCircleRoundedIcon, color: '#E11D48', bg: '#FEE2E2' },
        { label: 'Document Activity', value: counts.docs, sub: 'Requests, uploads and reviews', icon: AssignmentRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE' },
        { label: 'Read', value: counts.total - counts.unread, sub: 'Already seen', icon: DraftsRoundedIcon, color: '#16A34A', bg: '#DCFCE7' },
    ];

    // Opening a message marks it read and jumps to whatever it is about.
    const open = (m) => {
        if (!m.read) setRead(m.id, true);
        if (m.actionPath) navigate(m.actionPath);
    };

    // ── Upload against a document request, straight from the inbox ────────────
    // The message carries refId (the recipient row). PostMyDocumentUpload keys on
    // the REQUEST id, so we resolve it from GetMyDocumentRequests (matching the
    // recipient/request id), then post the file as multipart.
    const [upload, setUpload] = useState(null);   // { msg, requestId, docName, note, file, resolving, saving }
    const fileRef = useRef(null);

    const openUpload = async (m) => {
        setUpload({ msg: m, requestId: null, docName: m.title, note: '', file: null, resolving: true, saving: false });
        try {
            const { data: body } = await http.get(GetMyDocumentRequests);
            const items = Array.isArray(body?.data?.items) ? body.data.items : [];
            const match = items.find((it) => String(it.recipientId) === String(m.refId))
                || items.find((it) => String(it.requestId) === String(m.refId));
            setUpload((u) => u && { ...u, requestId: match?.requestId ?? m.refId, docName: match?.documentName || m.title, note: match?.note || '', resolving: false });
        } catch {
            // Couldn't read the list — fall back to refId as the request id.
            setUpload((u) => u && { ...u, requestId: m.refId, resolving: false });
        }
    };

    const submitUpload = async () => {
        if (!upload?.file) { notify('Choose a file to upload.', 'warning'); return; }
        if (upload.requestId == null) { notify('Could not find the matching request.', 'error'); return; }
        setUpload((u) => ({ ...u, saving: true }));
        try {
            const fd = new FormData();
            fd.append('RequestId', String(upload.requestId));
            fd.append('Note', upload.note || '');
            fd.append('File', upload.file);
            const { data: body } = await http.post(PostMyDocumentUpload, fd);
            if (body?.error) throw new Error(body.message || 'Upload failed.');
            notify(body?.message || 'Document uploaded — pending review.');
            setUpload(null);
            await loadInbox();
        } catch (err) {
            notify(apiErrorMessage(err, 'Upload failed.'), 'error');
            setUpload((u) => u && { ...u, saving: false });
        }
    };

    // The document request behind an inbox message (matched on the recipient/
    // request id), so the row knows whether it's still awaiting an upload.
    const docStatusFor = (refId) => {
        if (refId == null) return null;
        return docReqs.find((d) => String(d.recipientId) === String(refId))
            || docReqs.find((d) => String(d.requestId) === String(refId))
            || null;
    };

    return (
        <Box sx={{ p: 2 }}>
            <PageHeader title="Inbox" subtitle="Everything raised by employees or sent from management lands here">
                <Button onClick={loadInbox} disabled={loading} startIcon={<RefreshRoundedIcon />} sx={{ ...ghostBtn, height: 42, px: 2 }}>
                    Refresh
                </Button>
                {unread > 0 && (
                    <Button onClick={markAllRead} startIcon={<DoneAllRoundedIcon />} sx={{ ...ghostBtn, height: 42, px: 2 }}>
                        Mark all read
                    </Button>
                )}
                {items.length > 0 && (
                    <Button onClick={() => setConfirm(true)} startIcon={<DeleteOutlineRoundedIcon />} sx={{ ...ghostBtn, height: 42, px: 2, color: '#E11D48', borderColor: '#FBCFE8', '&:hover': { bgcolor: '#FEF2F2' } }}>
                        Clear all
                    </Button>
                )}
            </PageHeader>

            <StatCards items={KPIS} />

            <Panel
                title="Messages"
                icon={MailRoundedIcon}
                chip={`${filtered.length} of ${items.length}`}
                action={(
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', px: 1.4, height: 38, width: { xs: 150, sm: 230 } }}>
                        <SearchRoundedIcon sx={{ fontSize: 18, color: '#98A0AE' }} />
                        <InputBase placeholder="Search messages…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ fontSize: 13, flex: 1 }} />
                    </Stack>
                )}
            >
                {loading ? (
                    <Box sx={{ p: 5, display: 'flex', justifyContent: 'center' }}><CircularProgress size={26} /></Box>
                ) : loadError ? (
                    <Box sx={{ p: 3 }}>
                        <Alert severity="error" sx={{ borderRadius: '9px' }}
                            action={<Button size="small" onClick={loadInbox} sx={{ textTransform: 'none', fontWeight: 700 }}>Retry</Button>}>
                            {loadError}
                        </Alert>
                    </Box>
                ) : filtered.length === 0 ? (
                    <EmptyState
                        icon={InboxRoundedIcon}
                        title={q ? 'Nothing matches that search' : 'Your inbox is empty'}
                        hint={q ? 'Try another search term.' : 'Document requests, submissions and employee requests will show up here.'}
                    />
                ) : (
                    <Box>
                        {filtered.map((m) => {
                            const k = kindOf(m.kind);
                            // For a document request: has the caller already uploaded?
                            // Submitted/Approved → no Upload button (show status instead);
                            // Pending/Rejected (or unknown) → still needs an upload.
                            const doc = m.isDocRequest ? docStatusFor(m.refId) : null;
                            const docStatus = String(doc?.status || '').toLowerCase();
                            const uploaded = ['submitted', 'approved'].includes(docStatus);
                            return (
                                <Stack
                                    key={m.id}
                                    direction="row"
                                    onClick={() => open(m)}
                                    sx={{
                                        alignItems: 'flex-start', gap: 1.6, px: 2, py: 1.8, cursor: 'pointer',
                                        borderBottom: '1px solid #F1F0F9',
                                        bgcolor: m.read ? '#fff' : '#FBFAFE',
                                        borderLeft: m.read ? '3px solid transparent' : `3px solid ${k.color}`,
                                        transition: 'background-color .15s',
                                        '&:hover': { bgcolor: '#F5F3FD' },
                                        '&:hover .inbox-go': { opacity: 1 },
                                    }}
                                >
                                    {/* Kind badge */}
                                    <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.2 }}>
                                        <k.icon sx={{ fontSize: 20, color: k.color }} />
                                    </Box>

                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                                            <Typography sx={{ fontSize: 14, fontWeight: m.read ? 600 : 800, color: '#0F172A' }}>{m.title}</Typography>
                                            {!m.read && <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: k.color }} />}
                                            <Chip label={k.label} size="small" sx={{ height: 18, fontSize: 9.5, fontWeight: 700, bgcolor: k.bg, color: k.color }} />
                                        </Stack>
                                        <Typography sx={{ fontSize: 12.5, color: '#64748B', mt: 0.3, lineHeight: 1.5 }}>{m.body}</Typography>
                                        <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', mt: 0.7 }}>
                                            <Avatar sx={{ width: 20, height: 20, bgcolor: colorFor(m.from), fontSize: 8.5, fontWeight: 800 }}>{m.initials || initials(m.from)}</Avatar>
                                            <Typography sx={{ fontSize: 11.5, color: '#98A0AE' }}>{m.from}{m.timeAgo ? ` · ${m.timeAgo}` : ''}</Typography>
                                        </Stack>
                                    </Box>

                                    {/* Row actions */}
                                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                                        {/* Still awaiting upload → Upload button. Already
                                            uploaded → a status chip, no button. */}
                                        {m.isDocRequest && !uploaded && (
                                            <Button
                                                onClick={() => openUpload(m)}
                                                startIcon={<UploadFileRoundedIcon sx={{ fontSize: 15 }} />}
                                                sx={{ ...solidBtn, height: 32, px: 1.4, fontSize: 11.5, display: { xs: 'none', sm: 'inline-flex' } }}
                                            >
                                                {docStatus === 'rejected' ? 'Re-upload' : 'Upload'}
                                            </Button>
                                        )}
                                        {m.isDocRequest && uploaded && (
                                            <Chip
                                                label={docStatus === 'approved' ? 'Approved' : 'Submitted'}
                                                size="small"
                                                sx={{ height: 24, fontSize: 10.5, fontWeight: 800, mr: 0.3, bgcolor: docStatus === 'approved' ? '#DCFCE7' : '#FEF3C7', color: docStatus === 'approved' ? '#16A34A' : '#B45309', display: { xs: 'none', sm: 'inline-flex' } }}
                                            />
                                        )}
                                        {m.actionPath && !m.isDocRequest && (
                                            <Button
                                                className="inbox-go"
                                                onClick={() => open(m)}
                                                endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 15 }} />}
                                                sx={{ ...solidBtn, height: 32, px: 1.4, fontSize: 11.5, opacity: { xs: 1, md: 0 }, transition: 'opacity .15s', display: { xs: 'none', sm: 'inline-flex' } }}
                                            >
                                                Open
                                            </Button>
                                        )}
                                        {/* Unread → an "unread envelope" (sealed, highlighted);
                                            clicking opens it. Read → an open envelope, muted;
                                            clicking marks it unread again. */}
                                        <Tooltip arrow title={m.read ? 'Mark as unread' : 'Mark as read'}>
                                            <IconButton size="small" onClick={() => setRead(m.id, !m.read)} sx={{ color: m.read ? '#94A3B8' : PRIMARY, '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}>
                                                {m.read ? <DraftsRoundedIcon sx={{ fontSize: 18 }} /> : <MarkEmailUnreadRoundedIcon sx={{ fontSize: 18 }} />}
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip arrow title="Delete">
                                            <IconButton size="small" onClick={() => removeMessage(m.id)} sx={{ color: '#94A3B8', '&:hover': { color: '#E11D48', bgcolor: '#FEF2F2' } }}>
                                                <DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                </Stack>
                            );
                        })}
                    </Box>
                )}
            </Panel>

            <ConfirmDialog
                open={confirm}
                onClose={() => setConfirm(false)}
                onConfirm={() => { clearInbox(); setConfirm(false); }}
                title="Clear the inbox?"
                body={`All ${items.length} message(s) will be deleted. The underlying requests and documents are not affected.`}
                confirmLabel="Clear all"
            />

            {/* Upload against a document request */}
            <Dialog open={Boolean(upload)} onClose={() => !upload?.saving && setUpload(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogTitle sx={{ pb: 1 }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Upload Document</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.2 }}>
                        For <strong>{upload?.docName || 'this request'}</strong>. It's submitted for review once uploaded.
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ pt: '8px !important' }}>
                    {upload?.resolving ? (
                        <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}><CircularProgress size={22} /></Box>
                    ) : (
                        <Stack spacing={1.8}>
                            <Box>
                                <input ref={fileRef} type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    onChange={(e) => { const f = e.target.files?.[0]; if (f) setUpload((u) => u && { ...u, file: f }); }} />
                                <Button onClick={() => fileRef.current?.click()} startIcon={<UploadFileRoundedIcon sx={{ fontSize: 18 }} />}
                                    sx={{ ...ghostBtn, height: 44, width: '100%', justifyContent: 'flex-start', px: 1.6 }}>
                                    {upload?.file ? upload.file.name : 'Choose a file (PDF, JPG, PNG, DOC · max 10 MB)'}
                                </Button>
                            </Box>
                            <TextField label="Note (optional)" size="small" fullWidth multiline minRows={2} value={upload?.note || ''}
                                onChange={(e) => setUpload((u) => u && { ...u, note: e.target.value })} placeholder="e.g. Scanned from the original"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 14, bgcolor: '#F8FAFC' } }} />
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setUpload(null)} disabled={upload?.saving} sx={{ ...ghostBtn, height: 40, px: 2 }}>Cancel</Button>
                    <Button onClick={submitUpload} disabled={upload?.saving || upload?.resolving || !upload?.file}
                        startIcon={upload?.saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <UploadFileRoundedIcon sx={{ fontSize: 17 }} />}
                        sx={{ ...solidBtn, height: 40, px: 2.4, '&.Mui-disabled': { bgcolor: '#E2E8F0', color: '#94A3B8' } }}>
                        {upload?.saving ? 'Uploading…' : 'Upload'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={Boolean(snack)} autoHideDuration={3000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack(null)} severity={snack?.sev || 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack?.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
