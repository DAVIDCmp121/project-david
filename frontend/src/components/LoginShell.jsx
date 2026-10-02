import logoImg from '../assets/polo-logo.jpeg';

const css = `
.lg-page.customer-shell {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  padding: 32px 16px; box-sizing: border-box; background: #f7f7f5;
  --lg-gold: var(--gold, #c9a227);
}
.lg-col { width: 100%; max-width: 420px; display: flex; flex-direction: column; align-items: center; }
.lg-card {
  width: 100%; box-sizing: border-box; background: #fff; border: 1px solid #ececec;
  border-radius: 20px; padding: 34px 28px 28px; text-align: center;
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.07);
}
.lg-logo {
  position: relative; display: block; width: 40px; height: 64px; margin: 0 auto 10px;
  overflow: hidden; background: var(--lg-gold); isolation: isolate;
}
.lg-logo img {
  position: absolute; left: 50%; top: 50%; height: 86px; width: auto; max-width: none;
  transform: translate(-50%, -50%); mix-blend-mode: lighten; filter: contrast(1.25);
}
.lg-title { margin: 0; font-size: 1.9rem; font-weight: 800; letter-spacing: 0.5px; color: var(--lg-gold); }
.lg-sub { font-size: 0.72rem; letter-spacing: 4px; color: #9ca3af; margin: 4px 0 14px; }
.lg-badge {
  display: inline-block; padding: 4px 14px; border-radius: 999px; margin-bottom: 12px;
  border: 1px solid var(--lg-gold); color: #b8862b; background: rgba(212, 165, 72, 0.1);
  font-size: 0.8rem; font-weight: 700;
}
.lg-subtitle { color: #6b7280; font-size: 0.92rem; margin: 0 0 22px; }

.lg-field { position: relative; margin-bottom: 14px; }
.lg-field input {
  width: 100%; box-sizing: border-box; padding: 13px 44px; border-radius: 12px; margin: 0;
  border: 1px solid #e5e7eb; background: #fff; font-size: 0.95rem; color: #1f2937;
}
.lg-field input:focus { outline: none; border-color: var(--lg-gold); box-shadow: 0 0 0 3px rgba(212, 165, 72, 0.15); }
.lg-field-icon {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  color: #9ca3af; display: flex; pointer-events: none;
}
.lg-eye-btn {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; color: #9ca3af; padding: 4px; display: flex;
}
.lg-submit {
  width: 100%; margin-top: 6px; padding: 14px; border: none; border-radius: 12px;
  background: var(--lg-gold); color: #fff; font-weight: 700; font-size: 0.98rem; cursor: pointer;
  box-shadow: 0 6px 16px rgba(201, 162, 39, 0.3);
}
.lg-submit:hover { filter: brightness(1.06); }
.lg-forgot { margin: 16px 0 0; color: #b8862b; font-size: 0.88rem; font-weight: 600; cursor: pointer; text-decoration: underline; }
.lg-error { color: #dc2626; font-size: 0.85rem; min-height: 18px; margin-top: 10px; }
.lg-switch {
  width: 100%; box-sizing: border-box; background: #fff; border: 1px solid #ececec; border-radius: 16px;
  padding: 16px; margin-top: 14px; text-align: center; color: #6b7280; font-size: 0.88rem;
}
.lg-switch button {
  background: none; border: none; color: #b8862b; font-weight: 700; cursor: pointer; margin-left: 6px; font-size: 0.88rem;
}
`;

const ic = {
  width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
};

export function PhoneIcon() {
  return (
    <svg {...ic}><rect x="7" y="2" width="10" height="20" rx="2" /><line x1="11" y1="18" x2="13" y2="18" /></svg>
  );
}
export function LockIcon() {
  return (
    <svg {...ic}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
  );
}
export function UserIcon() {
  return (
    <svg {...ic}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
  );
}
export function CalendarIcon() {
  return (
    <svg {...ic}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
export function EyeIcon({ off }) {
  return off ? (
    <svg {...ic}>
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg {...ic}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
  );
}

// badge = ป้ายบอกว่าสำหรับใคร (เช่น "ສຳລັບແອດມິນ"), footer = กล่องล่างการ์ด (เช่น ลิงก์สมัครสมาชิก)
export default function LoginShell({ badge, subtitle, children, footer }) {
  return (
    <div className="lg-page customer-shell">
      <style>{css}</style>
      <div className="lg-col">
        <div className="lg-card">
          <span className="lg-logo"><img src={logoImg} alt="" /></span>
          <h1 className="lg-title">POLO SHOP</h1>
          <div className="lg-sub">RALPH LAUREN</div>
          {badge && <span className="lg-badge">{badge}</span>}
          {subtitle && <p className="lg-subtitle">{subtitle}</p>}
          {children}
        </div>
        {footer && <div className="lg-switch">{footer}</div>}
      </div>
    </div>
  );
}