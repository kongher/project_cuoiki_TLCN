export function getPasswordStrength(password) {
  const pw = String(password || '')
  if (!pw) return { score: 0, label: '', barClass: 'bg-gray-200', textClass: 'text-gray-500' }

  let score = 0
  if (pw.length >= 8) score += 1
  if (pw.length >= 12) score += 1
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1
  if (/[0-9]/.test(pw)) score += 1
  if (/[^A-Za-z0-9]/.test(pw)) score += 1

  if (score <= 1) {
    return { score: 1, label: 'Yếu kém', barClass: 'bg-red-300', textClass: 'text-red-600' }
  }
  if (score <= 3) {
    return { score: 2, label: 'Trung bình', barClass: 'bg-amber-300', textClass: 'text-amber-700' }
  }
  return { score: 3, label: 'Mạnh', barClass: 'bg-emerald-400', textClass: 'text-emerald-700' }
}
