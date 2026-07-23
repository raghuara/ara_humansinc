import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, Grid, Button, TextField, MenuItem, Stack, Chip, Avatar, IconButton,
    Snackbar, Alert, Tooltip, LinearProgress, InputAdornment, CircularProgress,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import WorkRoundedIcon from '@mui/icons-material/WorkRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import ContactEmergencyRoundedIcon from '@mui/icons-material/ContactEmergencyRounded';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PhotoCameraRoundedIcon from '@mui/icons-material/PhotoCameraRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import VpnKeyRoundedIcon from '@mui/icons-material/VpnKeyRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { addEmployee } from '../redux/slices/employeesSlice';
import { selectDepartmentNames, selectDesignationNames } from '../redux/slices/orgSlice';
import http, { apiErrorMessage } from '../Api/http';
import { PostEmployee, SetEmployeeLoginPassword, UpdateEmployeeUserType, GetEmployeeById, GetUserTypes, GetLoginIdFormat, UploadEmployeeDoc } from '../Api/Api';
import { selectUserTypeId } from '../redux/slices/authSlice';
import { canAssignRole, ROLE } from '../data/roleAccess';
import { toApiDate, numOrNull, txt } from '../utils/apiFields';

const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_BORDER = '#C9BEFB';
const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
const tonalBtn = { bgcolor: PRIMARY_LIGHT, color: PRIMARY, border: `1px solid ${PRIMARY_BORDER}`, fontWeight: 700, borderRadius: '7px', boxShadow: 'none', textTransform: 'none', '&:hover': { bgcolor: '#E7DFFC' } };
const solidBtn = { bgcolor: PRIMARY, color: '#fff', fontWeight: 700, borderRadius: '7px', boxShadow: `0 2px 6px ${PRIMARY}40`, textTransform: 'none', '&:hover': { bgcolor: '#6246E0', boxShadow: `0 4px 10px ${PRIMARY}55` } };
const savingBtn = { '&.Mui-disabled': { bgcolor: PRIMARY, color: '#fff', opacity: 0.7, boxShadow: 'none' } };
const field = { '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 14, bgcolor: '#F8FAFC', '& fieldset': { borderColor: '#E5E7EB' }, '&:hover fieldset': { borderColor: '#D8DEE8' }, '&.Mui-focused fieldset': { borderColor: PRIMARY, borderWidth: 1.5 } } };

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const MARITAL = ['Single', 'Married', 'Divorced', 'Widowed'];
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
// Sent verbatim as `shift`, so these must be the values the backend expects —
// no "(9 – 6)" style annotations, or the API stores a shift name it can't match.
const SHIFTS = ['General', 'Morning', 'Evening', 'Night', 'Flexible'];
const EMP_TYPES = ['Permanent', 'Probation', 'Contract', 'Internship', 'Part-Time'];
// Each supporting document maps to the slug PostEmployeeDocument expects. The
// profile photo is handled by the avatar uploader above (also 'profile-photo').
const DOC_ITEMS = [
    { label: 'Aadhaar Card', slug: 'aadhaar-card' },
    { label: 'PAN Card', slug: 'pan-card' },
    { label: 'Passport', slug: 'passport' },
    { label: 'Resume', slug: 'resume' },
    { label: 'Educational Certificates', slug: 'educational-certificates' },
    { label: 'Experience Certificates', slug: 'experience-certificates' },
    { label: 'Offer Letter', slug: 'offer-letter' },
    { label: 'Appointment Letter', slug: 'appointment-letter' },
    { label: 'Joining Letter', slug: 'joining-letter' },
    { label: 'Relieving Letter', slug: 'relieving-letter' },
    { label: 'Bank Passbook / Cancelled Cheque', slug: 'bank-passbook' },
    { label: 'Address Proof', slug: 'address-proof' },
    { label: 'Signature', slug: 'signature' },
    { label: 'Other Documents', slug: 'other' },
];

const SECTIONS = [
    { id: 'login', label: 'Login Credentials', icon: LockRoundedIcon, required: true },
    { id: 'personal', label: 'Personal Information', icon: PersonRoundedIcon, required: true },
    { id: 'employment', label: 'Employment Information', icon: WorkRoundedIcon, required: true },
    { id: 'contact', label: 'Contact Information', icon: HomeRoundedIcon },
    { id: 'identity', label: 'Government & Identity', icon: BadgeRoundedIcon },
    { id: 'education', label: 'Education', icon: SchoolRoundedIcon },
    { id: 'previous', label: 'Previous Employment', icon: HistoryRoundedIcon },
    { id: 'emergency', label: 'Emergency Contact', icon: ContactEmergencyRoundedIcon },
    { id: 'documents', label: 'Documents Upload', icon: FolderRoundedIcon },
];

// Mandatory fields → the only thing required to add an employee.
const MANDATORY = [
    { key: 'password', label: 'Password' },
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'gender', label: 'Gender' },
    { key: 'dob', label: 'Date of Birth' },
    { key: 'personalEmail', label: 'Email (login username)' },
    { key: 'personalMobile', label: 'Personal Mobile' },
    { key: 'dateOfJoining', label: 'Date of Joining' },
    { key: 'employmentType', label: 'Employment Type' },
    { key: 'department', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'shift', label: 'Shift' },
];

