import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Button, Stack, Chip, Avatar, IconButton, Tooltip, InputBase, Snackbar, Alert,
} from '@mui/material';
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
import { useSelector, useDispatch } from 'react-redux';
import { selectInbox, selectUnreadCount, markRead, markUnread, markAllRead, removeMessage, clearInbox } from '../redux/slices/inboxSlice';
import { PRIMARY, PRIMARY_LIGHT } from '../theme';
import { initialsFromName as initials, paletteColor as colorFor } from '../utils/format';
import { solidBtn, ghostBtn, PageHeader, StatCards, Panel, EmptyState, ConfirmDialog } from '../components/uiKit';

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

const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'document', label: 'Documents' },
    { key: 'requests', label: 'Approvals & requests' },
];

// "2 hours ago" / "3 days ago" — an absolute date once it's older than a week.
const ago = (iso) => {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const mins = Math.floor((Date.now() - then) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function InboxPage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const items = useSelector(selectInbox);
    const unread = useSelector(selectUnreadCount);

    const [filter, setFilter] = useState('all');
    const [q, setQ] = useState('');
    const [confirm, setConfirm] = useState(false);
    const [snack, setSnack] = useState('');

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        return items.filter((m) => {
            const kind = String(m.kind || '');
            if (filter === 'unread' && m.read) return false;
            if (filter === 'document' && !kind.startsWith('document')) return false;
            if (filter === 'requests' && !['document-request', 'document-submitted', 'advance', 'overtime', 'leave'].includes(kind)) return false;
            if (!s) return true;
            return [m.title, m.body, m.from].some((v) => String(v || '').toLowerCase().includes(s));
        });
    }, [items, filter, q]);

    const counts = useMemo(() => ({
        total: items.length,
        unread,
        docs: items.filter((m) => String(m.kind || '').startsWith('document')).length,
        actionable: items.filter((m) => ['document-submitted', 'advance', 'overtime', 'leave'].includes(m.kind) && !m.read).length,
    }), [items, unread]);

    const KPIS = [
        { label: 'Unread', value: counts.unread, sub: `${counts.total} message(s) total`, icon: MarkEmailUnreadRoundedIcon, color: PRIMARY, bg: PRIMARY_LIGHT },
        { label: 'Needs Action', value: counts.actionable, sub: 'Unread and waiting on you', icon: CheckCircleRoundedIcon, color: '#E11D48', bg: '#FEE2E2' },
        { label: 'Document Activity', value: counts.docs, sub: 'Requests, uploads and reviews', icon: AssignmentRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE' },
        { label: 'Read', value: counts.total - counts.unread, sub: 'Already seen', icon: DraftsRoundedIcon, color: '#16A34A', bg: '#DCFCE7' },
    ];

    // Opening a message marks it read and jumps to whatever it is about.
    const open = (m) => {
        if (!m.read) dispatch(markRead(m.id));
        if (m.actionPath) navigate(m.actionPath);
    };

    return (
        <Box sx={{ p: 2 }}>
            <PageHeader title="Inbox" subtitle="Everything raised by employees or sent from management lands here">
                {unread > 0 && (
                    <Button onClick={() => { dispatch(markAllRead()); setSnack('All messages marked as read.'); }} startIcon={<DoneAllRoundedIcon />} sx={{ ...ghostBtn, height: 42, px: 2 }}>
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
                {/* Filter pills */}
                <Stack direction="row" spacing={0.8} sx={{ px: 1.8, py: 1.4, borderBottom: '1px solid #F1F0F9', flexWrap: 'wrap', gap: 0.8 }}>
                    {FILTERS.map((f) => {
                        const on = filter === f.key;
                        const n = f.key === 'unread' ? unread : null;
                        return (
                            <Chip
                                key={f.key}
                                label={n ? `${f.label} (${n})` : f.label}
                                size="small"
                                onClick={() => setFilter(f.key)}
                                sx={{
                                    cursor: 'pointer', fontWeight: 700, fontSize: 12, height: 28,
                                    bgcolor: on ? PRIMARY : '#F1F5F9', color: on ? '#fff' : '#475569',
                                    '&:hover': { bgcolor: on ? PRIMARY : '#E2E8F0' },
                                }}
                            />
                        );
                    })}
                </Stack>

                {filtered.length === 0 ? (
                    <EmptyState
                        icon={InboxRoundedIcon}
                        title={q || filter !== 'all' ? 'Nothing matches these filters' : 'Your inbox is empty'}
                        hint={q || filter !== 'all' ? 'Try another search or switch back to All.' : 'Document requests, submissions and employee requests will show up here.'}
                    />
                ) : (
                    <Box>
                        {filtered.map((m) => {
                            const k = kindOf(m.kind);
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
                                            <Avatar sx={{ width: 20, height: 20, bgcolor: colorFor(m.from), fontSize: 8.5, fontWeight: 800 }}>{initials(m.from)}</Avatar>
                                            <Typography sx={{ fontSize: 11.5, color: '#98A0AE' }}>{m.from} · {ago(m.createdOn)}</Typography>
                                        </Stack>
                                    </Box>

                                    {/* Row actions */}
                                    <Stack direction="row" spacing={0.3} sx={{ alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                                        {m.actionPath && (
                                            <Button
                                                className="inbox-go"
                                                onClick={() => open(m)}
                                                endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 15 }} />}
                                                sx={{ ...solidBtn, height: 32, px: 1.4, fontSize: 11.5, opacity: { xs: 1, md: 0 }, transition: 'opacity .15s', display: { xs: 'none', sm: 'inline-flex' } }}
                                            >
                                                Open
                                            </Button>
                                        )}
                                        <Tooltip arrow title={m.read ? 'Mark unread' : 'Mark read'}>
                                            <IconButton size="small" onClick={() => dispatch(m.read ? markUnread(m.id) : markRead(m.id))} sx={{ color: '#94A3B8', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}>
                                                {m.read ? <MailRoundedIcon sx={{ fontSize: 17 }} /> : <DraftsRoundedIcon sx={{ fontSize: 17 }} />}
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip arrow title="Delete">
                                            <IconButton size="small" onClick={() => dispatch(removeMessage(m.id))} sx={{ color: '#94A3B8', '&:hover': { color: '#E11D48', bgcolor: '#FEF2F2' } }}>
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
                onConfirm={() => { dispatch(clearInbox()); setConfirm(false); setSnack('Inbox cleared.'); }}
                title="Clear the inbox?"
                body={`All ${items.length} message(s) will be deleted. The underlying requests and documents are not affected.`}
                confirmLabel="Clear all"
            />

            <Snackbar open={Boolean(snack)} autoHideDuration={3000} onClose={() => setSnack('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack('')} severity="success" variant="filled" sx={{ borderRadius: '7px' }}>{snack}</Alert>
            </Snackbar>
        </Box>
    );
}
