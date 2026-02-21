
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://wealth-f1i2.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Add token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('API Request:', config.method.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Handle responses globally
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.config.url, response.data);
    return response.data;
  },
  (error) => {
    console.error('API Error:', error.response || error.message);
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Return the actual error message from backend
    const errorMessage = error.response?.data?.message || error.message || 'Network error';
    return Promise.reject(new Error(errorMessage));
  }
);

export default api;
