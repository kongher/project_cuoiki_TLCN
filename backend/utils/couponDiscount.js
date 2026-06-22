/** Map schema type → API discountType */
export const getDiscountType = (coupon) =>
  String(coupon?.type) === 'amount' ? 'amount' : 'percentage'

/** Nhãn hiển thị (đồng bộ admin) */
export const getDiscountTypeLabel = (coupon) =>
  getDiscountType(coupon) === 'amount' ? 'Số tiền' : 'Phần trăm'

export const getDiscountValue = (coupon) => {
  const type = getDiscountType(coupon)
  if (type === 'amount') return Number(coupon?.amount) || 0
  return Number(coupon?.percent) || 0
}

/** Tính số tiền giảm từ tạm tính đơn hàng */
export const computeDiscountAmount = (coupon, subtotal) => {
  const baseAmount = Number(subtotal) || 0
  if (!coupon || baseAmount <= 0) return 0

  if (getDiscountType(coupon) === 'amount') {
    return Math.min(getDiscountValue(coupon), baseAmount)
  }

  const raw = Math.floor(baseAmount * getDiscountValue(coupon) / 100)
  const maxDiscount = Number(coupon.maxDiscount) || 0
  return maxDiscount > 0 ? Math.min(raw, maxDiscount) : raw
}
