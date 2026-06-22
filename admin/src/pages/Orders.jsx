import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets'
import OrderDetailModal from '../components/OrderDetailModal'

const Orders = ({ token, onStatusChanged }) => {

  const [orders, setOrders] = useState([])
  const [expandedOrders, setExpandedOrders] = useState({})
  const [modalReview, setModalReview] = useState(null)
  const [detailOrderId, setDetailOrderId] = useState(null)
  const [q, setQ] = useState('')
  const [activeTab, setActiveTab] = useState('all') // all | placed | packing | shipping | delivered | cancelled

  const fetchAllOrders = async () => {

    if (!token) return null

    try {

      const response = await axios.post(
        backendUrl + '/api/order/list',
        {},
        { headers: { token } }
      )

      if (response.data.success) {
        const ordersList = response.data.orders.reverse()
        setOrders(ordersList)
      } else {
        toast.error(response.data.message)
      }

    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  const matchTab = (order) => {
    const status = String(order?.status || '')
    switch (activeTab) {
      case 'placed':
        return status === 'Order Placed'
      case 'packing':
        return status === 'Processing' || status === 'Packing'
      case 'shipping':
        return status === 'Shipped' || status === 'Out for delivery'
      case 'delivered':
        return status === 'Delivered'
      case 'cancelled':
        return status === 'Cancelled'
      case 'all':
      default:
        return true
    }
  }

  const statusHandler = async (event, orderId) => {

    try {
      const nextStatus = event.target.value
      const prev = (orders || []).find((o) => String(o?._id) === String(orderId))
      const prevStatus = prev?.status

      const response = await axios.post(
        backendUrl + '/api/order/status',
        { orderId, status: nextStatus },
        { headers: { token } }
      )

      if (response.data.success) {
        // update UI immediately
        setOrders((prevOrders) =>
          (prevOrders || []).map((o) => (String(o?._id) === String(orderId) ? { ...o, status: nextStatus } : o))
        )
        if (typeof onStatusChanged === 'function') {
          onStatusChanged({ orderId, prevStatus, nextStatus })
        }
        fetchAllOrders()
      }

    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  const filteredOrders = useMemo(() => {
    const query = String(q || '').trim().toLowerCase()
    const base = (orders || []).filter(matchTab)
    if (!query) return base
    return base.filter((o) => {
      const id = String(o?._id || '').toLowerCase()
      const phone = String(o?.address?.phone || '').toLowerCase()
      return id.includes(query) || phone.includes(query)
    })
  }, [orders, q, activeTab])

  const tabCounts = useMemo(() => {
    const list = orders || []
    return {
      all: list.length,
      placed: list.filter((o) => String(o?.status) === 'Order Placed').length,
      packing: list.filter((o) => ['Processing', 'Packing'].includes(String(o?.status))).length,
      shipping: list.filter((o) => ['Shipped', 'Out for delivery'].includes(String(o?.status))).length,
      delivered: list.filter((o) => String(o?.status) === 'Delivered').length,
      cancelled: list.filter((o) => String(o?.status) === 'Cancelled').length
    }
  }, [orders])

  useEffect(() => {
    fetchAllOrders()
  }, [token])

  const getCancelReason = (order) => {
    const raw = String(order?.cancelReason || order?.cancelSurvey || '').trim()
    if (!raw) return ''
    return raw
  }

  const shortReason = (reason) => {
    const r = String(reason || '').trim()
    if (r.length <= 60) return r
    return r.slice(0, 60) + '…'
  }

  return (
    <div>
      <h3 className='text-xl font-semibold mb-4'>Trang đơn hàng</h3>

      <div className='mb-4'>
        <div className='flex flex-wrap gap-2 border-b'>
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'placed', label: 'Chờ xác nhận' },
            { key: 'packing', label: 'Đang xử lý/Đóng gói' },
            { key: 'shipping', label: 'Đang giao' },
            { key: 'delivered', label: 'Đã giao' },
            { key: 'cancelled', label: 'Đã hủy' }
          ].map((t) => {
            const isActive = activeTab === t.key
            const count = tabCounts[t.key] ?? 0
            const badgeClass = (() => {
              if (t.key === 'delivered') return isActive ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700'
              if (t.key === 'cancelled') return isActive ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'
              if (t.key === 'placed') return isActive ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-700'
              return isActive ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'
            })()
            return (
              <button
                key={t.key}
                type='button'
                onClick={() => setActiveTab(t.key)}
                className={`relative -mb-px px-4 py-2 text-sm font-medium rounded-t transition ${
                  isActive ? 'bg-white border border-b-white border-gray-200 text-black' : 'text-gray-600 hover:text-black'
                }`}
              >
                {t.label}
                <span className={`ml-2 inline-flex items-center justify-center min-w-[18px] h-5 px-2 rounded-full text-[11px] font-bold ${badgeClass}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className='mb-4 max-w-[520px]'>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder='Tìm theo SĐT hoặc mã đơn hàng...'
          className='w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-black bg-white'
        />
      </div>

      <div>

        {filteredOrders.map((order, index) => (
          <>
            <div
              key={index}
              className='grid grid-cols-1 sm:grid-cols-[auto_1.5fr_1fr] lg:grid-cols-[auto_1.6fr_1fr_1fr] gap-4 items-start border-2 border-gray-200 p-5 md:p-8 my-3 md:my-4 text-xs sm:text-sm text-gray-700'
            >

            <div className='w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden bg-gray-100 flex items-center justify-center'>
              <img
                className='w-full h-full object-cover'
                src={order.items?.[0]?.image?.[0] || assets.parcel_icon}
                alt={order.items?.[0]?.name || 'Product'}
              />
            </div>

            {/* SẢN PHẨM + ĐỊA CHỈ */}
            <div className='flex flex-col justify-between gap-4'>

              <div className='space-y-3'>
                {order.items.map((item, i) => (
                  <div key={i}>
                    <p className='font-medium'>{item.name} x {item.quantity}</p>
                    <p className='text-gray-500 text-xs'>Size: {item.size}</p>
                  </div>
                ))}
              </div>

              <div className='space-y-1'>
                <p className='font-medium'>{order.address.fullName}</p>
                <p className='text-gray-500'>{order.address.address}</p>
                <p className='text-gray-500'>{order.address.ward}, {order.address.district}, {order.address.province}</p>
                <p className='text-gray-500'>{order.address.phone}</p>
              </div>

            </div>

            {/* THÔNG TIN ĐƠN HÀNG */}
            <div>
              <p>Số sản phẩm : {order.items.length}</p>
              <p className='mt-3'>Phương thức : {order.paymentMethod}</p>
              <p>Thanh toán : {order.payment ? "Đã thanh toán" : "Chưa thanh toán"}</p>
              <p>Ngày đặt : {new Date(order.date).toLocaleDateString()}</p>
            </div>

            {/* GIÁ */}
            <p className='text-sm sm:text-[15px] font-medium'>
              {order.amount.toLocaleString('vi-VN')}₫
            </p>

            {/* TRẠNG THÁI */}
            <div className='flex flex-col gap-3'>
              {order.status === 'Delivered' && order.items.some((item) => item.review) ? (
                <>
                  <span className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold'>
                    <span>⭐</span>
                    Đã có đánh giá
                  </span>
                  <button
                    type='button'
                    className='px-3 py-2 text-xs font-semibold rounded border border-blue-600 text-blue-700 bg-white hover:bg-blue-50 transition-colors'
                    onClick={() => setDetailOrderId(order._id)}
                  >
                    Xem chi tiết
                  </button>
                  <button
                    type='button'
                    className='px-4 py-2 text-sm font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 transition'
                    onClick={() => setModalReview(order)}
                  >
                    Xem đánh giá
                  </button>
                </>
              ) : order.status === 'Cancelled' ? (
                <div className='space-y-1'>
                  <span className='inline-flex items-center rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700'>
                    Đã hủy (khách)
                  </span>
                  {getCancelReason(order) && (
                    <p
                      className='text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded px-2 py-1'
                      title={getCancelReason(order)}
                    >
                      Lý do: {shortReason(getCancelReason(order))}
                    </p>
                  )}
                  <button
                    type='button'
                    onClick={() => setDetailOrderId(order._id)}
                    className='mt-2 px-3 py-2 text-xs font-semibold rounded border border-gray-400 text-gray-700 bg-white hover:bg-gray-50 transition-colors'
                  >
                    Xem chi tiết
                  </button>
                </div>
              ) : (
                <div className='flex flex-col sm:flex-row gap-2 items-stretch sm:items-center'>
                  <select
                    onChange={(event) => statusHandler(event, order._id)}
                    value={order.status}
                    className='p-2 font-semibold border flex-1 min-w-0'
                  >
                    <option value="Order Placed">Chờ xác nhận</option>
                    <option value="Processing">Chờ xử lý</option>
                    <option value="Packing">Đang đóng gói</option>
                    <option value="Shipped">Đã giao cho ĐVVC</option>
                    <option value="Out for delivery">Đang giao hàng</option>
                    <option value="Delivered">Đã giao hàng</option>
                  </select>
                  <button
                    type='button'
                    onClick={() => setDetailOrderId(order._id)}
                    className='px-3 py-2 text-xs font-semibold rounded border border-blue-600 text-blue-700 bg-white hover:bg-blue-50 whitespace-nowrap transition-colors'
                  >
                    Xem chi tiết
                  </button>
                </div>
              )}
            </div>

          </div>

          {expandedOrders[order._id] && (
            <div className='mt-4 bg-white border rounded p-4'>
              <p className='font-semibold mb-3'>Đánh giá chi tiết</p>
              {order.items.filter((item) => item.review).map((item, itemIndex) => (
                <div key={itemIndex} className='mb-4 border-b last:border-b-0 pb-3'>
                  <p className='font-medium'>{item.name} x {item.quantity}</p>
                  <p className='text-sm text-gray-500'>Rating: {item.review.rating}/5</p>
                  <p className='text-sm text-gray-500'>Thẻ: {item.review.tags?.join(', ') || 'Không có'}</p>
                  <p className='mt-2 text-sm'>{item.review.comment || 'Không có bình luận'}</p>
                  {item.review.images?.length > 0 && (
                    <div className='flex flex-wrap gap-3 mt-3'>
                      {item.review.images.map((src, idx) => (
                        <img key={idx} src={src} alt={`review-${idx}`} className='w-20 h-20 object-cover rounded border' />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </>
        ))}

        {detailOrderId && (
          <OrderDetailModal
            orderId={detailOrderId}
            token={token}
            onClose={() => setDetailOrderId(null)}
          />
        )}

        {modalReview && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
            <div className='w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-xl'>
              <div className='flex items-center justify-between border-b px-5 py-4'>
                <div>
                  <p className='text-lg font-semibold'>Chi tiết đánh giá</p>
                  <p className='text-sm text-gray-500'>Đơn hàng: {modalReview._id}</p>
                </div>
                <button
                  onClick={() => setModalReview(null)}
                  className='text-gray-500 hover:text-black'
                >
                  Đóng
                </button>
              </div>
              <div className='p-5 space-y-4'>
                {modalReview.items.filter((item) => item.review).map((item, index) => (
                  <div key={index} className='border rounded-xl p-4'>
                    <div className='flex items-center gap-4'>
                      <img src={item.image?.[0]} alt={item.name} className='w-24 h-24 object-cover rounded-md border' />
                      <div>
                        <p className='text-lg font-semibold'>{item.name}</p>
                        <p className='text-sm text-gray-500'>Số lượng: {item.quantity} - Size: {item.size}</p>
                        <div className='flex items-center gap-1 text-yellow-500 mt-2'>
                          {Array.from({ length: 5 }, (_, star) => (
                            <span key={star}>{star < item.review.rating ? '⭐' : '☆'}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className='mt-4'>
                      <p className='font-medium'>Bình luận:</p>
                      <p className='mt-2 text-gray-700'>{item.review.comment || 'Không có bình luận'}</p>
                    </div>
                    {item.review.images?.length > 0 && (
                      <div className='mt-4'>
                        <p className='font-medium mb-2'>Ảnh đánh giá</p>
                        <div className='flex flex-wrap gap-3'>
                          {item.review.images.map((src, idx) => (
                            <img key={idx} src={src} alt={`review-${idx}`} className='w-24 h-24 object-cover rounded-md border' />
                          ))}
                        </div>
                      </div>
                    )}
                    {item.review.adminReply && (
                      <div className='mt-4 rounded-xl bg-green-50 border border-green-200 p-4'>
                        <p className='font-medium text-green-700'>Phản hồi admin</p>
                        <p className='mt-2 text-gray-700'>{item.review.adminReply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default Orders