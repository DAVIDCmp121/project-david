import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/global.css';
import './styles/admin-actions.css';
import './styles/theme.css';

// ໂຫຼດທີມທີ່ບັນທຶກໄວ້ກ່ອນ render ເພື່ອບໍ່ໃຫ້ຈໍກະພິບສີຂາວກ່ອນ
try {
  const saved = localStorage.getItem('theme');
  document.documentElement.setAttribute('data-theme', saved === 'dark' ? 'dark' : 'light');
} catch (err) {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);