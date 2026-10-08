export default function ConfirmModal({
  open,
  message,
  confirmText = 'ຢືນຢັນ',
  cancelText = 'ຍົກເລີກ',
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal-box" style={{ background: '#fff', color: '#1f2937', maxWidth: 360, textAlign: 'center' }}>
        <p style={{ fontSize: '1.05rem', marginBottom: 20, color: '#1f2937', whiteSpace: 'pre-line' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              background: '#fff', color: '#374151', border: '1px solid #dfe3e8',
              padding: '10px 20px', borderRadius: 6, cursor: 'pointer', minWidth: 96,
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: danger ? '#dc2626' : 'var(--blue)', color: '#fff', border: 'none',
              padding: '10px 20px', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer', minWidth: 96,
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}