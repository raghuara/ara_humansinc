import { useSelector } from 'react-redux';
import {
    selectSelectedFinancialYear,
    selectFinancialYearConfig,
} from '../redux/slices/financialYearSlice';

// The one source of truth for "which year am I working in".
//
// This replaces the old per-screen `getCurrentAcademicYear()` helpers, which each
// hard-coded an April start and computed the year locally. Every company sets its
// own financial year (Setup → Financial Year), so the year is server-owned: this
// returns whatever the header is currently showing.
//
// Returns '' when no financial year has been configured yet. Callers must treat
// that as "don't fetch" rather than guessing a year — a guessed year silently
// reads and writes the wrong period's data.
export const useFinancialYear = () => {
    const selected = useSelector(selectSelectedFinancialYear);
    const config = useSelector(selectFinancialYearConfig);
    return selected || config?.currentFinancialYear || '';
};

export default useFinancialYear;
