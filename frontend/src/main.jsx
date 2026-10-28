import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { LangProvider } from './i18n.jsx';
import './styles/global.css';
import './styles/admin-actions.css';
import './styles/theme.css';
import './styles/overflow-fix.css';

// โหลดธีมที่บันทึกไว้ก่อน render เพื่อไม่ให้จอกะพริบสีขาวก่อน
try {
  const saved = localStorage.getItem('theme');
  document.documentElement.setAttribute('data-theme', saved === 'dark' ? 'dark' : 'light');
} catch (err) {}

// ส่งทุก fetch('/api/...') ไปที่ backend (Render) พร้อมส่งคุกกี้ + token login
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

// รูปที่ขึ้นต้นด้วย /uploads/ ให้ไปโหลดจาก backend (Render) แทนเว็บ Firebase
if (API_BASE) {
  const fixSrc = (v) =>
    typeof v === 'string' && v.startsWith('/uploads/') ? API_BASE + v : v;

  const origSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    if (
      typeof name === 'string' &&
      name.toLowerCase() === 'src' &&
      (this instanceof HTMLImageElement || this instanceof HTMLSourceElement)
    ) {
      value = fixSrc(value);
    }
    return origSetAttribute.call(this, name, value);
  };

  const srcDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  if (srcDesc && srcDesc.set) {
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      ...srcDesc,
      set(v) {
        srcDesc.set.call(this, fixSrc(v));
      },
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LangProvider>
        <App />
      </LangProvider>
    </BrowserRouter>
  </React.StrictMode>
);