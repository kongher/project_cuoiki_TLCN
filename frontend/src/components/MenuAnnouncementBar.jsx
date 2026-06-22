import { useContext, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ShopContext } from '../context/ShopContext'
import { getBackendUrl } from '../utils/backendUrl'
import { navigateBannerLink } from '../config/bannerDestinations'

const MenuAnnouncementBar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { backendUrl: ctxBackendUrl } = useContext(ShopContext)
  const apiBase = getBackendUrl() || ctxBackendUrl || ''
  const [announcements, setAnnouncements] = useState([])
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (!apiBase) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await axios.get(`${apiBase}/api/banner/menu-announcement`)
        if (!cancelled && res.data?.success) {
          const list = Array.isArray(res.data.announcements)
            ? res.data.announcements
            : res.data.announcement
              ? [res.data.announcement]
              : []
          const filtered = list.filter((a) => String(a?.text || '').trim())
          setAnnouncements(filtered)
          setActiveIndex(0)
        } else if (!cancelled) {
          setAnnouncements([])
          setActiveIndex(0)
        }
      } catch {
        if (!cancelled) {
          setAnnouncements([])
          setActiveIndex(0)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [apiBase])

  useEffect(() => {
    if (announcements.length <= 1) return
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % announcements.length)
    }, 3000)
    return () => window.clearInterval(id)
  }, [announcements.length])

  if (!announcements.length) return null

  const current = announcements[activeIndex] || announcements[0]
  const text = String(current?.text || '').trim()
  const linkUrl = String(current?.linkUrl || '').trim()

  const onClick = () => {
    if (!linkUrl) return
    navigateBannerLink(linkUrl, {
      navigate,
      pathname: location.pathname,
      locationPathname: location.pathname,
    })
  }

  return (
    <div
      role={linkUrl ? 'button' : undefined}
      tabIndex={linkUrl ? 0 : undefined}
      onClick={linkUrl ? onClick : undefined}
      onKeyDown={(e) => {
        if (linkUrl && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
      className={`w-full bg-blue-900 text-white select-none ${linkUrl ? 'cursor-pointer' : ''}`}
    >
      <div className='relative px-4 sm:px-[5vw] md:px-[7vw] lg:px-[9vw] py-3 sm:py-3.5 min-h-[2.75rem] sm:min-h-[3.25rem] flex items-center justify-center text-center text-base md:text-[1.0625rem] font-bold tracking-wide'>
        {announcements.map((item, idx) => (
          <div
            key={item._id || `${item.text}-${idx}`}
            className={`absolute inset-0 flex items-center justify-center px-4 sm:px-[5vw] md:px-[7vw] lg:px-[9vw] transition-opacity duration-500 ${
              idx === activeIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            aria-hidden={idx !== activeIndex}
          >
            {String(item.text || '').trim()}
          </div>
        ))}
      </div>
    </div>
  )
}

export default MenuAnnouncementBar
