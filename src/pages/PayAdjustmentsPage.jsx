import React from 'react';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import MoreTimeRoundedIcon from '@mui/icons-material/MoreTimeRounded';
import { useSelector } from 'react-redux';
import TabbedPage from '../components/TabbedPage';
import SalaryAdvancesPage from './SalaryAdvancesPage';
import OvertimePage from './OvertimePage';
import { selectAdvanceRequests } from '../redux/slices/advancesSlice';
import { selectOtRecords } from '../redux/slices/overtimeSlice';

// Advances and overtime are the two things that adjust what an employee is paid
// this month, and both arrive as employee requests needing approval — so they
// belong together, one step from Run Payroll.
export default function PayAdjustmentsPage() {
    const advanceRequests = useSelector(selectAdvanceRequests);
    const otRecords = useSelector(selectOtRecords);
    const otPending = otRecords.filter((r) => r.status === 'pending').length;

    const tabs = [
        { key: 'advances', label: 'Salary Advances', icon: SavingsRoundedIcon, badge: advanceRequests.length, render: () => <SalaryAdvancesPage /> },
        { key: 'overtime', label: 'Overtime (OT)', icon: MoreTimeRoundedIcon, badge: otPending, render: () => <OvertimePage /> },
    ];

    return <TabbedPage tabs={tabs} />;
}
