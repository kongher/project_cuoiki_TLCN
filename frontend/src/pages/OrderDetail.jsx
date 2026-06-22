import { useContext, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { ShopContext } from '../context/ShopContext'

const translateStatus = (status) => {
  const map = {
    'Order Placed': 'Chờ xác nhận',
    Processing: 'Chờ xử lý',
    Packing: 'Đang đóng gói',
    Shipped: 'Đang giao hàng',
    'Out for delivery': 'Đang giao hàng',
    Delivered: 'Đã giao hàng',
    Cancelled: 'Đã hủy',
  }
  return map[status] || status
}

const OrderDetail = () => {
  const { backendUrl, token, currency } = useContext(ShopContext)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const orderId = searchParams.get('id')

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    if (!orderId) {
      navigate('/orders')
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        const res = await axios.post(
          `${backendUrl}/api/order/userorders`,
          {},
          { headers: { token } }
        )
        if (res.data.success) {
          const found = (res.data.orders || []).find((o) => String(o._id) === String(orderId))
          setOrder(found || null)
        }
      } catch {
        setOrder(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [backendUrl, token, orderId, navigate])

  if (loading) {
    return <p className='py-16 text-center text-gray-500'>Đang tải đơn hàng...</p>
  }

  if (!order) {
    return (
      <section className='max-w-lg mx-auto py-16 px-4 text-center'>
        <p className='text-gray-600 mb-4'>Không tìm thấy đơn hàng.</p>
        <Link to='/orders' className='text-sm underline'>
          Quay lại đơn hàng của tôi
        </Link>
      </section>
    )
  }

  return (
    <section className='max-w-2xl mx-auto py-10 px-4'>
      <Link to='/orders' className='text-sm text-gray-600 underline hover:text-black mb-4 inline-block'>
        ← Quay lại đơn hàng
      </Link>
      <h1 className='text-2xl font-semibold text-gray-900 mb-2'>Chi tiết đơn hàng</h1>
      <p className='text-sm text-gray-500 mb-6'>Mã đơn: #{String(order._id).slice(-8).toUpperCase()}</p>

      <div className='border border-gray-200 rounded-lg bg-white p-5 space-y-3 text-sm'>
        <p>
          <span className='text-gray-500'>Trạng thái:</span>{' '}
          <span className='font-medium'>{translateStatus(order.status)}</span>
        </p>
        <p>
          <span className='text-gray-500'>Tổng tiền:</span>{' '}
          <span className='font-semibold'>
            {Number(order.amount || 0).toLocaleString('vi-VN')}
            {currency}
          </span>
        </p>
        <p>
          <span className='text-gray-500'>Thanh toán:</span> {order.paymentMethod}
        </p>
        <p>
          <span className='text-gray-500'>Ngày đặt:</span>{' '}
          {order.date ? new Date(order.date).toLocaleString('vi-VN') : '—'}
        </p>
        {order.address && (
          <p>
            <span className='text-gray-500'>Giao tới:</span> {order.address.address || ''},{' '}
            {order.address.ward} {order.address.district} {order.address.province}
          </p>
        )}
        <div className='pt-3 border-t'>
          <p className='text-gray-500 mb-2'>Sản phẩm ({(order.items || []).length})</p>
          <ul className='space-y-2'>
            {(order.items || []).map((item, idx) => (
              <li key={idx} className='flex justify-between gap-2'>
                <span>{item.name}</span>
                <span className='text-gray-600'>x{item.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export default OrderDetail
