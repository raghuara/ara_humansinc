import React from 'react';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import TabbedPage from '../components/TabbedPage';
import LeaveMasterScreen from '../components/LeaveAttendanceComps/PayrollComps/LeaveMasterScreen';

// Leave Policy was already one tabbed screen — it had just been split into four
// routes that each hid its tab bar and jumped to a fixed tab. We keep that same
// `hideTabBar` + `initialTab` contract (so the screen itself is untouched) and
// drive it from the shared URL-based tab bar instead, which is what makes the
// four sidebar rows collapse into one.
//
// `key` forces a remount per tab: the screen copies `initialTab` into state on
// mount, so without it the content would not follow the tab you clicked.
const TABS = [
    { key: 'setup', label: 'Policy Setup', icon: RuleRoundedIcon, render: () => <LeaveMasterScreen key="lp-setup" initialTab={0} hideTabBar /> },
    { key: 'types', label: 'Leave Types', icon: CategoryRoundedIcon, render: () => <LeaveMasterScreen key="lp-types" initialTab={1} hideTabBar /> },
    { key: 'calendar', label: 'Working Calendar', icon: CalendarMonthRoundedIcon, render: () => <LeaveMasterScreen key="lp-calendar" initialTab={2} hideTabBar /> },
    { key: 'shifts', label: 'Assign Shifts', icon: ScheduleRoundedIcon, render: () => <LeaveMasterScreen key="lp-shifts" initialTab={3} hideTabBar /> },
];

export default function LeavePolicyPage() {
    return <TabbedPage tabs={TABS} />;
}
