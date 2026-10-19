import { useLang } from '../i18n.jsx';

export default function ConfirmModal({
  open,
  message,
  confirmText,
  cancelText,
  danger = false,
  hideCancel = false, // true = กล่องแจ้งข้อความ (ปุ่มเดียว) แทน alert()
  onConfirm,
  onCancel,
}) {
  const { t } = useLang();
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal-box" style={{ background: '#fff', color: '#1f2937', maxWidth: 360, textAlign: 'center' }}>
        <p style={{ fontSize: '1.05rem', marginBottom: 20, color: '#1f2937', whiteSpace: 'pre-line' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {!hideCancel && (
            <button
              onClick={onCancel}
              style={{
                background: '#fff', color: '#374151', border: '1px solid #dfe3e8',
                padding: '10px 20px', borderRadius: 6, cursor: 'pointer', minWidth: 96,
              }}
            >
              {cancelText ?? t('common.cancel')}
            </button>
          )}
          <button
            onClick={onConfirm}
            style={{
              background: danger ? '#dc2626' : 'var(--blue)', color: '#fff', border: 'none',
              padding: '10px 20px', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', minWidth: 96,
            }}
          >
            {confirmText ?? t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}