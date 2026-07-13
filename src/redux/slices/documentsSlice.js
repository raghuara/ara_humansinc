import { createSlice, nanoid } from '@reduxjs/toolkit';

// ── Document management ─────────────────────────────────────────────────────
// Three things live here, and they are deliberately separate:
//
//  1. docTypes     — the catalogue. Management names a document once
//                    ("Birth Certificate") and reuses it for every request.
//  2. requests     — one request = one docType asked of N employees. Each
//                    employee is a `target` carrying its own status, so a
//                    single request can be part-submitted / part-approved.
//  3. orgDocs      — common organisation files (policies, certificates) that
//                    are not tied to any employee. Visibility is by role.
//
// Approved employee submissions are copied into `employeeDocs`, which is what
// the Employee module reads — so an employee's folder only ever shows files
// that management has actually signed off on.
//
// Files themselves are never put in Redux (they aren't serialisable and would
// blow the localStorage quota). We keep the metadata here and hold the real
// File object in `utils/fileStore` for the life of the session.

const today = () => new Date().toISOString().slice(0, 10);

const seedDocTypes = [
    { id: 'dt-1', name: 'Birth Certificate', category: 'Identity', description: 'Government-issued proof of date of birth', formats: 'PDF, JPG, PNG', createdOn: '2026-01-08' },
    { id: 'dt-2', name: 'Aadhaar Card', category: 'Identity', description: 'Both sides in a single file', formats: 'PDF, JPG', createdOn: '2026-01-08' },
    { id: 'dt-3', name: 'PAN Card', category: 'Identity', description: '', formats: 'PDF, JPG', createdOn: '2026-01-08' },
    { id: 'dt-4', name: 'Degree Certificate', category: 'Education', description: 'Final consolidated degree certificate', formats: 'PDF', createdOn: '2026-02-14' },
    { id: 'dt-5', name: 'Relieving Letter', category: 'Employment', description: 'From the previous employer', formats: 'PDF', createdOn: '2026-02-14' },
    { id: 'dt-6', name: 'Cancelled Cheque', category: 'Bank', description: 'For salary account verification', formats: 'PDF, JPG', createdOn: '2026-03-01' },
];

// A live request: 3 of 4 employees have responded, 1 is still pending.
const seedRequests = [
    {
        id: 'dr-1',
        entityId: 'ent-1',
        docTypeId: 'dt-1',
        title: 'Birth Certificate',
        note: 'Required for the statutory personnel file audit. Please upload a clear scan.',
        dueDate: '2026-07-25',
        mandatory: true,
        requestedBy: 'Divya Prakash',
        requestedOn: '2026-07-09',
        status: 'open',
        targets: [
            { employeeId: 'EMP-001', employeeName: 'Karthik R', department: 'Engineering', status: 'approved', submittedOn: '2026-07-10', fileName: 'karthik-birth-certificate.pdf', fileSize: 428_112, fileKey: 'seed-1', remark: '', reviewedBy: 'Divya Prakash', reviewedOn: '2026-07-11', reason: '' },
            { employeeId: 'EMP-002', employeeName: 'Gopinath S', department: 'Sales', status: 'submitted', submittedOn: '2026-07-12', fileName: 'gopi_bc_scan.jpg', fileSize: 1_204_880, fileKey: 'seed-2', remark: 'Scanned from the original copy.', reviewedBy: '', reviewedOn: '', reason: '' },
            { employeeId: 'EMP-003', employeeName: 'Anitha M', department: 'Design', status: 'submitted', submittedOn: '2026-07-12', fileName: 'anitha-bc.pdf', fileSize: 612_400, fileKey: 'seed-3', remark: '', reviewedBy: '', reviewedOn: '', reason: '' },
            { employeeId: 'EMP-004', employeeName: 'Rahul Verma', department: 'Human Resources', status: 'pending', submittedOn: '', fileName: '', fileSize: 0, fileKey: '', remark: '', reviewedBy: '', reviewedOn: '', reason: '' },
        ],
    },
    {
        id: 'dr-2',
        entityId: 'ent-1',
        docTypeId: 'dt-6',
        title: 'Cancelled Cheque',
        note: 'Needed to verify the salary account before this month’s payroll run.',
        dueDate: '2026-07-18',
        mandatory: true,
        requestedBy: 'Divya Prakash',
        requestedOn: '2026-07-11',
        status: 'open',
        targets: [
            { employeeId: 'EMP-002', employeeName: 'Gopinath S', department: 'Sales', status: 'pending', submittedOn: '', fileName: '', fileSize: 0, fileKey: '', remark: '', reviewedBy: '', reviewedOn: '', reason: '' },
        ],
    },
];

