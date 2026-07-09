import { createSlice } from '@reduxjs/toolkit';

// Global branding / theme settings consumed by the payroll & leave screens.
const initialState = {
    logo: '',
    title: 'ARA Payroll',
    mainColor: '#2F80ED',
    textColor: '#0F172A',
};

const websiteSettingsSlice = createSlice({
    name: 'websiteSettings',
    initialState,
    reducers: {
        setWebsiteSettings: (state, action) => ({ ...state, ...action.payload }),
    },
});

export const { setWebsiteSettings } = websiteSettingsSlice.actions;
export const selectWebsiteSettings = (state) => state.websiteSettings;
export default websiteSettingsSlice.reducer;
