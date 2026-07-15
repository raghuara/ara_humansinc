import { createSlice } from '@reduxjs/toolkit';

// ── Financial year ──────────────────────────────────────────────────────────
// The server owns the configuration: you choose a start month, and it derives
// the end month and the current financial year label ("2026-2027"). This slice
// caches that config and remembers which year the user is looking at, so every
// screen reports against the same period.

export const MONTHS = [
    { value: 1, name: 'January', short: 'Jan' },
    { value: 2, name: 'February', short: 'Feb' },
    { value: 3, name: 'March', short: 'Mar' },
    { value: 4, name: 'April', short: 'Apr' },
    { value: 5, name: 'May', short: 'May' },
    { value: 6, name: 'June', short: 'Jun' },
    { value: 7, name: 'July', short: 'Jul' },
    { value: 8, name: 'August', short: 'Aug' },
    { value: 9, name: 'September', short: 'Sep' },
    { value: 10, name: 'October', short: 'Oct' },
    { value: 11, name: 'November', short: 'Nov' },
    { value: 12, name: 'December', short: 'Dec' },
];

export const monthName = (m) => MONTHS.find((x) => x.value === Number(m))?.name || '—';

// "2026-2027" → ["2026-2027", "2025-2026", "2024-2025", "2023-2024"]
// The current year first, then the three behind it. Returns [] if the server
// hasn't given us a year yet, so callers can't render a dropdown of guesses.
export const financialYearOptions = (current, previousCount = 3) => {
    const start = Number(String(current || '').split('-')[0]);
    if (!Number.isFinite(start)) return [];
    return Array.from({ length: previousCount + 1 }, (_, i) => {
        const y = start - i;
        return `${y}-${y + 1}`;
    });
};

const initialState = {
    config: null,       // the GetFinancialYearConfig payload, verbatim
    selected: '',       // which financial year the user is working in
};

const financialYearSlice = createSlice({
    name: 'financialYear',
    initialState,
    reducers: {
        setFinancialYearConfig(state, action) {
            const cfg = action.payload || null;
            state.config = cfg;
            // Snap the selection to the current year when there isn't one, or
            // when the year we were sitting on is no longer offered (the company
            // rolled into a new financial year while the tab was open).
            const options = financialYearOptions(cfg?.currentFinancialYear);
            if (!state.selected || !options.includes(state.selected)) {
                state.selected = cfg?.currentFinancialYear || '';
            }
        },
        setSelectedFinancialYear(state, action) {
            state.selected = action.payload;
        },
    },
});

export const { setFinancialYearConfig, setSelectedFinancialYear } = financialYearSlice.actions;

export const selectFinancialYearConfig = (s) => s.financialYear.config;
export const selectSelectedFinancialYear = (s) => s.financialYear.selected;
export const selectFinancialYearOptions = (s) => financialYearOptions(s.financialYear.config?.currentFinancialYear);
export const selectIsCurrentFinancialYear = (s) =>
    Boolean(s.financialYear.selected) && s.financialYear.selected === s.financialYear.config?.currentFinancialYear;

export default financialYearSlice.reducer;
