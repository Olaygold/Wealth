import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.PROD 
    ? 'https://wealth-f1i2.onrender.com/api'  // ← YOUR RENDER URL
    : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ... rest stays the same
