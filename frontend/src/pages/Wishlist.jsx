import { Link } from 'react-router-dom'

const Wishlist = () => (
  <section className='py-16 text-center text-gray-600'>
    <h1 className='text-2xl font-semibold text-gray-800 mb-3'>Danh sách yêu thích</h1>
    <p className='mb-6'>Tính năng đang được phát triển. Hãy khám phá sản phẩm trong cửa hàng.</p>
    <Link to='/collection' className='inline-block bg-black text-white px-6 py-2.5 text-sm hover:bg-red-600 transition-colors'>
      Xem sản phẩm
    </Link>
  </section>
)

export default Wishlist
