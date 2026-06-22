/** @returns {boolean} Sản phẩm trong đơn đã được đánh giá */
export const isItemReviewed = (item) => {
  if (!item) return false
  const flag = item.is_reviewed
  if (flag === true || flag === 1 || flag === '1') return true
  if (flag === false || flag === 0 || flag === '0') return false
  return Boolean(item.review)
}

export const getItemReview = (item) => {
  if (!item?.review || typeof item.review !== 'object') return null
  return item.review
}

/** ID sản phẩm trên dòng đơn hàng (snapshot lúc mua) */
export const getOrderLineProductId = (item) => {
  const pid = item?._id ?? item?.productId ?? item?.id ?? item?.product?._id
  return pid != null && pid !== '' ? String(pid) : ''
}

/** Phân loại (size) trên dòng đơn */
export const getOrderLineVariantId = (item) => {
  const raw = item?.variant_id ?? item?.variantId ?? item?.size ?? ''
  return raw != null && raw !== '' ? String(raw) : ''
}

export const productIdsMatch = (left, right) => {
  if (left == null || right == null || left === '' || right === '') return false
  return String(left) === String(right)
}

export const variantIdsMatch = (left, right) => {
  if (left == null || right == null || left === '' || right === '') return false
  return String(left) === String(right)
}

export const buildOrderLineKey = (orderId, productId, variantId) =>
  `${String(orderId)}|${String(productId)}|${String(variantId)}`

export const findOrderItemByProductId = (order, productId) => {
  if (!order?.items?.length || !productId) return null
  return (
    order.items.find((it) => productIdsMatch(getOrderLineProductId(it), productId)) || null
  )
}

export const findOrderItemByProductAndVariant = (order, productId, variantId) => {
  if (!order?.items?.length || !productId) return null

  const pid = String(productId)
  const vid = String(variantId ?? '').trim()
  const sameProduct = order.items.filter((it) => productIdsMatch(getOrderLineProductId(it), pid))

  if (sameProduct.length === 0) return null
  if (sameProduct.length === 1) return sameProduct[0]
  if (!vid) return null

  return sameProduct.find((it) => variantIdsMatch(getOrderLineVariantId(it), vid)) || null
}

/** Nội dung phản hồi admin trên dòng đơn */
export const getAdminReplyText = (item) => {
  const review = getItemReview(item)
  const raw = review?.adminReply ?? review?.admin_reply ?? item?.adminReply ?? ''
  return typeof raw === 'string' ? raw.trim() : ''
}
