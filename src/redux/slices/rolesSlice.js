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
        // Replace the local list with what GetUserTypes returned. The server is
        // the source of truth for a role's identity (name, description, colour,
        // system flag) and its counts.
        //
        // Access maps and user lists are NOT in that payload — it only gives
        // `accessCount` and `usersCount` — so we carry over whatever we already
        // hold for a role we've seen before, and start a new role at dashboard-
        // only. That keeps /roles/:id/users and /roles/:id/access resolvable
        // instead of 404-ing the moment the list came from the API.
        syncRolesFromApi(state, action) {
            const incoming = action.payload || [];
            state.roles = incoming.map((r) => {
                const id = String(r.id);
                const existing = state.roles.find((x) => String(x.id) === id);
                return {
                    id,
                    name: r.name,
                    description: r.description || 'Custom access role.',
                    color: r.accentColour || '#7C5CFC',
                    system: Boolean(r.isSystem),
                    // Counts the server owns — kept alongside the local map so a
                    // card can show the real number without guessing from it.
                    accessCount: r.accessCount ?? 0,
                    usersCount: r.usersCount ?? 0,
                    access: existing?.access || accessFromKeys(['dashboard']),
                    users: existing?.users || [],
                };
            });
        },

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

        // Overwrite a role's access map with what the server just accepted.
        // The access screen edits a local draft and only dispatches this once
        // UpdateRoleAccess has come back OK, so the store never shows a grant
        // the backend rejected. `accessCount` is kept in step for the cards on
        // /roles, which read it rather than recounting the map.
        replaceRoleAccess(state, action) {
            const { roleId, access } = action.payload;
            const role = state.roles.find((r) => r.id === roleId);
            if (!role) return;
            role.access = { ...role.access, ...access };
            role.accessCount = Object.values(access).filter(Boolean).length;
        },
        // Set every module to `value`. `keys` is the live module list from
        // GetModules — pass it so Enable All also covers modules the API knows
        // about but this role's map has never held a key for. Falls back to the
        // keys already in the map when omitted.
        setRoleAccess(state, action) {
            const { roleId, value, keys } = action.payload; // value: boolean → set all
            const role = state.roles.find((r) => r.id === roleId);
            if (!role) return;
            const target = keys?.length ? keys : Object.keys(role.access);
            target.forEach((k) => { role.access[k] = value; });
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

export const { syncRolesFromApi, addRole, deleteRole, renameRole, toggleAccess, setRoleAccess, replaceRoleAccess, addUser, removeUser } = rolesSlice.actions;

export const selectRoles = (s) => s.roles.roles;
export const selectRoleById = (id) => (s) => s.roles.roles.find((r) => r.id === id);

export default rolesSlice.reducer;
