export const API_BASE = import.meta.env.VITE_API_URL || '';

const TOKEN_KEY = 'auth_token';

export function saveToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ✅ ໃໝ່: export ໄວ້ໃຫ້ໄຟລ໌ທີ່ຍັງໃຊ້ fetch() ກົງໆ (ບໍ່ຜ່ານ helper) ເອີ້ນໃຊ້ໄດ້
export function getAuthHeader() {
  const token = localStorage.getItem(TOKEN_KEY);
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