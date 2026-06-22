import { useState } from 'react'
import PropTypes from 'prop-types'

const ReviewImageGallery = ({ images, thumbClassName = 'w-16 h-16' }) => {
  const [lightboxSrc, setLightboxSrc] = useState(null)
  const list = Array.isArray(images) ? images.filter(Boolean) : []

  if (!list.length) return null

  return (
    <>
      <div className='flex flex-wrap gap-2 mt-2'>
        {list.map((src, index) => (
          <button
            key={`${src}-${index}`}
            type='button'
            onClick={() => setLightboxSrc(src)}
            className='rounded-md overflow-hidden border border-gray-200 hover:ring-2 hover:ring-[#2563EB] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]'
            title='Xem ảnh phóng to'
          >
            <img
              src={src}
              alt={`Ảnh đính kèm ${index + 1}`}
              className={`${thumbClassName} object-cover`}
            />
          </button>
        ))}
      </div>

      {lightboxSrc && (
        <div
          className='fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4'
          onClick={() => setLightboxSrc(null)}
          role='presentation'
        >
          <button
            type='button'
            onClick={() => setLightboxSrc(null)}
            className='absolute right-4 top-4 text-3xl text-white hover:text-gray-200'
            aria-label='Đóng'
          >
            ×
          </button>
          <img
            src={lightboxSrc}
            alt='Ảnh đánh giá phóng to'
            className='max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl'
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

ReviewImageGallery.propTypes = {
  images: PropTypes.arrayOf(PropTypes.string),
  thumbClassName: PropTypes.string,
}

export default ReviewImageGallery
