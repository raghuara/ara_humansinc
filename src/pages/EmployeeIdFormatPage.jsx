import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Stack, Button, TextField, InputAdornment, Skeleton,
    CircularProgress, Snackbar, Alert,
} from '@mui/material';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { sanitizePrefix } from '../redux/slices/employeesSlice';
import http, { apiErrorMessage } from '../Api/http';
import { GetLoginIdFormat, UpdateLoginIdFormat } from '../Api/Api';

const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_BORDER = '#C9BEFB';
const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
const tonalBtn = { bgcolor: PRIMARY_LIGHT, color: PRIMARY, border: `1px solid ${PRIMARY_BORDER}`, fontWeight: 700, borderRadius: '7px', boxShadow: 'none', textTransform: 'none', '&:hover': { bgcolor: '#E7DFFC' } };

// Lives here rather than on the Employees directory: it's a one-time setup
// decision, not something you touch while working through the roster.
export default function EmployeeIdFormatPage() {
    // The server owns both halves — the prefix and the running number — so
    // `nextLoginId` is read from it rather than guessed from any page of rows.
    const [savedPrefix, setSavedPrefix] = useState('');
    const [prefix, setPrefix] = useState('');
    const [nextId, setNextId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [snack, setSnack] = useState({ msg: '', severity: 'success' });

    const notify = (msg, severity = 'success') => setSnack({ msg, severity });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data: body } = await http.get(GetLoginIdFormat);
            if (body?.error) throw new Error(body.message || 'Could not load the login ID format.');
            const d = body?.data || {};
            setSavedPrefix(d.prefix || '');
            setPrefix(d.prefix || '');
            setNextId(d.nextLoginId || '');
            setLoadError('');
        } catch (err) {
            setNextId('');
            setLoadError(err?.response || err?.request ? apiErrorMessage(err, 'Could not load the login ID format.') : err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const save = async () => {
        const next = sanitizePrefix(prefix);
        if (!next) { notify('Enter the starting letters for the login ID.', 'warning'); return; }
        setSaving(true);
        try {
            const { data: body } = await http.put(UpdateLoginIdFormat, { prefix: next });
            if (body?.error) throw new Error(body.message || 'Could not update the login ID format.');
            // The response carries the recomputed nextLoginId; fall back to a
            // re-read if it doesn't, rather than showing a stale preview.
            const d = body?.data;
            if (d?.prefix) {
                setSavedPrefix(d.prefix);
                setPrefix(d.prefix);
                setNextId(d.nextLoginId || '');
            } else {
                await load();
            }
            notify('Login ID format updated');
        } catch (err) {
            notify(err?.response || err?.request ? apiErrorMessage(err, 'Could not update the login ID format.') : err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const dirty = sanitizePrefix(prefix) !== savedPrefix;

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ pb: 2.5 }}>
                <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>Login ID Format</Typography>
                <Typography sx={{ fontSize: 13, color: '#6B7280', mt: 0.3 }}>
                    Set the starting letters — numbers are generated automatically (1, 2, 3…) for each new employee.
                </Typography>
            </Box>

            {loadError && !loading && (
                <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center', ...card, p: 2, mb: 1.5, bgcolor: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <InfoOutlinedIcon sx={{ fontSize: 21, color: '#B91C1C' }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#991B1B' }}>Couldn't load the current format</Typography>
                        <Typography sx={{ fontSize: 12, color: '#B91C1C' }}>{loadError}</Typography>
                    </Box>
                    <Button onClick={load} startIcon={<RefreshRoundedIcon sx={{ fontSize: 17 }} />} sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12.5, color: '#B91C1C', bgcolor: '#fff', border: '1px solid #FECACA', borderRadius: '7px', height: 38, px: 2 }}>Retry</Button>
                </Stack>
            )}

            <Box sx={{ ...card, p: 0 }}>
                <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center', px: 2.5, py: 1.8, borderBottom: '1px solid #F1F3F7' }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: '9px', bgcolor: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <BadgeRoundedIcon sx={{ color: PRIMARY, fontSize: 20 }} />
                    </Box>
                    <Box>
                        <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: '#0F172A' }}>Starting letters</Typography>
                        <Typography sx={{ fontSize: 12, color: '#6B7280', mt: 0.2 }}>Applies to every employee created from now on. Existing IDs keep the format they were issued with.</Typography>
                    </Box>
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'flex-start' }, p: 2.5 }}>
                    <Box>
                        <TextField
                            value={prefix}
                            disabled={loading || saving}
                            onChange={(e) => setPrefix(sanitizePrefix(e.target.value))}
                            onKeyDown={(e) => { if (e.key === 'Enter' && dirty) save(); }}
                            size="small"
                            placeholder="EMP"
                            inputProps={{ maxLength: 5, style: { textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1 } }}
                            sx={{ width: 170, '& .MuiOutlinedInput-root': { borderRadius: '7px', bgcolor: '#fff', fontSize: 14, height: 42 } }}
                            InputProps={{ startAdornment: <InputAdornment position="start"><BadgeRoundedIcon sx={{ fontSize: 17, color: '#9CA3AF' }} /></InputAdornment> }}
                        />
                        <Typography sx={{ fontSize: 10.5, color: '#98A0AE', mt: 0.4, ml: 0.3 }}>Starting letters · max 5</Typography>
                    </Box>

                    <Button
                        onClick={save}
                        disabled={loading || saving || !dirty}
                        startIcon={saving ? <CircularProgress size={15} sx={{ color: 'inherit' }} /> : <SaveRoundedIcon sx={{ fontSize: 17 }} />}
                        sx={{ ...tonalBtn, height: 42, px: 2, '&.Mui-disabled': { bgcolor: '#F1F5F9', color: '#94A3B8', borderColor: '#E2E8F0' } }}
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </Button>

                    <Box sx={{ px: 2.5, py: 1.1, borderRadius: '7px', bgcolor: '#F7F6FD', border: `1px dashed ${PRIMARY_BORDER}`, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#6E6B99', textTransform: 'uppercase', letterSpacing: 0.6 }}>Next Login ID</Typography>
                        {loading
                            ? <Skeleton variant="text" width={80} height={24} sx={{ mx: 'auto' }} />
                            : <Typography sx={{ fontSize: 17, fontWeight: 800, color: PRIMARY, letterSpacing: 0.5, mt: 0.2 }}>{nextId || '—'}</Typography>}
                    </Box>
                </Stack>
            </Box>

            <Snackbar open={Boolean(snack.msg)} autoHideDuration={3000} onClose={() => setSnack((s) => ({ ...s, msg: '' }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack((s) => ({ ...s, msg: '' }))} severity={snack.severity} variant="filled" sx={{ borderRadius: '7px' }}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
