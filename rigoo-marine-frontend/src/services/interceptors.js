import httpClient from './httpClient';

/**
 * Setup request and response interceptors for the HTTP client
 * Call this function once during app initialization
 */
export function setupInterceptors() {
  // Request Interceptor - Auto-attach auth token
  httpClient.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response Interceptor - Handle common errors
  httpClient.interceptors.response.use(
    (response) => response,
    (error) => {
      // 401 - Unauthorized: Token expired or invalid.
      // Skip the auto-logout for requests that set skipAuthRedirect (e.g. resend-verification)
      // so callers can handle the 401 themselves with a toast instead of a hard redirect.
      if (error.response?.status === 401 && !error.config?.skipAuthRedirect) {
        // Clear auth storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('tokenExpiresAt');

        // Redirect to login (only if not already there)
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }

      // 500 - Server Error
      if (error.response?.status === 500) {
        console.error('Server error:', error.response.data?.message);
        // Could trigger a generic error toast here
      }

      return Promise.reject(error);
    }
  );
}

export default httpClient;
