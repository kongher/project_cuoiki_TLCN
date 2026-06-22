import { useContext } from 'react'
import PropTypes from 'prop-types'
import { ShopContext } from '../context/ShopContext'
import Title from './Title';

const CartTotal = ({ subtotalOverride }) => {

  const { currency, getCartAmount } = useContext(ShopContext);

  const subtotal = subtotalOverride !== undefined ? subtotalOverride : getCartAmount();

  // Ship mặc định
  let shippingFee = 10000;

  // Free ship nếu >= 500k
  if (subtotal >= 500000) {
    shippingFee = 0;
  }

  const total = subtotal === 0 ? 0 : subtotal + shippingFee;

  return (
    <div className='w-full'>
      
      <div className='text-2xl'>
        <Title text1={'Tổng'} text2={'giỏ hàng'} />
      </div>

      {/* Thông báo Free Ship */}
      <p className='text-green-600 text-sm mt-2'>
        🚚 Miễn phí vận chuyển cho đơn hàng từ 500.000₫
      </p>

      <div className='flex flex-col gap-2 mt-3 text-sm'>

        {/* Subtotal */}
        <div className='flex justify-between'>
          <p>Tạm tính</p>
          <p>{subtotal.toLocaleString('vi-VN')}{currency}</p>
        </div>

        <hr />

        {/* Shipping */}
        <div className='flex justify-between'>
          <p>Phí vận chuyển</p>
          <p>
            {shippingFee === 0 
              ? "Miễn phí" 
              : shippingFee.toLocaleString('vi-VN') + currency}
          </p>
        </div>

        <hr />

        {/* Total */}
        <div className='flex justify-between'>
          <b>Tổng cộng</b>
          <b>{total.toLocaleString('vi-VN')}{currency}</b>
        </div>

      </div>
    </div>
  )
}

CartTotal.propTypes = {
  subtotalOverride: PropTypes.number,
}

export default CartTotal