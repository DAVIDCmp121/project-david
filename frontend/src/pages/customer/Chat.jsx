import { useEffect, useRef, useState } from 'react';
import { apiGet, apiPost, apiUpload, saveToken } from '../../api.js';
import TopBar from '../../components/TopBar.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { CartProvider } from '../../context/CartContext.jsx';
import logo from '../../assets/polo-logo.jpeg';
import { usePageT } from '../../useT.js';
import dict from '../../locales/cust-chat.js';

// ---------- สไตล์ (อยู่ในไฟล์นี้ ไม่ชนกับ CSS เดิม) ----------
// ถ้าหน้าจอสูงเกินหรือเตี้ยไป ปรับเลข 64px (ความสูงของ TopBar) ตรงนี้
const CSS = `
.cc-page{--cc-top:64px;height:calc(100dvh - var(--cc-top));display:flex;justify-content:center;background:#eef0f3;font-family:inherit;color:#1f2937}
.cc-shell{width:min(720px,100%);height:100%;display:flex;flex-direction:column;background:#f6f7f9;position:relative}
@media (min-width:760px){.cc-shell{border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb}}

.cc-header{display:flex;align-items:center;gap:12px;padding:12px 16px;background:#fff;border-bottom:1px solid #e5e7eb;flex-shrink:0}
.cc-logo{width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid var(--gold,#c9a14a);flex-shrink:0;background:#fff}
.cc-logo-fb{width:42px;height:42px;border-radius:50%;background:var(--navy,#1f2a44);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0}
.cc-title{font-weight:700;color:#111827;line-height:1.2}
.cc-sub{font-size:.78rem;color:#6b7280;margin-top:2px}

.cc-box{flex:1;overflow-y:auto;padding:16px 14px;display:flex;flex-direction:column;gap:8px}
.cc-date{align-self:center;background:#e5e7eb;color:#6b7280;font-size:.74rem;padding:3px 12px;border-radius:999px;margin:8px 0 4px}
.cc-row{display:flex;gap:8px;align-items:flex-end;max-width:100%}
.cc-row.me{justify-content:flex-end}
.cc-row.shop{justify-content:flex-start}
.cc-avatar{width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;background:#fff;border:1px solid #e5e7eb}
.cc-avatar-fb{width:28px;height:28px;border-radius:50%;background:var(--navy,#1f2a44);color:#fff;font-size:.75rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.cc-msg{max-width:min(82%,420px);display:flex;flex-direction:column}
.cc-row.me .cc-msg{align-items:flex-end}
.cc-row.shop .cc-msg{align-items:flex-start}
.cc-bubble{padding:9px 13px;border-radius:18px;line-height:1.45;word-break:break-word;white-space:pre-wrap;font-size:.93rem}
.cc-row.me .cc-bubble{background:var(--blue,#2563eb);color:#fff;border-bottom-right-radius:5px}
.cc-row.shop .cc-bubble{background:#fff;color:#1f2937;border-bottom-left-radius:5px;box-shadow:0 1px 1px rgba(0,0,0,.06)}
.cc-bubble img{max-width:230px;width:100%;border-radius:12px;display:block;cursor:zoom-in}
.cc-bubble.img-only{padding:3px;background:transparent !important;box-shadow:none !important}
.cc-time{font-size:.7rem;color:#9ca3af;margin-top:3px;padding:0 4px}

.cc-order{background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;width:min(320px,100%);min-width:250px;box-shadow:0 1px 3px rgba(0,0,0,.07);color:#1f2937;border-bottom-right-radius:5px}
.cc-order-head{background:#eff6ff;color:#1d4ed8;padding:9px 14px;font-weight:700;font-size:.88rem}
.cc-oi{display:flex;justify-content:space-between;gap:12px;padding:9px 14px;border-bottom:1px dashed #e5e7eb;font-size:.88rem}
.cc-oi-name{font-weight:600;color:#111827}
.cc-oi-sub{color:#6b7280;font-size:.78rem;margin-top:1px}
.cc-size{display:inline-block;background:#f3f4f6;border-radius:6px;padding:0 6px;margin-left:6px;font-size:.75rem;font-weight:600;color:#374151}
.cc-oi-price{font-weight:600;white-space:nowrap}
.cc-sumrow{display:flex;justify-content:space-between;gap:12px;padding:6px 14px;font-size:.85rem;color:#4b5563}
.cc-sumrow:first-of-type{padding-top:10px}
.cc-sumrow.disc span:last-child{color:#15803d;font-weight:600}
.cc-free{color:#15803d;font-weight:700}
.cc-total{display:flex;justify-content:space-between;padding:10px 14px;font-weight:700;background:#fafafa;margin-top:4px;border-top:1px solid #e5e7eb}
.cc-total span:last-child{color:#dc2626}
.cc-info{border-top:1px solid #e5e7eb;padding:6px 14px 10px}
.cc-ir{display:flex;gap:10px;padding:6px 0;font-size:.85rem;align-items:flex-start}
.cc-ir-ic{width:20px;flex:0 0 20px;text-align:center}
.cc-ir-lb{display:block;color:#6b7280;font-size:.72rem;font-weight:600}
.cc-ir-val{display:block;color:#111827;word-break:break-word;white-space:pre-wrap}
.cc-pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:.78rem;font-weight:700}
.cc-pill.cod{background:#ffedd5;color:#c2410c}
.cc-pill.transfer{background:#e0f2fe;color:#0369a1}

.cc-welcome{margin:auto;text-align:center;color:#6b7280;padding:20px;max-width:280px;line-height:1.6}
.cc-welcome .big{font-size:2rem;margin-bottom:6px}

.cc-quick{display:flex;gap:8px;overflow-x:auto;padding:8px 12px 2px;background:#fff;border-top:1px solid #e5e7eb;flex-shrink:0;scrollbar-width:none}
.cc-quick::-webkit-scrollbar{display:none}
.cc-chip{border:1px solid #dbe3f0;background:#f8fafc;color:#1d4ed8;border-radius:999px;padding:7px 14px;font-size:.84rem;white-space:nowrap;cursor:pointer;font-family:inherit;flex-shrink:0}
.cc-chip:disabled{opacity:.5}
.cc-input{display:flex;gap:8px;align-items:center;padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px));background:#fff;flex-shrink:0}
.cc-attach{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;background:#f3f4f6;font-size:1.1rem;flex-shrink:0}
.cc-input input[type=text]{flex:1;min-width:0;margin:0;padding:11px 16px;border-radius:999px;border:1px solid #e5e7eb;background:#f9fafb;box-sizing:border-box;font-size:.95rem;font-family:inherit}
.cc-send{width:42px;height:42px;border:none;border-radius:50%;background:var(--blue,#2563eb);color:#fff;font-size:1.05rem;cursor:pointer;flex-shrink:0}
.cc-send:disabled{opacity:.4;cursor:default}

.cc-lightbox{position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:5000;display:flex;align-items:center;justify-content:center;padding:16px;cursor:zoom-out}
.cc-lightbox img{max-width:100%;max-height:100%;object-fit:contain;border-radius:8px}
.cc-lightbox button{position:absolute;top:14px;right:16px;border:none;background:rgba(255,255,255,.18);color:#fff;width:40px;height:40px;border-radius:50%;font-size:1.2rem;cursor:pointer}
`;

