import React from 'react';
import {
    Box, Typography, TextField, Switch, Tooltip, Divider,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export const PRIMARY = '#7C5CFC';
export const PRIMARY_LIGHT = '#F1EEFE';
export const PRIMARY_DARK = '#6246E0';

export const FREQUENCY_TO_API = {
    'Monthly': 'Monthly',
    'Quarterly': 'Quarterly',
    'Half-Yearly': 'HalfYearly',
    'Yearly': 'Yearly',
};

export const UNUSED_ACTION_TO_API = {
    'encash': 'Encash',
    'carry_forward': 'CarryForward',
    'lapse': 'Lapse',
};

export const FREQUENCY_FROM_API = Object.fromEntries(
    Object.entries(FREQUENCY_TO_API).map(([k, v]) => [v, k])
);
export const UNUSED_ACTION_FROM_API = Object.fromEntries(
    Object.entries(UNUSED_ACTION_TO_API).map(([k, v]) => [v, k])
);

export const Section = ({ icon: Icon, title, subtitle, color, children }) => (
    <Box sx={{ mb: 2.5 }}>
        <Box sx={{
            bgcolor: color || '#7C5CFC',
            color: '#fff',
            fontSize: '13px',
            px: 3,
            py: 0.2,
            ml: '15px',
            fontWeight: 600,
            borderTopLeftRadius: '7px',
            borderTopRightRadius: '7px',
            width: 'fit-content',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
        }}>
            {Icon && <Icon sx={{ fontSize: 14 }} />}
            {title}
        </Box>
        <Box sx={{ border: '1px solid #E8DDEA', borderRadius: '7px', bgcolor: '#fff', p: 3 }}>
            {subtitle && (
                <Typography sx={{ fontSize: '12px', color: '#777', mb: 2 }}>{subtitle}</Typography>
            )}
            {children}
        </Box>
    </Box>
);

export const SubSection = ({ icon: Icon, title, subtitle, color = '#7C5CFC', children, divider }) => (
    <Box>
        {divider && <Divider sx={{ my: 2.5 }} />}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
            <Box sx={{
                width: 34, height: 34, borderRadius: '7px', flexShrink: 0,
                bgcolor: `${color}1A`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                {Icon && <Icon sx={{ fontSize: 19, color }} />}
            </Box>
            <Box>
                <Typography sx={{ fontSize: '13.5px', fontWeight: 700, color: '#333' }}>{title}</Typography>
                {subtitle && <Typography sx={{ fontSize: '11px', color: '#888' }}>{subtitle}</Typography>}
            </Box>
        </Box>
        {children}
    </Box>
);

export const ToggleRow = ({ label, description, checked, onChange, sx }) => (
    <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        p: 1.5,
        border: `1px solid ${checked ? '#C9BEFB' : '#E5E7EB'}`,
        borderRadius: '7px',
        bgcolor: checked ? '#EFF5FF' : '#FAFAFA',
        transition: '0.2s',
        ...sx,
    }}>
        <Box>
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>{label}</Typography>
            {description && (
                <Typography sx={{ fontSize: '11px', color: '#888', mt: 0.3 }}>{description}</Typography>
            )}
        </Box>
        <Switch
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            size="small"
            sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: PRIMARY },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: PRIMARY },
            }}
        />
    </Box>
);

export const AmountField = ({ label, value, onChange, prefix = '₹', helperText, disabled }) => (
    <Box>
        <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#555', mb: 0.5 }}>{label}</Typography>
        <TextField
            fullWidth
            size="small"
            value={value}
            onChange={(e) => {
                const v = e.target.value.replace(/[^0-9.]/g, '');
                onChange(v);
            }}
            disabled={disabled}
            placeholder="0"
            slotProps={{
                input: {
                    startAdornment: prefix ? (
                        <Typography sx={{ fontSize: '13px', color: '#7C5CFC', fontWeight: 600, mr: 0.5 }}>{prefix}</Typography>
                    ) : null,
                }
            }}
            sx={{
                '& .MuiOutlinedInput-root': { fontSize: '13px', borderRadius: '7px', height: 36 },
                '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#000' },
            }}
        />
        {helperText && <Typography sx={{ fontSize: '10px', color: '#9CA3AF', mt: 0.3 }}>{helperText}</Typography>}
    </Box>
);

export const NumberField = ({ label, value, onChange, suffix, helperText, min = 0, disabled = false, infoTooltip }) => (
    <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: disabled ? '#9CA3AF' : '#555' }}>
                {label}
            </Typography>
            {infoTooltip && (
                <Tooltip title={infoTooltip} arrow placement="top">
                    <InfoOutlinedIcon sx={{ fontSize: 14, color: '#6366F1', cursor: 'help' }} />
                </Tooltip>
            )}
        </Box>
        <TextField
            fullWidth
            size="small"
            type="number"
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(Math.max(min, parseInt(e.target.value) || 0))}
            slotProps={{
                input: {
                    endAdornment: suffix ? (
                        <Typography sx={{ fontSize: '11px', color: '#999', whiteSpace: 'nowrap' }}>{suffix}</Typography>
                    ) : null,
                    inputProps: { min, step: 1 }
                }
            }}
            sx={{
                '& .MuiOutlinedInput-root': { fontSize: '13px', borderRadius: '7px', height: 36 },
                '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#374151', fontWeight: 600 },
                '& .MuiOutlinedInput-root.Mui-disabled': { bgcolor: '#F9FAFB' },
            }}
        />
        {helperText && <Typography sx={{ fontSize: '10px', color: '#9CA3AF', mt: 0.3 }}>{helperText}</Typography>}
    </Box>
);

export const TimeField = ({ label, value, onChange, helperText }) => (
    <Box>
        <Typography sx={{ fontSize: '12px', fontWeight: 600, color: '#555', mb: 0.5 }}>{label}</Typography>
        <TextField
            fullWidth
            size="small"
            type="time"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            slotProps={{ input: { inputProps: { step: 60 } } }}
            sx={{ '& .MuiOutlinedInput-root': { fontSize: '13px', borderRadius: '7px', height: 36 } }}
        />
        {helperText && <Typography sx={{ fontSize: '10px', color: '#9CA3AF', mt: 0.3 }}>{helperText}</Typography>}
    </Box>
);

export const parseTimeToMinutes = (t) => {
    if (!t || typeof t !== 'string') return null;
    const [h, m] = t.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
};

export const formatTime12 = (t) => {
    const mins = parseTimeToMinutes(t);
    if (mins == null) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

export const formatHrs = (totalMinutes) => {
    if (totalMinutes == null || Number.isNaN(totalMinutes)) return '0h';
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
};