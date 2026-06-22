import { useContext, useEffect, useState } from 'react' 
import { toast } from 'react-toastify'
import { ShopContext } from '../context/ShopContext'
import Title from '../components/Title';
import FreeShipBanner from '../components/FreeShipBanner';
import { assets } from '../assets/assets';
import { getProductSizeStock, getStockLimitMessage } from '../utils/stock';

const Cart = () => {

  const { products, currency, cartItems, updateQuantity, navigate, removeCoupon, getShippingFee, refreshProducts } = useContext(ShopContext);

  const [cartData, setCartData] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});

  useEffect(() => {
    if (cartData.length === 0) {
      setSelectedItems({});
      return;
    }

    setSelectedItems(prev => {
      const next = { ...prev };
      cartData.forEach(item => {
        const key = `${item._id}_${item.color || 'DEFAULT'}_${item.size}`;
        if (next[key] === undefined) {
          next[key] = true;
        }
      });
      return next;
    });
  }, [cartData]);

  const selectedCartData = cartData.filter(item => selectedItems[`${item._id}_${item.color || 'DEFAULT'}_${item.size}`]);

  const selectedAmount = selectedCartData.reduce((total, item) => {
    const product = products.find(product => product._id === item._id);
    if (!product) return total;
    const itemPrice = product.discountPercent > 0
      ? (product.salePrice && product.salePrice > 0
          ? product.salePrice
          : Math.round(product.price * (100 - product.discountPercent) / 100))
      : product.price;
    return total + itemPrice * item.quantity;
  }, 0);

  const selectedShipping = getShippingFee(selectedAmount);
  const selectedTotal = selectedAmount === 0 ? 0 : selectedAmount + selectedShipping;
  const allSelected = cartData.length > 0 && cartData.every(item => selectedItems[`${item._id}_${item.color || 'DEFAULT'}_${item.size}`]);

  const toggleSelect = (key) => {
    setSelectedItems(prev => ({ ...prev, [key]: !prev[key] }));
  }

  const toggleSelectAll = () => {
    const checked = !allSelected;
    const next = {};
    cartData.forEach(item => {
      next[`${item._id}_${item.color || 'DEFAULT'}_${item.size}`] = checked;
    });
    setSelectedItems(next);
  }

  useEffect(() => {
    refreshProducts?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const trySetQuantity = (item, qty, maxStock) => {
    const stockMsg = getStockLimitMessage(qty, maxStock)
    if (stockMsg) {
      toast.error(stockMsg)
      return
    }
    updateQuantity(item._id, item.size, qty, item.color || 'DEFAULT', maxStock)
  }

  const handleQuantityChange = (item, rawValue, maxStock) => {
    if (rawValue === '' || rawValue === '0') return
    const qty = Number(rawValue)
    if (!Number.isFinite(qty) || qty < 1) return
    trySetQuantity(item, qty, maxStock)
  }

  const handleQuantityStep = (item, delta, maxStock) => {
    const next = Number(item.quantity) + delta
    if (next < 1) {
      updateQuantity(item._id, item.size, 0, item.color || 'DEFAULT')
      return
    }
    trySetQuantity(item, next, maxStock)
  }

  const goToCheckout = () => {
    const payload = selectedCartData.map(item => ({ ...item }));
    localStorage.setItem('selectedCartItems', JSON.stringify(payload));
    removeCoupon()
    try {
      localStorage.removeItem('appliedDiscount')
      localStorage.removeItem('couponCode')
      localStorage.removeItem('appliedCoupon')
    } catch (e) {}

    navigate('/place-order', { state: { selectedCartItems: payload } });
  }

  useEffect(() => {
    const tempData = [];
    for (const items in cartItems) {
      for (const key in cartItems[items]) {
        const maybeQty = cartItems[items][key]
        // legacy format: cartItems[productId][size] = qty
        if (typeof maybeQty === 'number') {
          if (maybeQty > 0) {
            tempData.push({
              _id: items,
              color: 'DEFAULT',
              size: key,
              quantity: maybeQty
            })
          }
          continue
        }

        // new format: cartItems[productId][color][size] = qty
        const color = key
        for (const size in cartItems[items][color]) {
          const qty = cartItems[items][color][size]
          if (qty > 0) {
            tempData.push({
              _id: items,
              color,
              size,
              quantity: qty
            })
          }
        }
      }
    }
    setCartData(tempData);
  }, [cartItems, products])

  if (cartData.length === 0) {
    return (
      <div className='border-t pt-14 min-h-[60vh] flex flex-col items-center justify-center text-center px-4'>
        <div className='mb-8'>
          <svg width='160' height='160' viewBox='0 0 160 160' fill='none' aria-hidden='true'>
            <ellipse cx='80' cy='130' rx='50' ry='8' fill='#E5E7EB' />
            <path d='M45 55h70l-8 65H53L45 55z' fill='#FACC15' stroke='#EAB308' strokeWidth='2' />
            <path d='M55 55V45a25 25 0 0 1 50 0v10' stroke='#EAB308' strokeWidth='4' fill='none' strokeLinecap='round' />
            <circle cx='105' cy='38' r='18' fill='#A855F7' />
            <text x='105' y='44' textAnchor='middle' fill='white' fontSize='20' fontWeight='bold'>?</text>
            <line x1='95' y1='28' x2='88' y2='18' stroke='#A855F7' strokeWidth='2' strokeLinecap='round' />
            <line x1='115' y1='28' x2='122' y2='18' stroke='#A855F7' strokeWidth='2' strokeLinecap='round' />
            <line x1='105' y1='20' x2='105' y2='10' stroke='#A855F7' strokeWidth='2' strokeLinecap='round' />
          </svg>
        </div>
        <p className='text-lg sm:text-xl font-medium text-gray-800 mb-8 max-w-md'>
          Giỏ hàng hiện đang trống, cùng mua sắm ngay nhé!
        </p>
        <button
          type='button'
          onClick={() => navigate('/')}
          className='px-12 py-3.5 rounded-full bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 text-gray-900 font-semibold text-base transition-colors shadow-sm'
        >
          mua sắm ngay
        </button>
      </div>
    )
  }

  return (
    <div className='border-t pt-14'>

      <div className=' text-2xl mb-3'>
        <Title text1={'GIỎ'} text2={'HÀNG CỦA BẠN'} />
      </div>

      {selectedCartData.length > 0 && (
        <div className='mb-6 max-w-3xl'>
          <FreeShipBanner subtotal={selectedAmount} />
        </div>
      )}

      <div>
        <div className='py-4 border-b flex items-center justify-between text-gray-700'>
          <div className='flex items-center gap-3'>
            <input
              type='checkbox'
              checked={allSelected}
              onChange={toggleSelectAll}
              className='cursor-pointer'
            />
            <p className='font-medium'>Chọn tất cả</p>
          </div>
          <p className='text-sm text-gray-500'>{selectedCartData.length}/{cartData.length} đã chọn</p>
        </div>
        {
          cartData.map((item, index) => {

            const productData = products.find((product) => product._id === item._id);
            const key = `${item._id}_${item.color || 'DEFAULT'}_${item.size}`;
            const isChecked = selectedItems[key];
            const productPrice = productData && productData.discountPercent > 0
              ? (productData.salePrice && productData.salePrice > 0
                  ? productData.salePrice
                  : Math.round(productData.price * (100 - productData.discountPercent) / 100))
              : productData?.price || 0;
            const maxStock = getProductSizeStock(productData, item.color, item.size)
            const maxQty = typeof maxStock === 'number' && maxStock >= 1 ? maxStock : undefined

            return (
              <div key={index} className='py-4 border-t border-b text-gray-700 grid grid-cols-[0.5fr_3.5fr_0.5fr_0.5fr] sm:grid-cols-[0.5fr_3fr_2fr_0.5fr] items-center gap-4'>
                <div className='flex items-center justify-center'>
                  <input
                    type='checkbox'
                    checked={!!isChecked}
                    onChange={() => toggleSelect(key)}
                    className='cursor-pointer'
                  />
                </div>
                <div className=' flex items-start gap-6'>
                  <img
                    className='w-16 sm:w-20'
                    src={
                      productData?.variants?.length
                        ? (productData.variants.find(v => v.colorName === (item.color || 'DEFAULT'))?.images?.[0]
                          || productData.variants.find(v => v.colorName === (item.color || 'DEFAULT'))?.thumbnail
                          || productData.image?.[0])
                        : (productData?.image?.[0] || assets.upload_area)
                    }
                    alt=""
                  />
                  <div>
                    <p className='text-xs sm:text-lg font-medium'>{productData?.name || 'Sản phẩm'}</p>
                    <div className='flex items-center gap-5 mt-2'>
                      <div>
                        <p>{productPrice.toLocaleString('vi-VN')}{currency}</p>
                        {productData?.discountPercent > 0 && (
                          <p className='text-xs text-gray-400 line-through'>
                            {productData.price.toLocaleString('vi-VN')}{currency}
                          </p>
                        )}
                      </div>
                      <div className='flex items-center border border-gray-300 rounded overflow-hidden shrink-0'>
                        <button
                          type='button'
                          onClick={() => handleQuantityStep(item, -1, maxStock)}
                          disabled={item.quantity <= 1}
                          className='px-2.5 py-1 text-base leading-none hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed'
                          aria-label='Giảm số lượng'
                        >
                          −
                        </button>
                        <input
                          onChange={(e) => handleQuantityChange(item, e.target.value, maxStock)}
                          onBlur={(e) => {
                            const v = e.target.value
                            if (v === '' || Number(v) < 1) {
                              trySetQuantity(item, 1, maxStock)
                            }
                          }}
                          className='w-10 sm:w-12 text-center text-sm py-1 border-x border-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                          type='number'
                          min={1}
                          max={maxQty}
                          value={item.quantity}
                        />
                        <button
                          type='button'
                          onClick={() => handleQuantityStep(item, 1, maxStock)}
                          className='px-2.5 py-1 text-base leading-none hover:bg-gray-100'
                          aria-label='Tăng số lượng'
                        >
                          +
                        </button>
                      </div>

                      <img
                        onClick={() => updateQuantity(item._id, item.size, 0, item.color || 'DEFAULT')}
                        className='w-4 mr-4 sm:w-5 cursor-pointer'
                        src={assets.bin_icon}
                        alt=""
                      />
                    </div>
                    <p className='text-xs text-gray-500 mt-1'>
                      Màu: {item.color || 'DEFAULT'} | Size: {item.size}
                    </p>
                  </div>
                </div>
              </div>
              )

          })
        }
      </div>

      <div className='flex justify-end my-20'>
        <div className='w-full sm:w-[450px] border p-5 rounded-lg'>
          <div className='text-2xl font-semibold'>Tổng đã chọn</div>
          <div className='flex justify-between mt-4 text-sm'>
            <p>Số sản phẩm</p>
            <p>{selectedCartData.length}</p>
          </div>
          <div className='mt-4 mb-3'>
            <FreeShipBanner subtotal={selectedAmount} />
          </div>
          <div className='flex justify-between mt-2 text-sm'>
            <p>Tạm tính</p>
            <p>{selectedAmount.toLocaleString('vi-VN')}{currency}</p>
          </div>
          <div className='flex justify-between mt-2 text-sm'>
            <p>Phí vận chuyển</p>
            <p>{selectedShipping === 0 ? 'Miễn phí ship' : selectedShipping.toLocaleString('vi-VN') + currency}</p>
          </div>
          <div className='flex justify-between mt-4 text-base font-semibold'>
            <p>Tổng cộng</p>
            <p>{selectedTotal.toLocaleString('vi-VN')}{currency}</p>
          </div>

          <div className='w-full text-end'>
            <button 
              onClick={goToCheckout}
              disabled={selectedCartData.length === 0}
              className={`bg-blue-600 text-white text-sm my-8 px-8 py-3 transition-all duration-300 active:bg-blue-800 ${selectedCartData.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
            >
              TIẾN HÀNH THANH TOÁN
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}

export default Cart