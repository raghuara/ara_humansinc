import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import sidebarReducer from './slices/sidebarSlice';
import websiteSettingsReducer from './slices/websiteSettingsSlice';
import academicYearReducer from './slices/academicYearSlice';
import rolesReducer from './slices/rolesSlice';
import employeesReducer from './slices/employeesSlice';
import advancesReducer from './slices/advancesSlice';
import overtimeReducer from './slices/overtimeSlice';
import orgReducer from './slices/orgSlice';
import documentsReducer from './slices/documentsSlice';
import inboxReducer from './slices/inboxSlice';
import { ALL_MODULE_KEYS } from '../data/accessModules';

// ── Lightweight redux persistence ───────────────────────────────────────────
// Whitelisted slices are hydrated from localStorage on boot and saved (throttled)
// on every change, so roles, sidebar prefs and settings survive a page reload.
// `auth` is intentionally excluded — it manages its own 'ara_auth' storage.
const PERSIST_KEY = 'ara_state_v1';
const PERSISTED_SLICES = ['roles', 'employees', 'advances', 'overtime', 'org', 'documents', 'inbox', 'sidebar', 'websiteSettings', 'academicYear'];

// ── Versioned state with migrations ──────────────────────────────────────────
// Persisted state carries a `__v` stamp. When a slice's shape changes in a
// future release, add a migration at MIGRATIONS[oldVersion] to reshape old data
// on load instead of letting stale fields silently override the new defaults.
// Bumping STATE_VERSION without a matching migration entry simply no-ops.
const STATE_VERSION = 2;
const MIGRATIONS = [
    // index 0 → migrate v0 (pre-versioning) to v1: baseline, keep data as-is.
    (state) => state,

    // index 1 → v1 to v2: the Organisation, Documents and Inbox modules were
    // added. A role persisted before they existed has no entry for their keys,
    // which reads as "denied" — so backfill every role's access map: system
    // admins get the new modules, everyone else stays opted out until granted.
    (state) => {
        if (!state.roles?.roles) return state;
        return {
            ...state,
            roles: {
                ...state.roles,
                roles: state.roles.roles.map((role) => {
                    const access = { ...role.access };
                    ALL_MODULE_KEYS.forEach((k) => {
                        if (access[k] === undefined) access[k] = role.id === 'administrator';
                    });
                    return { ...role, access };
                }),
            },
        };
    },
];

const loadState = () => {
    try {
        const raw = localStorage.getItem(PERSIST_KEY);
        if (!raw) return undefined;
        const parsed = JSON.parse(raw);
        // Split the version stamp from the slice data. Pre-versioning blobs have
        // no `__v`, so they start at 0 and run through every migration.
        const { __v = 0, ...data } = parsed;
        let migrated = data;
        for (let v = __v; v < STATE_VERSION; v += 1) {
            const step = MIGRATIONS[v];
            if (step) migrated = step(migrated) || migrated;
        }
        return migrated;
    } catch {
        return undefined;
    }
};

export const store = configureStore({
    reducer: {
        auth: authReducer,
        sidebar: sidebarReducer,
        websiteSettings: websiteSettingsReducer,
        academicYear: academicYearReducer,
        roles: rolesReducer,
        employees: employeesReducer,
        advances: advancesReducer,
        overtime: overtimeReducer,
        org: orgReducer,
        documents: documentsReducer,
        inbox: inboxReducer,
    },
    preloadedState: loadState(),
});

let saveTimer = null;
store.subscribe(() => {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        saveTimer = null;
        try {
            const state = store.getState();
            const slice = { __v: STATE_VERSION };
            PERSISTED_SLICES.forEach((k) => { slice[k] = state[k]; });
            localStorage.setItem(PERSIST_KEY, JSON.stringify(slice));
        } catch {
            /* ignore quota / serialization errors */
        }
    }, 400);
});

export default store;
