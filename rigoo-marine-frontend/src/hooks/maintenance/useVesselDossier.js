import { useQuery } from '@tanstack/react-query';
import { maintenanceApi } from '../../services/api';

/**
 * Single round-trip read of the vessel maintenance dossier (history + schedule
 * + engine hours). All three tabs of the detail page derive from this — no
 * over-fetching. 60s staleTime so quick tab-switches don't re-network; mutations
 * invalidate on success.
 */
export default function useVesselDossier(vesselId) {
  return useQuery({
    queryKey: ['maintenance', 'dossier', vesselId],
    queryFn: () => maintenanceApi.getDossier(vesselId),
    enabled: !!vesselId,
    staleTime: 60 * 1000,
  });
}

export const dossierKey = (vesselId) => ['maintenance', 'dossier', vesselId];
