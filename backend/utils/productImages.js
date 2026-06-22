import { resolveProductTags } from './productTags.js'

/** Chuẩn hóa metadata ảnh sản phẩm / variant */

export const normalizeImageItems = (rawItems, legacyUrls = []) => {
  if (Array.isArray(rawItems) && rawItems.length > 0) {
    return rawItems
      .map((item) => {
        if (typeof item === 'string') {
          const url = item.trim()
          return url ? { url, is_main: false, is_hover: false } : null
        }
        const url = String(item?.url || '').trim()
        if (!url) return null
        return {
          url,
          is_main: Boolean(item.is_main),
          is_hover: Boolean(item.is_hover),
        }
      })
      .filter(Boolean)
  }

  const urls = (Array.isArray(legacyUrls) ? legacyUrls : []).map((u) => String(u || '').trim()).filter(Boolean)
  return urls.map((url, idx) => ({
    url,
    is_main: idx === 0,
    is_hover: false,
  }))
}

/** Mỗi variant / sản phẩm: tối đa 1 is_main và 1 is_hover */
export const enforceSingleMainAndHover = (items) => {
  const list = Array.isArray(items) ? items.map((x) => ({ ...x })) : []
  if (!list.length) return list

  let mainIdx = list.findIndex((x) => x.is_main)
  if (mainIdx < 0) {
    const nonHover = list.findIndex((x) => !x.is_hover)
    const pick = nonHover >= 0 ? nonHover : 0
    list[pick].is_main = true
    mainIdx = pick
  } else {
    list.forEach((x, i) => {
      x.is_main = i === mainIdx
    })
  }

  let hoverIdx = list.findIndex((x) => x.is_hover)
  if (hoverIdx >= 0) {
    list.forEach((x, i) => {
      x.is_hover = i === hoverIdx
    })
    if (hoverIdx === mainIdx && list.length > 1) {
      const alt = list.findIndex((_, i) => i !== mainIdx && !list[i].is_main)
      list[hoverIdx].is_hover = false
      if (alt >= 0) list[alt].is_hover = true
    }
  } else {
    list.forEach((x) => {
      x.is_hover = false
    })
  }

  return list
}

/** main + gallery (không gồm hover); hoverUrl có thể là file riêng */
export const buildVariantImageItems = (orderedUrls, { hoverUrl = '', thumbnailUrl = '' } = {}) => {
  const gallery = (Array.isArray(orderedUrls) ? orderedUrls : [])
    .map((u) => String(u || '').trim())
    .filter(Boolean)

  const thumb = String(thumbnailUrl || '').trim()
  const mainUrl = gallery[0] || thumb
  const extraGallery = gallery.slice(1)

  const hover = String(hoverUrl || '').trim()
  const baseUrls = [mainUrl, ...extraGallery].filter(Boolean)
  const galleryUrls = hover ? baseUrls.filter((u) => u !== hover) : baseUrls

  let items = galleryUrls.map((url, idx) => ({
    url,
    is_main: idx === 0,
    is_hover: false,
  }))

  if (hover) {
    const idx = items.findIndex((it) => it.url === hover)
    if (idx >= 0) {
      items = items.map((it, i) => ({ ...it, is_hover: i === idx }))
    } else {
      items.push({ url: hover, is_main: false, is_hover: true })
    }
  }

  return enforceSingleMainAndHover(items)
}

export const imageItemsToUrls = (items) =>
  (Array.isArray(items) ? items : []).map((x) => x.url).filter(Boolean)

/** URL hiển thị gallery chi tiết — bỏ ảnh hover */
export const galleryUrlsFromItems = (items) => {
  const list = Array.isArray(items) ? items : []
  if (!list.length) return []
  return list.filter((it) => !it.is_hover).map((it) => it.url).filter(Boolean)
}

export const pickMainAndHoverUrls = (items) => {
  const list = Array.isArray(items) ? items : []
  const main = list.find((x) => x.is_main)?.url || list.find((x) => !x.is_hover)?.url || list[0]?.url || ''
  const hover = list.find((x) => x.is_hover)?.url || ''
  return { mainImageUrl: main, hoverImageUrl: hover }
}

/** Gắn URL hiển thị cho 1 variant (fallback thumbnail) */
export const enrichVariantImages = (variant) => {
  const v = variant || {}
  const thumbnail = String(v.thumbnail || '').trim()
  const items = enforceSingleMainAndHover(normalizeImageItems(v.imageItems, v.images))
  const picks = pickMainAndHoverUrls(items)
  const mainImageUrl = picks.mainImageUrl || thumbnail
  const hoverImageUrl = picks.hoverImageUrl || ''
  const gallery = galleryUrlsFromItems(items)
  const images = gallery.length ? gallery : (mainImageUrl ? [mainImageUrl] : [])

  return {
    ...v,
    thumbnail: thumbnail || mainImageUrl,
    imageItems: items,
    images,
    mainImageUrl,
    hoverImageUrl,
  }
}

/** Gắn mainImageUrl / hoverImageUrl cho API danh sách */
export const serializeProductImages = (product) => {
  const p = product?.toObject ? product.toObject() : { ...product }
  const variants = Array.isArray(p.variants) ? p.variants : []

  const nextVariants = variants.map((v) => enrichVariantImages(v))

  const firstWithMain = nextVariants.find((v) => v.mainImageUrl) || nextVariants[0]
  const productMain = firstWithMain?.mainImageUrl || ''
  const productHover = firstWithMain?.hoverImageUrl || ''

  const productGallery = nextVariants.flatMap((v) => v.images || []).filter(Boolean)
  const legacyImage = Array.isArray(p.image) ? p.image.filter(Boolean) : []
  const image =
    productGallery.length > 0
      ? productGallery
      : legacyImage.length > 0
        ? legacyImage
        : productMain
          ? [productMain]
          : []

  const tags = resolveProductTags(p)

  return {
    ...p,
    tags,
    image,
    productImages: firstWithMain?.imageItems || [],
    mainImageUrl: productMain,
    hoverImageUrl: productHover,
    variants: nextVariants,
  }
}
