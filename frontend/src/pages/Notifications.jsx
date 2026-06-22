import { useCallback, useContext, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { ShopContext } from '../context/ShopContext'
import VoucherNotifyModal from '../components/VoucherNotifyModal'
import VipNotifyModal from '../components/VipNotifyModal'
import {
  formatNotificationTime,
  formatReviewReplyNotificationTime,
  isVipNotification,
} from '../utils/notificationHelpers'
import {
  buildOrdersAdminFeedbackUrl,
  getNotificationOrderProductIds,
} from '../utils/notificationRoutes'
import NotificationTypeIcon from '../components/NotificationTypeIcon'

const Notifications = () => {
  const { backendUrl, token, navigate } = useContext(ShopContext)
  const routerNavigate = useNavigate()

  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [voucherModal, setVoucherModal] = useState(null)
  const [vipModal, setVipModal] = useState(null)

  const fetchNotifications = useCallback(async () => {
    if (!token) {
      setList([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await axios.get(`${backendUrl}/api/notifications`, {
        headers: { token },
      })
      if (res.data.success) {
        setList(res.data.notifications || [])
      } else {
        toast.error(res.data.message || 'Không tải được thông báo')
      }
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
    } finally {
      setLoading(false)
    }
  }, [backendUrl, token])

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    fetchNotifications()
  }, [token, navigate, fetchNotifications])

  const markAsRead = async (notification) => {
    if (notification.isRead) return notification
    try {
      const res = await axios.put(
        `${backendUrl}/api/notifications/read/${notification._id}`,
        {},
        { headers: { token } }
      )
      if (res.data.success) {
        setList((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n))
        )
        return { ...notification, isRead: true }
      }
    } catch {
      // ignore
    }
    return notification
  }

  const handleClick = async (notification) => {
    const n = await markAsRead(notification)

    if (n.type === 'order' && n.referenceId) {
      routerNavigate(`/order-detail?id=${n.referenceId}`)
      return
    }
    if (n.type === 'voucher') {
      setVoucherModal({
        code: n.meta?.couponCode || '',
        discountLabel: n.meta?.discountLabel || '',
        content: n.content,
        startsAt: n.meta?.startsAt || null,
        expiresAt: n.meta?.expiresAt || null,
      })
      return
    }
    if (isVipNotification(n)) {
      setVipModal({
        title: n.title || 'Chúc mừng bạn đã trở thành khách VIP',
        content: n.content,
      })
      return
    }
    if (n.type === 'security') {
      routerNavigate('/account', { state: { section: 'password' } })
      return
    }
    if (n.type === 'review_reply') {
      const { orderId, productId, variantId } = getNotificationOrderProductIds(n)
      if (orderId && productId) {
        routerNavigate(buildOrdersAdminFeedbackUrl({ orderId, productId, variantId }))
      } else {
        routerNavigate('/account/orders')
      }
    }
  }

  return (
    <section className='max-w-2xl mx-auto py-10 px-4'>
      <h1 className='text-2xl font-semibold text-gray-900 mb-2'>Tất cả thông báo</h1>
      <p className='text-sm text-gray-500 mb-8'>Cập nhật đơn hàng, ưu đãi và bảo mật tài khoản.</p>

      {loading ? (
        <p className='text-gray-500 text-center py-8'>Đang tải...</p>
      ) : list.length === 0 ? (
        <p className='text-gray-500 text-center py-8 border border-gray-200 rounded-lg bg-white'>
          Chưa có thông báo nào.
        </p>
      ) : (
        <ul className='divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white overflow-hidden'>
          {list.map((n) => (
            <li key={n._id}>
              <button
                type='button'
                onClick={() => handleClick(n)}
                className={`w-full flex gap-4 px-4 py-4 text-left hover:bg-gray-50 transition-colors ${
                  n.isRead ? 'bg-white' : 'bg-gray-100/80'
                }`}
              >
                <NotificationTypeIcon type={isVipNotification(n) ? 'vip' : n.type} />
                <div className='min-w-0 flex-1'>
                  <p className='font-medium text-gray-900 flex items-center gap-2'>
                    {n.title}
                    {!n.isRead && (
                      <span className='w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0' />
                    )}
                  </p>
                  <p className='text-sm text-gray-600 mt-0.5'>{n.content}</p>
                  <p className='text-xs text-gray-400 mt-1'>
                    {n.type === 'review_reply'
                      ? formatReviewReplyNotificationTime(n)
                      : formatNotificationTime(n.createdAt)}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className='mt-6 text-center text-sm'>
        <Link to='/orders' className='text-gray-800 underline hover:text-black'>
          Xem đơn hàng của tôi
        </Link>
      </p>

      <VoucherNotifyModal data={voucherModal} onClose={() => setVoucherModal(null)} />
      <VipNotifyModal data={vipModal} onClose={() => setVipModal(null)} />
    </section>
  )
}

export default Notifications
