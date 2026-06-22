/** Nhãn marketing sản phẩm — dùng thống nhất admin + shop */
import { tagMatchesCanonical, getProductTagLink, PRODUCT_TAG_DESTINATIONS } from './productTagDestinations.js'

export const TAG_BEST_SELLER = 'scroll:best-sellers'
export const TAG_SUPER_SALE = 'scroll:special-sale-month'
export const TAG_DISCOUNT = 'Giảm %'

/** Các chuỗi có thể có trong DB (value hoặc nhãn cũ) */
export const TAG_SUPER_SALE_ALIASES = [
  TAG_SUPER_SALE,
  'SIÊU SALE TRONG THÁNG',
]
export const TAG_BEST_SELLER_ALIASES = [TAG_BEST_SELLER, 'Sản phẩm bán chạy']

export const SUGGESTED_PRODUCT_TAGS = [TAG_BEST_SELLER, TAG_SUPER_SALE, TAG_DISCOUNT]

const dedupeTags = (arr) => {
  const seen = new Set()
  const out = []
  for (const item of arr) {
    const t = String(item || '').trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

export const parseTagsFromBody = (raw) => {
  if (raw === undefined || raw === null || raw === '') return []
  if (Array.isArray(raw)) return dedupeTags(raw)
  if (typeof raw === 'string') {
    const s = raw.trim()
    if (!s) return []
    try {
      const parsed = JSON.parse(s)
      if (Array.isArray(parsed)) return dedupeTags(parsed)
    } catch {
      /* comma-separated fallback */
    }
    return dedupeTags(s.split(','))
  }
  return []
}

/** Gộp tags DB + cờ legacy (sản phẩm cũ chưa có mảng tags) */
export const resolveProductTags = (doc) => {
  const fromDb = Array.isArray(doc?.tags) ? doc.tags : []
  const tags = dedupeTags(fromDb)
  if (tags.length) return tags

  const legacy = []
  if (doc?.bestseller) legacy.push(TAG_BEST_SELLER)
  if (doc?.isSpecialSale) legacy.push(TAG_SUPER_SALE)
  return legacy
}

export const syncLegacyFlagsFromTags = (tags) => ({
  bestseller: tags.some((t) => tagMatchesCanonical(t, TAG_BEST_SELLER)),
  isSpecialSale: tags.some((t) => tagMatchesCanonical(t, TAG_SUPER_SALE)),
})

const normalizeTagForStorage = (raw) => {
  const link = getProductTagLink(raw)
  if (link) return link
  return String(raw || '').trim()
}

export const applyTagsToDocument = (doc, tags) => {
  const clean = dedupeTags(tags.map(normalizeTagForStorage))
  doc.tags = clean
  const flags = syncLegacyFlagsFromTags(clean)
  doc.bestseller = flags.bestseller
  doc.isSpecialSale = flags.isSpecialSale
  return doc
}

export const addTagToDocument = (doc, tag) => {
  const t = String(tag || '').trim()
  if (!t) return doc
  const current = resolveProductTags(doc)
  if (!current.includes(t)) current.push(t)
  return applyTagsToDocument(doc, current)
}

export const hasProductTag = (doc, tag) =>
  resolveProductTags(doc).some((t) => tagMatchesCanonical(t, tag))

/** Tất cả nhãn không trùng từ DB (+ gợi ý mặc định), kèm cờ legacy */
export const collectDistinctProductTags = async (productModel) => {
  const products = await productModel
    .find({}, { tags: 1, bestseller: 1, isSpecialSale: 1 })
    .lean()

  const set = new Set(SUGGESTED_PRODUCT_TAGS)
  PRODUCT_TAG_DESTINATIONS.forEach((d) => set.add(d.value))
  for (const p of products) {
    resolveProductTags(p).forEach((t) => set.add(normalizeTagForStorage(t)))
  }

  return [...set].sort((a, b) => a.localeCompare(b, 'vi'))
}
