import { createSlice } from '@reduxjs/toolkit';

// Selected academic / financial year. When empty, screens fall back to their
// own getCurrentAcademicYear() helper.
const initialState = { value: '' };

const academicYearSlice = createSlice({
    name: 'academicYear',
    initialState,
    reducers: {
        setAcademicYear: (state, action) => { state.value = action.payload; },
    },
});

export const { setAcademicYear } = academicYearSlice.actions;
export const selectAcademicYear = (state) => state.academicYear.value;
export default academicYearSlice.reducer;
