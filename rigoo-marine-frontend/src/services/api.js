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
    const response = await httpClient.post('/auth/resend-verification');
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

  // Invoices — direct via gateway
  searchInvoices: async (params = {}) => {
    const response = await httpClient.get('/api/invoices', { params });
    return response.data; // Page<InvoiceDTO>
  },

  createInvoice: async (invoiceData) => {
    const response = await httpClient.post('/api/invoices', invoiceData);
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

// ============== TECHNICIAN APIs ==============
export const technicianApi = {
  // Dashboard
  getDashboardStats: async () => {
    const response = await httpClient.get('/technician/dashboard/stats');
    return response.data;
  },

  // Work Orders
  getMyOrders: async (filters = {}) => {
    const response = await httpClient.get('/technician/orders', { params: filters });
    return response.data;
  },

  getOrderById: async (id) => {
    const response = await httpClient.get(`/technician/orders/${id}`);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await httpClient.patch(`/technician/orders/${id}/status`, { status });
    return response.data;
  },

  // Notes
  addNote: async (id, content) => {
    const response = await httpClient.post(`/technician/orders/${id}/notes`, { content });
    return response.data;
  },

  // Time Tracking
  addTimeEntry: async (id, duration, activity) => {
    const response = await httpClient.post(`/technician/orders/${id}/time-entries`, {
      duration,
      activity,
    });
    return response.data;
  },

  // History
  getWorkHistory: async () => {
    const response = await httpClient.get('/technician/history');
    return response.data;
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

export default {
  auth: authApi,
  public: publicApi,
  workOrder: workOrderApi,
  vessel: vesselApi,
  invoice: invoiceApi,
  dashboard: dashboardApi,
  admin: adminApi,
  marketplace: marketplaceApi,
  shop: shopApi,
  technician: technicianApi,
  file: fileApi,
};
