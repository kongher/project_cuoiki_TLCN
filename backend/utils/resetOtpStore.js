import crypto from 'crypto'

const OTP_TTL_MS = 3 * 60 * 1000 // 3 phút (chỉ để nhập/verify OTP)
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000 // 15 phút (thời gian người dùng nhập mật khẩu mới)

const store = new Map()

const generateSixDigitOtp = () => String(Math.floor(100000 + Math.random() * 900000))
const generateResetToken = () => crypto.randomBytes(24).toString('hex')

export const createResetOtp = (resetKey, userId) => {
  const code =
    process.env.FORGOT_OTP_FIXED ||
    process.env.RESET_OTP_FIXED ||
    generateSixDigitOtp()

  store.set(String(resetKey), {
    code,
    otpExpiresAt: Date.now() + OTP_TTL_MS,
    verified: false,
    userId: String(userId),
    resetToken: '',
    resetTokenExpiresAt: 0,
  })

  return { code, expiresInSec: Math.floor(OTP_TTL_MS / 1000) }
}

export const verifyResetOtp = (resetKey, otp) => {
  const key = String(resetKey)
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
  entry.resetToken = generateResetToken()
  entry.resetTokenExpiresAt = Date.now() + RESET_TOKEN_TTL_MS
  store.set(key, entry)
  return {
    ok: true,
    userId: entry.userId,
    resetToken: entry.resetToken,
    expiresInSec: Math.floor(RESET_TOKEN_TTL_MS / 1000),
  }
}

export const isResetOtpVerified = (resetKey) => {
  const entry = store.get(String(resetKey))
  return Boolean(entry?.verified && entry?.resetToken && Date.now() <= (entry.resetTokenExpiresAt || 0))
}

export const getResetUserId = (resetKey) => {
  const entry = store.get(String(resetKey))
  if (!entry?.verified || !entry?.resetToken || Date.now() > (entry.resetTokenExpiresAt || 0)) return null
  return entry.userId
}

export const verifyResetToken = (resetKey, resetToken) => {
  const entry = store.get(String(resetKey))
  if (!entry?.verified) return { ok: false, code: 'RESET_OTP_REQUIRED' }

  if (!entry?.resetToken || !entry.resetTokenExpiresAt) {
    return { ok: false, code: 'RESET_SESSION_EXPIRED' }
  }
  if (Date.now() > entry.resetTokenExpiresAt) {
    store.delete(String(resetKey))
    return { ok: false, code: 'RESET_SESSION_EXPIRED' }
  }
  if (String(resetToken || '').trim() !== String(entry.resetToken)) {
    return { ok: false, code: 'RESET_SESSION_INVALID' }
  }
  return { ok: true, userId: entry.userId }
}

export const clearResetOtp = (resetKey) => {
  store.delete(String(resetKey))
}

export const getResetOtpRemainingSec = (resetKey) => {
  const entry = store.get(String(resetKey))
  if (!entry) return 0
  return Math.max(0, Math.floor(((entry.otpExpiresAt || 0) - Date.now()) / 1000))
}
