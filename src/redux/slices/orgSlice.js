import { createSlice, nanoid } from '@reduxjs/toolkit';

// ── Organisation masters ────────────────────────────────────────────────────
// A tenant can run more than one company ("business entity") from a single
// login — e.g. a services arm and a manufacturing arm. Departments and
// designations always belong to exactly one entity, so switching the active
// entity re-scopes every master list, the employee dropdowns and the document
// module. `activeEntityId` is the single source of truth for that switch.

const seedEntities = [
    {
        id: 'ent-1',
        name: 'ARA HumanSync',
        code: 'ARA',
        legalName: 'ARA HumanSync Technologies Pvt Ltd',
        gstin: '33AABCA1234F1Z5',
        pan: 'AABCA1234F',
        cin: 'U72900TN2019PTC128456',
        email: 'accounts@arahumansync.com',
        phone: '044 4000 1234',
        address: 'No. 12, Anna Salai',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600002',
        color: '#7C5CFC',
        status: 'Active',
        createdOn: '2024-01-10',
    },
    {
        id: 'ent-2',
        name: 'ARA Infra',
        code: 'ARAINF',
        legalName: 'ARA Infra Projects Pvt Ltd',
        gstin: '33AABCA9876K1Z2',
        pan: 'AABCA9876K',
        cin: 'U45200TN2021PTC141122',
        email: 'accounts@arainfra.com',
        phone: '044 4000 5678',
        address: 'Plot 7, SIDCO Industrial Estate',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641021',
        color: '#0EA5E9',
        status: 'Active',
        createdOn: '2025-04-02',
    },
];

const seedDepartments = [
    { id: 'dep-1', entityId: 'ent-1', name: 'Engineering', code: 'ENG', head: 'Karthik R', description: 'Product engineering and platform', status: 'Active' },
    { id: 'dep-2', entityId: 'ent-1', name: 'Sales', code: 'SLS', head: 'Gopinath S', description: 'Field sales and inside sales', status: 'Active' },
    { id: 'dep-3', entityId: 'ent-1', name: 'Design', code: 'DSN', head: 'Anitha M', description: 'Product and brand design', status: 'Active' },
    { id: 'dep-4', entityId: 'ent-1', name: 'Human Resources', code: 'HR', head: 'Divya Prakash', description: 'People operations and payroll', status: 'Active' },
    { id: 'dep-5', entityId: 'ent-1', name: 'Finance', code: 'FIN', head: '', description: 'Accounts and compliance', status: 'Active' },
    { id: 'dep-6', entityId: 'ent-2', name: 'Site Operations', code: 'OPS', head: '', description: 'On-site project execution', status: 'Active' },
    { id: 'dep-7', entityId: 'ent-2', name: 'Procurement', code: 'PRC', head: '', description: 'Vendor and material sourcing', status: 'Active' },
];

const seedDesignations = [
    { id: 'dsg-1', entityId: 'ent-1', departmentId: 'dep-1', name: 'Software Engineer', code: 'SE', level: 'L2', description: '', status: 'Active' },
    { id: 'dsg-2', entityId: 'ent-1', departmentId: 'dep-1', name: 'Senior Engineer', code: 'SSE', level: 'L3', description: '', status: 'Active' },
    { id: 'dsg-3', entityId: 'ent-1', departmentId: 'dep-1', name: 'Team Lead', code: 'TL', level: 'L4', description: '', status: 'Active' },
    { id: 'dsg-4', entityId: 'ent-1', departmentId: 'dep-2', name: 'Manager', code: 'MGR', level: 'L4', description: '', status: 'Active' },
    { id: 'dsg-5', entityId: 'ent-1', departmentId: 'dep-2', name: 'Executive', code: 'EXE', level: 'L1', description: '', status: 'Active' },
    { id: 'dsg-6', entityId: 'ent-1', departmentId: 'dep-3', name: 'Product Designer', code: 'PD', level: 'L2', description: '', status: 'Active' },
    { id: 'dsg-7', entityId: 'ent-1', departmentId: 'dep-4', name: 'HR Associate', code: 'HRA', level: 'L2', description: '', status: 'Active' },
    { id: 'dsg-8', entityId: 'ent-1', departmentId: null, name: 'Director', code: 'DIR', level: 'L6', description: 'Reports to the board', status: 'Active' },
    { id: 'dsg-9', entityId: 'ent-2', departmentId: 'dep-6', name: 'Site Supervisor', code: 'SS', level: 'L3', description: '', status: 'Active' },
];

// Entity codes drive employee-ID prefixes and document folders, so keep them
// short, upper-case and letter/number only.
export const sanitizeCode = (v = '') => String(v).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);

// Sentinel active-entity value: "work across every entity". The value the
// backend expects for that case is this same string, so it can be sent as-is.
export const ALL_ENTITY_ID = 'all';

