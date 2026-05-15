import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import NotificationBell from '../NotificationBell';

// Mock the i18next hook to avoid a full i18n init — we only need t() to
// return a deterministic string per key.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en' },
  }),
}));

// Mock the hooks the bell uses. We don't exercise the network layer here;
// the hook tests in useNotifications.test.jsx already cover that. This
// test focuses on the UI: badge presence, "99+" cap, dropdown header.
vi.mock('../../../hooks/notifications/useNotifications', () => ({
  useUnreadCount:  vi.fn(),
  useUnreadList:   vi.fn(() => ({ data: [], isLoading: false })),
  useMarkRead:     vi.fn(() => ({ mutate: vi.fn() })),
  useMarkAllRead:  vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));
import { useUnreadCount } from '../../../hooks/notifications/useNotifications';

function renderBell() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('NotificationBell', () => {
  it('hides the badge when unread count is zero', () => {
    useUnreadCount.mockReturnValue({ data: 0 });
    renderBell();
    // MUI's Badge with invisible=true still renders a span but with
    // aria-hidden + a hidden class. Numeric badge content shouldn't appear.
    expect(screen.queryByText('0')).toBeNull();
  });

  it('shows the unread count when present', () => {
    useUnreadCount.mockReturnValue({ data: 3 });
    renderBell();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('caps the displayed badge at "99+"', () => {
    useUnreadCount.mockReturnValue({ data: 247 });
    renderBell();
    // The UI cap is the user-visible promise: no badge can show >99 inline,
    // so the rendered text is exactly "99+".
    expect(screen.getByText('99+')).toBeInTheDocument();
    expect(screen.queryByText('247')).toBeNull();
  });
});
