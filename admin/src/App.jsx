import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import { Routes, Route } from 'react-router-dom'
import Add from './pages/Add'
import List from './pages/List'
import Orders from './pages/Orders'
import ReviewManagement from './pages/ReviewManagement'
import Notifications from './pages/Notifications'
import Edit from './pages/Edit'
import Login from './components/Login'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AddCoupon from './pages/AddCoupon'
import ListCoupon from './pages/ListCoupon'
import Colors from './pages/Colors'
import Customers from './pages/Customers'
import Inventory from './pages/Inventory'
import Dashboard from './pages/Dashboard'
import Banners from './pages/Banners'

export const backendUrl = import.meta.env.VITE_BACKEND_URL
export const currency = 'đ'

const App = () => {

  const [token, setToken] = useState(localStorage.getItem('token')?localStorage.getItem('token'):(''))
  const [pendingReviewCount, setPendingReviewCount] = useState(0)
  const [pendingOrderCount, setPendingOrderCount] = useState(0)
  const [pendingOrders, setPendingOrders] = useState([])
  const [pendingReviews, setPendingReviews] = useState([])
  const previousPendingReviewCount = useRef(0)
  const previousPendingOrderCount = useRef(0)
  const previousTotalCount = useRef(0)

  useEffect(()=>{
    localStorage.setItem('token',token)
  },[token])

  useEffect(() => {
    if (!token) return

    let isActive = true

    const fetchNotifications = async () => {
      try {
        const [reviewsRes, ordersRes] = await Promise.all([
          axios.get(backendUrl + '/api/order/reviews', { headers: { token } }),
          axios.post(backendUrl + '/api/order/list', {}, { headers: { token } })
        ])

        if (!isActive) return

        // Reviews: only count "Chưa phản hồi"
        let nextPendingReviews = []
        if (reviewsRes.data?.success) {
          const list = Array.isArray(reviewsRes.data.reviews) ? reviewsRes.data.reviews : []
          nextPendingReviews = list.filter((r) => !r?.replied)
        }

        // Orders: only count "Chờ xác nhận" (Order Placed)
        let nextPendingOrders = []
        if (ordersRes.data?.success) {
          const orders = Array.isArray(ordersRes.data.orders) ? ordersRes.data.orders : []
          nextPendingOrders = orders.filter((o) => String(o?.status) === 'Order Placed')
        }

        const nextPendingReviewCount = nextPendingReviews.length
        const nextPendingOrderCount = nextPendingOrders.length

        // Toast when increased
        if (nextPendingReviewCount > previousPendingReviewCount.current) {
          const delta = nextPendingReviewCount - previousPendingReviewCount.current
          toast.info(`Có ${delta} đánh giá mới chưa phản hồi`, { autoClose: 3500 })
        }
        if (nextPendingOrderCount > previousPendingOrderCount.current) {
          const delta = nextPendingOrderCount - previousPendingOrderCount.current
          toast.info(`Có ${delta} đơn hàng mới / cần xử lý`, { autoClose: 3500 })
        }

        const nextTotal = nextPendingReviewCount + nextPendingOrderCount
        if (nextTotal > previousTotalCount.current && previousTotalCount.current > 0) {
          // keep a combined signal too (optional, but avoids silent changes)
        }

        previousPendingReviewCount.current = nextPendingReviewCount
        previousPendingOrderCount.current = nextPendingOrderCount
        previousTotalCount.current = nextTotal

        setPendingReviews(nextPendingReviews)
        setPendingOrders(nextPendingOrders)
        setPendingReviewCount(nextPendingReviewCount)
        setPendingOrderCount(nextPendingOrderCount)
      } catch (error) {
        console.log('Notification error:', error)
      }
    }

    fetchNotifications()
    const interval = setInterval(fetchNotifications, 10000)
    return () => {
      isActive = false
      clearInterval(interval)
    }
  }, [token])

  const notificationCount = pendingReviewCount + pendingOrderCount
  const refreshNotificationsNow = async () => {
    // re-run immediately (used by Notifications page)
    if (!token) return
    try {
      const [reviewsRes, ordersRes] = await Promise.all([
        axios.get(backendUrl + '/api/order/reviews', { headers: { token } }),
        axios.post(backendUrl + '/api/order/list', {}, { headers: { token } })
      ])
      const nextReviews = reviewsRes.data?.success
        ? (Array.isArray(reviewsRes.data.reviews) ? reviewsRes.data.reviews.filter((r) => !r?.replied) : [])
        : []
      const nextOrders = ordersRes.data?.success
        ? (Array.isArray(ordersRes.data.orders) ? ordersRes.data.orders.filter((o) => String(o?.status) === 'Order Placed') : [])
        : []
      setPendingReviews(nextReviews)
      setPendingOrders(nextOrders)
      setPendingReviewCount(nextReviews.length)
      setPendingOrderCount(nextOrders.length)
      previousPendingReviewCount.current = nextReviews.length
      previousPendingOrderCount.current = nextOrders.length
      previousTotalCount.current = nextReviews.length + nextOrders.length
    } catch (e) {
      // ignore
    }
  }

  return (
    <div className='font-sans bg-gray-50 min-h-screen'>
      <ToastContainer />
      {token === ""
        ? <Login setToken={setToken} />
        : <>
          <Navbar
            setToken={setToken}
            notificationCount={notificationCount}
            pendingReviewCount={pendingReviewCount}
            pendingOrderCount={pendingOrderCount}
          />
          <hr />
          <div className='flex w-full'>
            <Sidebar pendingReviewCount={pendingReviewCount} pendingOrderCount={pendingOrderCount} />
            <div className='w-[70%] mx-auto ml-[max(5vw,25px)] my-8 text-gray-600 text-base'>
              <Routes>
                <Route path='/add' element={<Add token={token} />} />
                <Route path='/list' element={<List token={token} />} />
                <Route path='/edit/:id' element={<Edit token={token} />} />
                <Route
                  path='/orders'
                  element={
                    <Orders
                      token={token}
                      onStatusChanged={({ orderId, prevStatus, nextStatus }) => {
                        // if it was pending confirmation and moved away, decrement immediately
                        if (String(prevStatus) === 'Order Placed' && String(nextStatus) !== 'Order Placed') {
                          setPendingOrderCount((p) => Math.max(0, Number(p || 0) - 1))
                          setPendingOrders((prev) => (prev || []).filter((o) => String(o?._id) !== String(orderId)))
                        }
                      }}
                    />
                  }
                />
                <Route
                  path='/reviews'
                  element={
                    <ReviewManagement
                      token={token}
                      onReplied={({ orderId, productId, variant_id }) => {
                        setPendingReviewCount((p) => Math.max(0, Number(p || 0) - 1))
                        setPendingReviews((prev) =>
                          (prev || []).filter(
                            (r) =>
                              !(
                                String(r?.orderId) === String(orderId) &&
                                String(r?.productId) === String(productId) &&
                                String(r?.variant_id || r?.size || '') === String(variant_id || '')
                              )
                          )
                        )
                      }}
                    />
                  }
                />
                <Route
                  path='/notifications'
                  element={
                    <Notifications
                      token={token}
                      pendingOrders={pendingOrders}
                      pendingReviews={pendingReviews}
                      refreshNow={refreshNotificationsNow}
                    />
                  }
                />
                <Route path='/add-coupon' element={<AddCoupon token={token} />} />
                <Route path='/list-coupon' element={<ListCoupon token={token} />} />
                <Route path='/colors' element={<Colors token={token} />} />
                <Route path='/customers' element={<Customers token={token} />} />
                <Route path='/inventory' element={<Inventory token={token} />} />
                <Route path='/dashboard' element={<Dashboard token={token} />} />
                <Route path='/banners' element={<Banners token={token} />} />
              </Routes>
            </div>
          </div>
        </>
      }
    </div>
  )
}

export default App