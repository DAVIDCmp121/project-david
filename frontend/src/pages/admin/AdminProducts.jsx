import { useEffect, useRef, useState } from 'react';
import { getAuthHeader } from '../../api.js';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', price: '', size: '', color: '', stock: '' });
  const imageRef = useRef(null);

  const [addOpen, setAddOpen] = useState(false);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrImage, setQrImage] = useState('');
  const [qrStatus, setQrStatus] = useState('ກຳລັງກວດສອບ...');
  const qrFileRef = useRef(null);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', price: '', size: '', color: '', stock: '' });
  const editImageRef = useRef(null);

  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [pendingSaveId, setPendingSaveId] = useState(null);

  async function loadProducts() {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(data);
  }

  async function loadCurrentQr() {
    const res = await fetch('/api/settings/payment-qr');
    const data = await res.json();
    if (data.qrImage) {
      setQrImage(data.qrImage);
      setQrStatus('QR ປັດຈຸບັນ:');
    } else {
      setQrStatus('ຍັງບໍ່ໄດ້ອັບໂຫລດ QR');
    }
  }

  useEffect(() => {
    loadProducts();
    loadCurrentQr();
  }, []);

  function closeAddModal() {
    setAddOpen(false);
    setForm({ name: '', price: '', size: '', color: '', stock: '' });
    if (imageRef.current) imageRef.current.value = '';
  }

  async function addProduct() {
    if (!form.name || !form.price) {
      alert('ກະລຸນາໃສ່ຊື່ສິນຄ້າ ແລະ ລາຄາ');
      return;
    }
    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('price', form.price);
    formData.append('size', form.size);
    formData.append('color', form.color);
    formData.append('stock', form.stock || 0);
    if (imageRef.current?.files[0]) formData.append('image', imageRef.current.files[0]);

    await fetch('/api/products', {
      method: 'POST',
      credentials: 'include',
      headers: { ...getAuthHeader() },
      body: formData,
    });

    closeAddModal();
    loadProducts();
  }

  async function deleteProduct(id) {
    if (!window.confirm('ຕ້ອງການລຶບສິນຄ້ານີ້ບໍ?')) return;
    await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { ...getAuthHeader() },
    });
    loadProducts();
  }

  function startEdit(p) {
    setEditingId(p.id);
    setEditForm({ name: p.name, price: p.price, size: p.size, color: p.color, stock: p.stock });
  }

  function cancelEdit() {
    setEditingId(null);
    if (editImageRef.current) editImageRef.current.value = '';
  }

  function askSaveEdit(id) {
    if (!editForm.name || !editForm.price) {
      alert('ກະລຸນາໃສ່ຊື່ສິນຄ້າ ແລະ ລາຄາ');
      return;
    }
    setPendingSaveId(id);
    setConfirmSaveOpen(true);
  }

  function cancelConfirmSave() {
    setConfirmSaveOpen(false);
    setPendingSaveId(null);
  }

  async function saveEdit(id) {
    const formData = new FormData();
    formData.append('name', editForm.name);
    formData.append('price', editForm.price);
    formData.append('size', editForm.size);
    formData.append('color', editForm.color);
    formData.append('stock', editForm.stock);
    if (editImageRef.current?.files[0]) formData.append('image', editImageRef.current.files[0]);

    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { ...getAuthHeader() },
      body: formData,
    });
    setConfirmSaveOpen(false);
    setPendingSaveId(null);
    if (res.ok) {
      setEditingId(null);
      loadProducts();
    } else {
      alert('ອັບເດດສິນຄ້າບໍ່ສຳເລັດ');
    }
  }

  async function uploadQr() {
    const file = qrFileRef.current?.files[0];
    if (!file) {
      alert('ກະລຸນາເລືອກຮູບ QR ກ່ອນ');
      return;
    }
    const formData = new FormData();
    formData.append('qrImage', file);

    const res = await fetch('/api/settings/payment-qr', {
      method: 'POST',
      credentials: 'include',
      headers: { ...getAuthHeader() },
      body: formData,
    });
    if (res.ok) {
      alert('ອັບໂຫລດ QR ສຳເລັດ ✅');
      qrFileRef.current.value = '';
      loadCurrentQr();
    } else {
      alert('ອັບໂຫລດບໍ່ສຳເລັດ');
    }
  }

  return (
    <div>
      <div className="admin-card" style={{ display: 'flex', gap: 10 }}>
        <button className="primary" onClick={() => setQrOpen(true)}>⚙️ QR ຊັບເງິນ</button>
        <button className="primary" onClick={() => setAddOpen(true)}>➕ ເພີ່ມສິນຄ້າ</button>
      </div>

      <div className="admin-card">
        {products.length === 0 && <p>ຍັງບໍ່ມີສິນຄ້າ</p>}
        {products.length > 0 && (
          <table className="admin-table">
            <thead>
              <tr><th>ຮູບ</th><th>ຊື່</th><th>ລາຄາ</th><th>ໄຊສ໌</th><th>ສີ</th><th>ສະຕັອກ</th><th></th></tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const isEditing = editingId === p.id;
                if (isEditing) {
                  return (
                    <tr key={p.id} style={{ background: '#fffbe6' }}>
                      <td>
                        {p.image && <img src={p.image} width={40} height={40} style={{ objectFit: 'cover', borderRadius: 6, marginBottom: 4 }} alt="" />}
                        <input type="file" accept="image/*" ref={editImageRef} style={{ width: 100, fontSize: 11 }} />
                      </td>
                      <td><input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={{ width: 100 }} /></td>
                      <td><input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} style={{ width: 80 }} /></td>
                      <td><input value={editForm.size} onChange={(e) => setEditForm({ ...editForm, size: e.target.value })} style={{ width: 60 }} /></td>
                      <td><input value={editForm.color} onChange={(e) => setEditForm({ ...editForm, color: e.target.value })} style={{ width: 60 }} /></td>
                      <td><input type="number" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} style={{ width: 60 }} /></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="primary" onClick={() => askSaveEdit(p.id)}>ບັນທຶກ</button>
                        <button onClick={cancelEdit} style={{ marginLeft: 4 }}>ຍົກເລີກ</button>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={p.id}>
                    <td>{p.image ? <img src={p.image} width={50} height={50} style={{ objectFit: 'cover', borderRadius: 6 }} alt="" /> : '-'}</td>
                    <td>{p.name}</td>
                    <td>{p.price} ກີບ</td>
                    <td>{p.size}</td>
                    <td>{p.color}</td>
                    <td>{p.stock}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button onClick={() => startEdit(p)}>ແກ້ໄຂ</button>
                      <button className="del-btn" onClick={() => deleteProduct(p.id)} style={{ marginLeft: 4 }}>ລຶບ</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {addOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeAddModal(); }}>
          <div className="modal-box" style={{ background: '#fff', color: '#1f2937' }}>
            <button className="modal-close" style={{ color: '#1f2937' }} onClick={closeAddModal}>✕</button>
            <h2 style={{ color: 'var(--navy)' }}>ເພີ່ມສິນຄ້າໃໝ່</h2>
            <input placeholder="ຊື່ສິນຄ້າ" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input placeholder="ລາຄາ" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <input placeholder="ໄຊສ໌" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
            <input placeholder="ສີ" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            <input placeholder="ຈຳນວນສະຕັອກ" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            <input type="file" accept="image/*" ref={imageRef} />
            <button className="primary" style={{ marginTop: 10 }} onClick={addProduct}>ເພີ່ມສິນຄ້າ</button>
          </div>
        </div>
      )}

      {confirmSaveOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) cancelConfirmSave(); }}>
          <div className="modal-box" style={{ background: '#fff', color: '#1f2937', maxWidth: 340, textAlign: 'center' }}>
            <p style={{ fontSize: '1.05rem', marginBottom: 20 }}>ຢືນຢັນບັນທຶກການແກ້ໄຂສິນຄ້ານີ້?</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="primary" onClick={() => saveEdit(pendingSaveId)}>ບັນທຶກ</button>
              <button onClick={cancelConfirmSave}>ຍົກເລີກ</button>
            </div>
          </div>
        </div>
      )}

      {qrOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setQrOpen(false); }}>
          <div className="modal-box" style={{ background: '#fff', color: '#1f2937' }}>
            <button className="modal-close" style={{ color: '#1f2937' }} onClick={() => setQrOpen(false)}>✕</button>
            <h2 style={{ color: 'var(--navy)' }}>ຮູບ QR ຊັບເງິນຮ້ານ</h2>
            {qrImage && <img src={qrImage} alt="QR" style={{ width: '100%', borderRadius: 8, marginBottom: 10 }} />}
            <p style={{ color: '#6b7280' }}>{qrStatus}</p>
            <input type="file" accept="image/*" ref={qrFileRef} />
            <button className="primary" style={{ marginTop: 10 }} onClick={uploadQr}>ອັບໂຫລດ QR</button>
          </div>
        </div>
      )}
    </div>
  );
}