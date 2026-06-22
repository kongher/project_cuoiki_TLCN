import { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../context/ShopContext'
import Title from './Title';
import ProductItem from './ProductItem';

const RelatedProducts = ({category,subCategory}) => {

    const { products } = useContext(ShopContext);
    const [related,setRelated] = useState([]);

    useEffect(()=>{

        if (products.length > 0) {
            
            let productsCopy = products.slice();
            
            productsCopy = productsCopy.filter((item) => category === item.category);
            productsCopy = productsCopy.filter((item) => subCategory === item.subCategory);

            setRelated(productsCopy.slice(0,5));
        }
        
    },[products])

  return (
    <div className='my-24'>
      <div className=' text-center text-3xl py-2'>
        <Title text1={'SẢN PHẨM'} text2={"LIÊN QUAN"} />
      </div>

      <div className='grid grid-cols-3 gap-3 sm:gap-5 md:gap-6 gap-y-6 sm:gap-y-8 md:gap-y-10'>
        {related.map((item,index)=>(
            <ProductItem
              key={index}
              id={item._id}
              name={item.name}
              price={item.price}
              image={item.image}
              variants={item.variants}
              mainImageUrl={item.mainImageUrl}
              hoverImageUrl={item.hoverImageUrl}
              discountPercent={item.discountPercent}
              salePrice={item.salePrice}
            />
        ))}
      </div>
    </div>
  )
}

export default RelatedProducts
