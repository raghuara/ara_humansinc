import React, { useMemo } from 'react';
import { Box, Stack, Tabs, Tab, Badge } from '@mui/material';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import CorporateFareRoundedIcon from '@mui/icons-material/CorporateFareRounded';
import FolderSharedRoundedIcon from '@mui/icons-material/FolderSharedRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
    selectRequests, selectPendingApprovals, selectOrgDocs, selectEmployeeDocs, requestProgress,
} from '../redux/slices/documentsSlice';
import { PRIMARY, PRIMARY_LIGHT } from '../theme';
import { card, PageHeader, StatCards } from '../components/uiKit';
import EntityField from '../components/EntityField';
import DocumentRequestsTab from '../components/DocumentsComps/DocumentRequestsTab';
import DocumentApprovalsTab from '../components/DocumentsComps/DocumentApprovalsTab';
import OrgDocumentsTab from '../components/DocumentsComps/OrgDocumentsTab';
import EmployeeDocumentsTab from '../components/DocumentsComps/EmployeeDocumentsTab';

// The tab lives in the URL (?tab=approvals) so the inbox and the topbar can
// deep-link straight to the right section.
const TABS = [
    { key: 'requests', label: 'Requests', icon: AssignmentRoundedIcon },
    { key: 'approvals', label: 'Approvals', icon: FactCheckRoundedIcon },
    { key: 'organisation', label: 'Organisation Documents', icon: CorporateFareRoundedIcon },
    { key: 'employee', label: 'Employee Documents', icon: FolderSharedRoundedIcon },
];

export default function DocumentsPage() {
    const [params, setParams] = useSearchParams();
    const requests = useSelector(selectRequests);
    const pending = useSelector(selectPendingApprovals);
    const orgDocs = useSelector(selectOrgDocs);
    const employeeDocs = useSelector(selectEmployeeDocs);

    const tabKey = TABS.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'requests';
    const index = TABS.findIndex((t) => t.key === tabKey);

    const stats = useMemo(() => {
        const open = requests.filter((r) => r.status === 'open');
        const awaited = open.reduce((n, r) => n + requestProgress(r).pending, 0);
        return { open: open.length, awaited, pending: pending.length, filed: employeeDocs.length, org: orgDocs.length };
    }, [requests, pending, employeeDocs, orgDocs]);

    const KPIS = [
        { label: 'Open Requests', value: stats.open, sub: `${stats.awaited} employee(s) yet to upload`, icon: AssignmentRoundedIcon, color: PRIMARY, bg: PRIMARY_LIGHT },
        { label: 'Awaiting Approval', value: stats.pending, sub: 'Submitted, needs your review', icon: PendingActionsRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE' },
        { label: 'Approved & Filed', value: stats.filed, sub: 'Live in employee records', icon: CheckCircleRoundedIcon, color: '#16A34A', bg: '#DCFCE7' },
        { label: 'Organisation Docs', value: stats.org, sub: 'Shared company files', icon: CorporateFareRoundedIcon, color: '#F59E0B', bg: '#FFF7ED' },
    ];

    return (
        <Box sx={{ p: 2 }}>
            <PageHeader
                title="Document Management"
                subtitle="Request documents from employees, review what comes back, and keep shared company files in one place"
            >
                <EntityField />
            </PageHeader>

            <StatCards items={KPIS} />

            {/* Tab bar */}
            <Box sx={{ ...card, px: 1, mb: 1.5 }}>
                <Tabs
                    value={index}
                    onChange={(_, i) => setParams({ tab: TABS[i].key })}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        minHeight: 52,
                        '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0', bgcolor: PRIMARY },
                        '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: 13.5, color: '#64748B', minHeight: 52, px: 2 },
                        '& .Mui-selected': { color: `${PRIMARY} !important` },
                    }}
                >
                    {TABS.map((t) => (
                        <Tab
                            key={t.key}
                            iconPosition="start"
                            icon={
                                t.key === 'approvals' && stats.pending > 0
                                    ? (
                                        <Badge badgeContent={stats.pending} sx={{ '& .MuiBadge-badge': { bgcolor: '#E11D48', color: '#fff', fontSize: 9.5, fontWeight: 800, minWidth: 16, height: 16 } }}>
                                            <t.icon sx={{ fontSize: 18 }} />
                                        </Badge>
                                    )
                                    : <t.icon sx={{ fontSize: 18 }} />
                            }
                            label={t.label}
                        />
                    ))}
                </Tabs>
            </Box>

            {/* Panels — mounted one at a time so each tab's local state resets cleanly */}
            <Stack spacing={1.5}>
                {tabKey === 'requests' && <DocumentRequestsTab />}
                {tabKey === 'approvals' && <DocumentApprovalsTab />}
                {tabKey === 'organisation' && <OrgDocumentsTab />}
                {tabKey === 'employee' && <EmployeeDocumentsTab />}
            </Stack>
        </Box>
    );
}
