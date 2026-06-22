import { useEffect, useState } from 'react'
import axios from 'axios'
import { backendUrl, currency } from '../App'
import { assets } from '../assets/assets'
import { toast } from 'react-toastify'

const STATUS_LABELS = {
  'Order Placed': 'Chờ xác nhận',
  Processing: 'Chờ xử lý',
  Packing: 'Đang đóng gói',
  Shipped: 'Đã giao cho ĐVVC',
  'Out for delivery': 'Đang giao hàng',
  Delivered: 'Đã giao hàng',
  Cancelled: 'Đã hủy',
}

const formatVnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')}${currency}`

const OrderDetailModal = ({ orderId, token, onClose }) => {
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState(null)

  useEffect(() => {
    if (!orderId || !token) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const res = await axios.get(`${backendUrl}/api/orders/${orderId}`, {
          headers: { token },
        })
        if (cancelled) return
        if (res.data.success) {
          setOrder(res.data.order)
        } else {
          toast.error(res.data.message || 'Không tải được chi tiết đơn')
          onClose?.()
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(e.response?.data?.message || e.message)
          onClose?.()
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [orderId, token, onClose])

  if (!orderId) return null

  const addr = order?.address || {}
  const fin = order?.financials || {}
  const fullAddress = [addr.address, addr.ward, addr.district, addr.province]
    .filter(Boolean)
    .join(', ')

  return (
    <div
      className='fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4'
      onClick={onClose}
      role='presentation'
    >
      <div
        className='w-full max-w-[800px] max-h-[90vh] overflow-hidden bg-white rounded-xl shadow-xl flex flex-col'
        onClick={(e) => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
        aria-labelledby='order-detail-title'
      >
        <div className='flex items-start justify-between border-b px-5 py-4 shrink-0'>
          <div>
            <h2 id='order-detail-title' className='text-lg font-semibold text-gray-900'>
              Chi tiết đơn hàng
            </h2>
            <p className='text-xs text-gray-500 mt-0.5 font-mono'>#{orderId}</p>
            {order?.status && (
              <p className='text-sm text-gray-600 mt-1'>
                Trạng thái:{' '}
                <span className='font-medium'>{STATUS_LABELS[order.status] || order.status}</span>
              </p>
            )}
          </div>
          <button
            type='button'
            onClick={onClose}
            className='text-gray-400 hover:text-gray-800 text-2xl leading-none px-2'
            aria-label='Đóng'
          >
            ×
          </button>
        </div>

        <div className='overflow-y-auto flex-1 px-5 py-4 space-y-6'>
          {loading ? (
            <p className='text-center text-gray-500 py-12'>Đang tải...</p>
          ) : !order ? (
            <p className='text-center text-gray-500 py-12'>Không có dữ liệu</p>
          ) : (
            <>
              <section>
                <h3 className='text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3'>
                  Khách hàng &amp; vận chuyển
                </h3>
                <div className='grid sm:grid-cols-2 gap-3 text-sm bg-gray-50 rounded-lg p-4 border border-gray-100'>
                  <div>
                    <p className='text-gray-500 text-xs'>Họ tên</p>
                    <p className='font-medium'>{addr.fullName || '—'}</p>
                  </div>
                  <div>
                    <p className='text-gray-500 text-xs'>Số điện thoại</p>
                    <p className='font-medium'>{addr.phone || '—'}</p>
                  </div>
                  <div className='sm:col-span-2'>
                    <p className='text-gray-500 text-xs'>Địa chỉ</p>
                    <p className='font-medium'>{fullAddress || '—'}</p>
                  </div>
                  <div>
                    <p className='text-gray-500 text-xs'>Phương thức thanh toán</p>
                    <p className='font-medium'>{order.paymentMethod || '—'}</p>
                  </div>
                  <div>
                    <p className='text-gray-500 text-xs'>Trạng thái thanh toán</p>
                    <p className='font-medium'>{order.payment ? 'Đã thanh toán' : 'Chưa thanh toán'}</p>
                  </div>
                  <div>
                    <p className='text-gray-500 text-xs'>Ngày đặt</p>
                    <p className='font-medium'>
                      {order.date ? new Date(order.date).toLocaleString('vi-VN') : '—'}
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className='text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3'>
                  Sản phẩm
                </h3>
                <div className='overflow-x-auto border border-gray-200 rounded-lg'>
                  <table className='w-full text-sm'>
                    <thead className='bg-gray-100 text-left text-xs text-gray-600'>
                      <tr>
                        <th className='px-3 py-2 w-16'>Ảnh</th>
                        <th className='px-3 py-2'>Tên</th>
                        <th className='px-3 py-2'>Thuộc tính</th>
                        <th className='px-3 py-2 text-center'>SL</th>
                        <th className='px-3 py-2 text-right'>Đơn giá</th>
                        <th className='px-3 py-2 text-right'>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-100'>
                      {(order.items || []).map((item, idx) => (
                        <tr key={idx} className='hover:bg-gray-50/80'>
                          <td className='px-3 py-2'>
                            <img
                              src={item.image || assets.parcel_icon}
                              alt=''
                              className='w-12 h-12 object-cover rounded border bg-gray-100'
                            />
                          </td>
                          <td className='px-3 py-2 font-medium text-gray-900'>{item.name}</td>
                          <td className='px-3 py-2 text-gray-600 text-xs'>
                            {item.color ? `Màu: ${item.color}` : ''}
                            {item.color && item.size ? ' · ' : ''}
                            {item.size ? `Size: ${item.size}` : '—'}
                          </td>
                          <td className='px-3 py-2 text-center'>{item.quantity}</td>
                          <td className='px-3 py-2 text-right whitespace-nowrap'>
                            {formatVnd(item.unitPrice)}
                          </td>
                          <td className='px-3 py-2 text-right font-medium whitespace-nowrap'>
                            {formatVnd(item.lineTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h3 className='text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3'>
                  Chi tiết tài chính
                </h3>
                <div className='bg-gray-50 rounded-lg border border-gray-100 p-4 space-y-2 text-sm max-w-md ml-auto'>
                  <div className='flex justify-between'>
                    <span className='text-gray-600'>Tạm tính</span>
                    <span>{formatVnd(fin.subtotal)}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-gray-600'>Mã giảm giá</span>
                    <span>{fin.couponCode || '—'}</span>
                  </div>
                  <div className='flex justify-between text-green-700'>
                    <span>Giảm giá</span>
                    <span>-{formatVnd(fin.discount)}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-gray-600'>Phí vận chuyển</span>
                    <span>
                      {fin.shippingFee === 0 ? 'Miễn phí' : formatVnd(fin.shippingFee)}
                    </span>
                  </div>
                  <div className='flex justify-between pt-2 border-t border-gray-200 text-base font-semibold'>
                    <span>Tổng cộng</span>
                    <span>{formatVnd(fin.total)}</span>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>

        <div className='border-t px-5 py-3 shrink-0 flex justify-end'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors'
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

export default OrderDetailModal
