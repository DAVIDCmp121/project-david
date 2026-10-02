import { useEffect, useRef, useState } from 'react';

// ---------- สไตล์ (อยู่ในไฟล์นี้ ไม่ชนกับ CSS เดิม) ----------
const CSS = `
.ac-root{display:flex;height:calc(100dvh - 210px);min-height:460px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;font-family:inherit;color:#1f2937}
.ac-list{width:320px;flex-shrink:0;border-right:1px solid #e5e7eb;display:flex;flex-direction:column;background:#fafafa}
.ac-search{padding:12px;border-bottom:1px solid #eee}
.ac-search input{width:100%;margin:0;padding:9px 14px;border-radius:999px;border:1px solid #e5e7eb;background:#fff;box-sizing:border-box;font-size:.88rem}
.ac-items{overflow-y:auto;flex:1}
.ac-item{display:flex;gap:12px;align-items:center;padding:12px 14px;cursor:pointer;border-bottom:1px solid #f0f0f0}
.ac-item:hover{background:#f3f4f6}
.ac-item.active{background:#e8f0fe}
.ac-avatar{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;flex-shrink:0;text-transform:uppercase}
.ac-info{flex:1;min-width:0}
.ac-row{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.ac-name{font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ac-time{font-size:.72rem;color:#9ca3af;flex-shrink:0}
.ac-last{font-size:.82rem;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0}
.ac-item.unread .ac-last{color:#111827;font-weight:600}
.ac-badge{min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:#ef4444;color:#fff;font-size:.72rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}

.ac-pane{flex:1;display:flex;flex-direction:column;min-width:0;background:#f4f5f7}
.ac-header{display:flex;align-items:center;gap:12px;padding:12px 16px;background:#fff;border-bottom:1px solid #e5e7eb;font-weight:700;color:#111827}
.ac-header .ac-avatar{width:36px;height:36px;font-size:.9rem}
.ac-back{display:none;border:none;background:none;font-size:1.4rem;cursor:pointer;padding:0 4px;color:#374151}
.ac-box{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px}
.ac-date{align-self:center;background:#e5e7eb;color:#6b7280;font-size:.75rem;padding:3px 12px;border-radius:999px;margin:8px 0 4px}
.ac-msg{max-width:min(78%,460px);display:flex;flex-direction:column}
.ac-msg.admin{align-self:flex-end;align-items:flex-end}
.ac-msg.customer{align-self:flex-start;align-items:flex-start}
.ac-bubble{padding:9px 13px;border-radius:16px;line-height:1.45;word-break:break-word;white-space:pre-wrap;font-size:.92rem}
.ac-msg.customer .ac-bubble{background:#fff;color:#1f2937;border-bottom-left-radius:4px;box-shadow:0 1px 1px rgba(0,0,0,.06)}
.ac-msg.admin .ac-bubble{background:var(--blue,#2563eb);color:#fff;border-bottom-right-radius:4px}
.ac-bubble img{max-width:240px;width:100%;border-radius:10px;display:block;cursor:pointer}
.ac-bubble.img-only{padding:3px;background:transparent !important;box-shadow:none !important}
.ac-mtime{font-size:.7rem;color:#9ca3af;margin-top:3px;padding:0 4px}

.ac-order{background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;width:100%;min-width:270px;box-shadow:0 1px 2px rgba(0,0,0,.05);color:#1f2937}
.ac-order-head{background:#eff6ff;color:#1d4ed8;padding:9px 14px;font-weight:700;font-size:.88rem}
.ac-oi{display:flex;justify-content:space-between;gap:12px;padding:9px 14px;border-bottom:1px dashed #e5e7eb;font-size:.88rem}
.ac-oi-name{font-weight:600;color:#111827}
.ac-oi-sub{color:#6b7280;font-size:.78rem;margin-top:1px}
.ac-size{display:inline-block;background:#f3f4f6;border-radius:6px;padding:0 6px;margin-left:6px;font-size:.75rem;font-weight:600;color:#374151}
.ac-oi-price{font-weight:600;white-space:nowrap}
.ac-total{display:flex;justify-content:space-between;padding:10px 14px;font-weight:700;background:#fafafa}
.ac-total span:last-child{color:#dc2626}
.ac-addr{padding:10px 14px;border-top:1px solid #e5e7eb;font-size:.85rem;color:#374151;word-break:break-word}
.ac-addr b{display:block;color:#6b7280;font-size:.75rem;font-weight:600;margin-bottom:2px}

.ac-input{display:flex;gap:8px;align-items:center;padding:10px 12px;background:#fff;border-top:1px solid #e5e7eb}
.ac-attach{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;background:#f3f4f6;font-size:1.1rem;flex-shrink:0}
.ac-input input[type=text]{flex:1;min-width:0;margin:0;padding:10px 16px;border-radius:999px;border:1px solid #e5e7eb;background:#f9fafb;box-sizing:border-box}
.ac-send{border:none;background:var(--blue,#2563eb);color:#fff;border-radius:999px;padding:0 20px;height:40px;font-weight:700;cursor:pointer;flex-shrink:0}
.ac-send:disabled{opacity:.4;cursor:default}
.ac-empty{margin:auto;text-align:center;color:#9ca3af;padding:20px}

@media (max-width:768px){
  .ac-root{height:calc(100dvh - 170px);border-radius:10px}
  .ac-list{width:100%;border-right:none}
  .ac-root.has-chat .ac-list{display:none}
  .ac-root:not(.has-chat) .ac-pane{display:none}
  .ac-back{display:block}
  .ac-msg{max-width:90%}
}
`;

