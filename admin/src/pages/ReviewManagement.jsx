import { useEffect, useState } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import { toast } from 'react-toastify'
import ReviewImageGallery from '../components/ReviewImageGallery'

const ReviewManagement = ({ token, onReplied }) => {
  const [reviews, setReviews] = useState([])
  const [modalMode, setModalMode] = useState(null) // null | 'reply' | 'view'
  const [selectedReview, setSelectedReview] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchReviews = async () => {
    if (!token) return
    try {
      const response = await axios.get(
        backendUrl + '/api/order/reviews',
        { headers: { token } }
      )
      if (response.data.success) {
        setReviews(response.data.reviews)
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      console.log(error)
      toast.error('Không thể tải danh sách đánh giá')
    }
  }

  const openReplyModal = (review) => {
    setSelectedReview(review)
    setReplyText('')
    setModalMode('reply')
  }

  const openViewReplyModal = (review) => {
    setSelectedReview(review)
    setModalMode('view')
  }

  const closeModal = () => {
    setModalMode(null)
    setSelectedReview(null)
    setReplyText('')
  }

  const sendReply = async () => {
    if (!replyText.trim()) {
      toast.error('Vui lòng nhập nội dung phản hồi')
      return
    }

    if (!selectedReview) return

    setIsSubmitting(true)
    console.log('Sending reply for review:', selectedReview.orderId, selectedReview.productId)

    try {
      const response = await axios.post(
        backendUrl + '/api/order/reply-review',
        {
          orderId: selectedReview.orderId,
          productId: selectedReview.productId,
          variant_id: selectedReview.variant_id || selectedReview.size,
          size: selectedReview.size || selectedReview.variant_id,
          reply: replyText,
        },
        { headers: { token } }
      )

      console.log('Reply response:', response.data)

      if (response.data.success) {
        toast.success('Phản hồi đã gửi thành công')
        setReviews((prev) =>
          prev.map((item) =>
            item.orderId === selectedReview.orderId &&
            item.productId === selectedReview.productId &&
            (item.variant_id || item.size) === (selectedReview.variant_id || selectedReview.size)
              ? { ...item, replied: true, adminReply: replyText }
              : item
          )
        )
        if (typeof onReplied === 'function') {
          onReplied({
            orderId: selectedReview.orderId,
            productId: selectedReview.productId,
            variant_id: selectedReview.variant_id || selectedReview.size,
          })
        }
        closeModal()
      } else {
        toast.error(response.data.message || 'Lỗi gửi phản hồi')
      }
    } catch (error) {
      console.log('Reply error:', error)
      toast.error('Lỗi hệ thống, vui lòng thử lại')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [token])

  return (
    <div>
      <h3 className='text-xl font-semibold mb-4'>Quản lý đánh giá</h3>

      <div className='overflow-x-auto bg-white border rounded-lg shadow-sm'>
        <table className='min-w-full text-left'>
          <thead className='bg-gray-100 text-xs uppercase text-gray-600'>
            <tr>
              <th className='px-4 py-3'>Sản phẩm</th>
              <th className='px-4 py-3'>Khách hàng</th>
              <th className='px-4 py-3'>Sao</th>
              <th className='px-4 py-3'>Bình luận</th>
              <th className='px-4 py-3'>Ngày gửi</th>
              <th className='px-4 py-3'>Phản hồi</th>
            </tr>
          </thead>
          <tbody>
            {reviews.length === 0 ? (
              <tr>
                <td colSpan='6' className='px-4 py-8 text-center text-gray-500'>Không có đánh giá mới</td>
              </tr>
            ) : (
              reviews.map((review, index) => (
                <tr
                  key={`${review.orderId}-${review.productId}-${review.variant_id || review.size || index}`}
                  className='border-t'
                >
                  <td className='px-4 py-4 align-top'>
                    <div className='flex items-center gap-3'>
                      <img src={review.productImage} alt={review.productName} className='w-16 h-16 object-cover rounded-md border' />
                      <div>
                        <p className='font-medium'>{review.productName}</p>
                        {(review.size || review.variant_id) && (
                          <p className='text-xs text-gray-500 mt-0.5'>Size: {review.size || review.variant_id}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className='px-4 py-4 align-top'>
                    <p className='font-medium'>{review.customerName}</p>
                  </td>
                  <td className='px-4 py-4 align-top'>
                    <div className='flex items-center gap-1 text-yellow-500'>
                      {Array.from({ length: 5 }, (_, idx) => (
                        <span key={idx}>{idx < review.rating ? '⭐' : '☆'}</span>
                      ))}
                    </div>
                  </td>
                  <td className='px-4 py-4 align-top max-w-[360px] break-words'>
                    <p className='text-gray-800 whitespace-pre-wrap'>{review.comment || '—'}</p>
                    <ReviewImageGallery images={review.images} />
                  </td>
                  <td className='px-4 py-4 align-top'>
                    {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className='px-4 py-4 align-top'>
                    {review.replied ? (
                      <button
                        type='button'
                        onClick={() => openViewReplyModal(review)}
                        className='text-sm text-blue-600 font-medium underline underline-offset-2 hover:text-blue-800 transition-colors'
                      >
                        Đã phản hồi
                      </button>
                    ) : (
                      <button
                        onClick={() => openReplyModal(review)}
                        className='px-3 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 transition'
                      >
                        Phản hồi
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalMode === 'reply' && selectedReview && (
        <div
          className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'
          onClick={closeModal}
          role='presentation'
        >
          <div
            className='bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'
            onClick={(e) => e.stopPropagation()}
            role='dialog'
            aria-modal='true'
          >
            <div className='p-6'>
              <h3 className='text-xl font-semibold mb-4 text-gray-800'>
                Phản hồi khách hàng {selectedReview.customerName}
              </h3>

              <div className='mb-4'>
                <h4 className='font-medium text-gray-700 mb-2'>Bình luận của khách:</h4>
                <div className='bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500'>
                  <p className='text-gray-700 whitespace-pre-wrap'>
                    {selectedReview.comment || 'Không có bình luận'}
                  </p>
                  <ReviewImageGallery images={selectedReview.images} thumbClassName='w-16 h-16' />
                </div>
              </div>

              <div className='mb-4'>
                <label className='block text-sm font-medium text-gray-700 mb-2'>Nội dung phản hồi</label>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className='w-full border border-gray-300 rounded-lg p-3 min-h-[120px] resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  placeholder='Nhập nội dung phản hồi...'
                  disabled={isSubmitting}
                />
              </div>

              <div className='flex gap-3 justify-end'>
                <button
                  type='button'
                  onClick={closeModal}
                  className='px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition'
                  disabled={isSubmitting}
                >
                  Hủy
                </button>
                <button
                  type='button'
                  onClick={sendReply}
                  disabled={isSubmitting || !replyText.trim()}
                  className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed'
                >
                  {isSubmitting ? 'Đang gửi...' : 'Gửi phản hồi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalMode === 'view' && selectedReview && (
        <div
          className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'
          onClick={closeModal}
          role='presentation'
        >
          <div
            className='bg-white rounded-xl shadow-xl max-w-lg w-full'
            onClick={(e) => e.stopPropagation()}
            role='dialog'
            aria-modal='true'
            aria-labelledby='view-reply-title'
          >
            <div className='p-6'>
              <h3 id='view-reply-title' className='text-lg font-semibold text-gray-900 mb-1'>
                Nội dung phản hồi
              </h3>
              <p className='text-sm text-gray-500 mb-4'>
                Khách: <span className='font-medium text-gray-800'>{selectedReview.customerName}</span>
                {selectedReview.productName ? (
                  <>
                    {' '}
                    · SP: <span className='font-medium text-gray-800'>{selectedReview.productName}</span>
                  </>
                ) : null}
              </p>
              <div className='bg-blue-50 border border-blue-100 rounded-lg p-4'>
                <p className='text-sm text-gray-800 whitespace-pre-wrap'>
                  {selectedReview.adminReply?.trim() || 'Không có nội dung phản hồi.'}
                </p>
              </div>
              <div className='mt-6 flex justify-end'>
                <button
                  type='button'
                  onClick={closeModal}
                  className='px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors'
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReviewManagement
