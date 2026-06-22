import PropTypes from 'prop-types'
import { notificationTypeIcon } from '../utils/notificationHelpers'

const MessageSquareIcon = ({ className = 'w-5 h-5' }) => (
  <svg
    className={className}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden
  >
    <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
  </svg>
)

const NotificationTypeIcon = ({ type, className }) => {
  if (type === 'review_reply') {
    return (
      <span
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#2563EB] ${className || ''}`}
        aria-hidden
      >
        <MessageSquareIcon />
      </span>
    )
  }

  if (type === 'vip') {
    return (
      <span
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-lg ${className || ''}`}
        aria-hidden
      >
        👑
      </span>
    )
  }

  return (
    <span className={`text-lg shrink-0 ${className || ''}`} aria-hidden>
      {notificationTypeIcon(type)}
    </span>
  )
}

NotificationTypeIcon.propTypes = {
  type: PropTypes.string,
  className: PropTypes.string,
}

export default NotificationTypeIcon
