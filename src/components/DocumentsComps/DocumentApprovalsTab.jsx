import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Button, Stack, Chip, Avatar, IconButton, Tooltip, InputBase,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert,
} from '@mui/material';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import { useSelector, useDispatch } from 'react-redux';
import {
    selectPendingApprovals, selectEmployeeDocs,
    approveSubmission, rejectSubmission,
} from '../../redux/slices/documentsSlice';
import { PRIMARY, PRIMARY_LIGHT, PRIMARY_DARK } from '../../theme';
import { fmtDate, initialsFromName as initials, paletteColor as colorFor } from '../../utils/format';
import { openFile, fmtSize } from '../../utils/fileStore';
import { ghostBtn, successBtn, dangerBtn, field, th, td, Panel, EmptyState, FileBadge } from '../uiKit';

export default function DocumentApprovalsTab() {
    const dispatch = useDispatch();
    const pending = useSelector(selectPendingApprovals);
    const employeeDocs = useSelector(selectEmployeeDocs);
    const auth = useSelector((s) => s.auth);

    const [q, setQ] = useState('');
    const [reject, setReject] = useState(null);
    const [reason, setReason] = useState('');
    const [snack, setSnack] = useState('');

    const reviewer = auth.userName || 'Management';

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return pending;
        return pending.filter((p) => [p.employeeName, p.employeeId, p.requestTitle, p.department].some((v) => String(v || '').toLowerCase().includes(s)));
    }, [pending, q]);

    // The approved trail — only request-sourced docs, newest first.
    const approved = useMemo(
        () => employeeDocs.filter((d) => d.source === 'request').slice(0, 12),
        [employeeDocs],
    );

    const approve = (p) => {
        dispatch(approveSubmission({ requestId: p.requestId, employeeId: p.employeeId, employeeName: p.employeeName, title: p.requestTitle, reviewedBy: reviewer }));
        setSnack(`${p.requestTitle} approved — now filed under ${p.employeeName}.`);
    };

    const approveAll = () => {
        filtered.forEach(approve);
        setSnack(`${filtered.length} submission${filtered.length === 1 ? '' : 's'} approved and filed.`);
    };

    const doReject = () => {
        dispatch(rejectSubmission({
            requestId: reject.requestId, employeeId: reject.employeeId,
            employeeName: reject.employeeName, title: reject.requestTitle,
            reason: reason.trim(), reviewedBy: reviewer,
        }));
        setSnack(`${reject.requestTitle} rejected — ${reject.employeeName} can re-upload.`);
        setReject(null);
        setReason('');
    };

    const view = (key) => {
        if (!openFile(key)) setSnack('That file was uploaded in an earlier session, so there is nothing to preview here.');
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
                        {filtered.length > 1 && (
                            <Button onClick={approveAll} startIcon={<DoneAllRoundedIcon sx={{ fontSize: 17 }} />} sx={{ ...successBtn, height: 38, px: 1.6, fontSize: 12.5 }}>
                                Approve all ({filtered.length})
                            </Button>
                        )}
                    </Stack>
                )}
            >
                {filtered.length === 0 ? (
                    <EmptyState
                        icon={CheckRoundedIcon}
                        title={q ? 'Nothing matches that search' : 'Nothing waiting on you'}
                        hint={q ? 'Try another employee or document name.' : 'Every submitted document has been reviewed. New uploads land here automatically.'}
                    />
                ) : (
                    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                        {filtered.map((p) => (
                            <Box key={`${p.requestId}-${p.employeeId}`} sx={{ border: '1px solid #EEF0F6', borderRadius: '9px', p: 1.8, display: 'flex', alignItems: 'center', gap: 1.8, flexWrap: 'wrap', transition: 'border-color .15s, box-shadow .15s', '&:hover': { borderColor: '#DDE3EC', boxShadow: '0 4px 14px -8px rgba(16,24,40,0.18)' } }}>
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
                                    <Tooltip arrow title="View file">
                                        <IconButton onClick={() => view(p.fileKey)} sx={{ width: 36, height: 36, color: '#64748B', border: '1px solid #E6EAF1', borderRadius: '7px', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}>
                                            <VisibilityRoundedIcon sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    </Tooltip>
                                    <Button onClick={() => approve(p)} startIcon={<CheckRoundedIcon sx={{ fontSize: 17 }} />} sx={{ ...successBtn, height: 36, px: 1.8, fontSize: 12.5 }}>Approve</Button>
                                    <Button onClick={() => { setReject(p); setReason(''); }} startIcon={<CloseRoundedIcon sx={{ fontSize: 17 }} />} sx={{ ...dangerBtn, height: 36, px: 1.6, fontSize: 12.5 }}>Reject</Button>
                                </Stack>
                            </Box>
                        ))}
                    </Box>
                )}
            </Panel>

            {/* Approved trail */}
            <Panel
                title="Recently Approved"
                icon={HistoryRoundedIcon}
                chip={`${employeeDocs.filter((d) => d.source === 'request').length} filed`}
                chipColor="#16A34A"
                chipBg="#DCFCE7"
                hint="Approved files are filed into the employee's record automatically"
            >
                {approved.length === 0 ? (
                    <EmptyState icon={HistoryRoundedIcon} title="Nothing approved yet" hint="Approved submissions show up here and in the employee's Documents section." />
                ) : (
                    <Box sx={{ overflowX: 'auto' }}>
                        <Box component="table" sx={{ width: '100%', minWidth: 820, borderCollapse: 'collapse' }}>
                            <Box component="thead" sx={{ bgcolor: '#F4F3FB' }}>
                                <Box component="tr">
                                    {['EMPLOYEE', 'DOCUMENT', 'FILE', 'APPROVED BY', 'APPROVED ON', ''].map((h, i) => (
                                        <Box component="th" key={h || i} sx={{ ...th, textAlign: i === 5 ? 'right' : 'left' }}>{h}</Box>
                                    ))}
                                </Box>
                            </Box>
                            <Box component="tbody">
                                {approved.map((d, i) => (
                                    <Box component="tr" key={d.id} sx={{ bgcolor: i % 2 ? '#FBFAFE' : '#fff' }}>
                                        <Box component="td" sx={td}>
                                            <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
                                                <Avatar sx={{ width: 32, height: 32, bgcolor: colorFor(d.employeeName), fontSize: 12, fontWeight: 700 }}>{initials(d.employeeName)}</Avatar>
                                                <Box>
                                                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{d.employeeName}</Typography>
                                                    <Typography sx={{ fontSize: 11, color: '#98A0AE' }}>{d.employeeId}</Typography>
                                                </Box>
                                            </Stack>
                                        </Box>
                                        <Box component="td" sx={td}>
                                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{d.name}</Typography>
                                            <Chip label={d.category} size="small" sx={{ height: 18, fontSize: 9.5, fontWeight: 700, mt: 0.3, bgcolor: PRIMARY_LIGHT, color: PRIMARY }} />
                                        </Box>
                                        <Box component="td" sx={td}><FileBadge fileName={d.fileName} fileSize={d.fileSize} /></Box>
                                        <Box component="td" sx={td}><Typography sx={{ fontSize: 12.5, color: '#475569', fontWeight: 600 }}>{d.approvedBy}</Typography></Box>
                                        <Box component="td" sx={td}><Typography sx={{ fontSize: 12.5, color: '#475569' }}>{fmtDate(d.approvedOn)}</Typography></Box>
                                        <Box component="td" sx={{ ...td, textAlign: 'right' }}>
                                            <Tooltip arrow title="View file">
                                                <IconButton size="small" onClick={() => view(d.fileKey)} sx={{ color: '#94A3B8', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}>
                                                    <VisibilityRoundedIcon sx={{ fontSize: 17 }} />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Box>
                )}
            </Panel>

            {/* Reject */}
            <Dialog open={Boolean(reject)} onClose={() => setReject(null)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
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
                    <Button onClick={() => setReject(null)} sx={{ ...ghostBtn, height: 40, px: 2 }}>Cancel</Button>
                    <Button onClick={doReject} sx={{ height: 40, px: 2.4, fontWeight: 700, textTransform: 'none', borderRadius: '7px', bgcolor: '#DC2626', color: '#fff', '&:hover': { bgcolor: '#B91C1C' } }}>Reject</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={Boolean(snack)} autoHideDuration={3600} onClose={() => setSnack('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack('')} severity={/earlier session/.test(snack) ? 'warning' : 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack}</Alert>
            </Snackbar>
        </Box>
    );
}