const orgSlice = createSlice({
    name: 'org',
    initialState: {
        entities: seedEntities,
        departments: seedDepartments,
        designations: seedDesignations,
        activeEntityId: 'ent-1',
    },
    reducers: {
        setActiveEntity(state, action) {
            if (action.payload === ALL_ENTITY_ID || state.entities.some((e) => e.id === action.payload)) {
                state.activeEntityId = action.payload;
            }
        },

        // Replace the whole entity list with what the API returned (the sidebar's
        // "Working in" switcher reads from here). Keeps the current selection if it
        // still exists; otherwise falls back to the first entity so nothing is
        // pointing at a stale seed id.
        setEntities(state, action) {
            const list = Array.isArray(action.payload) ? action.payload : [];
            state.entities = list;
            if (state.activeEntityId !== ALL_ENTITY_ID && !list.some((e) => e.id === state.activeEntityId)) {
                state.activeEntityId = list[0]?.id ?? null;
            }
        },

        // ── Business entities ────────────────────────────────────────────────
        addEntity: {
            reducer(state, action) {
                state.entities.push(action.payload);
                // First entity ever created becomes the active one.
                if (!state.activeEntityId) state.activeEntityId = action.payload.id;
            },
            prepare(data) {
                return {
                    payload: {
                        id: `ent-${nanoid(6)}`,
                        status: 'Active',
                        color: '#7C5CFC',
                        createdOn: new Date().toISOString().slice(0, 10),
                        ...data,
                        code: sanitizeCode(data.code),
                    },
                };
            },
        },
        updateEntity(state, action) {
            const { id, changes } = action.payload;
            const ent = state.entities.find((e) => e.id === id);
            if (ent) Object.assign(ent, changes, changes.code ? { code: sanitizeCode(changes.code) } : {});
        },
        // Removing an entity takes its departments and designations with it —
        // otherwise they'd be orphaned and show up under no entity at all.
        deleteEntity(state, action) {
            const id = action.payload;
            state.entities = state.entities.filter((e) => e.id !== id);
            state.departments = state.departments.filter((d) => d.entityId !== id);
            state.designations = state.designations.filter((d) => d.entityId !== id);
            if (state.activeEntityId === id) state.activeEntityId = state.entities[0]?.id || null;
        },

        // ── Departments ──────────────────────────────────────────────────────
        addDepartment: {
            reducer(state, action) { state.departments.push(action.payload); },
            prepare(data) {
                return { payload: { id: `dep-${nanoid(6)}`, status: 'Active', head: '', description: '', ...data, code: sanitizeCode(data.code) } };
            },
        },
        updateDepartment(state, action) {
            const { id, changes } = action.payload;
            const dep = state.departments.find((d) => d.id === id);
            if (dep) Object.assign(dep, changes, changes.code ? { code: sanitizeCode(changes.code) } : {});
        },
        // Designations hanging off a deleted department fall back to entity-wide
        // (departmentId: null) rather than disappearing with it.
        deleteDepartment(state, action) {
            const id = action.payload;
            state.departments = state.departments.filter((d) => d.id !== id);
            state.designations.forEach((d) => { if (d.departmentId === id) d.departmentId = null; });
        },

        // ── Designations ─────────────────────────────────────────────────────
        addDesignation: {
            reducer(state, action) { state.designations.push(action.payload); },
            prepare(data) {
                return { payload: { id: `dsg-${nanoid(6)}`, status: 'Active', departmentId: null, level: '', description: '', ...data, code: sanitizeCode(data.code) } };
            },
        },
        updateDesignation(state, action) {
            const { id, changes } = action.payload;
            const dsg = state.designations.find((d) => d.id === id);
            if (dsg) Object.assign(dsg, changes, changes.code ? { code: sanitizeCode(changes.code) } : {});
        },
        deleteDesignation(state, action) {
            state.designations = state.designations.filter((d) => d.id !== action.payload);
        },
    },
});

export const {
    setActiveEntity, setEntities,
    addEntity, updateEntity, deleteEntity,
    addDepartment, updateDepartment, deleteDepartment,
    addDesignation, updateDesignation, deleteDesignation,
} = orgSlice.actions;

// ── Selectors ───────────────────────────────────────────────────────────────
export const selectEntities = (s) => s.org.entities;
export const selectActiveEntityId = (s) => s.org.activeEntityId;
export const selectActiveEntity = (s) => s.org.entities.find((e) => e.id === s.org.activeEntityId) || null;

export const selectAllDepartments = (s) => s.org.departments;
export const selectAllDesignations = (s) => s.org.designations;

export const selectIsAllEntities = (s) => s.org.activeEntityId === ALL_ENTITY_ID;

// Scoped to the entity currently being worked on — what every screen wants.
// With "All Entities" active, nothing is filtered out.
export const selectDepartments = (s) =>
    (s.org.activeEntityId === ALL_ENTITY_ID ? s.org.departments : s.org.departments.filter((d) => d.entityId === s.org.activeEntityId));
export const selectDesignations = (s) =>
    (s.org.activeEntityId === ALL_ENTITY_ID ? s.org.designations : s.org.designations.filter((d) => d.entityId === s.org.activeEntityId));

// Plain name lists for the employee form dropdowns (active records only).
export const selectDepartmentNames = (s) =>
    selectDepartments(s).filter((d) => d.status === 'Active').map((d) => d.name);
export const selectDesignationNames = (s) =>
    selectDesignations(s).filter((d) => d.status === 'Active').map((d) => d.name);

export default orgSlice.reducer;
