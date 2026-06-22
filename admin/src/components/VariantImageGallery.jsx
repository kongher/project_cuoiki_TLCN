import { assets } from '../assets/assets'

const VariantImageGallery = ({
  variant,
  onChange,
  onRemoveVariant,
  canRemoveVariant,
}) => {
  const v = variant || {}
  const items = Array.isArray(v.imageItems) ? v.imageItems : []
  const existingHoverUrl = String(v.hoverUrl || items.find((it) => it.is_hover)?.url || '').trim()
  const galleryOnly = items.filter((it) => !it.is_main && !it.is_hover)

  return (
    <div className='border rounded p-4 bg-white'>
      <div className='flex flex-col gap-3'>
        <div className='flex items-start justify-between gap-3 flex-wrap'>
          <div className='flex gap-3 flex-wrap'>
            <div>
              <p className='text-sm font-medium mb-1'>Thumbnail</p>
              <label className='cursor-pointer block'>
                <img
                  className='w-16 h-16 object-cover border rounded'
                  src={
                    v.thumbnailFile
                      ? URL.createObjectURL(v.thumbnailFile)
                      : v.existingThumbnail || assets.upload_area
                  }
                  alt=''
                />
                <input
                  type='file'
                  hidden
                  accept='image/*'
                  onChange={(e) =>
                    onChange((prev) => ({ ...prev, thumbnailFile: e.target.files?.[0] || null }))
                  }
                />
              </label>
            </div>

            <div>
              <p className='text-sm font-medium mb-1'>Ảnh chính</p>
              <label className='cursor-pointer block'>
                <img
                  className='w-16 h-16 object-cover border rounded ring-2 ring-blue-500'
                  src={
                    v.mainFile
                      ? URL.createObjectURL(v.mainFile)
                      : items.find((it) => it.is_main)?.url || items[0]?.url || assets.upload_area
                  }
                  alt=''
                />
                <input
                  type='file'
                  hidden
                  accept='image/*'
                  onChange={(e) =>
                    onChange((prev) => ({ ...prev, mainFile: e.target.files?.[0] || null }))
                  }
                />
              </label>
            </div>

            <div>
              <p className='text-sm font-medium mb-1'>Ảnh khi Hover</p>
              <label className='cursor-pointer block'>
                <img
                  className='w-16 h-16 object-cover border rounded ring-2 ring-violet-500'
                  src={
                    v.hoverFile
                      ? URL.createObjectURL(v.hoverFile)
                      : existingHoverUrl || assets.upload_area
                  }
                  alt=''
                />
                <input
                  type='file'
                  hidden
                  accept='image/*'
                  onChange={(e) =>
                    onChange((prev) => ({ ...prev, hoverFile: e.target.files?.[0] || null }))
                  }
                />
              </label>
            </div>
          </div>

          <button
            type='button'
            onClick={onRemoveVariant}
            className='text-sm px-3 py-2 border rounded hover:bg-gray-50'
            disabled={!canRemoveVariant}
          >
            Xóa màu
          </button>
        </div>

        <div className='w-full'>
          <p className='text-xs text-gray-600 mb-2'>Ảnh mô tả</p>

          <div className='flex flex-wrap gap-3'>
            {galleryOnly.map((it) => (
              <div key={it.url} className='relative w-[88px] h-[88px]'>
                <img src={it.url} alt='' className='w-full h-full object-cover border rounded' />
              </div>
            ))}

            {(v.gallerySlots || [null, null, null]).map((slot, gi) => (
              <div key={`new-${gi}`} className='relative w-[88px] h-[88px]'>
                <label className='cursor-pointer flex flex-col items-center justify-center w-full h-full border border-dashed border-gray-300 rounded bg-gray-50 hover:bg-gray-100'>
                  {slot ? (
                    <img src={URL.createObjectURL(slot)} alt='' className='w-full h-full object-cover rounded' />
                  ) : (
                    <>
                      <img src={assets.upload_area} alt='' className='w-7 h-7 opacity-70' />
                      <span className='text-[10px] text-gray-600 mt-1'>Upload</span>
                    </>
                  )}
                  <input
                    type='file'
                    hidden
                    accept='image/*'
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      onChange((prev) => {
                        const next = [...(prev.gallerySlots || [])]
                        next[gi] = file
                        return { ...prev, gallerySlots: next }
                      })
                    }}
                  />
                </label>
                {slot ? (
                  <button
                    type='button'
                    className='absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black text-white text-xs leading-5'
                    onClick={() =>
                      onChange((prev) => {
                        const next = [...(prev.gallerySlots || [])]
                        next[gi] = null
                        return { ...prev, gallerySlots: next }
                      })
                    }
                  >
                    ×
                  </button>
                ) : null}
              </div>
            ))}

            <button
              type='button'
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  gallerySlots: [...(prev.gallerySlots || []), null],
                }))
              }
              className='w-[88px] h-[88px] border border-gray-300 rounded text-xs text-gray-700 hover:bg-gray-50'
            >
              + Thêm ảnh
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VariantImageGallery
