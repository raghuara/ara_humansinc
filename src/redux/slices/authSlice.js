import { createSlice } from '@reduxjs/toolkit';

const persisted = (() => {
    try {
        const raw = localStorage.getItem('ara_auth');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
})();

const initialState = persisted || {
    token: null,
    isAuthenticated: false,
    userName: '',
    email: '',
    role: '',
    organisation: '',
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        loginSuccess: (state, action) => {
            const next = { ...state, ...action.payload, isAuthenticated: true };
            try {
                localStorage.setItem('ara_auth', JSON.stringify(next));
            } catch { /* ignore */ }
            return next;
        },
        logout: () => {
            try {
                localStorage.removeItem('ara_auth');
            } catch { /* ignore */ }
            return {
                token: null,
                isAuthenticated: false,
                userName: '',
                email: '',
                role: '',
                organisation: '',
            };
        },
    },
});

export const { loginSuccess, logout } = authSlice.actions;
export default authSlice.reducer;
