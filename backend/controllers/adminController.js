import orderModel from '../models/orderModel.js'
import userModel from '../models/userModel.js'
import couponModel from '../models/couponModel.js'
import { sendVoucherGiftEmail } from '../utils/mailService.js'
import notificationModel from '../models/notificationModel.js'

const couponDiscountLabel = (coupon) => {
  if (String(coupon?.type) === 'amount') {
    return `${Number(coupon.amount || 0).toLocaleString('vi-VN')}đ`
  }
  return `${Number(coupon?.percent || 0)}%`
}

const GIFT_COUPON_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000

const giftCouponExpiresAt = (override) => {
  const custom = Number(override)
  if (custom > Date.now()) return custom
  return Date.now() + GIFT_COUPON_VALIDITY_MS
}

const buildUniqueGiftCode = async (preferredCode) => {
  const base = String(preferredCode || 'GIFT')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 24)
  let code = base
  let suffix = 0
  while (await couponModel.findOne({ code })) {
    suffix += 1
    code = `${base.slice(0, 18)}${suffix}`.slice(0, 24)
  }
  return code
}

/** Tạo mã giảm giá cá nhân: 1 lượt dùng, hết hạn sau 30 ngày, gắn user nhận */
const createPersonalGiftCoupon = async ({
  userId,
  code,
  type,
  percent,
  amount,
  minAmount,
  maxDiscount,
  expiresAt,
}) => {
  const coupon = new couponModel({
    code,
    type: type === 'amount' ? 'amount' : 'percent',
    percent: Number(percent) || 0,
    amount: Number(amount) || 0,
    minAmount: Number(minAmount) || 0,
    maxDiscount: Number(maxDiscount) || 0,
    active: true,
    usageLimit: 1,
    usedCount: 0,
    usedBy: [],
    assignedToUserId: userId,
    singleUsePerUser: true,
    isPersonalGift: true,
    expiresAt: giftCouponExpiresAt(expiresAt),
  })
  await coupon.save()
  return coupon
}

const createVoucherNotification = async (userId, coupon) => {
  const discountLabel = couponDiscountLabel(coupon)
  await notificationModel.create({
    userId,
    title: 'Ưu đãi từ Forever Shop',
    content: `Bạn vừa nhận mã giảm giá ${coupon.code} (${discountLabel}) qua email.`,
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

const SUCCESS_ORDER_STATUSES = ['Delivered', 'Paid']

/** GET /api/admin/top-customers */
export const getTopCustomers = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50)

    const rows = await orderModel.aggregate([
      { $match: { status: { $in: SUCCESS_ORDER_STATUSES } } },
      {
        $group: {
          _id: '$userId',
          totalSpent: { $sum: '$amount' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          let: { userIdStr: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: [{ $toString: '$_id' }, '$$userIdStr'] },
                role: { $ne: 'admin' },
              },
            },
            {
              $project: {
                name: 1,
                email: 1,
                phone: 1,
                membershipTier: 1,
                rewardPoints: 1,
              },
            },
          ],
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
    ])

      // người dùng 
    const customers = rows.map((r, idx) => ({
      rank: idx + 1,
      userId: r._id,
      name: r.user?.name || '—',
      email: r.user?.email || '',
      phone: r.user?.phone || '',
      orderCount: r.orderCount,
      totalSpent: r.totalSpent,
      membershipTier: r.user?.membershipTier || 'standard',
      rewardPoints: Number(r.user?.rewardPoints) || 0,
    }))

    res.json({ success: true, customers })
  } catch (error) {
    console.error('[top-customers]', error)
    res.json({ success: false, message: error.message })
  }
}