const EMPTY = {
    password: '', confirmPassword: '', userTypeId: ROLE.EMPLOYEE,
    firstName: '', lastName: '', gender: '', dob: '', maritalStatus: '', bloodGroup: '', nationality: '',
    personalEmail: '', personalMobile: '', alternateMobile: '',
    dateOfJoining: '', employmentType: '', department: '', designation: '', shift: '', probationPeriod: '', confirmationDate: '',
    addressLine1: '', addressLine2: '', city: '', state: '', country: '', postalCode: '',
    aadhaar: '', pan: '', passport: '', drivingLicense: '', voterId: '', uan: '', esi: '', pf: '',
    highestQualification: '', institution: '', university: '', yearOfPassing: '', percentage: '', certifications: '',
    prevCompany: '', prevDesignation: '', prevExperience: '', prevStartDate: '', prevEndDate: '', lastDrawnSalary: '', reasonForLeaving: '',
    emergencyName: '', emergencyRelationship: '', emergencyMobile: '', emergencyAlternate: '', emergencyAddress: '',
};

// ── PostEmployee payload ─────────────────────────────────────────────────────
// The form's field names are the UI's own; the API has its own vocabulary
// (`dob` → `dateOfBirth`, `aadhaar` → `aadhaarNumber`, …). Everything is mapped
// explicitly here so a rename on either side fails loudly in one place instead
// of silently posting an empty column.
const buildEmployeePayload = (form) => ({
    firstName: txt(form.firstName),
    lastName: txt(form.lastName),
    gender: txt(form.gender),
    dateOfBirth: toApiDate(form.dob),
    maritalStatus: txt(form.maritalStatus),
    bloodGroup: txt(form.bloodGroup),
    nationality: txt(form.nationality),

    personalEmail: txt(form.personalEmail),
    personalMobile: txt(form.personalMobile),
    alternateMobile: txt(form.alternateMobile),

    employmentType: txt(form.employmentType),
    dateOfJoining: toApiDate(form.dateOfJoining),
    department: txt(form.department),
    designation: txt(form.designation),
    shift: txt(form.shift),
    probationPeriodMonths: numOrNull(form.probationPeriod),
    confirmationDate: toApiDate(form.confirmationDate),

    addressLine1: txt(form.addressLine1),
    addressLine2: txt(form.addressLine2),
    city: txt(form.city),
    state: txt(form.state),
    country: txt(form.country),
    postalCode: txt(form.postalCode),

    aadhaarNumber: txt(form.aadhaar),
    panNumber: txt(form.pan),
    passportNumber: txt(form.passport),
    drivingLicense: txt(form.drivingLicense),
    voterId: txt(form.voterId),
    uanNumber: txt(form.uan),
    esiNumber: txt(form.esi),
    pfNumber: txt(form.pf),

    highestQualification: txt(form.highestQualification),
    institution: txt(form.institution),
    university: txt(form.university),
    yearOfPassing: numOrNull(form.yearOfPassing),
    percentageOrCgpa: txt(form.percentage),
    certifications: txt(form.certifications),

    prevCompanyName: txt(form.prevCompany),
    prevDesignation: txt(form.prevDesignation),
    prevExperienceYears: numOrNull(form.prevExperience),
    prevStartDate: toApiDate(form.prevStartDate),
    prevEndDate: toApiDate(form.prevEndDate),
    lastDrawnSalary: numOrNull(form.lastDrawnSalary),
    reasonForLeaving: txt(form.reasonForLeaving),

    emergencyContactName: txt(form.emergencyName),
    emergencyRelationship: txt(form.emergencyRelationship),
    emergencyMobile: txt(form.emergencyMobile),
    emergencyAlternateNumber: txt(form.emergencyAlternate),
    emergencyAddress: txt(form.emergencyAddress),
});

// ── small building blocks ────────────────────────────────────────────────────
const Label = ({ children, req }) => (
    <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#334155', mb: 0.6 }}>
        {children}{req && <Box component="span" sx={{ color: '#E11D48', ml: 0.4 }}>*</Box>}
    </Typography>
);

function Field({ label, req, value, onChange, type, placeholder, error }) {
    return (
        <Box>
            <Label req={req}>{label}</Label>
            <TextField fullWidth size="small" type={type} placeholder={placeholder} value={value} onChange={onChange}
                error={error} sx={field} slotProps={type === 'date' ? { inputLabel: { shrink: true } } : undefined} />
        </Box>
    );
}

function Select({ label, req, value, onChange, options, error }) {
    return (
        <Box>
            <Label req={req}>{label}</Label>
            <TextField select fullWidth size="small" value={value} onChange={onChange} error={error} sx={field}>
                {options.map((o) => <MenuItem key={o} value={o} sx={{ fontSize: 13.5 }}>{o}</MenuItem>)}
            </TextField>
        </Box>
    );
}