const QUICK_KEYS = ['cc.q1', 'cc.q2', 'cc.q3', 'cc.q4'];

// ---------- ฟังก์ชันช่วย ----------
function fmtMoney(n, kip) {
  const v = Number(String(n).replace(/,/g, ''));
  return Number.isNaN(v) ? String(n) : `${v.toLocaleString('en-US')} ${kip}`;
}

// ★ ข้อความที่ Checkout ส่งเข้าแชตเป็นภาษาลาวเสมอ แยกเป็นบรรทัด "หัวข้อ: ค่า"
//   คีย์ลาวด้านล่างต้องตรงกับที่ Checkout.jsx เขียน (orderMessage)
const INFO_KEYS = {
  'ຄ່າສິນຄ້າ': 'subtotal',
  'ຄ່າສົ່ງ': 'shipping',
  'ຄູປອງ': 'coupon',
  'ລວມ': 'total',
  'ຂົນສົ່ງ': 'carrier',
  'ວິທີຊຳລະ': 'method',
  'ເບີໂທ': 'phone',
  'ທີ່ຢູ່ຈັດສົ່ງ': 'address',
};
// ບັນທັດສາຂາຂົນສົ່ງ (backend ປະກອບໃຫ້ ໃນ buildBranchAddress)
const BRANCH_KEYS = {
  'ຮັບທີ່ສາຂາ': 'branch',
  'ເມືອງ': 'district',
  'ແຂວງ': 'province',
  'ເບີສາຂາ': 'branchPhone',
};

// "POLO (ໄຊສ໌ M) x1 = 459000 ກີບ" → { name, size, qty, price }
function parseItem(s) {
  const m = s.match(/^(.*?)\s+x\s*(\d+)\s*=\s*([\d,.]+)/);
  if (!m) return null;
  let name = m[1].trim();
  let size = '';
  const sm = name.match(/\(([^)]*)\)\s*$/);
  if (sm) {
    size = sm[1].replace(/^\S+\s+/, '').trim();
    name = name.replace(sm[0], '').trim();
  }
  return { name, size, qty: Number(m[2]), price: m[3] };
}

