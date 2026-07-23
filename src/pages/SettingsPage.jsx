import React from 'react';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import TabbedPage from '../components/TabbedPage';
import EmployeeIdFormatPage from './EmployeeIdFormatPage';
import FinancialYearPage from './FinancialYearPage';

// Company-wide setup that you configure once and rarely revisit. Reached from
// the profile menu in the header rather than the sidebar — these aren't screens
// you work in day to day.
//
// Both tabs used to live elsewhere: the login ID format was a card wedged above
// the Employees directory, and the financial year had its own sidebar route
// (/dashboard/financial-year, now redirected here).
const TABS = [
    { key: 'employee-ids', label: 'Employee IDs', icon: BadgeRoundedIcon, render: () => <EmployeeIdFormatPage /> },
    { key: 'financial-year', label: 'Financial Year', icon: CalendarMonthRoundedIcon, render: () => <FinancialYearPage /> },
];

export default function SettingsPage() {
    return <TabbedPage tabs={TABS} />;
}
