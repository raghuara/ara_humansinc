import { createSlice, nanoid } from '@reduxjs/toolkit';

// ── Recruitment ─────────────────────────────────────────────────────────────
// Three linked records, in the order hiring actually happens:
//
//   Vacancy   — "we need 2 Senior Engineers". Owns the opening count.
//   Candidate — someone applying against one vacancy.
//   Interview — one round with one candidate, on a date and time.
//
// The interview lifecycle is the heart of this slice:
//
//   Scheduled ──▶ Conducted ──▶ reviewed
//        │            │            ├─ Selected  → candidate moves to 'selected'
//        │            │            ├─ Rejected  → candidate rejected, reason required
//        │            │            └─ On Hold   → parked, decide later
//        ├─▶ Cancelled
//        └─▶ No Show
//
// "Conducted" and "reviewed" are deliberately two steps. Marking it conducted
// just says the interview happened; the outcome comes afterwards, once the panel
// has given feedback. That's why `outcome` stays empty on a Conducted interview
// — that gap is exactly what the "Awaiting review" queue is built from.

const iso = (d) => d.toISOString().slice(0, 10);
const today = () => iso(new Date());

// Seeds are positioned relative to the real today, so "Today" and "Upcoming"
// always have something in them rather than going stale on a fixed date.
const dayOffset = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return iso(d);
};

const seedVacancies = [
    {
        id: 'vac-1', entityId: 'ent-1', title: 'Senior React Engineer', department: 'Engineering', designation: 'Senior Engineer',
        openings: 2, filled: 0, experience: '4-7 yrs', location: 'Chennai', employmentType: 'Permanent',
        minSalary: 900000, maxSalary: 1400000, priority: 'High', status: 'Open',
        hiringManager: 'Karthik R', description: 'Own the front-end platform. React, Redux, MUI.',
        postedOn: dayOffset(-18), closedOn: '',
    },
    {
        id: 'vac-2', entityId: 'ent-1', title: 'Sales Executive', department: 'Sales', designation: 'Executive',
        openings: 3, filled: 1, experience: '1-3 yrs', location: 'Chennai', employmentType: 'Permanent',
        minSalary: 300000, maxSalary: 450000, priority: 'Medium', status: 'Open',
        hiringManager: 'Gopinath S', description: 'Field sales across the Tamil Nadu territory.',
        postedOn: dayOffset(-32), closedOn: '',
    },
    {
        id: 'vac-3', entityId: 'ent-1', title: 'HR Associate', department: 'Human Resources', designation: 'HR Associate',
        openings: 1, filled: 1, experience: '2-4 yrs', location: 'Chennai', employmentType: 'Permanent',
        minSalary: 400000, maxSalary: 550000, priority: 'Low', status: 'Closed',
        hiringManager: 'Divya Prakash', description: 'Payroll and onboarding support.',
        postedOn: dayOffset(-70), closedOn: dayOffset(-12),
    },
];

const seedCandidates = [
    { id: 'can-1', vacancyId: 'vac-1', name: 'Meera Krishnan', email: 'meera.k@example.com', phone: '98400 11223', experience: '5 yrs', currentCompany: 'Zoho', expectedSalary: 1200000, noticePeriod: '30 days', source: 'Referral', appliedOn: dayOffset(-9), status: 'interviewing', rejectReason: '' },
    { id: 'can-2', vacancyId: 'vac-1', name: 'Arun Prakash', email: 'arun.p@example.com', phone: '99620 55447', experience: '6 yrs', currentCompany: 'Freshworks', expectedSalary: 1350000, noticePeriod: '60 days', source: 'LinkedIn', appliedOn: dayOffset(-7), status: 'interviewing', rejectReason: '' },
    { id: 'can-3', vacancyId: 'vac-1', name: 'Sowmya Nair', email: 'sowmya.n@example.com', phone: '90031 88214', experience: '4 yrs', currentCompany: 'TCS', expectedSalary: 1000000, noticePeriod: 'Immediate', source: 'Naukri', appliedOn: dayOffset(-5), status: 'applied', rejectReason: '' },
    { id: 'can-4', vacancyId: 'vac-2', name: 'Deepak Raj', email: 'deepak.r@example.com', phone: '89399 74125', experience: '2 yrs', currentCompany: 'Byju\'s', expectedSalary: 420000, noticePeriod: '15 days', source: 'Walk-in', appliedOn: dayOffset(-4), status: 'interviewing', rejectReason: '' },
    { id: 'can-5', vacancyId: 'vac-2', name: 'Nithya Balan', email: 'nithya.b@example.com', phone: '95000 63214', experience: '3 yrs', currentCompany: 'Cognizant', expectedSalary: 460000, noticePeriod: '30 days', source: 'Referral', appliedOn: dayOffset(-3), status: 'applied', rejectReason: '' },
];

