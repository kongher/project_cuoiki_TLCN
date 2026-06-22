import React from 'react'
import Hero from '../components/Hero'
import LatestCollection from '../components/LatestCollection'
import SpecialSaleMonth from '../components/SpecialSaleMonth'
import BestSeller from '../components/BestSeller'
import OurPolicy from '../components/OurPolicy'
import NewsletterBox from '../components/NewsletterBox'
import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

const Home = () => {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const targetId = location.state?.scrollTo
    if (!targetId) return

    const el = document.getElementById(targetId)
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }

    navigate(location.pathname, { replace: true, state: {} })
  }, [location.state, location.pathname, navigate])

  return (
    <div>
      <Hero />
      <LatestCollection/>
      <SpecialSaleMonth />
      <BestSeller/>
      <OurPolicy/>
      <NewsletterBox/>
    </div>
  )
}

export default Home
