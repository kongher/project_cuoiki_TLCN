import orderModel from '../models/orderModel.js'
import productModel from '../models/productModel.js'
import userModel from '../models/userModel.js'
import { assertUserCanUseCoupon } from './couponUsage.js'
import {
  computeDiscountAmount,
  getDiscountType,
  getDiscountTypeLabel,
  getDiscountValue,
} from './couponDiscount.js'
import { findVariantForLine, getSkuForLine } from './inventory.js'

const norm = (s) => String(s || '').trim().toLowerCase()

export const COUPON_STATUS_LABELS = {
  upcoming: 'Sắp diễn ra',
  running: 'Đang chạy',
  expired: 'Đã hết hạn',
  exhausted: 'Đã hết lượt',
  paused: 'Tạm dừng',
}

export const SCOPE_LABELS = {
  all: 'Toàn bộ cửa hàng',
  category: 'Danh mục sản phẩm',
  product: 'Sản phẩm cụ thể',
  sku: 'SKU cụ thể',
}

export const AUDIENCE_LABELS = {
  all: 'Tất cả khách hàng',
  new: 'Khách hàng mới',
  vip: 'Khách VIP',
  repeat_3: 'Khách đã mua > 3 đơn',
  assigned: 'Khách được chỉ định',
  birthday: 'Sinh nhật khách hàng',
}

export const VISIBILITY_LABELS = {
  public: 'Mã công khai',
  private: 'Mã riêng tư',
  auto: 'Voucher tự động',
}

export const computeCouponStatus = (coupon, now = Date.now()) => {
  if (!coupon) return 'paused'
  if (coupon.active === false) return 'paused'
  if (coupon.startsAt && now < Number(coupon.startsAt)) return 'upcoming'
  if (coupon.expiresAt && now > Number(coupon.expiresAt)) return 'expired'
  const limit = Number(coupon.usageLimit) || 0
  const used = Number(coupon.usedCount) || 0
  if (limit > 0 && used >= limit) return 'exhausted'
  return 'running'
}

const getLineUnitPrice = (product) => {
  if (!product) return 0
  const discountPercent = Number(product.discountPercent) || 0
  if (discountPercent > 0) {
    const sale = Number(product.salePrice) || 0
    if (sale > 0) return sale
    return Math.round(Number(product.price) * (100 - discountPercent) / 100)
  }
  return Number(product.price) || 0
}

export const resolveOrderLines = async (items) => {
  const lines = []
  for (const item of items || []) {
    const productId = String(item?._id || item?.productId || '').trim()
    if (!productId) continue
    const product = await productModel.findById(productId).lean()
    if (!product) continue

    const color = String(item.color || 'DEFAULT').trim()
    const size = String(item.size || '').trim()
    const variant = findVariantForLine(product, color)
    const sku = String(item.sku || '').trim() || getSkuForLine(product, variant, size)
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1))
    const unitPrice = getLineUnitPrice(product)
    lines.push({
      productId,
      product,
      catalogSlug: String(product.catalogSlug || '').trim(),
      category: String(product.category || '').trim(),
      subCategory: String(product.subCategory || '').trim(),
      sku,
      color,
      size,
      quantity,
      unitPrice,
      lineTotal: unitPrice * quantity,
    })
  }
  return lines
}

const lineMatchesScope = (coupon, line) => {
  const scope = coupon.applyScope || 'all'
  const targets = (coupon.applyTargets || []).map((t) => String(t).trim()).filter(Boolean)
  if (scope === 'all' || !targets.length) return scope === 'all'

  if (scope === 'category') {
    return targets.some((t) => {
      const key = norm(t)
      return (
        key === norm(line.catalogSlug) ||
        key === norm(line.category) ||
        key === norm(line.subCategory) ||
        norm(line.catalogSlug).includes(key) ||
        key.includes('jean') && norm(line.catalogSlug).includes('jean')
      )
    })
  }
  if (scope === 'product') return targets.includes(line.productId)
  if (scope === 'sku') {
    const set = new Set(targets.map((s) => s.toUpperCase()))
    return set.has(String(line.sku || '').toUpperCase())
  }
  return false
}

