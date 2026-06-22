import React from 'react'
import Title from '../components/Title'
import { assets } from '../assets/assets'
import NewsletterBox from '../components/NewsletterBox'

const About = () => {
  return (
    <div>

      <div className='text-2xl text-center pt-8 border-t'>
          <Title text1={'GIỚI'} text2={'THIỆU'} />
      </div>

      <div className='my-10 flex flex-col md:flex-row gap-16'>
          <img className='w-full md:max-w-[450px]' src={assets.about_img} alt="" />
          <div className='flex flex-col justify-center gap-6 md:w-2/4 text-gray-600'>
              <p>Forever được thành lập từ niềm đam mê đổi mới và mong muốn mang đến trải nghiệm mua sắm trực tuyến tiện lợi cho mọi người. Chúng tôi bắt đầu với một ý tưởng đơn giản: tạo ra một nền tảng nơi khách hàng có thể dễ dàng khám phá, tìm kiếm và mua sắm nhiều sản phẩm khác nhau ngay tại nhà.</p>
              <p>Từ những ngày đầu hoạt động, chúng tôi luôn nỗ lực lựa chọn và cung cấp các sản phẩm chất lượng cao, phù hợp với nhiều phong cách và nhu cầu khác nhau. Từ thời trang, phụ kiện đến các sản phẩm thiết yếu trong cuộc sống, cửa hàng luôn mang đến sự đa dạng và đáng tin cậy cho khách hàng.</p>
              <b className='text-gray-800'>Sứ mệnh của chúng tôi</b>
              <p>Sứ mệnh của Forever là mang đến cho khách hàng sự lựa chọn đa dạng, trải nghiệm mua sắm tiện lợi và sự tin tưởng tuyệt đối. Chúng tôi cam kết cung cấp dịch vụ mua sắm trực tuyến nhanh chóng, an toàn và thân thiện, từ việc tìm kiếm sản phẩm cho đến giao hàng tận nơi.</p>
          </div>
      </div>

      <div className=' text-xl py-4'>
          <Title text1={'TẠI SAO'} text2={'CHỌN CHÚNG TÔI'} />
      </div>

      <div className='flex flex-col md:flex-row text-sm mb-20'>
          <div className='border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-5'>
            <b>Đảm bảo chất lượng:</b>
            <p className=' text-gray-600'>Chúng tôi lựa chọn và kiểm tra kỹ lưỡng từng sản phẩm để đảm bảo chúng đáp ứng các tiêu chuẩn chất lượng nghiêm ngặt của chúng tôi.</p>
          </div>
          <div className='border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-5'>
            <b>Tiện lợi:</b>
            <p className=' text-gray-600'>Với giao diện thân thiện và quy trình đặt hàng không rắc rối, việc mua sắm chưa bao giờ dễ dàng như vậy.</p>
          </div>
          <div className='border px-10 md:px-16 py-8 sm:py-20 flex flex-col gap-5'>
            <b>Dịch vụ khách hàng xuất sắc:</b>
            <p className=' text-gray-600'>Đội ngũ nhân viên tận tâm của chúng tôi luôn sẵn sàng hỗ trợ bạn trong suốt quá trình mua sắm, đảm bảo sự hài lòng của khách hàng luôn là ưu tiên hàng đầu.</p>
          </div>
      </div>

      <NewsletterBox/>
      
    </div>
  )
}

export default About
