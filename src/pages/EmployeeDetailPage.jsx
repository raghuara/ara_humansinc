import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box, Typography, Grid, Button, Avatar, Chip, Stack, IconButton, Tooltip,
    TextField, MenuItem, Dialog, DialogContent, DialogActions, Snackbar, Alert,
    InputAdornment, Skeleton, CircularProgress,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import WorkRoundedIcon from '@mui/icons-material/WorkRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import ContactEmergencyRoundedIcon from '@mui/icons-material/ContactEmergencyRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectDepartmentNames, selectDesignationNames } from '../redux/slices/orgSlice';
import http, { apiErrorMessage } from '../Api/http';
import { GetEmployeeById, UpdateEmployee, SetEmployeeLoginPassword } from '../Api/Api';
import { toApiDate, toInputDate, fmtApiDate, numOrNull, txt } from '../utils/apiFields';
import EmployeeDocuments from '../components/EmployeeDocuments';

const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_BORDER = '#C9BEFB';
const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
const tonalBtn = { bgcolor: PRIMARY_LIGHT, color: PRIMARY, border: `1px solid ${PRIMARY_BORDER}`, fontWeight: 700, borderRadius: '7px', boxShadow: 'none', textTransform: 'none', '&:hover': { bgcolor: '#E7DFFC' } };
const solidBtn = { bgcolor: PRIMARY, color: '#fff', fontWeight: 700, borderRadius: '7px', boxShadow: `0 2px 6px ${PRIMARY}40`, textTransform: 'none', '&:hover': { bgcolor: '#6246E0' }, '&.Mui-disabled': { bgcolor: PRIMARY, color: '#fff', opacity: 0.65, boxShadow: 'none' } };
const field = { '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 14, bgcolor: '#F8FAFC', '& fieldset': { borderColor: '#E5E7EB' }, '&.Mui-focused fieldset': { borderColor: PRIMARY, borderWidth: 1.5 } } };

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const MARITAL = ['Single', 'Married', 'Divorced', 'Widowed'];
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const SHIFTS = ['General', 'Morning', 'Evening', 'Night', 'Flexible'];
const EMP_TYPES = ['Permanent', 'Probation', 'Contract', 'Internship', 'Part-Time'];

const PALETTE = ['#7C5CFC', '#0EA5E9', '#F59E0B', '#16A34A', '#E11D48', '#6246E0', '#0891B2'];
const initials = (s = '') => s.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const colorFor = (s = '') => PALETTE[(s.charCodeAt(0) || 0) % PALETTE.length];

// Sections mirror the onboarding form, but the keys here are the API's own —
// GetEmployeeById is rendered straight through, with no local alias layer to
// drift out of step. `num` marks the nullable numeric columns.
const SECTIONS = [
    {
        id: 'personal', title: 'Personal Information', icon: PersonRoundedIcon, fields: [
            { k: 'firstName', label: 'First Name' },
            { k: 'lastName', label: 'Last Name' },
            { k: 'gender', label: 'Gender', type: 'select', options: GENDERS },
            { k: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
            { k: 'maritalStatus', label: 'Marital Status', type: 'select', options: MARITAL },
            { k: 'bloodGroup', label: 'Blood Group', type: 'select', options: BLOOD },
            { k: 'nationality', label: 'Nationality' },
            { k: 'personalEmail', label: 'Personal Email' },
            { k: 'personalMobile', label: 'Personal Mobile' },
            { k: 'alternateMobile', label: 'Alternate Mobile' },
        ],
    },
    {
        id: 'employment', title: 'Employment Information', icon: WorkRoundedIcon, fields: [
            { k: 'dateOfJoining', label: 'Date of Joining', type: 'date' },
            { k: 'employmentType', label: 'Employment Type', type: 'select', options: EMP_TYPES },
            { k: 'department', label: 'Department', type: 'select', options: [] },
            { k: 'designation', label: 'Designation', type: 'select', options: [] },
            { k: 'shift', label: 'Shift', type: 'select', options: SHIFTS },
            { k: 'probationPeriodMonths', label: 'Probation Period (months)', num: true },
            { k: 'confirmationDate', label: 'Confirmation Date', type: 'date' },
        ],
    },
    {
        id: 'contact', title: 'Contact Information', icon: HomeRoundedIcon, fields: [
            { k: 'addressLine1', label: 'Address Line 1' },
            { k: 'addressLine2', label: 'Address Line 2' },
            { k: 'city', label: 'City' },
            { k: 'state', label: 'State' },
            { k: 'country', label: 'Country' },
            { k: 'postalCode', label: 'Postal Code' },
        ],
    },
    {
        id: 'identity', title: 'Government & Identity', icon: BadgeRoundedIcon, fields: [
            { k: 'aadhaarNumber', label: 'Aadhaar Number' }, { k: 'panNumber', label: 'PAN Number' },
            { k: 'passportNumber', label: 'Passport Number' }, { k: 'drivingLicense', label: 'Driving License' },
            { k: 'voterId', label: 'Voter ID' }, { k: 'uanNumber', label: 'UAN Number' },
            { k: 'esiNumber', label: 'ESI Number' }, { k: 'pfNumber', label: 'PF Number' },
        ],
    },
    {
        id: 'education', title: 'Education', icon: SchoolRoundedIcon, fields: [
            { k: 'highestQualification', label: 'Highest Qualification' }, { k: 'institution', label: 'Institution' },
            { k: 'university', label: 'University' }, { k: 'yearOfPassing', label: 'Year of Passing', num: true },
            { k: 'percentageOrCgpa', label: 'Percentage / CGPA' }, { k: 'certifications', label: 'Certifications' },
        ],
    },
    {
        id: 'previous', title: 'Previous Employment', icon: HistoryRoundedIcon, fields: [
            { k: 'prevCompanyName', label: 'Company Name' }, { k: 'prevDesignation', label: 'Designation' },
            { k: 'prevExperienceYears', label: 'Experience (years)', num: true },
            { k: 'prevStartDate', label: 'Start Date', type: 'date' }, { k: 'prevEndDate', label: 'End Date', type: 'date' },
            { k: 'lastDrawnSalary', label: 'Last Drawn Salary', num: true },
            { k: 'reasonForLeaving', label: 'Reason for Leaving' },
        ],
    },
    {
        id: 'emergency', title: 'Emergency Contact', icon: ContactEmergencyRoundedIcon, fields: [
            { k: 'emergencyContactName', label: 'Contact Name' }, { k: 'emergencyRelationship', label: 'Relationship' },
            { k: 'emergencyMobile', label: 'Mobile Number' }, { k: 'emergencyAlternateNumber', label: 'Alternate Number' },
            { k: 'emergencyAddress', label: 'Address' },
        ],
    },
];

const ALL_FIELDS = SECTIONS.flatMap((s) => s.fields);

// UpdateEmployee accepts these and nothing else. Every other field the employee
// record holds — address, identity, education, previous employment, emergency
// contact — is returned by GetEmployeeById but has no way back to the server, so
// the form shows it read-only instead of letting it be typed into a void.
// Widen this set the moment the endpoint accepts more.
const EDITABLE = new Set([
    'firstName', 'lastName', 'gender', 'dateOfBirth', 'personalEmail', 'personalMobile',
    'employmentType', 'dateOfJoining', 'department', 'designation', 'shift',
]);

const EDITABLE_FIELDS = ALL_FIELDS.filter((f) => EDITABLE.has(f.k));

// The edit form holds date inputs as YYYY-MM-DD; this converts back to exactly
// what the API stores. Only the editable subset is sent.
const buildUpdatePayload = (id, form) => {
    const out = { id };
    EDITABLE_FIELDS.forEach((f) => {
        if (f.type === 'date') out[f.k] = toApiDate(form[f.k]);
        else if (f.num) out[f.k] = numOrNull(form[f.k]);
        else out[f.k] = txt(form[f.k]);
    });
    return out;
};

function SectionCard({ icon: Icon, title, children }) {
    return (
        <Box sx={{ ...card, p: 0, overflow: 'hidden' }}>
            <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center', px: 2.2, py: 1.6, bgcolor: `${PRIMARY}12`, borderBottom: `1px solid ${PRIMARY}24` }}>
                <Box sx={{ width: 34, height: 34, borderRadius: '9px', bgcolor: '#fff', boxShadow: '0 1px 4px rgba(16,24,40,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon sx={{ fontSize: 18, color: PRIMARY }} />
                </Box>
                <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: '#0F172A' }}>{title}</Typography>
            </Stack>
            <Box sx={{ p: 2.5 }}>{children}</Box>
        </Box>
    );
}

const Label = ({ children }) => <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4, mb: 0.5 }}>{children}</Typography>;
const NotProvided = () => <Typography sx={{ fontSize: 13, color: '#C4C9D4', fontStyle: 'italic' }}>Not provided</Typography>;

