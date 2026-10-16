import { useEffect, useRef, useState } from 'react';
import { API_BASE, apiGet, getAuthHeader } from '../api';
import { usePageT } from '../useT.js';

const MAX_PHOTOS = 4;
const PREVIEW_COUNT = 3; // ສະແດງຣີວິວຫຼ້າສຸດກີ່ອັນກ່ອນ

const dict = {
  lo: {
    'rv.title': 'ຣີວິວສິນຄ້າ',
    'rv.none': 'ຍັງບໍ່ມີຣີວິວ',
    'rv.reviews': 'ຣີວິວ',
    'rv.write': 'ຂຽນຣີວິວ',
    'rv.tapStar': 'ແຕະດາວເພື່ອໃຫ້ຄະແນນ',
    'rv.star1': 'ແຍ່',
    'rv.star2': 'ບໍ່ຄ່ອຍດີ',
    'rv.star3': 'ປານກາງ',
    'rv.star4': 'ດີ',
    'rv.star5': 'ດີເລີດ',
    'rv.placeholder': 'ເລົ່າໃຫ້ຟັງໜ່ອຍວ່າສິນຄ້າເປັນແນວໃດ (ບໍ່ບັງຄັບ)',
    'rv.addPhoto': 'ແນບຮູບ',
    'rv.photoLimit': 'ແນບໄດ້ສູງສຸດ 4 ຮູບ',
    'rv.removePhoto': 'ລຶບຮູບ',
    'rv.submit': 'ສົ່ງຣີວິວ',
    'rv.sending': 'ກຳລັງສົ່ງ...',
    'rv.thanks': 'ຂອບໃຈສຳລັບຣີວິວ!',
    'rv.onlyBuyers': 'ຣີວິວໄດ້ສະເພາະຜູ້ທີ່ຊື້ ແລະ ໄດ້ຮັບສິນຄ້າແລ້ວ',
    'rv.fail': 'ສົ່ງຣີວິວບໍ່ສຳເລັດ',
    'rv.pickStars': 'ກະລຸນາເລືອກຈຳນວນດາວ',
    'rv.showAll': 'ເບິ່ງຣີວິວທັງໝົດ',
    'rv.showLess': 'ເຊື່ອງ',
  },
  th: {
    'rv.title': 'รีวิวสินค้า',
    'rv.none': 'ยังไม่มีรีวิว',
    'rv.reviews': 'รีวิว',
    'rv.write': 'เขียนรีวิว',
    'rv.tapStar': 'แตะดาวเพื่อให้คะแนน',
    'rv.star1': 'แย่',
    'rv.star2': 'ไม่ค่อยดี',
    'rv.star3': 'ปานกลาง',
    'rv.star4': 'ดี',
    'rv.star5': 'ยอดเยี่ยม',
    'rv.placeholder': 'เล่าให้ฟังหน่อยว่าสินค้าเป็นอย่างไร (ไม่บังคับ)',
    'rv.addPhoto': 'แนบรูป',
    'rv.photoLimit': 'แนบได้สูงสุด 4 รูป',
    'rv.removePhoto': 'ลบรูป',
    'rv.submit': 'ส่งรีวิว',
    'rv.sending': 'กำลังส่ง...',
    'rv.thanks': 'ขอบคุณสำหรับรีวิว!',
    'rv.onlyBuyers': 'รีวิวได้เฉพาะผู้ที่ซื้อและได้รับสินค้าแล้ว',
    'rv.fail': 'ส่งรีวิวไม่สำเร็จ',
    'rv.pickStars': 'กรุณาเลือกจำนวนดาว',
    'rv.showAll': 'ดูรีวิวทั้งหมด',
    'rv.showLess': 'ซ่อน',
  },
  en: {
    'rv.title': 'Reviews',
    'rv.none': 'No reviews yet',
    'rv.reviews': 'reviews',
    'rv.write': 'Write a review',
    'rv.tapStar': 'Tap a star to rate',
    'rv.star1': 'Poor',
    'rv.star2': 'Fair',
    'rv.star3': 'Okay',
    'rv.star4': 'Good',
    'rv.star5': 'Excellent',
    'rv.placeholder': 'Tell us what you think of this product (optional)',
    'rv.addPhoto': 'Add photo',
    'rv.photoLimit': 'Up to 4 photos',
    'rv.removePhoto': 'Remove photo',
    'rv.submit': 'Submit review',
    'rv.sending': 'Sending...',
    'rv.thanks': 'Thanks for your review!',
    'rv.onlyBuyers': 'Only customers who bought and received this item can review it',
    'rv.fail': 'Could not submit review',
    'rv.pickStars': 'Please select a star rating',
    'rv.showAll': 'Show all reviews',
    'rv.showLess': 'Show less',
  },
};

