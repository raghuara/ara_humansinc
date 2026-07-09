import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import { useNavigate } from 'react-router-dom';
import { PRIMARY } from '../theme';

export default function PlaceholderPage({ title }) {
    const navigate = useNavigate();
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', maxWidth: 420 }}>
                <Box sx={{ width: 68, height: 68, borderRadius: '18px', bgcolor: '#F1EEFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ConstructionRoundedIcon sx={{ fontSize: 34, color: PRIMARY }} />
                </Box>
                <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>{title}</Typography>
                <Typography sx={{ fontSize: 14, color: '#64748B' }}>
                    This screen is ready to receive your existing payroll component. Drop it in and wire it to this route.
                </Typography>
                <Button variant="outlined" onClick={() => navigate('/dashboard')} sx={{ borderColor: PRIMARY, color: PRIMARY, mt: 1 }}>
                    Back to dashboard
                </Button>
            </Stack>
        </Box>
    );
}
