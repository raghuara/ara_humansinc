import { createSlice } from '@reduxjs/toolkit';

// ── Auth ────────────────────────────────────────────────────────────────────
// Holds everything PostLogin hands back: the JWT, its refresh token, both
// expiry stamps, the user record, and the module list the server says this
// login may see.
//
// Two storage backends, chosen by "Remember Me":
//   localStorage   → survives a browser restart (remembered)
//   sessionStorage → dies with the tab (not remembered)
// We read from both on boot so a session started either way is picked up, and
// always clear both on logout so a stale token can't linger in the other one.

const KEY = 'ara_auth';

const EMPTY = {
    token: null,
    refreshToken: null,
    expiresOn: null,
    refreshTokenExpiresOn: null,
    isAuthenticated: false,
    user: null,          // { id, name, loginId, userTypeId, role, accentColour }
    modules: [],         // module keys the API says this login can reach
    remember: true,

    // Mirrors of the user record under the names the existing screens already
    // read (`auth.userName`, `auth.email`, `auth.role`). Populated on login so
    // the sidebar, dashboard and document screens need no changes.
    userName: '',
    email: '',
    role: '',
    organisation: '',
};

// An already-expired JWT is worse than no token: every call 401s and the user
// stares at a broken app instead of a login screen. So a stored session that
// has passed its expiry is treated as no session at all.
const isExpired = (expiresOn) => {
    if (!expiresOn) return false;           // no stamp → let the server decide
    const t = new Date(expiresOn).getTime();
    return Number.isFinite(t) && t <= Date.now();
};

const readStored = () => {
    try {
        const raw = localStorage.getItem(KEY) || sessionStorage.getItem(KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (isExpired(parsed.expiresOn)) {
            localStorage.removeItem(KEY);
            sessionStorage.removeItem(KEY);
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
};

const persist = (state) => {
    try {
        // Whichever backend isn't in use must be cleared, or toggling
        // "Remember Me" would leave a copy of the session behind in the other.
        const target = state.remember ? localStorage : sessionStorage;
        const other = state.remember ? sessionStorage : localStorage;
        other.removeItem(KEY);
        target.setItem(KEY, JSON.stringify(state));
    } catch { /* quota / private mode — the session still works in memory */ }
};

const clearStored = () => {
    try {
        localStorage.removeItem(KEY);
        sessionStorage.removeItem(KEY);
    } catch { /* ignore */ }
};

const initialState = readStored() || EMPTY;

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        // Takes the `data` object from PostLogin verbatim, plus a `remember` flag.
        loginSuccess: (state, action) => {
            const { token, expiresOn, refreshToken, refreshTokenExpiresOn, user, modules, remember } = action.payload;
            const next = {
                token,
                refreshToken: refreshToken || null,
                expiresOn: expiresOn || null,
                refreshTokenExpiresOn: refreshTokenExpiresOn || null,
                isAuthenticated: true,
                user: user || null,
                modules: Array.isArray(modules) ? modules : [],
                remember: remember !== false,

                userName: user?.name || user?.loginId || '',
                email: user?.loginId || '',
                role: user?.role || '',
                organisation: 'ARA HumanSync',
            };
            persist(next);
            return next;
        },

        // Swap in a freshly minted token without disturbing the user or modules.
        tokenRefreshed: (state, action) => {
            const { token, expiresOn, refreshToken, refreshTokenExpiresOn } = action.payload;
            state.token = token;
            if (expiresOn) state.expiresOn = expiresOn;
            if (refreshToken) state.refreshToken = refreshToken;
            if (refreshTokenExpiresOn) state.refreshTokenExpiresOn = refreshTokenExpiresOn;
            persist(state);
        },

        logout: () => {
            clearStored();
            return { ...EMPTY };
        },
    },
});

export const { loginSuccess, tokenRefreshed, logout } = authSlice.actions;

// ── Selectors ───────────────────────────────────────────────────────────────
export const selectAuth = (s) => s.auth;
export const selectToken = (s) => s.auth.token;
export const selectUser = (s) => s.auth.user;
export const selectModules = (s) => s.auth.modules;
export const selectIsAuthenticated = (s) => s.auth.isAuthenticated;

// Does the server's module list grant this key? An empty list is read as
// "the server didn't gate anything" rather than "block everything" — locking
// the whole app out over a missing field would be worse than showing a page
// the API will refuse anyway.
export const selectHasModule = (key) => (s) =>
    !s.auth.modules?.length || s.auth.modules.includes(key);

// Token access from outside React (the axios interceptor), under the same
// expiry rule as the store.
export const getStoredToken = () => readStored()?.token || null;
export const getStoredAuth = () => readStored();

export default authSlice.reducer;
