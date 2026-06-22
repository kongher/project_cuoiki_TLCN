import { useEffect } from 'react'

const AddToCartSuccessModal = ({ open, productName, onClose }) => {
  useEffect(() => {
    if (!open) return undefined
    const timer = window.setTimeout(onClose, 4000)
    return () => window.clearTimeout(timer)
  }, [open, onClose])

  if (!open) return null

  const label = String(productName || 'sản phẩm').trim()

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white px-8 py-10 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-to-cart-success-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-2xl leading-none text-gray-400 hover:text-gray-700"
          aria-label="Đóng"
        >
          ×
        </button>

        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-emerald-500">
          <svg className="h-10 w-10 text-emerald-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <p
          id="add-to-cart-success-title"
          className="text-center text-base leading-relaxed text-gray-800 sm:text-lg"
        >
          bạn đã thêm <span className="font-semibold">{label}</span> vào giỏ hàng
        </p>
      </div>
    </div>
  )
}

export default AddToCartSuccessModal