const seedOrgDocs = [
    { id: 'od-1', entityId: 'ent-1', name: 'Employee Handbook 2026', category: 'Policy', description: 'Code of conduct, leave rules and workplace guidelines.', fileName: 'employee-handbook-2026.pdf', fileSize: 2_845_000, fileKey: 'seed-od-1', uploadedBy: 'Divya Prakash', uploadedOn: '2026-01-15', visibleTo: ['administrator', 'employee'] },
    { id: 'od-2', entityId: 'ent-1', name: 'GST Registration Certificate', category: 'Statutory', description: 'Entity GST certificate — finance and audit use.', fileName: 'gst-certificate-ara.pdf', fileSize: 512_000, fileKey: 'seed-od-2', uploadedBy: 'Divya Prakash', uploadedOn: '2026-02-02', visibleTo: ['administrator'] },
    { id: 'od-3', entityId: 'ent-2', name: 'Site Safety Guidelines', category: 'Policy', description: 'Mandatory safety briefing for all site staff.', fileName: 'site-safety-v3.pdf', fileSize: 1_120_000, fileKey: 'seed-od-3', uploadedBy: 'Divya Prakash', uploadedOn: '2026-05-20', visibleTo: ['administrator', 'employee'] },
];

// Already-approved files sitting in employees' folders.
const seedEmployeeDocs = [
    { id: 'ed-1', employeeId: 'EMP-001', employeeName: 'Karthik R', name: 'Birth Certificate', docTypeId: 'dt-1', category: 'Identity', fileName: 'karthik-birth-certificate.pdf', fileSize: 428_112, fileKey: 'seed-1', source: 'request', requestId: 'dr-1', approvedBy: 'Divya Prakash', approvedOn: '2026-07-11' },
];

const findTarget = (state, requestId, employeeId) => {
    const req = state.requests.find((r) => r.id === requestId);
    return { req, target: req?.targets.find((t) => t.employeeId === employeeId) };
};

// A request is done once no target is still waiting on the employee or a review.
const refreshRequestStatus = (req) => {
    const open = req.targets.some((t) => t.status === 'pending' || t.status === 'submitted');
    req.status = open ? 'open' : 'completed';
};

