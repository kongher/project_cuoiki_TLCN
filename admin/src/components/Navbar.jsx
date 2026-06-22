import { useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'

const Navbar = ({ setToken, notificationCount, pendingReviewCount, pendingOrderCount }) => {
  const navigate = useNavigate()

  return (
    <div className='flex items-center py-2 px-[4%] justify-between border-b bg-white'>
        <img className='w-[max(10%,80px)]' src={assets.logo} alt="" />
        <div className='flex items-center gap-4'>
          <button
            type='button'
            onClick={() => {
              navigate('/notifications')
            }}
            className='relative p-2 rounded-full hover:bg-gray-100 transition'
          >
            <span className='text-xl'>🔔</span>
            {notificationCount > 0 && (
              <span className='absolute -top-1 -right-1 min-w-[18px] h-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center px-1'>
                {notificationCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setToken('')} 
            className='bg-gray-600 text-white px-5 py-2 sm:px-7 sm:py-2 rounded-full text-xs sm:text-sm hover:bg-red-600 transition-all duration-300 active:bg-red-700 font-medium'
          >
            Đăng xuất
          </button>
        </div>
    </div>
  )
}

export default Navbar