import httpClient from './httpClient';

/**
 * API Service Layer
 * All API calls organized by domain
 * Uses Axios HTTP client with interceptors for auth handling
 */

// ============== AUTH APIs ==============
export const authApi = {
  /**
   * Login user
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{user: object, token: string, refreshToken?: string, expiresAt?: string}>}
   */
  login: async (email, password) => {
    const response = await httpClient.post('/auth/login', { email, password });
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
   * Resend verification email
   * @returns {Promise<{message: string}>}
   */
  resendVerification: async () => {
    const response = await httpClient.post('/auth/resend-verification');
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

  /**
   * Get gallery images
   * @returns {Promise<Array>}
   */
  getGallery: async () => {
    const response = await httpClient.get('/gallery');
    return response.data;
  },

  /**
   * Get company information
   * @returns {Promise<object>}
   */
  getCompanyInfo: async () => {
    const response = await httpClient.get('/company-info');
    return response.data;
  },

  /**
   * Submit contact form
   * @param {object} contactData - { name, email, phone, message }
   * @returns {Promise<{message: string}>}
   */
  submitContact: async (contactData) => {
    const response = await httpClient.post('/contact', contactData);
    return response.data;
  },

  /**
   * Submit quote request
   * @param {object} quoteData - { name, email, phone, service, message }
   * @returns {Promise<{message: string}>}
   */
  submitQuoteRequest: async (quoteData) => {
    const response = await httpClient.post('/quote-request', quoteData);
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
   * Get current user's work orders
   * @param {number} clientId - Client ID to fetch orders for
   * @returns {Promise<Array>}
   */
  getMyWorkOrders: async (clientId) => {
    const response = await httpClient.get('/api/work-orders/my', {
      params: { clientId },
    });
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
   * Get current user's vessels
   * @param {number} clientId - Client ID to fetch vessels for
   * @returns {Promise<Array>}
   */
  getMyVessels: async (clientId) => {
    const response = await httpClient.get('/api/vessels/my', {
      params: { clientId },
    });
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
   * Get dashboard statistics
   * @param {number} clientId - Client ID for stats
   * @returns {Promise<{activeOrders: number, vessels: number, pendingInvoices: number, completedOrders: number}>}
   */
  getStats: async (clientId) => {
    const response = await httpClient.get('/api/work-orders/my', {
      params: { clientId },
    });
    // Calculate stats from orders
    const orders = response.data || [];
    return {
      activeOrders: orders.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length,
      vessels: 0, // Will be fetched separately
      pendingInvoices: 0, // Will be fetched separately
      completedOrders: orders.filter((o) => o.status === 'COMPLETED').length,
    };
  },

  /**
   * Get recent orders
   * @param {number} clientId - Client ID to fetch orders for
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  getRecentOrders: async (clientId, limit = 5) => {
    const response = await httpClient.get('/api/work-orders/my', {
      params: { clientId },
    });
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

  // Orders
  getAllOrders: async (filters = {}) => {
    const response = await httpClient.get('/admin/orders', { params: filters });
    return response.data;
  },

  getOrderById: async (id) => {
    const response = await httpClient.get(`/admin/orders/${id}`);
    return response.data;
  },

  assignTechnician: async (orderId, technicianId) => {
    const response = await httpClient.post(`/admin/orders/${orderId}/assign`, { technicianId });
    return response.data;
  },

  // Users
  getAllUsers: async (filters = {}) => {
    const response = await httpClient.get('/admin/users', { params: filters });
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

  // Services
  getAllServices: async () => {
    const response = await httpClient.get('/admin/services');
    return response.data;
  },

  createService: async (serviceData) => {
    const response = await httpClient.post('/admin/services', serviceData);
    return response.data;
  },

  updateService: async (id, serviceData) => {
    const response = await httpClient.put(`/admin/services/${id}`, serviceData);
    return response.data;
  },

  deleteService: async (id) => {
    const response = await httpClient.delete(`/admin/services/${id}`);
    return response.data;
  },

  // Invoices
  getAllInvoices: async (filters = {}) => {
    const response = await httpClient.get('/admin/invoices', { params: filters });
    return response.data;
  },

  createInvoice: async (invoiceData) => {
    const response = await httpClient.post('/admin/invoices', invoiceData);
    return response.data;
  },

  updateInvoiceStatus: async (invoiceId, status) => {
    const response = await httpClient.put(`/admin/invoices/${invoiceId}/status`, null, {
      params: { status },
    });
    return response.data;
  },

  // Quotations
  getAllQuotations: async (filters = {}) => {
    const response = await httpClient.get('/admin/quotations', { params: filters });
    return response.data;
  },

  createQuotation: async (quotationData) => {
    const response = await httpClient.post('/admin/quotations', quotationData);
    return response.data;
  },

  updateQuotationStatus: async (quotationId, status) => {
    const response = await httpClient.put(`/admin/quotations/${quotationId}/status`, null, {
      params: { status },
    });
    return response.data;
  },

  downloadQuotationPdf: async (id) => {
    const response = await httpClient.get(`/admin/quotations/${id}/pdf`, {
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
  technician: technicianApi,
  file: fileApi,
};
