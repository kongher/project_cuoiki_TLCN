const CONFIRM_BTN = {
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:hover:bg-red-600',
  primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:hover:bg-blue-600',
}

const ConfirmDeleteModal = ({
  title = 'Xác nhận xóa',
  message,
  detail,
  onCancel,
  onConfirm,
  deleting = false,
  cancelLabel = 'Hủy',
  confirmLabel = 'Xác nhận xóa',
  confirmVariant = 'danger',
}) => (
  <div
    className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'
    onClick={onCancel}
    role='presentation'
  >
    <div
      className='bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-gray-100'
      onClick={(e) => e.stopPropagation()}
      role='dialog'
      aria-modal='true'
      aria-labelledby='confirm-delete-title'
    >
      <h3 id='confirm-delete-title' className='text-lg font-semibold text-gray-900 mb-2'>
        {title}
      </h3>
      <p className='text-sm text-gray-600 mb-6'>
        {message}
        {detail ? (
          <span className='block mt-2 font-medium text-gray-900 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100'>
            {detail}
          </span>
        ) : null}
      </p>
      <div className='flex justify-end gap-3'>
        <button
          type='button'
          onClick={onCancel}
          disabled={deleting}
          className='border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors'
        >
          {cancelLabel}
        </button>
        <button
          type='button'
          onClick={onConfirm}
          disabled={deleting}
          className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors ${CONFIRM_BTN[confirmVariant] || CONFIRM_BTN.danger}`}
        >
          {deleting ? 'Đang xóa...' : confirmLabel}
        </button>
      </div>
    </div>
  </div>
)

export default ConfirmDeleteModal
