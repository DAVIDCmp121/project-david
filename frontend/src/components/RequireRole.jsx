import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { apiGet } from '../api.js';

// ถ้า routes/auth.js ถูก mount ที่ path อื่นใน server.js ให้แก้บรรทัดนี้
const ADMIN_ME_URL = '/api/auth/me';

let cachedRole = null;
let cachedAt = 0;
const CACHE_MS = 30000;

export function clearRoleCache() {
  cachedRole = null;
  cachedAt = 0;
}

// ครอบหน้าที่ต้องการสิทธิ์: <RequireRole roles={['admin']}>...</RequireRole>
export default function RequireRole({ roles, children }) {
  const fresh = cachedRole && Date.now() - cachedAt < CACHE_MS;
  const [role, setRole] = useState(fresh ? cachedRole : undefined); // undefined = กำลังตรวจ, null = ไม่ผ่าน

  useEffect(() => {
    let alive = true;
    apiGet(ADMIN_ME_URL).then((r) => {
      if (!alive) return;
      if (r.ok && r.data && r.data.role) {
        cachedRole = r.data.role;
        cachedAt = Date.now();
        setRole(r.data.role);
      } else {
        clearRoleCache();
        setRole(null);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  if (role === undefined) return null;
  if (role === null) return <Navigate to="/admin/login" replace />;
  if (!roles.includes(role)) {
    // ล็อกอินแล้วแต่สิทธิ์ไม่พอ: พนักงาน/แอดมินกลับหน้าหลัก คนอื่นไปหน้า login
    return <Navigate to={['admin', 'staff'].includes(role) ? '/admin' : '/admin/login'} replace />;
  }
  return children;
}