import React from 'react';
import { Box, Typography, TableRow, TableCell } from '@mui/material';
import { keyframes } from '@mui/system';

// ── Animations ───────────────────────────────────────────────────────────────
const spin = keyframes`to { transform: rotate(360deg); }`;
const pulse = keyframes`0%,100% { transform: scale(0.8); opacity: .5; } 50% { transform: scale(1); opacity: 1; }`;
const fade = keyframes`from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; }`;
const shimmer = keyframes`0% { background-position: -420px 0; } 100% { background-position: 420px 0; }`;
const dots = keyframes`0%,80%,100% { opacity: .2; } 40% { opacity: 1; }`;

// A single shimmering placeholder bar — the building block of skeleton states.
export function Shimmer({ w = '100%', h = 12, r = 6, sx }) {
    return (
        <Box sx={{
            width: w, height: h, borderRadius: `${r}px`, flexShrink: 0,
            background: 'linear-gradient(90deg, #EEF0F6 25%, #F6F7FB 37%, #EEF0F6 63%)',
            backgroundSize: '840px 100%',
            animation: `${shimmer} 1.4s ease infinite`,
            ...sx,
        }} />
    );
}

// ── Compact branded spinner — drop inside any card region while data loads ────
// A violet gradient ring spinning around a pulsing mark, matching the app's
// full-page Loader but sized for in-card content.
export default function ContentLoader({ label = 'Loading', size = 46, py = 6 }) {
    return (
        <Box sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 1.6, width: '100%', py, animation: `${fade} .3s ease both`,
        }}>
            <Box sx={{ position: 'relative', width: size, height: size }}>
                <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid #ECE9FE' }} />
                <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: '#7C5CFC', borderRightColor: '#9B87FB', animation: `${spin} .85s linear infinite` }} />
                <Box sx={{ position: 'absolute', inset: size * 0.26, borderRadius: '6px', background: 'linear-gradient(135deg, #7C5CFC 0%, #9B87FB 100%)', boxShadow: '0 5px 14px -4px rgba(124,92,252,0.6)', animation: `${pulse} 1.3s ease-in-out infinite` }} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#7C5CFC' }}>{label}</Typography>
                {[0, 1, 2].map((i) => (
                    <Box key={i} sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: '#7C5CFC', animation: `${dots} 1.2s infinite`, animationDelay: `${i * 0.16}s` }} />
                ))}
            </Box>
        </Box>
    );
}

// ── Skeleton rows for MUI tables ─────────────────────────────────────────────
// Renders shimmering placeholder rows shaped like real table data (an avatar +
// two text lines in the person column, single bars elsewhere). Use inside a
// <TableBody> while the real rows load.
export function TableRowsSkeleton({ rows = 6, cols = 9, avatarCol = 1 }) {
    return (
        <>
            {Array.from({ length: rows }).map((_, r) => (
                <TableRow key={r} sx={{ animation: `${fade} .3s ease both`, animationDelay: `${r * 0.05}s` }}>
                    {Array.from({ length: cols }).map((__, c) => (
                        <TableCell key={c} sx={{ borderBottom: '1px solid #F1F3F7', py: 1.6 }}>
                            {c === avatarCol ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4 }}>
                                    <Shimmer w={34} h={34} r={17} />
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.7, flex: 1 }}>
                                        <Shimmer w="55%" h={10} />
                                        <Shimmer w="38%" h={8} />
                                    </Box>
                                </Box>
                            ) : (
                                <Shimmer w={`${45 + ((r + c) % 4) * 12}%`} h={11} />
                            )}
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </>
    );
}
