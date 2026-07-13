import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Button, Stack, Chip, Avatar, IconButton, Tooltip, InputBase, Collapse, Snackbar, Alert,
} from '@mui/material';
import FolderSharedRoundedIcon from '@mui/icons-material/FolderSharedRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectEmployeeDocs, deleteEmployeeDoc } from '../../redux/slices/documentsSlice';
import { selectEmployees } from '../../redux/slices/employeesSlice';
import { PRIMARY, PRIMARY_LIGHT } from '../../theme';
import { fmtDate, initialsFromName as initials, paletteColor as colorFor } from '../../utils/format';
import { openFile, downloadFile, fmtSize } from '../../utils/fileStore';
import { ghostBtn, Panel, EmptyState, FileBadge, ConfirmDialog } from '../uiKit';

// The approved repository, grouped by employee — the same files the Employee
// module shows on each person's record.
export default function EmployeeDocumentsTab() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const docs = useSelector(selectEmployeeDocs);
    const employees = useSelector(selectEmployees);

    const [q, setQ] = useState('');
    const [open, setOpen] = useState({});
    const [confirm, setConfirm] = useState(null);
    const [snack, setSnack] = useState('');

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

    const view = (key) => { if (!openFile(key)) setSnack('That file was uploaded in an earlier session, so there is nothing to preview here.'); };
    const download = (d) => { if (!downloadFile(d.fileKey, d.fileName)) setSnack('That file was uploaded in an earlier session, so there is nothing to download here.'); };

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
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', px: 1.4, height: 38, width: { xs: 160, sm: 240 } }}>
                        <SearchRoundedIcon sx={{ fontSize: 18, color: '#98A0AE' }} />
                        <InputBase placeholder="Search by employee or document…" value={q} onChange={(e) => setQ(e.target.value)} sx={{ fontSize: 13, flex: 1 }} />
                    </Stack>
                )}
            >
                {folders.length === 0 ? (
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
                                                            Approved by {d.approvedBy} · {fmtDate(d.approvedOn)}
                                                        </Typography>
                                                    </Stack>
                                                    <Stack direction="row" spacing={0.3}>
                                                        <Tooltip arrow title="View"><IconButton size="small" onClick={() => view(d.fileKey)} sx={{ color: '#94A3B8', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}><VisibilityRoundedIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                                                        <Tooltip arrow title="Download"><IconButton size="small" onClick={() => download(d)} sx={{ color: '#94A3B8', '&:hover': { color: PRIMARY, bgcolor: PRIMARY_LIGHT } }}><DownloadRoundedIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
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
                onClose={() => setConfirm(null)}
                onConfirm={() => { dispatch(deleteEmployeeDoc(confirm.id)); setSnack(`${confirm.name} removed from ${confirm.employeeName}'s record.`); setConfirm(null); }}
                title="Remove from employee record?"
                body={confirm ? `${confirm.name} (${confirm.fileName}) will be removed from ${confirm.employeeName}'s documents. The original request history is kept.` : ''}
                confirmLabel="Remove"
            />

            <Snackbar open={Boolean(snack)} autoHideDuration={3400} onClose={() => setSnack('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack('')} severity={/earlier session/.test(snack) ? 'warning' : 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack}</Alert>
            </Snackbar>
        </Box>
    );
}
