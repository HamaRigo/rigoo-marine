import axios from 'axios';

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT, 10) || 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// All request/response interceptors (auth token attachment, 401 handling, etc.)
// are registered by setupInterceptors() in interceptors.js, called once at app
// startup in main.jsx. Do NOT add interceptors here — duplicate handlers cause
// the unconditional redirect to fire before the skipAuthRedirect flag is checked.

export default httpClient;
