import userModel from '../models/userModel.js'
import notificationModel from '../models/notificationModel.js'
import { sendVoucherGiftEmail } from '../utils/mailService.js'

const couponDiscountLabel = (coupon) => {
  if (String(coupon?.type) === 'amount') {
    return `${Number(coupon.amount || 0).toLocaleString('vi-VN')}đ`
  }
  return `${Number(coupon?.percent || 0)}%`
}

export const createVoucherNotification = async (userId, coupon, { audience = '' } = {}) => {
  const discountLabel = couponDiscountLabel(coupon)
  const audienceNote = audience === 'vip' ? ' dành cho khách VIP' : ''
  await notificationModel.create({
    userId,
    title: 'Ưu đãi từ Forever Shop',
    content: `Bạn vừa nhận mã giảm giá${audienceNote}: ${coupon.code} (giảm ${discountLabel}). Áp dụng khi thanh toán trên website.`,
    type: 'voucher',
    referenceId: String(coupon._id),
    meta: {
      couponCode: coupon.code,
      discountLabel,
      startsAt: coupon.startsAt ? Number(coupon.startsAt) : null,
      expiresAt: coupon.expiresAt ? Number(coupon.expiresAt) : null,
    },
    isRead: false,
  })
}

export const notifyVipCustomersAboutCoupon = async (coupon) => {
  const vipUsers = await userModel
    .find({ membershipTier: 'vip', role: { $ne: 'admin' }, isBlocked: { $ne: true } })
    .lean()

  let emailed = 0
  let notified = 0
  const failures = []

  for (const user of vipUsers) {
    let emailOk = false
    if (user.email) {
      try {
        await sendVoucherGiftEmail({
          to: user.email,
          customerName: user.name,
          coupon: coupon.toObject ? coupon.toObject() : coupon,
        })
        emailed += 1
        emailOk = true
      } catch (err) {
        failures.push({ userId: String(user._id), email: user.email, error: err.message })
      }
    }

    try {
      await createVoucherNotification(user._id, coupon, { audience: 'vip' })
      notified += 1
    } catch (err) {
      if (!emailOk) {
        failures.push({ userId: String(user._id), error: err.message })
      }
    }
  }

  return {
    total: vipUsers.length,
    emailed,
    notified,
    failures,
  }
}
