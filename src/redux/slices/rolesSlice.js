import { createSlice } from '@reduxjs/toolkit';
import { accessAll, accessFromKeys } from '../../data/accessModules';

// ── Seed user roles (login types) ───────────────────────────────────────────
// Two default system roles: a full-access "Administrator" and a self-service "Employee".
const seedRoles = [
    {
        id: 'administrator',
        name: 'Administrator',
        description: 'Full access to every module, setting and report across the organisation.',
        color: '#7C5CFC',
        system: true,
        access: accessAll(),
        users: [
            { id: 'u1', name: 'Karthik R', email: 'karthik@arahumansync.com', status: 'Active' },
            { id: 'u2', name: 'Divya Prakash', email: 'divya@arahumansync.com', status: 'Active' },
        ],
    },
    {
        id: 'employee',
        name: 'Employee',
        description: 'Self-service access to personal dashboard, payslips and leave.',
        color: '#F59E0B',
        system: true,
        access: accessFromKeys(['dashboard']),
        users: [
            { id: 'u6', name: 'Sneha Iyer', email: 'sneha@arahumansync.com', status: 'Active' },
            { id: 'u7', name: 'Vikram Nair', email: 'vikram@arahumansync.com', status: 'Active' },
            { id: 'u8', name: 'Priya Raj', email: 'priya@arahumansync.com', status: 'Active' },
        ],
    },
];

const slugify = (s) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const rolesSlice = createSlice({
    name: 'roles',
    initialState: { roles: seedRoles },
    reducers: {
        addRole: {
            reducer(state, action) {
                state.roles.push(action.payload);
            },
            prepare({ name, description, color, baseKeys }) {
                const id = slugify(name) || `role-${Date.now()}`;
                return {
                    payload: {
                        id,
                        name: name.trim(),
                        description: (description || '').trim() || 'Custom access role.',
                        color: color || '#7C5CFC',
                        system: false,
                        access: baseKeys ? accessFromKeys(baseKeys) : accessFromKeys(['dashboard']),
                        users: [],
                    },
                };
            },
        },
        deleteRole(state, action) {
            state.roles = state.roles.filter((r) => r.id !== action.payload);
        },
        // Rename a role (and optionally its description). The id stays stable so
        // existing URLs and user assignments keep working.
        renameRole(state, action) {
            const { roleId, name, description } = action.payload;
            const role = state.roles.find((r) => r.id === roleId);
            if (!role || role.system) return;
            if (typeof name === 'string' && name.trim()) role.name = name.trim();
            if (typeof description === 'string') role.description = description.trim();
        },
        toggleAccess(state, action) {
            const { roleId, key } = action.payload;
            const role = state.roles.find((r) => r.id === roleId);
            if (role) role.access[key] = !role.access[key];
        },
        setRoleAccess(state, action) {
            const { roleId, value } = action.payload; // value: boolean → set all
            const role = state.roles.find((r) => r.id === roleId);
            if (role) Object.keys(role.access).forEach((k) => { role.access[k] = value; });
        },
        addUser(state, action) {
            const { roleId, user } = action.payload;
            const role = state.roles.find((r) => r.id === roleId);
            if (role) role.users.unshift({ id: `u-${Date.now()}`, status: 'Active', ...user });
        },
        removeUser(state, action) {
            const { roleId, userId } = action.payload;
            const role = state.roles.find((r) => r.id === roleId);
            if (role) role.users = role.users.filter((u) => u.id !== userId);
        },
    },
});

export const { addRole, deleteRole, renameRole, toggleAccess, setRoleAccess, addUser, removeUser } = rolesSlice.actions;

export const selectRoles = (s) => s.roles.roles;
export const selectRoleById = (id) => (s) => s.roles.roles.find((r) => r.id === id);

export default rolesSlice.reducer;
