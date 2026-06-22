import { useLocation, useNavigate } from 'react-router-dom'
import { resolveProductTags, getProductTagLabel, getProductTagLink } from '../config/productTags'
import { tagValueFromStored } from '../config/productTagDestinations'
import { navigateBannerLink } from '../config/bannerDestinations'

const ProductTagLinks = ({ product, className = '' }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const tags = resolveProductTags(product)
  if (!tags.length) return null

  const onTagClick = (e, link) => {
    e.preventDefault()
    e.stopPropagation()
    navigateBannerLink(link, {
      navigate,
      pathname: location.pathname,
      locationPathname: location.pathname,
    })
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => {
        const label = getProductTagLabel(tag)
        const link = getProductTagLink(tag)
        const key = tagValueFromStored(tag)
        if (link) {
          return (
            <button
              key={key}
              type='button'
              onClick={(e) => onTagClick(e, link)}
              className='text-xs font-medium px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors'
            >
              {label}
            </button>
          )
        }
        return (
          <span
            key={key}
            className='text-xs font-medium px-2.5 py-1 rounded-full border border-gray-200 bg-gray-100 text-gray-700'
          >
            {label}
          </span>
        )
      })}
    </div>
  )
}

export default ProductTagLinks
