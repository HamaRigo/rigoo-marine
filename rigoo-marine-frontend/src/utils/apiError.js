import i18n from '../i18n';

/**
 * Extract a user-facing message from an Axios error.
 *
 * Priority:
 *  1. Backend body: checks "message", "error", and "detail" fields
 *     (different endpoints use different keys — login uses "error", others "message").
 *  2. HTTP status → i18n key in common:errors
 *  3. No response (network / CORS / timeout) → common:errors.network
 *
 * Never surfaces the raw Axios "Request failed with status code N" string.
 *
 * @param {import('axios').AxiosError} err
 * @returns {string} Translated, user-ready message
 */
export function getApiError(err) {
  const data = err?.response?.data;

  // Use the backend-provided message when present
  if (data && typeof data === 'object') {
    const msg = data.message || data.error || data.detail;
    if (msg && typeof msg === 'string' && msg.trim()) return msg;
  }

  // No HTTP response at all — network issue, CORS block, or request timeout
  if (!err?.response) {
    return i18n.t('common:errors.network');
  }

  const status = err.response.status;
  if (status === 400) return i18n.t('common:errors.badRequest');
  if (status === 401) return i18n.t('common:errors.unauthorized');
  if (status === 403) return i18n.t('common:errors.forbidden');
  if (status === 404) return i18n.t('common:errors.notFound');
  if (status === 409) return i18n.t('common:errors.conflict');
  if (status === 422) return i18n.t('common:errors.validation');
  if (status === 429) return i18n.t('common:errors.rateLimit');
  if (status >= 500)  return i18n.t('common:errors.server');
  return i18n.t('common:errors.unknown');
}