const documentsSlice = createSlice({
    name: 'documents',
    initialState: {
        docTypes: seedDocTypes,
        requests: seedRequests,
        orgDocs: seedOrgDocs,
        employeeDocs: seedEmployeeDocs,
    },
    reducers: {
        // ── Catalogue ────────────────────────────────────────────────────────
        addDocType: {
            reducer(state, action) { state.docTypes.unshift(action.payload); },
            prepare(data) {
                return { payload: { id: `dt-${nanoid(6)}`, category: 'General', description: '', formats: 'PDF, JPG, PNG', createdOn: today(), ...data } };
            },
        },
        deleteDocType(state, action) {
            state.docTypes = state.docTypes.filter((t) => t.id !== action.payload);
        },

        // ── Requests ─────────────────────────────────────────────────────────
        // `employees` is the list of people to ask; each becomes a target that
        // tracks its own submission and review independently.
        createRequest: {
            reducer(state, action) { state.requests.unshift(action.payload); },
            prepare({ entityId, docTypeId, title, note, dueDate, mandatory, requestedBy, employees }) {
                return {
                    payload: {
                        id: `dr-${nanoid(6)}`,
                        entityId,
                        docTypeId,
                        title,
                        note: note || '',
                        dueDate: dueDate || '',
                        mandatory: mandatory !== false,
                        requestedBy: requestedBy || 'Management',
                        requestedOn: today(),
                        status: 'open',
                        targets: (employees || []).map((e) => ({
                            employeeId: e.employeeId,
                            employeeName: e.employeeName,
                            department: e.department || '',
                            status: 'pending',
                            submittedOn: '', fileName: '', fileSize: 0, fileKey: '',
                            remark: '', reviewedBy: '', reviewedOn: '', reason: '',
                        })),
                    },
                };
            },
        },
        cancelRequest(state, action) {
            state.requests = state.requests.filter((r) => r.id !== action.payload);
        },
        // Add more people to an existing request instead of raising a second one.
        addRequestTargets(state, action) {
            const { requestId, employees } = action.payload;
            const req = state.requests.find((r) => r.id === requestId);
            if (!req) return;
            employees.forEach((e) => {
                if (req.targets.some((t) => t.employeeId === e.employeeId)) return;
                req.targets.push({
                    employeeId: e.employeeId, employeeName: e.employeeName, department: e.department || '',
                    status: 'pending', submittedOn: '', fileName: '', fileSize: 0, fileKey: '',
                    remark: '', reviewedBy: '', reviewedOn: '', reason: '',
                });
            });
            refreshRequestStatus(req);
        },

        // The employee's side — in production this arrives from the mobile app;
        // the "Simulate submission" action on the requests tab calls the same
        // reducer so the approval flow can be exercised end to end.
        submitDocument(state, action) {
            const { requestId, employeeId, fileName, fileSize, fileKey, remark } = action.payload;
            const { req, target } = findTarget(state, requestId, employeeId);
            if (!req || !target) return;
            target.status = 'submitted';
            target.submittedOn = today();
            target.fileName = fileName;
            target.fileSize = fileSize || 0;
            target.fileKey = fileKey || '';
            target.remark = remark || '';
            target.reason = '';
            refreshRequestStatus(req);
        },

        // ── Review ───────────────────────────────────────────────────────────
        // Approving copies the file into the employee's folder — that copy is
        // what the Employee module renders, so nothing unreviewed leaks there.
        approveSubmission(state, action) {
            const { requestId, employeeId, reviewedBy } = action.payload;
            const { req, target } = findTarget(state, requestId, employeeId);
            if (!req || !target || target.status !== 'submitted') return;
            target.status = 'approved';
            target.reviewedBy = reviewedBy || 'Management';
            target.reviewedOn = today();
            target.reason = '';
            refreshRequestStatus(req);

            const docType = state.docTypes.find((t) => t.id === req.docTypeId);
            state.employeeDocs.unshift({
                id: `ed-${nanoid(6)}`,
                employeeId: target.employeeId,
                employeeName: target.employeeName,
                name: req.title,
                docTypeId: req.docTypeId,
                category: docType?.category || 'General',
                fileName: target.fileName,
                fileSize: target.fileSize,
                fileKey: target.fileKey,
                source: 'request',
                requestId: req.id,
                approvedBy: target.reviewedBy,
                approvedOn: target.reviewedOn,
            });
        },
        // Rejecting sends the target back to `pending` so the employee can
        // re-upload; the reason is what they see in their app.
        rejectSubmission(state, action) {
            const { requestId, employeeId, reason, reviewedBy } = action.payload;
            const { req, target } = findTarget(state, requestId, employeeId);
            if (!req || !target || target.status !== 'submitted') return;
            target.status = 'rejected';
            target.reason = reason || 'Not legible — please re-upload.';
            target.reviewedBy = reviewedBy || 'Management';
            target.reviewedOn = today();
            refreshRequestStatus(req);
        },
        // Clear a rejection so the employee is asked again.
        resetTarget(state, action) {
            const { requestId, employeeId } = action.payload;
            const { req, target } = findTarget(state, requestId, employeeId);
            if (!req || !target) return;
            Object.assign(target, {
                status: 'pending', submittedOn: '', fileName: '', fileSize: 0, fileKey: '',
                remark: '', reviewedBy: '', reviewedOn: '', reason: '',
            });
            refreshRequestStatus(req);
        },

        // ── Organisation documents ───────────────────────────────────────────
        addOrgDoc: {
            reducer(state, action) { state.orgDocs.unshift(action.payload); },
            prepare(data) {
                return {
                    payload: {
                        id: `od-${nanoid(6)}`,
                        category: 'General',
                        description: '',
                        uploadedOn: today(),
                        uploadedBy: 'Management',
                        visibleTo: ['administrator'],
                        ...data,
                    },
                };
            },
        },
        updateOrgDoc(state, action) {
            const { id, changes } = action.payload;
            const doc = state.orgDocs.find((d) => d.id === id);
            if (doc) Object.assign(doc, changes);
        },
        deleteOrgDoc(state, action) {
            state.orgDocs = state.orgDocs.filter((d) => d.id !== action.payload);
        },

        // ── Employee folder ──────────────────────────────────────────────────
        addEmployeeDoc: {
            reducer(state, action) { state.employeeDocs.unshift(action.payload); },
            prepare(data) {
                return {
                    payload: {
                        id: `ed-${nanoid(6)}`,
                        category: 'General',
                        source: 'upload',
                        requestId: '',
                        approvedBy: 'Management',
                        approvedOn: today(),
                        ...data,
                    },
                };
            },
        },
        deleteEmployeeDoc(state, action) {
            state.employeeDocs = state.employeeDocs.filter((d) => d.id !== action.payload);
        },
    },
});

