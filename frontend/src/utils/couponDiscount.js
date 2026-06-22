export const isAmountCoupon = (coupon) => {
  if (!coupon) return false
  if (coupon.type === 'Số tiền' || coupon.typeLabel === 'Số tiền') return true
  if (coupon.discountType === 'amount' || coupon.discountType === 'fixed') return true
  if (coupon.type === 'amount') return true
  return false
}

export const isPercentCoupon = (coupon) => {
  if (!coupon) return false
  if (coupon.type === 'Phần trăm' || coupon.typeLabel === 'Phần trăm') return true
  if (coupon.discountType === 'percentage' || coupon.discountType === 'percent') return true
  if (coupon.type === 'percent') return true
  return !isAmountCoupon(coupon) && Boolean(coupon?.percent)
}

export const getCouponDiscountType = (coupon) => {
  if (!coupon) return null
  if (isAmountCoupon(coupon)) return 'amount'
  return 'percentage'
}

export const getCouponDiscountValue = (coupon) => {
  if (!coupon) return 0
  if (coupon.discountValue != null) return Number(coupon.discountValue) || 0
  const type = getCouponDiscountType(coupon)
  return type === 'amount' ? Number(coupon.amount) || 0 : Number(coupon.percent) || 0
}

export const computeCouponDiscount = (coupon, subtotal) => {
  const base = Number(subtotal) || 0
  if (!coupon || base <= 0) return 0

  const type = getCouponDiscountType(coupon)
  if (type === 'amount') {
    return Math.min(getCouponDiscountValue(coupon), base)
  }

  const raw = Math.floor(base * getCouponDiscountValue(coupon) / 100)
  const maxDiscount = Number(coupon.maxDiscount) || 0
  return maxDiscount > 0 ? Math.min(raw, maxDiscount) : raw
}

export const formatCouponAppliedMessage = (coupon, discountAmount, currency = 'đ') => {
  if (!coupon?.code) return ''
  const value = Number(coupon.value ?? coupon.discountValue ?? getCouponDiscountValue(coupon)) || 0
  const saved = Number(discountAmount) || 0

  if (isAmountCoupon(coupon)) {
    const display = value > 0 ? value : saved
    return `Mã ${coupon.code} đã áp dụng. Giảm ${display.toLocaleString('vi-VN')}${currency}`
  }
  const maxPart =
    Number(coupon.maxDiscount) > 0
      ? ` (tối đa ${Number(coupon.maxDiscount).toLocaleString('vi-VN')}${currency})`
      : ''
  return `Mã ${coupon.code} đã áp dụng. Giảm ${value}%${maxPart}`
}
