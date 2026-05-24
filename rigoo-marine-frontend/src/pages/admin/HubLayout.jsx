import { useSearchParams } from 'react-router-dom';
import { Box, Tabs, Tab, Paper } from '@mui/material';

/**
 * Shared tab-based layout for admin hub pages.
 * Persists the active tab in the URL `?tab=N` query param so
 * navigation history and deep links work correctly.
 *
 * @param {{ label: string, icon: ReactNode, component: React.ElementType }[]} tabs
 */
export default function HubLayout({ tabs }) {
  const [params, setParams] = useSearchParams();
  const active = Math.min(
    Math.max(0, parseInt(params.get('tab') ?? '0', 10)),
    tabs.length - 1,
  );

  const { component: Page } = tabs[active];

  return (
    <Box>
      <Paper
        variant="outlined"
        sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}
      >
        <Tabs
          value={active}
          onChange={(_, v) => setParams({ tab: String(v) })}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
        >
          {tabs.map((t) => (
            <Tab
              key={t.label}
              icon={t.icon}
              iconPosition="start"
              label={t.label}
              sx={{ minHeight: 48, fontWeight: 600 }}
            />
          ))}
        </Tabs>
      </Paper>
      <Page />
    </Box>
  );
}
