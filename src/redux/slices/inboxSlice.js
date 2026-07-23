import { createSlice, nanoid } from '@reduxjs/toolkit';
import { createRequest, submitDocument, approveSubmission, rejectSubmission } from './documentsSlice';

// ── Inbox ───────────────────────────────────────────────────────────────────
// One feed for everything that lands on management's desk: document requests
// they raised, submissions coming back from employees, advance/leave/OT asks.
//
// Nothing dispatches into this slice by hand. It listens to the actions other
// slices already fire (`extraReducers` below), so a message can never drift out
// of sync with the thing it is describing — if the document was requested, the
// inbox entry exists; if it wasn't, it doesn't.

const now = () => new Date().toISOString();

const msg = (data) => ({
    id: `msg-${nanoid(6)}`,
    read: false,
    createdOn: now(),
    from: 'System',
    actionPath: '',
    ...data,
});

// `kind` drives the icon and accent colour in the UI.
const seed = [
    {
        id: 'msg-1', kind: 'document-submitted', read: false, createdOn: '2026-07-12T09:24:00.000Z',
        title: 'Gopinath S submitted Birth Certificate',
        body: 'Awaiting your review — uploaded gopi_bc_scan.jpg from the mobile app.',
        from: 'Gopinath S', actionPath: '/dashboard/documents?tab=approvals',
    },
    {
        id: 'msg-2', kind: 'document-submitted', read: false, createdOn: '2026-07-12T08:02:00.000Z',
        title: 'Anitha M submitted Birth Certificate',
        body: 'Awaiting your review — uploaded anitha-bc.pdf from the mobile app.',
        from: 'Anitha M', actionPath: '/dashboard/documents?tab=approvals',
    },
    {
        id: 'msg-3', kind: 'advance', read: false, createdOn: '2026-07-08T16:40:00.000Z',
        title: 'Anitha M requested a salary advance',
        body: '₹15,000 for a house rent deposit.',
        from: 'Anitha M', actionPath: '/dashboard/pay-adjustments?tab=advances',
    },
    {
        id: 'msg-4', kind: 'overtime', read: true, createdOn: '2026-07-08T19:10:00.000Z',
        title: 'Karthik R logged 2.5 hrs overtime',
        body: 'Signed off at 20:30 against an 18:00 shift end.',
        from: 'Karthik R', actionPath: '/dashboard/pay-adjustments?tab=overtime',
    },
    {
        id: 'msg-5', kind: 'announcement', read: true, createdOn: '2026-07-01T10:00:00.000Z',
        title: 'Employee Handbook 2026 published',
        body: 'The revised handbook is available under Organisation Documents.',
        from: 'Divya Prakash', actionPath: '/dashboard/documents?tab=organisation',
    },
];

const inboxSlice = createSlice({
    name: 'inbox',
    // `unreadCount` is the badge's source of truth — set from the Inbox API so
    // the sidebar shows the real not-yet-seen count, independent of the seed
    // items above (which only the legacy cross-slice listeners still touch).
    initialState: { items: seed, unreadCount: 0 },
    reducers: {
        setUnreadCount(state, action) {
            state.unreadCount = Math.max(0, Number(action.payload) || 0);
        },
        markRead(state, action) {
            const it = state.items.find((i) => i.id === action.payload);
            if (it) it.read = true;
        },
        markUnread(state, action) {
            const it = state.items.find((i) => i.id === action.payload);
            if (it) it.read = false;
        },
        markAllRead(state) {
            state.items.forEach((i) => { i.read = true; });
        },
        removeMessage(state, action) {
            state.items = state.items.filter((i) => i.id !== action.payload);
        },
        clearInbox(state) {
            state.items = [];
        },
        // Escape hatch for anything not covered by the listeners below.
        pushMessage: {
            reducer(state, action) { state.items.unshift(action.payload); },
            prepare(data) { return { payload: msg(data) }; },
        },
    },

    // ── Cross-slice listeners ────────────────────────────────────────────────
    extraReducers: (builder) => {
        builder
            .addCase(createRequest, (state, action) => {
                const r = action.payload;
                const n = r.targets.length;
                state.items.unshift(msg({
                    kind: 'document-request',
                    title: `${r.title} requested from ${n} employee${n === 1 ? '' : 's'}`,
                    body: r.dueDate
                        ? `Due ${new Date(r.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}. ${r.targets.map((t) => t.employeeName).join(', ')}.`
                        : `Sent to ${r.targets.map((t) => t.employeeName).join(', ')}.`,
                    from: r.requestedBy,
                    actionPath: '/dashboard/documents?tab=requests',
                }));
            })
            .addCase(submitDocument, (state, action) => {
                const { employeeName, title, fileName } = action.payload;
                state.items.unshift(msg({
                    kind: 'document-submitted',
                    title: `${employeeName || 'An employee'} submitted ${title || 'a document'}`,
                    body: `Awaiting your review — uploaded ${fileName}.`,
                    from: employeeName || 'Employee',
                    actionPath: '/dashboard/documents?tab=approvals',
                }));
            })
            .addCase(approveSubmission, (state, action) => {
                const { employeeName, title } = action.payload;
                state.items.unshift(msg({
                    kind: 'document-approved',
                    title: `${title || 'Document'} approved for ${employeeName || 'employee'}`,
                    body: 'The file is now filed in their employee record.',
                    from: action.payload.reviewedBy || 'Management',
                    read: true,
                    actionPath: '/dashboard/documents?tab=employee',
                }));
            })
            .addCase(rejectSubmission, (state, action) => {
                const { employeeName, title, reason } = action.payload;
                state.items.unshift(msg({
                    kind: 'document-rejected',
                    title: `${title || 'Document'} rejected for ${employeeName || 'employee'}`,
                    body: reason || 'Sent back for re-upload.',
                    from: action.payload.reviewedBy || 'Management',
                    read: true,
                    actionPath: '/dashboard/documents?tab=requests',
                }));
            });
    },
});

export const { setUnreadCount, markRead, markUnread, markAllRead, removeMessage, clearInbox, pushMessage } = inboxSlice.actions;

export const selectInbox = (s) => s.inbox.items;
// Badge count now comes from the API-synced value, not the seed items.
export const selectUnreadCount = (s) => s.inbox.unreadCount;

export default inboxSlice.reducer;
