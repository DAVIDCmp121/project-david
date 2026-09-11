import { useEffect, useRef, useState } from 'react';

// ➕ ນຳມາຈາກ public/menu/chat.html ຕົ້ນສະບັບ (ໄຟລ໌ຈິງ — ໄດ້ຮັບແລ້ວ)
// ຈຸດສຳຄັນ: ໜ້ານີ້ໃຊ້ໂຕນສີຟ້າ/ເທົາ (ຄືກັບຝັ່ງແອດມິນ) ບໍ່ແມ່ນຄຳ/ດຳ
// ແລະ ມີຟອມ login ຝັງຢູ່ໃນໜ້ານີ້ເລີຍ (ບໍ່ redirect ໄປ login.html ຄືໜ້າອື່ນ)

export default function CustomerChat() {
  const [loggedIn, setLoggedIn] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');

  const boxRef = useRef(null);
  const soundRef = useRef(null);
  const pollTimerRef = useRef(null);
  const lastMessageCountRef = useRef(0);

  async function loadMessages() {
    try {
      const res = await fetch('/api/messages', { credentials: 'include' });
      if (res.status === 401) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
        setLoggedIn(false);
        return;
      }
      const data = await res.json();
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
      const res = await fetch('/api/messages', { credentials: 'include' });
      if (res.status === 401) {
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

  async function doLogin() {
    setLoginError('');
    if (!phone || !pin) {
      setLoginError('ກະລຸນາປ້ອນເບີໂທ ແລະ PIN');
      return;
    }
    try {
      const res = await fetch('/api/customer-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone, pin }),
      });
      const data = await res.json();
      if (data.success) {
        checkLoginAndStart();
      } else {
        setLoginError(data.error || 'ເຂົ້າສູ່ລະບົບບໍ່ສຳເລັດ');
      }
    } catch (err) {
      setLoginError('ເກີດຂໍ້ຜິດພາດ, ລອງໃໝ່ພາຍຫຼັງ');
    }
  }

  async function sendText() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message_text: trimmed }),
      });
      const data = await res.json();
      if (data.success) {
        loadMessages();
      } else {
        alert(data.error || 'ສົ່ງຂໍ້ຄວາມບໍ່ສຳເລັດ');
      }
    } catch (err) {
      alert('ເກີດຂໍ້ຜິດພາດ');
    }
  }

  async function sendImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch('/api/messages/upload', { method: 'POST', credentials: 'include', body: formData });
      const data = await res.json();
      if (data.success) {
        loadMessages();
      } else {
        alert(data.error || 'ອັບໂຫລດຮູບບໍ່ສຳເລັດ');
      }
    } catch (err) {
      alert('ເກີດຂໍ້ຜິດພາດ');
    }
    e.target.value = '';
  }

  if (loggedIn === null) return null;

  if (loggedIn === false) {
    return (
      <div className="menuchat-login-box">
        <h2>ເຂົ້າສູ່ລະບົບເພື່ອແຊັດ</h2>
        <input type="tel" placeholder="ເບີໂທລະສັບ" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <input
          type="password"
          placeholder="ລະຫັດ PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') doLogin(); }}
        />
        <button onClick={doLogin}>ເຂົ້າສູ່ລະບົບ</button>
        <div className="menuchat-login-error">{loginError}</div>
      </div>
    );
  }

  return (
    <div className="menuchat-shell">
      <header className="menuchat-header"><h1>ແຊັດກັບຮ້ານ POLO SHOP</h1></header>
      <div className="menuchat-box" ref={boxRef}>
        {messages.map((msg) => {
          const isImageOnly = msg.image_url && !msg.message_text;
          const time = new Date(msg.created_at).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' });
          return (
            <div key={msg.id} className={`menuchat-bubble ${msg.sender === 'customer' ? 'customer' : 'admin'} ${isImageOnly ? 'image-only' : ''}`}>
              {msg.message_text && <div>{msg.message_text}</div>}
              {msg.image_url && <img src={msg.image_url} alt="" onClick={() => window.open(msg.image_url, '_blank')} />}
              <div className="menuchat-bubble-time">{time}</div>
            </div>
          );
        })}
      </div>
      <div className="menuchat-input-bar">
        <label>
          📷
          <input type="file" accept="image/*" onChange={sendImage} style={{ display: 'none' }} />
        </label>
        <input
          type="text"
          placeholder="ພິມຂໍ້ຄວາມ..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') sendText(); }}
        />
        <button onClick={sendText}>➤</button>
      </div>
      <audio ref={soundRef} src="/menu/notify.wav" preload="auto" />
    </div>
  );
}