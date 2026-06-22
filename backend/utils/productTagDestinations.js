/** Đồng bộ với frontend bannerDestinations — chỉ dùng cho so khớp nhãn */
export const PRODUCT_TAG_DESTINATIONS = [
  { value: 'scroll:latest-products', label: 'Sản phẩm mới nhất' },
  { value: 'scroll:special-sale-month', label: 'SIÊU SALE TRONG THÁNG' },
  { value: 'scroll:best-sellers', label: 'Sản phẩm bán chạy' },
  { value: '/collection', label: 'Tất cả sản phẩm' },
  { value: '/collection?dept=Men', label: 'Bộ sưu tập — Nam' },
  { value: '/collection?dept=Women', label: 'Bộ sưu tập — Nữ' },
  { value: '/collection?dept=Kids', label: 'Bộ sưu tập — Trẻ em' },
  { value: '/sale', label: 'Trang SALE (giảm giá & siêu sale)' },
  { value: '/sale?dept=Men', label: 'SALE — Nam' },
  { value: '/sale?dept=Women', label: 'SALE — Nữ' },
  { value: '/sale?dept=Kids', label: 'SALE — Trẻ em' },
  { value: '/about', label: 'Giới thiệu' },
  { value: '/contact', label: 'Liên hệ' },
]

const destByValue = new Map(PRODUCT_TAG_DESTINATIONS.map((d) => [d.value, d]))
const destByLabel = new Map(PRODUCT_TAG_DESTINATIONS.map((d) => [d.label, d]))

export const getTagDestination = (stored) => {
  const raw = String(stored || '').trim()
  if (!raw) return null
  return destByValue.get(raw) || destByLabel.get(raw) || null
}

export const getProductTagLink = (stored) => getTagDestination(stored)?.value || ''

export const tagMatchesCanonical = (stored, canonical) => {
  const c = String(canonical || '').trim()
  if (!c) return false
  const raw = String(stored || '').trim()
  if (raw === c) return true
  const d1 = getTagDestination(stored)
  const d2 = getTagDestination(c)
  if (d1 && d2 && d1.value === d2.value) return true
  if (d2 && raw === d2.label) return true
  return false
}
