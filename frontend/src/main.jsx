import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/global.css';

// ส่งทุก fetch('/api/...') ไปที่ backend (Render) พรอมสงคุกกี้ + token login
const API_BASE = import.meta.env.VITE_API_URL || '';
const originalFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
  if (typeof input === 'string' && input.startsWith('/')) {
    input = API_BASE + input;
    const token = localStorage.getItem('customer_token');
    init = {
      credentials: 'include',
      ...init,
      headers: {
        ...(init.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
  }
  return originalFetch(input, init);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);