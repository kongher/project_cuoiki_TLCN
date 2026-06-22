import { assets } from '../assets/assets'

const OurPolicy = () => {
  return (
    <div className='flex flex-col sm:flex-row justify-around gap-12 sm:gap-2 text-center py-20 text-xs sm:text-sm md:text-base text-gray-700'>
      
      <div>
        <img src={assets.exchange_icon} className='w-12 m-auto mb-5' alt="" />
        <p className=' font-semibold'>Chính sách đổi hàng dễ dàng</p>
        <p className=' text-gray-400'>Chúng tôi cung cấp chính sách đổi hàng đơn giản và nhanh chóng, giúp bạn yên tâm mua sắm.</p>
      </div>
      <div>
        <img src={assets.quality_icon} className='w-12 m-auto mb-5' alt="" />
        <p className=' font-semibold'>Chính sách hoàn trả trong 7 ngày</p>
        <p className=' text-gray-400'>Bạn có thể trả lại sản phẩm trong vòng 7 ngày nếu sản phẩm không phù hợp hoặc có vấn đề.</p>
      </div>
      <div>
        <img src={assets.support_img} className='w-12 m-auto mb-5' alt="" />
        <p className=' font-semibold'>Hỗ trợ khách hàng tốt nhất</p>
        <p className=' text-gray-400'>chúng tôi luôn sẵn sàng phục vụ bạn 24/7 để giải đáp mọi thắc mắc.</p>
      </div>

    </div>
  )
}

export default OurPolicy
