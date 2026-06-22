/** Kiểm tra trùng mã SKU giữa các sản phẩm */

export const SKU_DUPLICATE_MESSAGE = 'Mã SKU này đã tồn tại, vui lòng nhập mã khác!'

/** So khớp trùng: cùng chuỗi sau khi trim (QS001-D-28 ≠ QSJ001-D-28) */
export const normalizeSkuKey = (raw) => String(raw || '').trim()

export const cleanSkuBySize = (raw, stockBySize) => {
  const out = {}
  if (!stockBySize || typeof stockBySize !== 'object') return out
  const src = raw && typeof raw === 'object' ? raw : {}
  Object.keys(stockBySize).forEach((sz) => {
    const k = String(sz)
    const v = String(src[k] ?? src[sz] ?? '').trim()
    if (v) out[k] = v
  })
  return out
}

/** Map chuẩn hóa → mã hiển thị (giữ dạng gốc lần đầu gặp) */
export const collectSkuMapFromProduct = (product) => {
  const map = new Map()
  const add = (raw) => {
    const display = String(raw || '').trim()
    const key = normalizeSkuKey(display)
    if (!key || map.has(key)) return
    map.set(key, display)
  }

  const variants = Array.isArray(product?.variants) ? product.variants : []
  for (const v of variants) {
    const skuBySize = v?.skuBySize && typeof v.skuBySize === 'object' ? v.skuBySize : {}
    const sizeSkus = Object.values(skuBySize)
      .map((s) => String(s || '').trim())
      .filter(Boolean)
    if (sizeSkus.length) {
      sizeSkus.forEach(add)
    } else {
      add(v?.sku)
    }
  }
  return map
}

export const collectSkuListFromVariantInputs = (variantsInput) => {
  const list = []
  let internalDuplicate = null

  const push = (raw) => {
    const display = String(raw || '').trim()
    if (!display) return
    const key = normalizeSkuKey(display)
    if (list.some((x) => normalizeSkuKey(x) === key)) {
      internalDuplicate = display
      return
    }
    list.push(display)
  }

  const variants = Array.isArray(variantsInput) ? variantsInput : []
  for (const v of variants) {
    const colorName = String(v?.colorName || '').trim()
    if (!colorName) continue
    const stockBySize = v?.stockBySize && typeof v.stockBySize === 'object' ? v.stockBySize : {}
    const skuBySize = cleanSkuBySize(v?.skuBySize, stockBySize)
    const sizeSkus = Object.values(skuBySize)
      .map((s) => String(s || '').trim())
      .filter(Boolean)

    if (sizeSkus.length) {
      sizeSkus.forEach(push)
    } else {
      push(v?.sku)
    }
  }

  return { list, internalDuplicate }
}

export const skuListToMap = (list) => {
  const map = new Map()
  for (const display of list) {
    const key = normalizeSkuKey(display)
    if (!key || map.has(key)) continue
    map.set(key, display)
  }
  return map
}

/** Trùng trong cùng payload thêm/sửa */
export const findInternalSkuDuplicateInList = (skuList) => {
  const seen = new Set()
  for (const display of skuList) {
    const key = normalizeSkuKey(display)
    if (!key) continue
    if (seen.has(key)) return display
    seen.add(key)
  }
  return null
}

/**
 * @returns {string|null} mã SKU trùng (hiển thị) hoặc null
 */
export const findExistingSkuDuplicate = async (productModel, skuMap, { excludeProductId } = {}) => {
  if (!skuMap?.size) return null

  const filter = excludeProductId ? { _id: { $ne: excludeProductId } } : {}
  const products = await productModel.find(filter).select('variants').lean()

  for (const p of products) {
    const existing = collectSkuMapFromProduct(p)
    for (const key of skuMap.keys()) {
      if (existing.has(key)) {
        return existing.get(key) || skuMap.get(key)
      }
    }
  }
  return null
}

/**
 * @param {object} options
 * @param {string|import('mongoose').Types.ObjectId} [options.excludeProductId] — bỏ qua SKU của SP này khi so CSDL (thêm mới)
 * @param {boolean} [options.skipExternal] — true: chỉ kiểm tra trùng trong payload (dùng khi sửa SP)
 */
export const assertSkusAvailable = async (productModel, variantsInput, options = {}) => {
  const { list: skuList, internalDuplicate } = collectSkuListFromVariantInputs(variantsInput)
  if (!skuList.length) return null

  if (internalDuplicate) {
    return { message: SKU_DUPLICATE_MESSAGE, sku: internalDuplicate }
  }

  if (options.skipExternal) return null

  const incoming = skuListToMap(skuList)
  const external = await findExistingSkuDuplicate(productModel, incoming, options)
  if (external) return { message: SKU_DUPLICATE_MESSAGE, sku: external }

  return null
}
