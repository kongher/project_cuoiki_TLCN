import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ShopContext } from '../context/ShopContext';
import { assets } from '../assets/assets';
import RelatedProducts from '../components/RelatedProducts'
import ReviewImageGallery from '../components/ReviewImageGallery';
import ProductBreadcrumb from '../components/ProductBreadcrumb';
import ProductTagLinks from '../components/ProductTagLinks';
import axios from 'axios'
import { toast } from 'react-toastify'

/** Số tồn theo size (biến thể), không âm */
function rawStockQty(variant, sizeKey) {
  if (!variant?.stockBySize || sizeKey === undefined || sizeKey === null) return 0
  const v = variant.stockBySize[String(sizeKey)]
  if (v === undefined || v === null) return 0
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.floor(n))
}

function variantFullyOutOfStock(variant, sizes) {
  if (!variant || !Array.isArray(sizes) || sizes.length === 0) return false
  return sizes.every((sz) => rawStockQty(variant, sz) <= 0)
}

const Product = () => {

  const { productId } = useParams();
  const { products, currency, addToCart, backendUrl, token, navigate } = useContext(ShopContext);
  const [productData, setProductData] = useState(false);
  const [image, setImage] = useState('')
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [selectedColorName, setSelectedColorName] = useState('')
  const [size, setSize] = useState('')
  const [hoveredSize, setHoveredSize] = useState('')
  const [oosHoverSize, setOosHoverSize] = useState(null)
  const [oosClickTip, setOosClickTip] = useState(false)
  const [zoomOrigin, setZoomOrigin] = useState({ x: '50%', y: '50%' });
  const [isZoomed, setIsZoomed] = useState(false);
  const [purchaseState, setPurchaseState] = useState({ loading: false, eligible: false, inProgress: false })
  const [activeTab, setActiveTab] = useState('desc') // 'desc' | 'reviews'
  const [isImageTransitioning, setIsImageTransitioning] = useState(false)
  const reviewsSectionRef = useRef(null)

  const scrollToReviews = () => {
    setActiveTab('reviews')
    window.setTimeout(() => {
      reviewsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  const handleMouseMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin({ x: `${x}%`, y: `${y}%` });
  }
// Lấy thông tin sản phẩm từ API, ưu tiên cache nếu có
// sau đó cập nhật lại từ API để đảm bảo dữ liệu mới nhất

  const fetchProductData = async () => {
    if (!backendUrl || !productId) return
    try {
      const response = await axios.post(backendUrl + '/api/product/single', { productId })
      if (response.data.success && response.data.product) {
        setProductData(response.data.product)
        setImage((prev) => prev || response.data.product.image?.[0] || '')
      }
    } catch (e) {
      // Không cần hiển thị lỗi nếu fetch thất bại, giữ nguyên dữ liệu cũ nếu có
    }
  }

  useEffect(() => {
    // Nếu đã có sản phẩm trong cache, hiển thị ngay để không phải chờ, sau đó vẫn fetch lại để cập nhật dữ liệu mới nhất
    if (products.length > 0) {
      const found = products.find((item) => item._id === productId)
      if (found) {
        setProductData(found)
        setImage(found.image?.[0] || '')
        setActiveImageIndex(0)
      }
    }
    fetchProductData()
    
  }, [productId])

  const variants = useMemo(() => {
    const arr = Array.isArray(productData?.variants) ? productData.variants : []
    return arr
      .map((v) => ({
        colorName: String(v?.colorName || '').trim(),
        sku: String(v?.sku || '').trim(),
        skuBySize: v?.skuBySize && typeof v.skuBySize === 'object' ? v.skuBySize : {},
        thumbnail: v?.thumbnail || '',
        images: Array.isArray(v?.images) ? v.images.filter(Boolean) : [],
        imageItems: Array.isArray(v?.imageItems) ? v.imageItems : [],
        hoverImageUrl: String(v?.hoverImageUrl || '').trim(),
        mainImageUrl: String(v?.mainImageUrl || '').trim(),
        stockBySize: v?.stockBySize && typeof v.stockBySize === 'object' ? v.stockBySize : {}
      }))
      .filter((v) => v.colorName)
  }, [productData])

  const selectedVariant = useMemo(() => {
    if (!variants.length) return null
    const byName = variants.find((v) => String(v.colorName) === String(selectedColorName))
    return byName || variants[0] || null
  }, [variants, selectedColorName])

  useEffect(() => {
    setOosClickTip(false)
    setOosHoverSize(null)
  }, [selectedColorName, productId])

  const displaySku = useMemo(() => {
    if (!selectedVariant) return ''
    if (size && selectedVariant.skuBySize?.[size]) return String(selectedVariant.skuBySize[size]).trim()
    return selectedVariant.sku || ''
  }, [selectedVariant, size])

  const sizesList = useMemo(
    () => (Array.isArray(productData?.sizes) ? productData.sizes : []),
    [productData?.sizes]
  )

  const hoverOosActive = useMemo(
    () =>
      Boolean(
        oosHoverSize &&
          variants.length > 0 &&
          selectedVariant &&
          rawStockQty(selectedVariant, oosHoverSize) <= 0
      ),
    [oosHoverSize, variants.length, selectedVariant]
  )

  const showOosLine = oosClickTip || hoverOosActive

  const selectedSizeQty = useMemo(() => {
    if (variants.length === 0 || !selectedVariant || !size) return null
    return rawStockQty(selectedVariant, size)
  }, [variants.length, selectedVariant, size])

  const showLowSelectedSize =
    !showOosLine &&
    selectedSizeQty !== null &&
    selectedSizeQty > 0 &&
    selectedSizeQty < 5

  useEffect(() => {
    if (!variants.length || !selectedVariant || !sizesList.length) return
    if (!size) return
    if (rawStockQty(selectedVariant, size) <= 0) {
      const next = sizesList.find((sz) => rawStockQty(selectedVariant, sz) > 0)
      setSize(next ?? '')
      setOosClickTip(false)
    }
  }, [variants.length, selectedVariant, sizesList, size])

  const galleryImages = useMemo(() => {
    if (selectedVariant) {
      const items = selectedVariant.imageItems
      if (Array.isArray(items) && items.length) {
        return items.filter((it) => !it.is_hover).map((it) => it.url).filter(Boolean)
      }
      const imgs = selectedVariant.images || []
      const hover = selectedVariant.hoverImageUrl
      if (hover) return imgs.filter((u) => u && u !== hover)
      return imgs
    }
    return Array.isArray(productData?.image) ? productData.image.filter(Boolean) : []
  }, [productData, selectedVariant])

  useEffect(() => {
    if (!productData) return

    // Nếu chỉ có 1 biến thể, tự động chọn màu đó; nếu có nhiều biến thể nhưng chưa chọn màu, chọn màu đầu tiên
    if (variants.length === 1) {
      setSelectedColorName(variants[0].colorName)
    } else if (variants.length > 1 && !selectedColorName) {
      setSelectedColorName(variants[0].colorName)
    }
    // Nếu biến thể hiện tại đã chọn nhưng không còn tồn, tự động chọn biến thể khác còn tồn
  }, [productData, variants.length])

  useEffect(() => {
    // Khi đổi màu hoặc sản phẩm, reset ảnh chính về ảnh đầu tiên trong gallery của biến thể đó
    if (!galleryImages.length) return
    setActiveImageIndex(0)
    setImage(galleryImages[0] || '')
    // Nếu biến thể hiện tại đã chọn nhưng không còn tồn, tự động chọn size khác còn tồn
  }, [selectedColorName, productId, galleryImages.join('|')])

  // Khi đổi màu hoặc sản phẩm, reset size về size đầu tiên còn tồn của biến thể đó
  const setActiveImage = (index) => {
    const next = galleryImages[index]
    if (!next) return
    setIsImageTransitioning(true)
    setTimeout(() => {
      setActiveImageIndex(index)
      setImage(next)
      setIsImageTransitioning(false)
    }, 120)
  }

  // Chuyển sang ảnh trước trong gallery, vòng lặp
  const goPrevImage = () => {
    if (!galleryImages.length) return
    const nextIndex = (activeImageIndex - 1 + galleryImages.length) % galleryImages.length
    setActiveImage(nextIndex)
  }

  // Chuyển sang ảnh tiếp theo trong gallery, vòng lặp
  const goNextImage = () => {
    if (!galleryImages.length) return
    const nextIndex = (activeImageIndex + 1) % galleryImages.length
    setActiveImage(nextIndex)
  }
// Khi nhấn nút "Mua ngay", kiểm tra điều kiện và chuyển sang trang đặt hàng
  const handleBuyNow = () => {
    if (!size) {
      toast.error('Vui lòng chọn kích cỡ')
      return
    }
    if (!productData) return
    const color = selectedVariant?.colorName || 'DEFAULT'
    let maxStock = null
    if (variants.length && selectedVariant) {
      const raw = rawStockQty(selectedVariant, size)
      maxStock = raw
    }
    if (maxStock !== null && maxStock < 1) {
      setOosClickTip(true)
      return
    }
    if (!token) {
      toast.error('Vui lòng đăng nhập để đặt hàng')
      navigate('/login')
      return
    }
    const payload = [{ _id: productData._id, size, color, quantity: 1 }]
    try {
      localStorage.setItem('selectedCartItems', JSON.stringify(payload))
    } catch (e) {}
    navigate('/place-order', { state: { selectedCartItems: payload, buyNow: true } })
  }

  // Kiểm tra xem người dùng có đủ điều kiện để đánh giá sản phẩm hay không
  useEffect(() => {
    const checkPurchase = async () => {
      if (!token || !backendUrl || !productId) {
        setPurchaseState({ loading: false, eligible: false, inProgress: false })
        return
      }

      setPurchaseState((prev) => ({ ...prev, loading: true }))
      try {
        const response = await axios.post(
          backendUrl + '/api/order/userorders',
          {},
          { headers: { token } }
        )
        // Nếu không thành công, coi như không đủ điều kiện đánh giá
        if (!response.data.success) {
          setPurchaseState({ loading: false, eligible: false, inProgress: false })
          return
        }
// Kiểm tra xem người dùng đã mua sản phẩm này chưa, nếu có thì eligible = true, nếu đang trong quá trình giao hàng thì inProgress = true
        const orders = response.data.orders || []
        let eligible = false
        let inProgress = false
        // Duyệt qua các đơn hàng của người dùng để kiểm tra xem có đơn hàng nào chứa sản phẩm này không
        for (const order of orders) {
          const hasProduct = Array.isArray(order.items) && order.items.some((i) => String(i?._id) === String(productId))
          if (!hasProduct) continue

          if (String(order.status) === 'Delivered') {
            eligible = true
            break
          }

          if (['Order Placed', 'Packing', 'Shipped', 'Out for delivery'].includes(String(order.status))) {
            inProgress = true
          }
        }

        setPurchaseState({ loading: false, eligible, inProgress })
      } catch (e) {
        setPurchaseState({ loading: false, eligible: false, inProgress: false })
      }
    }
    // Gọi hàm kiểm tra điều kiện đánh giá sản phẩm khi component được mount hoặc khi token, backendUrl, productId thay đổi
    checkPurchase()
  }, [backendUrl, productId, token])

  const reviewsSorted = useMemo(() => {
    const arr = Array.isArray(productData?.reviews) ? productData.reviews : []
    return [...arr].sort((a, b) => Number(b?.createdAt ?? b?.date ?? 0) - Number(a?.createdAt ?? a?.date ?? 0))
  }, [productData])

  const reviewCount = Number(productData?.numReviews) || reviewsSorted.length
  const avgRating = Number(productData?.rating) || (reviewsSorted.length
    ? Number((reviewsSorted.reduce((s, r) => s + (Number(r?.rating) || 0), 0) / reviewsSorted.length).toFixed(1))
    : 0)

    // Render các ngôi sao đánh giá dựa trên giá trị trung bình
  const renderStars = (value) => {
    const v = Number(value) || 0
    const full = Math.floor(v)
    const hasHalf = v - full >= 0.5
    return (
      <div className='flex items-center gap-1'>
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= full
          const half = !filled && hasHalf && i === full + 1
          return (
            <img
              key={i}
              src={filled || half ? assets.star_icon : assets.star_dull_icon}
              alt=''
              className='w-3.5'
            />
          )
        })}
      </div>
    )
  }
  
    // Tính giá bán hiện tại của sản phẩm dựa trên giá gốc, giá sale và phần trăm giảm giá
  const productSalePrice = productData ? (
    productData.discountPercent > 0
      ? (productData.salePrice && productData.salePrice > 0
          ? productData.salePrice
          : Math.round(productData.price * (100 - productData.discountPercent) / 100))
      : productData.price
  ) : 0;
  // Kiểm tra xem sản phẩm có đang được giảm giá hay không
  const hasSale = productData && Number(productData.discountPercent) > 0

  return productData ? (
    <div className='border-t-2 pt-10 transition-opacity ease-in duration-500 opacity-100'>
      <button
        type='button'
        onClick={() => window.history.back()}
        className='inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-3 transition-colors'
      >
        <span aria-hidden='true'>←</span>
        Quay lại
      </button>
      <ProductBreadcrumb product={productData} />
      {/*----------- Product Data-------------- */}
      <div className='flex gap-12 sm:gap-12 flex-col sm:flex-row'>

        {/*---------- Product Images------------- */}
        <div className='flex-1 flex flex-col gap-3 sm:flex-row'>
          <div
            className='w-full sm:w-[80%] overflow-hidden rounded-xl relative'
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsZoomed(true)}
            onMouseLeave={() => setIsZoomed(false)}
          >
            <button
              type='button'
              onClick={goPrevImage}
              className='absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/80 hover:bg-white border border-gray-200 flex items-center justify-center transition'
              aria-label='Previous image'
            >
              <span className='text-lg leading-none'>{'<'}</span>
            </button>
            <button
              type='button'
              onClick={goNextImage}
              className='absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/80 hover:bg-white border border-gray-200 flex items-center justify-center transition'
              aria-label='Next image'
            >
              <span className='text-lg leading-none'>{'>'}</span>
            </button>
            <img
              className={`w-full h-auto transition duration-500 ease-in-out cursor-zoom-in ${isImageTransitioning ? 'opacity-70' : 'opacity-100'}`}
              src={image}
              alt=""
              style={{
                transformOrigin: `${zoomOrigin.x} ${zoomOrigin.y}`,
                transform: isZoomed ? 'scale(1.55)' : 'scale(1)',
              }}
            />
          </div>

          {/* Thumbnails (right on desktop, bottom on mobile) — min cao ~4 ô vuông, không scrollbar */}
          <div className='flex sm:flex-col overflow-x-auto sm:overflow-y-auto sm:min-h-[19rem] sm:max-h-[min(85vh,720px)] sm:gap-3 justify-between sm:justify-start sm:w-[20%] w-full no-scrollbar'>
            {(galleryImages || []).map((item, index) => (
              <img
                onClick={() => setActiveImage(index)}
                src={item}
                key={index}
                className={`w-[24%] sm:w-full aspect-square object-cover flex-shrink-0 cursor-pointer border transition-all rounded-sm ${index === activeImageIndex ? 'border-black' : 'border-transparent hover:border-gray-300'}`}
                alt=''
              />
            ))}
          </div>
        </div>

        {/* -------- Product Info ---------- */}
        <div className='flex-1'>
          <h1 className='font-medium text-2xl mt-2'>{productData.name}</h1>
          <ProductTagLinks product={productData} className='mt-2' />
          {variants.length > 0 && displaySku ? (
            <div className='flex items-center gap-2 mt-2 text-sm text-gray-600'>
              <span>
                Mã SP: <span className='text-gray-900 font-medium'>{displaySku}</span>
              </span>
              <button
                type='button'
                className='text-xs px-2 py-0.5 border border-gray-300 rounded hover:bg-gray-50'
                onClick={() => {
                  navigator.clipboard?.writeText(displaySku).then(() => {
                    toast.success('Đã copy mã SP')
                  }).catch(() => toast.error('Không copy được'))
                }}
              >
                Copy
              </button>
            </div>
          ) : null}
          <div className='flex items-center gap-2 mt-2'>
            {renderStars(avgRating)}
            <p className='text-sm text-gray-600'>
              <span className='font-medium text-gray-800'>{avgRating.toFixed(1)}</span>
              <button
                type='button'
                onClick={scrollToReviews}
                className='ml-2 underline-offset-2 hover:underline hover:text-gray-900 cursor-pointer'
                aria-label={`Xem ${reviewCount} đánh giá`}
              >
                ({reviewCount})
              </button>
            </p>
          </div>

          {/* Giá — giá hiện tại luôn đỏ; giá gốc gạch ngang xám khi có giảm */}
          <div className='mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1'>
            <span className='text-sm font-semibold text-gray-900'>Giá:</span>
            <span className='product-detail-price-current'>
              {productSalePrice.toLocaleString('vi-VN')}
              {currency}
            </span>
            {hasSale ? (
              <>
                <span className='product-detail-price-original'>
                  {productData.price.toLocaleString('vi-VN')}
                  {currency}
                </span>
                <span className='product-detail-price-badge'>-{productData.discountPercent}%</span>
              </>
            ) : null}
          </div>

          <p className='mt-5 text-gray-500 md:w-4/5'>{productData.description}</p>
          
          <div className='flex flex-col gap-4 my-8'>
            {/* Color variants */}
            {variants.length > 0 && (
              <div>
                <p className='font-medium mb-2'>
                  Màu sắc: <span className='font-normal text-gray-800'>{selectedColorName || selectedVariant?.colorName}</span>
                </p>
                <div className='flex flex-wrap gap-3'>
                  {variants.map((v) => {
                    const isActive = String(v.colorName) === String(selectedColorName)
                    const fullyOos = variantFullyOutOfStock(v, sizesList)
                    return (
                      <button
                        type='button'
                        key={v.colorName}
                        onClick={() => setSelectedColorName(v.colorName)}
                        className={`relative flex flex-col items-center gap-1 pb-1 transition ${isActive ? 'border-b-4 border-black' : 'border-b-4 border-transparent hover:border-gray-300'} ${fullyOos ? 'opacity-80' : ''}`}
                        aria-label={`Chọn màu ${v.colorName}`}
                      >
                        <span className='relative'>
                          <img
                            src={v.thumbnail || v.images?.[0] || productData.image?.[0]}
                            alt={v.colorName}
                            className='w-12 h-12 object-cover rounded border'
                          />
                          {fullyOos ? (
                            <span className='pointer-events-none absolute inset-0 overflow-hidden rounded' aria-hidden>
                              <span className='absolute left-1/2 top-1/2 w-[145%] max-w-none h-[2px] -translate-x-1/2 -translate-y-1/2 rotate-[38deg] bg-gray-700 shadow-sm' />
                            </span>
                          ) : null}
                        </span>
                        <span className='text-xs text-gray-700'>{v.colorName}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <div className='relative flex flex-col gap-1' onMouseLeave={() => setOosHoverSize(null)}>
              <p className='font-medium'>Chọn Kích Cỡ</p>
              {showOosLine ? (
                <p className='text-sm font-medium text-rose-400'>Sản phẩm này hết hàng</p>
              ) : showLowSelectedSize ? (
                <p className='text-sm font-medium text-gray-900'>Chỉ còn {selectedSizeQty} sản phẩm</p>
              ) : null}
              <div className='flex flex-wrap gap-2'>
                {sizesList.map((item) => {
                  const isActive = item === size
                  const isHovered = item === hoveredSize
                  const qty =
                    variants.length === 0
                      ? 1
                      : selectedVariant
                        ? rawStockQty(selectedVariant, item)
                        : 0
                  const oos = variants.length > 0 && qty <= 0
                  const isSelected = isActive && !oos

                  return (
                    <button
                      type='button'
                      key={String(item)}
                      onClick={() => {
                        if (oos) {
                          setOosClickTip(true)
                          return
                        }
                        setOosClickTip(false)
                        setSize(item)
                      }}
                      onMouseEnter={() => {
                        setHoveredSize(item)
                        if (oos) setOosHoverSize(item)
                        else setOosHoverSize(null)
                      }}
                      onMouseLeave={() => setHoveredSize('')}
                      className={`product-size-btn relative min-w-[2.75rem] overflow-hidden border py-2 px-4 text-sm transition duration-200 ${
                        oos
                          ? 'cursor-not-allowed border-gray-300 bg-gray-200 text-gray-500'
                          : `cursor-pointer bg-white text-gray-900 border-gray-300 hover:border-red-400 ${
                              isSelected ? 'product-size-btn--selected border-red-600' : ''
                            } ${!isSelected && isHovered ? 'border-red-400' : ''}`
                      }`}
                    >
                      <span className='relative z-[1]'>{item}</span>
                      {oos ? (
                        <span className='pointer-events-none absolute inset-0 flex items-center justify-center' aria-hidden>
                          <span className='h-[2px] w-[130%] rotate-[-32deg] bg-gray-500' />
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <div className='flex flex-wrap gap-3 items-center'>
            <button
              type='button'
              onClick={() => {
                const color = selectedVariant?.colorName || 'DEFAULT'
                const max =
                  variants.length === 0
                    ? null
                    : selectedVariant
                      ? rawStockQty(selectedVariant, size)
                      : 0
                if (!size) {
                  toast.error('Vui lòng chọn kích cỡ')
                  return
                }
                if (variants.length > 0 && max <= 0) {
                  setOosClickTip(true)
                  return
                }
                addToCart(productData._id, size, color, max, productData.name)
              }}
              className='bg-white text-black border border-black px-8 py-3 text-sm hover:bg-red-600 hover:text-white transition-all duration-300 active:bg-red-700'
            >
              Thêm vào giỏ hàng
            </button>
            <button
              type='button'
              onClick={handleBuyNow}
              className='bg-black text-white border border-black px-8 py-3 text-sm hover:bg-red-600 transition-all duration-300 active:bg-red-700'
            >
              Mua ngay
            </button>
          </div>

          <hr className='mt-8 sm:w-4/5' />
          <div className='text-sm text-gray-500 mt-5 flex flex-col gap-1'>
            <p>Sản phẩm chính hãng 100%.</p>
            <p>Thanh toán khi nhận hàng có sẵn cho sản phẩm này.</p>
            <p>Chính sách hoàn trả và đổi trả dễ dàng trong vòng 7 ngày.</p>
          </div>
        </div>
      </div>

      {/* ---------- Description & Review Section ------------- */}
      <div ref={reviewsSectionRef} id='product-reviews' className='mt-20 scroll-mt-24'>
        <div className='flex'>
          <button
            type='button'
            onClick={() => setActiveTab('desc')}
            className={`border px-5 py-3 text-sm font-semibold ${activeTab === 'desc' ? 'bg-white' : 'bg-gray-50 text-gray-600'}`}
          >
            Mô tả
          </button>
          <button
            type='button'
            onClick={() => setActiveTab('reviews')}
            className={`border px-5 py-3 text-sm ${activeTab === 'reviews' ? 'bg-white font-semibold' : 'bg-gray-50 text-gray-600'}`}
          >
            Đánh giá ({reviewCount})
          </button>
        </div>
        <div className='flex flex-col gap-4 border px-6 py-6 text-sm text-gray-500'>
          {activeTab === 'desc' ? (
            <>
              <p>Trang web thương mại điện tử là một nền tảng trực tuyến tạo điều kiện thuận lợi cho việc mua bán sản phẩm hoặc dịch vụ qua internet.</p>
              <p>Các trang web thương mại điện tử thường hiển thị sản phẩm hoặc dịch vụ cùng với mô tả chi tiết, hình ảnh, giá cả và các biến thể.</p>
            </>
          ) : (
            <div className='space-y-4'>
              {reviewsSorted.length === 0 ? (
                <p>Chưa có đánh giá nào cho sản phẩm này.</p>
              ) : (
                reviewsSorted.map((r, idx) => (
                  <div key={r.orderId || r.createdAt || idx} className='border rounded-lg p-4 bg-white'>
                    <div className='flex items-start justify-between gap-4'>
                      <div>
                        <div className='flex items-center gap-2'>
                          {renderStars(r.rating)}
                          <span className='text-xs text-gray-500'>
                            {new Date(Number(r.createdAt ?? r.date ?? Date.now())).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <p className='text-sm text-gray-800 mt-2'>{r.comment}</p>
                        {Array.isArray(r.tags) && r.tags.length > 0 && (
                          <div className='flex flex-wrap gap-2 mt-3'>
                            {r.tags.map((t) => (
                              <span key={t} className='text-xs px-2 py-1 rounded bg-gray-100 text-gray-700'>
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <ReviewImageGallery images={r.images} thumbClassName='w-20 h-20' />
                  </div>
                ))
              )}
            </div>
          )}

          {token && (
            <div className='pt-2'>
              {purchaseState.eligible ? (
                <button
                  type='button'
                  onClick={() => navigate('/orders', { state: { openReviewFor: productId } })}
                  className='border border-black text-black px-5 py-2 rounded hover:bg-red-600 hover:border-red-600 hover:text-white transition'
                >
                  Viết đánh giá
                </button>
              ) : purchaseState.inProgress ? (
                <p className='text-sm text-gray-600'>
                  Bạn có thể đánh giá sau khi nhận được hàng
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* --------- display related products ---------- */}
      <RelatedProducts category={productData.category} subCategory={productData.subCategory} />

    </div>
  ) : <div className=' opacity-0'></div>
}

export default Product