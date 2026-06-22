/** Chuẩn hóa URL API từ .env (tránh khoảng trắng / dấu ngoặc thừa) */
export const normalizeBackendUrl = (raw) => {
  const s = String(raw || '').trim().replace(/^['"]|['"]$/g, '')
  return s.replace(/\/$/, '')
}

export const getBackendUrl = () =>
  normalizeBackendUrl(import.meta.env.VITE_BACKEND_URL)
