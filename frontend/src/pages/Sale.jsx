import { useContext, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ShopContext } from '../context/ShopContext'
import Title from '../components/Title'
import ProductItem from '../components/ProductItem'
import { hasProductTag, TAG_SUPER_SALE } from '../config/productTags'

/** Sản phẩm có % giảm giá > 0 hoặc nhãn Siêu sale. */
const isSaleProduct = (p) => {
  if (!p) return false
  if (Number(p.discountPercent) > 0) return true
  if (hasProductTag(p, TAG_SUPER_SALE)) return true
  return false
}

const Sale = () => {
  const { products, getProductSalePrice } = useContext(ShopContext)
  const [searchParams] = useSearchParams()
  const dept = String(searchParams.get('dept') || '').trim()
  const band = String(searchParams.get('band') || '').trim()

  const list = useMemo(() => {
    return (products || []).filter((p) => {
      if (!isSaleProduct(p)) return false
      if (dept === 'Men' || dept === 'Women' || dept === 'Kids') {
        if (String(p.category) !== dept) return false
      }
      if (band === '99-199') {
        const price = getProductSalePrice(p)
        if (price < 99000 || price > 199000) return false
      }
      return true
    })
  }, [products, dept, band, getProductSalePrice])

  const titleExtra =
    dept === 'Men'
      ? ' — Nam'
      : dept === 'Women'
        ? ' — Nữ'
        : dept === 'Kids'
          ? ' — Trẻ em'
          : band === '99-199'
            ? ' — Đồng giá 99k–199k'
            : ''

  return (
    <div className='pt-10 pb-16'>
      <div className='mb-8'>
        <Title text1={'SALE'} text2={`Ưu đãi${titleExtra}`} text1ClassName='text-red-600 font-semibold' />
      </div>

      {!list.length ? (
        <p className='text-gray-500 text-sm'>Hiện chưa có sản phẩm phù hợp.</p>
      ) : (
        <div className='grid grid-cols-3 gap-3 sm:gap-5 md:gap-6 gap-y-6 sm:gap-y-8 md:gap-y-10'>
          {list.map((item, index) => {
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
      )}
    </div>
  )
}

export default Sale
