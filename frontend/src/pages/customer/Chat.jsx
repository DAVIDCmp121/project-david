import { useEffect, useRef, useState } from 'react';
import { apiGet, apiPost, apiUpload, saveToken } from '../../api.js';
import BottomNav from '../../components/BottomNav.jsx';
import { CartProvider } from '../../context/CartContext.jsx';

function CustomerChatInner() {
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

  async function doLogin() {
    setLoginError('');
    if (!phone || !pin) {
      setLoginError('ກະລນາປອນເບໂທ ແລະ PIN');
      return;
    }
    try {
      const { data } = await apiPost('/api/customer-auth/login', { phone, pin });
      if (data.success) {
        saveToken(data.token); // ✅ ໃໝ່
        checkLoginAndStart();
      } else {
        setLoginError(data.error || 'ເຂາສລະບບບສເລດ');
      }
    } catch (err) {
      setLoginError('ເກດຂຜດພາດ, ລອງໃໝພາຍຫງ');
    }
  }

  async function sendText() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    try {
      const { data } = await apiPost('/api/messages', { message_text: trimmed });
      if (data.success) {
        loadMessages();
      } else {
        alert(data.error || 'ສົງຂຄວາມບສເລດ');
      }
    } catch (err) {
      alert('ເກດຂຜດພາດ');
    }
  }

  async function sendImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const { data } = await apiUpload('/api/messages/upload', formData);
      if (data.success) {
        loadMessages();
      } else {
        alert(data.error || 'ອັບໂຫລດຮບບສເລດ');
      }
    } catch (err) {
      alert('ເກີດຂຜິດພາດ');
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
    <div className="menuchat-shell" style={{ paddingBottom: 80 }}>
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
      <BottomNav />
    </div>
  );
}

export default function CustomerChat() {
  return (
    <CartProvider>
      <CustomerChatInner />
    </CartProvider>
  );
}