function parseOrder(raw) {
  const lines = String(raw || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length < 3 || !/^[^:]{1,30}:$/.test(lines[0]) || !lines[1].startsWith('- ')) return null;

  const order = { title: lines[0].slice(0, -1).trim(), items: [], info: {}, branch: {}, address: [] };
  let inAddress = false; // ຫຼັງຫົວຂໍ້ທີ່ຢູ່ ທຸກບັນທັດເປັນທີ່ຢູ່ (ລູກຄ້າພິມເອງ ຫ້າມຕີຄວາມເປັນຫົວຂໍ້)

  lines.slice(1).forEach((line) => {
    if (inAddress) {
      order.address.push(line);
      return;
    }
    if (line.startsWith('- ')) {
      const it = parseItem(line.slice(2));
      if (it) order.items.push(it);
      return;
    }
    const m = line.match(/^([^:]{1,30}):\s*(.*)$/);
    const key = m ? m[1].trim() : '';
    if (key && INFO_KEYS[key]) {
      if (INFO_KEYS[key] === 'address') {
        inAddress = true;
        if (m[2]) order.address.push(m[2]);
      } else {
        order.info[INFO_KEYS[key]] = m[2].trim();
      }
      return;
    }
    if (key && BRANCH_KEYS[key]) {
      order.branch[BRANCH_KEYS[key]] = m[2].trim();
      return;
    }
    order.address.push(line);
  });

  if (order.items.length === 0) return null;
  if (!order.info.total) {
    order.info.total = String(order.items.reduce((s, i) => s + Number(String(i.price).replace(/,/g, '') || 0), 0));
  }
  return order;
}

function dayLabel(d, t) {
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return t('common.today');
  if (d.toDateString() === yest.toDateString()) return t('common.yesterday');
  return d.toLocaleDateString('en-GB');
}

function ShopAvatar({ className }) {
  const [ok, setOk] = useState(true);
  if (!ok) return <div className="cc-avatar-fb">P</div>;
  return <img className={className} src={logo} alt="" onError={() => setOk(false)} />;
}

function InfoRow({ icon, label, children }) {
  return (
    <div className="cc-ir">
      <span className="cc-ir-ic">{icon}</span>
      <div>
        <span className="cc-ir-lb">{label}</span>
        <span className="cc-ir-val">{children}</span>
      </div>
    </div>
  );
}

