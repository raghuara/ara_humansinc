import { createSlice, nanoid } from '@reduxjs/toolkit';

// ── Salary Advances ─────────────────────────────────────────────────────────
// An employee is given (or requests, from the mobile app) a lump-sum advance
// that is then recovered from their monthly salary. Each advance carries a
// deduction plan: either a fixed monthly instalment (e.g. ₹5,000/month until the
// full amount is recovered) or a one-time deduction on a single month's salary.

// Pending requests raised by employees from the mobile app — awaiting approval.
const seedRequests = [
    { id: 'req-1', employeeId: 'EMP-002', employeeName: 'Gopinath S', department: 'Sales', amount: 30000, reason: 'Medical emergency at home', requestedOn: '2026-07-04', status: 'pending' },
    { id: 'req-2', employeeId: 'EMP-003', employeeName: 'Anitha M', department: 'Design', amount: 15000, reason: 'House rent deposit', requestedOn: '2026-07-08', status: 'pending' },
];

// Advances already granted (directly or via an approved request) and under recovery.
const seedAdvances = [
    { id: 'adv-1', employeeId: 'EMP-001', employeeName: 'Karthik R', department: 'Engineering', amount: 20000, plan: 'installment', monthlyAmount: 5000, startMonth: '2026-06', recovered: 5000, reason: 'Personal', grantedOn: '2026-05-28', source: 'direct', status: 'active' },
];

const monthsFor = (a) => (a.plan === 'onetime' ? 1 : Math.max(1, Math.ceil(a.amount / (a.monthlyAmount || a.amount))));

const advancesSlice = createSlice({
    name: 'advances',
    initialState: { advances: seedAdvances, requests: seedRequests },
    reducers: {
        // Grant an advance directly from this screen.
        giveAdvance: {
            reducer(state, action) { state.advances.unshift(action.payload); },
            prepare(data) {
                return {
                    payload: {
                        id: nanoid(6),
                        recovered: 0,
                        source: 'direct',
                        status: 'active',
                        grantedOn: new Date().toISOString().slice(0, 10),
                        ...data,
                    },
                };
            },
        },
        // Approve a mobile-app request — moves it into advances with a deduction plan.
        approveRequest(state, action) {
            const { requestId, plan, monthlyAmount, startMonth } = action.payload;
            const req = state.requests.find((r) => r.id === requestId);
            if (!req) return;
            req.status = 'approved';
            state.advances.unshift({
                id: nanoid(6),
                employeeId: req.employeeId,
                employeeName: req.employeeName,
                department: req.department,
                amount: req.amount,
                reason: req.reason,
                plan,
                monthlyAmount: plan === 'onetime' ? req.amount : monthlyAmount,
                startMonth,
                recovered: 0,
                source: 'request',
                status: 'active',
                grantedOn: new Date().toISOString().slice(0, 10),
            });
            state.requests = state.requests.filter((r) => r.id !== requestId);
        },
        rejectRequest(state, action) {
            state.requests = state.requests.filter((r) => r.id !== action.payload);
        },
        // Record one month's recovery against an advance (simulates a payroll deduction).
        recordRecovery(state, action) {
            const adv = state.advances.find((a) => a.id === action.payload);
            if (!adv || adv.status === 'completed') return;
            const step = adv.plan === 'onetime' ? adv.amount : (adv.monthlyAmount || adv.amount);
            adv.recovered = Math.min(adv.amount, adv.recovered + step);
            if (adv.recovered >= adv.amount) adv.status = 'completed';
        },
        cancelAdvance(state, action) {
            state.advances = state.advances.filter((a) => a.id !== action.payload);
        },
    },
});

export const { giveAdvance, approveRequest, rejectRequest, recordRecovery, cancelAdvance } = advancesSlice.actions;

export const selectAdvances = (s) => s.advances.advances;
export const selectAdvanceRequests = (s) => s.advances.requests.filter((r) => r.status === 'pending');

export const advanceMonths = monthsFor;

export default advancesSlice.reducer;
