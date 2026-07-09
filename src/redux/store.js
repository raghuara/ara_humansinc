import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import sidebarReducer from './slices/sidebarSlice';
import websiteSettingsReducer from './slices/websiteSettingsSlice';
import academicYearReducer from './slices/academicYearSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        sidebar: sidebarReducer,
        websiteSettings: websiteSettingsReducer,
        academicYear: academicYearReducer,
    },
});

export default store;
