import { useState, useEffect, useRef, useCallback } from 'react';
import { deliveryApi } from './api';

const MAX_BACKOFF = 8;

/**
 * Fast-polling hook for driver positions.
 * - Pauses when the browser tab is hidden (Page Visibility API).
 * - Uses setTimeout scheduling so each poll starts after the previous one
 *   completes — avoids concurrent requests on slow networks.
 * - Exponential backoff on errors (base → base×2 → … → base×8), resets on success.
 */
export function useDeliveryPositions({ enabled = true, intervalMs = 5_000 } = {}) {
  const [positions, setPositions]     = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError]             = useState(false);

  const timerRef   = useRef(null);
  const backoffRef = useRef(1);
  const activeRef  = useRef(false);

  const schedule = useCallback((delayMs) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (!activeRef.current || document.hidden) {
        schedule(intervalMs);
        return;
      }
      try {
        const data = await deliveryApi.adminListPositions();
        if (!activeRef.current) return;
        setPositions(data);
        setLastUpdated(Date.now());
        setError(false);
        backoffRef.current = 1;
        schedule(intervalMs);
      } catch {
        if (!activeRef.current) return;
        setError(true);
        const next = Math.min(backoffRef.current * 2, MAX_BACKOFF);
        backoffRef.current = next;
        schedule(intervalMs * next);
      }
    }, delayMs);
  }, [intervalMs]);

  useEffect(() => {
    if (!enabled) return;
    activeRef.current  = true;
    backoffRef.current = 1;
    schedule(0);

    const onVisible = () => {
      if (!document.hidden && activeRef.current) {
        backoffRef.current = 1;
        schedule(0);
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      activeRef.current = false;
      clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, schedule]);

  return { positions, lastUpdated, error };
}

/** Breadcrumb trail for a single driver (uses shared Axios instance → auth headers). */
export async function fetchPositionHistory(techId, limit = 40) {
  try {
    return await deliveryApi.getPositionHistory(techId, limit);
  } catch {
    return [];
  }
}
