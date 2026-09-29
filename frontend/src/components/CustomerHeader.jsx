import { useNavigate } from 'react-router-dom';

// ➕ ตอนนี้ไม่ใช่ปายชื่อ/เบอร์ลกค้าแล้ว — เปลี่ยนเป็นปุ่มเข้าหน้าโปรไฟล์แทน (เบอร์/ชื่อไปโชว์ในหน้านนแทน)

export default function CustomerHeader() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/menu/profile')}
      aria-label="ບັນຊີຂອງຂ້ອຍ"
      style={{
        width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--cust-border)',
        background: 'var(--cust-card)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </button>
  );
}