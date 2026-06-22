const VipNotifyModal = ({ data, onClose }) => {
  if (!data) return null

  return (
    <div
      className='fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4'
      onClick={onClose}
      role='presentation'
    >
      <div
        className='bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center'
        onClick={(e) => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
        aria-labelledby='vip-notify-title'
      >
        <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-3xl'>
          👑
        </div>
        <h3 id='vip-notify-title' className='text-lg font-semibold text-gray-900 mb-2'>
          {data.title || 'Chúc mừng bạn đã trở thành khách VIP'}
        </h3>
        <p className='text-sm text-gray-600 mb-6 leading-relaxed'>
          {data.content ||
            'Tài khoản của bạn đã được nâng hạng VIP. Tận hưởng các ưu đãi dành riêng cho thành viên VIP nhé!'}
        </p>
        <button
          type='button'
          onClick={onClose}
          className='w-full px-4 py-2.5 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors'
        >
          Đóng
        </button>
      </div>
    </div>
  )
}

export default VipNotifyModal
