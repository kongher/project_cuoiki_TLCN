/** Chuẩn hóa mã gốc SKU (chỉ chữ, số, gạch ngang/gạch dưới) */
export const normalizeParentSku = (raw) =>
  String(raw || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^A-Za-z0-9_-]/g, '')

/** skuBySize: { "28": "QT001-D-28", ... } */
export const buildSkuBySizeMap = (parentSku, colorSkuCode, sizes) => {
  const p = normalizeParentSku(parentSku)
  const c = String(colorSkuCode || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  const out = {}
  if (!p || !c || !Array.isArray(sizes)) return out
  sizes.forEach((sz) => {
    out[String(sz)] = `${p}-${c}-${String(sz)}`
  })
  return out
}
