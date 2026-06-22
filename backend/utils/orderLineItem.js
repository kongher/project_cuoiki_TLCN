/** Phân loại (size) trên dòng đơn hàng */
export const resolveVariantId = (item, fromBody) => {
  const raw =
    fromBody ??
    item?.variant_id ??
    item?.variantId ??
    item?.size ??
    ''
  return String(raw).trim()
}

export const getOrderLineProductId = (item) => {
  const pid = item?._id ?? item?.productId ?? item?.id ?? item?.product?._id
  return pid != null && pid !== '' ? String(pid) : ''
}

/** Tìm đúng một dòng trong đơn theo product + variant (size) */
export const findOrderLineByProductAndVariant = (order, productId, variantId) => {
  if (!order?.items?.length || !productId) return null

  const pid = String(productId)
  const vid = resolveVariantId(null, variantId)
  const sameProduct = order.items.filter((item) => {
    const actualId = getOrderLineProductId(item)
    return actualId && actualId === pid
  })

  if (sameProduct.length === 0) return null
  if (sameProduct.length === 1) return sameProduct[0]
  if (!vid) return null

  return sameProduct.find((item) => resolveVariantId(item) === vid) || null
}
