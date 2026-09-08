import { useEffect, useRef, useState } from 'react';

// ➕ ນຳຈາກ public/admin/chat.html

export default function AdminChat() {
  const [customers, setCustomers] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [currentLabel, setCurrentLabel] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
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
    lastMsgCount.current = 0;
    loadMessages(id);
    loadCustomerList();
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
        alert(data.error || 'ສົ່ງບສຳເລັດ');
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

  return (
    <div>
      <div className="admin-chat-layout">
        <div className="admin-customer-list">
          {customers.length === 0 && <div style={{ padding: 14, color: '#6b7280' }}>ຍັງບໍ່ມີແຊັດ</div>}
          {customers.map((c) => (
            <div
              key={c.id}
              className={`admin-customer-item ${c.id === currentId ? 'active' : ''}`}
              onClick={() => openCustomerChat(c.id, c.name || c.phone)}
            >
              <div className="cname">{c.name || c.phone}</div>
              <div className="clast">{c.last_message || '(ຮູບພາບ)'}</div>
              {c.unread_count > 0 && <div className="unread-badge">{c.unread_count}</div>}
            </div>
          ))}
        </div>

        <div className="admin-chat-pane">
          <div className="admin-chat-header">{currentId ? currentLabel : 'ເລືອກລູກຄ້າເພື່ອເລີ່ມແຊັດ'}</div>
          <div className="admin-chat-box" ref={boxRef}>
            {!currentId && <div style={{ padding: 20, color: '#6b7280', textAlign: 'center' }}>ຍັງບໍ່ໄດ້ເລືອກລູກຄ້າ</div>}
            {currentId && messages.map((msg) => {
              const isImageOnly = msg.image_url && !msg.message_text;
              const time = new Date(msg.created_at).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={msg.id} className={`abubble ${msg.sender === 'admin' ? 'admin' : 'customer'} ${isImageOnly ? 'image-only' : ''}`}>
                  {msg.message_text && <div>{msg.message_text}</div>}
                  {msg.image_url && <img src={msg.image_url} alt="" onClick={() => window.open(msg.image_url, '_blank')} />}
                  <div className="abubble-time">{time}</div>
                </div>
              );
            })}
          </div>
          {currentId && (
            <div className="admin-input-bar">
              <label>
                📷
                <input type="file" accept="image/*" onChange={sendImage} style={{ display: 'none' }} />
              </label>
              <input
                type="text"
                placeholder="ພິມຂໍ້ຄວາມ..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendAdminText(); }}
              />
              <button onClick={sendAdminText}>ສົ່ງ</button>
            </div>
          )}
        </div>
      </div>

      <audio ref={soundRef} src="/admin/notify.wav" preload="auto" />
    </div>
  );
}
