import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ['order', 'voucher', 'security', 'review_reply', 'vip'],
      default: 'voucher',
    },
    referenceId: { type: String, default: '' },
    meta: {
      couponCode: { type: String, default: '' },
      discountLabel: { type: String, default: '' },
      orderId: { type: String, default: '' },
      productId: { type: String, default: '' },
      productName: { type: String, default: '' },
      adminRepliedAt: { type: Number, default: null },
      rewardPoints: { type: Number, default: null },
      startsAt: { type: Number, default: null },
      expiresAt: { type: Number, default: null },
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
)

notificationSchema.index({ userId: 1, createdAt: -1 })

const notificationModel =
  mongoose.models.notification || mongoose.model('notification', notificationSchema)

export default notificationModel
