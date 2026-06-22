import productModel from '../models/productModel.js'
import { logInventoryHistory } from '../services/inventoryHistory.js'

const norm = (s) => String(s || '').trim().toLowerCase()

export const findVariantForLine = (product, color) => {
  const variants = Array.isArray(product?.variants) ? product.variants : []
  if (!variants.length) return null
  const c = norm(color || 'DEFAULT')
  let variant = variants.find((v) => norm(v?.colorName) === c)
  if (!variant && c === 'default' && variants.length === 1) variant = variants[0]
  if (!variant) variant = variants[0]
  return variant
}

export const getSkuForLine = (product, variant, size) => {
  const sz = String(size || '').trim()
  const fromMap = sz && variant?.skuBySize?.[sz]
  if (fromMap) return String(fromMap).trim()
  if (variant?.sku && !sz) return String(variant.sku).trim()
  const parent = String(product?.parentSku || '').trim()
  const colorCode = String(variant?.colorSkuCode || '').trim()
  const colorSlug = colorCode || String(variant?.colorName || 'DEF').replace(/\s+/g, '').slice(0, 12)
  if (parent && colorCode && sz) return `${parent}-${colorCode}-${sz}`
  if (parent && sz) return `${parent}-${colorSlug}-${sz}`
  if (sz) return `${parent || String(product?._id || '')}-${colorSlug}-${sz}`
  return parent || String(variant?.sku || product?._id || '')
}

export const inventoryRowKey = (productId, colorName, size) =>
  `${String(productId)}|${String(colorName || '').trim()}|${String(size || '').trim()}`

export const readStock = (variant, size) => {
  const map = variant?.stockBySize
  if (!map || typeof map !== 'object') return 0
  const s = String(size)
  const key = Object.keys(map).find((k) => k === s || norm(k) === norm(s))
  if (key === undefined) return 0
  const n = Number(map[key])
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
}

export const setStockOnVariant = (variant, size, qty) => {
  const map = { ...(variant.stockBySize || {}) }
  const s = String(size)
  const key = Object.keys(map).find((k) => k === s) || s
  map[key] = Math.max(0, Math.floor(Number(qty) || 0))
  variant.stockBySize = map
}

/** Ghi nhập kho ban đầu khi tạo sản phẩm mới */
export const logInitialProductInventory = async (product, performedBy = 'Admin') => {
  const variants = Array.isArray(product?.variants) ? product.variants : []
  const productId = String(product?._id || '')
  const productName = String(product?.name || '').trim()

  for (const variant of variants) {
    const stockBySize =
      variant?.stockBySize && typeof variant.stockBySize === 'object' ? variant.stockBySize : {}
    const colorName = String(variant?.colorName || '').trim()

    for (const size of Object.keys(stockBySize)) {
      const qty = Math.floor(Number(stockBySize[size]) || 0)
      if (qty <= 0) continue

      const sizeStr = String(size).trim()
      const sku = getSkuForLine(product, variant, sizeStr)
      try {
        await logInventoryHistory({
          sku,
          productId,
          productName,
          colorName,
          size: sizeStr,
          type: 'IMPORT',
          quantity: qty,
          note: 'Nhập kho khi tạo sản phẩm',
          performedBy,
        })
      } catch {
        /* ignore log errors */
      }
    }
  }
}

/** Danh sách phẳng SKU cho admin */
export const flattenInventoryRows = (products) => {
  const rows = []
  for (const p of products) {
    const variants = Array.isArray(p.variants) ? p.variants : []
    if (!variants.length) continue
    for (const v of variants) {
      const colorName = String(v?.colorName || '').trim() || '—'
      const stockBySize = v?.stockBySize && typeof v.stockBySize === 'object' ? v.stockBySize : {}
      const sizes = Object.keys(stockBySize)
      if (!sizes.length) {
        rows.push({
          productId: String(p._id),
          productName: p.name,
          colorName,
          size: '—',
          sku: getSkuForLine(p, v, ''),
          quantity: 0,
          variantIndex: variants.indexOf(v),
          rowKey: inventoryRowKey(p._id, colorName, '—'),
        })
        continue
      }
      const variantIndex = variants.indexOf(v)
      for (const size of sizes) {
        const sizeStr = String(size)
        rows.push({
          productId: String(p._id),
          productName: p.name,
          colorName,
          size: sizeStr,
          sku: getSkuForLine(p, v, sizeStr),
          quantity: readStock(v, sizeStr),
          variantIndex,
          rowKey: inventoryRowKey(p._id, colorName, sizeStr),
        })
      }
    }
  }
  return rows
}

