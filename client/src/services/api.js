import axios from 'axios';

// In dev or when no custom domain is passed, use a relative `/api` path so
// requests hit Vite's local dev proxy. This prevents Chromium's Private Network
// Access (PNA) checks from blocking cross-port requests (e.g. 5173 -> 5000)
// with net::ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS / net::ERR_FAILED.
const API_BASE_URL = (
  import.meta.env.VITE_API_URL
  || import.meta.env.VITE_API_BASE_URL
  || ''
).replace(/\/+$/, '');

const API = axios.create({
  baseURL: API_BASE_URL ? `${API_BASE_URL}/api` : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Automatically attach JWT token to headers
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      
      window.dispatchEvent(new Event('auth-logout'));
    }
    return Promise.reject(error);
  }
);

export default API;
