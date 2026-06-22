import { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../context/ShopContext'
import Title from './Title';
import ProductItem from './ProductItem';

const LatestCollection = () => {

    const { products } = useContext(ShopContext);
    const [latestProducts,setLatestProducts] = useState([]);

    useEffect(()=>{
        setLatestProducts(products.slice(0,10));
    },[products])

  return (
    <section id='latest-products' className='my-10 scroll-mt-24'>
      <div className='text-center py-8 text-3xl'>
          <Title text1={'Sản phẩm'} text2={'mới nhất'} />
          <p className='w-3/4 m-auto text-xs sm:text-sm md:text-base text-gray-600'>
          Khám phá những sản phẩm mới nhất với thiết kế hiện đại, chất lượng cao và phong cách thời trang phù hợp với xu hướng hiện nay.
          </p>
      </div>

      {/* Rendering Products */}
      <div className='grid grid-cols-3 gap-3 sm:gap-5 md:gap-6 gap-y-6 sm:gap-y-8 md:gap-y-10'>
        {
          latestProducts.map((item,index)=>(
            <ProductItem
              key={index}
              id={item._id}
              image={item.image}
              variants={item.variants}
              mainImageUrl={item.mainImageUrl}
              hoverImageUrl={item.hoverImageUrl}
              name={item.name}
              price={item.price}
              discountPercent={item.discountPercent}
              salePrice={item.salePrice}
            />
          ))
        }
      </div>
    </section>
  )
}

export default LatestCollection
