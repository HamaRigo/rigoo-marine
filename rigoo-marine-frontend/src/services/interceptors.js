import httpClient from './httpClient';

const SESSION_KEY = 'rigoo.auth.expired';

export function setupInterceptors() {
  // ── Request: attach token ─────────────────────────────────────────────────
  httpClient.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    },
    (error) => Promise.reject(error)
  );

  // ── Response: normalise errors ────────────────────────────────────────────
  httpClient.interceptors.response.use(
    (response) => response,
    (error) => {
      const status  = error.response?.status;
      const skip    = error.config?.skipAuthRedirect;
      const onLogin = window.location.pathname.includes('/login');

      if (status === 401 && !skip) {
        // Clear local auth state
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('tokenExpiresAt');

        if (!onLogin) {
          // Authenticated request expired — flag for Login page to show banner
          sessionStorage.setItem(SESSION_KEY, '1');
          const next = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/login?next=${next}`;
        }
        // If already on /login the 401 is for wrong credentials — let the
        // form's catch block handle it (getApiError will extract the message).
      }

      // Always propagate so callers can handle with getApiError()
      return Promise.reject(error);
    }
  );
}

/** Used by Login.jsx to consume the session-expired flag exactly once. */
export function consumeSessionExpiredFlag() {
  const flagged = sessionStorage.getItem(SESSION_KEY) === '1';
  if (flagged) sessionStorage.removeItem(SESSION_KEY);
  return flagged;
}

export default httpClient;
