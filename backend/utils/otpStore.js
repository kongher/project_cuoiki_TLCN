import crypto from 'crypto'

const OTP_TTL_MS = 3 * 60 * 1000 // 3 phút (chỉ để nhập/verify OTP)
const REGISTER_TOKEN_TTL_MS = 15 * 60 * 1000 // 15 phút (thời gian điền form + submit)
const store = new Map()

const keyOf = (email) => `reg:${String(email || '').trim().toLowerCase()}`

const generateSixDigitOtp = () => String(Math.floor(100000 + Math.random() * 900000))
const generateRegisterToken = () => crypto.randomBytes(24).toString('hex')

export const createRegisterOtp = (email) => {
  const key = keyOf(email)
  const code = process.env.REGISTER_OTP_FIXED || generateSixDigitOtp()
  const entry = {
    code,
    otpExpiresAt: Date.now() + OTP_TTL_MS,
    verified: false,
    registerToken: '',
    registerTokenExpiresAt: 0,
  }
  store.set(key, entry)
  return { code, expiresInSec: Math.floor(OTP_TTL_MS / 1000) }
}

export const verifyRegisterOtp = (email, otp) => {
  const key = keyOf(email)
  const entry = store.get(key)
  const expiredMsg = 'Mã OTP không chính xác hoặc đã hết hạn'
  if (!entry) return { ok: false, message: expiredMsg }
  if (Date.now() > entry.otpExpiresAt) {
    store.delete(key)
    return { ok: false, message: expiredMsg }
  }
  if (String(otp || '').trim() !== String(entry.code)) {
    return { ok: false, message: expiredMsg }
  }
  entry.verified = true
  entry.registerToken = generateRegisterToken()
  entry.registerTokenExpiresAt = Date.now() + REGISTER_TOKEN_TTL_MS
  store.set(key, entry)
  return { ok: true, registerToken: entry.registerToken, expiresInSec: Math.floor(REGISTER_TOKEN_TTL_MS / 1000) }
}

export const isEmailOtpVerified = (email) => {
  const entry = store.get(keyOf(email))
  return Boolean(entry?.verified && entry?.registerToken && Date.now() <= (entry.registerTokenExpiresAt || 0))
}

/** @deprecated dùng isEmailOtpVerified */
export const isPhoneOtpVerified = isEmailOtpVerified

export const verifyRegisterToken = (email, registerToken) => {
  const entry = store.get(keyOf(email))
  if (!entry?.verified) return { ok: false, message: 'Vui lòng xác thực OTP email trước' }
  if (!entry?.registerToken || !entry.registerTokenExpiresAt) {
    return { ok: false, message: 'Phiên đăng ký đã hết hạn. Vui lòng xác thực OTP lại' }
  }
  if (Date.now() > entry.registerTokenExpiresAt) {
    store.delete(keyOf(email))
    return { ok: false, message: 'Phiên đăng ký đã hết hạn. Vui lòng xác thực OTP lại' }
  }
  if (String(registerToken || '').trim() !== String(entry.registerToken)) {
    return { ok: false, message: 'register_token không hợp lệ. Vui lòng xác thực OTP lại' }
  }
  return { ok: true }
}

export const clearRegisterOtp = (email) => {
  store.delete(keyOf(email))
}

export const getOtpRemainingSec = (email) => {
  const entry = store.get(keyOf(email))
  if (!entry) return 0
  return Math.max(0, Math.floor(((entry.otpExpiresAt || 0) - Date.now()) / 1000))
}
