export const isVipNotification = (notification) => {
  if (!notification) return false
  if (notification.type === 'vip') return true
  const title = String(notification.title || '').toLowerCase()
  return title.includes('vip') || title.includes('thành viên vip')
}

export const notificationTypeIcon = (type) => {
  if (type === 'order') return '📦'
  if (type === 'voucher') return '🏷️'
  if (type === 'security') return '🔒'
  if (type === 'review_reply') return '💬'
  if (type === 'vip') return '👑'
  return '🔔'
}

/** Thời gian hiển thị cho thông báo phản hồi đánh giá (ngày giờ cụ thể) */
export const formatReviewReplyNotificationTime = (notification) => {
  const ts = notification?.meta?.adminRepliedAt || notification?.createdAt
  if (!ts) return ''
  return new Date(ts).toLocaleString('vi-VN')
}

export const formatNotificationTime = (createdAt) => {
  if (!createdAt) return ''
  const date = new Date(createdAt)
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Vừa xong'
  if (mins < 60) return `${mins} phút trước`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} ngày trước`
  return date.toLocaleDateString('vi-VN')
}
