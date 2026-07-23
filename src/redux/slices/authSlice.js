import { createSlice } from '@reduxjs/toolkit';
import { resolveModules } from '../../data/roleAccess';

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
    user: null,          // { id, name, loginId, email, userTypeId, role, accentColour, entityId, entityName, isMasterAdmin }
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
                email: user?.email || user?.loginId || '',
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

// The screens this login may open, AFTER the role rules are applied. Built-in
// roles (userTypeId 1/2/3) resolve to their hard-coded set; any custom role
// resolves to the server's `modules` list. Gate the sidebar, the route guard
// and the in-page tabs on THIS, not on the raw `modules`, so all three agree.
// Returns a stable reference per role (see resolveModules) — safe for useSelector.
export const selectEffectiveModules = (s) => resolveModules(s.auth.user, s.auth.modules);

// ── Roles ─────────────────────────────────────────────────────────────────────
// Three default system role types. Custom sub-roles can be added later, but the
// access rules below key off these three. Gate UI/actions with the selectors so
// a single source decides who can do what:
//   MASTER_ADMIN (1) → creates entities, sees & works across ALL of them
//   ADMIN        (2) → scoped to their own entity (user.entityId); full control there
//   EMPLOYEE     (3) → self-service only
export const USER_TYPE = { MASTER_ADMIN: 1, ADMIN: 2, EMPLOYEE: 3 };

export const selectUserTypeId = (s) => s.auth.user?.userTypeId ?? null;
export const selectIsMasterAdmin = (s) => s.auth.user?.userTypeId === USER_TYPE.MASTER_ADMIN || s.auth.user?.isMasterAdmin === true;
export const selectIsAdmin = (s) => s.auth.user?.userTypeId === USER_TYPE.ADMIN;
export const selectIsEmployee = (s) => s.auth.user?.userTypeId === USER_TYPE.EMPLOYEE;

// The entity an Admin/Employee is bound to. Master Admin is `null` — i.e. "all
// entities", which is why the login sends entityId: "all" for them.
export const selectUserEntityId = (s) => s.auth.user?.entityId ?? null;
export const selectUserEntityName = (s) => s.auth.user?.entityName ?? null;

// Master Admin is the only role that may pick across entities; everyone else is
// pinned to their own. Handy for the Entity picker and the "All Entities" option.
export const selectCanViewAllEntities = (s) => selectIsMasterAdmin(s);

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
