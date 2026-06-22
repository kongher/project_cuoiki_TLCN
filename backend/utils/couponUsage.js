import mongoose from 'mongoose'

const toIdString = (id) => (id ? String(id) : '')

export const userHasUsedCoupon = (coupon, userId) => {
  const uid = toIdString(userId)
  if (!uid || !coupon?.usedBy?.length) return false
  return coupon.usedBy.some((entry) => toIdString(entry) === uid)
}

/** Mã tặng riêng 1 lần / user — không áp dụng cho mã dùng chung (usageLimit > 1). */
const isOneTimePerUserGift = (coupon) => {
  if (!coupon?.assignedToUserId && !coupon?.singleUsePerUser) return false
  const limit = Number(coupon.usageLimit) || 0
  if (coupon.singleUsePerUser) return true
  if (coupon.assignedToUserId && limit <= 1) return true
  return false
}

/** Kiểm tra quyền dùng mã theo tài khoản (mã tặng riêng + đã dùng trước đó). */
export const assertUserCanUseCoupon = (coupon, userId) => {
  if (!userId) {
    return { ok: false, message: 'Vui lòng đăng nhập để sử dụng mã giảm giá' }
  }

  if (coupon.assignedToUserId && toIdString(coupon.assignedToUserId) !== toIdString(userId)) {
    return { ok: false, message: 'Mã giảm giá này không dành cho tài khoản của bạn' }
  }

  if (isOneTimePerUserGift(coupon) && userHasUsedCoupon(coupon, userId)) {
    return {
      ok: false,
      message: 'Bạn đã sử dụng mã giảm giá này cho đơn hàng trước đó rồi!',
    }
  }

  return { ok: true }
}

/** Ghi nhận lượt dùng: tăng usedCount và thêm userId vào usedBy (không trùng). */
export const recordCouponUsage = async (couponModel, code, userId) => {
  const normalizedCode = String(code || '').trim().toUpperCase()
  const uid = toIdString(userId)
  if (!normalizedCode || !uid) return

  const objectId = mongoose.Types.ObjectId.isValid(uid)
    ? new mongoose.Types.ObjectId(uid)
    : uid

  const update = {
    $inc: { usedCount: 1 },
    $addToSet: { usedBy: objectId },
  }

  await couponModel.updateOne({ code: normalizedCode }, update)
}