const seedInterviews = [
    // Today — one still to happen, one already conducted and waiting on a review.
    { id: 'int-1', vacancyId: 'vac-1', candidateId: 'can-1', candidateName: 'Meera Krishnan', vacancyTitle: 'Senior React Engineer', round: 'Technical Round 1', date: dayOffset(0), time: '10:30', durationMins: 60, mode: 'Video', locationOrLink: 'meet.google.com/abc-defg-hij', panel: ['Karthik R'], status: 'Scheduled', outcome: '', rating: 0, feedback: '', rejectReason: '', conductedOn: '', reviewedBy: '' },
    { id: 'int-2', vacancyId: 'vac-2', candidateId: 'can-4', candidateName: 'Deepak Raj', vacancyTitle: 'Sales Executive', round: 'HR Round', date: dayOffset(0), time: '15:00', durationMins: 30, mode: 'In-person', locationOrLink: 'Meeting Room 2', panel: ['Divya Prakash'], status: 'Scheduled', outcome: '', rating: 0, feedback: '', rejectReason: '', conductedOn: '', reviewedBy: '' },
    { id: 'int-3', vacancyId: 'vac-1', candidateId: 'can-2', candidateName: 'Arun Prakash', vacancyTitle: 'Senior React Engineer', round: 'Technical Round 1', date: dayOffset(-1), time: '11:00', durationMins: 60, mode: 'Video', locationOrLink: 'meet.google.com/xyz-1234', panel: ['Karthik R'], status: 'Conducted', outcome: '', rating: 0, feedback: '', rejectReason: '', conductedOn: dayOffset(-1), reviewedBy: '' },

    // Upcoming
    { id: 'int-4', vacancyId: 'vac-1', candidateId: 'can-3', candidateName: 'Sowmya Nair', vacancyTitle: 'Senior React Engineer', round: 'Screening', date: dayOffset(1), time: '09:30', durationMins: 30, mode: 'Phone', locationOrLink: '90031 88214', panel: ['Divya Prakash'], status: 'Scheduled', outcome: '', rating: 0, feedback: '', rejectReason: '', conductedOn: '', reviewedBy: '' },
    { id: 'int-5', vacancyId: 'vac-2', candidateId: 'can-5', candidateName: 'Nithya Balan', vacancyTitle: 'Sales Executive', round: 'Screening', date: dayOffset(3), time: '14:00', durationMins: 30, mode: 'In-person', locationOrLink: 'Meeting Room 1', panel: ['Gopinath S'], status: 'Scheduled', outcome: '', rating: 0, feedback: '', rejectReason: '', conductedOn: '', reviewedBy: '' },
];

