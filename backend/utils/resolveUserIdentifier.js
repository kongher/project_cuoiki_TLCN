import validator from 'validator'
import { normalizePhone, isValidPhone } from './phone.js'

export const resolveUserIdentifier = (raw) => {
  const id = String(raw || '').trim()
  if (!id) {
    return { ok: false, message: 'Vui lòng nhập email hoặc số điện thoại' }
  }

  const phone = normalizePhone(id)
  if (isValidPhone(phone) || isValidPhone(id)) {
    const p = isValidPhone(phone) ? phone : normalizePhone(id)
    return {
      ok: true,
      type: 'phone',
      resetKey: `phone:${p}`,
      phone: p,
      email: null,
    }
  }

  if (validator.isEmail(id)) {
    const email = id.toLowerCase()
    return {
      ok: true,
      type: 'email',
      resetKey: `email:${email}`,
      phone: null,
      email,
    }
  }

  return { ok: false, message: 'Email hoặc số điện thoại không hợp lệ' }
}