export const getEligibleSubtotal = (coupon, lines) => {
  const scope = coupon?.applyScope || 'all'
  if (scope === 'all') {
    return lines.reduce((sum, line) => sum + line.lineTotal, 0)
  }
  return lines
    .filter((line) => lineMatchesScope(coupon, line))
    .reduce((sum, line) => sum + line.lineTotal, 0)
}

const isBirthdayToday = (dob) => {
  const raw = String(dob || '').trim()
  if (!raw) return false
  const parts = raw.includes('-') ? raw.split('-') : raw.split('/')
  if (parts.length < 3) return false
  let day
  let month
  if (parts[0].length === 4) {
    month = Number(parts[1])
    day = Number(parts[2])
  } else {
    day = Number(parts[0])
    month = Number(parts[1])
  }
  if (!day || !month) return false
  const now = new Date()
  return now.getDate() === day && now.getMonth() + 1 === month
}

export const getUserOrderCount = async (userId) => {
  if (!userId) return 0
  return orderModel.countDocuments({ userId, status: { $ne: 'Cancelled' } })
}

export const assertCouponAudience = async (coupon, userId) => {
  const audience = coupon.audienceType || 'all'
  if (audience === 'all') return { ok: true }

  if (!userId) return { ok: false, message: 'Vui lòng đăng nhập để sử dụng mã giảm giá' }

  const user = await userModel.findById(userId).lean()
  if (!user) return { ok: false, message: 'Không tìm thấy tài khoản' }

  if (audience === 'vip') {
    if (String(user.membershipTier || '').toLowerCase() !== 'vip') {
      return { ok: false, message: 'Mã giảm giá chỉ dành cho khách VIP' }
    }
    return { ok: true }
  }

  if (audience === 'new') {
    const count = await getUserOrderCount(userId)
    if (count > 0) return { ok: false, message: 'Mã giảm giá chỉ dành cho khách hàng mới' }
    return { ok: true }
  }

  if (audience === 'repeat_3') {
    const count = await getUserOrderCount(userId)
    if (count <= 3) return { ok: false, message: 'Mã giảm giá chỉ dành cho khách đã mua trên 3 đơn' }
    return { ok: true }
  }

  if (audience === 'birthday') {
    if (!isBirthdayToday(user.dob)) {
      return { ok: false, message: 'Mã giảm giá chỉ áp dụng trong ngày sinh nhật của bạn' }
    }
    return { ok: true }
  }

  if (audience === 'assigned') {
    const assigned = coupon.assignedToUserId ? String(coupon.assignedToUserId) : ''
    if (assigned && assigned !== String(userId)) {
      return { ok: false, message: 'Mã giảm giá này không dành cho tài khoản của bạn' }
    }
    return { ok: true }
  }

  return { ok: true }
}

export const canUserSeeCoupon = (coupon, userId) => {
  const visibility = coupon.visibility || 'public'
  if (visibility === 'private') {
    if (!coupon.assignedToUserId) return false
    return String(coupon.assignedToUserId) === String(userId || '')
  }
  if (coupon.audienceType === 'assigned' && coupon.assignedToUserId) {
    return String(coupon.assignedToUserId) === String(userId || '')
  }
  return true
}

export const buildCouponSummary = (coupon) => {
  const scope = coupon.applyScope || 'all'
  if (scope === 'all') return 'Áp dụng toàn shop'
  if (scope === 'category' && coupon.applyTargets?.length) {
    return `Chỉ áp dụng ${coupon.applyTargets.join(', ')}`
  }
  if (scope === 'product') return 'Áp dụng cho sản phẩm đã chọn'
  if (scope === 'sku') return 'Áp dụng cho SKU đã chọn'
  return SCOPE_LABELS[scope] || ''
}

