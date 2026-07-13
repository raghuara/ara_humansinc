import React from 'react';
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import TabbedPage from '../components/TabbedPage';
import SalaryStructures from '../components/LeaveAttendanceComps/PayrollComps/SalaryStructures';
import ComplianceSettings from '../components/LeaveAttendanceComps/PayrollComps/ComplianceSettings';
import BankReports from '../components/LeaveAttendanceComps/PayrollComps/BankReports';

// Payroll configuration — the three screens you set up once and rarely revisit.
// Keeping them out of the monthly Payroll flow is what stops that section from
// burying Run Payroll under things you never click.
const TABS = [
    { key: 'structures', label: 'Salary Structures', icon: RequestQuoteRoundedIcon, render: () => <SalaryStructures /> },
    { key: 'statutory', label: 'Statutory Deductions', icon: VerifiedUserRoundedIcon, render: () => <ComplianceSettings /> },
    { key: 'bank', label: 'Bank Details', icon: AccountBalanceWalletRoundedIcon, render: () => <BankReports /> },
];

export default function PayrollSetupPage() {
    return <TabbedPage tabs={TABS} />;
}
