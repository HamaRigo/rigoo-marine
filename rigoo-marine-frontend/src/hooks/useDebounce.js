import { useState, useEffect, useRef } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms of
 * silence. The timer is stored in a ref so changing `delay` at runtime never
 * triggers a spurious state update — only actual value changes do.
 */
export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  const delayRef = useRef(delay);
  delayRef.current = delay;

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayRef.current);
    return () => clearTimeout(id);
  }, [value]);

  return debounced;
}

export default useDebounce;
