/** URL hiển thị ảnh SP (danh sách / card) — fallback thumbnail, imageItems */
export function getVariantDisplayUrls(variant) {
  const v = variant || {}
  const thumbnail = String(v.thumbnail || '').trim()
  const items = Array.isArray(v.imageItems) ? v.imageItems : []

  const mainFromItems = items.find((it) => it.is_main)?.url || items.find((it) => !it.is_hover)?.url || ''
  const hoverFromItems = items.find((it) => it.is_hover)?.url || ''
  const legacy = (Array.isArray(v.images) ? v.images : []).map((u) => String(u || '').trim()).filter(Boolean)
  const hoverUrl = String(v.hoverImageUrl || hoverFromItems || '').trim()
  const legacyNoHover = hoverUrl ? legacy.filter((u) => u !== hoverUrl) : legacy

  const main = String(v.mainImageUrl || mainFromItems || legacyNoHover[0] || legacy[0] || thumbnail || '').trim()
  const hover = hoverUrl && hoverUrl !== main ? hoverUrl : ''
  const thumb = thumbnail || main

  return { thumb, main, hover }
}

export function getProductListSlide(product, activeVariantIndex = 0) {
  const variants = Array.isArray(product?.variants) ? product.variants : []
  if (variants.length > 0) {
    const slides = []
    const seen = new Set()
    for (const v of variants) {
      const { thumb, main, hover } = getVariantDisplayUrls(v)
      const key = thumb || main
      if (!key || seen.has(key)) continue
      seen.add(key)
      slides.push({ thumb, main, hover })
    }
    if (slides.length) return slides[activeVariantIndex] || slides[0]
  }

  const image = Array.isArray(product?.image) ? product.image.filter(Boolean) : []
  const main = String(product?.mainImageUrl || image[0] || '').trim()
  const hoverRaw = String(product?.hoverImageUrl || '').trim()
  const hover = hoverRaw && hoverRaw !== main ? hoverRaw : ''
  return { thumb: main, main, hover }
}
