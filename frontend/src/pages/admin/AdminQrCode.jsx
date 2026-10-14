import { useEffect, useState } from 'react';
import { usePageT } from '../../useT.js';
import qrDict from '../../locales/qrcode.js';

// ➕ ນຳຈາກ public/admin/qrcode.html

export default function AdminQrCode() {
  const { t } = usePageT(qrDict);
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
      <h1>{t('qr.title')}</h1>
      <div className="qr-box">
        {qrImg && <img src={qrImg} alt={t('qr.alt')} width={280} height={280} />}
      </div>
      <p className="url">{menuUrl}</p>
    </div>
  );
}