import React from 'react';
import { Box, Typography, Stack, Grid, Button, Chip, Switch, Dialog, DialogContent, DialogActions } from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PauseCircleFilledRoundedIcon from '@mui/icons-material/PauseCircleFilledRounded';
import { PRIMARY, PRIMARY_LIGHT, PRIMARY_DARK, PRIMARY_BORDER } from '../theme';
import { fileKind, fmtSize } from '../utils/fileStore';

// ── Shared building blocks for the Organisation, Documents and Inbox screens ──
// The older pages each re-declare these styles inline. Rather than touch them,
// the new screens share one definition so they stay visually identical to the
// existing ones — same 7px radius, same violet, same card chrome.

export const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
export const solidBtn = { bgcolor: PRIMARY, color: '#fff', fontWeight: 700, borderRadius: '7px', boxShadow: 'none', textTransform: 'none', '&:hover': { bgcolor: PRIMARY_DARK, boxShadow: 'none' } };
export const tonalBtn = { bgcolor: PRIMARY_LIGHT, color: PRIMARY, border: `1px solid ${PRIMARY_BORDER}`, fontWeight: 700, borderRadius: '7px', boxShadow: 'none', textTransform: 'none', '&:hover': { bgcolor: '#E7DFFC' } };
export const ghostBtn = { color: '#475569', bgcolor: '#fff', border: '1px solid #E5E7EB', fontWeight: 700, borderRadius: '7px', textTransform: 'none', '&:hover': { bgcolor: '#F8FAFC' } };
export const successBtn = { bgcolor: '#16A34A', color: '#fff', fontWeight: 700, borderRadius: '7px', boxShadow: 'none', textTransform: 'none', '&:hover': { bgcolor: '#15803D' } };
export const dangerBtn = { color: '#E11D48', bgcolor: '#fff', border: '1px solid #FBCFE8', fontWeight: 700, borderRadius: '7px', textTransform: 'none', '&:hover': { bgcolor: '#FEF2F2' } };
export const field = { '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 14, bgcolor: '#F8FAFC', '& fieldset': { borderColor: '#E5E7EB' }, '&.Mui-focused fieldset': { borderColor: PRIMARY, borderWidth: 1.5 } } };

export const th = { textAlign: 'left', px: 2.5, py: 1.6, fontSize: 10.5, fontWeight: 700, color: '#6E6B99', letterSpacing: 0.6, borderBottom: '1px solid #E8E6F3', whiteSpace: 'nowrap' };
export const td = { px: 2.5, py: 1.6, borderBottom: '1px solid #EEF0F6' };

// Page title + subtitle on the left, actions on the right.
export function PageHeader({ title, subtitle, children }) {
    return (
        <Box sx={{ pb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexWrap: 'wrap', gap: 1.5 }}>
            <Box>
                <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>{title}</Typography>
                {subtitle && <Typography sx={{ fontSize: 13, color: '#6B7280', mt: 0.3 }}>{subtitle}</Typography>}
            </Box>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>{children}</Stack>
        </Box>
    );
}

// The four-across stat row used on every module landing page.
export function StatCards({ items }) {
    return (
        <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
            {items.map((k) => (
                <Grid size={{ xs: 12, sm: 6, lg: 12 / Math.min(items.length, 4) }} key={k.label}>
                    <Box sx={{ ...card, p: 2.5, bgcolor: k.bg, border: `1px solid ${k.color}22`, height: '100%' }}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontSize: 11, fontWeight: 700, color: k.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</Typography>
                                <Typography sx={{ fontSize: 26, fontWeight: 800, color: '#0F172A', mt: 0.5 }}>{k.value}</Typography>
                                <Typography sx={{ fontSize: 10.5, color: '#6B7280', mt: 0.2 }}>{k.sub}</Typography>
                            </Box>
                            <Box sx={{ width: 44, height: 44, borderRadius: '7px', bgcolor: '#fff', boxShadow: '0 1px 3px rgba(16,24,40,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <k.icon sx={{ color: k.color, fontSize: 22 }} />
                            </Box>
                        </Stack>
                    </Box>
                </Grid>
            ))}
        </Grid>
    );
}

// Card with a tinted header strip — the standard section container.
export function Panel({ title, icon: Icon, chip, chipColor = PRIMARY, chipBg = PRIMARY_LIGHT, hint, action, children, sx }) {
    return (
        <Box sx={{ ...card, p: 0, overflow: 'hidden', ...sx }}>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1.2, p: 2.2, bgcolor: '#F7F6FD', borderBottom: '1px solid #EAE7F7', flexWrap: 'wrap' }}>
                {Icon && (
                    <Box sx={{ width: 32, height: 32, borderRadius: '9px', bgcolor: '#fff', boxShadow: '0 1px 4px rgba(16,24,40,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon sx={{ color: PRIMARY, fontSize: 18 }} />
                    </Box>
                )}
                <Typography sx={{ fontSize: 15.5, fontWeight: 800, color: '#0F172A' }}>{title}</Typography>
                {chip && <Chip label={chip} size="small" sx={{ bgcolor: chipBg, color: chipColor, fontWeight: 700, fontSize: 11.5 }} />}
                {hint && <Typography sx={{ fontSize: 11.5, color: '#98A0AE', ml: 'auto', display: { xs: 'none', sm: 'block' } }}>{hint}</Typography>}
                {action && <Box sx={{ ml: hint ? 1 : 'auto' }}>{action}</Box>}
            </Stack>
            {children}
        </Box>
    );
}

export function EmptyState({ icon: Icon, title, hint }) {
    return (
        <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
            <Icon sx={{ fontSize: 36, color: '#CBD2DD' }} />
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#64748B', mt: 1 }}>{title}</Typography>
            {hint && <Typography sx={{ fontSize: 12.5, color: '#98A0AE', mt: 0.4 }}>{hint}</Typography>}
        </Box>
    );
}

// Status vocabulary shared by requests, submissions and master records.
const STATUS = {
    pending: { label: 'Pending', color: '#B45309', bg: '#FFF7ED' },
    submitted: { label: 'Awaiting review', color: '#0369A1', bg: '#E0F2FE' },
    approved: { label: 'Approved', color: '#16A34A', bg: '#DCFCE7' },
    rejected: { label: 'Rejected', color: '#E11D48', bg: '#FEE2E2' },
    open: { label: 'Open', color: PRIMARY, bg: PRIMARY_LIGHT },
    completed: { label: 'Completed', color: '#16A34A', bg: '#DCFCE7' },
    Active: { label: 'Active', color: '#16A34A', bg: '#DCFCE7' },
    Inactive: { label: 'Inactive', color: '#64748B', bg: '#F1F5F9' },
};

export function StatusChip({ status, size = 'small' }) {
    const s = STATUS[status] || { label: status, color: '#64748B', bg: '#F1F5F9' };
    return <Chip label={s.label} size={size} sx={{ height: 22, fontSize: 11, fontWeight: 700, bgcolor: s.bg, color: s.color }} />;
}

// Active / Inactive as a switch rather than a dropdown. The whole row is the
// hit target, and the copy spells out what the state actually does — an
// inactive record is kept, it just stops being offered in the employee form.
// `value` / `onChange` speak the same 'Active' | 'Inactive' strings the store
// holds, so it drops straight into the existing forms.
export function StatusToggle({ value, onChange, activeHint = 'Offered in the employee form', inactiveHint = 'Kept on record, but no longer offered' }) {
    const on = value === 'Active';
    const toggle = () => onChange(on ? 'Inactive' : 'Active');
    const color = on ? '#16A34A' : '#94A3B8';

    return (
        <Stack
            direction="row"
            onClick={toggle}
            role="switch"
            aria-checked={on}
            sx={{
                alignItems: 'center', gap: 1.4, px: 1.6, py: 1.3, cursor: 'pointer',
                borderRadius: '9px',
                border: `1.5px solid ${on ? '#BBF7D0' : '#E5E7EB'}`,
                bgcolor: on ? '#F0FDF4' : '#F8FAFC',
                transition: 'background-color .18s, border-color .18s',
                '&:hover': { borderColor: on ? '#86EFAC' : '#D8DEE9' },
            }}
        >
            <Box sx={{ width: 34, height: 34, borderRadius: '9px', bgcolor: '#fff', border: `1px solid ${on ? '#BBF7D0' : '#E5E7EB'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {on
                    ? <CheckCircleRoundedIcon sx={{ fontSize: 19, color }} />
                    : <PauseCircleFilledRoundedIcon sx={{ fontSize: 19, color }} />}
            </Box>

            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: on ? '#166534' : '#475569' }}>
                    {on ? 'Active' : 'Inactive'}
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: on ? '#3F8B5F' : '#98A0AE' }}>
                    {on ? activeHint : inactiveHint}
                </Typography>
            </Box>

            <Switch
                checked={on}
                onChange={toggle}
                onClick={(e) => e.stopPropagation()}   // the row already toggles
                sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#16A34A', '&:hover': { bgcolor: 'rgba(22,163,74,0.08)' } },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#16A34A', opacity: 1 },
                    '& .MuiSwitch-track': { bgcolor: '#CBD2DD', opacity: 1 },
                }}
            />
        </Stack>
    );
}

// Coloured extension tile + file name + size — one row, used in every file list.
export function FileBadge({ fileName, fileSize, sub }) {
    const kind = fileKind(fileName);
    return (
        <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center', minWidth: 0 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: kind.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: kind.color, letterSpacing: 0.3 }}>{kind.label}</Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }} noWrap>{fileName || '—'}</Typography>
                <Typography sx={{ fontSize: 11, color: '#98A0AE' }} noWrap>{sub || fmtSize(fileSize)}</Typography>
            </Box>
        </Stack>
    );
}

// Destructive confirm — same shape as the logout / remove-employee dialogs.
export function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel = 'Remove' }) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
            <DialogContent sx={{ pt: 3.5, pb: 2, textAlign: 'center' }}>
                <Box sx={{ width: 60, height: 60, borderRadius: '50%', bgcolor: '#FEF2F2', border: '4px solid #FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.8 }}>
                    <WarningAmberRoundedIcon sx={{ fontSize: 30, color: '#DC2626' }} />
                </Box>
                <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#111827', mb: 0.8 }}>{title}</Typography>
                <Typography sx={{ fontSize: 12.5, color: '#6B7280', px: 1.5, lineHeight: 1.5 }}>{body}</Typography>
            </DialogContent>
            <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
                <Button fullWidth onClick={onClose} sx={{ ...ghostBtn, height: 40, fontSize: 13 }}>Cancel</Button>
                <Button fullWidth onClick={onConfirm} sx={{ height: 40, fontSize: 13, fontWeight: 700, textTransform: 'none', borderRadius: '7px', bgcolor: '#DC2626', color: '#fff', boxShadow: 'none', '&:hover': { bgcolor: '#B91C1C' } }}>{confirmLabel}</Button>
            </DialogActions>
        </Dialog>
    );
}

export { fmtSize };
