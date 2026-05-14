import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const KEY_PAGE = ['notifications', 'page'];
const KEY_UNREAD = ['notifications', 'unread'];
const KEY_COUNT = ['notifications', 'count'];

/**
 * Live unread badge for the navbar. Polls every 30s while the dashboard tab
 * is in focus; pauses when the user switches away. The 30s cadence is a
 * deliberate compromise — fast enough to feel current after a Kafka event
 * lands, slow enough that an idle dashboard doesn't hammer the gateway.
 *
 * staleTime=10s so a hard refresh of the page within that window doesn't
 * refetch — keeps perceived load fast.
 */
export function useUnreadCount(enabled = true) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: KEY_COUNT,
    queryFn: notificationApi.getUnreadCount,
    enabled: enabled && isAuthenticated,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
    staleTime: 10 * 1000,
  });
}

export function useUnreadList(enabled = true) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: KEY_UNREAD,
    queryFn: notificationApi.getUnread,
    enabled: enabled && isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useNotificationsPage(params) {
  return useQuery({
    queryKey: [...KEY_PAGE, params],
    queryFn: () => notificationApi.getPage(params),
    keepPreviousData: true,
    staleTime: 30 * 1000,
  });
}

/**
 * Mark-read mutation with optimistic update on the unread count + list so the
 * UI reacts immediately, before the round-trip completes. Falls back to
 * server state on error.
 */
export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => notificationApi.markRead(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: KEY_COUNT });
      await qc.cancelQueries({ queryKey: KEY_UNREAD });
      const previousCount = qc.getQueryData(KEY_COUNT);
      const previousUnread = qc.getQueryData(KEY_UNREAD);
      if (typeof previousCount === 'number' && previousCount > 0) {
        qc.setQueryData(KEY_COUNT, previousCount - 1);
      }
      if (Array.isArray(previousUnread)) {
        qc.setQueryData(KEY_UNREAD, previousUnread.filter((n) => n.id !== id));
      }
      return { previousCount, previousUnread };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previousCount !== undefined) qc.setQueryData(KEY_COUNT, ctx.previousCount);
      if (ctx?.previousUnread !== undefined) qc.setQueryData(KEY_UNREAD, ctx.previousUnread);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY_COUNT });
      qc.invalidateQueries({ queryKey: KEY_UNREAD });
      qc.invalidateQueries({ queryKey: KEY_PAGE });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      qc.setQueryData(KEY_COUNT, 0);
      qc.setQueryData(KEY_UNREAD, []);
      qc.invalidateQueries({ queryKey: KEY_PAGE });
    },
  });
}
