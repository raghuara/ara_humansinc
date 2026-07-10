import React from 'react';
import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/system';

const spin = keyframes`to { transform: rotate(360deg); }`;
const pulse = keyframes`0%,100% { transform: scale(0.82); opacity: .55; } 50% { transform: scale(1); opacity: 1; }`;
const fade = keyframes`from { opacity: 0; } to { opacity: 1; }`;

// Modern branded loader — a violet gradient ring spinning around a pulsing mark.
export default function Loader({ label = 'Loading…', full = false }) {
    return (
        <Box
            sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 2, width: '100%', minHeight: full ? '100vh' : '65vh',
                animation: `${fade} .3s ease both`,
            }}
        >
            <Box sx={{ position: 'relative', width: 60, height: 60 }}>
                <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid #ECE9FE' }} />
                <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: '#7C5CFC', borderRightColor: '#9B87FB', animation: `${spin} .85s linear infinite` }} />
                <Box sx={{ position: 'absolute', inset: 15, borderRadius: '7px', background: 'linear-gradient(135deg, #7C5CFC 0%, #9B87FB 100%)', boxShadow: '0 6px 16px -4px rgba(124,92,252,0.6)', animation: `${pulse} 1.3s ease-in-out infinite` }} />
            </Box>
            <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#7C5CFC' }}>{label}</Typography>
        </Box>
    );
}
