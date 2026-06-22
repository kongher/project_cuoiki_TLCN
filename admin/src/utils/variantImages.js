/** Chuyển variant DB → state admin (ảnh + hover) */
export const variantFromApi = (v) => {
  const imageItems = Array.isArray(v?.imageItems) ? v.imageItems : []
  const legacy = Array.isArray(v?.images) ? v.images.filter(Boolean) : []

  const items =
    imageItems.length > 0
      ? imageItems.map((it) => ({
          url: it.url,
          is_main: Boolean(it.is_main),
          is_hover: Boolean(it.is_hover),
          isNew: false,
        }))
      : legacy.map((url, idx) => ({
          url,
          is_main: idx === 0,
          is_hover: false,
          isNew: false,
        }))

  const hoverUrl = items.find((x) => x.is_hover)?.url || String(v?.hoverImageUrl || '').trim()

  return {
    colorCatalogId: String(v?.colorCatalogId || ''),
    colorName: String(v?.colorName || '').trim(),
    colorHex: String(v?.colorHex || '').trim(),
    colorSkuCode: String(v?.colorSkuCode || ''),
    sku: String(v?.sku || '').trim(),
    skuBySize: v?.skuBySize && typeof v.skuBySize === 'object' ? { ...v.skuBySize } : {},
    thumbnailFile: null,
    mainFile: null,
    hoverFile: null,
    gallerySlots: [null, null, null],
    existingThumbnail: v?.thumbnail || '',
    imageItems: items,
    hoverUrl,
    stockBySize: v?.stockBySize && typeof v.stockBySize === 'object' ? { ...v.stockBySize } : {},
  }
}

export const buildImageMetaPayload = (variant) =>
  (variant.imageItems || [])
    .filter((it) => it.url && !it.isNew)
    .map((it) => ({
      url: it.url,
      is_main: Boolean(it.is_main),
      is_hover: Boolean(it.is_hover),
    }))
