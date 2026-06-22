import { useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { ShopContext } from '../context/ShopContext'
import { computeCouponDiscount, formatCouponAppliedMessage } from '../utils/couponDiscount'
import VoucherRemainingTime from './VoucherRemainingTime'

const DiscountBox = ({
  coupon,
  onApply,
  onRemove,
  selectedAmount,
  currency,
  hint,
  discountAmount,
  cartItems = [],
}) => {
  const { backendUrl, token } = useContext(ShopContext)
  const [code, setCode] = useState('')
  const [available, setAvailable] = useState([])
  const [loadingList, setLoadingList] = useState(false)

  useEffect(() => {
    if (!token || selectedAmount <= 0) {
      setAvailable([])
      return
    }

    const load = async () => {
      setLoadingList(true)
      try {
        const res = await axios.post(
          backendUrl + '/api/discount/available',
          { amount: selectedAmount, items: cartItems },
          { headers: { token } }
        )
        if (res.data.success) setAvailable(res.data.coupons || [])
        else setAvailable([])
      } catch {
        setAvailable([])
      } finally {
        setLoadingList(false)
      }
    }
    load()
  }, [backendUrl, token, selectedAmount, cartItems])

  const handleApply = async (couponCode) => {
    const next = String(couponCode || code).trim()
    if (!next) {
      toast.error('Vui lòng nhập mã giảm giá')
      return
    }
    await onApply(next)
  }

  const savings =
    discountAmount != null
      ? Number(discountAmount) || 0
      : computeCouponDiscount(coupon, selectedAmount)

  return (
    <div className='border border-gray-200 p-4 rounded-lg bg-white shadow-sm space-y-4'>
      <div>
        <p className='font-medium text-sm mb-2'>Voucher của bạn</p>
        {loadingList ? (
          <p className='text-sm text-gray-500'>Đang tải voucher...</p>
        ) : available.length === 0 ? (
          <p className='text-sm text-gray-500'>Chưa có voucher khả dụng cho đơn này.</p>
        ) : (
          <div className='space-y-2 max-h-64 overflow-y-auto'>
            <p className='text-xs text-gray-500'>Khả dụng ({available.length})</p>
            {available.map((v) => {
              const selected = coupon?.code === v.code
              return (
                <div
                  key={v._id || v.code}
                  className={`border rounded-lg p-3 text-sm ${selected ? 'border-green-500 bg-green-50/40' : 'border-gray-200'}`}
                >
                  <div className='flex items-start justify-between gap-2'>
                    <div>
                      <p className='font-semibold'>{v.code}</p>
                      <p className='text-green-700 font-medium mt-0.5'>{v.discountLabel}</p>
                      <VoucherRemainingTime expiresAt={v.expiresAt} />
                      {v.visibility === 'auto' && (
                        <p className='text-blue-600 text-xs mt-0.5'>Voucher tự động</p>
                      )}
                    </div>
                    <button
                      type='button'
                      onClick={() => handleApply(v.code)}
                      className={`shrink-0 px-3 py-1.5 rounded text-xs font-medium transition ${
                        selected
                          ? 'bg-green-600 text-white'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {selected ? 'Đã chọn' : 'Chọn'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className='border-t pt-3'>
        <p className='text-xs text-gray-500 mb-2'>Hoặc nhập mã thủ công</p>
        <div className='flex flex-col sm:flex-row gap-3'>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder='Nhập mã giảm giá'
            className='flex-1 border border-gray-300 rounded px-3 py-2 outline-none focus:border-black'
          />
          <button
            type='button'
            onClick={() => handleApply()}
            className='bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 active:bg-blue-800 transition'
          >
            Áp dụng
          </button>
        </div>
      </div>

      {coupon ? (
        <div className='text-sm text-green-700'>
          {formatCouponAppliedMessage(coupon, savings, currency)}
          <button type='button' onClick={onRemove} className='ml-3 text-red-600 underline'>
            Bỏ chọn
          </button>
        </div>
      ) : (
        <p className='text-sm text-gray-500'>
          {hint || 'Chọn voucher hoặc nhập mã để giảm giá đơn hàng.'}
        </p>
      )}

      {coupon && savings > 0 && (
        <div className='text-sm text-gray-600'>
          Tiết kiệm: {savings.toLocaleString('vi-VN')}
          {currency}
        </div>
      )}
    </div>
  )
}

export default DiscountBox
