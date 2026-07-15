import axios from 'axios';
import { store } from '../redux/store';
import { logout, getStoredToken } from '../redux/slices/authSlice';

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

http.interceptors.request.use((config) => {
    const token = currentToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// A 401/403 means the token is gone, expired or revoked. Clearing auth flips
// ProtectedRoute over to /login on the next render, so there's no need to
// navigate from here (and no router access at this layer anyway).
http.interceptors.response.use(
    (res) => res,
    (error) => {
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
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
