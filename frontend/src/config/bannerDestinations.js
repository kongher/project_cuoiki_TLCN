/**
 * Đích điều hướng khi khách bấm banner trang chủ.
 * - scroll:<sectionId> → cuộn tới block trên trang chủ (Home.jsx + scrollTo state)
 * - /path → chuyển route React Router
 */
export const BANNER_DESTINATIONS = [
  { value: '', label: '— Không chuyển hướng khi bấm —', group: 'Chung' },
  {
    value: 'scroll:latest-products',
    label: 'Sản phẩm mới nhất',
    group: 'Trang chủ (cuộn tới mục)',
  },
  {
    value: 'scroll:special-sale-month',
    label: 'SIÊU SALE TRONG THÁNG',
    group: 'Trang chủ (cuộn tới mục)',
  },
  {
    value: 'scroll:best-sellers',
    label: 'Sản phẩm bán chạy',
    group: 'Trang chủ (cuộn tới mục)',
  },
  { value: '/collection', label: 'Tất cả sản phẩm', group: 'Trang danh sách' },
  { value: '/collection?dept=Men', label: 'Bộ sưu tập — Nam', group: 'Trang danh sách' },
  { value: '/collection?dept=Women', label: 'Bộ sưu tập — Nữ', group: 'Trang danh sách' },
  { value: '/collection?dept=Kids', label: 'Bộ sưu tập — Trẻ em', group: 'Trang danh sách' },
  { value: '/sale', label: 'Trang SALE (giảm giá & siêu sale)', group: 'Trang SALE' },
  { value: '/sale?dept=Men', label: 'SALE — Nam', group: 'Trang SALE' },
  { value: '/sale?dept=Women', label: 'SALE — Nữ', group: 'Trang SALE' },
  { value: '/sale?dept=Kids', label: 'SALE — Trẻ em', group: 'Trang SALE' },
  { value: '/about', label: 'Giới thiệu', group: 'Trang khác' },
  { value: '/contact', label: 'Liên hệ', group: 'Trang khác' },
]

export const getBannerDestinationLabel = (linkUrl) => {
  const v = String(linkUrl || '').trim()
  if (!v) return '—'
  const hit = BANNER_DESTINATIONS.find((d) => d.value === v)
  return hit?.label || v
}

export const navigateBannerLink = (linkUrl, { navigate, pathname, locationPathname }) => {
  const link = String(linkUrl || '').trim()
  if (!link) return false

  if (link.startsWith('http://') || link.startsWith('https://')) {
    window.location.href = link
    return true
  }

  if (link.startsWith('#')) {
    const sectionId = link.slice(1)
    const onHome = (locationPathname || pathname) === '/'
    if (onHome) {
      const el = document.getElementById(sectionId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return true
      }
    }
    navigate('/', { state: { scrollTo: sectionId } })
    return true
  }

  if (link.startsWith('scroll:')) {
    const sectionId = link.slice('scroll:'.length)
    const onHome = (locationPathname || pathname) === '/'
    if (onHome) {
      const el = document.getElementById(sectionId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return true
      }
    }
    navigate('/', { state: { scrollTo: sectionId } })
    return true
  }

  navigate(link.startsWith('/') ? link : `/${link}`)
  return true
}