function SectionCard({ section, children }) {
    const Icon = section.icon;
    return (
        <Box id={`sec-${section.id}`} sx={{ ...card, p: 0, scrollMarginTop: 90 }}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 1.8, borderBottom: '1px solid #F1F3F7' }}>
                <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center' }}>
                    <Box sx={{ width: 34, height: 34, borderRadius: '8px', bgcolor: PRIMARY_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon sx={{ fontSize: 19, color: PRIMARY }} />
                    </Box>
                    <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{section.label}</Typography>
                </Stack>
                <Chip label={section.required ? 'Required' : 'Optional'} size="small"
                    sx={{ height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: section.required ? '#FEF2F2' : '#F1F5F9', color: section.required ? '#E11D48' : '#64748B' }} />
            </Stack>
            <Box sx={{ p: 2.5 }}>{children}</Box>
        </Box>
    );
}

export default function OnboardEmployeePage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    // The login ID is generated by the server (EMP-3, …), not here — showing a
    // locally-guessed one would name the employee something they'll never have.
    const [empId, setEmpId] = useState('');
    const myUserTypeId = useSelector(selectUserTypeId);
    // Roles this login may hand out. A login created at onboarding has NO user
    // type and cannot sign in until one is assigned (step 3), so a role is part
    // of onboarding now. An Admin can assign any role except Master Admin.
    const [roles, setRoles] = useState([]);

    useEffect(() => {
        let cancelled = false;
        http.get(GetLoginIdFormat)
            .then(({ data: body }) => {
                if (cancelled || body?.error) return;
                setEmpId(body?.data?.nextLoginId || '');
            })
            .catch(() => { /* the field shows a placeholder; the server still assigns the real id */ });
        return () => { cancelled = true; };
    }, []);

    // The role picker — every user type this login is allowed to grant. Master
    // Admin (id 1) is filtered out for anyone who isn't one.
    useEffect(() => {
        let cancelled = false;
        http.get(GetUserTypes)
            .then(({ data: body }) => {
                if (cancelled || body?.error) return;
                const list = Array.isArray(body?.data?.roles) ? body.data.roles : [];
                setRoles(list.filter((r) => canAssignRole(myUserTypeId, r.id)));
            })
            .catch(() => { /* dropdown falls back to the Employee default */ });
        return () => { cancelled = true; };
    }, [myUserTypeId]);

    // Department / designation options come from the Organisation masters of the
    // entity currently being worked in — not a hard-coded list.
    const DEPARTMENTS = useSelector(selectDepartmentNames);
    const DESIGNATIONS = useSelector(selectDesignationNames);

    const [form, setForm] = useState(EMPTY);
    const [photo, setPhoto] = useState(null);        // { url, name }
    const [docs, setDocs] = useState({});            // label -> { url, name }
    const [snack, setSnack] = useState({ msg: '', sev: 'warning' });
    const [saving, setSaving] = useState(false);
    const [triedSubmit, setTriedSubmit] = useState(false);
    const [showPwd, setShowPwd] = useState(false);
    const [showPwd2, setShowPwd2] = useState(false);
    const photoInput = useRef(null);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const invalid = (k) => triedSubmit && MANDATORY.some((m) => m.key === k) && !String(form[k] || '').trim();

    const doneCount = MANDATORY.filter((m) => String(form[m.key] || '').trim()).length;
    const totalMandatory = MANDATORY.length;
    const pct = Math.round((doneCount / totalMandatory) * 100);

    const scrollTo = (id) => document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const pickPhoto = (e) => {
        const f = e.target.files?.[0];
        if (f) setPhoto({ url: URL.createObjectURL(f), name: f.name, file: f });
    };
    // Keyed by document-type slug; the File is kept so it can be uploaded once
    // the employee exists (PostEmployeeDocument needs the new employee id).
    const pickDoc = (slug) => (e) => {
        const f = e.target.files?.[0];
        if (f) setDocs((d) => ({ ...d, [slug]: { url: URL.createObjectURL(f), name: f.name, file: f } }));
    };

    const submit = async () => {
        if (saving) return;
        setTriedSubmit(true);
        const missing = MANDATORY.filter((m) => !String(form[m.key] || '').trim());
        if (missing.length) {
            setSnack({ msg: `Please complete ${missing.length} required field${missing.length > 1 ? 's' : ''}: ${missing.slice(0, 3).map((m) => m.label).join(', ')}${missing.length > 3 ? '…' : ''}`, sev: 'error' });
            // The email and password both live in Login Credentials now, so a
            // missing one of those jumps there rather than to Personal.
            const firstSection = missing.some((m) => ['personalEmail', 'password'].includes(m.key)) ? 'login'
                : missing.some((m) => ['dateOfJoining', 'employmentType', 'department', 'designation', 'shift'].includes(m.key)) && !missing.some((m) => ['firstName', 'lastName', 'gender', 'dob', 'personalMobile'].includes(m.key)) ? 'employment' : 'personal';
            scrollTo(firstSection);
            return;
        }
        // The email is the login username, so a typo locks them out of the app
        // entirely — worth one shape check before the record is created.
        if (!/^\S+@\S+\.\S+$/.test(String(form.personalEmail).trim())) {
            setSnack({ msg: 'Enter a valid email address — it is their login username.', sev: 'error' });
            scrollTo('login');
            return;
        }
        if (form.password !== form.confirmPassword) {
            setSnack({ msg: 'Passwords do not match.', sev: 'error' });
            scrollTo('login');
            return;
        }

        setSaving(true);
        try {
            const { data: body } = await http.post(PostEmployee, buildEmployeePayload(form));
            if (body?.error) throw new Error(body.message || 'Could not onboard this employee.');

            // Step 2. The password is a separate call because it needs the
            // employeeId that only exists once PostEmployee has returned —
            // SetEmployeeLoginPassword is keyed on it, so the order is forced.
            //
            // The employee already exists at this point, so a failure here must
            // not read as "onboarding failed": the record is real, it just can't
            // be signed into until someone sets a password from their profile.
            const newId = body?.data?.employeeId ?? body?.data?.id ?? body?.employeeId;
            // UpdateEmployeeUserType (step 3) keys on the Employee CODE, not the
            // numeric id. Prefer whatever PostEmployee echoed; fall back to a read.
            let employeeCode = body?.data?.employeeCode ?? body?.data?.code ?? body?.data?.loginId ?? '';
            let warning = '';
            if (newId == null) {
                warning = 'but the API returned no employee id, so no login was created';
            } else {
                try {
                    // Step 2 — the password (creates the login account).
                    const { data: pwBody } = await http.post(SetEmployeeLoginPassword, {
                        employeeId: newId,
                        password: form.password,
                        confirmPassword: form.confirmPassword,
                    });
                    if (pwBody?.error) throw new Error(pwBody.message || 'password was rejected');

                    // Step 3 — the role. A login with no user type CANNOT sign in
                    // (409 "no valid role assigned"), so this is what actually makes
                    // the account usable. Keyed on the employee code, so fetch it if
                    // the create response didn't include it.
                    try {
                        if (!employeeCode) {
                            const { data: eb } = await http.get(GetEmployeeById, { params: { id: newId } });
                            employeeCode = eb?.data?.employeeCode ?? eb?.data?.code ?? '';
                        }
                        if (!employeeCode) throw new Error('employee code unavailable');
                        const { data: rtBody } = await http.put(UpdateEmployeeUserType, {
                            EmployeeCode: employeeCode,
                            UserTypeId: Number(form.userTypeId) || ROLE.EMPLOYEE,
                        });
                        if (rtBody?.error) throw new Error(rtBody.message || 'role was rejected');
                    } catch (rtErr) {
                        warning = `but their role wasn't assigned (${rtErr?.response || rtErr?.request ? apiErrorMessage(rtErr, 'unknown error') : rtErr.message}), so they can't sign in until it's set`;
                    }
                } catch (pwErr) {
                    warning = `but their password wasn't set (${pwErr?.response || pwErr?.request ? apiErrorMessage(pwErr, 'unknown error') : pwErr.message})`;
                }
            }

            // Upload the picked documents against the new employee id — one
            // PostEmployeeDocument call per file. A failed upload doesn't undo the
            // onboarding; it's just surfaced in the toast.
            if (newId != null) {
                const uploads = [];
                if (photo?.file) uploads.push({ slug: 'profile-photo', file: photo.file });
                Object.entries(docs).forEach(([slug, v]) => { if (v?.file) uploads.push({ slug, file: v.file }); });

                if (uploads.length) {
                    const results = await Promise.allSettled(uploads.map((u) => {
                        const fd = new FormData();
                        fd.append('employeeId', String(newId));
                        fd.append('documentType', u.slug);
                        fd.append('file', u.file);
                        return http.post(UploadEmployeeDoc, fd).then(({ data }) => { if (data?.error) throw new Error(data.message); });
                    }));
                    const failed = results.filter((r) => r.status === 'rejected').length;
                    if (failed > 0) {
                        const part = `${failed} document${failed > 1 ? 's' : ''} couldn't be uploaded`;
                        warning = warning ? `${warning}; ${part}` : `but ${part}`;
                    }
                }
            }

            // Only mirror into the store once the server has accepted the employee,
            // so a failed POST can't leave a phantom row in the directory.
            const { confirmPassword, ...rest } = form;
            dispatch(addEmployee({
                employeeId: empId,
                ...rest,
                // The email is what they sign in with now, not the employee code.
                loginId: form.personalEmail,
                email: form.personalEmail,
                phone: form.personalMobile,
                doj: form.dateOfJoining,
                photoName: photo?.name || '',
                documents: Object.fromEntries(Object.entries(docs).map(([k, v]) => [k, v.name])),
            }));
            const who = `${form.firstName} ${form.lastName}`;
            navigate('/dashboard/employees', {
                state: warning
                    ? { toast: `${who} was onboarded, ${warning}. Set it from their profile.`, severity: 'warning' }
                    : { toast: `${who} onboarded successfully 🎉`, severity: 'success' },
            });
        } catch (err) {
            setSnack({
                msg: err?.response || err?.request ? apiErrorMessage(err, 'Could not onboard this employee.') : err.message,
                sev: 'error',
            });
            setSaving(false);   // left set on success — the page is navigating away
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            {/* Sticky header */}
            <Box sx={{ position: 'sticky', top: 0, zIndex: 5, ...card, p: 2, mb: 1.5 }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <IconButton onClick={() => navigate('/dashboard/employees')} sx={{ bgcolor: '#F8FAFC', border: '1px solid #E6EAF1', borderRadius: '7px', '&:hover': { bgcolor: '#F1F5F9' } }}>
                            <ArrowBackRoundedIcon sx={{ fontSize: 20, color: '#334155' }} />
                        </IconButton>
                        <Box>
                            <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>Onboard Employee</Typography>
                            <Typography sx={{ fontSize: 12.5, color: '#6B7280', mt: 0.3 }}>Fill in the required sections, then add the employee.</Typography>
                        </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Box sx={{ mr: 0.5, width: 150, display: { xs: 'none', sm: 'block' } }}>
                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 0.4 }}>
                                <Typography sx={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>Required progress</Typography>
                                <Typography sx={{ fontSize: 12, fontWeight: 800, color: pct === 100 ? '#16A34A' : PRIMARY }}>{doneCount}/{totalMandatory}</Typography>
                            </Stack>
                            <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 5, bgcolor: '#EEF1F6', '& .MuiLinearProgress-bar': { borderRadius: 5, bgcolor: pct === 100 ? '#16A34A' : PRIMARY } }} />
                        </Box>
                        <Button disabled={saving} onClick={() => navigate('/dashboard/employees')} sx={{ color: '#64748B', textTransform: 'none', fontWeight: 600, borderRadius: '7px', height: 42, px: 2, border: '1px solid #E6EAF1' }}>Cancel</Button>
                        <Button disabled={saving} onClick={submit} startIcon={saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <PersonAddAlt1RoundedIcon />} sx={{ ...solidBtn, ...savingBtn, height: 42, px: 2.4 }}>{saving ? 'Adding…' : 'Add Employee'}</Button>
                    </Stack>
                </Stack>
            </Box>

            <Grid container spacing={1.5}>
                {/* Left nav */}
                <Grid size={{ xs: 12, md: 3 }}>
                    <Box sx={{ ...card, p: 1, position: { md: 'sticky' }, top: { md: 96 } }}>
                        {SECTIONS.map((s) => {
                            const Icon = s.icon;
                            const done = s.id === 'login'
                                ? (Boolean(String(form.personalEmail || '').trim()) && Boolean(String(form.password || '').trim()) && form.password === form.confirmPassword)
                                : s.id === 'personal'
                                    ? ['firstName', 'lastName', 'gender', 'dob', 'personalMobile'].every((k) => String(form[k] || '').trim())
                                    : s.id === 'employment'
                                        ? ['dateOfJoining', 'employmentType', 'department', 'designation', 'shift'].every((k) => String(form[k] || '').trim())
                                        : null;
                            return (
                                <Stack key={s.id} direction="row" spacing={1.2} onClick={() => scrollTo(s.id)}
                                    sx={{ alignItems: 'center', px: 1.4, py: 1.1, borderRadius: '8px', cursor: 'pointer', color: '#475569', '&:hover': { bgcolor: PRIMARY_LIGHT, color: PRIMARY } }}>
                                    <Icon sx={{ fontSize: 18 }} />
                                    <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{s.label}</Typography>
                                    {s.required && (done
                                        ? <CheckCircleRoundedIcon sx={{ fontSize: 16, color: '#16A34A' }} />
                                        : <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#E11D48' }} />)}
                                </Stack>
                            );
                        })}
                    </Box>
                </Grid>

                {/* Right form */}
                <Grid size={{ xs: 12, md: 9 }}>
                    <Stack spacing={1.5}>
                        {/* Login Credentials */}
                        <SectionCard section={SECTIONS[0]}>
                            <Box sx={{ p: 1.5, mb: 2.5, borderRadius: '8px', bgcolor: '#F1EEFE', border: '1px solid #E4DBFB', display: 'flex', alignItems: 'center', gap: 1.3 }}>
                                <VpnKeyRoundedIcon sx={{ fontSize: 18, color: PRIMARY, flexShrink: 0 }} />
                                <Typography sx={{ fontSize: 12, color: '#5B21B6', lineHeight: 1.5 }}>
                                    The <strong>email address entered here will be their login username</strong>. Set a password alongside it — the employee uses these two to sign in.
                                </Typography>
                            </Box>
                            <Grid container spacing={2}>
                                {/* The single source of truth for the address. Personal
                                    Information mirrors it, read-only, after Gender. */}
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Label req>Email (login username)</Label>
                                    <TextField fullWidth size="small" type="email" placeholder="name@email.com" value={form.personalEmail} onChange={set('personalEmail')}
                                        error={invalid('personalEmail')} sx={field} autoComplete="off"
                                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><MailOutlineRoundedIcon sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> } }} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Label req>User Type (role)</Label>
                                    <TextField select fullWidth size="small" value={form.userTypeId} onChange={set('userTypeId')} sx={field}
                                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><AdminPanelSettingsRoundedIcon sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> } }}
                                        helperText="Decides what they can access. Without a role, the account can't sign in.">
                                        {roles.length === 0
                                            ? <MenuItem value={ROLE.EMPLOYEE} sx={{ fontSize: 13.5 }}>Employee</MenuItem>
                                            : roles.map((r) => <MenuItem key={r.id} value={r.id} sx={{ fontSize: 13.5 }}>{r.name}</MenuItem>)}
                                    </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Label req>Password</Label>
                                    <TextField fullWidth size="small" type={showPwd ? 'text' : 'password'} placeholder="Set a password" value={form.password} onChange={set('password')} error={invalid('password')} sx={field}
                                        autoComplete="new-password"
                                        slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => setShowPwd((v) => !v)} sx={{ p: 0.3 }}>{showPwd ? <VisibilityOffRoundedIcon sx={{ fontSize: 17, color: '#94A3B8' }} /> : <VisibilityRoundedIcon sx={{ fontSize: 17, color: '#94A3B8' }} />}</IconButton></InputAdornment> } }} />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Label req>Confirm Password</Label>
                                    <TextField fullWidth size="small" type={showPwd2 ? 'text' : 'password'} placeholder="Re-enter password" value={form.confirmPassword} onChange={set('confirmPassword')}
                                        error={triedSubmit && String(form.confirmPassword || '') !== '' && form.password !== form.confirmPassword} sx={field}
                                        autoComplete="new-password"
                                        slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => setShowPwd2((v) => !v)} sx={{ p: 0.3 }}>{showPwd2 ? <VisibilityOffRoundedIcon sx={{ fontSize: 17, color: '#94A3B8' }} /> : <VisibilityRoundedIcon sx={{ fontSize: 17, color: '#94A3B8' }} />}</IconButton></InputAdornment> } }} />
                                    {triedSubmit && form.confirmPassword && form.password !== form.confirmPassword && (
                                        <Typography sx={{ fontSize: 10.5, color: '#DC2626', mt: 0.4 }}>Passwords do not match</Typography>
                                    )}
                                </Grid>
                            </Grid>
                        </SectionCard>

                        {/* Personal */}
                        <SectionCard section={SECTIONS[1]}>
                            {/* The Employee ID belongs with the person, not with the
                                credentials — signing in is done with the email now. */}
                            <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center', p: 1.5, mb: 2.5, borderRadius: '8px', bgcolor: '#F8FAFC', border: '1px solid #EEF1F6', flexWrap: 'wrap', gap: 1 }}>
                                <BadgeRoundedIcon sx={{ fontSize: 18, color: PRIMARY, flexShrink: 0 }} />
                                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>Employee ID</Typography>
                                <Chip label={empId} size="small" sx={{ height: 22, fontSize: 11.5, fontWeight: 800, bgcolor: PRIMARY_LIGHT, color: PRIMARY, border: `1px solid ${PRIMARY_BORDER}` }} />
                                <Typography sx={{ fontSize: 11.5, color: '#9CA3AF', fontStyle: 'italic' }}>auto-generated · assigned on save</Typography>
                            </Stack>

                            <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
                                <Box sx={{ position: 'relative' }}>
                                    <Avatar src={photo?.url} sx={{ width: 76, height: 76, bgcolor: PRIMARY_LIGHT, color: PRIMARY, border: `2px solid ${PRIMARY_BORDER}` }}>
                                        {!photo && <PersonRoundedIcon sx={{ fontSize: 34 }} />}
                                    </Avatar>
                                    <IconButton onClick={() => photoInput.current?.click()} size="small" sx={{ position: 'absolute', bottom: -4, right: -4, bgcolor: PRIMARY, color: '#fff', width: 28, height: 28, '&:hover': { bgcolor: '#6246E0' } }}>
                                        <PhotoCameraRoundedIcon sx={{ fontSize: 15 }} />
                                    </IconButton>
                                    <input ref={photoInput} type="file" accept="image/*" hidden onChange={pickPhoto} />
                                </Box>
                                <Box>
                                    <Label>Profile Photo</Label>
                                    <Typography sx={{ fontSize: 12, color: '#94A3B8', mb: 0.8 }}>{photo ? photo.name : 'PNG or JPG, up to 5 MB · optional'}</Typography>
                                    <Stack direction="row" spacing={1}>
                                        <Button onClick={() => photoInput.current?.click()} startIcon={<UploadFileRoundedIcon sx={{ fontSize: 16 }} />} size="small" sx={{ ...tonalBtn, height: 32 }}>{photo ? 'Change' : 'Upload'}</Button>
                                        {photo && <Button onClick={() => setPhoto(null)} size="small" sx={{ color: '#DC2626', textTransform: 'none', fontWeight: 600, height: 32 }}>Remove</Button>}
                                    </Stack>
                                </Box>
                            </Stack>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6 }}><Field label="First Name" req value={form.firstName} onChange={set('firstName')} error={invalid('firstName')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6 }}><Field label="Last Name" req value={form.lastName} onChange={set('lastName')} error={invalid('lastName')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Select label="Gender" req value={form.gender} onChange={set('gender')} options={GENDERS} error={invalid('gender')} /></Grid>
                                {/* Mirrors the address from Login Credentials, read-only —
                                    one field owns it so the two can't drift apart. */}
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                    <Label req>Email</Label>
                                    <TextField
                                        fullWidth size="small" disabled
                                        value={form.personalEmail}
                                        placeholder="Set in Login Credentials"
                                        sx={{ ...field, '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: form.personalEmail ? '#334155' : '#9CA3AF' } }}
                                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><MailOutlineRoundedIcon sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment> } }}
                                    />
                                    <Typography
                                        onClick={() => scrollTo('login')}
                                        sx={{ fontSize: 10.5, color: PRIMARY, mt: 0.4, cursor: 'pointer', fontWeight: 600, width: 'fit-content', '&:hover': { textDecoration: 'underline' } }}
                                    >
                                        Their login username · edit in Login Credentials
                                    </Typography>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Field label="Date of Birth" req type="date" value={form.dob} onChange={set('dob')} error={invalid('dob')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Select label="Marital Status" value={form.maritalStatus} onChange={set('maritalStatus')} options={MARITAL} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Select label="Blood Group" value={form.bloodGroup} onChange={set('bloodGroup')} options={BLOOD} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Field label="Nationality" value={form.nationality} onChange={set('nationality')} placeholder="Indian" /></Grid>
                                <Grid size={{ xs: 12, sm: 6 }}><Field label="Personal Mobile Number" req value={form.personalMobile} onChange={set('personalMobile')} error={invalid('personalMobile')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6 }}><Field label="Alternate Mobile Number" value={form.alternateMobile} onChange={set('alternateMobile')} /></Grid>
                            </Grid>
                        </SectionCard>

                        {/* Employment */}
                        <SectionCard section={SECTIONS[2]}>
                            <Label req>Employment Type</Label>
                            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                {EMP_TYPES.map((t) => {
                                    const on = form.employmentType === t;
                                    return (
                                        <Box key={t} onClick={() => setForm((f) => ({ ...f, employmentType: t }))}
                                            sx={{ px: 1.8, py: 0.9, borderRadius: '7px', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, userSelect: 'none',
                                                border: '1px solid', borderColor: on ? PRIMARY : (invalid('employmentType') ? '#FCA5A5' : '#E5E7EB'),
                                                bgcolor: on ? PRIMARY_LIGHT : '#F8FAFC', color: on ? PRIMARY : '#64748B', transition: 'all .15s',
                                                '&:hover': { borderColor: PRIMARY } }}>
                                            {t}
                                        </Box>
                                    );
                                })}
                            </Stack>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Field label="Date of Joining" req type="date" value={form.dateOfJoining} onChange={set('dateOfJoining')} error={invalid('dateOfJoining')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Select label="Department" req value={form.department} onChange={set('department')} options={DEPARTMENTS} error={invalid('department')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Select label="Designation" req value={form.designation} onChange={set('designation')} options={DESIGNATIONS} error={invalid('designation')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Select label="Shift" req value={form.shift} onChange={set('shift')} options={SHIFTS} error={invalid('shift')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Field label="Probation Period (months)" type="number" value={form.probationPeriod} onChange={set('probationPeriod')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Field label="Confirmation Date" type="date" value={form.confirmationDate} onChange={set('confirmationDate')} /></Grid>
                            </Grid>
                        </SectionCard>

                        {/* Contact */}
                        <SectionCard section={SECTIONS[3]}>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6 }}><Field label="Address Line 1" value={form.addressLine1} onChange={set('addressLine1')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6 }}><Field label="Address Line 2" value={form.addressLine2} onChange={set('addressLine2')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}><Field label="City" value={form.city} onChange={set('city')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}><Field label="State" value={form.state} onChange={set('state')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}><Field label="Country" value={form.country} onChange={set('country')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}><Field label="Postal Code" value={form.postalCode} onChange={set('postalCode')} /></Grid>
                            </Grid>
                        </SectionCard>

                        {/* Identity */}
                        <SectionCard section={SECTIONS[4]}>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}><Field label="Aadhaar Number" value={form.aadhaar} onChange={set('aadhaar')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}><Field label="PAN Number" value={form.pan} onChange={set('pan')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}><Field label="Passport Number" value={form.passport} onChange={set('passport')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}><Field label="Driving License" value={form.drivingLicense} onChange={set('drivingLicense')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}><Field label="Voter ID" value={form.voterId} onChange={set('voterId')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}><Field label="UAN Number" value={form.uan} onChange={set('uan')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}><Field label="ESI Number" value={form.esi} onChange={set('esi')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 3 }}><Field label="PF Number" value={form.pf} onChange={set('pf')} /></Grid>
                            </Grid>
                        </SectionCard>

                        {/* Education */}
                        <SectionCard section={SECTIONS[5]}>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Field label="Highest Qualification" value={form.highestQualification} onChange={set('highestQualification')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Field label="Institution" value={form.institution} onChange={set('institution')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Field label="University" value={form.university} onChange={set('university')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Field label="Year of Passing" value={form.yearOfPassing} onChange={set('yearOfPassing')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Field label="Percentage / CGPA" value={form.percentage} onChange={set('percentage')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Field label="Certifications" value={form.certifications} onChange={set('certifications')} /></Grid>
                            </Grid>
                        </SectionCard>

                        {/* Previous Employment */}
                        <SectionCard section={SECTIONS[6]}>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Field label="Company Name" value={form.prevCompany} onChange={set('prevCompany')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Field label="Designation" value={form.prevDesignation} onChange={set('prevDesignation')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Field label="Experience (years)" value={form.prevExperience} onChange={set('prevExperience')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Field label="Start Date" type="date" value={form.prevStartDate} onChange={set('prevStartDate')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Field label="End Date" type="date" value={form.prevEndDate} onChange={set('prevEndDate')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Field label="Last Drawn Salary" value={form.lastDrawnSalary} onChange={set('lastDrawnSalary')} /></Grid>
                                <Grid size={{ xs: 12 }}><Field label="Reason for Leaving" value={form.reasonForLeaving} onChange={set('reasonForLeaving')} /></Grid>
                            </Grid>
                        </SectionCard>

                        {/* Emergency */}
                        <SectionCard section={SECTIONS[7]}>
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Field label="Contact Name" value={form.emergencyName} onChange={set('emergencyName')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Field label="Relationship" value={form.emergencyRelationship} onChange={set('emergencyRelationship')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Field label="Mobile Number" value={form.emergencyMobile} onChange={set('emergencyMobile')} /></Grid>
                                <Grid size={{ xs: 12, sm: 6, md: 4 }}><Field label="Alternate Number" value={form.emergencyAlternate} onChange={set('emergencyAlternate')} /></Grid>
                                <Grid size={{ xs: 12, sm: 8 }}><Field label="Address" value={form.emergencyAddress} onChange={set('emergencyAddress')} /></Grid>
                            </Grid>
                        </SectionCard>

                        {/* Documents */}
                        <SectionCard section={SECTIONS[8]}>
                            <Typography sx={{ fontSize: 12.5, color: '#64748B', mb: 1.5 }}>Upload any supporting documents. You can download them back anytime.</Typography>
                            <Grid container spacing={1.5}>
                                {DOC_ITEMS.map((item) => {
                                    const doc = docs[item.slug];
                                    return (
                                        <Grid size={{ xs: 12, sm: 6 }} key={item.slug}>
                                            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, p: 1.3, borderRadius: '7px', border: '1px solid #EEF1F6', bgcolor: doc ? PRIMARY_LIGHT : '#F8FAFC' }}>
                                                <Box sx={{ minWidth: 0 }}>
                                                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }} noWrap>{item.label}</Typography>
                                                    <Typography sx={{ fontSize: 10.5, color: doc ? PRIMARY : '#9CA3AF' }} noWrap>{doc ? doc.name : 'No file chosen'}</Typography>
                                                </Box>
                                                <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                                                    {doc && (
                                                        <Tooltip arrow title="Preview">
                                                            <IconButton size="small" component="a" href={doc.url} download={doc.name} sx={{ bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', width: 30, height: 30 }}>
                                                                <DownloadRoundedIcon sx={{ fontSize: 15, color: PRIMARY }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                    {doc ? (
                                                        <Tooltip arrow title="Remove">
                                                            <IconButton size="small" onClick={() => setDocs((x) => { const n = { ...x }; delete n[item.slug]; return n; })} sx={{ bgcolor: '#fff', border: '1px solid #FECACA', borderRadius: '7px', width: 30, height: 30 }}>
                                                                <CloseRoundedIcon sx={{ fontSize: 15, color: '#DC2626' }} />
                                                            </IconButton>
                                                        </Tooltip>
                                                    ) : (
                                                        <Button component="label" size="small" startIcon={<UploadFileRoundedIcon sx={{ fontSize: 15 }} />} sx={{ ...tonalBtn, height: 30, fontSize: 11.5, px: 1.2 }}>
                                                            Choose
                                                            <input type="file" hidden onChange={pickDoc(item.slug)} />
                                                        </Button>
                                                    )}
                                                </Stack>
                                            </Stack>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                            <Typography sx={{ fontSize: 11.5, color: '#98A0AE', mt: 1.5 }}>Files are uploaded to the employee's record right after onboarding.</Typography>
                        </SectionCard>

                        {/* Bottom action bar */}
                        <Box sx={{ ...card, p: 2 }}>
                            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
                                <Typography sx={{ fontSize: 12.5, color: '#64748B' }}>
                                    Only the <strong style={{ color: '#E11D48' }}>required</strong> fields are needed. Fill the rest now or update later.
                                </Typography>
                                <Stack direction="row" spacing={1}>
                                    <Button disabled={saving} onClick={() => navigate('/dashboard/employees')} sx={{ color: '#64748B', textTransform: 'none', fontWeight: 600, borderRadius: '7px', height: 42, px: 2, border: '1px solid #E6EAF1' }}>Cancel</Button>
                                    <Button disabled={saving} onClick={submit} startIcon={saving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <PersonAddAlt1RoundedIcon />} sx={{ ...solidBtn, ...savingBtn, height: 42, px: 2.4 }}>{saving ? 'Adding…' : 'Add Employee'}</Button>
                                </Stack>
                            </Stack>
                        </Box>
                    </Stack>
                </Grid>
            </Grid>

            <Snackbar open={Boolean(snack.msg)} autoHideDuration={4000} onClose={() => setSnack({ msg: '', sev: 'warning' })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack({ msg: '', sev: 'warning' })} severity={snack.sev} variant="filled" sx={{ borderRadius: '7px' }}>{snack.msg}</Alert>
            </Snackbar>
        </Box>
    );
}
