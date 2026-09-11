// ➕ Helper ກາງສລັບເອີນ API — ໃສ່ credentials: 'include' ໃຫ້ອດຕະໂນມດທກຄັງ
// (ຈເປັນເພອສງ cookie login ໄປນ, ຄືກັບທກ fetch() ໃນເວບເກາ)

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function apiGet(url) {
  const res = await fetch(`${API_BASE}${url}`, { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function apiPost(url, body) {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function apiPut(url, body) {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function apiDelete(url) {
  const res = await fetch(`${API_BASE}${url}`, { method: 'DELETE', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ສລບອບໂຫລດໄຟລ (FormData) — ຫາມໃສ່ Content-Type ເອງ ໃຫ້ browser ຕງໃຫ້
export async function apiUpload(url, formData, method = 'POST') {
  const res = await fetch(`${API_BASE}${url}`, {
    method,
    credentials: 'include',
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}