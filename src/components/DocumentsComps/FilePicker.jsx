import React, { useRef, useState } from 'react';
import { Box, Typography, Stack, Button, IconButton } from '@mui/material';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { PRIMARY, PRIMARY_LIGHT, PRIMARY_BORDER } from '../../theme';
import { fmtSize, fileKind } from '../../utils/fileStore';
import { FileBadge } from '../uiKit';

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx';

// Dashed drop zone that also takes a click. Hands the raw File back to the
// caller, which is responsible for stashing it (utils/fileStore) and keeping
// only the metadata in Redux.
export function FileDrop({ file, onPick, onClear, accept = ACCEPT, hint = 'PDF, JPG, PNG or DOC · up to 10 MB', error }) {
    const ref = useRef(null);
    const [over, setOver] = useState(false);

    const take = (f) => { if (f) onPick(f); };

    if (file) {
        const kind = fileKind(file.name);
        return (
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1.5, p: 1.5, borderRadius: '9px', border: `1px solid ${PRIMARY_BORDER}`, bgcolor: PRIMARY_LIGHT }}>
                <FileBadge fileName={file.name} fileSize={file.size} sub={`${kind.label} · ${fmtSize(file.size)} · ready to upload`} />
                <IconButton size="small" onClick={onClear} sx={{ color: '#94A3B8', '&:hover': { color: '#E11D48', bgcolor: '#FEF2F2' } }}>
                    <CloseRoundedIcon sx={{ fontSize: 18 }} />
                </IconButton>
            </Stack>
        );
    }

    return (
        <>
            <Box
                onClick={() => ref.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setOver(true); }}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files?.[0]); }}
                sx={{
                    p: 2.6, textAlign: 'center', cursor: 'pointer', borderRadius: '9px',
                    border: `1.5px dashed ${error ? '#F43F5E' : over ? PRIMARY : '#D8DEE9'}`,
                    bgcolor: over ? PRIMARY_LIGHT : error ? '#FEF2F2' : '#F8FAFC',
                    transition: 'background-color .15s, border-color .15s',
                    '&:hover': { borderColor: PRIMARY, bgcolor: PRIMARY_LIGHT },
                }}
            >
                <CloudUploadRoundedIcon sx={{ fontSize: 28, color: over ? PRIMARY : '#94A3B8' }} />
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#334155', mt: 0.6 }}>
                    Drop a file here, or <Box component="span" sx={{ color: PRIMARY }}>browse</Box>
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#98A0AE', mt: 0.2 }}>{hint}</Typography>
            </Box>
            <input ref={ref} type="file" hidden accept={accept}
                onChange={(e) => { take(e.target.files?.[0]); e.target.value = ''; }} />
        </>
    );
}

// Inline "attach a file" button — used on the request rows to stand in for the
// employee uploading from the mobile app.
export function FilePickButton({ onPick, label = 'Upload', accept = ACCEPT, sx }) {
    const ref = useRef(null);
    return (
        <>
            <Button
                onClick={() => ref.current?.click()}
                startIcon={<CloudUploadRoundedIcon sx={{ fontSize: 16 }} />}
                sx={{ height: 32, px: 1.4, fontSize: 11.5, fontWeight: 700, textTransform: 'none', borderRadius: '7px', color: PRIMARY, bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`, '&:hover': { bgcolor: '#E7DFFC' }, ...sx }}
            >
                {label}
            </Button>
            <input ref={ref} type="file" hidden accept={accept}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ''; }} />
        </>
    );
}
