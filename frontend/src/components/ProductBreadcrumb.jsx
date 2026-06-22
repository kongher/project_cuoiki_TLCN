import { Link } from 'react-router-dom'
import { getProductBreadcrumb } from '../utils/productBreadcrumb'

const ProductBreadcrumb = ({ product }) => {
  const crumbs = getProductBreadcrumb(product)
  if (!crumbs.length) return null

  return (
    <nav aria-label='Breadcrumb' className='text-sm text-gray-500 mb-4'>
      <ol className='flex flex-wrap items-center gap-1.5'>
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1
          return (
            <li key={`${crumb.label}-${idx}`} className='flex items-center gap-1.5 min-w-0'>
              {idx > 0 ? <span className='text-gray-300 select-none' aria-hidden='true'>&gt;</span> : null}
              {crumb.to && !isLast ? (
                <Link to={crumb.to} className='hover:text-gray-900 transition-colors truncate max-w-[12rem] sm:max-w-none'>
                  {crumb.label}
                </Link>
              ) : (
                <span className={`truncate max-w-[14rem] sm:max-w-none ${isLast ? 'text-gray-900 font-medium' : ''}`}>
                  {crumb.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default ProductBreadcrumb