export default function EmployeeDetailPage() {
    const navigate = useNavigate();
    const { id } = useParams();

    const departmentNames = useSelector(selectDepartmentNames);
    const designationNames = useSelector(selectDesignationNames);

    const [emp, setEmp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const [mode, setMode] = useState('view');
    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);

    const [pwdOpen, setPwdOpen] = useState(false);
    const [pwd, setPwd] = useState({ password: '', confirmPassword: '' });
    const [showPwd, setShowPwd] = useState(false);
    const [pwdSaving, setPwdSaving] = useState(false);

    const [snack, setSnack] = useState({ msg: '', severity: 'success' });
    const notify = (msg, severity = 'success') => setSnack({ msg, severity });

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        try {
            const { data: body } = await http.get(GetEmployeeById, { params: { id } });
            if (body?.error) throw new Error(body.message || 'Could not load this employee.');
            setEmp(body?.data || null);
            setMode('view');
        } catch (err) {
            setLoadError(err?.response || err?.request ? apiErrorMessage(err, 'Could not load this employee.') : err.message);
            setEmp(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const fullName = `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim();
    const active = String(emp?.status || '').toLowerCase() === 'active';
    const avColor = useMemo(() => colorFor(emp?.firstName || ''), [emp]);

    const startEdit = () => {
        const init = {};
        EDITABLE_FIELDS.forEach((f) => {
            const v = emp[f.k];
            init[f.k] = f.type === 'date' ? toInputDate(v) : (v ?? '');
        });
        setForm(init);
        setMode('edit');
    };
    const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const saveEdit = async () => {
        if (!txt(form.firstName) || !txt(form.personalEmail)) {
            notify('First name and personal email are required.', 'warning');
            return;
        }
        setSaving(true);
        try {
            const { data: body } = await http.put(UpdateEmployee, buildUpdatePayload(emp.id, form));
            if (body?.error) throw new Error(body.message || 'Could not save changes.');
            // Re-read rather than trusting the local form: the server may
            // normalise what it stored, and this page should show what's stored.
            await load();
            notify('Employee details updated');
        } catch (err) {
            notify(err?.response || err?.request ? apiErrorMessage(err, 'Could not save changes.') : err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const savePassword = async () => {
        if (!pwd.password.trim()) { notify('Enter a password.', 'warning'); return; }
        if (pwd.password !== pwd.confirmPassword) { notify('Passwords do not match.', 'warning'); return; }
        setPwdSaving(true);
        try {
            const { data: body } = await http.post(SetEmployeeLoginPassword, {
                employeeId: emp.id,
                password: pwd.password,
                confirmPassword: pwd.confirmPassword,
            });
            if (body?.error) throw new Error(body.message || 'Could not set the password.');
            setPwdOpen(false);
            setPwd({ password: '', confirmPassword: '' });
            notify('Password updated');
        } catch (err) {
            notify(err?.response || err?.request ? apiErrorMessage(err, 'Could not set the password.') : err.message, 'error');
        } finally {
            setPwdSaving(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ p: 2 }}>
                <Box sx={{ ...card, p: 2, mb: 1.5 }}>
                    <Stack direction="row" spacing={1.6} sx={{ alignItems: 'center' }}>
                        <Skeleton variant="rounded" width={40} height={40} />
                        <Skeleton variant="circular" width={52} height={52} />
                        <Box><Skeleton variant="text" width={200} height={28} /><Skeleton variant="text" width={260} height={18} /></Box>
                    </Stack>
                </Box>
                <Stack spacing={1.5}>
                    {[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={190} sx={{ borderRadius: '7px' }} />)}
                </Stack>
            </Box>
        );
    }

    if (loadError || !emp) {
        return (
            <Box sx={{ p: 2 }}>
                <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center', ...card, p: 2.2, bgcolor: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <ErrorOutlineRoundedIcon sx={{ fontSize: 22, color: '#B91C1C' }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: '#991B1B' }}>Couldn't load this employee</Typography>
                        <Typography sx={{ fontSize: 12.5, color: '#B91C1C' }}>{loadError || 'Employee not found.'}</Typography>
                    </Box>
                    <Button onClick={load} startIcon={<RefreshRoundedIcon sx={{ fontSize: 17 }} />} sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12.5, color: '#B91C1C', bgcolor: '#fff', border: '1px solid #FECACA', borderRadius: '7px', height: 38, px: 2 }}>Retry</Button>
                </Stack>
                <Button onClick={() => navigate('/dashboard/employees')} startIcon={<ArrowBackRoundedIcon />} sx={{ ...tonalBtn, mt: 2, height: 40, px: 2 }}>Back to Employees</Button>
            </Box>
        );
    }


    return (
        <Box sx={{ p: 2 }}>
            {/* Sticky header */}
            <Box sx={{ position: 'sticky', top: 0, zIndex: 5, ...card, p: 2, mb: 1.5 }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
                    <Stack direction="row" spacing={1.6} sx={{ alignItems: 'center' }}>
                        <IconButton onClick={() => navigate('/dashboard/employees')} sx={{ bgcolor: '#F8FAFC', border: '1px solid #E6EAF1', borderRadius: '7px', '&:hover': { bgcolor: '#F1F5F9' } }}>
                            <ArrowBackRoundedIcon sx={{ fontSize: 20, color: '#334155' }} />
                        </IconButton>
                        <Avatar src={emp.profilePhotoUrl || undefined} sx={{ width: 52, height: 52, bgcolor: avColor, fontSize: 18, fontWeight: 700, filter: active ? 'none' : 'grayscale(0.4)' }}>{initials(fullName)}</Avatar>
                        <Box>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>{fullName || '—'}</Typography>
                                <Chip label={active ? 'Active' : (emp.status || 'Inactive')} size="small" sx={{ height: 21, fontSize: 10.5, fontWeight: 700, textTransform: 'capitalize', bgcolor: active ? '#DCFCE7' : '#FEE2E2', color: active ? '#16A34A' : '#DC2626' }} />
                            </Stack>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.3, flexWrap: 'wrap' }}>
                                <Chip label={emp.employeeCode || '—'} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 800, bgcolor: PRIMARY_LIGHT, color: PRIMARY, border: `1px solid ${PRIMARY_BORDER}` }} />
                                <Typography sx={{ fontSize: 12.5, color: '#6B7280' }}>{emp.designation || 'Staff'}{emp.department ? ` · ${emp.department}` : ''}</Typography>
                                {emp.createdOn && <Typography sx={{ fontSize: 11.5, color: '#98A0AE' }}>· added {fmtApiDate(emp.createdOn)}</Typography>}
                            </Stack>
                        </Box>
                    </Stack>

                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                        {mode === 'view' ? (
                            <Button onClick={startEdit} startIcon={<EditRoundedIcon sx={{ fontSize: 17 }} />} sx={{ ...tonalBtn, height: 40, px: 2 }}>Edit</Button>
                        ) : (
                            <>
                                <Button disabled={saving} onClick={() => setMode('view')} sx={{ color: '#64748B', textTransform: 'none', fontWeight: 600, borderRadius: '7px', height: 40, px: 2, border: '1px solid #E6EAF1' }}>Cancel</Button>
                                <Button disabled={saving} onClick={saveEdit} startIcon={saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <SaveRoundedIcon sx={{ fontSize: 18 }} />} sx={{ ...solidBtn, height: 40, px: 2.4 }}>{saving ? 'Saving…' : 'Save Changes'}</Button>
                            </>
                        )}
                    </Stack>
                </Stack>
            </Box>

            {mode === 'edit' && (
                <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center', ...card, p: 1.6, mb: 1.5, bgcolor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                    <LockRoundedIcon sx={{ fontSize: 18, color: '#B45309', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: 12.5, color: '#78350F', lineHeight: 1.5 }}>
                        Only the fields below without a lock can be saved — <strong>UpdateEmployee</strong> accepts name, gender, date of birth,
                        personal email &amp; mobile, employment type, joining date, department, designation and shift. The rest are read-only until the endpoint accepts them.
                    </Typography>
                </Stack>
            )}

            <Stack spacing={1.5}>
                {/* Login Credentials — the API never returns a password (correctly),
                    so there is nothing to display: it can only be (re)set. */}
                <SectionCard icon={LockRoundedIcon} title="Login Credentials">
                    <Grid container spacing={2.5} sx={{ alignItems: 'center' }}>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <Label>Login ID</Label>
                            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#5B21B6' }}>{emp.employeeCode || '—'}</Typography>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <Label>Password</Label>
                            <Button onClick={() => { setPwd({ password: '', confirmPassword: '' }); setShowPwd(false); setPwdOpen(true); }}
                                startIcon={<VpnKeyRoundedIcon sx={{ fontSize: 16 }} />} sx={{ ...tonalBtn, height: 34, px: 1.6, fontSize: 12.5 }}>
                                Set / Reset Password
                            </Button>
                        </Grid>
                    </Grid>
                </SectionCard>

                {SECTIONS.map((sec) => (
                    <SectionCard key={sec.id} icon={sec.icon} title={sec.title}>
                        <Grid container spacing={mode === 'edit' ? 2 : 2.5}>
                            {sec.fields.map((f) => {
                                const editing = mode === 'edit' && EDITABLE.has(f.k);
                                const raw = editing ? form[f.k] : emp[f.k];

                                // Department / designation are driven by the Organisation
                                // masters. Whatever is already stored stays in the list even
                                // if that master was since renamed, so editing another field
                                // can't silently blank it.
                                let options = f.options;
                                if (f.k === 'department') options = departmentNames;
                                if (f.k === 'designation') options = designationNames;
                                if ((f.k === 'department' || f.k === 'designation') && raw && !options.includes(raw)) {
                                    options = [...options, raw];
                                }

                                const hasValue = raw !== null && raw !== undefined && String(raw) !== '';
                                const frozen = mode === 'edit' && !EDITABLE.has(f.k);

                                return (
                                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={f.k}>
                                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                            <Label>{f.label}</Label>
                                            {frozen && (
                                                <Tooltip arrow title="Read-only — UpdateEmployee doesn't accept this field yet.">
                                                    <LockRoundedIcon sx={{ fontSize: 12, color: '#CBD2DD', mb: 0.5 }} />
                                                </Tooltip>
                                            )}
                                        </Stack>
                                        {editing ? (
                                            f.type === 'select' ? (
                                                <TextField select fullWidth size="small" value={raw || ''} onChange={setF(f.k)} sx={field}>
                                                    <MenuItem value=""><em>—</em></MenuItem>
                                                    {options.map((o) => <MenuItem key={o} value={o} sx={{ fontSize: 13.5 }}>{o}</MenuItem>)}
                                                </TextField>
                                            ) : (
                                                <TextField
                                                    fullWidth size="small"
                                                    type={f.type === 'date' ? 'date' : (f.num ? 'number' : 'text')}
                                                    value={raw ?? ''} onChange={setF(f.k)} sx={field}
                                                    slotProps={f.type === 'date' ? { inputLabel: { shrink: true } } : undefined}
                                                />
                                            )
                                        ) : (
                                            hasValue
                                                ? <Typography sx={{ fontSize: 14, fontWeight: 600, color: frozen ? '#94A3B8' : '#0F172A' }}>{f.type === 'date' ? fmtApiDate(raw) : String(raw)}</Typography>
                                                : <NotProvided />
                                        )}
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </SectionCard>
                ))}

                {/* Documents — live from the EmployeeDocument API (upload / download / delete) */}
                <EmployeeDocuments employeeId={emp.id} />
            </Stack>

            {/* Set / reset password */}
            <Dialog open={pwdOpen} onClose={() => !pwdSaving && setPwdOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogContent sx={{ pt: 3, pb: 1.5 }}>
                    <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center', mb: 2 }}>
                        <Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: PRIMARY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <VpnKeyRoundedIcon sx={{ color: PRIMARY, fontSize: 22 }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: 16.5, fontWeight: 800, color: '#0F172A' }}>Set Password</Typography>
                            <Typography sx={{ fontSize: 12.5, color: '#98A0AE' }}>{fullName} signs in with <strong>{emp.employeeCode}</strong></Typography>
                        </Box>
                    </Stack>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#334155', mb: 0.6 }}>New password</Typography>
                    <TextField fullWidth size="small" autoFocus type={showPwd ? 'text' : 'password'} value={pwd.password}
                        onChange={(e) => setPwd((p) => ({ ...p, password: e.target.value }))} sx={{ ...field, mb: 2 }}
                        slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => setShowPwd((v) => !v)} sx={{ p: 0.3 }}>{showPwd ? <VisibilityOffRoundedIcon sx={{ fontSize: 17, color: '#94A3B8' }} /> : <VisibilityRoundedIcon sx={{ fontSize: 17, color: '#94A3B8' }} />}</IconButton></InputAdornment> } }} />
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#334155', mb: 0.6 }}>Confirm password</Typography>
                    <TextField fullWidth size="small" type={showPwd ? 'text' : 'password'} value={pwd.confirmPassword}
                        onChange={(e) => setPwd((p) => ({ ...p, confirmPassword: e.target.value }))}
                        error={Boolean(pwd.confirmPassword) && pwd.password !== pwd.confirmPassword}
                        helperText={Boolean(pwd.confirmPassword) && pwd.password !== pwd.confirmPassword ? 'Passwords do not match' : ' '}
                        sx={field}
                        onKeyDown={(e) => { if (e.key === 'Enter') savePassword(); }} />
                </DialogContent>
                <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
                    <Button fullWidth disabled={pwdSaving} onClick={() => setPwdOpen(false)} sx={{ textTransform: 'none', fontSize: 13, fontWeight: 600, borderRadius: '7px', height: 40, border: '1px solid #E5E7EB', color: '#374151' }}>Cancel</Button>
                    <Button fullWidth disabled={pwdSaving} onClick={savePassword}
                        startIcon={pwdSaving ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : <SaveRoundedIcon sx={{ fontSize: 17 }} />}
                        sx={{ ...solidBtn, height: 40 }}>{pwdSaving ? 'Saving…' : 'Save'}</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={Boolean(snack.msg)} autoHideDuration={3500} onClose={() => setSnack((s) => ({ ...s, msg: '' }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack((s) => ({ ...s, msg: '' }))} severity={snack.severity} variant="filled" sx={{ borderRadius: '7px' }}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