// ---------- ฟังก์ชันช่วย ----------
const AVATAR_COLORS = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#dc2626', '#4b5563'];

function avatarColor(label) {
  let h = 0;
  for (let i = 0; i < label.length; i += 1) h = (h * 31 + label.charCodeAt(i)) % 997;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function fmtMoney(n) {
  const v = Number(String(n).replace(/,/g, ''));
  return Number.isNaN(v) ? String(n) : `${v.toLocaleString('en-US')} ກີບ`;
}

function looksLikeOrder(text) {
  if (!text) return false;
  const flat = text.replace(/\s+/g, ' ').trim();
  const colon = flat.indexOf(':');
  if (colon < 1 || colon > 30) return false;
  return /^:\s*-\s/.test(flat.slice(colon));
}

// แปลงข้อความ "ສັ່ງຊື້ໃໝ່: - POLO (ໄຊສ໌ M) x1 = 459000 ກີບ ... ລວມ: ... ທີ່ຢູ່ຈັດສົ່ງ: ..." เป็นข้อมูล
function parseOrder(raw) {
  if (!looksLikeOrder(raw)) return null;
  const flat = raw.replace(/\s+/g, ' ').trim();
  const colon = flat.indexOf(':');
  const title = flat.slice(0, colon).trim();
  let body = flat.slice(colon + 1);
  let total = null;
  let address = '';

  const tm = body.match(/ລວມ\s*:\s*([\d,.]+)\s*\S*\s*([\s\S]*)$/);
  if (tm) {
    total = tm[1];
    address = tm[2].replace(/^[^:]*:\s*/, '').trim();
    body = body.slice(0, tm.index);
  }

  const items = [];
  body
    .split(/(?:^|\s)-\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((part) => {
      const m = part.match(/^(.*?)\s+x\s*(\d+)\s*=\s*([\d,.]+)/);
      if (!m) return;
      let name = m[1].trim();
      let size = '';
      const sm = name.match(/\(([^)]*)\)\s*$/);
      if (sm) {
        size = sm[1].replace(/^\S+\s+/, '').trim();
        name = name.replace(sm[0], '').trim();
      }
      items.push({ name, size, qty: Number(m[2]), price: m[3] });
    });

  if (items.length === 0) return null;
  if (total === null) {
    total = String(items.reduce((s, i) => s + Number(String(i.price).replace(/,/g, '') || 0), 0));
  }
  return { title, items, total, address };
}

function lastPreview(text) {
  if (!text) return '📷 ຮູບພາບ';
  if (looksLikeOrder(text)) return `🛒 ${text.slice(0, text.indexOf(':')).trim()}`;
  return text;
}

function dayLabel(d) {
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'ມື້ນີ້';
  if (d.toDateString() === yest.toDateString()) return 'ມື້ວານ';
  return d.toLocaleDateString('en-GB');
}

function OrderCard({ order }) {
  return (
    <div className="ac-order">
      <div className="ac-order-head">🛒 {order.title}</div>
      {order.items.map((it, i) => (
        <div className="ac-oi" key={i}>
          <div>
            <div className="ac-oi-name">
              {it.name}
              {it.size && <span className="ac-size">{it.size}</span>}
            </div>
            <div className="ac-oi-sub">x{it.qty}</div>
          </div>
          <div className="ac-oi-price">{fmtMoney(it.price)}</div>
        </div>
      ))}
      <div className="ac-total">
        <span>ລວມ</span>
        <span>{fmtMoney(order.total)}</span>
      </div>
      {order.address && (
        <div className="ac-addr">
          <b>📍 ທີ່ຢູ່ຈັດສົ່ງ</b>
          {order.address}
        </div>
      )}
    </div>
  );
}

// ---------- หน้าแชต ----------
export default function AdminChat() {
  const [customers, setCustomers] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [currentLabel, setCurrentLabel] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const boxRef = useRef(null);
  const soundRef = useRef(null);
  const lastListJson = useRef('');
  const lastMsgCount = useRef(0);

  async function loadCustomerList() {
    try {
      const res = await fetch('/api/messages/list', { credentials: 'include' });
      const data = await res.json();
      const list = data.customers || [];
      const json = JSON.stringify(list);
      const hasNewUnread = list.some((c) => c.unread_count > 0) && json !== lastListJson.current && lastListJson.current !== '';
      if (json === lastListJson.current) return;
      lastListJson.current = json;
      if (hasNewUnread && soundRef.current) {
        soundRef.current.play().catch(() => {});
      }
      setCustomers(list);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadMessages(customerId) {
    try {
      const res = await fetch(`/api/messages/customer/${customerId}`, { credentials: 'include' });
      const data = await res.json();
      const msgs = data.messages || [];
      if (msgs.length === lastMsgCount.current) return;
      lastMsgCount.current = msgs.length;
      setMessages(msgs);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadCustomerList();
    const interval = setInterval(() => {
      loadCustomerList();
      if (currentId) loadMessages(currentId);
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [messages]);

  function openCustomerChat(id, label) {
    setCurrentId(id);
    setCurrentLabel(label);
    setMessages([]);
    lastMsgCount.current = 0;
    loadMessages(id);
    loadCustomerList();
  }

  function closeChat() {
    setCurrentId(null);
    setCurrentLabel('');
    setMessages([]);
    lastMsgCount.current = 0;
  }

  async function sendAdminText() {
    if (!currentId) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    try {
      const res = await fetch(`/api/messages/customer/${currentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message_text: trimmed }),
      });
      const data = await res.json();
      if (data.success) {
        lastMsgCount.current = 0;
        loadMessages(currentId);
      } else {
        alert(data.error || 'ສົ່ງບໍ່ສຳເລັດ');
      }
    } catch (err) {
      alert('ເກີດຂໍ້ຜິດພາດ');
    }
  }

  async function sendImage(e) {
    if (!currentId) return;
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch(`/api/messages/customer/${currentId}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        lastMsgCount.current = 0;
        loadMessages(currentId);
      } else {
        alert(data.error || 'ອັບໂຫລດບໍ່ສຳເລັດ');
      }
    } catch (err) {
      alert('ເກີດຂໍ້ຜິດພາດ');
    }
    e.target.value = '';
  }

  const q = search.trim().toLowerCase();
  const filtered = customers.filter((c) => {
    if (!q) return true;
    return `${c.name || ''} ${c.phone || ''}`.toLowerCase().includes(q);
  });

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
          <div className="ac-date" key={`d-${msg.id}`}>{dayLabel(d)}</div>
        );
      }
    }
    const time = valid ? d.toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' }) : '';
    const isImageOnly = msg.image_url && !msg.message_text;
    const order = msg.message_text ? parseOrder(msg.message_text) : null;
    const side = msg.sender === 'admin' ? 'admin' : 'customer';

    rendered.push(
      <div key={msg.id} className={`ac-msg ${side}`}>
        {order ? (
          <OrderCard order={order} />
        ) : (
          <div className={`ac-bubble ${isImageOnly ? 'img-only' : ''}`}>
            {msg.message_text && <div>{msg.message_text}</div>}
            {msg.image_url && (
              <img src={msg.image_url} alt="" onClick={() => window.open(msg.image_url, '_blank')} />
            )}
          </div>
        )}
        <div className="ac-mtime">{time}</div>
      </div>
    );
  });

  return (
    <div>
      <style>{CSS}</style>

      <div className={`ac-root ${currentId ? 'has-chat' : ''}`}>
        {/* ---------- รายชื่อลูกค้า ---------- */}
        <div className="ac-list">
          <div className="ac-search">
            <input
              type="text"
              placeholder="ຄົ້ນຫາລູກຄ້າ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="ac-items">
            {customers.length === 0 && <div className="ac-empty">ຍັງບໍ່ມີແຊັດ</div>}
            {customers.length > 0 && filtered.length === 0 && <div className="ac-empty">ບໍ່ພົບລູກຄ້າ</div>}
            {filtered.map((c) => {
              const label = String(c.name || c.phone || '?');
              const t = c.last_message_at || c.last_time || c.updated_at;
              const td = t ? new Date(t) : null;
              const timeText =
                td && !Number.isNaN(td.getTime())
                  ? (td.toDateString() === new Date().toDateString()
                      ? td.toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' })
                      : td.toLocaleDateString('en-GB'))
                  : '';
              return (
                <div
                  key={c.id}
                  className={`ac-item ${c.id === currentId ? 'active' : ''} ${c.unread_count > 0 ? 'unread' : ''}`}
                  onClick={() => openCustomerChat(c.id, label)}
                >
                  <div className="ac-avatar" style={{ background: avatarColor(label) }}>
                    {label.trim().charAt(0)}
                  </div>
                  <div className="ac-info">
                    <div className="ac-row">
                      <div className="ac-name">{label}</div>
                      {timeText && <div className="ac-time">{timeText}</div>}
                    </div>
                    <div className="ac-row">
                      <div className="ac-last">{lastPreview(c.last_message)}</div>
                      {c.unread_count > 0 && <div className="ac-badge">{c.unread_count}</div>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ---------- หน้าแชต ---------- */}
        <div className="ac-pane">
          <div className="ac-header">
            {currentId && (
              <button className="ac-back" onClick={closeChat} aria-label="back">←</button>
            )}
            {currentId && (
              <div className="ac-avatar" style={{ background: avatarColor(currentLabel || '?') }}>
                {(currentLabel || '?').trim().charAt(0)}
              </div>
            )}
            <div>{currentId ? currentLabel : 'ເລືອກລູກຄ້າເພື່ອເລີ່ມແຊັດ'}</div>
          </div>

          <div className="ac-box" ref={boxRef}>
            {!currentId && <div className="ac-empty">ຍັງບໍ່ໄດ້ເລືອກລູກຄ້າ</div>}
            {currentId && rendered}
          </div>

          {currentId && (
            <div className="ac-input">
              <label className="ac-attach">
                📷
                <input type="file" accept="image/*" onChange={sendImage} style={{ display: 'none' }} />
              </label>
              <input
                type="text"
                placeholder="ພິມຂໍ້ຄວາມ..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) sendAdminText();
                }}
              />
              <button className="ac-send" disabled={!text.trim()} onClick={sendAdminText}>ສົ່ງ</button>
            </div>
          )}
        </div>
      </div>

      <audio ref={soundRef} src="/admin/notify.wav" preload="auto" />
    </div>
  );
}