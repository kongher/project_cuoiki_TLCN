export const formatDateVi = (ts) => {
  if (!ts) return ''
  return new Date(Number(ts)).toLocaleDateString('vi-VN')
}

export const formatCountdown = (expiresAt) => {
  const end = Number(expiresAt)
  if (!end) return ''
  const diff = end - Date.now()
  if (diff <= 0) return 'Đã hết hạn'
  const totalHours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  if (days > 0) return `Hết hạn sau ${days} ngày ${hours} giờ`
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (totalHours > 0) return `Hết hạn sau ${totalHours} giờ ${mins} phút`
  return `Hết hạn sau ${mins} phút`
}

export const formatRemainingShort = (expiresAt) => {
  const end = Number(expiresAt)
  if (!end) return ''
  const diff = end - Date.now()
  if (diff <= 0) return 'Đã hết hạn'
  const totalHours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  if (days > 0) {
    if (hours > 0) return `Chỉ còn ${days} ngày ${hours} giờ`
    return `Chỉ còn ${days} ngày`
  }
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (totalHours > 0) return `Chỉ còn ${totalHours} giờ ${mins} phút`
  return `Chỉ còn ${mins} phút`
}

export const buildValidityText = (startsAt, expiresAt) => {
  const start = startsAt ? formatDateVi(startsAt) : ''
  const end = expiresAt ? formatDateVi(expiresAt) : ''
  if (start && end) return `Có hiệu lực từ ${start} đến ${end}`
  if (end) return `Có hiệu lực đến ${end}`
  if (start) return `Có hiệu lực từ ${start}`
  return ''
}
