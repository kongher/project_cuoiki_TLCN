import {
  getProductTagLabel,
  getProductTagLink,
  tagMatchesCanonical,
  tagValueFromStored,
  PRODUCT_TAG_DESTINATIONS,
} from './productTagDestinations.js'

export {
  getProductTagLabel,
  getProductTagLink,
  tagMatchesCanonical,
  tagValueFromStored,
  PRODUCT_TAG_DESTINATIONS,
}

export const TAG_BEST_SELLER = 'scroll:best-sellers'
export const TAG_SUPER_SALE = 'scroll:special-sale-month'
export const TAG_DISCOUNT = 'Giảm %'

export const resolveProductTags = (product) => {
  const fromDb = Array.isArray(product?.tags) ? product.tags : []
  const tags = [...new Set(fromDb.map((t) => String(t || '').trim()).filter(Boolean))]
  if (tags.length) return tags
  const legacy = []
  if (product?.bestseller) legacy.push(TAG_BEST_SELLER)
  if (product?.isSpecialSale) legacy.push(TAG_SUPER_SALE)
  return legacy
}

export const hasProductTag = (product, tag) =>
  resolveProductTags(product).some((t) => tagMatchesCanonical(t, tag))