/** Kiểm tra đủ tồn (không ghi DB) */
export const checkStockForOrderItems = async (items) => {
  const errors = []
  const productCache = new Map()

  for (const item of items || []) {
    const productId = String(item?._id || item?.productId || '')
    const size = String(item?.size || '')
    const color = String(item?.color || 'DEFAULT')
    const qty = Math.max(1, Math.floor(Number(item?.quantity) || 1))
    if (!productId || !size) continue

    let product = productCache.get(productId)
    if (!product) {
      product = await productModel.findById(productId).lean()
      if (!product) {
        errors.push(`Không tìm thấy sản phẩm`)
        continue
      }
      productCache.set(productId, product)
    }

    const variant = findVariantForLine(product, color)
    if (!variant) {
      errors.push(`Không tìm thấy biến thể màu`)
      continue
    }
    const current = readStock(variant, size)
    if (current < qty) {
      errors.push(
        `Không đủ hàng: ${product.name} — ${variant.colorName || color} — size ${size} (còn ${current})`
      )
    }
  }

  return { ok: errors.length === 0, errors }
}

export const adjustStockForOrderItems = async (items, direction = -1, options = {}) => {
  const { orderId = '', performedBy = 'Hệ thống' } = options
  const errors = []
  const productCache = new Map()

  for (const item of items || []) {
    const productId = String(item?._id || item?.productId || '')
    const size = String(item?.size || '')
    const color = String(item?.color || 'DEFAULT')
    const qty = Math.max(1, Math.floor(Number(item?.quantity) || 1))
    if (!productId || !size) continue

    let product = productCache.get(productId)
    if (!product) {
      product = await productModel.findById(productId)
      if (!product) {
        errors.push(`Không tìm thấy sản phẩm ${productId}`)
        continue
      }
      productCache.set(productId, product)
    }

    const variants = Array.isArray(product.variants) ? [...product.variants] : []
    const vIdx = variants.findIndex((v) => norm(v?.colorName) === norm(color))
    if (vIdx < 0) {
      errors.push(`Không tìm thấy biến thể: ${product.name} / ${color}`)
      continue
    }
    const useIdx = vIdx
    const variant = { ...(variants[useIdx] || {}) }
    const current = readStock(variant, size)
    const delta = direction < 0 ? -qty : qty
    const next = current + delta
    if (next < 0) {
      errors.push(`Không đủ tồn kho: ${product.name} / ${variant.colorName || color} / ${size}`)
      continue
    }
    setStockOnVariant(variant, size, next)
    variants[useIdx] = variant
    product.variants = variants
    product.markModified('variants')
    await product.save()

    const sku = getSkuForLine(product, variant, size)
    const logType = direction < 0 ? 'SALE' : 'RESTORE'
    const unitPrice = Math.max(0, Number(item?.unitPrice ?? item?.price) || 0)
    try {
      await logInventoryHistory({
        sku,
        productId,
        productName: product.name,
        colorName: String(variant.colorName || color).trim(),
        size,
        type: logType,
        quantity: direction < 0 ? -qty : qty,
        performedBy,
        orderId: String(orderId || '').trim(),
        unitPrice,
        note: logType === 'SALE' ? 'Đơn hàng' : 'Hoàn kho đơn hủy',
      })
    } catch {
      /* không chặn luồng đặt hàng nếu ghi log lỗi */
    }
  }

  return { ok: errors.length === 0, errors }
}
