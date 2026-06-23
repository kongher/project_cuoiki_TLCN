import { useContext, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { ShopContext } from '../context/ShopContext'
import PasswordInput from '../components/PasswordInput'

const ForgotPassword = () => {
  const { backendUrl, token } = useContext(ShopContext)
  const navigate = useNavigate()

  const [step, setStep] = useState('email') // email | otp | reset
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSeconds, setOtpSeconds] = useState(0)
  const [loading, setLoading] = useState(false)
  const [resetToken, setResetToken] = useState('')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  useEffect(() => {
    if (token) navigate('/')
  }, [token, navigate])

  // Giảm thời gian còn lại của OTP mỗi giây
  useEffect(() => {
    if (otpSeconds <= 0) return undefined
    const t = window.setInterval(() => setOtpSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(t)
  }, [otpSeconds])

  const fieldClass =
    'w-full bg-gray-100 border-0 rounded-sm px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300'

  const normalizedEmail = () => email.trim().toLowerCase()
  const tokenKeyOf = (e) => `reset_token:${String(e || '').trim().toLowerCase()}`

  const clearResetToken = (e) => {
    setResetToken('')
    try {
      sessionStorage.removeItem(tokenKeyOf(e || normalizedEmail()))
    } catch (err) {
      // ignore
    }
  }
  // Khi component được mount, kiểm tra xem có reset token trong sessionStorage không
  useEffect(() => {
    const em = normalizedEmail()
    if (!em) return
    try {
      const t = sessionStorage.getItem(tokenKeyOf(em))
      if (t && !resetToken) setResetToken(t)
    } catch (err) {
      // ignore
    }
    // Khi email thay đổi, xóa reset token trong sessionStorage để tránh nhầm lẫn
  }, [email])

  const handleSendOtp = async (e) => {
    e.preventDefault()
    const value = normalizedEmail()
    if (!value) {
      toast.error('Vui lòng nhập email')
      return
    }
    clearResetToken(value)
    setLoading(true)
    try {
      const res = await axios.post(`${backendUrl}/api/user/forgot-password/send-otp`, {
        email: value,
      })
      if (res.data.success) {
        setEmail(value)
        setOtp('')
        setOtpSeconds(Number(res.data.expiresInSec) || 180)
        setStep('otp')
        toast.success(res.data.message || 'Đã gửi mã OTP tới email của bạn')
      } else {
        toast.error(res.data.message)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  // Xử lý xác thực OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!otp.trim()) {
      toast.error('Vui lòng nhập mã OTP')
      return
    }
    setLoading(true)
    try {
      const res = await axios.post(`${backendUrl}/api/user/forgot-password/verify-otp`, {
        email: normalizedEmail(),
        otp: otp.trim(),
      })
      if (res.data.success) {
        const rt = String(res.data.reset_token || '').trim()
        if (rt) {
          setResetToken(rt)
          try {
            sessionStorage.setItem(tokenKeyOf(normalizedEmail()), rt)
          } catch (err) {
            // ignore
          }
        }
        setStep('reset')
        toast.success('Xác thực thành công')
      } else {
        toast.error(res.data.message)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  // Xử lý gửi lại OTP
  const handleResendOtp = async () => {
    clearResetToken()
    setLoading(true)
    try {
      const res = await axios.post(`${backendUrl}/api/user/forgot-password/send-otp`, {
        email: normalizedEmail(),
      })
      if (res.data.success) {
        setOtpSeconds(Number(res.data.expiresInSec) || 180)
        toast.success('Đã gửi lại mã OTP tới email của bạn')
      } else {
        toast.error(res.data.message)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  // Xử lý đặt lại mật khẩu
  const handleResetPassword = async (e) => {
    e.preventDefault()
    const rt =
      resetToken ||
      (() => {
        try {
          return sessionStorage.getItem(tokenKeyOf(normalizedEmail())) || ''
        } catch {
          return ''
        }
      })()

    if (!rt) {
      toast.error('Vui lòng xác thực OTP trước')
      setStep('otp')
      return
    }

    if (password.length < 8) {
      toast.error('Mật khẩu tối thiểu 8 ký tự')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp')
      return
    }
    setLoading(true)
    try {
      const res = await axios.post(`${backendUrl}/api/user/forgot-password/reset`, {
        email: normalizedEmail(),
        reset_token: rt,
        password,
        confirmPassword,
      })
      if (res.data.success) {
        toast.success('Đổi mật khẩu thành công!')
        clearResetToken()
        navigate('/login')
      } else {
        if (res.data?.code === 'RESET_SESSION_EXPIRED' || res.data?.code === 'RESET_SESSION_INVALID') {
          toast.error(
            res.data.message ||
              'Phiên làm việc đã hết hạn do bạn thao tác quá lâu, vui lòng nhận lại mã OTP mới'
          )
          clearResetToken()
          setOtp('')
          setOtpSeconds(0)
          setPassword('')
          setConfirmPassword('')
          setStep('email')
          return
        }
        if (res.data?.code === 'RESET_OTP_REQUIRED') {
          toast.error(res.data.message || 'Vui lòng xác thực OTP trước')
          setStep('otp')
          return
        }
        toast.error(res.data.message)
      }
    } catch (err) {
      const data = err.response?.data
      if (data?.code === 'RESET_SESSION_EXPIRED' || data?.code === 'RESET_SESSION_INVALID') {
        toast.error(
          data.message || 'Phiên làm việc đã hết hạn do bạn thao tác quá lâu, vui lòng nhận lại mã OTP mới'
        )
        clearResetToken()
        setOtp('')
        setOtpSeconds(0)
        setPassword('')
        setConfirmPassword('')
        setStep('email')
        return
      }
      if (data?.code === 'RESET_OTP_REQUIRED') {
        toast.error(data.message || 'Vui lòng xác thực OTP trước')
        setStep('otp')
        return
      }
      toast.error(data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className='max-w-lg mx-auto py-10 sm:py-14 px-2 text-gray-800'>
      <h1 className='text-2xl sm:text-3xl font-bold tracking-tight'>LẤY LẠI MẬT KHẨU</h1>
      <p className='text-sm text-gray-500 mt-2 mb-8'>
        Vui lòng nhập địa chỉ email của bạn để nhận mã OTP và đặt lại mật khẩu.
      </p>

      {step === 'email' && (
        <form onSubmit={handleSendOtp} className='space-y-6'>
          <label className='block text-sm'>
            Email <span className='text-red-500'>*</span>
            <input
              type='email'
              className={`${fieldClass} mt-2 block`}
              placeholder='example@gmail.com'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete='email'
              required
            />
          </label>
          <button
            type='submit'
            disabled={loading}
            className='w-full bg-blue-600 text-white font-semibold py-3.5 hover:bg-blue-700 transition-colors active:bg-blue-800 disabled:opacity-60'
          >
            {loading ? 'ĐANG GỬI...' : 'GỬI MÃ OTP'}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerifyOtp} className='space-y-6'>
          <label className='block text-sm text-gray-500'>
            Email
            <input
              type='email'
              className={`${fieldClass} mt-2 block bg-gray-200`}
              value={email}
              readOnly
            />
          </label>
          <label className='block text-sm'>
            <span className='flex items-center justify-between gap-2'>
              <span>
                OTP <span className='text-red-500'>*</span>
              </span>
              {otpSeconds > 0 && (
                <span className='text-xs text-orange-600 font-normal whitespace-nowrap'>
                  OTP sẽ hết hạn trong: {otpSeconds} giây
                </span>
              )}
            </span>
            <input
              type='text'
              inputMode='numeric'
              maxLength={6}
              className={`${fieldClass} mt-2 block`}
              placeholder='Nhập mã OTP'
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
            />
          </label>
          <p className='text-right text-xs text-gray-600 -mt-2'>
            Bạn chưa nhận được OTP?{' '}
            <button
              type='button'
              onClick={handleResendOtp}
              disabled={loading}
              className='underline font-semibold hover:text-black disabled:opacity-50'
            >
              Gửi lại mã
            </button>
          </p>
          <button
            type='submit'
            disabled={loading}
            className='w-full bg-blue-600 text-white font-semibold py-3.5 hover:bg-blue-700 transition-colors active:bg-blue-800 disabled:opacity-60'
          >
            {loading ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN OTP'}
          </button>
        </form>
      )}

      {step === 'reset' && (
        <form onSubmit={handleResetPassword} className='space-y-5'>
          <label className='block text-sm'>
            Mật khẩu mới <span className='text-red-500'>*</span>
            <span className='block mt-2'>
              <PasswordInput
                className={`${fieldClass} pr-11 w-full`}
                placeholder='Mật khẩu mới'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete='new-password'
                required
                minLength={8}
              />
            </span>
          </label>
          <label className='block text-sm'>
            Xác nhận mật khẩu mới <span className='text-red-500'>*</span>
            <span className='block mt-2'>
              <PasswordInput
                className={`${fieldClass} pr-11 w-full`}
                placeholder='Xác nhận mật khẩu mới'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete='new-password'
                required
                minLength={8}
              />
            </span>
          </label>
          <button
            type='submit'
            disabled={loading}
            className='w-full bg-blue-600 text-white font-semibold py-3.5 hover:bg-blue-700 transition-colors active:bg-blue-800 disabled:opacity-60'
          >
            {loading ? 'ĐANG XỬ LÝ...' : 'CẬP NHẬT MẬT KHẨU'}
          </button>
        </form>
      )}

      <p className='text-sm text-center text-gray-600 mt-8'>
        <Link to='/login' className='font-semibold underline hover:text-black'>
          Quay lại Đăng nhập
        </Link>
      </p>
    </section>
  )
}

export default ForgotPassword