const css = `
.rv-wrap { max-width: 1000px; margin: 0 auto; padding: 8px 16px 24px; }
.rv-title { font-size: 1.05rem; font-weight: 700; margin: 0 0 12px; color: var(--cust-text); }

/* ---------- สรุปคะแนน + ปุ่มเขียนรีวิว ---------- */
.rv-summary {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  background: var(--cust-card); border: 1px solid var(--cust-border);
  border-radius: 14px; padding: 14px 16px; margin-bottom: 12px;
}
.rv-sum-left { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.rv-avg { font-size: 2rem; font-weight: 800; line-height: 1; color: var(--cust-text); }
.rv-count { font-size: 0.85rem; color: var(--cust-text-muted); }
.rv-write-btn {
  display: inline-flex; align-items: center; gap: 6px; border: none; cursor: pointer;
  background: var(--gold); color: #fff; font-weight: 700; font-size: 0.9rem; font-family: inherit;
  padding: 10px 18px; border-radius: 999px; box-shadow: 0 2px 8px rgba(201, 162, 39, 0.3);
  transition: transform 0.12s, box-shadow 0.12s;
}
.rv-write-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(201, 162, 39, 0.4); }
.rv-hint { font-size: 0.8rem; color: var(--cust-text-muted); margin: -4px 2px 12px; }
.rv-empty {
  text-align: center; color: var(--cust-text-muted); font-size: 0.9rem; padding: 22px 10px;
  border: 1px dashed var(--cust-border); border-radius: 14px;
}
.rv-stars { display: inline-flex; gap: 2px; }

/* ---------- รายการรีวิว ---------- */
.rv-list { display: flex; flex-direction: column; gap: 10px; }
.rv-card {
  background: var(--cust-card); border: 1px solid var(--cust-border);
  border-radius: 14px; padding: 12px 14px;
}
.rv-card-head { display: flex; align-items: center; gap: 10px; }
.rv-avatar {
  width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #e8c25a, #c9a227); color: #fff;
  display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.95rem;
}
.rv-who { min-width: 0; flex: 1; }
.rv-name { font-weight: 700; font-size: 0.88rem; color: var(--cust-text); line-height: 1.2; }
.rv-sub { display: flex; align-items: center; gap: 8px; margin-top: 2px; }
.rv-date { font-size: 0.74rem; color: var(--cust-text-muted); }
.rv-comment {
  margin: 8px 0 0; white-space: pre-wrap; line-height: 1.5; font-size: 0.9rem;
  color: var(--cust-text); word-break: break-word;
}
.rv-imgs { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.rv-imgs img {
  width: 64px; height: 64px; object-fit: cover; border-radius: 10px; cursor: zoom-in;
  border: 1px solid var(--cust-border); background: #f4f4f2;
}
.rv-more {
  display: block; margin: 12px auto 0; background: none; cursor: pointer;
  border: 1px solid var(--cust-border); color: var(--cust-text); font-family: inherit;
  font-size: 0.88rem; font-weight: 600; padding: 9px 22px; border-radius: 999px;
}
.rv-more:hover { border-color: var(--gold); color: var(--gold); }

/* ---------- popup เขียนรีวิว ---------- */
.rv-overlay {
  position: fixed; inset: 0; z-index: 3000; background: rgba(0, 0, 0, 0.55);
  display: flex; align-items: flex-end; justify-content: center;
  animation: rvFade 0.18s ease-out;
}
.rv-modal {
  width: 100%; max-height: 92vh; display: flex; flex-direction: column;
  background: var(--cust-card, #fff); color: var(--cust-text);
  border-radius: 20px 20px 0 0; box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.25);
  animation: rvUp 0.22s ease-out;
}
.rv-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px 8px;
}
.rv-modal-head h3 { margin: 0; font-size: 1.05rem; font-weight: 800; color: var(--cust-text); }
.rv-x {
  width: 32px; height: 32px; border-radius: 50%; border: none; cursor: pointer;
  background: rgba(127, 127, 127, 0.15); color: var(--cust-text); font-size: 14px; padding: 0;
}
.rv-modal-body { padding: 4px 18px 8px; overflow-y: auto; }
.rv-pick { display: flex; justify-content: center; gap: 6px; margin: 6px 0 2px; }
.rv-pick button { background: none; border: none; padding: 2px; cursor: pointer; line-height: 0; transition: transform 0.12s; }
.rv-pick button:hover { transform: scale(1.12); }
.rv-star-label {
  text-align: center; font-size: 0.88rem; font-weight: 700; min-height: 1.3em;
  color: var(--gold); margin-bottom: 10px;
}
.rv-star-label.idle { color: var(--cust-text-muted); font-weight: 500; }
.rv-text {
  width: 100%; box-sizing: border-box; min-height: 96px; resize: none;
  padding: 11px 13px; border-radius: 12px; border: 1px solid var(--cust-border);
  background: transparent; color: var(--cust-text); font-family: inherit; font-size: 0.92rem;
}
.rv-text:focus { outline: none; border-color: var(--gold); }
.rv-photos { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; align-items: center; }
.rv-thumb {
  position: relative; width: 64px; height: 64px; border-radius: 10px; overflow: hidden;
  border: 1px solid var(--cust-border); background: #f4f4f2; flex-shrink: 0;
}
.rv-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; cursor: zoom-in; }
.rv-thumb .rm {
  position: absolute; top: 2px; right: 2px; width: 20px; height: 20px; border-radius: 50%;
  border: none; background: rgba(0, 0, 0, 0.65); color: #fff; font-size: 11px; line-height: 1;
  cursor: pointer; padding: 0;
}
.rv-add {
  width: 64px; height: 64px; border-radius: 10px; border: 1px dashed var(--cust-border);
  background: transparent; color: var(--cust-text-muted); cursor: pointer; font-family: inherit;
  font-size: 0.7rem; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 2px; padding: 0;
}
.rv-add:hover { border-color: var(--gold); color: var(--gold); }
.rv-add b { font-size: 1.2rem; line-height: 1; }
.rv-photo-hint { font-size: 0.74rem; color: var(--cust-text-muted); margin-top: 6px; }
.rv-err { color: #dc2626; font-size: 0.85rem; margin-top: 8px; }
.rv-modal-foot { padding: 10px 18px 18px; }
.rv-submit {
  width: 100%; padding: 13px; border: none; border-radius: 12px; cursor: pointer;
  background: var(--gold); color: #fff; font-weight: 800; font-size: 0.98rem; font-family: inherit;
}
.rv-submit:disabled { opacity: 0.5; cursor: default; }

@media (min-width: 640px) {
  .rv-overlay { align-items: center; padding: 20px; }
  .rv-modal { width: 460px; border-radius: 18px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35); animation: rvPop 0.2s ease-out; }
}
@keyframes rvFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes rvUp { from { transform: translateY(40px); opacity: 0.6; } to { transform: translateY(0); opacity: 1; } }
@keyframes rvPop { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.rv-lightbox {
  position: fixed; inset: 0; z-index: 3100; background: rgba(0, 0, 0, 0.88);
  display: flex; align-items: center; justify-content: center; padding: 16px; cursor: zoom-out;
}
.rv-lightbox img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; }
.rv-toast {
  position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%); z-index: 3200;
  background: #333; color: #fff; padding: 10px 18px; border-radius: 999px; font-size: 0.9rem;
}

:root[data-theme='dark'] .rv-modal { background: #1b1b1f; box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.6); }
:root[data-theme='dark'] .rv-card,
:root[data-theme='dark'] .rv-summary { background: linear-gradient(160deg, #1f1f24 0%, #151518 100%); }
`;

