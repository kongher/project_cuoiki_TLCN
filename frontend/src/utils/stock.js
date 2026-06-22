/** Tồn kho theo size của một biến thể màu (không âm). */
export function rawStockQty(variant, sizeKey) {
  if (!variant?.stockBySize || sizeKey === undefined || sizeKey === null) return 0
  const v = variant.stockBySize[String(sizeKey)]
  if (v === undefined || v === null) return 0
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.floor(n))
}

const norm = (s) => String(s || '').trim().toLowerCase()

function readSizeStock(variant, size) {
  const map = variant?.stockBySize
  if (!map || typeof map !== 'object') return null
  const s = String(size)
  const key = Object.keys(map).find((k) => k === s || norm(k) === norm(s))
  if (key === undefined) return null
  return rawStockQty(variant, key)
}

function findVariantByColor(variants, color) {
  const c = norm(color || 'DEFAULT')
  const exact = variants.find((v) => norm(v?.colorName) === c)
  if (exact) return exact
  if (c === 'default' && variants.length === 1) return variants[0]
  return null
}

/**
 * Tồn kho tối đa cho một dòng giỏ (product + màu + size).
 * Trả về null nếu sản phẩm không có variants/stockBySize.
 */
export function getProductSizeStock(product, color, size) {
  if (!product || !size) return null
  const variants = Array.isArray(product.variants) ? product.variants : []
  if (!variants.length) return null

  let variant = findVariantByColor(variants, color)
  if (!variant) {
    variant = variants.find((v) => readSizeStock(v, size) !== null) || null
  }
  if (!variant) return null

  return readSizeStock(variant, size)
}

/** Thông báo khi khách tăng vượt tồn kho trên giỏ hàng. */
export function getStockLimitMessage(requestedQty, maxStock) {
  if (typeof maxStock !== 'number' || maxStock < 0) return null
  if (!Number.isFinite(requestedQty) || requestedQty <= maxStock) return null
  if (maxStock === 1) return 'sản phẩm này chỉ còn 1'
  return 'bạn đã tăng quá số lượng hiện có'
}
