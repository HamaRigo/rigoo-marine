import { useQuery } from '@tanstack/react-query';
import { maintenanceApi } from '../../services/api';

export default function useUpcomingServices() {
  return useQuery({
    queryKey: ['maintenance', 'upcoming'],
    queryFn: maintenanceApi.getUpcoming,
    staleTime: 2 * 60 * 1000,
  });
}
