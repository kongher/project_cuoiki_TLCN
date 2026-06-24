import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ShopContext } from '../context/ShopContext'
import Title from '../components/Title'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  buildOrderLineKey,
  findOrderItemByProductAndVariant,
  getAdminReplyText,
  getItemReview,
  getOrderLineProductId,
  getOrderLineVariantId,
  isItemReviewed,
} from '../utils/orderReview'
import { parseOrdersFeedbackSearch } from '../utils/notificationRoutes'
import ReviewImageGallery from '../components/ReviewImageGallery'

const Orders = () => {

  const { backendUrl, token, refreshProducts, products, cartItems, updateQuantity, navigate: shopNavigate } = useContext(ShopContext)
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const feedbackDeepLinkHandled = useRef(false)

  const [orderData, setorderData] = useState([])
  const [reviewingItem, setReviewingItem] = useState(null)
  const [reviewModalMode, setReviewModalMode] = useState(null) // 'write' | 'view' | null
  const [viewingReviewItem, setViewingReviewItem] = useState(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [tags, setTags] = useState([])
  const [images, setImages] = useState([])
  const [previewImages, setPreviewImages] = useState([])
  const [adminFeedbackItem, setAdminFeedbackItem] = useState(null)
  const [summary, setSummary] = useState({ average: 0, total: 0, counts: [0, 0, 0, 0, 0] })
  const [rawOrders, setRawOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersLoaded, setOrdersLoaded] = useState(false)
  const [orderDetail, setOrderDetail] = useState(null)
  const [cancelStep, setCancelStep] = useState(null)
  const [cancelSurveyKey, setCancelSurveyKey] = useState('')
  const [cancelOtherText, setCancelOtherText] = useState('')
  const [cancelSubmitting, setCancelSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('all') // all | placed | shipping | done | cancelled
  const [receivedPopup, setReceivedPopup] = useState(null)

  const quickTags = ['Vải đẹp', 'Giao hàng nhanh', 'Đúng size', 'Màu sắc chuẩn']

  const cancelReasonOptions = [
    { key: 'address', label: 'Tôi muốn thay đổi địa chỉ/số điện thoại. (Bạn có thể hỗ trợ sửa thay vì hủy).' },
    { key: 'coupon', label: 'Tôi quên nhập mã giảm giá. (Bạn có thể hỗ trợ áp mã).' },
    { key: 'slow', label: 'Thời gian giao hàng quá lâu.' },
    { key: 'cheaper', label: 'Tôi tìm thấy chỗ khác rẻ hơn.' },
    { key: 'other', label: 'Lý do khác / đổi ý.' }
  ]

  const translateStatus = (status) => {
    switch (status) {
      case "Order Placed":
        return "Chờ xác nhận"
      case "Processing":
        return "Chờ xử lý"
      case "Packing":
        return "Đang đóng gói"
      case "Shipped":
        return "Đã giao cho đơn vị vận chuyển"
      case "Out for delivery":
        return "Đang giao hàng"
      case "Delivered":
        return "Đã giao hàng"
      case "Cancelled":
        return "Đã hủy"
      default:
        return status
    }
  }

  const translateTab = (key) => {
    switch (key) {
      case 'all':
        return 'Tất cả'
      case 'placed':
        return 'Chờ xác nhận'
      case 'shipping':
        return 'Đang giao'
      case 'done':
        return 'Hoàn thành'
      case 'cancelled':
        return 'Đã hủy'
      default:
        return key
    }
  }

  const statusColor = (status) => {
    switch (status) {
      case "Order Placed":
        return "bg-blue-500"
      case "Processing":
        return "bg-amber-500"
      case "Packing":
        return "bg-yellow-500"
      case "Shipped":
        return "bg-purple-500"
      case "Out for delivery":
        return "bg-orange-500"
      case "Delivered":
        return "bg-green-500"
      case "Cancelled":
        return "bg-gray-500"
      default:
        return "bg-gray-400"
    }
  }

  const matchTab = (order) => {
    const st = String(order?.status || '')
    switch (activeTab) {
      case 'placed':
        return ['Order Placed', 'Processing'].includes(st)
      case 'shipping':
        return ['Shipped', 'Out for delivery'].includes(st)
      case 'done':
        return st === 'Delivered'
      case 'cancelled':
        return st === 'Cancelled'
      case 'all':
      default:
        return true
    }
  }

  // hủy đơn hàng
  const canCancelOrder = (order) => {
    if (!order) return false
    return ['Order Placed', 'Processing'].includes(String(order.status))
  }
  // xác nhân đã nhận hàng
  const canConfirmReceived = (order) => {
    if (!order) return false
    return ['Shipped', 'Out for delivery'].includes(String(order.status))
  }

    // nếu chưa đăng nhập reset lại dữ liệu
  const loadOrderData = useCallback(async () => {
    if (!token) {
      setRawOrders([])
      setorderData([])
      setOrdersLoaded(false)
      setOrdersLoading(false)
      return []
    }

    setOrdersLoading(true)
    setOrdersLoaded(false)
    try {
      const response = await axios.post(
        backendUrl + '/api/order/userorders',
        {},
        { headers: { token } }
      )

      if (response.data.success) {
        const orders = [...response.data.orders].reverse()
        setRawOrders(orders)

        const allOrdersItem = []
        orders.forEach((order) => {
          order.items.forEach((item) => {
            allOrdersItem.push({
              ...item,
              status: order.status,
              payment: order.payment,
              paymentMethod: order.paymentMethod,
              date: order.date,
              orderId: order._id,
              productId: getOrderLineProductId(item) || item._id,
              variant_id: getOrderLineVariantId(item),
            })
          })
        })

        setorderData(allOrdersItem)
        setOrdersLoaded(true)
        return orders
      }

      setOrdersLoaded(false)
      return []
    } catch (error) {
      console.log(error)
      setOrdersLoaded(false)
      return []
    } finally {
      setOrdersLoading(false)
    }
  }, [backendUrl, token])

  useEffect(() => {
    loadOrderData()
  }, [loadOrderData])

    // phản hội tự admin
  const showAdminFeedbackModal = useCallback((line) => {
    const review = getItemReview(line)
    const adminReply = getAdminReplyText(line)
    if (!adminReply) return false

    setReviewingItem(null)
    setViewingReviewItem(null)
    setAdminFeedbackItem({
      ...line,
      review: review ? { ...review, adminReply } : { adminReply },
    })
    setReviewModalMode('feedback')
    return true
  }, [])

    // mở phản hội
  const openAdminFeedbackModal = useCallback(
    (item) => {
      if (!showAdminFeedbackModal(item)) {
        toast.info('Chưa có phản hồi từ admin cho sản phẩm này')
      }
    },
    [showAdminFeedbackModal]
  )

  useEffect(() => {
    const { triggerModal, productId, orderId, variantId } = parseOrdersFeedbackSearch(searchParams)

    if (!triggerModal) {
      feedbackDeepLinkHandled.current = false
      return
    }

    if (!token || !productId || !orderId) return
    if (ordersLoading || !ordersLoaded) return
    if (feedbackDeepLinkHandled.current) return

    const order = rawOrders.find((o) => String(o._id) === String(orderId))
    if (!order) {
      feedbackDeepLinkHandled.current = true
      setSearchParams({}, { replace: true })
      toast.error('Không tìm thấy đơn hàng')
      return
    }

    const item = findOrderItemByProductAndVariant(order, productId, variantId)
    if (!item) {
      feedbackDeepLinkHandled.current = true
      setSearchParams({}, { replace: true })
      toast.error('Không tìm thấy sản phẩm trong đơn hàng')
      return
    }

    const line = {
      ...item,
      status: order.status,
      payment: order.payment,
      paymentMethod: order.paymentMethod,
      date: order.date,
      orderId: order._id,
      productId: getOrderLineProductId(item),
      variant_id: getOrderLineVariantId(item),
    }

    const adminReply = getAdminReplyText(line)
    feedbackDeepLinkHandled.current = true
    setSearchParams({}, { replace: true })

    if (!adminReply) {
      toast.info('Chưa có phản hồi từ admin cho sản phẩm này')
      return
    }

    showAdminFeedbackModal(line)
  }, [
    rawOrders,
    searchParams,
    token,
    setSearchParams,
    showAdminFeedbackModal,
    ordersLoading,
    ordersLoaded,
  ])

  useEffect(() => {
    const { triggerModal } = parseOrdersFeedbackSearch(searchParams)
    if (!triggerModal || !token) return

    feedbackDeepLinkHandled.current = false
    loadOrderData()
  }, [
    searchParams.get('trigger_modal'),
    searchParams.get('order_id'),
    searchParams.get('product_id'),
    searchParams.get('variant_id'),
    token,
    loadOrderData,
  ])

    // trạng thái đơn hàng 
  const isReviewEligible = useCallback((item) => {
    return item?.status === 'Delivered'
  }, [])

  useEffect(() => {
    const productId = location.state?.openReviewFor
    if (!productId) return
    if (!orderData.length) return

    const candidate = orderData.find(
      (item) => String(item.productId) === String(productId) && isReviewEligible(item) && !isItemReviewed(item)
    )
    if (candidate) {
      openReviewForm(candidate)
    } else {
      toast.info('Bạn có thể đánh giá sau khi nhận được hàng')
    }

    navigate(location.pathname, { replace: true, state: {} })
  }, [orderData, isReviewEligible, location.pathname, location.state, navigate])

  const openReviewForm = async (item) => {
    setViewingReviewItem(null)
    setReviewModalMode('write')
    setReviewingItem(item)
    setRating(5)
    setComment('')
    setTags([])
    setImages([])
    setPreviewImages([])

    try {
      const response = await axios.post(
        backendUrl + '/api/product/review-summary',
        { productId: item.productId },
        { headers: { token } }
      )
      if (response.data.success) {
        setSummary(response.data.summary)
      }
    } catch (error) {
      console.log(error)
    }
  }

  const toggleTag = (tag) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    )
  }

  const onImagesChange = (event) => {
    const files = Array.from(event.target.files)
    setImages(files)
    setPreviewImages(files.map((file) => URL.createObjectURL(file)))
  }

  const submitReview = async (event) => {
    event.preventDefault()
    if (!reviewingItem) return

    try {
      const formData = new FormData()
      formData.append('orderId', reviewingItem.orderId)
      formData.append('productId', reviewingItem.productId || reviewingItem._id)
      formData.append('variant_id', reviewingItem.variant_id || reviewingItem.size || '')
      formData.append('size', reviewingItem.size || reviewingItem.variant_id || '')
      formData.append('rating', rating)
      formData.append('comment', comment)
      tags.forEach((tag) => formData.append('tags[]', tag))
      images.forEach((image) => formData.append('reviewImages', image))

      const response = await axios.post(
        backendUrl + '/api/order/review',
        formData,
        {
          headers: {
            token,
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      if (response.data.success) {
        toast.success('Cảm ơn bạn! Đánh giá của bạn đã được đăng tải thành công')
        if (typeof refreshProducts === 'function') {
          await refreshProducts()
        }
        await loadOrderData()
        closeReviewForm()
      } else {
        toast.error(response.data.message || 'Đã xảy ra lỗi khi gửi đánh giá')
      }
    } catch (error) {
      console.log(error)
      toast.error('Lỗi hệ thống, vui lòng thử lại sau')
    }
  }

  const openViewReview = (item) => {
    const review = getItemReview(item)
    if (!review) return
    setReviewingItem(null)
    setViewingReviewItem({ ...item, review })
    setReviewModalMode('view')
  }

  const closeReviewForm = () => {
    setReviewingItem(null)
    setViewingReviewItem(null)
    setAdminFeedbackItem(null)
    setReviewModalMode(null)
  }

  const closeOrderDetail = () => {
    setOrderDetail(null)
    setCancelStep(null)
    setCancelSurveyKey('')
    setCancelOtherText('')
  }

  const paidOnline = (order) =>
    (order?.paymentMethod === 'VNPAY' || order?.paymentMethod === 'MOMO') && order?.payment

  const handleBuyAgain = async (order) => {
    if (!order || !Array.isArray(order.items) || order.items.length === 0) return

    let added = 0
    let anyOutOfStock = false

    for (const it of order.items) {
      const productId = it?._id || it?.productId
      const size = it?.size
      const color = it?.color || 'DEFAULT'
      const qty = Number(it?.quantity || 1)
      if (!productId || !size || qty <= 0) continue

      const p = (products || []).find((x) => String(x?._id) === String(productId))
      if (!p) continue

      // check stock if available (variant stockBySize)
      let maxStock = null
      if (Array.isArray(p.variants) && p.variants.length > 0) {
        const v = p.variants.find((vv) => String(vv?.colorName) === String(color))
        const stockBySize = v?.stockBySize && typeof v.stockBySize === 'object' ? v.stockBySize : null
        if (stockBySize && stockBySize[size] !== undefined) {
          maxStock = Number(stockBySize[size])
        }
      }

      if (typeof maxStock === 'number' && maxStock >= 0 && maxStock < 1) {
        anyOutOfStock = true
        continue
      }

      // add with latest cart state
      const existing = Number(cartItems?.[productId]?.[color]?.[size] || 0)
      const nextQty = existing + qty
      if (typeof maxStock === 'number' && maxStock >= 0 && nextQty > maxStock) {
        anyOutOfStock = true
        continue
      }

      await updateQuantity(productId, size, nextQty, color, maxStock)
      added += 1
    }

    if (added > 0) {
      toast.success('Đã thêm sản phẩm vào giỏ hàng')
      shopNavigate('/cart')
      closeOrderDetail()
      return
    }

    if (anyOutOfStock) {
      toast.error('Rất tiếc, sản phẩm/size này hiện đã hết hàng, bạn có muốn chọn mẫu khác tương tự không?')
    } else {
      toast.error('Không thể mua lại đơn này (không tìm thấy sản phẩm trong hệ thống)')
    }
  }

  const submitCancelOrder = async () => {
    if (!orderDetail) return
    const label = cancelReasonOptions.find((o) => o.key === cancelSurveyKey)?.label || ''
    const finalReason = cancelSurveyKey === 'other'
      ? String(cancelOtherText || '').trim()
      : label
    if (!finalReason) {
      toast.error('Vui lòng chọn một lý do')
      return
    }
    setCancelSubmitting(true)
    try {
      const res = await axios.post(
        backendUrl + '/api/order/cancel-user',
        { orderId: orderDetail._id, cancelReason: finalReason },
        { headers: { token } }
      )
      if (res.data.success) {
        toast.success(res.data.message || 'Đã hủy đơn hàng')
        closeOrderDetail()
        await loadOrderData()
      } else {
        toast.error(res.data.message || 'Không hủy được đơn')
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setCancelSubmitting(false)
    }
  }

  const confirmReceivedOrder = async (order) => {
    if (!order) return
    try {
      const res = await axios.post(
        backendUrl + '/api/order/confirm-received',
        { orderId: order._id },
        { headers: { token } }
      )
      if (!res.data.success) {
        toast.error(res.data.message || 'Không thể xác nhận')
        return
      }
      await loadOrderData()
      setOrderDetail(null)
      setReceivedPopup(order)
    } catch (e) {
      toast.error(e.message)
    }
  }

  const orderTabs = useMemo(() => {
    const list = rawOrders || []
    const count = (predicate) => list.filter(predicate).length
    return [
      { key: 'all', count: list.length },
      { key: 'placed', count: count((o) => ['Order Placed', 'Processing'].includes(String(o?.status))) },
      { key: 'shipping', count: count((o) => ['Shipped', 'Out for delivery'].includes(String(o?.status))) },
      { key: 'done', count: count((o) => String(o?.status) === 'Delivered') },
      { key: 'cancelled', count: count((o) => String(o?.status) === 'Cancelled') }
    ]
  }, [rawOrders])

  const filteredRawOrders = useMemo(() => (rawOrders || []).filter(matchTab), [rawOrders, activeTab])

  const formatOrderCode = (id) => String(id || '').slice(-10).toUpperCase()
  const formatOrderDate = (ms) => new Date(Number(ms || Date.now())).toLocaleString('vi-VN')

  const renderStarsReadOnly = (value) => {
    const n = Math.min(5, Math.max(0, Number(value) || 0))
    return (
      <div className='flex items-center gap-0.5 text-lg' aria-label={`${n} sao`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= n ? 'text-yellow-400' : 'text-gray-300'}>
            ★
          </span>
        ))}
      </div>
    )
  }

  const renderRatingBars = () => {
    const stars = [5, 4, 3, 2, 1]
    return stars.map((star) => {
      const count = summary.counts[star - 1] || 0
      const percent = summary.total ? Math.round((count / summary.total) * 100) : 0
      return (
        <div key={star} className='flex items-center gap-3 text-xs'>
          <span className='w-8'>{star} sao</span>
          <div className='w-full h-2 bg-gray-200 rounded-full overflow-hidden'>
            <div className='h-2 bg-yellow-400 rounded-full' style={{ width: `${percent}%` }} />
          </div>
          <span className='w-10 text-right'>{percent}%</span>
        </div>
      )
    })
  }

  return (
    <>
      <div className='border-t pt-16'>
        <div className='mb-6'>
          <div className='text-2xl'>
            <Title text1={'ĐƠN HÀNG'} text2={'CỦA TÔI'} />
          </div>
        </div>

        <div className='mb-5 border-b'>
          <div className='flex flex-wrap gap-2'>
            {orderTabs.map((t) => {
              const isActive = activeTab === t.key
              const badgeClass =
                t.key === 'cancelled'
                  ? (isActive ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700')
                  : t.key === 'done'
                    ? (isActive ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700')
                    : isActive ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'
              return (
                <button
                  key={t.key}
                  type='button'
                  onClick={() => setActiveTab(t.key)}
                  className={`-mb-px px-4 py-2 text-sm font-medium rounded-t transition ${
                    isActive ? 'bg-white border border-b-white border-gray-200 text-black' : 'text-gray-600 hover:text-black'
                  }`}
                >
                  {translateTab(t.key)}
                  <span className={`ml-2 inline-flex items-center justify-center min-w-[18px] h-5 px-2 rounded-full text-[11px] font-bold ${badgeClass}`}>
                    {t.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className='space-y-6'>
          {filteredRawOrders.map((order) => (
            <div key={order._id} className='rounded-xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm'>
              <div className='flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 mb-4'>
                <div>
                  <p className='text-xs text-gray-500'>Mã đơn hàng</p>
                  <p className='text-base font-semibold text-gray-900'>{formatOrderCode(order._id)}</p>
                  <p className='text-xs text-gray-500 mt-1'>{formatOrderDate(order.date)}</p>
                </div>
                <div className='flex items-center gap-2'>
                  <span className={`w-2.5 h-2.5 rounded-full ${statusColor(order.status)}`} />
                  <span
                    className={`text-sm font-medium ${
                      order.status === 'Cancelled' ? 'text-gray-600 line-through decoration-red-400' : ''
                    }`}
                  >
                    {translateStatus(order.status)}
                  </span>
                </div>
              </div>

              {order.items.map((item, index) => {
                const productId = getOrderLineProductId(item)
                const variant_id = getOrderLineVariantId(item)
                const line = {
                  ...item,
                  status: order.status,
                  payment: order.payment,
                  paymentMethod: order.paymentMethod,
                  date: order.date,
                  orderId: order._id,
                  productId,
                  variant_id,
                  lineKey: buildOrderLineKey(order._id, productId, variant_id) || `${order._id}-${index}`,
                }
                return (
                  <div
                    key={line.lineKey}
                    className='py-4 text-gray-700 border-t border-gray-100 first:border-t-0 first:pt-0'
                  >
                    <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
                      <div className='flex items-start gap-6 text-sm'>
                        <button
                          type='button'
                          onClick={() => setOrderDetail(order)}
                          className='shrink-0 rounded-lg overflow-hidden border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black'
                          title='Xem chi tiết đơn hàng'
                        >
                          <img className='w-20 h-20 object-cover' src={item.image?.[0]} alt='' />
                        </button>
                        <div>
                          <p className='text-base font-semibold'>{item.name}</p>
                          <div className='flex flex-wrap items-center gap-4 mt-2 text-sm'>
                            <p className='font-medium'>{item.price.toLocaleString('vi-VN')}đ</p>
                            <p>Số lượng: {item.quantity}</p>
                            <p>Kích thước: {item.size}</p>
                          </div>
                          <p className='text-sm mt-2'>
                            Thanh toán:
                            <span className='text-gray-500 ml-1'>
                              {order.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng' : order.paymentMethod}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className='flex flex-col gap-3 md:items-end md:w-1/3'>
                        {canCancelOrder(order) && (
                          <button
                            type='button'
                            onClick={() => {
                              setOrderDetail(order)
                              setCancelStep('survey')
                              setCancelSurveyKey('')
                              setCancelOtherText('')
                            }}
                            className='border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 rounded hover:bg-red-100'
                          >
                            Hủy đơn
                          </button>
                        )}
                        {canConfirmReceived(order) && (
                          <button
                            type='button'
                            onClick={() => confirmReceivedOrder(order)}
                            className='bg-black text-white px-4 py-2 text-sm rounded hover:bg-red-600 transition'
                          >
                            Đã nhận được hàng
                          </button>
                        )}
                        {isReviewEligible(line) ? (
                          isItemReviewed(line) ? (
                            <button
                              type='button'
                              onClick={() => openViewReview(line)}
                              className='px-4 py-2 text-sm font-medium rounded bg-[#F3F4F6] text-gray-600 transition-all duration-200 ease-in-out hover:text-gray-900 hover:underline'
                            >
                              Xem đánh giá
                            </button>
                          ) : (
                            <button
                              type='button'
                              onClick={() => openReviewForm(line)}
                              className='px-4 py-2 text-sm font-medium rounded text-white bg-[#2563EB] transition-all duration-200 ease-in-out hover:bg-blue-700'
                            >
                              Viết đánh giá
                            </button>
                          )
                        ) : (
                          <p className='text-sm text-gray-500 text-right md:text-left'>
                            Bạn có thể đánh giá sau khi nhận được hàng
                          </p>
                        )}

                        {String(order.status) === 'Delivered' && (
                          <button
                            type='button'
                            onClick={() => handleBuyAgain(order)}
                            className='px-4 py-2 text-sm rounded border hover:bg-gray-50'
                          >
                            Mua lại
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {orderDetail && (
        <div className='fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4'>
          <div className='relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl'>
            <button
              type='button'
              onClick={closeOrderDetail}
              className='absolute right-4 top-4 text-2xl text-gray-400 hover:text-black'
              aria-label='Đóng'
            >
              ×
            </button>
            <h2 className='text-lg font-semibold pr-8'>Chi tiết đơn hàng</h2>
            <p className='text-xs text-gray-500 mt-1'>{String(orderDetail._id)}</p>
            <div className='mt-4 flex items-center gap-2'>
              <span className={`h-2.5 w-2.5 rounded-full ${statusColor(orderDetail.status)}`} />
              <span className={orderDetail.status === 'Cancelled' ? 'text-gray-600' : 'font-medium'}>
                {translateStatus(orderDetail.status)}
              </span>
            </div>
            <div className='mt-4 space-y-3 border-t pt-4'>
              {orderDetail.items.map((it, i) => (
                <div key={i} className='flex gap-3 text-sm'>
                  <img src={it.image?.[0]} alt='' className='h-16 w-16 rounded object-cover border' />
                  <div>
                    <p className='font-medium'>{it.name}</p>
                    <p className='text-gray-600'>
                      SL: {it.quantity} · Size: {it.size}
                      {it.color ? ` · Màu: ${it.color}` : ''}
                    </p>
                    <p>{it.price?.toLocaleString?.('vi-VN')}đ</p>
                  </div>
                </div>
              ))}
            </div>
            {orderDetail.address && (
              <div className='mt-4 border-t pt-4 text-sm text-gray-700'>
                <p className='font-medium text-gray-900'>Giao tới</p>
                <p>{orderDetail.address.fullName}</p>
                <p>{orderDetail.address.phone}</p>
                <p>
                  {orderDetail.address.address}
                  {orderDetail.address.ward ? `, ${orderDetail.address.ward}` : ''}
                  {orderDetail.address.district ? `, ${orderDetail.address.district}` : ''}
                  {orderDetail.address.province ? `, ${orderDetail.address.province}` : ''}
                </p>
              </div>
            )}
            <div className='mt-4 flex justify-between border-t pt-4 text-sm font-semibold'>
              <span>Tổng thanh toán</span>
              <span>{orderDetail.amount?.toLocaleString?.('vi-VN')}đ</span>
            </div>
            <p className='mt-2 text-xs text-gray-500'>
              {orderDetail.paymentMethod === 'COD'
                ? 'Thanh toán khi nhận hàng'
                : `${orderDetail.paymentMethod}${orderDetail.payment ? ' · Đã thanh toán' : ' · Chưa thanh toán'}`}
            </p>

            {(String(orderDetail.status) === 'Cancelled' || String(orderDetail.status) === 'Delivered') && (
              <div className='mt-6 border-t pt-4'>
                <button
                  type='button'
                  onClick={() => handleBuyAgain(orderDetail)}
                  className='w-full rounded bg-blue-600 text-white px-4 py-3 text-sm hover:bg-blue-700 transition-colors'
                >
                  Mua lại
                </button>
              </div>
            )}

            {canCancelOrder(orderDetail) && !cancelStep && (
              <div className='mt-8 border-t pt-4'>
                <button
                  type='button'
                  onClick={() => {
                    setCancelStep('survey')
                    setCancelSurveyKey('')
                  }}
                  className='text-sm text-gray-500 underline decoration-red-300 underline-offset-2 hover:text-red-500'
                >
                  Hủy đơn
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {orderDetail && cancelStep === 'survey' && (
        <div className='fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4'>
          <div className='w-full max-w-md rounded-xl bg-white p-6 shadow-xl'>
            <p className='font-semibold text-gray-900'>Bạn muốn hủy vì lý do gì?</p>
            <p className='mt-1 text-xs text-gray-500'>Chúng tôi có thể hỗ trợ sửa địa chỉ hoặc mã giảm giá thay vì hủy — hãy chọn lý do gần nhất.</p>
            <div className='mt-4 max-h-[50vh] space-y-2 overflow-y-auto'>
              {cancelReasonOptions.map((opt) => (
                <label
                  key={opt.key}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm ${
                    cancelSurveyKey === opt.key ? 'border-black bg-gray-50' : 'border-gray-200'
                  }`}
                >
                  <input
                    type='radio'
                    name='cancel-reason'
                    checked={cancelSurveyKey === opt.key}
                    onChange={() => {
                      setCancelSurveyKey(opt.key)
                      if (opt.key !== 'other') setCancelOtherText('')
                    }}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>

            {cancelSurveyKey === 'other' && (
              <div className='mt-3'>
                <label className='text-sm font-medium text-gray-800'>Lý do khác</label>
                <textarea
                  value={cancelOtherText}
                  onChange={(e) => setCancelOtherText(e.target.value)}
                  className='mt-2 w-full border rounded p-3 min-h-[90px] resize-none outline-none focus:border-black'
                  placeholder='Nhập lý do hủy...'
                />
              </div>
            )}
            <div className='mt-6 flex flex-wrap justify-end gap-2'>
              <button
                type='button'
                onClick={() => {
                  setCancelStep(null)
                  setCancelSurveyKey('')
                }}
                className='rounded border px-4 py-2 text-sm'
              >
                Giữ đơn
              </button>
              <button
                type='button'
                disabled={!cancelSurveyKey || (cancelSurveyKey === 'other' && !String(cancelOtherText || '').trim())}
                onClick={() => setCancelStep('confirm')}
                className='rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:hover:bg-blue-600'
              >
                Tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}

      {orderDetail && cancelStep === 'confirm' && (
        <div className='fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4'>
          <div className='w-full max-w-md rounded-xl bg-white p-6 shadow-xl'>
            <p className='text-base font-semibold text-gray-900'>Bạn chắc chắn muốn hủy đơn hàng này chứ?</p>
            {paidOnline(orderDetail) && (
              <p className='mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900'>
                Bạn đã thanh toán trực tuyến: tiền sẽ được hoàn vào phương thức thanh toán của bạn trong khoảng{' '}
                <strong>3–5 ngày làm việc</strong> (tùy ngân hàng / ví).
              </p>
            )}
            <div className='mt-6 flex flex-wrap justify-end gap-2'>
              <button type='button' onClick={() => setCancelStep('survey')} className='rounded border px-4 py-2 text-sm'>
                Quay lại
              </button>
              <button
                type='button'
                disabled={cancelSubmitting}
                onClick={submitCancelOrder}
                className='rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50'
              >
                {cancelSubmitting ? 'Đang xử lý...' : 'Xác nhận hủy đơn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {receivedPopup && (
        <div className='fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4'>
          <div className='w-full max-w-md rounded-xl bg-white p-6 shadow-xl'>
            <p className='text-lg font-semibold text-emerald-700'>Chúc mừng bạn đã nhận được hàng!</p>
            <p className='mt-2 text-sm text-gray-700'>
              Bạn hãy dành 30 giây để đánh giá sản phẩm giúp shop cải thiện dịch vụ nhé.
            </p>
            <div className='mt-5 flex flex-wrap justify-end gap-2'>
              <button
                type='button'
                onClick={() => setReceivedPopup(null)}
                className='rounded border px-4 py-2 text-sm'
              >
                Để sau
              </button>
              <button
                type='button'
                onClick={() => {
                  const first = receivedPopup.items?.[0]
                  const pid = first?._id || first?.productId
                  setReceivedPopup(null)
                  if (pid) navigate('/orders', { state: { openReviewFor: pid } })
                }}
                className='rounded bg-[#2563EB] px-4 py-2 text-sm text-white transition-all duration-200 ease-in-out hover:bg-blue-700'
              >
                Đánh giá ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewModalMode === 'write' && reviewingItem && (
        <div
          className='fixed inset-0 z-[75] flex items-center justify-center bg-black/50 p-4'
          onClick={closeReviewForm}
          role='presentation'
        >
          <div
            className='relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl'
            onClick={(e) => e.stopPropagation()}
            role='dialog'
            aria-modal='true'
            aria-labelledby='write-review-title'
          >
            <button
              type='button'
              onClick={closeReviewForm}
              className='absolute right-4 top-4 text-2xl text-gray-400 hover:text-black'
              aria-label='Đóng'
            >
              ×
            </button>
            <h2 id='write-review-title' className='text-lg font-semibold pr-8'>
              Viết đánh giá
            </h2>
            <p className='mt-1 text-sm text-gray-600'>
              {reviewingItem.name}
              {reviewingItem.size || reviewingItem.variant_id
                ? ` · Size ${reviewingItem.size || reviewingItem.variant_id}`
                : ''}
            </p>

            <div className='mt-4 flex flex-col sm:flex-row sm:justify-between gap-3 rounded-lg bg-gray-50 p-3'>
              <p className='text-sm text-gray-600'>Cung cấp đánh giá để giúp người khác lựa chọn sản phẩm.</p>
              <div className='text-right shrink-0'>
                <p className='text-2xl font-bold'>{summary.average.toFixed(1)} / 5</p>
                <p className='text-xs text-gray-500'>{summary.total} đánh giá</p>
              </div>
            </div>

            <div className='mt-4 space-y-3'>{renderRatingBars()}</div>

            <form onSubmit={submitReview} className='mt-6 space-y-4'>
              <div>
                <p className='font-medium mb-2'>Chọn số sao</p>
                <div className='flex items-center gap-2 flex-wrap'>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type='button'
                      onClick={() => setRating(star)}
                      className={`px-3 py-2 rounded transition-all duration-200 ease-in-out ${
                        rating === star ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-700 hover:bg-yellow-100'
                      }`}
                    >
                      {star} ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className='font-medium mb-2'>Chọn thẻ nhanh</p>
                <div className='flex flex-wrap gap-2'>
                  {quickTags.map((tag) => (
                    <button
                      key={tag}
                      type='button'
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-2 rounded border transition-all duration-200 ease-in-out ${
                        tags.includes(tag) ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium mb-2' htmlFor='review-comment'>
                  Bình luận
                </label>
                <textarea
                  id='review-comment'
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder='Viết cảm nhận của bạn về sản phẩm...'
                  className='w-full border rounded p-3 min-h-[120px] resize-none outline-none focus:border-[#2563EB]'
                />
              </div>

              <div>
                <label className='block text-sm font-medium mb-2' htmlFor='review-images'>
                  Hình ảnh minh họa (tùy chọn)
                </label>
                <input id='review-images' type='file' multiple accept='image/*' onChange={onImagesChange} />
                {previewImages.length > 0 && (
                  <div className='flex flex-wrap gap-3 mt-3'>
                    {previewImages.map((src, idx) => (
                      <img key={idx} src={src} alt={`preview-${idx}`} className='w-20 h-20 object-cover rounded border' />
                    ))}
                  </div>
                )}
              </div>

              <div className='flex flex-wrap justify-end gap-3 pt-2'>
                <button
                  type='button'
                  onClick={closeReviewForm}
                  className='border px-5 py-2 rounded text-sm transition-all duration-200 ease-in-out hover:bg-gray-50'
                >
                  Đóng
                </button>
                <button
                  type='submit'
                  className='bg-[#2563EB] text-white px-5 py-2 rounded text-sm transition-all duration-200 ease-in-out hover:bg-blue-700'
                >
                  Gửi đánh giá
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reviewModalMode === 'view' && viewingReviewItem?.review && (
        <div
          className='fixed inset-0 z-[75] flex items-center justify-center bg-black/50 p-4'
          onClick={closeReviewForm}
          role='presentation'
        >
          <div
            className='relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl'
            onClick={(e) => e.stopPropagation()}
            role='dialog'
            aria-modal='true'
            aria-labelledby='view-review-title'
          >
            <button
              type='button'
              onClick={closeReviewForm}
              className='absolute right-4 top-4 text-2xl text-gray-400 hover:text-black'
              aria-label='Đóng'
            >
              ×
            </button>
            <h2 id='view-review-title' className='text-lg font-semibold pr-8'>
              Xem đánh giá
            </h2>
            <p className='mt-1 text-sm text-gray-600'>{viewingReviewItem.name}</p>

            <div className='mt-5 space-y-4 text-sm'>
              <div>
                <p className='text-gray-500 mb-1'>Số sao</p>
                {renderStarsReadOnly(viewingReviewItem.review.rating)}
              </div>

              {Array.isArray(viewingReviewItem.review.tags) && viewingReviewItem.review.tags.length > 0 && (
                <div>
                  <p className='text-gray-500 mb-2'>Thẻ</p>
                  <div className='flex flex-wrap gap-2'>
                    {viewingReviewItem.review.tags.filter(Boolean).map((tag) => (
                      <span key={tag} className='rounded-full bg-gray-100 px-3 py-1 text-gray-700'>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className='text-gray-500 mb-1'>Bình luận</p>
                <p className='text-gray-800 whitespace-pre-wrap'>
                  {viewingReviewItem.review.comment || '—'}
                </p>
              </div>

              <div>
                <p className='text-gray-500 mb-1'>Hình ảnh đính kèm</p>
                <ReviewImageGallery images={viewingReviewItem.review.images} thumbClassName='w-20 h-20' />
              </div>

              {viewingReviewItem.review.createdAt && (
                <p className='text-xs text-gray-500'>
                  Đánh giá lúc: {new Date(Number(viewingReviewItem.review.createdAt)).toLocaleString('vi-VN')}
                </p>
              )}

              {viewingReviewItem.review.adminReply && (
                <div className='rounded-lg border border-blue-100 bg-blue-50/50 p-4'>
                  <p className='text-xs font-medium text-blue-800 mb-1'>Phản hồi từ shop</p>
                  <p className='text-gray-800'>{viewingReviewItem.review.adminReply}</p>
                </div>
              )}
            </div>

            <div className='mt-6 flex flex-wrap justify-end gap-3'>
              <button
                type='button'
                onClick={() => {
                  const pid = viewingReviewItem.productId || viewingReviewItem._id
                  closeReviewForm()
                  if (pid) navigate(`/product/${pid}`)
                }}
                className='text-sm text-[#2563EB] underline-offset-2 transition-all duration-200 ease-in-out hover:underline'
              >
                Xem trên trang sản phẩm
              </button>
              <button
                type='button'
                onClick={closeReviewForm}
                className='border px-5 py-2 rounded text-sm transition-all duration-200 ease-in-out hover:bg-gray-50'
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewModalMode === 'feedback' && adminFeedbackItem?.review?.adminReply && (
        <div
          className='fixed inset-0 z-[75] flex items-center justify-center bg-black/50 p-4'
          onClick={closeReviewForm}
          role='presentation'
        >
          <div
            className='relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl'
            onClick={(e) => e.stopPropagation()}
            role='dialog'
            aria-modal='true'
            aria-labelledby='admin-feedback-title'
          >
            <button
              type='button'
              onClick={closeReviewForm}
              className='absolute right-4 top-4 text-2xl text-gray-400 hover:text-black'
              aria-label='Đóng'
            >
              ×
            </button>
            <h2 id='admin-feedback-title' className='text-lg font-semibold pr-8'>
              Phản hồi từ Admin
            </h2>
            <p className='mt-1 text-sm text-gray-600'>{adminFeedbackItem.name}</p>

            <div className='mt-5 space-y-4 text-sm'>
              <div className='rounded-lg border border-gray-100 bg-gray-50 p-4'>
                <p className='text-xs font-medium text-gray-500 mb-2'>Đánh giá của bạn</p>
                {renderStarsReadOnly(adminFeedbackItem.review.rating)}
                <p className='mt-2 text-gray-800 whitespace-pre-wrap'>
                  {adminFeedbackItem.review.comment || '—'}
                </p>
                <ReviewImageGallery images={adminFeedbackItem.review.images} thumbClassName='w-16 h-16' />
              </div>

              <div className='rounded-lg border border-blue-100 bg-blue-50/50 p-4'>
                <div className='flex items-start gap-3 mb-2'>
                  <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-sm font-semibold text-white'>
                    A
                  </div>
                  <div>
                    <p className='font-medium text-blue-900'>Admin</p>
                    <p className='text-xs text-gray-500'>
                      {(adminFeedbackItem.review.adminRepliedAt
                        ? new Date(Number(adminFeedbackItem.review.adminRepliedAt))
                        : new Date()
                      ).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
                <p className='text-gray-800 whitespace-pre-wrap'>{adminFeedbackItem.review.adminReply}</p>
              </div>
            </div>

            <div className='mt-6 flex justify-end'>
              <button
                type='button'
                onClick={closeReviewForm}
                className='border px-5 py-2 rounded text-sm transition-all duration-200 ease-in-out hover:bg-gray-50'
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Orders