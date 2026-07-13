// ── Shared formatters & helpers ─────────────────────────────────────────────
// Small pure utilities that were previously copy-pasted across pages. Behaviour
// is identical to the inline versions they replace — no visual change.

// Indian-rupee formatting, e.g. 20000 → "₹20,000".
export const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// "12 Jun 2024" style date, or an em-dash when empty.
export const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// Up-to-2-letter initials from a full name, e.g. "Karthik R" → "KR".
export const initialsFromName = (n = '') =>
    n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

// Deterministic avatar/chip palette used by the People-style pages.
export const PALETTE = ['#7C5CFC', '#0EA5E9', '#F59E0B', '#16A34A', '#E11D48', '#6246E0', '#0891B2'];

// Pick a stable palette colour from a string's first character.
export const paletteColor = (s = '') => PALETTE[(s.charCodeAt(0) || 0) % PALETTE.length];
