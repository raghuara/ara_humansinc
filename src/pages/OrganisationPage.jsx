import React from 'react';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import TabbedPage from '../components/TabbedPage';
import BusinessEntitiesPage from './BusinessEntitiesPage';
import DepartmentsPage from './DepartmentsPage';
import DesignationsPage from './DesignationsPage';

// The three organisation masters under one sidebar entry. They're siblings —
// you set up an entity, then its departments, then its designations — so tabs
// beat three separate nav rows.
const TABS = [
    { key: 'entities', label: 'Business Entities', icon: ApartmentRoundedIcon, render: () => <BusinessEntitiesPage /> },
    { key: 'departments', label: 'Departments', icon: AccountTreeRoundedIcon, render: () => <DepartmentsPage /> },
    { key: 'designations', label: 'Designations', icon: WorkspacePremiumRoundedIcon, render: () => <DesignationsPage /> },
];

export default function OrganisationPage() {
    return <TabbedPage tabs={TABS} />;
}
