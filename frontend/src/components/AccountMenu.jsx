import { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShopContext } from '../context/ShopContext'
import { assets } from '../assets/assets'

const AccountMenu = () => {
  const { token, setToken, setCartItems, navigate } = useContext(ShopContext)
  const [open, setOpen] = useState(false)

  const logout = () => {
    navigate('/login')
    localStorage.removeItem('token')
    setToken('')
    setCartItems({})
  }

  return (
    <div
      className='relative'
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <img className='w-5 cursor-pointer' src={assets.profile_icon} alt='Tài khoản' />
      <div
        className={`absolute right-0 top-full pt-3 z-50 transition-all duration-200 ease-out ${
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'
        }`}
      >
        <div className='min-w-[220px] bg-white text-gray-900 shadow-lg border border-gray-100 py-2 text-sm'>
          {token ? (
            <>
              <button
                type='button'
                onClick={() => {
                  setOpen(false)
                  navigate('/account')
                }}
                className='block w-full text-left px-5 py-2.5 hover:bg-gray-50'
              >
                Tài khoản của tôi
              </button>
              <button
                type='button'
                onClick={() => {
                  setOpen(false)
                  navigate('/orders')
                }}
                className='block w-full text-left px-5 py-2.5 hover:bg-gray-50'
              >
                Đơn hàng của tôi
              </button>
              <button
                type='button'
                onClick={() => {
                  setOpen(false)
                  navigate('/wishlist')
                }}
                className='block w-full text-left px-5 py-2.5 hover:bg-gray-50'
              >
                Danh sách yêu thích
              </button>
              <hr className='my-1 border-gray-100' />
              <button
                type='button'
                onClick={() => {
                  setOpen(false)
                  logout()
                }}
                className='block w-full text-left px-5 py-2.5 text-red-600 hover:bg-gray-50'
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <button
                type='button'
                onClick={() => {
                  setOpen(false)
                  navigate('/login')
                }}
                className='block w-full text-left px-5 py-2.5 hover:bg-gray-50'
              >
                Đăng nhập
              </button>
              <button
                type='button'
                onClick={() => {
                  setOpen(false)
                  navigate('/register')
                }}
                className='block w-full text-left px-5 py-2.5 hover:bg-gray-50'
              >
                Tạo tài khoản
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AccountMenu
