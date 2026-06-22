import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ShopContext } from '../context/ShopContext'
import { getBackendUrl } from '../utils/backendUrl'
import { navigateBannerLink } from '../config/bannerDestinations'

const Hero = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { backendUrl: ctxBackendUrl } = useContext(ShopContext)
  const apiBase = useMemo(
    () => getBackendUrl() || ctxBackendUrl || '',
    [ctxBackendUrl]
  )
  const [banners, setBanners] = useState([])
  const [bannerLoadError, setBannerLoadError] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const touchStartX = useRef(null)
  const touchDeltaX = useRef(0)

  useEffect(() => {
    if (!apiBase) {
      setBannerLoadError(true)
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        setBannerLoadError(false)
        const res = await axios.get(`${apiBase}/api/banner/list`, { timeout: 15000 })
        if (cancelled) return
        const list = res.data?.success && Array.isArray(res.data.banners) ? res.data.banners : []
        const withImage = list.filter((b) => String(b?.imageUrl || '').trim())
        if (withImage.length) {
          setBanners(withImage)
          setActiveIndex(0)
        } else {
          setBanners([])
        }
      } catch {
        if (!cancelled) {
          setBanners([])
          setBannerLoadError(true)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [apiBase])

  const slides = useMemo(() => {
    if (!banners.length) return []
    return banners.map((b) => ({
      src: String(b.imageUrl || '').trim(),
      linkUrl: String(b.linkUrl || '').trim(),
      name: String(b.name || '').trim(),
    }))
  }, [banners])

  const goTo = (nextIndex) => {
    const len = slides.length || 1
    const normalized = ((nextIndex % len) + len) % len
    setActiveIndex(normalized)
  }

  const next = () => goTo(activeIndex + 1)
  const prev = () => goTo(activeIndex - 1)

  useEffect(() => {
    if (slides.length <= 1) return
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % slides.length)
    }, 3000)
    return () => clearInterval(id)
  }, [slides.length])

  const activeSlide = slides[activeIndex]
  const activeLink = activeSlide?.linkUrl || ''

  const onBannerAreaClick = () => {
    if (!activeLink) return
    navigateBannerLink(activeLink, {
      navigate,
      pathname: location.pathname,
      locationPathname: location.pathname,
    })
  }

  if (!slides.length) {
    return (
      <div className='w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] mb-6 md:mb-10 min-h-[40vh] flex items-center justify-center bg-gray-100 text-gray-500 text-sm'>
        {bannerLoadError
          ? 'Không tải được banner — kiểm tra backend đang chạy (port 4000)'
          : apiBase
            ? 'Chưa có banner — thêm tại Admin → Cài đặt Giao diện → Quản lý Banner (Trang chủ)'
            : 'Chưa cấu hình VITE_BACKEND_URL trong frontend/.env'}
      </div>
    )
  }

  return (
    <div className='w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] mb-6 md:mb-10'>
      <div
        className={`relative w-full overflow-hidden min-h-[80vh] h-[80vh] ${activeLink ? 'cursor-pointer' : ''}`}
        role={activeLink ? 'button' : undefined}
        tabIndex={activeLink ? 0 : undefined}
        onKeyDown={(e) => {
          if (activeLink && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            onBannerAreaClick()
          }
        }}
        onClick={activeLink ? onBannerAreaClick : undefined}
        onTouchStart={(e) => {
          touchStartX.current = e.touches?.[0]?.clientX ?? null
          touchDeltaX.current = 0
        }}
        onTouchMove={(e) => {
          if (touchStartX.current == null) return
          const x = e.touches?.[0]?.clientX ?? null
          if (x == null) return
          touchDeltaX.current = x - touchStartX.current
        }}
        onTouchEnd={() => {
          const dx = touchDeltaX.current
          touchStartX.current = null
          touchDeltaX.current = 0
          if (Math.abs(dx) < 50) return
          if (dx > 0) prev()
          else next()
        }}
      >
        {slides.map((slide, idx) => (
          <img
            key={`${slide.src}-${idx}`}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 pointer-events-none ${
              idx === activeIndex ? 'opacity-100' : 'opacity-0'
            }`}
            src={slide.src}
            alt={slide.name || 'Banner'}
            draggable={false}
            onError={(e) => {
              e.currentTarget.style.opacity = '0'
            }}
          />
        ))}

        {activeSlide?.name ? (
          <div className='absolute inset-0 z-10 flex items-center pointer-events-none'>
            <div className='max-w-lg pl-4 sm:pl-[5vw] md:pl-[7vw] lg:pl-[9vw] pr-4 py-10 sm:py-12'>
              <h1
                className='font-sans font-medium text-3xl sm:py-3 lg:text-5xl leading-relaxed text-red-500'
                style={{
                  textShadow:
                    '0 1px 2px rgba(255,255,255,0.9), 0 2px 8px rgba(255,255,255,0.5), 0 0 1px rgba(0,0,0,0.15)',
                }}
              >
                {activeSlide.name}
              </h1>
            </div>
          </div>
        ) : null}

        {slides.length > 1 && (
          <div
            className='absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 pointer-events-auto'
            onClick={(e) => e.stopPropagation()}
          >
            {slides.map((_, idx) => (
              <button
                key={idx}
                type='button'
                aria-label={`Banner ${idx + 1}`}
                aria-current={idx === activeIndex ? 'true' : undefined}
                onClick={(e) => {
                  e.stopPropagation()
                  goTo(idx)
                }}
                className={`h-2.5 w-2.5 rounded-full border border-white/80 transition-all ${
                  idx === activeIndex
                    ? 'bg-white scale-110 shadow-sm'
                    : 'bg-white/35 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}

        {slides.length > 1 && (
          <>
            <button
              type='button'
              aria-label='Previous slide'
              onClick={(e) => {
                e.stopPropagation()
                prev()
              }}
              className='absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 bg-black/35 hover:bg-black/50 text-white w-9 h-9 rounded-full flex items-center justify-center transition-colors'
            >
              ‹
            </button>
            <button
              type='button'
              aria-label='Next slide'
              onClick={(e) => {
                e.stopPropagation()
                next()
              }}
              className='absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 bg-black/35 hover:bg-black/50 text-white w-9 h-9 rounded-full flex items-center justify-center transition-colors'
            >
              ›
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default Hero
