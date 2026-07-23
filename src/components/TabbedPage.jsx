import React from 'react';
import { Box, Tabs, Tab, Badge } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectEffectiveModules } from '../redux/slices/authSlice';
import { hasModule } from '../data/serverModules';
import { PRIMARY } from '../theme';
import { card } from './uiKit';

// ── Tabbed page shell ───────────────────────────────────────────────────────
// Hosts several existing pages under one sidebar entry. The pages themselves
// are rendered untouched — each still brings its own header, padding and
// content — so this only adds the bar that switches between them.
//
// The active tab lives in the URL (?tab=departments), not in React state. That
// keeps refresh, back/forward, breadcrumbs and deep links (the Inbox links
// straight into Documents → Approvals) all working. An unknown or missing
// ?tab falls back to the first tab rather than rendering nothing.
//
// A tab may carry a `module` key. If the login doesn't hold it, the tab is
// hidden AND its content is unreachable — deep-linking ?tab= to a denied tab
// falls back to the first allowed one, so the URL can't bypass access either.
// Tabs with no `module` are ungated (fail-open), same rule as the sidebar.
//
// tabs: [{ key, label, icon, badge?, module?, render: () => <Page /> }]
export default function TabbedPage({ tabs }) {
    const [params, setParams] = useSearchParams();
    const modules = useSelector(selectEffectiveModules);

    const allowedTabs = tabs.filter((t) => !t.module || hasModule(modules, t.module));
    // If access hides every tab there's nothing to show — render the bar empty
    // rather than crash on tabs[0]; the route guard normally prevents this.
    const visibleTabs = allowedTabs.length ? allowedTabs : tabs.slice(0, 1);

    const requested = params.get('tab');
    const activeKey = visibleTabs.some((t) => t.key === requested) ? requested : visibleTabs[0].key;
    const index = visibleTabs.findIndex((t) => t.key === activeKey);

    // `replace` keeps tab-hopping out of the history stack, so Back leaves the
    // page instead of walking through every tab you touched.
    const select = (_, i) => setParams({ tab: visibleTabs[i].key }, { replace: true });

    return (
        <Box>
            <Box sx={{ px: 2, pt: 2 }}>
                <Box sx={{ ...card, px: 1 }}>
                    <Tabs
                        value={index}
                        onChange={select}
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
                                    t.badge > 0 ? (
                                        <Badge
                                            badgeContent={t.badge}
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

            {/* Only the active tab is mounted, so each page's local state starts
                clean and no hidden page keeps polling or holding stale data. */}
            {visibleTabs[index].render()}
        </Box>
    );
}
