import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { backendUrl } from '../App'
import DashboardProductRow from '../components/DashboardProductRow'

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hôm nay' },
  { value: 'yesterday', label: 'Hôm qua' },
  { value: 'last7', label: '7 ngày qua' },
  { value: 'this_month', label: 'Tháng này' },
  { value: 'last_month', label: 'Tháng trước' },
  { value: 'all_time', label: 'Từ trước đến nay' },
]

const formatVnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')} đ`

const formatGrowth = (pct) => {
  const v = Number(pct) || 0
  if (v > 0) return { text: `↑ ${v}%`, className: 'text-green-600' }
  if (v < 0) return { text: `↓ ${Math.abs(v)}%`, className: 'text-red-600' }
  return { text: '— 0%', className: 'text-gray-500' }
}

const cancelRateColor = (rate) => {
  const r = Number(rate) || 0
  if (r > 10) return 'text-red-600'
  if (r < 5) return 'text-green-600'
  return 'text-amber-600'
}

const escapeCsv = (v) => {
  const s = String(v ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

const downloadExcelCsv = (data, periodLabel) => {
  const kpis = data?.kpis || {}
  const lines = [
    ['Báo cáo', periodLabel],
    [],
    ['Chỉ số', 'Giá trị'],
    ['Tổng doanh thu', formatVnd(kpis.totalRevenue)],
    ['Tổng đơn hàng', String(kpis.totalOrders || 0)],
    ['Tỷ lệ hủy & hoàn', `${kpis.cancelReturnRate || 0}%`],
    ['Tăng trưởng doanh thu', `${kpis.revenueGrowthPercent || 0}%`],
    [],
    ['Top 5 bán chạy', 'Mã SP', 'Số lượng bán'],
    ...(data?.topSellers || []).flatMap((r, i) => {
      const head = [`#${i + 1} ${r.name}`, r.parentSku || '', String(r.soldQty)]
      const detail = (r.skuBreakdown || []).map((l) => [
        `  ${l.sku}`,
        l.colorName || '',
        String(l.soldQty),
      ])
      return [head, ...detail]
    }),
    [],
    ['Top 5 tồn kho lâu', 'Mã SP', 'Tồn kho'],
    ...(data?.deadstock || []).flatMap((r, i) => {
      const head = [`#${i + 1} ${r.name}`, r.parentSku || '', String(r.totalStock)]
      const detail = (r.stockBreakdown || []).map((l) => [
        `  ${l.sku}`,
        l.colorName || '',
        String(l.stockQty),
      ])
      return [head, ...detail]
    }),
  ]
  const csv = '\uFEFF' + lines.map((row) => row.map(escapeCsv).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `thong-ke-${data?.period || 'report'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const Dashboard = ({ token }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('this_month')
  const headers = useMemo(() => ({ token }), [token])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${backendUrl}/api/inventory/dashboard`, {
        headers,
        params: { period },
      })
      if (res.data.success) setData(res.data)
      else toast.error(res.data.message)
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
    } finally {
      setLoading(false)
    }
  }, [headers, period])

  useEffect(() => {
    load()
  }, [load])

  const topSellers = data?.topSellers || []
  const deadstock = data?.deadstock || []
  const kpis = data?.kpis || {}
  const revenueGrowth = formatGrowth(kpis.revenueGrowthPercent)
  const periodLabel = data?.periodLabel || PERIOD_OPTIONS.find((p) => p.value === period)?.label || ''

  const onExport = () => {
    if (!data) {
      toast.info('Chưa có dữ liệu để xuất')
      return
    }
    downloadExcelCsv(data, periodLabel)
    toast.success('Đã tải file Excel (CSV)')
  }

  return (
    <div className='w-full max-w-5xl'>
      {/* Hàng 1: tiêu đề + bộ lọc + xuất file */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8'>
        <h1 className='font-medium text-lg shrink-0'>Thống kê & Báo cáo</h1>
        <div className='flex flex-wrap items-center gap-2 sm:justify-end'>
          <select
            className='border px-3 py-2 rounded text-sm bg-white min-w-[160px]'
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type='button'
            onClick={onExport}
            disabled={loading || !data}
            className='border border-gray-800 px-4 py-2 rounded text-sm hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap'
          >
            Xuất file
          </button>
        </div>
      </div>

      {loading ? (
        <p className='text-sm text-gray-500 mb-8'>Đang tải thống kê...</p>
      ) : (
        <>
          {/* Hàng 2: 3 thẻ KPI */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-10'>
            <div className='border rounded-lg p-5 bg-white shadow-sm'>
              <p className='text-xs text-gray-500 mb-2'>Tổng doanh thu</p>
              <p className='text-2xl font-bold text-gray-900'>{formatVnd(kpis.totalRevenue)}</p>
              <p className={`text-sm mt-2 ${revenueGrowth.className}`}>
                {revenueGrowth.text}
                <span className='text-gray-400 text-xs ml-1'>so với kỳ trước</span>
              </p>
            </div>

            <div className='border rounded-lg p-5 bg-white shadow-sm'>
              <p className='text-xs text-gray-500 mb-2'>Tổng số đơn hàng</p>
              <p className='text-2xl font-bold text-gray-900'>
                {(kpis.totalOrders || 0).toLocaleString('vi-VN')}
                <span className='text-base font-normal text-gray-600 ml-1'>đơn</span>
              </p>
              <p className={`text-sm mt-2 ${formatGrowth(kpis.ordersGrowthPercent).className}`}>
                {formatGrowth(kpis.ordersGrowthPercent).text}
                <span className='text-gray-400 text-xs ml-1'>so với kỳ trước</span>
              </p>
            </div>

            <div className='border rounded-lg p-5 bg-white shadow-sm'>
              <p className='text-xs text-gray-500 mb-2'>Tỷ lệ hủy & Hoàn hàng</p>
              <p className={`text-2xl font-bold ${cancelRateColor(kpis.cancelReturnRate)}`}>
                {kpis.cancelReturnRate ?? 0}%
              </p>
            </div>
          </div>
        </>
      )}

      {/* Hàng 3: hai bảng giữ nguyên */}
      <div className='grid md:grid-cols-2 gap-8'>
        <section className='border rounded p-4 bg-white'>
          <p className='font-medium mb-4'>Top 5 bán chạy</p>
          {loading ? (
            <p className='text-sm text-gray-500'>...</p>
          ) : topSellers.length === 0 ? (
            <p className='text-sm text-gray-500'>Chưa có dữ liệu bán hàng</p>
          ) : (
            <ol className='space-y-1'>
              {topSellers.map((item, i) => (
                <DashboardProductRow
                  key={item.productId}
                  rank={i + 1}
                  item={item}
                  totalLabel='đã bán'
                  totalValue={item.soldQty}
                  totalValueClass='text-green-700'
                  breakdown={item.skuBreakdown}
                  breakdownValueKey='soldQty'
                  breakdownValueLabel='đã bán'
                  breakdownValueClass='text-green-700'
                />
              ))}
            </ol>
          )}
        </section>

        <section className='border rounded p-4 bg-white'>
          <p className='font-medium mb-4'>Top 5 tồn kho lâu</p>
          {loading ? (
            <p className='text-sm text-gray-500'>...</p>
          ) : deadstock.length === 0 ? (
            <p className='text-sm text-gray-500'>Không có mẫu tồn lâu nổi bật</p>
          ) : (
            <ol className='space-y-1'>
              {deadstock.map((item, i) => (
                <DashboardProductRow
                  key={item.productId}
                  rank={i + 1}
                  item={item}
                  totalLabel='tồn'
                  totalValue={item.totalStock}
                  totalValueClass='text-red-600'
                  breakdown={item.stockBreakdown}
                  breakdownValueKey='stockQty'
                  breakdownValueLabel='tồn kho'
                  breakdownValueClass='text-red-600'
                />
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}

export default Dashboard
