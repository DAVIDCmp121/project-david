import { Routes, Route, Navigate } from 'react-router-dom';

import ProductList from './pages/customer/ProductList.jsx';
import CustomerLogin from './pages/customer/Login.jsx';
import Checkout from './pages/customer/Checkout.jsx';
import CustomerOrders from './pages/customer/Orders.jsx';
import CustomerChat from './pages/customer/Chat.jsx';

import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminProducts from './pages/admin/AdminProducts.jsx';
import AdminOrders from './pages/admin/AdminOrders.jsx';
import AdminQrCode from './pages/admin/AdminQrCode.jsx';
import AdminChat from './pages/admin/AdminChat.jsx';
import AdminCustomers from './pages/admin/AdminCustomers.jsx';
import AdminStaff from './pages/admin/AdminStaff.jsx';
import AdminLayout from './components/AdminLayout.jsx';

import StaffLogin from './pages/staff/StaffLogin.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/menu" replace />} />

      {/* ---------- ຝັ່ງລູກຄ້າ ---------- */}
      <Route path="/menu" element={<ProductList />} />
      <Route path="/menu/login" element={<CustomerLogin />} />
      <Route path="/menu/checkout" element={<Checkout />} />
      <Route path="/menu/orders" element={<CustomerOrders />} />
      <Route path="/menu/chat" element={<CustomerChat />} />

      {/* ---------- ຝັ່ງພະນັກງານ ---------- */}
      <Route path="/staff/login" element={<StaffLogin />} />

      {/* ---------- ຝັ່ງແອດມິນ (ໃຊ້ AdminLayout ຫໍ່ໜ້າທັງໝົດ ເພື່ອກວດ role ແລະ ໂຊວ໌ nav) ---------- */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <AdminLayout active="products">
            <AdminProducts />
          </AdminLayout>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <AdminLayout active="orders">
            <AdminOrders />
          </AdminLayout>
        }
      />
      <Route
        path="/admin/qrcode"
        element={
          <AdminLayout active="qrcode">
            <AdminQrCode />
          </AdminLayout>
        }
      />
      <Route
        path="/admin/chat"
        element={
          <AdminLayout active="chat">
            <AdminChat />
          </AdminLayout>
        }
      />
      <Route
        path="/admin/customers"
        element={
          <AdminLayout active="customers">
            <AdminCustomers />
          </AdminLayout>
        }
      />
      <Route
        path="/admin/staff"
        element={
          <AdminLayout active="staff">
            <AdminStaff />
          </AdminLayout>
        }
      />
    </Routes>
  );
}
