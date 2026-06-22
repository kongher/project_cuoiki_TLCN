import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { buildValidityText, formatCountdown } from '../utils/couponTime'

const VoucherNotifyModal = ({ data, onClose }) => {
  const [countdown, setCountdown] = useState('')

  const validityText = useMemo(
    () => buildValidityText(data?.startsAt, data?.expiresAt),
    [data?.startsAt, data?.expiresAt]
  )

  useEffect(() => {
    if (!data?.expiresAt) {
      setCountdown('')
      return undefined
    }
    const tick = () => setCountdown(formatCountdown(data.expiresAt))
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [data?.expiresAt])

  if (!data) return null

  const copyCode = async () => {
    const code = data.code || ''
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      toast.success('Đã copy mã giảm giá')
    } catch {
      toast.error('Không copy được mã, hãy chọn và copy thủ công')
    }
  }

  return (
    <div
      className='fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4'
      onClick={onClose}
      role='presentation'
    >
      <div
        className='bg-white rounded-xl shadow-xl max-w-sm w-full p-6'
        onClick={(e) => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
      >
        <h3 className='text-lg font-semibold text-gray-900 mb-2'>Mã giảm giá của bạn</h3>
        <p className='text-sm text-gray-600 mb-4'>{data.content || 'Áp dụng mã khi thanh toán.'}</p>
        <div className='bg-gray-100 rounded-lg px-4 py-3 text-center mb-4'>
          <p className='text-xs text-gray-500 mb-1'>Mã voucher</p>
          <p className='text-xl font-bold tracking-wider text-gray-900'>{data.code || '—'}</p>
          {data.discountLabel && (
            <p className='text-sm text-green-700 font-medium mt-1'>Giảm {data.discountLabel}</p>
          )}
          {validityText && (
            <p className='text-xs text-gray-600 mt-2'>{validityText}</p>
          )}
          {countdown && (
            <p className='text-xs text-amber-700 font-medium mt-1'>⏳ {countdown}</p>
          )}
        </div>
        <div className='flex gap-3'>
          <button
            type='button'
            onClick={onClose}
            className='flex-1 px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50'
          >
            Đóng
          </button>
          <button
            type='button'
            onClick={copyCode}
            className='flex-1 px-4 py-2 text-sm bg-black text-white rounded hover:bg-gray-800'
          >
            Copy mã nhanh
          </button>
        </div>
      </div>
    </div>
  )
}

export default VoucherNotifyModal
