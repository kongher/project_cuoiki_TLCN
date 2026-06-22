import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const ScrollToTop = () => {
  const location = useLocation()

  useEffect(() => {
    // If we're navigating with an explicit scroll target (internal section),
    // let the destination page handle scrolling.
    if (location.state?.scrollTo) return

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [location.pathname, location.search])

  return null
}

export default ScrollToTop