const recruitmentSlice = createSlice({
    name: 'recruitment',
    initialState: { vacancies: seedVacancies, candidates: seedCandidates, interviews: seedInterviews },
    reducers: {
        // ── Vacancies ────────────────────────────────────────────────────────
        addVacancy: {
            reducer(state, action) { state.vacancies.unshift(action.payload); },
            prepare(data) {
                return {
                    payload: {
                        id: `vac-${nanoid(6)}`,
                        filled: 0,
                        status: 'Open',
                        closedOn: '',
                        postedOn: today(),
                        ...data,
                    },
                };
            },
        },
        updateVacancy(state, action) {
            const { id, changes } = action.payload;
            const v = state.vacancies.find((x) => x.id === id);
            if (v) Object.assign(v, changes);
        },
        closeVacancy(state, action) {
            const v = state.vacancies.find((x) => x.id === action.payload);
            if (v) { v.status = 'Closed'; v.closedOn = today(); }
        },
        reopenVacancy(state, action) {
            const v = state.vacancies.find((x) => x.id === action.payload);
            if (v) { v.status = 'Open'; v.closedOn = ''; }
        },
        // Removing a vacancy takes its candidates and interviews with it —
        // otherwise they'd point at a role that no longer exists.
        deleteVacancy(state, action) {
            const id = action.payload;
            state.vacancies = state.vacancies.filter((v) => v.id !== id);
            state.candidates = state.candidates.filter((c) => c.vacancyId !== id);
            state.interviews = state.interviews.filter((i) => i.vacancyId !== id);
        },

        // ── Candidates ───────────────────────────────────────────────────────
        addCandidate: {
            reducer(state, action) { state.candidates.unshift(action.payload); },
            prepare(data) {
                return { payload: { id: `can-${nanoid(6)}`, status: 'applied', rejectReason: '', appliedOn: today(), ...data } };
            },
        },
        updateCandidate(state, action) {
            const { id, changes } = action.payload;
            const c = state.candidates.find((x) => x.id === id);
            if (c) Object.assign(c, changes);
        },
        deleteCandidate(state, action) {
            const id = action.payload;
            state.candidates = state.candidates.filter((c) => c.id !== id);
            state.interviews = state.interviews.filter((i) => i.candidateId !== id);
        },

        // ── Interviews ───────────────────────────────────────────────────────
        scheduleInterview: {
            reducer(state, action) {
                state.interviews.unshift(action.payload);
                // Scheduling a round is what moves someone out of 'applied'.
                const c = state.candidates.find((x) => x.id === action.payload.candidateId);
                if (c && c.status === 'applied') c.status = 'interviewing';
            },
            prepare(data) {
                return {
                    payload: {
                        id: `int-${nanoid(6)}`,
                        status: 'Scheduled',
                        outcome: '',
                        rating: 0,
                        feedback: '',
                        rejectReason: '',
                        conductedOn: '',
                        reviewedBy: '',
                        panel: [],
                        durationMins: 30,
                        ...data,
                    },
                };
            },
        },
        rescheduleInterview(state, action) {
            const { id, date, time, mode, locationOrLink, durationMins } = action.payload;
            const i = state.interviews.find((x) => x.id === id);
            if (!i || i.status === 'Conducted') return;
            Object.assign(i, { date, time, status: 'Scheduled' });
            if (mode) i.mode = mode;
            if (locationOrLink !== undefined) i.locationOrLink = locationOrLink;
            if (durationMins) i.durationMins = durationMins;
        },
        cancelInterview(state, action) {
            const i = state.interviews.find((x) => x.id === action.payload);
            if (i && i.status === 'Scheduled') i.status = 'Cancelled';
        },
        markNoShow(state, action) {
            const i = state.interviews.find((x) => x.id === action.payload);
            if (i && i.status === 'Scheduled') i.status = 'No Show';
        },
        deleteInterview(state, action) {
            state.interviews = state.interviews.filter((i) => i.id !== action.payload);
        },

        // Step 1 of the outcome flow: it happened. No verdict yet — that's what
        // puts it in the "Awaiting review" queue.
        markConducted(state, action) {
            const i = state.interviews.find((x) => x.id === action.payload);
            if (!i || i.status !== 'Scheduled') return;
            i.status = 'Conducted';
            i.conductedOn = today();
        },

        // Step 2: the panel's verdict. A rejection must carry a reason — the
        // reducer refuses to record one without it, so the UI can't quietly
        // drop a candidate with no explanation on file.
        reviewInterview(state, action) {
            const { id, outcome, rating, feedback, rejectReason, reviewedBy } = action.payload;
            const i = state.interviews.find((x) => x.id === id);
            if (!i || i.status !== 'Conducted') return;
            if (outcome === 'Rejected' && !String(rejectReason || '').trim()) return;

            i.outcome = outcome;
            i.rating = rating || 0;
            i.feedback = feedback || '';
            i.rejectReason = outcome === 'Rejected' ? rejectReason.trim() : '';
            i.reviewedBy = reviewedBy || 'Management';

            const c = state.candidates.find((x) => x.id === i.candidateId);
            if (!c) return;
            if (outcome === 'Rejected') { c.status = 'rejected'; c.rejectReason = i.rejectReason; }
            if (outcome === 'Selected') { c.status = 'selected'; c.rejectReason = ''; }
            if (outcome === 'On Hold') { c.status = 'on-hold'; c.rejectReason = ''; }
        },

        // A selected candidate who actually joins consumes one opening. The
        // vacancy closes itself once every opening is filled.
        markJoined(state, action) {
            const c = state.candidates.find((x) => x.id === action.payload);
            if (!c || c.status !== 'selected') return;
            c.status = 'joined';
            const v = state.vacancies.find((x) => x.id === c.vacancyId);
            if (!v) return;
            v.filled = Math.min(v.openings, v.filled + 1);
            if (v.filled >= v.openings) { v.status = 'Closed'; v.closedOn = today(); }
        },
    },
});

