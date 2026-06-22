/** Deep link tới trang đơn hàng + mở modal phản hồi admin */
export const buildOrdersAdminFeedbackUrl = ({ orderId, productId, variantId }) => {
  const params = new URLSearchParams({
    trigger_modal: 'true',
    order_id: String(orderId),
    product_id: String(productId),
  })
  if (variantId) params.set('variant_id', String(variantId))
  return `/account/orders?${params.toString()}`
}

export const parseOrdersFeedbackSearch = (searchParams) => {
  const triggerModal =
    searchParams.get('trigger_modal') === 'true' ||
    searchParams.get('open_feedback') === 'true'
  const productId =
    searchParams.get('product_id') ||
    searchParams.get('productId') ||
    ''
  const orderId =
    searchParams.get('order_id') ||
    searchParams.get('orderId') ||
    ''
  const variantId =
    searchParams.get('variant_id') ||
    searchParams.get('variantId') ||
    searchParams.get('size') ||
    ''
  return { triggerModal, productId, orderId, variantId }
}

export const getNotificationOrderProductIds = (notification) => {
  const meta = notification?.meta || {}
  const orderId = meta.order_id || meta.orderId || notification?.referenceId || ''
  const productId = meta.product_id || meta.productId || ''
  const variantId = meta.variant_id || meta.variantId || meta.size || ''
  return {
    orderId: String(orderId),
    productId: String(productId),
    variantId: String(variantId),
  }
}