// ດາວ 1 ດວງ (SVG)
function StarIcon({ filled, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <polygon
        points="12,2 15,9 22,9.3 16.5,14 18.2,21 12,17 5.8,21 7.5,14 2,9.3 9,9"
        fill={filled ? 'var(--gold)' : 'none'}
        stroke={filled ? 'var(--gold)' : '#d1d5db'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ແຖວດາວ (ສະແດງຢ່າງດຽວ) — ໃຊ້ໃນໜ້າສິນຄ້າດ້ວຍ
export function Stars({ value, size = 16 }) {
  const full = Math.round(Number(value) || 0);
  return (
    <span className="rv-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} filled={n <= full} size={size} />
      ))}
    </span>
  );
}

// ຍ່ອຮູບກ່ອນສົ່ງ (ຮູບຈາກມືຖືໃຫຍ່ 3-8MB) → ດ້ານຍາວສຸດ 1280px, JPEG
function compressImage(file, maxSide = 1280, quality = 0.8) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          resolve(blob || file);
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

function imgSrc(u) {
  return /^https?:\/\//i.test(u) ? u : `${API_BASE}${u}`;
}

export default function ProductReviews({ productId, onStats }) {
  const { t } = usePageT(dict);

  const [data, setData] = useState({ average: 0, count: 0, reviews: [] });
  const [canReview, setCanReview] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const [open, setOpen] = useState(false); // popup เขียนรีวิว
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState([]); // [{ blob, preview }]
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [viewImg, setViewImg] = useState('');
  const [toast, setToast] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // ລັອກການເລື່ອນໜ້າ ແລະ ກົດ Esc ປິດ ຕອນເປີດ popup
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, busy]);

  function showToast(m) {
    setToast(m);
    setTimeout(() => setToast(''), 2200);
  }

  function resetForm() {
    setFiles((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.preview));
      return [];
    });
    setRating(0);
    setComment('');
    setMsg('');
  }

  async function loadReviews() {
    try {
      const { ok, data: d } = await apiGet(`/api/reviews/product/${productId}`);
      if (ok && d && d.success) {
        const next = { average: d.average, count: d.count, reviews: d.reviews || [] };
        setData(next);
        if (onStats) onStats({ average: next.average, count: next.count });
      }
    } catch (err) {
      // ບໍ່ມີຣີວິວ ກໍບໍ່ເປັນຫຍັງ
    }
    try {
      const { ok, data: d } = await apiGet(`/api/reviews/can-review/${productId}`);
      if (ok && d && d.success) setCanReview(!!d.canReview);
    } catch (err) {
      // ບໍ່ login — ຂຽນຣີວິວບໍ່ໄດ້
    }
  }

  function closeModal() {
    if (busy) return;
    setOpen(false);
  }

  async function onPickPhotos(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = ''; // ໃຫ້ເລືອກໄຟລ໌ເດີມຊ້ຳໄດ້
    if (picked.length === 0) return;
    const room = MAX_PHOTOS - files.length;
    const take = picked.slice(0, Math.max(0, room));
    const added = [];
    for (const file of take) {
      const blob = await compressImage(file);
      added.push({ blob, preview: URL.createObjectURL(blob) });
    }
    setFiles((prev) => [...prev, ...added].slice(0, MAX_PHOTOS));
  }

  function removePhoto(idx) {
    setFiles((prev) => {
      const f = prev[idx];
      if (f) URL.revokeObjectURL(f.preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function submit() {
    if (!rating) {
      setMsg(t('rv.pickStars'));
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      // ສົ່ງແບບ FormData (ມີຮູບ) — ຫ້າມຕັ້ງ Content-Type ເອງ ໃຫ້ເບົາເຊີຕັ້ງ boundary
      const fd = new FormData();
      fd.append('productId', String(productId));
      fd.append('rating', String(rating));
      fd.append('comment', comment);
      files.forEach((f, i) => fd.append('images', f.blob, `review-${i}.jpg`));

      const headers = { ...getAuthHeader() };
      delete headers['Content-Type'];
      delete headers['content-type'];

      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: fd,
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d && d.success) {
        setOpen(false);
        resetForm();
        showToast(t('rv.thanks'));
        await loadReviews();
      } else {
        setMsg((d && d.message) || t('rv.fail'));
      }
    } catch (err) {
      console.error(err);
      setMsg(t('rv.fail'));
    } finally {
      setBusy(false);
    }
  }

  const list = showAll ? data.reviews : data.reviews.slice(0, PREVIEW_COUNT);

  return (
    <section className="rv-wrap" id="reviews">
      <style>{css}</style>

      <h2 className="rv-title">{t('rv.title')}</h2>

      {/* ---------- สรุปคะแนน + ปุ่มเขียนรีวิว ---------- */}
      <div className="rv-summary">
        <div className="rv-sum-left">
          {data.count > 0 ? (
            <>
              <span className="rv-avg">{data.average}</span>
              <div>
                <Stars value={data.average} size={18} />
                <div className="rv-count">{data.count} {t('rv.reviews')}</div>
              </div>
            </>
          ) : (
            <span className="rv-count">{t('rv.none')}</span>
          )}
        </div>

        {canReview && (
          <button type="button" className="rv-write-btn" onClick={() => setOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
            {t('rv.write')}
          </button>
        )}
      </div>

      {!canReview && <div className="rv-hint">{t('rv.onlyBuyers')}</div>}

      {/* ---------- รายการรีวิว ---------- */}
      {data.reviews.length === 0 ? (
        <div className="rv-empty">{t('rv.none')}</div>
      ) : (
        <>
          <div className="rv-list">
            {list.map((r) => (
              <div className="rv-card" key={r.id}>
                <div className="rv-card-head">
                  <div className="rv-avatar">{Array.from(r.display_name || '?')[0]}</div>
                  <div className="rv-who">
                    <div className="rv-name">{r.display_name}</div>
                    <div className="rv-sub">
                      <Stars value={r.rating} size={13} />
                      <span className="rv-date">{new Date(r.created_at).toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>
                </div>
                {r.comment && <p className="rv-comment">{r.comment}</p>}
                {Array.isArray(r.images) && r.images.length > 0 && (
                  <div className="rv-imgs">
                    {r.images.map((u, i) => (
                      <img
                        key={u + i}
                        src={imgSrc(u)}
                        alt=""
                        loading="lazy"
                        onClick={() => setViewImg(imgSrc(u))}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {data.reviews.length > PREVIEW_COUNT && (
            <button type="button" className="rv-more" onClick={() => setShowAll((v) => !v)}>
              {showAll ? t('rv.showLess') : `${t('rv.showAll')} (${data.reviews.length})`}
            </button>
          )}
        </>
      )}

      {/* ---------- popup เขียนรีวิว ---------- */}
      {open && (
        <div
          className="rv-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="rv-modal" role="dialog" aria-modal="true">
            <div className="rv-modal-head">
              <h3>{t('rv.write')}</h3>
              <button type="button" className="rv-x" onClick={closeModal} aria-label="close">✕</button>
            </div>

            <div className="rv-modal-body">
              <div className="rv-pick">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n}`}
                    onClick={() => {
                      setRating(n);
                      setMsg('');
                    }}
                  >
                    <StarIcon filled={n <= rating} size={40} />
                  </button>
                ))}
              </div>
              <div className={`rv-star-label ${rating ? '' : 'idle'}`}>
                {rating ? t('rv.star' + rating) : t('rv.tapStar')}
              </div>

              <textarea
                className="rv-text"
                maxLength={1000}
                placeholder={t('rv.placeholder')}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />

              <div className="rv-photos">
                {files.map((f, i) => (
                  <div className="rv-thumb" key={f.preview}>
                    <img src={f.preview} alt="" onClick={() => setViewImg(f.preview)} />
                    <button type="button" className="rm" aria-label={t('rv.removePhoto')} onClick={() => removePhoto(i)}>
                      ✕
                    </button>
                  </div>
                ))}
                {files.length < MAX_PHOTOS && (
                  <button type="button" className="rv-add" onClick={() => fileRef.current && fileRef.current.click()}>
                    <b>＋</b>
                    {t('rv.addPhoto')}
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={onPickPhotos}
              />
              <div className="rv-photo-hint">{t('rv.photoLimit')} ({files.length}/{MAX_PHOTOS})</div>

              {msg && <div className="rv-err">{msg}</div>}
            </div>

            <div className="rv-modal-foot">
              <button type="button" className="rv-submit" disabled={busy} onClick={submit}>
                {busy ? t('rv.sending') : t('rv.submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewImg && (
        <div className="rv-lightbox" onClick={() => setViewImg('')}>
          <img src={viewImg} alt="review" />
        </div>
      )}

      {toast && <div className="rv-toast">{toast}</div>}
    </section>
  );
}