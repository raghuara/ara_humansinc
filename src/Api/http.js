import axios from 'axios';
import { store } from '../redux/store';
import { logout, getStoredToken, USER_TYPE } from '../redux/slices/authSlice';

// ── Authenticated HTTP client ───────────────────────────────────────────────
// One axios instance that attaches the real JWT to every call, so screens stop
// carrying their own `const token = "123"` placeholder.
//
// The token is read from the Redux store first and falls back to storage —
// that matters on a hard refresh, where the very first request can fire before
// React has finished mounting and re-hydrating the store.
//
// Usage (same shape as the raw axios calls already in the codebase):
//   import http from '../../Api/http';
//   const { data } = await http.get(getStaffAttendanceOverview, { params });
//
// No baseURL is set: Api.js already exports absolute URLs, so passing one of
// those straight through keeps every existing call site working unchanged.

// No default Content-Type on purpose. Axios infers it per request — JSON for a
// plain object, multipart (with the correct boundary) for FormData. Pinning
// application/json here would corrupt the file uploads on the leave screens.
const http = axios.create();

const currentToken = () => store.getState()?.auth?.token || getStoredToken();

// ── Entity scope (X-Entity-Id) ──────────────────────────────────────────────
// Which company a request is about — always the HEADER, never the body. Login
// carries no entityId: the account decides the scope, and a Master Admin picks
// one afterwards from the sidebar's "Working in" switcher.
//
// Only a Master Admin (userTypeId 1) sends the header. Every other login is
// pinned to one entity server-side and the token already says which, so sending
// it for them is ignored at best and a way to escape their scope at worst.
//
// The value MUST be a numeric entity id. Anything else means "no header":
//   • the seed id ('ent-1') the org slice boots with before the sidebar has
//     hydrated real entities — scoping to an entity the server never heard of is
//     worse than sending nothing, and
//   • the "all"/aggregate case — the backend has NO "all" value; it rejects
//     `X-Entity-Id: all` with 400, and aggregates across every entity only when
//     the header is OMITTED. So `all` → send nothing.
// A non-numeric id fails the test below and returns null in both cases.
const entityScope = () => {
    const state = store.getState();
    if (state?.auth?.user?.userTypeId !== USER_TYPE.MASTER_ADMIN) return null;
    const id = state?.org?.activeEntityId;
    return /^\d+$/.test(String(id ?? '')) ? String(id) : null;
};

// axios v1 hands the interceptor an AxiosHeaders instance, which normalises key
// casing through has()/set(). Fall back to plain property access in case a call
// site ever passes a bare object.
const headerSet = (headers, name, value) => {
    if (typeof headers?.set === 'function') headers.set(name, value);
    else headers[name] = value;
};
const headerHas = (headers, name) => (
    typeof headers?.has === 'function' ? headers.has(name) : headers?.[name] != null
);

http.interceptors.request.use((config) => {
    const token = currentToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // A call that set the scope itself wins — an explicit per-request entity
    // should never be silently overwritten by the current selection. And a call
    // can opt out entirely with `{ noEntityScope: true }` — the Master Dashboard
    // uses this so its cross-entity calls AGGREGATE (no header) rather than being
    // scoped to whatever entity the sidebar happens to have selected.
    if (!config.noEntityScope && !headerHas(config.headers, 'X-Entity-Id')) {
        const entityId = entityScope();
        if (entityId != null) headerSet(config.headers, 'X-Entity-Id', entityId);
    }
    return config;
});

// A 401 means the token itself is gone, expired or revoked — the whole session
// is dead, so clear auth and let ProtectedRoute flip over to /login on the next
// render (no router access at this layer anyway).
//
// A 403 is different: the token is VALID, the user is simply not allowed this
// one resource. That's normal for a restricted role — e.g. an Employee hitting
// an admin-only endpoint like GetEmployees. Logging them out on a 403 would kick
// every non-admin straight back to the login page. So 403 is left for the caller
// to handle (most swallow it and fall back gracefully); it never ends the session.
http.interceptors.response.use(
    (res) => res,
    (error) => {
        const status = error?.response?.status;
        if (status === 401) {
            if (store.getState()?.auth?.isAuthenticated) store.dispatch(logout());
        }
        return Promise.reject(error);
    },
);

// Pull a human-readable message out of whatever shape the API returned. The
// login endpoint answers `{ error: true, message }` on failure, but network
// drops and gateway errors have no body at all.
export const apiErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
    if (error?.response) {
        const d = error.response.data;
        return (
            d?.message
            || d?.error?.message
            || (typeof d?.error === 'string' ? d.error : null)
            || d?.title
            || (error.response.status === 401 ? 'Invalid login ID or password.' : null)
            || fallback
        );
    }
    if (error?.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
    if (error?.request) return 'Cannot reach the server. Check your connection and try again.';
    return fallback;
};

export default http;
