import notificationModel from '../models/notificationModel.js'
import couponModel from '../models/couponModel.js'

const serializeNotification = (n) => ({
  _id: n._id,
  title: n.title,
  content: n.content,
  type: n.type,
  referenceId: n.referenceId || '',
  meta: n.meta || {},
  isRead: Boolean(n.isRead),
  createdAt: n.createdAt,
})

/** GET /api/notifications */
export const listNotifications = async (req, res) => {
  try {
    const userId = req.userId
    const notifications = await notificationModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .lean()

    const unreadCount = await notificationModel.countDocuments({
      userId,
      isRead: false,
    })

    const enriched = await Promise.all(
      notifications.map(async (n) => {
        const item = serializeNotification(n)
        if (n.type !== 'voucher' || !n.referenceId) return item
        if (item.meta?.startsAt || item.meta?.expiresAt) return item

        const coupon = await couponModel.findById(n.referenceId).lean()
        if (!coupon) return item

        item.meta = {
          ...item.meta,
          startsAt: coupon.startsAt ? Number(coupon.startsAt) : null,
          expiresAt: coupon.expiresAt ? Number(coupon.expiresAt) : null,
        }
        return item
      })
    )

    res.json({
      success: true,
      notifications: enriched,
      unreadCount,
    })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

/** PUT /api/notifications/read/:id */
export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.userId

    const updated = await notificationModel.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true },
      { new: true }
    )

    if (!updated) {
      return res.json({ success: false, message: 'Không tìm thấy thông báo' })
    }

    const unreadCount = await notificationModel.countDocuments({
      userId,
      isRead: false,
    })

    res.json({
      success: true,
      notification: serializeNotification(updated),
      unreadCount,
    })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}