export const {
    addVacancy, updateVacancy, closeVacancy, reopenVacancy, deleteVacancy,
    addCandidate, updateCandidate, deleteCandidate,
    scheduleInterview, rescheduleInterview, cancelInterview, markNoShow, deleteInterview,
    markConducted, reviewInterview, markJoined,
} = recruitmentSlice.actions;

// ── Selectors ───────────────────────────────────────────────────────────────
// Vacancies belong to an entity; candidates and interviews inherit that through
// their vacancy, so everything below stays scoped to the entity you're in.
export const selectVacancies = (s) => s.recruitment.vacancies.filter((v) => v.entityId === s.org.activeEntityId);

const vacancyIdsForEntity = (s) => new Set(selectVacancies(s).map((v) => v.id));

export const selectCandidates = (s) => {
    const ids = vacancyIdsForEntity(s);
    return s.recruitment.candidates.filter((c) => ids.has(c.vacancyId));
};

export const selectInterviews = (s) => {
    const ids = vacancyIdsForEntity(s);
    return s.recruitment.interviews.filter((i) => ids.has(i.vacancyId));
};

const byTime = (a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date));

// Still-live interviews sitting on today's date.
export const selectInterviewsToday = (s) =>
    selectInterviews(s)
        .filter((i) => i.date === today() && i.status !== 'Cancelled')
        .sort(byTime);

// Everything after today that hasn't been cancelled.
export const selectUpcomingInterviews = (s) =>
    selectInterviews(s)
        .filter((i) => i.date > today() && i.status === 'Scheduled')
        .sort(byTime);

// Conducted but no verdict recorded — the queue the reviewer works through.
export const selectAwaitingReview = (s) =>
    selectInterviews(s)
        .filter((i) => i.status === 'Conducted' && !i.outcome)
        .sort(byTime);

// Scheduled but the date has already passed — nobody marked them conducted.
export const selectOverdueInterviews = (s) =>
    selectInterviews(s)
        .filter((i) => i.status === 'Scheduled' && i.date < today())
        .sort(byTime);

export const selectOpenVacancies = (s) => selectVacancies(s).filter((v) => v.status === 'Open');

// Total unfilled seats across open roles — the number a hiring manager cares
// about, which is not the same as the number of vacancy records.
export const selectOpenPositions = (s) =>
    selectOpenVacancies(s).reduce((n, v) => n + Math.max(0, v.openings - v.filled), 0);

export default recruitmentSlice.reducer;
