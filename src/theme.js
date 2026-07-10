import { createTheme } from '@mui/material/styles';

// ─── Brand tokens (white + violet design system) ─────────────────────────────
export const PRIMARY = '#7C5CFC';
export const PRIMARY_LIGHT = '#F1EEFE';
export const PRIMARY_DARK = '#6246E0';
export const INK = '#0F172A';
export const MUTED = '#64748B';

// Signature gradient used on primary buttons, the logo and hero surfaces.
export const GRADIENT = 'linear-gradient(135deg, #7C5CFC 0%, #9B87FB 100%)';
export const GRADIENT_SOFT = 'linear-gradient(135deg, #6246E0 0%, #7C5CFC 60%, #9B87FB 100%)';

const theme = createTheme({
    palette: {
        primary: {
            main: PRIMARY,
            light: PRIMARY_LIGHT,
            dark: PRIMARY_DARK,
            contrastText: '#ffffff',
        },
        background: {
            default: '#F6F8F9',
            paper: '#ffffff',
        },
        text: {
            primary: INK,
            secondary: MUTED,
        },
    },
    shape: { borderRadius: 7 },
    typography: {
        fontFamily: `'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif`,
        button: { textTransform: 'none', fontWeight: 700 },
    },
    components: {
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: { borderRadius: 7, boxShadow: 'none', fontWeight: 700 },
                // Unified button — soft tonal violet (light fill, violet text).
                contained: {
                    background: PRIMARY_LIGHT,
                    color: PRIMARY,
                    border: '1px solid #C9BEFB',
                    boxShadow: 'none',
                    '&:hover': { background: '#E7DFFC', boxShadow: 'none' },
                    '&.Mui-disabled': { background: PRIMARY_LIGHT, color: PRIMARY, opacity: 0.5 },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: { backgroundImage: 'none' },
            },
        },
    },
});

export default theme;