function OrderCard({ order }) {
  const { t } = usePageT(dict);
  const kip = t('common.kip');
  const { info, branch } = order;
  const title = order.title === 'ສັ່ງຊື້ໃໝ່' ? t('cc.newOrder') : order.title;

  const cod = /COD/i.test(info.method || '');
  const shipN = Number(String(info.shipping || '').replace(/[^\d.]/g, '')) || 0;

  // "ຊື່ຄູປອງ (-200000 ກີບ)" → ຊື່ + ຈຳນວນເງິນ
  let couponName = '';
  let couponAmt = '';
  if (info.coupon) {
    const cm = info.coupon.match(/^(.*?)\s*\(\s*-?\s*([\d,.]+)/);
    couponName = cm ? cm[1] : info.coupon;
    couponAmt = cm ? cm[2] : '';
  }

  const hasBranch = !!branch.branch;
  const place = [branch.district, branch.province].filter(Boolean).join(', ');

  return (
    <div className="cc-order">
      <div className="cc-order-head">🛒 {title}</div>

      {order.items.map((it, i) => (
        <div className="cc-oi" key={i}>
          <div>
            <div className="cc-oi-name">
              {it.name}
              {it.size && <span className="cc-size">{it.size}</span>}
            </div>
            <div className="cc-oi-sub">x{it.qty}</div>
          </div>
          <div className="cc-oi-price">{fmtMoney(it.price, kip)}</div>
        </div>
      ))}

      {info.subtotal && (
        <div className="cc-sumrow">
          <span>{t('cc.subtotal')}</span>
          <span>{fmtMoney(info.subtotal, kip)}</span>
        </div>
      )}
      {info.shipping && (
        <div className="cc-sumrow">
          <span>{t('cc.shipping')}</span>
          {shipN > 0 ? <span>+{fmtMoney(shipN, kip)}</span> : <span className="cc-free">{t('cc.shippingFree')}</span>}
        </div>
      )}
      {info.coupon && (
        <div className="cc-sumrow disc">
          <span>{t('cc.coupon')}{couponName ? ` · ${couponName}` : ''}</span>
          {couponAmt && <span>−{fmtMoney(couponAmt, kip)}</span>}
        </div>
      )}
      <div className="cc-total">
        <span>{t('cc.total')}</span>
        <span>{fmtMoney(info.total, kip)}</span>
      </div>

      <div className="cc-info">
        {info.carrier && (
          <InfoRow icon="🚚" label={t('cc.carrier')}>{info.carrier}</InfoRow>
        )}
        {info.method && (
          <InfoRow icon={cod ? '💵' : '💳'} label={t('cc.payMethod')}>
            <span className={`cc-pill ${cod ? 'cod' : 'transfer'}`}>{cod ? t('cc.cod') : t('cc.transfer')}</span>
          </InfoRow>
        )}
        {info.phone && (
          <InfoRow icon="📞" label={t('cc.phoneLbl')}>{info.phone}</InfoRow>
        )}
        {hasBranch ? (
          <InfoRow icon="📍" label={t('cc.pickupAt')}>
            <b>{branch.branch}</b>
            {place ? `\n${place}` : ''}
            {branch.branchPhone ? `\n${t('cc.branchPhone')}: ${branch.branchPhone}` : ''}
          </InfoRow>
        ) : (
          order.address.length > 0 && (
            <InfoRow icon="📍" label={t('cc.address')}>{order.address.join('\n')}</InfoRow>
          )
        )}
      </div>
    </div>
  );
}

// ---------- หน้าแชต ----------
function CustomerChatInner() {
  const { t, locale } = usePageT(dict);
  const [loggedIn, setLoggedIn] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [sending, setSending] = useState(false);
  const [lightbox, setLightbox] = useState('');
  const [notice, setNotice] = useState(''); // กล่องแจ้งข้อความแทน alert()

  const boxRef = useRef(null);
  const soundRef = useRef(null);
  const pollTimerRef = useRef(null);
  const lastMessageCountRef = useRef(0);

  async function loadMessages() {
    try {
      const { ok, status, data } = await apiGet('/api/messages');
      if (status === 401) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
        setLoggedIn(false);
        return;
      }
      if (!ok) return;
      renderMessages(data.messages || []);
    } catch (err) {
      console.error(err);
    }
  }

  function renderMessages(msgs) {
    if (msgs.length === lastMessageCountRef.current) return;

    const isFirstLoad = lastMessageCountRef.current === 0;
    const hasNewMessages = msgs.length > lastMessageCountRef.current;
    const lastMsg = msgs[msgs.length - 1];
    if (hasNewMessages && !isFirstLoad && lastMsg && lastMsg.sender === 'admin' && soundRef.current) {
      soundRef.current.play().catch(() => {});
    }

    lastMessageCountRef.current = msgs.length;
    setMessages(msgs);
  }

  async function checkLoginAndStart() {
    try {
      const { status } = await apiGet('/api/messages');
      if (status === 401) {
        setLoggedIn(false);
        return;
      }
      setLoggedIn(true);
      loadMessages();
      if (!pollTimerRef.current) pollTimerRef.current = setInterval(loadMessages, 5000);
    } catch (err) {
      setLoggedIn(false);
    }
  }

  useEffect(() => {
    checkLoginAndStart();
    return () => clearInterval(pollTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [messages]);

  // ข้อความเมื่อถูกล็อก: "ลองใหม่ใน 5 นาที" (backend ส่ง seconds_left มาให้)
  function lockedText(data) {
    const s = Math.ceil(Number(data && data.seconds_left));
    if (!s || s < 0) return t('cc.errLockedGeneric');
    const when = s >= 60 ? t('cc.timeMin', { n: Math.ceil(s / 60) }) : t('cc.timeSec', { n: s });
    return t('cc.errLocked', { when });
  }

  async function doLogin() {
    setLoginError('');
    if (!phone || !pin) {
      setLoginError(t('cc.errEmpty'));
      return;
    }
    try {
      const { status, data } = await apiPost('/api/customer-auth/login', { phone, pin });
      if (status === 429) {
        setLoginError(lockedText(data));
        return;
      }
      if (data && data.success) {
        saveToken(data.token);
        checkLoginAndStart();
      } else {
        setLoginError(t('cc.errLoginFail'));
      }
    } catch (err) {
      setLoginError(t('cc.errGeneric'));
    }
  }

  // ส่งข้อความ: ถ้ามีค่า override (ปุ่มตอบด่วน) จะส่งข้อความนั้นเลย
  async function sendText(override) {
    const isOverride = typeof override === 'string';
    const trimmed = (isOverride ? override : text).trim();
    if (!trimmed || sending) return;
    if (!isOverride) setText('');
    setSending(true);
    try {
      const { data } = await apiPost('/api/messages', { message_text: trimmed });
      if (data.success) {
        loadMessages();
      } else {
        setNotice(t('cc.sendFail'));
      }
    } catch (err) {
      setNotice(t('cc.error'));
    }
    setSending(false);
  }

  async function sendImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    setSending(true);
    try {
      const { data } = await apiUpload('/api/messages/upload', formData);
      if (data.success) {
        loadMessages();
      } else {
        setNotice(t('cc.uploadFail'));
      }
    } catch (err) {
      setNotice(t('cc.error'));
    }
    setSending(false);
    e.target.value = '';
  }

  if (loggedIn === null) return null;

  if (loggedIn === false) {
    return (
      <div className="menuchat-login-box">
        <h2>{t('cc.loginTitle')}</h2>
        <input type="tel" placeholder={t('cc.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          placeholder={t('cc.pin')}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') doLogin(); }}
        />
        <button onClick={doLogin}>{t('cc.login')}</button>
        <div className="menuchat-login-error">{loginError}</div>
      </div>
    );
  }

  // สร้างรายการข้อความ พร้อมตัวคั่นวันที่
  const rendered = [];
  let prevDay = '';
  messages.forEach((msg) => {
    const d = new Date(msg.created_at);
    const valid = !Number.isNaN(d.getTime());
    if (valid) {
      const key = d.toDateString();
      if (key !== prevDay) {
        prevDay = key;
        rendered.push(
          <div className="cc-date" key={`d-${msg.id}`}>{dayLabel(d, t)}</div>
        );
      }
    }
    const time = valid ? d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '';
    const isImageOnly = msg.image_url && !msg.message_text;
    const order = msg.message_text ? parseOrder(msg.message_text) : null;
    const side = msg.sender === 'customer' ? 'me' : 'shop';

    rendered.push(
      <div key={msg.id} className={`cc-row ${side}`}>
        {side === 'shop' && <ShopAvatar className="cc-avatar" />}
        <div className="cc-msg">
          {order ? (
            <OrderCard order={order} />
          ) : (
            <div className={`cc-bubble ${isImageOnly ? 'img-only' : ''}`}>
              {msg.message_text && <div>{msg.message_text}</div>}
              {msg.image_url && (
                <img src={msg.image_url} alt="" onClick={() => setLightbox(msg.image_url)} />
              )}
            </div>
          )}
          <div className="cc-time">{time}</div>
        </div>
      </div>
    );
  });

  return (
    <>
      <style>{CSS}</style>
      <TopBar />
      <div className="cc-page">
        <div className="cc-shell">
          <div className="cc-header">
            <ShopAvatar className="cc-logo" />
            <div>
              <div className="cc-title">POLO SHOP</div>
              <div className="cc-sub">{t('cc.sub')}</div>
            </div>
          </div>

          <div className="cc-box" ref={boxRef}>
            {messages.length === 0 ? (
              <div className="cc-welcome">
                <div className="big">💬</div>
                {t('cc.welcome')}
              </div>
            ) : (
              rendered
            )}
          </div>

          <div className="cc-quick">
            {QUICK_KEYS.map((k) => (
              <button key={k} className="cc-chip" disabled={sending} onClick={() => sendText(t(k))}>
                {t(k)}
              </button>
            ))}
          </div>

          <div className="cc-input">
            <label className="cc-attach" title={t('cc.attach')} aria-label={t('cc.attach')}>
              📷
              <input type="file" accept="image/*" onChange={sendImage} style={{ display: 'none' }} />
            </label>
            <input
              type="text"
              placeholder={t('cc.placeholder')}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) sendText();
              }}
            />
            <button className="cc-send" aria-label={t('cc.send')} disabled={!text.trim() || sending} onClick={() => sendText()}>➤</button>
          </div>
        </div>
      </div>

      {lightbox && (
        <div className="cc-lightbox" onClick={() => setLightbox('')}>
          <button aria-label={t('cc.close')} onClick={() => setLightbox('')}>✕</button>
          <img src={lightbox} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <ConfirmModal
        open={!!notice}
        message={notice}
        hideCancel
        onConfirm={() => setNotice('')}
        onCancel={() => setNotice('')}
      />

      <audio ref={soundRef} src="/menu/notify.wav" preload="auto" />
    </>
  );
}

export default function CustomerChat() {
  return (
    <CartProvider>
      <CustomerChatInner />
    </CartProvider>
  );
}