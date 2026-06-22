import React from 'react'
import { assets } from '../assets/assets'

const Footer = () => {
  return (
    <div>
      <div className='flex flex-col sm:grid grid-cols-[3fr_1fr_1fr] gap-14 my-10 mt-40 text-sm'>

        <div>
            <img src={assets.logo} className='mb-5 w-32' alt="" />
            <p className='w-full md:w-2/3 text-gray-600'>
            Chúng tôi chuyên cung cấp các sản phẩm thời trang chất lượng với thiết kế hiện đại và giá cả hợp lý. 
            Cửa hàng luôn mong muốn mang đến cho khách hàng trải nghiệm mua sắm tiện lợi, sản phẩm uy tín 
            và dịch vụ chăm sóc khách hàng tận tâm.
            </p>
        </div>

        <div>
            <p className='text-xl font-medium mb-5'>Thông tin công ty</p>
            <ul className='flex flex-col gap-1 text-gray-600'>
                <li>Trang chủ</li>
                <li>Giới thiệu</li>
                <li>Chính sách giao hàng</li>
                <li>Chính sách bảo mật</li>
            </ul>
        </div>

        <div>
            <p className='text-xl font-medium mb-5'>Liên hệ</p>
            <ul className='flex flex-col gap-1 text-gray-600'>
                <li>+84 123 456 789</li>
                <li>contact@foreveryou.com</li>
            </ul>
        </div>

      </div>

        <div>
            <hr />
            <p className='py-5 text-sm text-center'>© 2026 Forever. All Rights Reserved.</p>
        </div>

    </div>
  )
}

export default Footer
