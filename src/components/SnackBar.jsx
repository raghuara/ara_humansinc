import React from 'react';
import { Snackbar, Alert } from '@mui/material';

// Controlled snackbar used across the payroll / leave screens.
// Props: open, setOpen, message, status ('success' | 'error' | bool), color.
export default function SnackBar({ open, setOpen, message, status }) {
    const severity =
        typeof status === 'string' && ['success', 'error', 'warning', 'info'].includes(status)
            ? status
            : status
                ? 'success'
                : 'error';

    const handleClose = (_e, reason) => {
        if (reason === 'clickaway') return;
        if (setOpen) setOpen(false);
    };

    return (
        <Snackbar
            open={Boolean(open)}
            autoHideDuration={3000}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
            <Alert onClose={handleClose} severity={severity} variant="filled" sx={{ borderRadius: '7px', fontSize: 13.5 }}>
                {message}
            </Alert>
        </Snackbar>
    );
}
