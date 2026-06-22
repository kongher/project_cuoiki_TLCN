/** Đồng bộ với frontend/src/config/bannerDestinations.js */
import { BANNER_DESTINATIONS } from './bannerDestinations.js'

/** Các đích có thể gắn làm nhãn (có điều hướng khi khách bấm) */
export const PRODUCT_TAG_DESTINATIONS = BANNER_DESTINATIONS.filter((d) => String(d.value || '').trim())

export const PRODUCT_TAG_DESTINATION_GROUPS = [
  ...new Set(PRODUCT_TAG_DESTINATIONS.map((d) => d.group)),
]

export const getTagDestination = (stored) => {
  const raw = String(stored || '').trim()
  if (!raw) return null
  const byValue = PRODUCT_TAG_DESTINATIONS.find((d) => d.value === raw)
  if (byValue) return byValue
  return PRODUCT_TAG_DESTINATIONS.find((d) => d.label === raw) || null
}

export const getProductTagLabel = (stored) => {
  const hit = getTagDestination(stored)
  return hit?.label || String(stored || '').trim()
}

export const getProductTagLink = (stored) => {
  const hit = getTagDestination(stored)
  return hit?.value || ''
}

/** Chuẩn hóa lưu DB: ưu tiên value đích điều hướng */
export const normalizeProductTagValue = (stored) => {
  const link = getProductTagLink(stored)
  if (link) return link
  return String(stored || '').trim()
}

export const tagValueFromStored = (stored) => normalizeProductTagValue(stored)

export const tagMatchesCanonical = (stored, canonical) => {
  const c = String(canonical || '').trim()
  if (!c) return false
  const raw = String(stored || '').trim()
  if (raw === c) return true
  const dest = getTagDestination(stored)
  if (dest?.value === c) return true
  const canonDest = getTagDestination(c)
  if (canonDest && dest && canonDest.value === dest.value) return true
  if (canonDest && raw === canonDest.label) return true
  return false
}
