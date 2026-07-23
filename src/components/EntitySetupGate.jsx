import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Stack, Button, Dialog, DialogContent, DialogActions,
    LinearProgress, Chip, IconButton, Tooltip, CircularProgress,
} from '@mui/material';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectUserTypeId, USER_TYPE, logout } from '../redux/slices/authSlice';
import { selectActiveEntityId } from '../redux/slices/orgSlice';
import http from '../Api/http';
import { GetEntitySetupStatus } from '../Api/Api';

const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const GRADIENT = 'linear-gradient(135deg, #7C5CFC 0%, #9B87FB 100%)';

// Each setup step → its icon and the screen where it's completed. A key the API
// adds later still renders (neutral icon, no link) instead of breaking the list.
const STEP_META = {
    financialYear: { icon: CalendarMonthRoundedIcon, to: '/dashboard/settings?tab=financial-year' },
    leaveTypes: { icon: CategoryRoundedIcon, to: '/dashboard/leave-policy?tab=types' },
    leavePolicy: { icon: RuleRoundedIcon, to: '/dashboard/leave-policy?tab=setup' },
    shifts: { icon: ScheduleRoundedIcon, to: '/dashboard/leave-policy?tab=setup' },
    workingCalendar: { icon: EventAvailableRoundedIcon, to: '/dashboard/leave-policy?tab=calendar' },
    shiftAssignment: { icon: GroupsRoundedIcon, to: '/dashboard/leave-policy?tab=shifts' },
    entityAdmin: { icon: AdminPanelSettingsRoundedIcon, to: `/dashboard/roles/${USER_TYPE.ADMIN}/users` },
    complianceConfig: { icon: VerifiedUserRoundedIcon, to: '/dashboard/payroll-setup?tab=statutory' },
    salaryStructures: { icon: RequestQuoteRoundedIcon, to: '/dashboard/payroll-setup?tab=structures' },
};
const FALLBACK = { icon: RadioButtonUncheckedRoundedIcon, to: null };

