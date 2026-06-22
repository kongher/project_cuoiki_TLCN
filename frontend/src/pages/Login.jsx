import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShopContext } from '../context/ShopContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import PasswordInput from '../components/PasswordInput'

const Login = () => {
  const { token, setToken, navigate, backendUrl } = useContext(ShopContext)
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmitHandler = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      const id = loginId.trim()
      let digits = id.replace(/\D/g, '')
      if (digits.length === 11 && digits.startsWith('84')) digits = `0${digits.slice(2)}`
      if (digits.length === 9) digits = `0${digits}`
      const body = /^0[0-9]{9}$/.test(digits)
        ? { phone: digits, password }
        : { email: id, password }

      const response = await axios.post(backendUrl + '/api/user/login', body)
      if (response.data.success) {
        setToken(response.data.token)
        localStorage.setItem('token', response.data.token)
        navigate('/')
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) navigate('/')
  }, [token, navigate])

  return (
    <form onSubmit={onSubmitHandler} className='flex flex-col items-center w-[90%] sm:max-w-md m-auto mt-14 gap-4 text-gray-800'>
      <div className='inline-flex items-center gap-2 mb-2 mt-10 w-full'>
        <p className='font-sans font-medium text-3xl'>Đăng nhập</p>
        <hr className='border-none h-[1.5px] flex-1 bg-gray-800' />
      </div>
      <p className='text-sm text-gray-500 w-full text-left -mt-2 mb-2'>
        Đăng nhập bằng email hoặc số điện thoại đã đăng ký
      </p>
      <input
        onChange={(e) => setLoginId(e.target.value)}
        value={loginId}
        type='text'
        className='w-full px-3 py-2 border border-gray-800 bg-gray-50'
        placeholder='Email hoặc số điện thoại'
        required
      />
      <PasswordInput
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder='Mật khẩu'
        className='w-full px-3 py-2 border border-gray-800 bg-gray-50 pr-11'
        autoComplete='current-password'
        required
      />

      <div className='w-full flex justify-between text-sm mt-[-8px]'>
        <Link to='/forgot-password' className='text-red-600 hover:text-red-700 transition-all'>
          Quên mật khẩu?
        </Link>
        <Link to='/register' className='cursor-pointer hover:text-red-600 transition-all font-medium'>
          Tạo tài khoản
        </Link>
      </div>

      <button
        disabled={loading}
        className='w-full bg-blue-600 text-white font-light px-8 py-3 mt-4 hover:bg-blue-700 transition-all duration-300 active:bg-blue-800 disabled:opacity-60'
      >
        {loading ? 'ĐANG XỬ LÝ...' : 'Đăng nhập'}
      </button>
    </form>
  )
}

export default Login
