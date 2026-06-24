import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { backendUrl } from '../App'

const Notifications = ({ token, pendingOrders = [], pendingReviews = [], refreshNow }) => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const orderItems = useMemo(() => {
    const arr = Array.isArray(pendingOrders) ? pendingOrders : []
    return arr.map((o) => ({
      id: o?._id,
      date: o?.date,
      phone: o?.address?.phone || '',
      name: o?.address?.fullName || '',
      total: o?.amount || 0
    }))
  }, [pendingOrders])

  const reviewItems = useMemo(() => {
    const arr = Array.isArray(pendingReviews) ? pendingReviews : []
    return arr.map((r) => ({
      orderId: r?.orderId,
      productId: r?.productId,
      productName: r?.productName,
      customerName: r?.customerName,
      rating: r?.rating,
      createdAt: r?.createdAt
    }))
  }, [pendingReviews])

  const manualRefresh = async () => {
    if (!token) return
    if (typeof refreshNow === 'function') return refreshNow()
    setLoading(true)
    try {
      await axios.post(backendUrl + '/api/order/list', {}, { headers: { token } })
      await axios.get(backendUrl + '/api/order/reviews', { headers: { token } })
    } catch (e) {
      toast.error('Không thể tải thông báo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Đảm bảo cập nhật khi mở
    manualRefresh()
   
  }, [])

  return (
    <div>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-xl font-semibold'>Thông báo</h3>
        <button
          type='button'
          onClick={manualRefresh}
          className='px-4 py-2 rounded border bg-white hover:bg-gray-50 text-sm'
          disabled={loading}
        >
          {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        <div className='bg-white border rounded-lg p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-3'>
            <p className='font-semibold'>Đơn hàng mới (Chờ xác nhận)</p>
            <span className='text-xs px-2 py-1 rounded-full bg-red-500 text-white font-bold'>
              {orderItems.length}
            </span>
          </div>
          {orderItems.length === 0 ? (
            <p className='text-sm text-gray-500'>Không có đơn hàng mới.</p>
          ) : (
            <div className='space-y-3'>
              {orderItems.slice(0, 10).map((o) => (
                <div key={o.id} className='flex items-start justify-between gap-3 border rounded p-3'>
                  <div className='text-sm'>
                    <p className='font-medium'>Mã: <span className='font-mono'>{String(o.id).slice(-10).toUpperCase()}</span></p>
                    <p className='text-gray-600'>{o.name} · {o.phone}</p>
                    <p className='text-xs text-gray-500'>{new Date(o.date || Date.now()).toLocaleString('vi-VN')}</p>
                  </div>
                  <button
                    type='button'
                    onClick={() => navigate('/orders')}
                    className='shrink-0 px-3 py-2 rounded bg-black text-white text-sm hover:bg-gray-800'
                  >
                    Xem
                  </button>
                </div>
              ))}
              {orderItems.length > 10 && (
                <button type='button' className='text-sm underline' onClick={() => navigate('/orders')}>
                  Xem tất cả
                </button>
              )}
            </div>
          )}
        </div>

        <div className='bg-white border rounded-lg p-4 shadow-sm'>
          <div className='flex items-center justify-between mb-3'>
            <p className='font-semibold'>Đánh giá mới (Chưa phản hồi)</p>
            <span className='text-xs px-2 py-1 rounded-full bg-red-500 text-white font-bold'>
              {reviewItems.length}
            </span>
          </div>
          {reviewItems.length === 0 ? (
            <p className='text-sm text-gray-500'>Không có đánh giá cần phản hồi.</p>
          ) : (
            <div className='space-y-3'>
              {reviewItems.slice(0, 10).map((r, idx) => (
                <div key={`${r.orderId}-${r.productId}-${idx}`} className='flex items-start justify-between gap-3 border rounded p-3'>
                  <div className='text-sm'>
                    <p className='font-medium'>{r.customerName} · {r.rating}⭐</p>
                    <p className='text-gray-700'>{r.productName}</p>
                    <p className='text-xs text-gray-500'>{new Date(r.createdAt || Date.now()).toLocaleString('vi-VN')}</p>
                  </div>
                  <button
                    type='button'
                    onClick={() => navigate('/reviews')}
                    className='shrink-0 px-3 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700'
                  >
                    Phản hồi
                  </button>
                </div>
              ))}
              {reviewItems.length > 10 && (
                <button type='button' className='text-sm underline' onClick={() => navigate('/reviews')}>
                  Xem tất cả
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Notifications

