import React, { useState } from 'react';
import {
    Box, Typography, TextField, Button, InputAdornment, IconButton,
    Checkbox, FormControlLabel, Stack, CircularProgress, Alert,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { keyframes } from '@mui/system';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../redux/slices/authSlice';
import payrollImage from '../images/payroll2.png';

// Brand accent — indigo #7C5CFC for the white + indigo theme.
const VIOLET = '#7C5CFC';
const GRAD = 'linear-gradient(135deg, #7C5CFC 0%, #9B87FB 100%)';

// ── Animations ───────────────────────────────────────────────────────────────
const floatY = keyframes`0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); }`;
const fadeUp = keyframes`from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; }`;
const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;

// Indigo sparkle mark used as the logo.
function LogoMark() {
    return (
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
            <path d="M12 1.5c.2 4.7 4.3 8.8 9 9-4.7.2-8.8 4.3-9 9-.2-4.7-4.3-8.8-9-9 4.7-.2 8.8-4.3 9-9Z" fill={VIOLET} />
            <path d="M19 2.2c.08 1.9 1.7 3.5 3.6 3.6-1.9.08-3.5 1.7-3.6 3.6-.08-1.9-1.7-3.5-3.6-3.6 1.9-.08 3.5-1.7 3.6-3.6Z" fill="#7FB4FF" />
        </svg>
    );
}

export default function LoginPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [remember, setRemember] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        if (!email.trim() || !password.trim()) {
            setError('Please enter your email and password.');
            return;
        }
        setLoading(true);
        // NOTE: Demo auth. Replace with your real API call, then
        // dispatch loginSuccess() with the token/profile the backend returns.
        setTimeout(() => {
            dispatch(loginSuccess({
                token: 'demo-token',
                email: email.trim(),
                userName: email.split('@')[0],
                role: 'Payroll Admin',
                organisation: 'ARA Payroll',
            }));
            setLoading(false);
            navigate('/dashboard', { replace: true });
        }, 700);
    };

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: '#fff' }}>
            {/* ── Left : form ─────────────────────────────────────────────── */}
            <Box
                sx={{
                    width: { xs: '100%', md: '46%' },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: { xs: 3, sm: 6 },
                    py: 6,
                }}
            >
                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{ width: '100%', maxWidth: 380, animation: `${fadeUp} .6s cubic-bezier(.22,1,.36,1) both` }}
                >
                    <Box sx={{ mb: 3 }}>
                        <LogoMark />
                    </Box>

                    <Typography sx={{ fontSize: { xs: 27, sm: 32 }, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>
                        Welcome back !
                    </Typography>
                    <Typography sx={{ fontSize: 14, color: '#6B7280', mt: 0.5, mb: 3.5 }}>
                        Enter to get unlimited access to data & information.
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2, borderRadius: '7px', fontSize: 13 }}>{error}</Alert>
                    )}

                    <Typography sx={labelSx}>Email <Box component="span" sx={{ color: '#EF4444' }}>*</Box></Typography>
                    <TextField
                        fullWidth
                        autoFocus
                        placeholder="Enter your mail address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        sx={fieldSx}
                    />

                    <Typography sx={{ ...labelSx, mt: 2.2 }}>Password <Box component="span" sx={{ color: '#EF4444' }}>*</Box></Typography>
                    <TextField
                        fullWidth
                        type={showPw ? 'text' : 'password'}
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        sx={fieldSx}
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowPw((s) => !s)}
                                            edge="end"
                                            size="small"
                                            aria-label={showPw ? 'Hide password' : 'Show password'}
                                        >
                                            {showPw ? <Visibility sx={{ fontSize: 19, color: '#9CA3AF' }} /> : <VisibilityOff sx={{ fontSize: 19, color: '#9CA3AF' }} />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />

                    <Stack direction="row" spacing={1} sx={{ mt: 1.2, mb: 2.5, alignItems: 'center', justifyContent: 'space-between' }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    size="small"
                                    checked={remember}
                                    onChange={(e) => setRemember(e.target.checked)}
                                    sx={{ color: '#D1D5DB', '&.Mui-checked': { color: VIOLET } }}
                                />
                            }
                            label={<Typography sx={{ fontSize: 13, color: '#374151' }}>Remember me</Typography>}
                        />
                        <Typography component="a" href="#" sx={{ fontSize: 13, color: VIOLET, fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                            Forgot your password ?
                        </Typography>
                    </Stack>

                    <Button
                        type="submit"
                        fullWidth
                        disabled={loading}
                        sx={{
                            height: 48,
                            borderRadius: '7px',
                            fontSize: 15,
                            fontWeight: 700,
                            color: '#fff',
                            background: GRAD,
                            backgroundSize: '160% 160%',
                            boxShadow: '0 12px 24px -10px rgba(124,92,252,0.8)',
                            transition: 'background-position .5s ease, transform .2s ease, box-shadow .2s ease',
                            '&:hover': { backgroundPosition: 'right center', transform: 'translateY(-1px)', boxShadow: '0 16px 30px -10px rgba(124,92,252,0.85)' },
                            '&.Mui-disabled': { color: 'rgba(255,255,255,0.85)', background: VIOLET, opacity: 0.7 },
                        }}
                    >
                        {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Log In'}
                    </Button>

              
                </Box>
            </Box>

            {/* ── Right : payroll illustration ────────────────────────────── */}
            <Box
                sx={{
                    flex: 1,
                    display: { xs: 'none', md: 'flex' },
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    p: 8,
                    background: 'linear-gradient(155deg, #EFF5FF 0%, #DBEAFE 45%, #C9BEFB 100%)',
                }}
            >
                {/* soft decorative glows */}
                <Box sx={{ position: 'absolute', top: -90, right: -60, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,92,252,0.16), transparent 70%)' }} />
                <Box sx={{ position: 'absolute', bottom: -110, left: -70, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.18), transparent 70%)' }} />
                {/* subtle dot grid */}
                <Box sx={{ position: 'absolute', top: 40, left: 48, width: 120, height: 120, opacity: 0.4, backgroundImage: 'radial-gradient(#7FB4FF 1.4px, transparent 1.4px)', backgroundSize: '16px 16px' }} />

                <Box sx={{mt:5, position: 'relative', width: '100%', maxWidth: 720, textAlign: 'center', animation: `${fadeIn} .8s ease both` }}>
                    <Box
                        component="img"
                        src={payrollImage}
                        alt="Payroll illustration"
                        sx={{
                            width: '100%',
                            maxWidth: 680,
                            height: 'auto',
                            mx: 'auto',
                            mb: '-52px',
                            display: 'block',
                            filter: 'drop-shadow(0 30px 50px rgba(124,92,252,0.24))',
                            animation: `${floatY} 5.5s ease-in-out infinite`,
                        }}
                    />
                    <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#1E293B', letterSpacing: '-0.4px' }}>
                        Payroll, made simple.
                    </Typography>
                    <Typography sx={{ fontSize: 14, color: '#5B5F76', mt: 1, maxWidth: 420, mx: 'auto' }}>
                        Run salaries, invoices and compliance from one clean workspace — accurate, on time, every cycle.
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}

const labelSx = { fontSize: 13, fontWeight: 600, color: '#374151', mb: 0.7 };

const fieldSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '7px',
        bgcolor: '#fff',
        fontSize: 14,
        height: 48,
        '& fieldset': { borderColor: '#E5E7EB' },
        '&:hover fieldset': { borderColor: '#D1D5DB' },
        '&.Mui-focused fieldset': { borderColor: VIOLET, borderWidth: 1.5 },
    },
    '& .MuiOutlinedInput-input::placeholder': { color: '#9CA3AF', opacity: 1 },
};