export const buildCouponDiscountLabel = (coupon) => {
  if (getDiscountType(coupon) === 'amount') {
    return `Giảm ${(Number(coupon.amount) || 0).toLocaleString('vi-VN')}đ`
  }
  return `Giảm ${Number(coupon.percent) || 0}%`
}

export const serializeCouponForClient = (coupon, { eligibleSubtotal = 0, discountAmount = 0 } = {}) => ({
  _id: coupon._id,
  code: coupon.code,
  type: coupon.type,
  typeLabel: getDiscountTypeLabel(coupon),
  discountType: getDiscountType(coupon),
  discountValue: getDiscountValue(coupon),
  percent: coupon.percent,
  amount: coupon.amount,
  minAmount: coupon.minAmount,
  maxDiscount: coupon.maxDiscount,
  applyScope: coupon.applyScope || 'all',
  applyTargets: coupon.applyTargets || [],
  audienceType: coupon.audienceType || 'all',
  visibility: coupon.visibility || 'public',
  startsAt: coupon.startsAt,
  expiresAt: coupon.expiresAt,
  usageLimit: coupon.usageLimit,
  usedCount: coupon.usedCount,
  active: coupon.active,
  status: computeCouponStatus(coupon),
  statusLabel: COUPON_STATUS_LABELS[computeCouponStatus(coupon)],
  scopeLabel: SCOPE_LABELS[coupon.applyScope || 'all'],
  audienceLabel: AUDIENCE_LABELS[coupon.audienceType || 'all'],
  visibilityLabel: VISIBILITY_LABELS[coupon.visibility || 'public'],
  summary: buildCouponSummary(coupon),
  discountLabel: buildCouponDiscountLabel(coupon),
  eligibleSubtotal,
  discountAmount,
  showOnHomepage: Boolean(coupon.showOnHomepage),
})

export const validateCouponForCart = async ({
  coupon,
  userId,
  items = [],
  cartSubtotal,
}) => {
  if (!coupon) return { ok: false, message: 'Mã giảm giá không hợp lệ' }

  const status = computeCouponStatus(coupon)
  if (status === 'upcoming') return { ok: false, message: 'Mã giảm giá chưa đến thời gian áp dụng' }
  if (status === 'expired') return { ok: false, message: 'Mã giảm giá đã hết hạn' }
  if (status === 'paused') return { ok: false, message: 'Mã giảm giá đang tạm dừng' }
  if (status === 'exhausted') return { ok: false, message: 'Mã giảm giá đã hết lượt sử dụng' }

  if (!canUserSeeCoupon(coupon, userId)) {
    return { ok: false, message: 'Mã giảm giá này không dành cho bạn' }
  }

  const userCheck = assertUserCanUseCoupon(coupon, userId)
  if (!userCheck.ok) return userCheck

  const audienceCheck = await assertCouponAudience(coupon, userId)
  if (!audienceCheck.ok) return audienceCheck

  const lines = items.length ? await resolveOrderLines(items) : []
  const eligibleSubtotal =
    lines.length > 0 ? getEligibleSubtotal(coupon, lines) : Math.max(0, Number(cartSubtotal) || 0)

  if (eligibleSubtotal <= 0) {
    return { ok: false, message: 'Không có sản phẩm phù hợp để áp dụng mã này' }
  }

  if (eligibleSubtotal < Number(coupon.minAmount) || 0) {
    return {
      ok: false,
      message: `Đơn hàng tối thiểu ${Number(coupon.minAmount).toLocaleString('vi-VN')}đ để áp dụng mã này.`,
    }
  }

  const discountAmount = computeDiscountAmount(coupon, eligibleSubtotal)
  if (discountAmount <= 0) {
    return { ok: false, message: 'Mã giảm giá không áp dụng được cho đơn hàng này' }
  }

  return {
    ok: true,
    coupon,
    eligibleSubtotal,
    discountAmount,
    finalAmount: Math.max(0, eligibleSubtotal - discountAmount),
  }
}
