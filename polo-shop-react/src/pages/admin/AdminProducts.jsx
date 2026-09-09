import { useEffect, useRef, useState } from 'react';

// ➕ ນຳມາຈາກ public/admin/index.html + script.js ຕົ້ນສະບັບ (ໄຟລ໌ຈິງ — ໄດ້ຮັບແລ້ວ)
// ພຶດຕິກຳຈິງ: ບໍ່ມີການເຊື່ອງປຸ່ມ/ຟອມສຳລັບພະນັກງານໃນໜ້ານີ້ເລີຍ (ອາໄສ backend ບລັອກ 403 ແທນ)
// ຊື່ field ອັບໂຫລດ QR ແມ່ນ "qrImage" (ບໍ່ແມ່ນ "qr")

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', price: '', size: '', color: '', stock: '' });
  const imageRef = useRef(null);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrImage, setQrImage] = useState('');
  const [qrStatus, setQrStatus] = useState('ກຳລັງກວດສອບ...');
  const qrFileRef = useRef(null);

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

    await fetch('/api/products', { method: 'POST', credentials: 'include', body: formData });

    setForm({ name: '', price: '', size: '', color: '', stock: '' });
    if (imageRef.current) imageRef.current.value = '';
    loadProducts();
  }

  async function deleteProduct(id) {
    if (!window.confirm('ຕ້ອງການລຶບສິນຄ້ານີ້ບໍ?')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE', credentials: 'include' });
    loadProducts();
  }

  async function uploadQr() {
    const file = qrFileRef.current?.files[0];
    if (!file) {
      alert('ກະລຸນາເລືອກຮູບ QR ກ່ອນ');
      return;
    }
    const formData = new FormData();
    formData.append('qrImage', file);

    const res = await fetch('/api/settings/payment-qr', { method: 'POST', credentials: 'include', body: formData });
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
      <div className="admin-card">
        <button className="primary" onClick={() => setQrOpen(true)}>⚙️ QR ຊັບເງິນ</button>
      </div>

      <div className="admin-card">
        <h2>ເພີ່ມສິນຄ້າໃໝ່</h2>
        <input placeholder="ຊື່ສິນຄ້າ" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="ລາຄາ" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <input placeholder="ໄຊສ໌" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
        <input placeholder="ສີ" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
        <input placeholder="ຈຳນວນສະຕັອກ" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        <input type="file" accept="image/*" ref={imageRef} />
        <button className="primary" onClick={addProduct}>ເພີ່ມສິນຄ້າ</button>
      </div>

      <div className="admin-card">
        {products.length === 0 && <p>ຍັງບໍ່ມີສິນຄ້າ</p>}
        {products.length > 0 && (
          <table className="admin-table">
            <thead>
              <tr><th>ຮູບ</th><th>ຊື່</th><th>ລາຄາ</th><th>ໄຊສ໌</th><th>ສີ</th><th>ສະຕັອກ</th><th></th></tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>{p.image ? <img src={p.image} width={50} height={50} style={{ objectFit: 'cover', borderRadius: 6 }} alt="" /> : '-'}</td>
                  <td>{p.name}</td>
                  <td>{p.price} ກີບ</td>
                  <td>{p.size}</td>
                  <td>{p.color}</td>
                  <td>{p.stock}</td>
                  <td><button className="del-btn" onClick={() => deleteProduct(p.id)}>ລຶບ</button></td>
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