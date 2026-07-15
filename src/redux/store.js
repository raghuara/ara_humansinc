import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import sidebarReducer from './slices/sidebarSlice';
import websiteSettingsReducer from './slices/websiteSettingsSlice';
import rolesReducer from './slices/rolesSlice';
import employeesReducer from './slices/employeesSlice';
import advancesReducer from './slices/advancesSlice';
import overtimeReducer from './slices/overtimeSlice';
import orgReducer from './slices/orgSlice';
import documentsReducer from './slices/documentsSlice';
import inboxReducer from './slices/inboxSlice';
import recruitmentReducer from './slices/recruitmentSlice';
import financialYearReducer from './slices/financialYearSlice';
import { ALL_MODULE_KEYS } from '../data/accessModules';

// ── Lightweight redux persistence ───────────────────────────────────────────
// Whitelisted slices are hydrated from localStorage on boot and saved (throttled)
// on every change, so roles, sidebar prefs and settings survive a page reload.
// `auth` is intentionally excluded — it manages its own 'ara_auth' storage.
const PERSIST_KEY = 'ara_state_v1';
const PERSISTED_SLICES = ['roles', 'employees', 'advances', 'overtime', 'org', 'documents', 'inbox', 'recruitment', 'sidebar', 'websiteSettings', 'financialYear'];

// ── Versioned state with migrations ──────────────────────────────────────────
// Persisted state carries a `__v` stamp. When a slice's shape changes in a
// future release, add a migration at MIGRATIONS[oldVersion] to reshape old data
// on load instead of letting stale fields silently override the new defaults.
// Bumping STATE_VERSION without a matching migration entry simply no-ops.
const STATE_VERSION = 5;

// A role persisted before a module existed has no entry for its key, and a
// missing key reads as "denied". Every time modules are added we backfill:
// system admins get the new ones, everyone else stays opted out until granted.
const backfillAccess = (state) => {
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
};

const MIGRATIONS = [
    // index 0 → v0 (pre-versioning) to v1: baseline, keep data as-is.
    (state) => state,

    // index 1 → v1 to v2: Organisation, Documents and Inbox modules added.
    backfillAccess,

    // index 2 → v2 to v3: Recruitment module added. Anyone already sitting at v2
    // skipped the backfill above, so it has to run again for the new key.
    backfillAccess,

    // index 3 → v3 to v4: module keys were aligned with the API catalogue
    // (salary-credited → run-payroll, compliance → statutory-deductions, and so
    // on). Persisted maps still hold the old keys; backfill adds the new ones.
    // The stale keys are left in place — harmless, and nothing reads them.
    backfillAccess,

    // index 4 → v4 to v5: Onboard Employee and Settings added, and Recruitment /
    // Documents split into one module per tab.
    backfillAccess,
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
        roles: rolesReducer,
        employees: employeesReducer,
        advances: advancesReducer,
        overtime: overtimeReducer,
        org: orgReducer,
        documents: documentsReducer,
        inbox: inboxReducer,
        recruitment: recruitmentReducer,
        financialYear: financialYearReducer,
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
