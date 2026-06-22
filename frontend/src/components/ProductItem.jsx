import { useContext, useEffect, useMemo, useState } from 'react'
import { ShopContext } from '../context/ShopContext'
import { Link } from 'react-router-dom'
import { getVariantDisplayUrls } from '../utils/productDisplayImages'

const ProductItem = ({
  id,
  image,
  name,
  price,
  discountPercent = 0,
  salePrice = 0,
  badgeText = '',
  variants = [],
  stockHint = '',
  mainImageUrl = '',
  hoverImageUrl = '',
}) => {
  const { currency } = useContext(ShopContext)

  const variantSlides = useMemo(() => {
    if (!Array.isArray(variants) || variants.length === 0) return []
    const seen = new Set()
    const out = []
    for (const v of variants) {
      const { thumb, main, hover } = getVariantDisplayUrls(v)
      const key = thumb || main
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push({ thumb, main, hover })
    }
    return out
  }, [variants])

  const images = useMemo(() => (Array.isArray(image) ? image.filter(Boolean) : []), [image])
  const thumbs = useMemo(() => {
    if (variantSlides.length > 0) return variantSlides.map((s) => s.thumb)
    const first = mainImageUrl || images[0]
    return first ? [first] : []
  }, [variantSlides, mainImageUrl, images])

  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const slide = useMemo(() => {
    if (variantSlides.length > 0) {
      return variantSlides[activeImageIndex] || variantSlides[0]
    }
    const main = String(mainImageUrl || images[0] || '').trim()
    const hoverRaw = String(hoverImageUrl || '').trim()
    const hover = hoverRaw && hoverRaw !== main ? hoverRaw : ''
    return { thumb: main, main, hover }
  }, [variantSlides, activeImageIndex, mainImageUrl, hoverImageUrl, images])

  const mainSrc = slide?.main || slide?.thumb || ''
  const hoverSrc = slide?.hover && slide.hover !== mainSrc ? slide.hover : ''
  const hasHoverSlide = Boolean(mainSrc && hoverSrc)

  useEffect(() => {
    setActiveImageIndex(0)
  }, [id, thumbs.join('|')])

  const displayPrice =
    discountPercent > 0 ? (salePrice > 0 ? salePrice : Math.round((price * (100 - discountPercent)) / 100)) : price
  const hasSale = discountPercent > 0
  const cornerBadge = badgeText || (hasSale ? `-${discountPercent}%` : '')

  return (
    <Link
      onClick={() => scrollTo(0, 0)}
      className='text-gray-700 cursor-pointer flex flex-col h-full'
      to={`/product/${id}`}
    >
      <div className='relative overflow-hidden aspect-[3/4] bg-gray-50 rounded-md shadow-sm'>
        {!!cornerBadge && (
          <span className='absolute top-2 left-2 z-10 bg-red-600 text-white text-[10px] sm:text-[11px] font-semibold px-2 py-1 rounded'>
            {cornerBadge}
          </span>
        )}
        {!!stockHint && (
          <span className='absolute bottom-2 left-2 z-10 bg-white/95 text-red-700 text-[10px] sm:text-[11px] font-semibold px-2 py-1 rounded border border-red-200 shadow-sm'>
            {stockHint}
          </span>
        )}
        {mainSrc ? (
          hasHoverSlide ? (
            <div className='product-image-hover-slide'>
              <img className='product-img-main' src={mainSrc} alt={name || ''} loading='lazy' />
              <img className='product-img-hover' src={hoverSrc} alt='' aria-hidden='true' loading='lazy' />
            </div>
          ) : (
            <img className='w-full h-full object-cover' src={mainSrc} alt={name || ''} loading='lazy' />
          )
        ) : (
          <div className='w-full h-full flex items-center justify-center text-xs text-gray-400'>Chưa có ảnh</div>
        )}
      </div>

      {thumbs.length > 1 && (
        <div className='mt-2 flex gap-2 flex-wrap'>
          {thumbs.map((src, idx) => {
            const isActive = idx === activeImageIndex
            return (
              <button
                key={`${src}-${idx}`}
                type='button'
                aria-label={`Chọn màu ${idx + 1}`}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setActiveImageIndex(idx)
                }}
                className={`w-7 h-7 rounded border overflow-hidden bg-white transition-all ${
                  isActive ? 'border-black ring-1 ring-black/10' : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <img src={src} alt='' className='w-full h-full object-cover' draggable={false} loading='lazy' />
              </button>
            )
          })}
        </div>
      )}

      <p className='pt-3 pb-1 text-[13px] sm:text-[15px] leading-snug line-clamp-2 min-h-[2.75rem] sm:min-h-[3.25rem] font-medium text-gray-900'>
        {name}
      </p>

      <p className='text-[13px] sm:text-[15px] font-semibold tracking-tight'>
        {displayPrice.toLocaleString('vi-VN')} {currency}
        {hasSale && (
          <span className='ml-2 text-[11px] sm:text-sm text-gray-500 font-normal line-through'>
            {price.toLocaleString('vi-VN')} {currency}
          </span>
        )}
      </p>
    </Link>
  )
}

export default ProductItem
