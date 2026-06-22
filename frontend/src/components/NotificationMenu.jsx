import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ShopContext } from '../context/ShopContext'
import VoucherNotifyModal from './VoucherNotifyModal'
import VipNotifyModal from './VipNotifyModal'
import {
  formatNotificationTime,
  formatReviewReplyNotificationTime,
  isVipNotification,
} from '../utils/notificationHelpers'
import {
  buildOrdersAdminFeedbackUrl,
  getNotificationOrderProductIds,
} from '../utils/notificationRoutes'
import NotificationTypeIcon from './NotificationTypeIcon'

const NotificationMenu = () => {
  const { backendUrl, token } = useContext(ShopContext)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [list, setList] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [voucherModal, setVoucherModal] = useState(null)
  const [vipModal, setVipModal] = useState(null)
  const rootRef = useRef(null)

  const fetchUnreadCount = useCallback(async () => {
    if (!token) {
      setUnreadCount(0)
      return
    }
    try {
      const res = await axios.get(`${backendUrl}/api/notifications`, {
        headers: { token },
      })
      if (res.data.success) {
        setUnreadCount(Number(res.data.unreadCount) || 0)
      }
    } catch {
      setUnreadCount(0)
    }
  }, [backendUrl, token])

  const fetchNotifications = useCallback(async () => {
    if (!token) {
      setList([])
      return
    }
    setLoading(true)
    try {
      const res = await axios.get(`${backendUrl}/api/notifications`, {
        headers: { token },
      })
      if (res.data.success) {
        setList((res.data.notifications || []).slice(0, 5))
        setUnreadCount(Number(res.data.unreadCount) || 0)
      }
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }, [backendUrl, token])

  useEffect(() => {
    fetchUnreadCount()
  }, [fetchUnreadCount])

  useEffect(() => {
    if (open && token) fetchNotifications()
  }, [open, token, fetchNotifications])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && token) {
        fetchUnreadCount()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [token, fetchUnreadCount])

  useEffect(() => {
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const markAsRead = async (notification) => {
    if (!token || notification.isRead) return notification
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
        if (typeof res.data.unreadCount === 'number') {
          setUnreadCount(res.data.unreadCount)
        } else {
          setUnreadCount((c) => Math.max(0, c - 1))
        }
        return { ...notification, isRead: true }
      }
    } catch {
      // ignore
    }
    return notification
  }

  const handleClick = async (notification) => {
    setOpen(false)
    const n = await markAsRead(notification)

    if (n.type === 'order' && n.referenceId) {
      navigate(`/order-detail?id=${n.referenceId}`)
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
      navigate('/account', { state: { section: 'password' } })
      return
    }
    if (n.type === 'review_reply') {
      const { orderId, productId, variantId } = getNotificationOrderProductIds(n)
      if (orderId && productId) {
        navigate(buildOrdersAdminFeedbackUrl({ orderId, productId, variantId }))
      } else {
        navigate('/account/orders')
      }
    }
  }

  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount)

  return (
    <>
      <div
        ref={rootRef}
        className='relative inline-block'
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button
          type='button'
          className='notification-bell-trigger relative text-2xl leading-none cursor-pointer select-none'
          aria-label='Thông báo'
          aria-expanded={open}
          onClick={() => {
            setOpen((v) => !v)
            if (token) fetchNotifications()
          }}
        >
          🔔
          {unreadCount > 0 && (
            <span className='notification-bell-badge' aria-hidden>
              {badgeLabel}
            </span>
          )}
        </button>

        <div
          className={`absolute right-0 top-full pt-3 z-50 transition-all duration-200 ease-out ${
            open
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 -translate-y-1 pointer-events-none'
          }`}
        >
          <div className='w-[min(100vw-2rem,22rem)] bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden text-sm text-gray-800'>
            <div className='px-4 py-3 border-b border-gray-100 font-semibold text-gray-900'>
              Thông báo
            </div>
            {!token ? (
              <p className='px-4 py-6 text-center text-gray-500 text-xs'>
                <Link to='/login' className='underline' onClick={() => setOpen(false)}>
                  Đăng nhập
                </Link>{' '}
                để xem thông báo
              </p>
            ) : loading ? (
              <p className='px-4 py-6 text-center text-gray-500 text-xs'>Đang tải...</p>
            ) : list.length === 0 ? (
              <p className='px-4 py-6 text-center text-gray-500 text-xs'>Chưa có thông báo</p>
            ) : (
              <ul className='max-h-[320px] overflow-y-auto divide-y divide-gray-100'>
                {list.map((n) => (
                  <li key={n._id}>
                    <button
                      type='button'
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                        n.isRead ? 'bg-white' : 'bg-gray-100/80'
                      }`}
                      onClick={() => handleClick(n)}
                    >
                      <div className='flex gap-3'>
                        <NotificationTypeIcon type={isVipNotification(n) ? 'vip' : n.type} />
                        <div className='min-w-0 flex-1'>
                          <p className='font-medium text-gray-900 flex items-center gap-2'>
                            {n.title}
                            {!n.isRead && (
                              <span className='w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0' />
                            )}
                          </p>
                          <p className='text-xs text-gray-600 mt-0.5 line-clamp-2'>{n.content}</p>
                          <p className='text-[11px] text-gray-400 mt-1'>
                            {n.type === 'review_reply'
                              ? formatReviewReplyNotificationTime(n)
                              : formatNotificationTime(n.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to='/notifications'
              onClick={() => setOpen(false)}
              className='block text-center text-xs text-gray-600 py-3 border-t border-gray-100 hover:bg-gray-50 hover:text-gray-900'
            >
              Xem tất cả thông báo
            </Link>
          </div>
        </div>
      </div>

      <VoucherNotifyModal data={voucherModal} onClose={() => setVoucherModal(null)} />
      <VipNotifyModal data={vipModal} onClose={() => setVipModal(null)} />
    </>
  )
}

export default NotificationMenu