export const {
    addDocType, deleteDocType,
    createRequest, cancelRequest, addRequestTargets, submitDocument,
    approveSubmission, rejectSubmission, resetTarget,
    addOrgDoc, updateOrgDoc, deleteOrgDoc,
    addEmployeeDoc, deleteEmployeeDoc,
} = documentsSlice.actions;

// ── Selectors ───────────────────────────────────────────────────────────────
export const selectDocTypes = (s) => s.documents.docTypes;
export const selectAllRequests = (s) => s.documents.requests;
export const selectEmployeeDocs = (s) => s.documents.employeeDocs;

// Everything below is scoped to the entity currently being worked on.
export const selectRequests = (s) => s.documents.requests.filter((r) => r.entityId === s.org.activeEntityId);
export const selectOrgDocs = (s) => s.documents.orgDocs.filter((d) => d.entityId === s.org.activeEntityId);

// Flatten every awaiting-review submission into rows the approvals tab renders.
export const selectPendingApprovals = (s) =>
    selectRequests(s).flatMap((r) =>
        r.targets
            .filter((t) => t.status === 'submitted')
            .map((t) => ({ ...t, requestId: r.id, requestTitle: r.title, docTypeId: r.docTypeId, requestedBy: r.requestedBy, requestedOn: r.requestedOn, dueDate: r.dueDate })),
    );

// An employee's approved folder — what the Employee module shows.
export const selectDocsForEmployee = (employeeId) => (s) =>
    s.documents.employeeDocs.filter((d) => d.employeeId === employeeId);

// Org documents this role is allowed to see.
export const selectOrgDocsForRole = (roleId) => (s) =>
    selectOrgDocs(s).filter((d) => (d.visibleTo || []).includes(roleId));

// Counts for the request progress bars.
export const requestProgress = (req) => {
    const total = req.targets.length;
    const approved = req.targets.filter((t) => t.status === 'approved').length;
    const submitted = req.targets.filter((t) => t.status === 'submitted').length;
    const rejected = req.targets.filter((t) => t.status === 'rejected').length;
    const pending = req.targets.filter((t) => t.status === 'pending').length;
    return { total, approved, submitted, rejected, pending, pct: total ? Math.round((approved / total) * 100) : 0 };
};

export default documentsSlice.reducer;
