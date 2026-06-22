import { Link } from 'react-router-dom'
import { useContext, useMemo } from 'react'
import { ShopContext } from '../context/ShopContext'
import { hasProductTag, TAG_SUPER_SALE } from '../config/productTags'
import ProductItem from './ProductItem'

const SpecialSaleMonth = () => {
  const { products } = useContext(ShopContext)

  const specialSaleProducts = useMemo(() => {
    return (products || []).filter((p) => p && hasProductTag(p, TAG_SUPER_SALE)).slice(0, 8)
  }, [products])

  if (!specialSaleProducts.length) return null

  return (
    <section id='special-sale-month' className='my-10 scroll-mt-24'>
      <div className='text-center py-8'>
        <p className='text-2xl sm:text-3xl font-semibold tracking-wide'>SIÊU SALE TRONG THÁNG</p>
        <p className='w-3/4 m-auto text-xs sm:text-sm md:text-base text-gray-600 mt-2'>
          Deal chọn lọc trong tháng — số lượng có hạn, săn ngay để không bỏ lỡ.
        </p>
      </div>

      <div className='grid grid-cols-3 gap-3 sm:gap-5 md:gap-6 gap-y-6 sm:gap-y-8 md:gap-y-10'>
        {specialSaleProducts.map((item, index) => {
          const badgeText =
            Number(item.discountPercent) > 0 ? `-${Number(item.discountPercent)}%` : 'SALE'

          return (
            <ProductItem
              key={item._id || index}
              id={item._id}
              image={item.image}
              variants={item.variants}
              mainImageUrl={item.mainImageUrl}
              hoverImageUrl={item.hoverImageUrl}
              name={item.name}
              price={item.price}
              discountPercent={item.discountPercent}
              salePrice={item.salePrice}
              badgeText={badgeText}
            />
          )
        })}
      </div>

      <div className='text-center mt-8'>
        <Link
          to='/sale'
          className='inline-block text-sm font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-6 py-2 rounded-full transition-colors'
        >
          Xem tất cả sản phẩm đang SALE (giảm giá và siêu sale)
        </Link>
      </div>
    </section>
  )
}

export default SpecialSaleMonth

