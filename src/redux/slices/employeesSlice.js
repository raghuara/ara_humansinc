import { createSlice } from '@reduxjs/toolkit';

// Employees are shared between the list page and the onboarding page (and
// persisted via the store), so both stay in sync and survive a reload.
const seed = [
    { id: 1, employeeId: 'EMP-001', firstName: 'Karthik', lastName: 'R', email: 'karthik@arahumansync.com', phone: '98765 43210', department: 'Engineering', designation: 'Senior Engineer', doj: '2024-06-12', status: 'Active' },
    { id: 2, employeeId: 'EMP-002', firstName: 'Gopinath', lastName: 'S', email: 'gopinath@arahumansync.com', phone: '99887 66554', department: 'Sales', designation: 'Manager', doj: '2023-02-01', status: 'Active' },
    { id: 3, employeeId: 'EMP-003', firstName: 'Anitha', lastName: 'M', email: 'anitha@arahumansync.com', phone: '90000 12345', department: 'Design', designation: 'Team Lead', doj: '2025-01-20', status: 'Active' },
];

// Starting letters for auto-generated login / employee IDs. User configurable
// (max 5 letters) on the Employees page; numbers are then generated 1, 2, 3…
const DEFAULT_PREFIX = 'EMP';

// Keep only letters, uppercase, capped at 5 characters.
export const sanitizePrefix = (v = '') => String(v).replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 5);

const employeesSlice = createSlice({
    name: 'employees',
    initialState: { employees: seed, idPrefix: DEFAULT_PREFIX },
    reducers: {
        setIdPrefix(state, action) {
            // Allow empty while the user is editing; the fallback to DEFAULT_PREFIX
            // happens only when an ID is actually generated (see nextEmployeeCode).
            state.idPrefix = sanitizePrefix(action.payload);
        },
        addEmployee: {
            reducer(state, action) {
                state.employees.unshift(action.payload);
            },
            prepare(emp) {
                return { payload: { id: Date.now(), status: 'Active', ...emp } };
            },
        },
        updateEmployee(state, action) {
            const { id, changes } = action.payload;
            const emp = state.employees.find((e) => e.id === id);
            if (emp) Object.assign(emp, changes);
        },
        resignEmployee(state, action) {
            const { id, lwd, reason } = action.payload;
            const emp = state.employees.find((e) => e.id === id);
            if (emp) { emp.status = 'Resigned'; emp.lwd = lwd; emp.resignReason = reason; }
        },
        reactivateEmployee(state, action) {
            const emp = state.employees.find((e) => e.id === action.payload);
            if (emp) { emp.status = 'Active'; emp.lwd = ''; emp.resignReason = ''; }
        },
        removeEmployee(state, action) {
            state.employees = state.employees.filter((e) => e.id !== action.payload);
        },
    },
});

export const { addEmployee, updateEmployee, resignEmployee, reactivateEmployee, removeEmployee, setIdPrefix } = employeesSlice.actions;
export const selectEmployees = (s) => s.employees.employees;
export const selectIdPrefix = (s) => (s.employees.idPrefix ?? DEFAULT_PREFIX);

// Next auto-generated employee / login code for the chosen prefix, e.g. ARA-004.
// Numbering is per-prefix and starts at 1 — so the first employee for a brand
// new prefix is PREFIX-001, then PREFIX-002, and so on.
export const nextEmployeeCode = (employees = [], prefix = DEFAULT_PREFIX) => {
    const p = sanitizePrefix(prefix) || DEFAULT_PREFIX;
    const re = new RegExp(`^${p}-?(\\d+)$`, 'i');
    const nums = employees
        .map((e) => (String(e.employeeId || '').match(re) || [])[1])
        .filter(Boolean)
        .map((n) => parseInt(n, 10));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return `${p}-${String(next).padStart(3, '0')}`;
};

export default employeesSlice.reducer;
