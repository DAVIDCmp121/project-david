// ➕ Helper ກາງສຳລັບເອີ້ນ API — ໃສ່ credentials: 'include' ໃຫ້ອັດຕະໂນມັດທຸກຄັ້ງ
// (ຈຳເປັນເພື່ອສົ່ງ cookie login ໄປນຳ, ຄືກັບທຸກ fetch() ໃນເວັບເກົ່າ)

export async function apiGet(url) {
  const res = await fetch(url, { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function apiPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function apiPut(url, body) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function apiDelete(url) {
  const res = await fetch(url, { method: 'DELETE', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ສຳລັບອັບໂຫລດໄຟລ໌ (FormData) — ຫ້າມໃສ່ Content-Type ເອງ ໃຫ້ browser ຕັ້ງໃຫ້
export async function apiUpload(url, formData, method = 'POST') {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
