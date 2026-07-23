import React from 'react';
import { Box, Tabs, Tab, Badge } from '@mui/material';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import WorkOutlineRoundedIcon from '@mui/icons-material/WorkOutlineRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import TodayRoundedIcon from '@mui/icons-material/TodayRounded';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
    selectOpenVacancies, selectOpenPositions, selectInterviewsToday,
    selectAwaitingReview, selectCandidates,
} from '../redux/slices/recruitmentSlice';
import { selectEffectiveModules } from '../redux/slices/authSlice';
import { hasModule } from '../data/serverModules';
import { PRIMARY, PRIMARY_LIGHT } from '../theme';
import { card, PageHeader, StatCards } from '../components/uiKit';
import InterviewsTab from '../components/RecruitmentComps/InterviewsTab';
import VacanciesTab from '../components/RecruitmentComps/VacanciesTab';
import CandidatesTab from '../components/RecruitmentComps/CandidatesTab';

const TABS = [
    { key: 'interviews', label: 'Interviews', icon: EventAvailableRoundedIcon, module: 'recruitment-interviews' },
    { key: 'vacancies', label: 'Vacancies', icon: WorkOutlineRoundedIcon, module: 'recruitment-vacancies' },
    { key: 'candidates', label: 'Candidates', icon: PeopleAltRoundedIcon, module: 'recruitment-candidates' },
];

export default function RecruitmentPage() {
    const [params, setParams] = useSearchParams();
    const openVacancies = useSelector(selectOpenVacancies);
    const openPositions = useSelector(selectOpenPositions);
    const todayList = useSelector(selectInterviewsToday);
    const awaiting = useSelector(selectAwaitingReview);
    const candidates = useSelector(selectCandidates);
    const modules = useSelector(selectEffectiveModules);

    // Only the tabs this role's module list allows; a denied/absent ?tab= falls
    // back to the first allowed tab. Interviews is the daily screen, so it leads.
    const shownTabs = TABS.filter((t) => !t.module || hasModule(modules, t.module));
    const visibleTabs = shownTabs.length ? shownTabs : TABS.slice(0, 1);
    const tabKey = visibleTabs.some((t) => t.key === params.get('tab')) ? params.get('tab') : visibleTabs[0].key;
    const index = visibleTabs.findIndex((t) => t.key === tabKey);

    const inPipeline = candidates.filter((c) => ['applied', 'interviewing', 'on-hold', 'selected'].includes(c.status)).length;
    const joined = candidates.filter((c) => c.status === 'joined').length;

    const KPIS = [
        { label: 'Open Positions', value: openPositions, sub: `Across ${openVacancies.length} open role${openVacancies.length === 1 ? '' : 's'}`, icon: WorkOutlineRoundedIcon, color: PRIMARY, bg: PRIMARY_LIGHT },
        { label: 'Interviews Today', value: todayList.length, sub: todayList.length ? `Next at ${todayList[0].time}` : 'Nothing on the calendar', icon: TodayRoundedIcon, color: '#0EA5E9', bg: '#E0F2FE' },
        { label: 'Awaiting Review', value: awaiting.length, sub: 'Conducted, no outcome yet', icon: RateReviewRoundedIcon, color: '#F59E0B', bg: '#FFF7ED' },
        { label: 'In Pipeline', value: inPipeline, sub: `${joined} joined so far`, icon: HowToRegRoundedIcon, color: '#16A34A', bg: '#DCFCE7' },
    ];

    return (
        <Box>
            <Box sx={{ p: 2, pb: 0 }}>
                {/* Entity comes from the sidebar's "Working in" switcher and travels
                    on the X-Entity-Id header — no per-page entity picker. */}
                <PageHeader
                    title="Recruitment"
                    subtitle="Open a vacancy, add candidates against it, then run them through interview rounds"
                />

                <StatCards items={KPIS} />

                {/* Tab bar — the tab lives in the URL so the dashboard can link straight in */}
                <Box sx={{ ...card, px: 1 }}>
                    <Tabs
                        value={index}
                        onChange={(_, i) => setParams({ tab: visibleTabs[i].key }, { replace: true })}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            minHeight: 52,
                            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0', bgcolor: PRIMARY },
                            '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: 13.5, color: '#64748B', minHeight: 52, px: 2 },
                            '& .Mui-selected': { color: `${PRIMARY} !important` },
                        }}
                    >
                        {visibleTabs.map((t) => (
                            <Tab
                                key={t.key}
                                iconPosition="start"
                                label={t.label}
                                icon={
                                    t.key === 'interviews' && awaiting.length > 0 ? (
                                        <Badge
                                            badgeContent={awaiting.length}
                                            max={99}
                                            sx={{ '& .MuiBadge-badge': { bgcolor: '#E11D48', color: '#fff', fontSize: 9.5, fontWeight: 800, minWidth: 16, height: 16 } }}
                                        >
                                            <t.icon sx={{ fontSize: 18 }} />
                                        </Badge>
                                    ) : (
                                        <t.icon sx={{ fontSize: 18 }} />
                                    )
                                }
                            />
                        ))}
                    </Tabs>
                </Box>
            </Box>

            {tabKey === 'interviews' && <InterviewsTab />}
            {tabKey === 'vacancies' && <VacanciesTab />}
            {tabKey === 'candidates' && <CandidatesTab />}
        </Box>
    );
}
