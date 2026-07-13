import React, { useState, useMemo } from 'react';
import {
    Box, Typography, Grid, Button, Avatar, Chip, Stack, IconButton, Tooltip,
    TextField, MenuItem, Dialog, DialogContent, DialogActions, Divider, Snackbar, Alert, InputAdornment,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import WorkRoundedIcon from '@mui/icons-material/WorkRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import ContactEmergencyRoundedIcon from '@mui/icons-material/ContactEmergencyRounded';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectEmployees, updateEmployee, resignEmployee, reactivateEmployee, removeEmployee } from '../redux/slices/employeesSlice';
import { selectDepartmentNames, selectDesignationNames } from '../redux/slices/orgSlice';
import { selectDocsForEmployee, selectRequests } from '../redux/slices/documentsSlice';
import { openFile, downloadFile, fmtSize, fileKind } from '../utils/fileStore';

const PRIMARY = '#7C5CFC';
const PRIMARY_LIGHT = '#F1EEFE';
const PRIMARY_BORDER = '#C9BEFB';
const card = { bgcolor: '#fff', border: '1px solid #E6EAF1', borderRadius: '7px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' };
const tonalBtn = { bgcolor: PRIMARY_LIGHT, color: PRIMARY, border: `1px solid ${PRIMARY_BORDER}`, fontWeight: 700, borderRadius: '7px', boxShadow: 'none', textTransform: 'none', '&:hover': { bgcolor: '#E7DFFC' } };
const solidBtn = { bgcolor: PRIMARY, color: '#fff', fontWeight: 700, borderRadius: '7px', boxShadow: `0 2px 6px ${PRIMARY}40`, textTransform: 'none', '&:hover': { bgcolor: '#6246E0' } };
const field = { '& .MuiOutlinedInput-root': { borderRadius: '7px', fontSize: 14, bgcolor: '#F8FAFC', '& fieldset': { borderColor: '#E5E7EB' }, '&.Mui-focused fieldset': { borderColor: PRIMARY, borderWidth: 1.5 } } };

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const MARITAL = ['Single', 'Married', 'Divorced', 'Widowed'];
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const SHIFTS = ['General (9 – 6)', 'Morning', 'Evening', 'Night', 'Flexible'];
const EMP_TYPES = ['Permanent', 'Probation', 'Contract', 'Internship', 'Part-Time'];

const PALETTE = ['#7C5CFC', '#0EA5E9', '#F59E0B', '#16A34A', '#E11D48', '#6246E0', '#0891B2'];
const initials = (s = '') => s.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const colorFor = (s = '') => PALETTE[(s.charCodeAt(0) || 0) % PALETTE.length];
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

// Section + field map (mirrors the onboarding form)
const SECTIONS = [
    {
        id: 'personal', title: 'Personal Information', icon: PersonRoundedIcon, fields: [
            { k: 'firstName', label: 'First Name' },
            { k: 'lastName', label: 'Last Name' },
            { k: 'gender', label: 'Gender', type: 'select', options: GENDERS },
            { k: 'dob', label: 'Date of Birth', type: 'date' },
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
            // Options come from the Organisation masters at render time.
            { k: 'department', label: 'Department', type: 'select', options: [] },
            { k: 'designation', label: 'Designation', type: 'select', options: [] },
            { k: 'shift', label: 'Shift', type: 'select', options: SHIFTS },
            { k: 'probationPeriod', label: 'Probation Period (months)' },
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
            { k: 'aadhaar', label: 'Aadhaar Number' }, { k: 'pan', label: 'PAN Number' },
            { k: 'passport', label: 'Passport Number' }, { k: 'drivingLicense', label: 'Driving License' },
            { k: 'voterId', label: 'Voter ID' }, { k: 'uan', label: 'UAN Number' },
            { k: 'esi', label: 'ESI Number' }, { k: 'pf', label: 'PF Number' },
        ],
    },
    {
        id: 'education', title: 'Education', icon: SchoolRoundedIcon, fields: [
            { k: 'highestQualification', label: 'Highest Qualification' }, { k: 'institution', label: 'Institution' },
            { k: 'university', label: 'University' }, { k: 'yearOfPassing', label: 'Year of Passing' },
            { k: 'percentage', label: 'Percentage / CGPA' }, { k: 'certifications', label: 'Certifications' },
        ],
    },
    {
        id: 'previous', title: 'Previous Employment', icon: HistoryRoundedIcon, fields: [
            { k: 'prevCompany', label: 'Company Name' }, { k: 'prevDesignation', label: 'Designation' },
            { k: 'prevExperience', label: 'Experience (years)' }, { k: 'prevStartDate', label: 'Start Date', type: 'date' },
            { k: 'prevEndDate', label: 'End Date', type: 'date' }, { k: 'lastDrawnSalary', label: 'Last Drawn Salary' },
            { k: 'reasonForLeaving', label: 'Reason for Leaving' },
        ],
    },
    {
        id: 'emergency', title: 'Emergency Contact', icon: ContactEmergencyRoundedIcon, fields: [
            { k: 'emergencyName', label: 'Contact Name' }, { k: 'emergencyRelationship', label: 'Relationship' },
            { k: 'emergencyMobile', label: 'Mobile Number' }, { k: 'emergencyAlternate', label: 'Alternate Number' },
            { k: 'emergencyAddress', label: 'Address' },
        ],
    },
];

const ALL_KEYS = SECTIONS.flatMap((s) => s.fields.map((f) => f.k));

// Resolve a field value with fallbacks to the canonical table keys.
const resolve = (emp, k) => {
    if (k === 'personalEmail') return emp.personalEmail || emp.email || '';
    if (k === 'personalMobile') return emp.personalMobile || emp.phone || '';
    if (k === 'dateOfJoining') return emp.dateOfJoining || emp.doj || '';
    return emp[k] || '';
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

export default function EmployeeDetailPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const dispatch = useDispatch();
    const emp = useSelector((s) => s.employees.employees.find((e) => String(e.id) === String(id)));

    // Masters feed the employment dropdowns; documents feed the folder below.
    const departmentNames = useSelector(selectDepartmentNames);
    const designationNames = useSelector(selectDesignationNames);
    const approvedDocs = useSelector(selectDocsForEmployee(emp?.employeeId || ''));
    const requests = useSelector(selectRequests);

    const [mode, setMode] = useState('view');
    const [form, setForm] = useState(null);
    const [resignOpen, setResignOpen] = useState(false);
    const [resignForm, setResignForm] = useState({ lwd: '', reason: '' });
    const [removeOpen, setRemoveOpen] = useState(false);
    const [showPwd, setShowPwd] = useState(false);
    const [snack, setSnack] = useState('');

    const resigned = emp && (emp.status || 'Active') === 'Resigned';
    const avColor = useMemo(() => colorFor(emp?.firstName || ''), [emp]);

    if (!emp) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>Employee not found.</Typography>
                <Button onClick={() => navigate('/dashboard/employees')} startIcon={<ArrowBackRoundedIcon />} sx={{ ...tonalBtn, mt: 2, height: 40, px: 2 }}>Back to Employees</Button>
            </Box>
        );
    }

    const startEdit = () => {
        const init = {};
        ALL_KEYS.forEach((k) => { init[k] = resolve(emp, k); });
        init.employeeId = emp.employeeId || '';
        init.password = '';
        setShowPwd(false);
        setForm(init);
        setMode('edit');
    };
    const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const saveEdit = () => {
        if (!String(form.firstName).trim() || !String(form.personalEmail).trim()) { setSnack('First name and personal email are required.'); return; }
        const changes = { ...form };
        // keep the canonical keys the list table reads in sync
        changes.email = form.personalEmail;
        changes.phone = form.personalMobile;
        changes.doj = form.dateOfJoining;
        // password: only overwrite when a new one was entered
        if (!String(form.password || '').trim()) delete changes.password;
        dispatch(updateEmployee({ id: emp.id, changes }));
        setMode('view');
        setSnack('Employee details updated ✅');
    };

    const confirmResign = () => {
        dispatch(resignEmployee({ id: emp.id, lwd: resignForm.lwd, reason: resignForm.reason }));
        setResignOpen(false);
        setSnack(`${emp.firstName} ${emp.lastName} marked as resigned`);
    };

    const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();

    // Files attached during onboarding — kept for records created before the
    // document module existed.
    const legacyDocs = emp.documents && typeof emp.documents === 'object' ? Object.entries(emp.documents) : [];

    // Anything management has asked this person for that hasn't been approved yet.
    const outstanding = requests.flatMap((r) => {
        const t = r.targets.find((x) => x.employeeId === emp.employeeId);
        return t && t.status !== 'approved' ? [{ title: r.title, dueDate: r.dueDate, status: t.status, reason: t.reason }] : [];
    });

    const OUTSTANDING_TONE = {
        pending: { label: 'Awaiting upload', color: '#B45309', bg: '#FFF7ED' },
        submitted: { label: 'Submitted — under review', color: '#0369A1', bg: '#E0F2FE' },
        rejected: { label: 'Rejected — re-upload asked', color: '#E11D48', bg: '#FEE2E2' },
    };

    const openDoc = (key) => { if (!openFile(key)) setSnack('That file was uploaded in an earlier session, so there is nothing to preview here.'); };

    return (
        <Box sx={{ p: 2 }}>
            {/* Sticky header */}
            <Box sx={{ position: 'sticky', top: 0, zIndex: 5, ...card, p: 2, mb: 1.5 }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
                    <Stack direction="row" spacing={1.6} sx={{ alignItems: 'center' }}>
                        <IconButton onClick={() => navigate('/dashboard/employees')} sx={{ bgcolor: '#F8FAFC', border: '1px solid #E6EAF1', borderRadius: '7px', '&:hover': { bgcolor: '#F1F5F9' } }}>
                            <ArrowBackRoundedIcon sx={{ fontSize: 20, color: '#334155' }} />
                        </IconButton>
                        <Avatar sx={{ width: 52, height: 52, bgcolor: avColor, fontSize: 18, fontWeight: 700, filter: resigned ? 'grayscale(0.4)' : 'none' }}>{initials(fullName)}</Avatar>
                        <Box>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>{fullName || '—'}</Typography>
                                <Chip label={resigned ? 'Resigned' : 'Active'} size="small" sx={{ height: 21, fontSize: 10.5, fontWeight: 700, bgcolor: resigned ? '#FEE2E2' : '#DCFCE7', color: resigned ? '#DC2626' : '#16A34A' }} />
                            </Stack>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.3, flexWrap: 'wrap' }}>
                                <Chip label={emp.employeeId} size="small" sx={{ height: 20, fontSize: 11, fontWeight: 800, bgcolor: PRIMARY_LIGHT, color: PRIMARY, border: `1px solid ${PRIMARY_BORDER}` }} />
                                <Typography sx={{ fontSize: 12.5, color: '#6B7280' }}>{emp.designation || 'Staff'}{emp.department ? ` · ${emp.department}` : ''}</Typography>
                                {resigned && emp.lwd && <Typography sx={{ fontSize: 11.5, color: '#DC2626', fontWeight: 600 }}>· LWD {fmtDate(emp.lwd)}</Typography>}
                            </Stack>
                        </Box>
                    </Stack>

                    {/* Actions */}
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                        {mode === 'view' ? (
                            <>
                                <Button onClick={startEdit} startIcon={<EditRoundedIcon sx={{ fontSize: 17 }} />} sx={{ ...tonalBtn, height: 40, px: 2 }}>Edit</Button>
                                {resigned ? (
                                    <Button onClick={() => { dispatch(reactivateEmployee(emp.id)); setSnack(`${emp.firstName} reactivated`); }} startIcon={<ReplayRoundedIcon sx={{ fontSize: 17 }} />} sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, color: '#16A34A', bgcolor: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '7px', height: 40, px: 2, '&:hover': { bgcolor: '#BBF7D0' } }}>Reactivate</Button>
                                ) : (
                                    <Button onClick={() => { setResignForm({ lwd: '', reason: '' }); setResignOpen(true); }} startIcon={<LogoutRoundedIcon sx={{ fontSize: 17 }} />} sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, color: '#C2410C', bgcolor: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '7px', height: 40, px: 2, '&:hover': { bgcolor: '#FFEDD5' } }}>Mark Resigned</Button>
                                )}
                                <Button onClick={() => setRemoveOpen(true)} startIcon={<DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />} sx={{ textTransform: 'none', fontSize: 12.5, fontWeight: 700, color: '#DC2626', bgcolor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '7px', height: 40, px: 2, '&:hover': { bgcolor: '#FEE2E2' } }}>Remove</Button>
                            </>
                        ) : (
                            <>
                                <Button onClick={() => setMode('view')} sx={{ color: '#64748B', textTransform: 'none', fontWeight: 600, borderRadius: '7px', height: 40, px: 2, border: '1px solid #E6EAF1' }}>Cancel</Button>
                                <Button onClick={saveEdit} startIcon={<SaveRoundedIcon sx={{ fontSize: 18 }} />} sx={{ ...solidBtn, height: 40, px: 2.4 }}>Save Changes</Button>
                            </>
                        )}
                    </Stack>
                </Stack>
            </Box>

            {/* Sections */}
            <Stack spacing={1.5}>
                {/* Login Credentials */}
                <SectionCard icon={LockRoundedIcon} title="Login Credentials">
                    <Grid container spacing={mode === 'edit' ? 2 : 2.5}>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <Label>Login ID</Label>
                            {mode === 'edit'
                                ? <TextField fullWidth size="small" value={emp.employeeId} disabled sx={{ ...field, '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#5B21B6', fontWeight: 700 } }} />
                                : <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#5B21B6' }}>{emp.employeeId}</Typography>}
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                            <Label>Password</Label>
                            {mode === 'edit'
                                ? <TextField fullWidth size="small" type={showPwd ? 'text' : 'password'} placeholder="Leave blank to keep current" value={form.password || ''} onChange={setF('password')} sx={field}
                                    slotProps={{ input: { endAdornment: <InputAdornment position="end"><IconButton size="small" onClick={() => setShowPwd((v) => !v)} sx={{ p: 0.3 }}>{showPwd ? <VisibilityOffRoundedIcon sx={{ fontSize: 17, color: '#94A3B8' }} /> : <VisibilityRoundedIcon sx={{ fontSize: 17, color: '#94A3B8' }} />}</IconButton></InputAdornment> } }} />
                                : (emp.password
                                    ? <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#0F172A', letterSpacing: 2 }}>••••••••</Typography>
                                    : <Typography sx={{ fontSize: 13, color: '#C4C9D4', fontStyle: 'italic' }}>Not set</Typography>)}
                        </Grid>
                    </Grid>
                </SectionCard>

                {SECTIONS.map((sec) => (
                    <SectionCard key={sec.id} icon={sec.icon} title={sec.title}>
                        <Grid container spacing={mode === 'edit' ? 2 : 2.5}>
                            {sec.fields.map((f) => {
                                const raw = mode === 'edit' ? form[f.k] : resolve(emp, f.k);
                                // Department / designation are driven by the Organisation
                                // masters. The value already saved is kept in the list even
                                // if that master was since renamed or removed, so editing
                                // another field can't silently blank it.
                                let options = f.options;
                                if (f.k === 'department') options = departmentNames;
                                if (f.k === 'designation') options = designationNames;
                                if ((f.k === 'department' || f.k === 'designation') && raw && !options.includes(raw)) {
                                    options = [...options, raw];
                                }
                                return (
                                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={f.k}>
                                        <Label>{f.label}</Label>
                                        {mode === 'edit' ? (
                                            f.type === 'select' ? (
                                                <TextField select fullWidth size="small" value={raw || ''} onChange={setF(f.k)} sx={field}>
                                                    <MenuItem value=""><em>—</em></MenuItem>
                                                    {options.map((o) => <MenuItem key={o} value={o} sx={{ fontSize: 13.5 }}>{o}</MenuItem>)}
                                                </TextField>
                                            ) : (
                                                <TextField fullWidth size="small" type={f.type === 'date' ? 'date' : 'text'} value={raw || ''} onChange={setF(f.k)} sx={field} slotProps={f.type === 'date' ? { inputLabel: { shrink: true } } : undefined} />
                                            )
                                        ) : (
                                            raw
                                                ? <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{f.type === 'date' ? fmtDate(raw) : raw}</Typography>
                                                : <Typography sx={{ fontSize: 13, color: '#C4C9D4', fontStyle: 'italic' }}>Not provided</Typography>
                                        )}
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </SectionCard>
                ))}

                {/* Documents — approved files only. A submission reaches this card
                    once management approves it in Documents → Approvals. */}
                <SectionCard icon={FolderRoundedIcon} title="Documents">
                    {/* Still owed to management */}
                    {outstanding.length > 0 && (
                        <Box sx={{ mb: 2.2, p: 1.6, borderRadius: '9px', bgcolor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                            <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', mb: 1 }}>
                                <PendingActionsRoundedIcon sx={{ fontSize: 17, color: '#B45309' }} />
                                <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                                    Requested — not yet in the record ({outstanding.length})
                                </Typography>
                            </Stack>
                            <Stack spacing={0.8}>
                                {outstanding.map((o) => {
                                    const tone = OUTSTANDING_TONE[o.status] || OUTSTANDING_TONE.pending;
                                    return (
                                        <Stack key={o.title} direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#78350F' }}>{o.title}</Typography>
                                            <Chip label={tone.label} size="small" sx={{ height: 19, fontSize: 10, fontWeight: 700, bgcolor: tone.bg, color: tone.color }} />
                                            {o.dueDate && <Typography sx={{ fontSize: 11.5, color: '#B45309' }}>due {fmtDate(o.dueDate)}</Typography>}
                                            {o.status === 'rejected' && o.reason && <Typography sx={{ fontSize: 11.5, color: '#E11D48', fontStyle: 'italic' }}>“{o.reason}”</Typography>}
                                        </Stack>
                                    );
                                })}
                            </Stack>
                        </Box>
                    )}

                    {/* Approved and filed */}
                    {approvedDocs.length > 0 ? (
                        <Grid container spacing={1.5}>
                            {approvedDocs.map((d) => {
                                const kind = fileKind(d.fileName);
                                return (
                                    <Grid size={{ xs: 12, sm: 6 }} key={d.id}>
                                        <Stack direction="row" spacing={1.3} sx={{ alignItems: 'center', p: 1.4, borderRadius: '9px', border: '1px solid #EEF1F6', bgcolor: '#F8FAFC', '&:hover': { borderColor: PRIMARY_BORDER, bgcolor: PRIMARY_LIGHT } }}>
                                            <Box sx={{ width: 38, height: 38, borderRadius: '8px', bgcolor: kind.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Typography sx={{ fontSize: 10, fontWeight: 800, color: kind.color }}>{kind.label}</Typography>
                                            </Box>
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
                                                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }} noWrap>{d.name}</Typography>
                                                    <Tooltip arrow title={`Approved by ${d.approvedBy} on ${fmtDate(d.approvedOn)}`}>
                                                        <VerifiedRoundedIcon sx={{ fontSize: 15, color: '#16A34A' }} />
                                                    </Tooltip>
                                                </Stack>
                                                <Typography sx={{ fontSize: 10.5, color: '#98A0AE' }} noWrap>{d.fileName} · {fmtSize(d.fileSize)}</Typography>
                                            </Box>
                                            <Tooltip arrow title="View"><IconButton size="small" onClick={() => openDoc(d.fileKey)} sx={{ color: '#94A3B8', '&:hover': { color: PRIMARY } }}><VisibilityRoundedIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                                            <Tooltip arrow title="Download"><IconButton size="small" onClick={() => { if (!downloadFile(d.fileKey, d.fileName)) setSnack('That file was uploaded in an earlier session, so there is nothing to download here.'); }} sx={{ color: '#94A3B8', '&:hover': { color: PRIMARY } }}><DownloadRoundedIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                                        </Stack>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    ) : (
                        <Typography sx={{ fontSize: 13, color: '#C4C9D4', fontStyle: 'italic' }}>
                            No approved documents yet. Request one from Documents → Requests; it lands here once you approve it.
                        </Typography>
                    )}

                    {/* Onboarding attachments (pre-dating the document module) */}
                    {legacyDocs.length > 0 && (
                        <Box sx={{ mt: 2.2, pt: 1.8, borderTop: '1px dashed #E6EAF1' }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4, mb: 1.2 }}>Attached during onboarding</Typography>
                            <Grid container spacing={1.5}>
                                {legacyDocs.map(([name, file]) => (
                                    <Grid size={{ xs: 12, sm: 6 }} key={name}>
                                        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', p: 1.3, borderRadius: '7px', border: '1px solid #EEF1F6', bgcolor: '#F8FAFC' }}>
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }} noWrap>{name}</Typography>
                                                <Typography sx={{ fontSize: 10.5, color: PRIMARY }} noWrap>{String(file)}</Typography>
                                            </Box>
                                            <DownloadRoundedIcon sx={{ fontSize: 18, color: '#94A3B8' }} />
                                        </Stack>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    )}
                </SectionCard>
            </Stack>

            {/* Resign dialog */}
            <Dialog open={resignOpen} onClose={() => setResignOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogContent sx={{ pt: 3, pb: 1.5 }}>
                    <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center', mb: 2 }}>
                        <Box sx={{ width: 44, height: 44, borderRadius: '10px', bgcolor: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LogoutRoundedIcon sx={{ color: '#C2410C', fontSize: 24 }} /></Box>
                        <Box><Typography sx={{ fontSize: 16.5, fontWeight: 800, color: '#0F172A' }}>Mark as Resigned</Typography><Typography sx={{ fontSize: 12.5, color: '#98A0AE' }}>{fullName}</Typography></Box>
                    </Stack>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#334155', mb: 0.6 }}>Last working day</Typography>
                    <TextField fullWidth size="small" type="date" value={resignForm.lwd} onChange={(e) => setResignForm((f) => ({ ...f, lwd: e.target.value }))} sx={{ ...field, mb: 2 }} InputLabelProps={{ shrink: true }} />
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#334155', mb: 0.6 }}>Reason (optional)</Typography>
                    <TextField fullWidth size="small" multiline minRows={2} placeholder="e.g. New opportunity" value={resignForm.reason} onChange={(e) => setResignForm((f) => ({ ...f, reason: e.target.value }))} sx={field} />
                </DialogContent>
                <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
                    <Button fullWidth onClick={() => setResignOpen(false)} sx={{ textTransform: 'none', fontSize: 13, fontWeight: 600, borderRadius: '7px', height: 40, border: '1px solid #E5E7EB', color: '#374151' }}>Cancel</Button>
                    <Button fullWidth variant="contained" startIcon={<LogoutRoundedIcon sx={{ fontSize: 17 }} />} onClick={confirmResign} sx={{ textTransform: 'none', fontSize: 13, fontWeight: 700, borderRadius: '7px', height: 40, bgcolor: '#C2410C', color: '#fff', boxShadow: 'none', '&:hover': { bgcolor: '#9A3412' } }}>Confirm</Button>
                </DialogActions>
            </Dialog>

            {/* Remove confirm */}
            <Dialog open={removeOpen} onClose={() => setRemoveOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
                <DialogContent sx={{ pt: 3.5, pb: 2, textAlign: 'center' }}>
                    <Box sx={{ width: 60, height: 60, borderRadius: '50%', bgcolor: '#FEF2F2', border: '4px solid #FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.8 }}>
                        <WarningAmberRoundedIcon sx={{ fontSize: 30, color: '#DC2626' }} />
                    </Box>
                    <Typography sx={{ fontSize: 17, fontWeight: 800, color: '#111827', mb: 0.8 }}>Remove employee?</Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#6B7280', px: 1.5, lineHeight: 1.5 }}>
                        <strong style={{ color: '#111827' }}>{fullName}</strong> ({emp.employeeId}) will be permanently removed. This cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
                    <Button fullWidth onClick={() => setRemoveOpen(false)} sx={{ textTransform: 'none', fontSize: 13, fontWeight: 600, borderRadius: '7px', height: 40, border: '1px solid #E5E7EB', color: '#374151' }}>Cancel</Button>
                    <Button fullWidth variant="contained" startIcon={<DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} />} onClick={() => { dispatch(removeEmployee(emp.id)); navigate('/dashboard/employees', { state: { toast: `${fullName} removed` } }); }} sx={{ textTransform: 'none', fontSize: 13, fontWeight: 700, borderRadius: '7px', height: 40, bgcolor: '#DC2626', color: '#fff', boxShadow: 'none', '&:hover': { bgcolor: '#B91C1C' } }}>Remove</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={Boolean(snack)} autoHideDuration={3000} onClose={() => setSnack('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert onClose={() => setSnack('')} severity={/required/.test(snack) ? 'warning' : 'success'} variant="filled" sx={{ borderRadius: '7px' }}>{snack}</Alert>
            </Snackbar>
        </Box>
    );
}
