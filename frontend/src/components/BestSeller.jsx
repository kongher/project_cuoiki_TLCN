import { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../context/ShopContext'
import { hasProductTag, TAG_BEST_SELLER } from '../config/productTags'
import Title from './Title';
import ProductItem from './ProductItem';

const BestSeller = () => {

    const {products} = useContext(ShopContext);
    const [bestSeller,setBestSeller] = useState([]);

    useEffect(()=>{
        const bestProduct = products.filter((item) => hasProductTag(item, TAG_BEST_SELLER));
        setBestSeller(bestProduct.slice(0,5))
    },[products])

  return (
    <section id='best-sellers' className='my-10 scroll-mt-24'>
      <div className='text-center text-3xl py-8'>
        <Title text1={'Sản phẩm'} text2={'bán chạy'}/>
        <p className='w-3/4 m-auto text-xs sm:text-sm md:text-base text-gray-600'>
        Khám phá những sản phẩm bán chạy được nhiều khách hàng yêu thích. 
        Thiết kế hiện đại, chất lượng đảm bảo và phù hợp với xu hướng thời trang hiện nay.
        </p>
      </div>

      <div className='grid grid-cols-3 gap-3 sm:gap-5 md:gap-6 gap-y-6 sm:gap-y-8 md:gap-y-10'>
        {
            bestSeller.map((item,index)=>(
                <ProductItem
                  key={index}
                  id={item._id}
                  name={item.name}
                  image={item.image}
                  variants={item.variants}
                  mainImageUrl={item.mainImageUrl}
                  hoverImageUrl={item.hoverImageUrl}
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

export default BestSeller
