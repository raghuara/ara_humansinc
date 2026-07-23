import React from 'react';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import TabbedPage from '../components/TabbedPage';
import DepartmentsPage from './DepartmentsPage';
import DesignationsPage from './DesignationsPage';

// Departments and designations under one sidebar entry. Business Entities lives
// on its own page (/dashboard/entities), reached from the sidebar's "Working in"
// switcher → Manage entities — not as a tab here.
const TABS = [
    { key: 'departments', label: 'Departments', icon: AccountTreeRoundedIcon, module: 'departments', render: () => <DepartmentsPage /> },
    { key: 'designations', label: 'Designations', icon: WorkspacePremiumRoundedIcon, module: 'designations', render: () => <DesignationsPage /> },
];

export default function OrganisationPage() {
    return <TabbedPage tabs={TABS} />;
}
