import { useContext, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { ShopContext } from '../context/ShopContext'
import PasswordInput from '../components/PasswordInput'
import { getPasswordStrength } from '../utils/passwordStrength'

const normalizePhoneInput = (v) => String(v || '').replace(/\D/g, '').slice(0, 10)

const Register = () => {
  const { backendUrl, token } = useContext(ShopContext)
  const navigate = useNavigate()

  const [step, setStep] = useState('email') // email | otp | info
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSeconds, setOtpSeconds] = useState(0)
  const [loading, setLoading] = useState(false)
  const verifyingRef = useRef(false)
  const [registerToken, setRegisterToken] = useState('')

  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [birthday, setBirthday] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const strength = getPasswordStrength(password)

  useEffect(() => {
    if (token) navigate('/')
  }, [token, navigate])

  useEffect(() => {
    if (otpSeconds <= 0) return undefined
    const t = window.setInterval(() => setOtpSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(t)
  }, [otpSeconds])

  const normalizedEmail = () => email.trim().toLowerCase()
  const tokenKeyOf = (e) => `register_token:${String(e || '').trim().toLowerCase()}`

  const clearRegisterToken = (e) => {
    setRegisterToken('')
    try {
      sessionStorage.removeItem(tokenKeyOf(e || normalizedEmail()))
    } catch (err) {
      // ignore
    }
  }

  useEffect(() => {
    // hydrate token if user reloads page after verify OTP
    const em = normalizedEmail()
    if (!em) return
    try {
      const t = sessionStorage.getItem(tokenKeyOf(em))
      if (t && !registerToken) setRegisterToken(t)
    } catch (err) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email])

  const handleSendOtp = async (e) => {
    e?.preventDefault?.()
    const value = normalizedEmail()
    if (!value) {
      toast.error('Vui lòng nhập email')
      return
    }
    clearRegisterToken(value)
    setLoading(true)
    try {
      const res = await axios.post(`${backendUrl}/api/user/register/send-otp`, { email: value })
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

  const verifyOtp = async (code) => {
    if (verifyingRef.current) return
    verifyingRef.current = true
    setLoading(true)
    try {
      const res = await axios.post(`${backendUrl}/api/user/register/verify-otp`, {
        email: normalizedEmail(),
        otp: code.trim(),
      })
      if (res.data.success) {
        const rt = String(res.data.register_token || '').trim()
        if (rt) {
          setRegisterToken(rt)
          try {
            sessionStorage.setItem(tokenKeyOf(normalizedEmail()), rt)
          } catch (err) {
            // ignore
          }
        }
        setStep('info')
        toast.success('Xác thực email thành công')
      } else {
        toast.error(res.data.message)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
      verifyingRef.current = false
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!otp.trim()) {
      toast.error('Vui lòng nhập mã OTP')
      return
    }
    await verifyOtp(otp)
  }

  useEffect(() => {
    if (step !== 'otp' || otp.length !== 6 || loading) return
    verifyOtp(otp)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step])

  const handleResendOtp = async () => {
    clearRegisterToken()
    setLoading(true)
    try {
      const res = await axios.post(`${backendUrl}/api/user/register/resend-otp`, {
        email: normalizedEmail(),
      })
      if (res.data.success) {
        setOtpSeconds(Number(res.data.expiresInSec) || 180)
        setOtp('')
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

  const handleRegister = async (e) => {
    e.preventDefault()
    const rt =
      registerToken ||
      (() => {
        try {
          return sessionStorage.getItem(tokenKeyOf(normalizedEmail())) || ''
        } catch {
          return ''
        }
      })()

    if (!rt) {
      toast.error('Vui lòng xác thực OTP email trước')
      setStep('otp')
      return
    }

    const p = normalizePhoneInput(phone)
    if (p.length < 10 || !p.startsWith('0')) {
      toast.error('Vui lòng nhập số điện thoại hợp lệ')
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
      const res = await axios.post(`${backendUrl}/api/user/register`, {
        email: normalizedEmail(),
        register_token: rt,
        phone: p,
        name,
        gender,
        birthday,
        password,
        confirmPassword,
      })
      if (res.data.success) {
        toast.success('Đăng ký thành công')
        clearRegisterToken()
        navigate('/login')
      } else {
        toast.error(res.data.message)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  const fieldClass =
    'w-full bg-gray-100 border-0 rounded-sm px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300'

  const Btn = ({ children, type = 'submit' }) => (
    <button
      type={type}
      disabled={loading}
      className='w-full bg-blue-600 text-white font-semibold py-3.5 hover:bg-blue-700 transition-colors active:bg-blue-800 disabled:opacity-60'
    >
      {children}
    </button>
  )

  return (
    <section className='max-w-lg mx-auto py-10 sm:py-14 px-2'>
      <h1 className='text-2xl sm:text-3xl font-bold text-gray-800 tracking-tight'>TẠO TÀI KHOẢN</h1>
      <p className='text-sm text-gray-500 mt-2 mb-8'>
        Hãy đăng ký ngay để tích lũy điểm thành viên và nhận được những ưu đãi tốt hơn!
      </p>

      {step === 'email' && (
        <form onSubmit={handleSendOtp} className='space-y-6'>
          <label className='block text-sm text-gray-800'>
            Email <span className='text-red-500'>*</span>
            <input
              type='email'
              className={`${fieldClass} mt-2 block`}
              placeholder='Nhập email của bạn...'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete='email'
              required
            />
          </label>
          <Btn>{loading ? 'ĐANG GỬI...' : 'TIẾP TỤC'}</Btn>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerifyOtp} className='space-y-6'>
          <label className='block text-sm text-gray-800'>
            Email <span className='text-red-500'>*</span>
            <input
              type='email'
              className={`${fieldClass} mt-2 block bg-gray-200`}
              value={email}
              readOnly
            />
          </label>
          <label className='block text-sm text-gray-800'>
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
              Nhấn vào đây để thử lại
            </button>
          </p>
          <Btn>{loading ? 'ĐANG XÁC THỰC...' : 'TIẾP TỤC'}</Btn>
        </form>
      )}

      {step === 'info' && (
        <form onSubmit={handleRegister} className='space-y-5'>
          <label className='block text-sm text-gray-800'>
            Email <span className='text-red-500'>*</span>
            <input
              type='email'
              className={`${fieldClass} mt-2 block bg-gray-200`}
              value={email}
              readOnly
            />
          </label>
          <label className='block text-sm text-gray-800'>
            Số điện thoại <span className='text-red-500'>*</span>
            <input
              type='tel'
              className={`${fieldClass} mt-2 block`}
              placeholder='Số điện thoại'
              value={phone}
              onChange={(e) => setPhone(normalizePhoneInput(e.target.value))}
              required
            />
          </label>
          <label className='block text-sm text-gray-800'>
            Tên <span className='text-red-500'>*</span>
            <input
              type='text'
              className={`${fieldClass} mt-2 block`}
              placeholder='Tên'
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className='block text-sm text-gray-800'>
            Giới tính <span className='text-red-500'>*</span>
            <select
              className={`${fieldClass} mt-2 block appearance-none`}
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              required
            >
              <option value=''>Chọn giới tính</option>
              <option value='male'>Nam</option>
              <option value='female'>Nữ</option>
              <option value='other'>Khác</option>
            </select>
          </label>
          <label className='block text-sm text-gray-800'>
            Ngày sinh <span className='text-red-500'>*</span>
            <input
              type='date'
              className={`${fieldClass} mt-2 block`}
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              required
            />
          </label>
          <label className='block text-sm text-gray-800'>
            Mật khẩu <span className='text-red-500'>*</span>
            <span className='block mt-2'>
              <PasswordInput
                className={`${fieldClass} pr-11 w-full`}
                placeholder='Mật khẩu'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete='new-password'
                required
                minLength={8}
              />
            </span>
            {password && (
              <>
                <span className={`block text-xs px-3 py-2 rounded mt-2 ${strength.barClass} ${strength.textClass}`}>
                  Độ mạnh mật khẩu: {strength.label}
                </span>
                {password.length < 8 && (
                  <span className='block text-xs text-red-500 mt-1'>
                    Mật khẩu từ 8 ký tự, bao gồm chữ và số.
                  </span>
                )}
              </>
            )}
          </label>
          <label className='block text-sm text-gray-800'>
            Xác nhận mật khẩu <span className='text-red-500'>*</span>
            <span className='block mt-2'>
              <PasswordInput
                className={`${fieldClass} pr-11 w-full`}
                placeholder='Xác nhận mật khẩu'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete='new-password'
                required
                minLength={8}
              />
            </span>
          </label>
          <Btn>{loading ? 'ĐANG XỬ LÝ...' : 'HOÀN THÀNH ĐĂNG KÝ'}</Btn>
        </form>
      )}

      <p className='text-sm text-center text-gray-600 mt-8'>
        Đã có tài khoản?{' '}
        <Link to='/login' className='font-semibold underline hover:text-black'>
          Đăng nhập
        </Link>
      </p>
    </section>
  )
}

export default Register
