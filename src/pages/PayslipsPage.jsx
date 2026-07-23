import React from 'react';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import { useSelector } from 'react-redux';
import TabbedPage from '../components/TabbedPage';
import ApprovePayroll from '../components/LeaveAttendanceComps/PayrollComps/ApprovePayroll';
import PayslipRequestScreen from '../components/PayrollComps/PayslipRequestScreen';
import { selectUserTypeId, USER_TYPE } from '../redux/slices/authSlice';

// Payslips host.
//   • Employee (userTypeId 3) → the self-service request screen ONLY. There is
//     no approval side for them.
//   • Everyone else → the approvals grid PLUS their own request screen, since
//     requesting your own payslips is common to every login.
const TABS = [
    { key: 'approvals', label: 'Approvals', icon: FactCheckRoundedIcon, render: () => <ApprovePayroll /> },
    { key: 'requests', label: 'My Requests', icon: ReceiptLongRoundedIcon, render: () => <PayslipRequestScreen /> },
];

export default function PayslipsPage() {
    const isEmployee = useSelector(selectUserTypeId) === USER_TYPE.EMPLOYEE;
    if (isEmployee) return <PayslipRequestScreen />;
    return <TabbedPage tabs={TABS} />;
}
