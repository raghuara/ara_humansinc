// Shared translation between what the API speaks and what the form inputs speak.
//
// The API dates are DD-MM-YYYY. <input type="date"> only ever reads and writes
// YYYY-MM-DD, and `new Date('09-06-2026')` would silently read that as a US
// month-first date (or NaN) — so every crossing of that boundary goes through
// here rather than through the Date constructor.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// '1995-08-15' (date input) → '15-08-1995' (API)
export const toApiDate = (v) => {
    const [y, m, d] = String(v || '').split('-');
    return y && m && d ? `${d}-${m}-${y}` : '';
};

// '15-08-1995' (API) → '1995-08-15' (date input)
export const toInputDate = (v) => {
    const [d, m, y] = String(v || '').split('-');
    return d && m && y ? `${y}-${m}-${d}` : '';
};

// '15-08-1995' (API) → '15 Aug 1995' (display)
export const fmtApiDate = (v) => {
    const [d, m, y] = String(v || '').split('-');
    const mi = Number(m) - 1;
    return d && MONTHS[mi] && y ? `${d} ${MONTHS[mi]} ${y}` : '';
};

// Nullable numeric columns: an untouched input holds '', and posting '' where a
// number is expected is a 400. Empty means null, not zero and not ''.
export const numOrNull = (v) => {
    const s = String(v ?? '').trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
};

export const txt = (v) => String(v ?? '').trim();
