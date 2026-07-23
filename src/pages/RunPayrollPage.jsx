import React from 'react';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import TabbedPage from '../components/TabbedPage';
import MarkSalaryCreditedPage from '../components/LeaveAttendanceComps/PayrollComps/MarkSalaryCreditedPage';
import SalaryRegister from '../components/LeaveAttendanceComps/PayrollComps/SalaryRegister';

// The monthly payroll run, in the order you work it: the Register comes first —
// that's where you Run Payroll (lock attendance + calculate) — then Approve &
// Credit is where you approve the run and mark salaries credited.
// `module` gates each tab on the login's access — hidden if not held, and
// unreachable by ?tab= URL too.
const TABS = [
    { key: 'register', label: 'Register', icon: ReceiptLongRoundedIcon, module: 'payroll-register', render: () => <SalaryRegister /> },
    { key: 'approve', label: 'Approve & Credit', icon: HowToRegRoundedIcon, module: 'run-payroll', render: () => <MarkSalaryCreditedPage /> },
];

export default function RunPayrollPage() {
    return <TabbedPage tabs={TABS} />;
}
