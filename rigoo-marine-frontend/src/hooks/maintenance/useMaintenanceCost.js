import { useQuery } from '@tanstack/react-query';
import { maintenanceApi } from '../../services/api';

/**
 * Yearly cost analytics. Cached for 5 minutes — the underlying data
 * only changes when the client logs a new history record, so a fresh
 * fetch on every page revisit is wasteful. react-query's
 * {@code staleTime} means the UI shows cached data instantly and only
 * refetches in the background when stale.
 */
export default function useMaintenanceCost(year) {
  return useQuery({
    queryKey: ['maintenance', 'analytics', 'cost', year],
    queryFn: () => maintenanceApi.getCostSummary(year),
    staleTime: 5 * 60 * 1000,
    enabled: year != null,
  });
}
