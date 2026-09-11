import { useEffect, useState } from 'react';

// ➕ ນຳຈາກ public/admin/qrcode.html

export default function AdminQrCode() {
  const [qrImg, setQrImg] = useState('');
  const [menuUrl, setMenuUrl] = useState('');

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/qrcode');
      const data = await res.json();
      setQrImg(data.qrImage);
      setMenuUrl(data.menuUrl);
    })();
  }, []);

  return (
    <div className="qr-page" style={{ minHeight: 'auto', background: 'none' }}>
      <h1>ສະແກນ QR Code ເພື່ອເລືອກເບີ່ງສິນຄ້າ</h1>
      <div className="qr-box">
        {qrImg && <img src={qrImg} alt="QR Code" width={280} height={280} />}
      </div>
      <p className="url">{menuUrl}</p>
    </div>
  );
}
