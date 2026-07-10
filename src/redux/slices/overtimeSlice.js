import { createSlice, nanoid } from '@reduxjs/toolkit';

// ── Overtime (OT) ────────────────────────────────────────────────────────────
// OT is the time worked beyond a shift's scheduled end. HR configures flexible
// rate slabs keyed on *how many OT hours* an employee did: e.g. the first couple
// of hours pay a per-hour rate, while a very long stretch pays a flat amount
// (like a full day's salary). Slabs are matched by the total OT duration.
//
// A slab covers OT hours in [fromHr, toHr); toHr === null means "and above".
//   payType: 'perhour' → pay = amount × OT hours
//   payType: 'flat'    → pay = amount (one lump sum for the whole OT)

const seedSlabs = [
    { id: 'ot-1', label: 'Short OT', fromHr: 0, toHr: 2, payType: 'perhour', amount: 150 },
    { id: 'ot-2', label: 'Extended OT', fromHr: 2, toHr: 6, payType: 'perhour', amount: 250 },
    { id: 'ot-3', label: 'Full-day OT', fromHr: 6, toHr: null, payType: 'flat', amount: 2000 },
];

const seedRecords = [
    { id: 'otr-1', employeeId: 'EMP-001', employeeName: 'Karthik R', department: 'Engineering', date: '2026-07-08', shiftEnd: '18:00', signOff: '20:30', otHours: 2.5, status: 'pending' },
    { id: 'otr-2', employeeId: 'EMP-002', employeeName: 'Gopinath S', department: 'Sales', date: '2026-07-08', shiftEnd: '18:00', signOff: '19:00', otHours: 1, status: 'pending' },
    { id: 'otr-3', employeeId: 'EMP-003', employeeName: 'Anitha M', department: 'Design', date: '2026-07-07', shiftEnd: '18:00', signOff: '00:00', otHours: 8, status: 'approved' },
];

// Match a total OT duration to its slab and compute the payout.
export const otPayFor = (hours, slabs) => {
    const h = Number(hours) || 0;
    const slab = slabs.find((s) => h >= s.fromHr && (s.toHr === null || h < s.toHr));
    if (!slab) return { slab: null, pay: 0 };
    const pay = slab.payType === 'flat' ? slab.amount : slab.amount * h;
    return { slab, pay: Math.round(pay) };
};

const overtimeSlice = createSlice({
    name: 'overtime',
    initialState: { slabs: seedSlabs, records: seedRecords, graceMinutes: 30 },
    reducers: {
        addSlab: {
            reducer(state, action) {
                state.slabs.push(action.payload);
                state.slabs.sort((a, b) => a.fromHr - b.fromHr);
            },
            prepare(data) { return { payload: { id: nanoid(6), ...data } }; },
        },
        updateSlab(state, action) {
            const { id, changes } = action.payload;
            const s = state.slabs.find((x) => x.id === id);
            if (s) Object.assign(s, changes);
            state.slabs.sort((a, b) => a.fromHr - b.fromHr);
        },
        removeSlab(state, action) {
            state.slabs = state.slabs.filter((s) => s.id !== action.payload);
        },
        setGraceMinutes(state, action) {
            state.graceMinutes = Math.max(0, Number(action.payload) || 0);
        },
        approveOtRecord(state, action) {
            const r = state.records.find((x) => x.id === action.payload);
            if (r) r.status = 'approved';
        },
        rejectOtRecord(state, action) {
            state.records = state.records.filter((r) => r.id !== action.payload);
        },
    },
});

export const { addSlab, updateSlab, removeSlab, setGraceMinutes, approveOtRecord, rejectOtRecord } = overtimeSlice.actions;

export const selectOtSlabs = (s) => s.overtime.slabs;
export const selectOtRecords = (s) => s.overtime.records;
export const selectOtGrace = (s) => s.overtime.graceMinutes;

export default overtimeSlice.reducer;
