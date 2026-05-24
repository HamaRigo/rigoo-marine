import { useState, useEffect, useRef } from 'react';
import { deliveryApi } from './api';

/**
 * Fast-polling hook for driver positions.
 * Uses 5s interval by default — positions are lightweight Redis reads.
 * Returns positions[], lastUpdated epoch ms, and error flag.
 */
export function useDeliveryPositions({ enabled = true, intervalMs = 5_000 } = {}) {
  const [positions, setPositions]     = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError]             = useState(false);
  const cancelRef                     = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    cancelRef.current = false;

    const poll = async () => {
      try {
        const data = await deliveryApi.adminListPositions();
        if (!cancelRef.current) {
          setPositions(data);
          setLastUpdated(Date.now());
          setError(false);
        }
      } catch {
        if (!cancelRef.current) setError(true);
      }
    };

    poll();
    const id = setInterval(poll, intervalMs);
    return () => {
      cancelRef.current = true;
      clearInterval(id);
    };
  }, [enabled, intervalMs]);

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
