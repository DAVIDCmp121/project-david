export const API_BASE = import.meta.env.VITE_API_URL || '';

const ADMIN_TOKEN_KEY = 'auth_token';
const CUSTOMER_TOKEN_KEY = 'customer_auth_token';

// หน้าไหนใช้ token ของใคร: /admin และ /staff = แอดมิน/พนักงาน, อื่นๆ = ลูกค้า
function inStaffArea() {
  const p = window.location.pathname;
  return p.startsWith('/admin') || p.startsWith('/staff');
}

function tokenKey() {
  return inStaffArea() ? ADMIN_TOKEN_KEY : CUSTOMER_TOKEN_KEY;
}

// ย้าย token ลูกค้าเก่าที่เคยเก็บไว้ใน auth_token ไปที่กุญแจลูกค้า (ทำครั้งเดียว)
function migrateLegacyCustomerToken() {
  try {
    if (localStorage.getItem(CUSTOMER_TOKEN_KEY)) return;
    const legacy = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!legacy) return;
    const payload = JSON.parse(atob(legacy.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload && payload.customerId) {
      localStorage.setItem(CUSTOMER_TOKEN_KEY, legacy);
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  } catch (e) {}
}

export function saveToken(token) {
  if (token) localStorage.setItem(tokenKey(), token);
}

export function clearToken() {
  localStorage.removeItem(tokenKey());
}

// export ไว้ให้ไฟล์ที่ยังใช้ fetch() ตรงๆ (ไม่ผ่าน helper) เรียกใช้ได้
export function getAuthHeader() {
  if (!inStaffArea()) migrateLegacyCustomerToken();
  const token = localStorage.getItem(tokenKey());
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function authHeaders() {
  return getAuthHeader();
}

export async function apiGet(url) {
  const res = await fetch(`${API_BASE}${url}`, {
    credentials: 'include',
    headers: { ...authHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function apiPost(url, body) {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function apiPut(url, body) {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function apiDelete(url) {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { ...authHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function apiUpload(url, formData, method = 'POST') {
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    credentials: 'include',
    headers: { ...authHeaders() },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}