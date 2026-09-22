// Helper กลางสำหรับเรยก API — แนบทง cookie (เดม) และ Bearer token (ใหม่) ใหอตโนมัติทุกครง

export const API_BASE = import.meta.env.VITE_API_URL || '';

function authHeaders(extra = {}) {
  const token = localStorage.getItem('customer_token');
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function apiGet(url) {
  const res = await fetch(`${API_BASE}${url}`, {
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function apiPost(url, body) {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function apiPut(url, body) {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'PUT',
    credentials: 'include',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function apiDelete(url) {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// สำหรับอัปโหลดไฟล์ (FormData) — ห้ามใส่ Content-Type เอง ให browser ตั้งให
export async function apiUpload(url, formData, method = 'POST') {
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    credentials: 'include',
    headers: authHeaders(),
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}