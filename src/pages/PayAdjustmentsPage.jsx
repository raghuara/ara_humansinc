import React from 'react';
import SavingsRoundedIcon from '@mui/icons-material/SavingsRounded';
import MoreTimeRoundedIcon from '@mui/icons-material/MoreTimeRounded';
import { useSelector } from 'react-redux';
import TabbedPage from '../components/TabbedPage';
import SalaryAdvancesPage from './SalaryAdvancesPage';
import OvertimePage from './OvertimePage';
import AdvanceRequestScreen from '../components/PayrollComps/AdvanceRequestScreen';
import OvertimeRequestScreen from '../components/PayrollComps/OvertimeRequestScreen';
import { selectAdvanceRequests } from '../redux/slices/advancesSlice';
import { selectOtRecords } from '../redux/slices/overtimeSlice';
import { selectUserTypeId, USER_TYPE } from '../redux/slices/authSlice';

// Advances and overtime are the two things that adjust what an employee is paid
// this month, and both arrive as employee requests needing approval — so they
// belong together, one step from Run Payroll.
//
// An employee sees the self-service REQUEST screen (raise + track their own);
// everyone else sees the admin dashboard (all requests, approve/reject).
export default function PayAdjustmentsPage() {
    const advanceRequests = useSelector(selectAdvanceRequests);
    const otRecords = useSelector(selectOtRecords);
    const otPending = otRecords.filter((r) => r.status === 'pending').length;
    const isEmployee = useSelector(selectUserTypeId) === USER_TYPE.EMPLOYEE;

    const tabs = [
        { key: 'advances', label: 'Salary Advances', icon: SavingsRoundedIcon, module: 'advances', badge: isEmployee ? 0 : advanceRequests.length, render: () => (isEmployee ? <AdvanceRequestScreen /> : <SalaryAdvancesPage />) },
        { key: 'overtime', label: 'Overtime (OT)', icon: MoreTimeRoundedIcon, module: 'overtime', badge: isEmployee ? 0 : otPending, render: () => (isEmployee ? <OvertimeRequestScreen /> : <OvertimePage />) },
    ];

    return <TabbedPage tabs={tabs} />;
}
