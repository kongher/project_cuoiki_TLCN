import React, { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Collection from './pages/Collection'
import About from './pages/About'
import Contact from './pages/Contact'
import Product from './pages/Product'
import Cart from './pages/Cart'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Wishlist from './pages/Wishlist'
import PlaceOrder from './pages/PlaceOrder'
import Orders from './pages/Orders'
import Notifications from './pages/Notifications'
import OrderDetail from './pages/OrderDetail'
import Account from './pages/Account'
import Sale from './pages/Sale'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import SearchBar from './components/SearchBar'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Verify from './pages/Verify'
import ScrollToTop from './components/ScrollToTop'

/** Tránh bật/tắt liên tục khi scroll quanh ngưỡng (gây giật header) */
const SCROLL_SHRINK_Y = 56
const SCROLL_EXPAND_Y = 20

const App = () => {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    let scheduled = 0
    const onScroll = () => {
      if (scheduled) return
      scheduled = window.requestAnimationFrame(() => {
        scheduled = 0
        const y = window.scrollY
        setIsScrolled((prev) => {
          if (y >= SCROLL_SHRINK_Y) return true
          if (y <= SCROLL_EXPAND_Y) return false
          return prev
        })
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (scheduled) window.cancelAnimationFrame(scheduled)
    }
  }, [])

  return (
    <div className='font-sans min-h-screen'>
      <ToastContainer />
      <ScrollToTop />
      <header
        className={`sticky top-0 left-0 z-50 w-full min-w-0 bg-white transition-[box-shadow] duration-300 ease-out ${
          isScrolled ? 'shadow-md' : 'shadow-none'
        }`}
      >
        <Navbar compact={isScrolled} />
        <SearchBar />
      </header>
      <div className='px-4 sm:px-[5vw] md:px-[7vw] lg:px-[9vw]'>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/collection' element={<Collection />} />
          <Route path='/sale' element={<Sale />} />
          <Route path='/about' element={<About />} />
          <Route path='/contact' element={<Contact />} />
          <Route path='/product/:productId' element={<Product />} />
          <Route path='/cart' element={<Cart />} />
          <Route path='/login' element={<Login />} />
          <Route path='/forgot-password' element={<ForgotPassword />} />
          <Route path='/register' element={<Register />} />
          <Route path='/wishlist' element={<Wishlist />} />
          <Route path='/account' element={<Account />} />
          <Route path='/place-order' element={<PlaceOrder />} />
          <Route path='/orders' element={<Orders />} />
          <Route path='/account/orders' element={<Orders />} />
          <Route path='/notifications' element={<Notifications />} />
          <Route path='/order-detail' element={<OrderDetail />} />
          <Route path='/profile' element={<Account />} />
          <Route path='/verify' element={<Verify />} />
        </Routes>
        <Footer />
      </div>
    </div>
  )
}

export default App
