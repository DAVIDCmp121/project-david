import { useEffect, useRef, useState } from 'react';
import { apiDelete, apiUpload } from '../../api.js';

// ⚠️ ໝາຍເຫດ: ໄຟລ໌ public/admin/index.html + script.js ຕົ້ນສະບັບ (ສ່ວນ JS ຈັດການສິນຄ້າ)
// ບໍ່ເຄີຍຖືກສົ່ງມາໃຫ້ເບິ່ງທັງໝົດ Component ນີ້ສ້າງຂຶ້ນຕາມຄຸນສົມບັດທີ່ໄດ້ອະທິບາຍໄວ້
// (ຟອມເພີ່ມສິນຄ້າ: ຊື່/ລາຄາ/ໄຊສ໌/ສີ/ສະຕ໋ອກ/ຮູບ, ປຸ່ມລຶບສະເພາະແອດມິນ, Modal ຕັ້ງຄ່າ QR ຮັບເງິນ)
// ຊື່ endpoint ສຳລັບອັບໂຫລດ QR ຮັບເງິນ (/api/settings/payment-qr ແບບ POST) ເປັນການສົມມຸດ — ກະລຸນາກວດສອບ

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [role, setRole] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', size: '', color: '', stock: '' });
  const [imageFile, setImageFile] = useState(null);
  const [formError, setFormError] = useState('');

  const [qrOpen, setQrOpen] = useState(false);
  const [qrImage, setQrImage] = useState('');
  const [qrStatus, setQrStatus] = useState('ກຳລັງກວດສອບ...');
  const qrFileRef = useRef(null);

  async function loadProducts() {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(data);
  }

  async function loadRole() {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setRole(data.role || 'admin');
    }
  }

  async function loadQr() {
    const res = await fetch('/api/settings/payment-qr');
    const data = await res.json();
    if (data.qrImage) {
      setQrImage(data.qrImage);
      setQrStatus('');
    } else {
      setQrStatus('ຍັງບໍ່ມີ QR ຮັບເງິນ');
    }
  }

  useEffect(() => {
    loadProducts();
    loadRole();
    loadQr();
  }, []);

  async function addProduct() {
    setFormError('');
    if (!form.name || !form.price) {
      setFormError('ກະລຸນາປ້ອນຊື່ ແລະ ລາຄາຢ່າງໜ້ອຍ');
      return;
    }
    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('price', form.price);
    formData.append('size', form.size);
    formData.append('color', form.color);
    formData.append('stock', form.stock);
    if (imageFile) formData.append('image', imageFile);

    const { ok, data } = await apiUpload('/api/products', formData, 'POST');
    if (ok) {
      setForm({ name: '', price: '', size: '', color: '', stock: '' });
      setImageFile(null);
      loadProducts();
    } else {
      setFormError(data.error || 'ເພີ່ມສິນຄ້າບໍ່ສຳເລັດ');
    }
  }

  async function deleteProduct(id) {
    if (!window.confirm('ຢືນຢັນລຶບສິນຄ້ານີ້?')) return;
    const { data } = await apiDelete(`/api/products/${id}`);
    if (data.success) {
      loadProducts();
    } else {
      alert(data.error || 'ລຶບບໍ່ສຳເລັດ');
    }
  }

  async function uploadQr() {
    if (!qrFileRef.current?.files[0]) return;
    const formData = new FormData();
    formData.append('qr', qrFileRef.current.files[0]);
    const { ok, data } = await apiUpload('/api/settings/payment-qr', formData, 'POST');
    if (ok) {
      loadQr();
    } else {
      alert(data.error || 'ອັບໂຫລດ QR ບໍ່ສຳເລັດ');
    }
  }

  const isAdmin = role === 'admin';

  return (
    <div>
      <div className="admin-card">
        <button className="primary" onClick={() => setQrOpen(true)}>⚙️ QR ຮັບເງິນ</button>
      </div>

      <div className="admin-card">
        <h2>ເພີ່ມສິນຄ້າໃໝ່</h2>
        <input placeholder="ຊື່ສິນຄ້າ" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="ລາຄາ" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <input placeholder="ໄຊສ໌" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
        <input placeholder="ສີ" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
        <input placeholder="ຈຳນວນສະຕ໋ອກ" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
        <div className="field-error" style={{ color: '#dc2626' }}>{formError}</div>
        <button className="primary" onClick={addProduct}>ເພີ່ມສິນຄ້າ</button>
      </div>

      <div className="admin-card">
        <h2>ລາຍການສິນຄ້າ</h2>
        {products.length === 0 && <p>ຍັງບໍ່ມີສິນຄ້າ</p>}
        {products.length > 0 && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ຮູບ</th><th>ຊື່</th><th>ໄຊສ໌</th><th>ສີ</th><th>ສະຕ໋ອກ</th><th>ລາຄາ</th><th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.image && <img src={p.image} alt={p.name} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 6 }} />}</td>
                  <td>{p.name}</td>
                  <td>{p.size}</td>
                  <td>{p.color}</td>
                  <td>{p.stock}</td>
                  <td>{p.price} ກີບ</td>
                  <td>
                    {isAdmin && <button className="del-btn" onClick={() => deleteProduct(p.id)}>ລຶບ</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {qrOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setQrOpen(false); }}>
          <div className="modal-box" style={{ background: '#fff', color: '#1f2937' }}>
            <button className="modal-close" style={{ color: '#1f2937' }} onClick={() => setQrOpen(false)}>✕</button>
            <h2 style={{ color: 'var(--navy)' }}>ຮູບ QR ຮັບເງິນຮ້ານ</h2>
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
