const DAY_MS = 24 * 60 * 60 * 1000

export const PERIOD_KEYS = [
  'today',
  'yesterday',
  'last7',
  'this_month',
  'last_month',
  'all_time',
]

export const PERIOD_LABELS = {
  today: 'Hôm nay',
  yesterday: 'Hôm qua',
  last7: '7 ngày qua',
  this_month: 'Tháng này',
  last_month: 'Tháng trước',
  all_time: 'Từ trước đến nay',
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
const endOfDay = (d) => startOfDay(d) + DAY_MS - 1

const startOfMonth = (y, m) => new Date(y, m, 1).getTime()
const endOfMonth = (y, m) => new Date(y, m + 1, 0, 23, 59, 59, 999).getTime()

/** Từ đơn hàng đầu tiên đến hiện tại */
export const resolveAllTimeRange = (firstOrderTs) => {
  const end = Date.now()
  const start = Math.max(0, Number(firstOrderTs) || 0)
  const duration = Math.max(0, end - start)
  const prevEnd = start > 0 ? start - 1 : 0
  const prevStart = duration > 0 ? Math.max(0, prevEnd - duration + 1) : 0
  return {
    key: 'all_time',
    label: PERIOD_LABELS.all_time,
    start,
    end,
    prevStart,
    prevEnd,
  }
}

/** Khoảng thời gian chính + khoảng so sánh (cùng độ dài, ngay trước đó) */
export const getPeriodRanges = (periodKey, options = {}) => {
  const now = new Date()
  const key = PERIOD_KEYS.includes(periodKey) ? periodKey : 'this_month'

  if (key === 'all_time') {
    if (options.firstOrderTs !== undefined) {
      return resolveAllTimeRange(options.firstOrderTs)
    }
    return resolveAllTimeRange(0)
  }

  if (key === 'today') {
    const start = startOfDay(now)
    const end = Date.now()
    const prevEnd = start - 1
    const prevStart = startOfDay(new Date(prevEnd))
    return { key, label: PERIOD_LABELS[key], start, end, prevStart, prevEnd }
  }

  if (key === 'yesterday') {
    const y = new Date(now.getTime() - DAY_MS)
    const start = startOfDay(y)
    const end = endOfDay(y)
    const prevDay = new Date(start - DAY_MS)
    const prevStart = startOfDay(prevDay)
    const prevEnd = endOfDay(prevDay)
    return { key, label: PERIOD_LABELS[key], start, end, prevStart, prevEnd }
  }

  if (key === 'last7') {
    const end = Date.now()
    const start = end - 7 * DAY_MS
    const prevEnd = start - 1
    const prevStart = prevEnd - 7 * DAY_MS + 1
    return { key, label: PERIOD_LABELS[key], start, end, prevStart, prevEnd }
  }

  if (key === 'this_month') {
    const start = startOfMonth(now.getFullYear(), now.getMonth())
    const end = Date.now()
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    const prevStart = startOfMonth(prevYear, prevMonth)
    const prevEnd = endOfMonth(prevYear, prevMonth)
    return { key, label: PERIOD_LABELS[key], start, end, prevStart, prevEnd }
  }

  // last_month
  const lm = now.getMonth() === 0 ? 11 : now.getMonth() - 1
  const ly = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const start = startOfMonth(ly, lm)
  const end = endOfMonth(ly, lm)
  const pm = lm === 0 ? 11 : lm - 1
  const py = lm === 0 ? ly - 1 : ly
  const prevStart = startOfMonth(py, pm)
  const prevEnd = endOfMonth(py, pm)
  return { key, label: PERIOD_LABELS[key], start, end, prevStart, prevEnd }
}

export const isInRange = (ts, start, end) => {
  const t = Number(ts) || 0
  return t >= start && t <= end
}
