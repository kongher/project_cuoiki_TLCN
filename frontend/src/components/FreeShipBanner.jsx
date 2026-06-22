/**
 * Thanh tiến trình freeship (ngưỡng mặc định 300.000đ).
 * @param {number} subtotal — tạm tính (chưa cộng phí ship)
 */
const FreeShipBanner = ({ subtotal = 0, className = '' }) => {
  const threshold = 300000
  const amount = Math.max(0, Number(subtotal) || 0)
  const pct = Math.min(100, Math.round((amount / threshold) * 100))
  const remaining = Math.max(0, threshold - amount)
  const unlocked = amount >= threshold

  return (
    <div className={`rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-3 ${className}`}>
      <p className='text-xs font-medium text-emerald-900 mb-2'>
        Ưu đãi: Freeship cho đơn hàng từ {threshold.toLocaleString('vi-VN')}đ
      </p>
      {unlocked ? (
        <p className='text-sm text-emerald-800 font-medium'>Bạn được miễn phí vận chuyển 🚚</p>
      ) : (
        <>
          <p className='text-sm text-gray-800 mb-2'>
            Mua thêm <span className='font-semibold text-emerald-800'>{remaining.toLocaleString('vi-VN')}đ</span> nữa để được Miễn phí vận chuyển 🚚
          </p>
          <div className='h-2 w-full rounded-full bg-emerald-100 overflow-hidden'>
            <div
              className='h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out'
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default FreeShipBanner
