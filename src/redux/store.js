import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import sidebarReducer from './slices/sidebarSlice';
import websiteSettingsReducer from './slices/websiteSettingsSlice';
import academicYearReducer from './slices/academicYearSlice';
import rolesReducer from './slices/rolesSlice';
import employeesReducer from './slices/employeesSlice';
import advancesReducer from './slices/advancesSlice';
import overtimeReducer from './slices/overtimeSlice';

// ── Lightweight redux persistence ───────────────────────────────────────────
// Whitelisted slices are hydrated from localStorage on boot and saved (throttled)
// on every change, so roles, sidebar prefs and settings survive a page reload.
// `auth` is intentionally excluded — it manages its own 'ara_auth' storage.
const PERSIST_KEY = 'ara_state_v1';
const PERSISTED_SLICES = ['roles', 'employees', 'advances', 'overtime', 'sidebar', 'websiteSettings', 'academicYear'];

const loadState = () => {
    try {
        const raw = localStorage.getItem(PERSIST_KEY);
        return raw ? JSON.parse(raw) : undefined;
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
            const slice = {};
            PERSISTED_SLICES.forEach((k) => { slice[k] = state[k]; });
            localStorage.setItem(PERSIST_KEY, JSON.stringify(slice));
        } catch {
            /* ignore quota / serialization errors */
        }
    }, 400);
});

export default store;
