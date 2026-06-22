/** Chuẩn hóa SĐT VN: chỉ giữ số, 10 chữ số bắt đầu 0 */
export const normalizePhone = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 11 && digits.startsWith('84')) return `0${digits.slice(2)}`
  if (digits.length === 10 && digits.startsWith('0')) return digits
  if (digits.length === 9) return `0${digits}`
  return digits
}

export const isValidPhone = (phone) => /^0[0-9]{9}$/.test(normalizePhone(phone))
