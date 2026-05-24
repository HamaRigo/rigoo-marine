import httpClient from './httpClient';

/**
 * API Service Layer
 * All API calls organized by domain
 * Uses Axios HTTP client with interceptors for auth handling
 */

// ============== AUTH APIs ==============
export const authApi = {
  /**
   * Login by phone (preferred) or email + password.
   * @param {string} identifier  phone (E.164 or local) or email
   * @param {string} password
   * @returns {Promise<{user: object, token: string, refreshToken?: string, expiresAt?: string}>}
   */
  login: async (identifier, password) => {
    const looksLikeEmail = typeof identifier === 'string' && identifier.includes('@');
    const body = looksLikeEmail ? { email: identifier, password } : { phone: identifier, password };
    const response = await httpClient.post('/auth/login', body);
    return response.data;
  },

  /**
   * Register new user
   * @param {object} userData - { name, email, phone, password, userType }
   * @returns {Promise<{user: object, token: string, refreshToken?: string, expiresAt?: string}>}
   */
  register: async (userData) => {
    const response = await httpClient.post('/auth/register', userData);
    return response.data;
  },

  /**
   * Revoke the current JWT server-side. client-service writes the token's jti
   * to a Redis revocation list; the api-gateway rejects any subsequent request
   * bearing the same jti. Caller should clear local state after this resolves.
   * @returns {Promise<{message: string}>}
   */
  logout: async () => {
    const response = await httpClient.post('/auth/logout');
    return response.data;
  },

  /**
   * Request an SMS one-time code for the given phone. Backend is enumeration-
   * safe — same response whether the phone matches an account or not. Caller
   * should always advance to the code-entry step on success.
   * @param {string} phone  raw or E.164; backend normalizes via libphonenumber
   * @returns {Promise<{message: string}>}
   */
  requestOtp: async (phone) => {
    const response = await httpClient.post('/auth/otp/request', { phone });
    return response.data;
  },

  /**
   * Verify an SMS one-time code. On success returns the standard login
   * response shape so AuthContext can persist exactly as with password login.
   * @param {string} phone
   * @param {string} code  6-digit numeric
   * @returns {Promise<{user: object, token: string, expiresAt?: string}>}
   */
  verifyOtp: async (phone, code) => {
    const response = await httpClient.post('/auth/otp/verify', { phone, code });
    return response.data;
  },

  /**
   * Request password reset
   * @param {string} email
   * @returns {Promise<{message: string}>}
   */
  forgotPassword: async (email) => {
    const response = await httpClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Reset password with token
   * @param {string} token - Reset token from email
   * @param {string} newPassword
   * @returns {Promise<{message: string}>}
   */
  resetPassword: async (token, newPassword) => {
    const response = await httpClient.post('/auth/reset-password', { token, newPassword });
    return response.data;
  },

  /**
   * Verify email address
   * @param {string} token - Verification token from email
   * @returns {Promise<{message: string}>}
   */
  verifyEmail: async (token) => {
    const response = await httpClient.post('/auth/verify-email', { token });
    return response.data;
  },

  /**
   * Resend verification email (auth required)
   * @returns {Promise<{message: string}>}
   */
  resendVerification: async () => {
    // skipAuthRedirect: a 401 here (e.g. revoked token) should show an error
    // toast via the caller's catch block rather than silently logging the user out.
    const response = await httpClient.post('/auth/resend-verification', {}, { skipAuthRedirect: true });
    return response.data;
  },

  /**
   * Reset password with token (Task #6)
   */
  resetPasswordWithToken: async (token, newPassword) => {
    const response = await httpClient.post('/auth/reset-password', { token, newPassword });
    return response.data;
  },

  /**
   * Refresh auth token
   * @returns {Promise<{token: string, expiresAt: string}>}
   */
  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await httpClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  /**
   * Get current user profile
   * @returns {Promise<{user: object}>}
   */
  getProfile: async () => {
    const response = await httpClient.get('/auth/profile');
    return response.data;
  },

  /**
   * Update user profile
   * @param {object} profileData - { name, email, phone }
   * @returns {Promise<{user: object}>}
   */
  updateProfile: async (profileData) => {
    const response = await httpClient.put('/auth/profile', profileData);
    return response.data;
  },

  /**
   * Change password
   * @param {string} currentPassword
   * @param {string} newPassword
   * @returns {Promise<{message: string}>}
   */
  changePassword: async (currentPassword, newPassword) => {
    const response = await httpClient.put('/auth/change-password', { currentPassword, newPassword });
    return response.data;
  },
};

// ============== PUBLIC APIs ==============
export const publicApi = {
  /**
   * Get all services
   * @returns {Promise<Array>}
   */
  getServices: async () => {
    const response = await httpClient.get('/api/services');
    return response.data;
  },

  /**
   * Get service by ID
   * @param {string|number} id
   * @returns {Promise<object>}
   */
  getServiceById: async (id) => {
    const response = await httpClient.get(`/api/services/${id}`);
    return response.data;
  },

  /** Public contact info — used by the footer; no auth required. */
  getContactInfo: async () => {
    const response = await httpClient.get('/api/public/contact-info');
    return response.data;
  },

  /** Active team members ordered by displayOrder — used by the home page. */
  getTeamMembers: async () => {
    const response = await httpClient.get('/api/public/team');
    return response.data;
  },

  /** Published before/after gallery items — used by the home page gallery section. */
  getGallery: async () => {
    const response = await httpClient.get('/api/public/gallery');
    return response.data;
  },
};

// ============== WORK ORDER APIs ==============
export const workOrderApi = {
  /**
   * Create new work order
   * @param {object} workOrderData - { clientId, vesselId, serviceIds, description, preferredDate, notes, priority }
   * @returns {Promise<object>} WorkOrderDTO
   */
  create: async (workOrderData) => {
    const response = await httpClient.post('/api/work-orders', workOrderData);
    return response.data;
  },

  /**
   * Submit a service request (Task #5).
   * Status starts at PENDING_APPROVAL until an admin approves.
   * @param {object} payload - {
   *   clientId, vesselId, submittedByRole ('CLIENT'|'TECHNICIAN'),
   *   description, locationText, latitude?, longitude?, phone?,
   *   issueCategory (enum), issueCategoryOther?, mediaUrls?
   * }
   */
  submitServiceRequest: async (payload) => {
    const response = await httpClient.post('/api/work-orders/service-request', payload);
    return response.data;
  },

  approve: async (id, approverId) => {
    const response = await httpClient.put(`/api/work-orders/${id}/approve`, null, {
      params: { approverId },
    });
    return response.data;
  },

  reject: async (id, approverId, reason) => {
    const response = await httpClient.put(`/api/work-orders/${id}/reject`, null, {
      params: { approverId, reason },
    });
    return response.data;
  },

  /**
   * Get current user's work orders. clientId is derived from the JWT by
   * work-order-service; the previous query param is no longer supported.
   * @returns {Promise<Array>}
   */
  getMyWorkOrders: async () => {
    const response = await httpClient.get('/api/work-orders/my');
    return response.data;
  },

  /**
   * Get work order by ID
   * @param {string|number} id
   * @returns {Promise<object>}
   */
  getWorkOrderById: async (id) => {
    const response = await httpClient.get(`/api/work-orders/${id}`);
    return response.data;
  },

  /**
   * Update work order status (admin/technician)
   * @param {string|number} id
   * @param {string} status - PENDING | IN_PROGRESS | COMPLETED | CANCELLED
   * @returns {Promise<object>}
   */
  updateStatus: async (id, status) => {
    const response = await httpClient.put(`/api/work-orders/${id}/status`, null, {
      params: { status },
    });
    return response.data;
  },

  /**
   * Assign technician to work order
   * @param {string|number} id
   * @param {number} technicianId
   * @returns {Promise<object>}
   */
  assignTechnician: async (id, technicianId) => {
    const response = await httpClient.put(`/api/work-orders/${id}/assign`, null, {
      params: { technicianId },
    });
    return response.data;
  },

  /**
   * Delete work order
   * @param {string|number} id
   * @returns {Promise<void>}
   */
  delete: async (id) => {
    const response = await httpClient.delete(`/api/work-orders/${id}`);
    return response.data;
  },

  /**
   * Work orders assigned to the calling technician (TECHNICIAN/TEAM_LEAD).
   * @returns {Promise<Array>}
   */
  getAssigned: async () => {
    const response = await httpClient.get('/api/work-orders/assigned');
    return response.data;
  },

  /**
   * Get the update timeline for a work order.
   * @param {string|number} id
   * @returns {Promise<Array>}
   */
  getUpdates: async (id) => {
    const response = await httpClient.get(`/api/work-orders/${id}/updates`);
    return response.data;
  },

  /**
   * Post a work update / field note on a work order.
   * @param {string|number} id
   * @param {string} message
   * @param {boolean} visibleToClient
   * @returns {Promise<object>}
   */
  postUpdate: async (id, message, visibleToClient = true) => {
    const response = await httpClient.post(`/api/work-orders/${id}/updates`, {
      message,
      visibleToClient,
    });
    return response.data;
  },

  /**
   * List attachments on a work order.
   * @param {string|number} id
   * @returns {Promise<Array>}
   */
  getAttachments: async (id) => {
    const response = await httpClient.get(`/api/work-orders/${id}/attachments`);
    return response.data;
  },

  /**
   * Upload a file attachment to a work order (multipart).
   * @param {string|number} id
   * @param {File} file
   * @returns {Promise<object>}
   */
  uploadAttachment: async (id, file) => {
    const form = new FormData();
    form.append('file', file);
    const response = await httpClient.post(`/api/work-orders/${id}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form_data' },
    });
    return response.data;
  },

  /** Admin/team-lead search with filters + pagination. Returns Page<WorkOrderDTO>. */
  searchOrders: async (params = {}) => {
    const response = await httpClient.get('/api/work-orders', { params });
    return response.data;
  },

  // ── Time tracking ─────────────────────────────────────────────────────────

  /** Clock technician in on a work order. */
  clockIn: async (id) => {
    const response = await httpClient.post(`/api/work-orders/${id}/time/clock-in`);
    return response.data;
  },

  /** Clock technician out. */
  clockOut: async (id) => {
    const response = await httpClient.post(`/api/work-orders/${id}/time/clock-out`);
    return response.data;
  },

  /** Get all time logs for a work order. */
  getTimeLogs: async (id) => {
    const response = await httpClient.get(`/api/work-orders/${id}/time`);
    return response.data;
  },
};

// ============== VESSEL APIs ==============
export const vesselApi = {
  /**
   * Create new vessel
   * @param {object} vesselData - { clientId, name, type, engineType, brand, model, year, length, hullMaterial, registrationNumber }
   * @returns {Promise<object>} VesselDTO
   */
  create: async (vesselData) => {
    const response = await httpClient.post('/api/vessels', vesselData);
    return response.data;
  },

  /**
   * Get current user's vessels. The clientId is derived from the JWT by
   * vessel-service; passing it as a query param is no longer supported.
   * @returns {Promise<Array>}
   */
  getMyVessels: async () => {
    const response = await httpClient.get('/api/vessels/my');
    return response.data;
  },

  /**
   * List all vessels (technician picker for service requests).
   * @returns {Promise<Array>}
   */
  getAll: async () => {
    const response = await httpClient.get('/api/vessels');
    return response.data;
  },

  /**
   * Get vessel by ID
   * @param {string|number} id
   * @returns {Promise<object>}
   */
  getVesselById: async (id) => {
    const response = await httpClient.get(`/api/vessels/${id}`);
    return response.data;
  },

  /**
   * Update vessel
   * @param {string|number} id
   * @param {object} vesselData
   * @returns {Promise<object>}
   */
  update: async (id, vesselData) => {
    const response = await httpClient.put(`/api/vessels/${id}`, vesselData);
    return response.data;
  },

  /**
   * Delete vessel
   * @param {string|number} id
   * @returns {Promise<void>}
   */
  delete: async (id) => {
    const response = await httpClient.delete(`/api/vessels/${id}`);
    return response.data;
  },

  // ── Documents ────────────────────────────────────────────────────────────

  listDocuments: async (vesselId) => {
    const response = await httpClient.get(`/api/vessels/${vesselId}/documents`);
    return response.data;
  },

  addDocument: async (vesselId, payload) => {
    const response = await httpClient.post(`/api/vessels/${vesselId}/documents`, payload);
    return response.data;
  },

  deleteDocument: async (documentId) => {
    await httpClient.delete(`/api/vessels/documents/${documentId}`);
  },

  // ── Fuel logs ────────────────────────────────────────────────────────────

  listFuelLogs: async (vesselId, { page = 0, size = 20 } = {}) => {
    const response = await httpClient.get(`/api/vessels/${vesselId}/fuel-logs`, {
      params: { page, size },
    });
    return response.data;
  },

  addFuelLog: async (vesselId, payload) => {
    const response = await httpClient.post(`/api/vessels/${vesselId}/fuel-logs`, payload);
    return response.data;
  },

  deleteFuelLog: async (logId) => {
    await httpClient.delete(`/api/vessels/fuel-logs/${logId}`);
  },

  getFuelAnalytics: async (vesselId, year) => {
    const params = year ? { year } : {};
    const response = await httpClient.get(`/api/vessels/${vesselId}/fuel-logs/analytics`, { params });
    return response.data;
  },
};

// ============== INVOICE APIs ==============
export const invoiceApi = {
  /**
   * Get current user's invoices
   * @param {number} clientId - Client ID to fetch invoices for
   * @returns {Promise<Array>}
   */
  getMyInvoices: async (clientId) => {
    const response = await httpClient.get('/api/invoices/my', {
      params: { clientId },
    });
    return response.data;
  },

  /**
   * Get invoice by ID
   * @param {string|number} id
   * @returns {Promise<object>}
   */
  getInvoiceById: async (id) => {
    const response = await httpClient.get(`/api/invoices/${id}`);
    return response.data;
  },

  /**
   * Download invoice PDF
   * @param {string|number} id
   * @returns {Promise<Blob>}
   */
  downloadPdf: async (id) => {
    const response = await httpClient.get(`/api/invoices/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Initiate payment for invoice
   * @param {string|number} id
   * @param {string} paymentMethod - 'card' | 'paypal'
   * @returns {Promise<{paymentUrl: string}>}
   */
  initiatePayment: async (id, paymentMethod = 'card') => {
    const response = await httpClient.post(`/api/invoices/${id}/pay`, { paymentMethod });
    return response.data;
  },

  deleteInvoice: async (id) => {
    await httpClient.delete(`/api/invoices/${id}`);
  },
};

// ============== DASHBOARD APIs ==============
export const dashboardApi = {
  /**
   * Get dashboard statistics. clientId is derived from the JWT server-side.
   * @returns {Promise<{activeOrders: number, vessels: number, pendingInvoices: number, completedOrders: number}>}
   */
  getStats: async () => {
    const response = await httpClient.get('/api/work-orders/my');
    const orders = response.data || [];
    return {
      activeOrders: orders.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length,
      vessels: 0, // Will be fetched separately
      pendingInvoices: 0, // Will be fetched separately
      completedOrders: orders.filter((o) => o.status === 'COMPLETED').length,
    };
  },

  /**
   * Get recent orders. clientId is derived from the JWT server-side.
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  getRecentOrders: async (limit = 5) => {
    const response = await httpClient.get('/api/work-orders/my');
    return (response.data || []).slice(0, limit);
  },
};

// ============== ADMIN APIs ==============
export const adminApi = {
  // Dashboard
  getDashboardStats: async () => {
    const response = await httpClient.get('/admin/dashboard/stats');
    return response.data;
  },

  // Orders — call work-order-service directly via gateway (admin endpoints removed Apr 2026)
  searchOrders: async (params = {}) => {
    const response = await httpClient.get('/api/work-orders', { params });
    return response.data; // Page<WorkOrderDTO>
  },

  getOrderById: async (id) => {
    const response = await httpClient.get(`/api/work-orders/${id}`);
    return response.data;
  },

  assignTechnician: async (orderId, technicianId) => {
    const response = await httpClient.put(`/api/work-orders/${orderId}/assign`, null, {
      params: { technicianId },
    });
    return response.data;
  },

  // Users
  searchUsers: async (params = {}) => {
    const response = await httpClient.get('/admin/users', { params });
    return response.data; // Page<ClientDTO>
  },

  getAllUsers: async () => {
    const response = await httpClient.get('/admin/users/all');
    return response.data; // List<ClientDTO> (used by AdminDashboard stats)
  },

  createUser: async (userData) => {
    const response = await httpClient.post('/admin/users', userData);
    return response.data;
  },

  updateUser: async (userId, userData) => {
    const response = await httpClient.put(`/admin/users/${userId}`, userData);
    return response.data;
  },

  updateUserRole: async (userId, role) => {
    const response = await httpClient.put(`/admin/users/${userId}/role`, { role });
    return response.data;
  },

  updateUserStatus: async (userId, status) => {
    const response = await httpClient.put(`/admin/users/${userId}/status`, { status });
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await httpClient.delete(`/admin/users/${userId}`);
    return response.data;
  },

  /**
   * Admin-initiated password reset. Backend bcrypt-encodes exactly once and
   * advances password_changed_at — every existing JWT for the target is
   * invalidated server-side via the pwdIat claim.
   */
  resetUserPassword: async (userId, newPassword, reason) => {
    const body = reason && reason.trim()
      ? { newPassword, reason: reason.trim() }
      : { newPassword };
    const response = await httpClient.post(`/admin/users/${userId}/reset-password`, body);
    return response.data;
  },

  /** Recent admin actions for the audit dashboard. */
  getAuditLog: async ({ limit = 100, action } = {}) => {
    const params = { limit };
    if (action) params.action = action;
    const response = await httpClient.get('/admin/audit', { params });
    return response.data;
  },

  // Services — direct via gateway
  searchServices: async (params = {}) => {
    const response = await httpClient.get('/api/services', { params });
    return response.data; // Page<ServiceDTO>
  },

  createService: async (serviceData) => {
    const response = await httpClient.post('/api/services', serviceData);
    return response.data;
  },

  updateService: async (id, serviceData) => {
    const response = await httpClient.put(`/api/services/${id}`, serviceData);
    return response.data;
  },

  deleteService: async (id) => {
    const response = await httpClient.delete(`/api/services/${id}`);
    return response.data;
  },

  // Analytics
  getAnalytics: async (months = 12) => {
    const response = await httpClient.get('/api/invoices/analytics', { params: { months } });
    return response.data;
  },

  // Invoices — direct via gateway
  searchInvoices: async (params = {}) => {
    const response = await httpClient.get('/api/invoices', { params });
    return response.data; // Page<InvoiceDTO>
  },

  createInvoice: async (invoiceData) => {
    const response = await httpClient.post('/api/invoices', invoiceData);
    return response.data;
  },

  updateInvoice: async (invoiceId, invoiceData) => {
    const response = await httpClient.put(`/api/invoices/${invoiceId}`, invoiceData);
    return response.data;
  },

  updateInvoiceStatus: async (invoiceId, status) => {
    const response = await httpClient.put(`/api/invoices/${invoiceId}/status`, null, {
      params: { status },
    });
    return response.data;
  },

  // Quotations — direct via gateway
  searchQuotations: async (params = {}) => {
    const response = await httpClient.get('/api/quotations', { params });
    return response.data; // Page<QuotationDTO>
  },

  createQuotation: async (quotationData) => {
    const response = await httpClient.post('/api/quotations', quotationData);
    return response.data;
  },

  updateQuotation: async (quotationId, quotationData) => {
    const response = await httpClient.put(`/api/quotations/${quotationId}`, quotationData);
    return response.data;
  },

  updateQuotationStatus: async (quotationId, status) => {
    const response = await httpClient.put(`/api/quotations/${quotationId}/status`, null, {
      params: { status },
    });
    return response.data;
  },

  downloadQuotationPdf: async (id) => {
    const response = await httpClient.get(`/api/quotations/${id}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  deleteQuotation: async (id) => {
    await httpClient.delete(`/api/quotations/${id}`);
  },

  // Media Management
  getAllMedia: async () => {
    const response = await httpClient.get('/admin/media');
    return response.data;
  },

  getMediaById: async (id) => {
    const response = await httpClient.get(`/admin/media/${id}`);
    return response.data;
  },

  getMediaByType: async (type) => {
    const response = await httpClient.get(`/admin/media/type/${type}`);
    return response.data;
  },

  getMediaByCategory: async (category) => {
    const response = await httpClient.get(`/admin/media/category/${category}`);
    return response.data;
  },

  createMedia: async (mediaData) => {
    const response = await httpClient.post('/admin/media', mediaData);
    return response.data;
  },

  updateMedia: async (id, mediaData) => {
    const response = await httpClient.put(`/admin/media/${id}`, mediaData);
    return response.data;
  },

  deleteMedia: async (id) => {
    const response = await httpClient.delete(`/admin/media/${id}`);
    return response.data;
  },

  // Before & After Gallery
  getAllGallery: async () => {
    const res = await httpClient.get('/admin/gallery');
    return res.data;
  },
  getGalleryItem: async (id) => {
    const res = await httpClient.get(`/admin/gallery/${id}`);
    return res.data;
  },
  createGalleryItem: async (data) => {
    const res = await httpClient.post('/admin/gallery', data);
    return res.data;
  },
  updateGalleryItem: async (id, data) => {
    const res = await httpClient.put(`/admin/gallery/${id}`, data);
    return res.data;
  },
  toggleGalleryPublished: async (id) => {
    await httpClient.patch(`/admin/gallery/${id}/toggle-published`);
  },
  deleteGalleryItem: async (id) => {
    await httpClient.delete(`/admin/gallery/${id}`);
  },

  // Team Member Management
  getAllTeamMembers: async () => {
    const res = await httpClient.get('/admin/team');
    return res.data;
  },
  getTeamMember: async (id) => {
    const res = await httpClient.get(`/admin/team/${id}`);
    return res.data;
  },
  createTeamMember: async (data) => {
    const res = await httpClient.post('/admin/team', data);
    return res.data;
  },
  updateTeamMember: async (id, data) => {
    const res = await httpClient.put(`/admin/team/${id}`, data);
    return res.data;
  },
  toggleTeamMemberActive: async (id) => {
    await httpClient.patch(`/admin/team/${id}/toggle-active`);
  },
  deleteTeamMember: async (id) => {
    await httpClient.delete(`/admin/team/${id}`);
  },

  // Contact Info Management
  getAllContactInfo: async () => {
    const response = await httpClient.get('/admin/contact-info');
    return response.data;
  },

  getContactInfoByCategory: async (category) => {
    const response = await httpClient.get(`/admin/contact-info/category/${category}`);
    return response.data;
  },

  getContactInfoByKey: async (keyName) => {
    const response = await httpClient.get(`/admin/contact-info/key/${keyName}`);
    return response.data;
  },

  createContactInfo: async (contactInfoData) => {
    const response = await httpClient.post('/admin/contact-info', contactInfoData);
    return response.data;
  },

  updateContactInfo: async (id, contactInfoData) => {
    const response = await httpClient.put(`/admin/contact-info/${id}`, contactInfoData);
    return response.data;
  },

  deleteContactInfo: async (id) => {
    const response = await httpClient.delete(`/admin/contact-info/${id}`);
    return response.data;
  },
};

// ============== MARKETPLACE APIs ==============
export const marketplaceApi = {
  /**
   * Public paged listing search.
   * @param {object} params - mode (BUY|RENT), q, boatType, lengthMin/Max, yearMin/Max,
   *   priceMin/Max, location, page, size, sort, adminStatus
   */
  searchListings: async (params = {}) => {
    const response = await httpClient.get('/api/listings', { params });
    return response.data; // Spring Page<BoatListingDTO>
  },

  /** Public detail by id. */
  getListingById: async (id) => {
    const response = await httpClient.get(`/api/listings/${id}`);
    return response.data;
  },

  /** Public detail by SEO slug — preferred from the gallery. */
  getBoatTypes: async () => {
    const response = await httpClient.get('/api/listings/boat-types');
    return response.data;
  },

  getListingBySlug: async (slug) => {
    const response = await httpClient.get(`/api/listings/by-slug/${slug}`);
    return response.data;
  },

  /** Admin create. */
  createListing: async (dto) => {
    const response = await httpClient.post('/api/listings', dto);
    return response.data;
  },

  /** Admin update. */
  updateListing: async (id, dto) => {
    const response = await httpClient.put(`/api/listings/${id}`, dto);
    return response.data;
  },

  /** Admin delete. */
  deleteListing: async (id) => {
    const response = await httpClient.delete(`/api/listings/${id}`);
    return response.data;
  },

  /** Client submits their own vessel for marketplace review. */
  submitClientListing: async (dto) => {
    const response = await httpClient.post('/api/listings/submit', dto);
    return response.data;
  },

  /** Client views their own submitted listings. */
  getMyListings: async () => {
    const response = await httpClient.get('/api/listings/my');
    return response.data;
  },

  /** Admin / Team Lead approves a pending listing and sets company gain percentage. */
  approveListing: async (id, { companyGainPct }) => {
    const response = await httpClient.put(`/api/listings/${id}/approve`, { companyGainPct });
    return response.data;
  },

  /** Admin / Team Lead rejects a pending listing. */
  rejectListing: async (id, reason = '') => {
    const response = await httpClient.put(`/api/listings/${id}/reject`, { reason });
    return response.data;
  },

  /**
   * Public inquiry submit. listingId is required for BUY/RENT/INSPECTION,
   * optional for GENERAL (homepage Contact us).
   */
  createInquiry: async (payload) => {
    const response = await httpClient.post('/api/listings/inquiries', payload);
    return response.data;
  },

  /** Admin inquiry inbox. */
  searchInquiries: async (params = {}) => {
    const response = await httpClient.get('/api/listings/inquiries', { params });
    return response.data; // Spring Page<BoatInquiryDTO>
  },

  /** Admin inquiry status update. */
  updateInquiryStatus: async (id, status, adminNotes) => {
    const response = await httpClient.put(`/api/listings/inquiries/${id}/status`, {
      status,
      adminNotes: adminNotes ?? '',
    });
    return response.data;
  },
};

// ============== SHOP APIs ==============
export const shopApi = {
  /**
   * Public paged product search.
   * @param {object} params - q, category (PART|TOOL|ALL), brand, priceMin/Max, inStock,
   *   page, size, sort, adminStatus
   */
  searchProducts: async (params = {}) => {
    const response = await httpClient.get('/api/products', { params });
    return response.data; // Spring Page<ProductDTO>
  },

  /** Public detail by id. */
  getProductById: async (id) => {
    const response = await httpClient.get(`/api/products/${id}`);
    return response.data;
  },

  /** Public detail by SEO slug — preferred from the catalog. */
  getProductBySlug: async (slug) => {
    const response = await httpClient.get(`/api/products/by-slug/${slug}`);
    return response.data;
  },

  /** Admin create. */
  createProduct: async (dto) => {
    const response = await httpClient.post('/api/products', dto);
    return response.data;
  },

  /** Admin update. */
  updateProduct: async (id, dto) => {
    const response = await httpClient.put(`/api/products/${id}`, dto);
    return response.data;
  },

  /** Admin delete. */
  deleteProduct: async (id) => {
    const response = await httpClient.delete(`/api/products/${id}`);
    return response.data;
  },

  /**
   * Public inquiry submit. productId is required for QUOTE/STOCK_CHECK,
   * optional for GENERAL.
   */
  createInquiry: async (payload) => {
    const response = await httpClient.post('/api/products/inquiries', payload);
    return response.data;
  },

  /** Admin inquiry inbox. */
  searchInquiries: async (params = {}) => {
    const response = await httpClient.get('/api/products/inquiries', { params });
    return response.data; // Spring Page<ProductInquiryDTO>
  },

  /** Admin inquiry status update. */
  updateInquiryStatus: async (id, status, adminNotes) => {
    const response = await httpClient.put(`/api/products/inquiries/${id}/status`, {
      status,
      adminNotes: adminNotes ?? '',
    });
    return response.data;
  },

  // ----- Cart (Phase 2, auth-required) -----
  getCart: async () => {
    const response = await httpClient.get('/api/cart');
    return response.data;
  },
  addToCart: async (productId, quantity) => {
    const response = await httpClient.post('/api/cart/items', { productId, quantity });
    return response.data;
  },
  updateCartItem: async (itemId, quantity) => {
    const response = await httpClient.put(`/api/cart/items/${itemId}`, { quantity });
    return response.data;
  },
  removeCartItem: async (itemId) => {
    const response = await httpClient.delete(`/api/cart/items/${itemId}`);
    return response.data;
  },
  clearCart: async () => {
    const response = await httpClient.delete('/api/cart');
    return response.data;
  },

  // ----- Orders (Phase 2, auth-required) -----
  /** Returns { orderId, orderNumber, checkoutUrl, sessionId } — frontend redirects to checkoutUrl. */
  checkout: async () => {
    const response = await httpClient.post('/api/orders/checkout');
    return response.data;
  },
  getMyOrders: async (page = 0, size = 20) => {
    const response = await httpClient.get('/api/orders/my', { params: { page, size } });
    return response.data;
  },
  getOrderById: async (id) => {
    const response = await httpClient.get(`/api/orders/${id}`);
    return response.data;
  },

  // ----- Admin order inbox (ADMIN role) -----
  searchAdminOrders: async (params = {}) => {
    const response = await httpClient.get('/api/admin/orders', { params });
    return response.data; // Spring Page<OrderDTO>
  },
  getAdminOrderById: async (id) => {
    const response = await httpClient.get(`/api/admin/orders/${id}`);
    return response.data;
  },
  updateAdminOrderStatus: async (id, status) => {
    const response = await httpClient.put(`/api/admin/orders/${id}/status`, { status });
    return response.data;
  },
};

// ============== NOTIFICATIONS APIs ==============
/**
 * In-app notification feed. Backend at /api/notifications/** behind JWT auth;
 * clientId is derived from the JWT — every endpoint operates on the caller.
 */
export const notificationApi = {
  /** Paged feed for the dedicated /dashboard/notifications page. */
  getPage: async ({ page = 0, size = 20, sort = 'createdAt,desc' } = {}) => {
    const response = await httpClient.get('/api/notifications/my', {
      params: { page, size, sort },
    });
    return response.data; // Spring Page<NotificationDTO>
  },

  /** Compact list for the bell dropdown — backend returns only unread rows. */
  getUnread: async () => {
    const response = await httpClient.get('/api/notifications/my/unread');
    return response.data;
  },

  /** Just the count, for the badge. Cheap to poll. */
  getUnreadCount: async () => {
    const response = await httpClient.get('/api/notifications/my/unread-count');
    return response.data.count;
  },

  markRead: async (id) => {
    const response = await httpClient.put(`/api/notifications/${id}/read`);
    return response.data;
  },

  markAllRead: async () => {
    const response = await httpClient.put('/api/notifications/my/read-all');
    return response.data;
  },
};

// ============== MAINTENANCE APIs ==============
/**
 * Maintenance service: vessel history, schedule, dossier, engine hours.
 * Backend at /api/maintenance routed through gateway → maintenance-service.
 */
export const maintenanceApi = {
  /** Full dossier — used by the vessel detail page. */
  getDossier: async (vesselId) => {
    const response = await httpClient.get(`/api/maintenance/vessels/${vesselId}/dossier`);
    return response.data;
  },

  /** Paged history list. */
  getHistory: async (vesselId, params = {}) => {
    const response = await httpClient.get(`/api/maintenance/vessels/${vesselId}/history`, { params });
    return response.data;
  },

  /** Log a new service entry. force=true bypasses the engine-hours leap sanity check. */
  addHistory: async (vesselId, payload, force = false) => {
    const response = await httpClient.post(`/api/maintenance/vessels/${vesselId}/history`, payload, {
      params: force ? { force: true } : undefined,
    });
    return response.data;
  },

  deleteHistory: async (id) => {
    const response = await httpClient.delete(`/api/maintenance/history/${id}`);
    return response.data;
  },

  /**
   * Attach a file to a history record. Two-step flow:
   *   1) caller uploads bytes via fileApi.upload (client-module) and
   *      gets back a URL
   *   2) caller calls this to LINK that URL to the history row.
   * Maintenance stores only the pointer + metadata.
   */
  addAttachment: async (historyId, attachment) => {
    const response = await httpClient.post(
      `/api/maintenance/history/${historyId}/attachments`, attachment);
    return response.data;
  },
  listAttachments: async (historyId) => {
    const response = await httpClient.get(`/api/maintenance/history/${historyId}/attachments`);
    return response.data;
  },
  deleteAttachment: async (attachmentId) => {
    const response = await httpClient.delete(`/api/maintenance/attachments/${attachmentId}`);
    return response.data;
  },

  /** Schedule list for a vessel (with urgency classifications). */
  getSchedule: async (vesselId) => {
    const response = await httpClient.get(`/api/maintenance/vessels/${vesselId}/schedule`);
    return response.data;
  },

  /** Upsert a reminder for a given service type. */
  upsertSchedule: async (vesselId, serviceType, payload) => {
    const response = await httpClient.put(`/api/maintenance/vessels/${vesselId}/schedule/${serviceType}`, payload);
    return response.data;
  },

  snoozeSchedule: async (vesselId, serviceType, days) => {
    const response = await httpClient.post(`/api/maintenance/vessels/${vesselId}/schedule/${serviceType}/snooze`, { days });
    return response.data;
  },

  pauseSchedule: async (vesselId, serviceType) => {
    const response = await httpClient.post(`/api/maintenance/vessels/${vesselId}/schedule/${serviceType}/pause`);
    return response.data;
  },

  resumeSchedule: async (vesselId, serviceType) => {
    const response = await httpClient.post(`/api/maintenance/vessels/${vesselId}/schedule/${serviceType}/resume`);
    return response.data;
  },

  /** Dashboard widget — overdue + due-soon across all the client's vessels. */
  getUpcoming: async () => {
    const response = await httpClient.get('/api/maintenance/upcoming');
    return response.data;
  },

  updateEngineHours: async (vesselId, hours, force = false) => {
    const response = await httpClient.patch(`/api/maintenance/vessels/${vesselId}/engine-hours`, { hours, force });
    return response.data;
  },

  // Admin cross-client view: every OVERDUE + DUE_SOON service across all vessels.
  // ADMIN role enforced server-side via @PreAuthorize on MaintenanceAdminController.
  adminGetUpcoming: async (params = {}) => {
    const response = await httpClient.get('/api/maintenance/admin/upcoming', { params });
    return response.data; // List<AdminUpcomingDTO>
  },

  /**
   * Yearly maintenance-cost roll-up for the authenticated client.
   * Returns: { year, totalQar, recordCount, byServiceType[], byVessel[], byMonth[] }.
   * Omit year to default to the current year (server resolves).
   */
  getCostSummary: async (year) => {
    const response = await httpClient.get('/api/maintenance/analytics/cost', {
      params: year ? { year } : {},
    });
    return response.data;
  },
};

// ============== VESSEL INSPECTION APIs ==============
export const vesselInspectionApi = {
  search: async ({ clientId, vesselId, page = 0, size = 20 } = {}) => {
    const params = { page, size };
    if (clientId)  params.clientId  = clientId;
    if (vesselId)  params.vesselId  = vesselId;
    const res = await httpClient.get('/api/vessel-inspections', { params });
    return res.data;
  },

  getById: async (id) => {
    const res = await httpClient.get(`/api/vessel-inspections/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await httpClient.post('/api/vessel-inspections', data);
    return res.data;
  },

  updateStatus: async (id, status, findings) => {
    const res = await httpClient.patch(`/api/vessel-inspections/${id}/status`, { status, findings });
    return res.data;
  },

  delete: async (id) => {
    await httpClient.delete(`/api/vessel-inspections/${id}`);
  },
};

// ============== TECHNICIAN APIs ==============
export const technicianApi = {
  // Returns users with role=TECHNICIAN from the clients table (source of truth)
  getAll: async () => {
    const response = await httpClient.get('/api/clients/staff/technicians');
    return response.data; // List<ClientDTO>
  },

  getAvailable: async () => {
    const response = await httpClient.get('/api/technicians/available');
    return response.data;
  },

  // Work Orders — call work-order-service directly via gateway (/api/work-orders/*)
  getMyOrders: async () => workOrderApi.getAssigned(),

  getOrderById: async (id) => workOrderApi.getWorkOrderById(id),

  updateStatus: async (id, status) => workOrderApi.updateStatus(id, status),

  // Update timeline (replaces old notes stub)
  postUpdate: async (id, message, visibleToClient = true) =>
    workOrderApi.postUpdate(id, message, visibleToClient),

  getUpdates: async (id) => workOrderApi.getUpdates(id),

  // Attachments
  uploadAttachment: async (id, file) => workOrderApi.uploadAttachment(id, file),

  getAttachments: async (id) => workOrderApi.getAttachments(id),

  // History (completed orders for the technician)
  getWorkHistory: async () => {
    const orders = await workOrderApi.getAssigned();
    return (orders || []).filter(o => o.status === 'COMPLETED');
  },
};

export const driverApi = {
  getAll: async () => {
    const res = await httpClient.get('/api/clients/staff/drivers');
    return res.data; // List<ClientDTO>
  },
};

// ============== DELIVERY APIs ==============
export const deliveryApi = {
  getTodayTasks: async () => {
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const res = await httpClient.get('/api/delivery/tasks/today', { params: { date } });
    return res.data;
  },

  getTasksInRange: async (from, to) => {
    const res = await httpClient.get('/api/delivery/tasks/range', { params: { from, to } });
    return res.data;
  },

  getTaskStats: async () => {
    const res = await httpClient.get('/api/delivery/tasks/stats');
    return res.data;
  },

  getDeliverySettings: async () => {
    const res = await httpClient.get('/api/delivery/settings');
    return res.data;
  },

  adminUpdateDeliverySettings: async (historyDays) => {
    const res = await httpClient.put('/api/delivery/admin/settings', null, { params: { historyDays } });
    return res.data;
  },

  getTaskById: async (id) => {
    const res = await httpClient.get(`/api/delivery/tasks/${id}`);
    return res.data;
  },

  updateStatus: async (id, status, failedReason) => {
    const res = await httpClient.patch(`/api/delivery/tasks/${id}/status`, { status, failedReason });
    return res.data;
  },

  uploadProof: async (id, file) => {
    const form = new FormData();
    form.append('file', file);
    const res = await httpClient.post(`/api/delivery/tasks/${id}/proof`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  updatePosition: async (lat, lng, accuracy) => {
    const res = await httpClient.post('/api/delivery/position', { lat, lng, accuracy });
    return res.data;
  },

  getTechPosition: async (techId) => {
    const res = await httpClient.get(`/api/delivery/position/${techId}`);
    return res.data;
  },

  adminListPositions: async () => {
    const res = await httpClient.get('/api/delivery/positions');
    return res.data;
  },

  // Admin / Team Lead
  adminListTasks: async ({ date, assignedTo, status, page = 0, size = 20 } = {}) => {
    const params = { page, size };
    if (date) params.date = date;
    if (assignedTo) params.assignedTo = assignedTo;
    if (status) params.status = status;
    const res = await httpClient.get('/api/delivery/admin/tasks', { params });
    return res.data;
  },

  adminGetTask: async (id) => {
    const res = await httpClient.get(`/api/delivery/admin/tasks/${id}`);
    return res.data;
  },

  adminCreateTask: async (data) => {
    const res = await httpClient.post('/api/delivery/admin/tasks', data);
    return res.data;
  },

  adminAssignTask: async (id, technicianId) => {
    const res = await httpClient.patch(`/api/delivery/admin/tasks/${id}/assign`, { technicianId });
    return res.data;
  },

  adminCancelTask: async (id, reason) => {
    const res = await httpClient.patch(`/api/delivery/admin/tasks/${id}/cancel`, null, {
      params: reason ? { reason } : undefined,
    });
    return res.data;
  },

  adminForceStatus: async (id, status) => {
    const res = await httpClient.patch(`/api/delivery/admin/tasks/${id}/status`, { status });
    return res.data;
  },

  getPositionHistory: async (techId, limit = 40) => {
    const res = await httpClient.get(`/api/delivery/position/${techId}/history`, { params: { limit } });
    return res.data;
  },
};

// ============== FILE UPLOAD APIs ==============
export const fileApi = {
  /**
   * Upload file (vessel image, document, etc.)
   * @param {File} file
   * @param {string} category - Category for the file
   * @returns {Promise<{url: string, title: string, type: string}>}
   */
  upload: async (file, category = 'general') => {
    const formData = new FormData();
    formData.append('file', file);
    if (category) formData.append('category', category);

    const response = await httpClient.post('/api/clients/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Delete file
   * @param {string} fileId
   * @returns {Promise<{message: string}>}
   */
  delete: async (fileId) => {
    const response = await httpClient.delete(`/api/clients/media/${fileId}`);
    return response.data;
  },
};

// ============== TEAM REQUEST APIs ==============
// Lightweight client listing — accessible to any authenticated role (anyRequest().authenticated())
export const clientApi = {
  getAll: async () => {
    const response = await httpClient.get('/api/clients');
    return response.data; // List<ClientDTO>
  },
};

export const teamRequestApi = {
  /**
   * Submit a team request (guest or authenticated).
   * @param {{ category, description, location, phone, whatsapp, files: File[] }} data
   */
  create: async ({ category, description, location, phone, whatsapp, files }) => {
    const form = new FormData();
    form.append('category', category);
    form.append('description', description);
    if (location) form.append('location', location);
    form.append('contactPhone', phone);
    form.append('whatsapp', String(whatsapp));
    (files || []).forEach(f => form.append('files', f));
    const response = await httpClient.post('/api/team-requests', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /** Admin: list requests, optionally filtered by status. */
  list: async ({ status, page = 0, size = 20 } = {}) => {
    const params = { page, size };
    if (status) params.status = status;
    const response = await httpClient.get('/api/admin/team-requests', { params });
    return response.data;
  },

  /** Admin: approve / reject / dispatch / complete a request. */
  updateStatus: async (id, status, adminNotes) => {
    const response = await httpClient.patch(`/api/admin/team-requests/${id}/status`, { status, adminNotes });
    return response.data;
  },

  /** Admin: pending count for dashboard badge. */
  stats: async () => {
    const response = await httpClient.get('/api/admin/team-requests/stats');
    return response.data;
  },

  /**
   * Client: own team requests (all statuses, newest first).
   * Matches clientId + phone so pre-login guest submissions surface after registration.
   */
  myRequests: async ({ page = 0, size = 10 } = {}) => {
    const response = await httpClient.get('/api/clients/me/team-requests', { params: { page, size } });
    return response.data;
  },

  /**
   * Technician/Team Lead: requests assigned to the caller.
   */
  myAssigned: async ({ page = 0, size = 20 } = {}) => {
    const response = await httpClient.get('/api/team-requests/assigned', { params: { page, size } });
    return response.data;
  },

  /**
   * Technician/Team Lead: respond to an assigned request (scope-guarded).
   * @param {number} id
   * @param {string} status  APPROVED | COMPLETED
   * @param {string} [note]
   */
  respond: async (id, status, note) => {
    const response = await httpClient.patch(`/api/team-requests/${id}/respond`, { status, note });
    return response.data;
  },

  /**
   * Admin/Team Lead: assign a request to a technician.
   */
  assign: async (id, technicianId) => {
    const response = await httpClient.patch(`/api/admin/team-requests/${id}/assign`, { technicianId });
    return response.data;
  },
};

// ============== INVENTORY API ==============
export const inventoryApi = {
  search: async (params = {}) => {
    const response = await httpClient.get('/api/inventory', { params });
    return response.data; // Page<InventoryPart>
  },
  getById: async (id) => {
    const response = await httpClient.get(`/api/inventory/${id}`);
    return response.data;
  },
  getLowStock: async () => {
    const response = await httpClient.get('/api/inventory/low-stock');
    return response.data;
  },
  create: async (part) => {
    const response = await httpClient.post('/api/inventory', part);
    return response.data;
  },
  update: async (id, part) => {
    const response = await httpClient.put(`/api/inventory/${id}`, part);
    return response.data;
  },
  adjustStock: async (id, delta) => {
    const response = await httpClient.patch(`/api/inventory/${id}/stock`, { delta });
    return response.data;
  },
  delete: async (id) => {
    await httpClient.delete(`/api/inventory/${id}`);
  },
};

export default {
  auth: authApi,
  public: publicApi,
  workOrder: workOrderApi,
  inventory: inventoryApi,
  vessel: vesselApi,
  invoice: invoiceApi,
  dashboard: dashboardApi,
  admin: adminApi,
  marketplace: marketplaceApi,
  shop: shopApi,
  technician: technicianApi,
  delivery: deliveryApi,
  file: fileApi,
  maintenance: maintenanceApi,
  vesselInspection: vesselInspectionApi,
  notifications: notificationApi,
  client: clientApi,
};