/** PATCH /api/admin/customers/:userId/block */
export const toggleCustomerBlock = async (req, res) => {
  try {
    const { userId } = req.params
    const user = await userModel.findById(userId)
    if (!user) {
      return res.json({ success: false, message: 'Không tìm thấy khách hàng' })
    }
    if (user.role === 'admin') {
      return res.json({ success: false, message: 'Không thể khóa tài khoản admin' })
    }

    user.isBlocked = !user.isBlocked
    await user.save()

    res.json({
      success: true,
      message: user.isBlocked ? 'Đã khóa tài khoản khách hàng' : 'Đã mở khóa tài khoản khách hàng',
      isBlocked: user.isBlocked,
    })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

/** DELETE /api/admin/customers/:userId */
export const deleteCustomer = async (req, res) => {
  try {
    const { userId } = req.params
    const user = await userModel.findById(userId)
    if (!user) {
      return res.json({ success: false, message: 'Không tìm thấy khách hàng' })
    }
    if (user.role === 'admin') {
      return res.json({ success: false, message: 'Không thể xóa tài khoản admin' })
    }

    await userModel.findByIdAndDelete(userId)
    res.json({ success: true, message: 'Đã xóa khách hàng khỏi hệ thống' })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

/** POST /api/admin/grant-reward */
export const grantCustomerReward = async (req, res) => {
  try {
    const { userId, rewardType, couponId, points } = req.body
    if (!userId) {
      return res.json({ success: false, message: 'Thiếu userId' })
    }

    const user = await userModel.findById(userId)
    if (!user || user.role === 'admin') {
      return res.json({ success: false, message: 'Không tìm thấy khách hàng' })
    }

    if (rewardType === 'voucher') {
      if (!user.email) {
        return res.json({ success: false, message: 'Khách hàng chưa có email để gửi voucher' })
      }

      let coupon = null
      const isCustom = couponId === 'custom' || req.body.useCustom === true

      if (isCustom) {
        const rawCode = String(req.body.customCode || req.body.code || '').trim().toUpperCase()
        const amount = Number(req.body.customAmount ?? req.body.amount)

        if (!rawCode) {
          return res.json({ success: false, message: 'Vui lòng nhập mã giảm giá tùy chỉnh' })
        }
        if (!amount || amount <= 0) {
          return res.json({ success: false, message: 'Số tiền giảm phải lớn hơn 0' })
        }

          // tạo mã giảm giá riêng 
        const code = await buildUniqueGiftCode(rawCode)
        coupon = await createPersonalGiftCoupon({
          userId: user._id,
          code,
          type: 'amount',
          percent: 0,
          amount,
          minAmount: 0,
          maxDiscount: 0,
          expiresAt: req.body.expiresAt,
        })
      } else {
        if (!couponId) {
          return res.json({ success: false, message: 'Vui lòng chọn mã giảm giá' })
        }
        const source = await couponModel.findById(couponId)
        if (!source) {
          return res.json({ success: false, message: 'Mã giảm giá không tồn tại' })
        }
        if (!source.active) {
          return res.json({ success: false, message: 'Mã giảm giá đang tạm dừng' })
        }

          // nâng thành khách VIP
        const personalCode = await buildUniqueGiftCode(`${source.code}-VIP`)
        coupon = await createPersonalGiftCoupon({
          userId: user._id,
          code: personalCode,
          type: source.type,
          percent: source.percent,
          amount: source.amount,
          minAmount: source.minAmount,
          maxDiscount: source.maxDiscount,
          expiresAt: req.body.expiresAt,
        })
      }

      try {
        await sendVoucherGiftEmail({
          to: user.email,
          customerName: user.name,
          coupon: coupon.toObject(),
        })
      } catch (mailErr) {
        if (coupon?.isPersonalGift && coupon?._id) {
          await couponModel.findByIdAndDelete(coupon._id).catch(() => {})
        }
        console.error('[grant voucher email]', mailErr.message)
        return res.json({
          success: false,
          message: 'Không gửi được email voucher. Kiểm tra cấu hình EMAIL trong .env',
        })
      }

      try {
        await createVoucherNotification(user._id, coupon)
      } catch (notifyErr) {
        console.error('[tạo thông báo voucher]', notifyErr.message)
      }

      return res.json({
        success: true,
        message: `Đã gửi mã ${coupon.code} tới email ${user.email}`,
        coupon: { _id: coupon._id, code: coupon.code, amount: coupon.amount, type: coupon.type },
        created: true,
      })
    }

    if (rewardType === 'vip') {
      const addPoints = Math.max(0, Number(points) || 100)
      user.membershipTier = 'vip'
      user.rewardPoints = (Number(user.rewardPoints) || 0) + addPoints
      await user.save()

      try {
        await notificationModel.create({
          userId: user._id,
          title: 'Chúc mừng thành viên VIP',
          content: `Chúc mừng bạn đã trở thành khách VIP! Tài khoản của bạn đã được nâng hạng và cộng ${addPoints} điểm thưởng.`,
          type: 'vip',
          referenceId: String(user._id),
          meta: { rewardPoints: addPoints },
          isRead: false,
        })
      } catch (notifyErr) {
        console.error('[tạo thông báo VIP]', notifyErr.message)
      }

      return res.json({
        success: true,
        message: `Đã nâng hạng VIP và cộng ${addPoints} điểm thưởng`,
        membershipTier: user.membershipTier,
        rewardPoints: user.rewardPoints,
      })
    }

    return res.json({ success: false, message: 'Loại ưu đãi không hợp lệ' })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}
