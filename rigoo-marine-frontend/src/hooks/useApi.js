import { useState, useCallback } from 'react';
import httpClient from '../services/httpClient';

/**
 * Custom hook for making API calls with loading and error states
 * @returns {Object} { data, loading, error, fetchData }
 *
 * @example
 * const { data, loading, error, fetchData } = useApi();
 *
 * useEffect(() => {
 *   fetchData('/api/users');
 * }, []);
 *
 * // Or with async/await
 * const handleSubmit = async () => {
 *   const result = await fetchData('/api/users', { method: 'POST', body });
 * };
 */
export function useApi() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (url, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await httpClient(url, options);
      setData(response.data);
      return response.data;
    } catch (err) {
      setError(err.message || 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, fetchData, reset };
}

/**
 * Hook for GET requests with automatic fetching on mount
 * @param {string} url - API endpoint
 * @param {Object} options - Axios request options
 * @returns {Object} { data, loading, error, refetch }
 *
 * @example
 * const { data, loading, error } = useGet('/api/users');
 */
export function useGet(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await httpClient.get(url, options);
      setData(response.data);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [url, JSON.stringify(options)]);

  useState(() => {
    fetchData();
  });

  return { data, loading, error, refetch: fetchData };
}

export default useApi;
