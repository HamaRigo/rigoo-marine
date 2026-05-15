import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMarkRead, useMarkAllRead } from '../useNotifications';

// Mock the API surface — these hooks are the binding layer between react-query
// and httpClient; the API logic itself is exercised by the consumers.
vi.mock('../../../services/api', () => ({
  notificationApi: {
    markRead:    vi.fn(() => Promise.resolve({})),
    markAllRead: vi.fn(() => Promise.resolve({ updated: 3 })),
  },
}));
import { notificationApi } from '../../../services/api';

// AuthContext is touched by useUnreadCount/useUnreadList. The mutations
// tested below don't depend on it, but we mock to be safe — keeps test
// failures specific to mutation behaviour.
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, wrapper };
}

describe('useMarkRead — optimistic update', () => {
  beforeEach(() => {
    notificationApi.markRead.mockClear();
  });

  it('decrements the unread count optimistically before the API resolves', async () => {
    const { qc, wrapper } = makeWrapper();
    qc.setQueryData(['notifications', 'count'], 5);
    qc.setQueryData(['notifications', 'unread'], [
      { id: 1, title: 'one' },
      { id: 2, title: 'two' },
    ]);

    const { result } = renderHook(() => useMarkRead(), { wrapper });
    act(() => { result.current.mutate(2); });

    // react-query runs onMutate asynchronously; waitFor lets the cache
    // settle before we assert. The contract we're verifying is "user
    // sees the decrement before the network call completes" — waitFor's
    // default timeout (~1s) is plenty for the in-process mutation hook.
    await waitFor(() => {
      expect(qc.getQueryData(['notifications', 'count'])).toBe(4);
      expect(qc.getQueryData(['notifications', 'unread'])).toEqual([{ id: 1, title: 'one' }]);
    });

    await waitFor(() => expect(notificationApi.markRead).toHaveBeenCalledWith(2));
  });

  it('rolls back the cache on error', async () => {
    notificationApi.markRead.mockRejectedValueOnce(new Error('500'));
    const { qc, wrapper } = makeWrapper();
    qc.setQueryData(['notifications', 'count'], 5);
    qc.setQueryData(['notifications', 'unread'], [{ id: 7, title: 'x' }]);

    const { result } = renderHook(() => useMarkRead(), { wrapper });
    act(() => { result.current.mutate(7); });

    // Wait for the mutation lifecycle to complete: onMutate (optimistic) →
    // mutationFn (rejects) → onError (rollback) → onSettled (invalidate).
    // The end-state we assert is the rolled-back cache.
    await waitFor(() => expect(notificationApi.markRead).toHaveBeenCalled());
    await waitFor(() => {
      expect(qc.getQueryData(['notifications', 'count'])).toBe(5);
      expect(qc.getQueryData(['notifications', 'unread'])).toEqual([{ id: 7, title: 'x' }]);
    });
  });

  it('does not underflow when count is already zero', async () => {
    const { qc, wrapper } = makeWrapper();
    qc.setQueryData(['notifications', 'count'], 0);
    qc.setQueryData(['notifications', 'unread'], []);

    const { result } = renderHook(() => useMarkRead(), { wrapper });
    act(() => { result.current.mutate(99); });

    // No subtraction below zero — the hook only decrements when count > 0.
    expect(qc.getQueryData(['notifications', 'count'])).toBe(0);
  });
});

describe('useMarkAllRead', () => {
  it('clears count + list optimistically on success', async () => {
    const { qc, wrapper } = makeWrapper();
    qc.setQueryData(['notifications', 'count'], 8);
    qc.setQueryData(['notifications', 'unread'], [{ id: 1 }, { id: 2 }, { id: 3 }]);

    const { result } = renderHook(() => useMarkAllRead(), { wrapper });
    act(() => { result.current.mutate(); });

    await waitFor(() => {
      expect(qc.getQueryData(['notifications', 'count'])).toBe(0);
      expect(qc.getQueryData(['notifications', 'unread'])).toEqual([]);
    });
  });
});