// ── Entity setup gate ───────────────────────────────────────────────────────
// A newly created entity has nothing configured. GetEntitySetupStatus reports
// which required steps are still pending; until they're all done the entity
// can't really be run. Who sees what:
//   • MasterAdmin (1) — a guided checklist they can act on OR "Skip for now"
//     (they can hop to an already-configured entity from the sidebar).
//   • Admin (2)       — the same checklist, but NO skip: their one entity is
//     this one, so skipping would leave them with nothing to use. It stays until
//     every required step is done.
//   • Everyone else   — a full-screen "not ready yet, ask your admin" block, so
//     an employee can't wander a half-configured company.
export default function EntitySetupGate() {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const userTypeId = useSelector(selectUserTypeId);
    const activeEntityId = useSelector(selectActiveEntityId);

    const isMasterAdmin = userTypeId === USER_TYPE.MASTER_ADMIN;
    const isAdmin = userTypeId === USER_TYPE.ADMIN;

    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [skipped, setSkipped] = useState(false);   // MasterAdmin, per-entity, this session

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data: body } = await http.get(GetEntitySetupStatus);
            // A 400 (MasterAdmin before an entity is picked) or an error body means
            // "can't tell" — leave the app open rather than guess a block.
            setStatus(body && !body.error ? body.data || null : null);
        } catch {
            setStatus(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // Re-check when the entity changes (MasterAdmin switching companies), and
    // reset the per-entity skip so the new entity is evaluated fresh.
    useEffect(() => { setSkipped(false); load(); }, [activeEntityId, load]);

    // While setup is incomplete, re-check on every navigation — so completing a
    // step on its page and coming back updates the checklist without a refresh.
    useEffect(() => {
        if (status && !status.ready) load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    // Open the checklist automatically the moment we learn setup is incomplete.
    useEffect(() => {
        if (status && !status.ready) setOpen(true);
    }, [status]);

    // Nothing to gate: no status (couldn't read / not applicable), or it's ready.
    if (!status || status.ready) return null;

    const steps = Array.isArray(status.steps) ? status.steps : [];
    const pendingRequired = Number(status.pendingRequired) || 0;
    const completed = Number(status.completedSteps) || 0;
    const total = Number(status.totalSteps) || steps.length || 1;
    const pct = Math.round((completed / total) * 100);
    const entityName = status.entityName || 'this entity';

    // ── Anyone who isn't an admin: hard block until the entity is ready ────────
    if (!isMasterAdmin && !isAdmin) {
        return (
            <Box sx={{ position: 'fixed', inset: 0, zIndex: 2000, bgcolor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                <Box sx={{ width: '100%', maxWidth: 460, bgcolor: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 30px 60px -20px rgba(15,23,42,0.5)' }}>
                    <Box sx={{ background: GRADIENT, p: 3, color: '#fff', textAlign: 'center' }}>
                        <HourglassEmptyRoundedIcon sx={{ fontSize: 40 }} />
                        <Typography sx={{ fontSize: 19, fontWeight: 800, mt: 1 }}>Setup in progress</Typography>
                    </Box>
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 14, color: '#334155', lineHeight: 1.6 }}>
                            <strong>{entityName}</strong> isn&apos;t quite ready yet — your administrator is still finishing its setup.
                            You&apos;ll be able to sign in and use the app once it&apos;s done.
                        </Typography>
                        <Button
                            onClick={() => dispatch(logout())}
                            startIcon={<LogoutRoundedIcon sx={{ fontSize: 18 }} />}
                            sx={{ mt: 3, height: 44, px: 3, bgcolor: PRIMARY, color: '#fff', fontWeight: 700, borderRadius: '9px', textTransform: 'none', boxShadow: 'none', '&:hover': { bgcolor: '#6246E0' } }}
                        >
                            Sign out
                        </Button>
                    </Box>
                </Box>
            </Box>
        );
    }

    // ── Admin / MasterAdmin skipped view: hide entirely for the session ───────
    if (skipped) return null;

    const go = (to) => { if (to) { navigate(to); setOpen(false); } };

    return (
        <>
            {/* Reopener — a floating pill when the checklist is closed but setup is
                still pending, so it's always one tap away. */}
            {!open && (
                <Box sx={{ position: 'fixed', right: 20, bottom: 20, zIndex: 1400 }}>
                    <Button
                        onClick={() => setOpen(true)}
                        startIcon={<RocketLaunchRoundedIcon sx={{ fontSize: 18 }} />}
                        sx={{ background: GRADIENT, color: '#fff', fontWeight: 800, fontSize: 13, textTransform: 'none', borderRadius: '999px', height: 46, px: 2.4, boxShadow: '0 12px 26px -10px rgba(124,92,252,0.8)', '&:hover': { filter: 'brightness(0.96)' } }}
                    >
                        Finish setup · {pendingRequired} left
                    </Button>
                </Box>
            )}

            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="sm"
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: '16px', overflow: 'hidden' } } }}
            >
                {/* Gradient header */}
                <Box sx={{ background: GRADIENT, p: 2.6, color: '#fff', position: 'relative' }}>
                    <IconButton onClick={() => setOpen(false)} size="small" sx={{ position: 'absolute', top: 10, right: 10, color: 'rgba(255,255,255,0.85)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.14)' } }}>
                        <CloseRoundedIcon sx={{ fontSize: 19 }} />
                    </IconButton>
                    <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
                        <Box sx={{ width: 42, height: 42, borderRadius: '11px', bgcolor: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <RocketLaunchRoundedIcon sx={{ fontSize: 23 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: 17, fontWeight: 800 }}>Set up {entityName}</Typography>
                            <Typography sx={{ fontSize: 12.5, opacity: 0.9 }}>
                                {pendingRequired > 0 ? `${pendingRequired} required step${pendingRequired === 1 ? '' : 's'} left before it can run` : 'Almost there — finish the optional steps'}
                            </Typography>
                        </Box>
                    </Stack>
                    <Box sx={{ mt: 1.8 }}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.6 }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, opacity: 0.9 }}>{completed} of {total} done</Typography>
                            <Typography sx={{ fontSize: 11, fontWeight: 800 }}>{pct}%</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={pct} sx={{ height: 7, borderRadius: 5, bgcolor: 'rgba(255,255,255,0.25)', '& .MuiLinearProgress-bar': { bgcolor: '#fff', borderRadius: 5 } }} />
                    </Box>
                </Box>

                <DialogContent sx={{ p: 1.5 }}>
                    <Stack spacing={0.8}>
                        {steps.map((s) => {
                            const meta = STEP_META[s.key] || FALLBACK;
                            const Icon = s.done ? CheckCircleRoundedIcon : meta.icon;
                            return (
                                <Stack
                                    key={s.key}
                                    direction="row"
                                    spacing={1.4}
                                    sx={{
                                        alignItems: 'center', p: 1.3, borderRadius: '11px',
                                        border: '1px solid', borderColor: s.done ? '#DCFCE7' : '#EEF1F6',
                                        bgcolor: s.done ? '#F5FDF8' : '#fff',
                                    }}
                                >
                                    <Box sx={{ width: 38, height: 38, borderRadius: '10px', flexShrink: 0, bgcolor: s.done ? '#DCFCE7' : PRIMARY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Icon sx={{ fontSize: 20, color: s.done ? '#16A34A' : PRIMARY }} />
                                    </Box>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                                            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{s.title}</Typography>
                                            {!s.required && <Chip label="Optional" size="small" sx={{ height: 17, fontSize: 9, fontWeight: 700, bgcolor: '#F1F5F9', color: '#64748B' }} />}
                                        </Stack>
                                        <Typography sx={{ fontSize: 11.5, color: '#94A3B8', lineHeight: 1.35 }}>{s.detail || s.description}</Typography>
                                    </Box>
                                    {s.done ? (
                                        <Chip label="Done" size="small" sx={{ flexShrink: 0, height: 24, fontSize: 10.5, fontWeight: 800, bgcolor: '#DCFCE7', color: '#16A34A' }} />
                                    ) : meta.to ? (
                                        <Tooltip arrow title={`Go to ${s.title}`}>
                                            <IconButton onClick={() => go(meta.to)} size="small" sx={{ flexShrink: 0, bgcolor: PRIMARY_LIGHT, color: PRIMARY, borderRadius: '9px', width: 34, height: 34, '&:hover': { bgcolor: '#E7DFFC' } }}>
                                                <ArrowForwardRoundedIcon sx={{ fontSize: 18 }} />
                                            </IconButton>
                                        </Tooltip>
                                    ) : null}
                                </Stack>
                            );
                        })}
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 2, py: 1.8, borderTop: '1px solid #F1F3F7', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                        onClick={load}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={14} /> : <RefreshRoundedIcon sx={{ fontSize: 17 }} />}
                        sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12.5, color: '#475569', bgcolor: '#F1F5F9', borderRadius: '8px', height: 40, px: 2, '&:hover': { bgcolor: '#E2E8F0' } }}
                    >
                        Re-check
                    </Button>
                    <Box sx={{ flex: 1 }} />
                    {/* Only a MasterAdmin may skip — they can work in another entity.
                        An Admin's single entity is this one, so there's nothing to
                        skip to; the checklist stays until it's done. */}
                    {isMasterAdmin ? (
                        <Button onClick={() => { setSkipped(true); setOpen(false); }} sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12.5, color: '#64748B', borderRadius: '8px', height: 40, px: 2 }}>
                            Skip for now
                        </Button>
                    ) : (
                        <Typography sx={{ fontSize: 11.5, color: '#94A3B8', alignSelf: 'center', mr: 0.5 }}>
                            Complete the required steps to start using {entityName}.
                        </Typography>
                    )}
                    <Button
                        onClick={() => setOpen(false)}
                        sx={{ background: GRADIENT, color: '#fff', textTransform: 'none', fontWeight: 800, fontSize: 12.5, borderRadius: '8px', height: 40, px: 2.4, boxShadow: 'none', '&:hover': { filter: 'brightness(0.96)' } }}
                    >
                        Got it
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
