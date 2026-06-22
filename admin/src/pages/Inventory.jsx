import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { backendUrl } from '../App'

const rowKeyOf = (row) =>
  row?.rowKey || `${row?.productId}|${String(row?.colorName || '').trim()}|${String(row?.size || '').trim()}`

const sameRow = (a, b) => a && b && rowKeyOf(a) === rowKeyOf(b)

const formatDate = (ms) => {
  if (!ms) return '—'
  return new Date(Number(ms)).toLocaleDateString('vi-VN')
}

const formatVnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`

const qtyDisplay = (qty, type) => {
  const n = Number(qty) || 0
  if (n > 0) return `+${n}`
  return String(n)
}

const TAB_BTN = (active) =>
  active
    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 transition-colors'
    : 'bg-white border-gray-300 hover:bg-blue-50 transition-colors'

const Inventory = ({ token }) => {
  const [activeTab, setActiveTab] = useState('all')
  const [rows, setRows] = useState([])
  const [lowRows, setLowRows] = useState([])
  const [historyRows, setHistoryRows] = useState([])
  const [threshold, setThreshold] = useState(5)
  const [thresholdDraft, setThresholdDraft] = useState(5)
  const [search, setSearch] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [editQty, setEditQty] = useState('')
  const [importModal, setImportModal] = useState(null)
  const [importQty, setImportQty] = useState('')
  const [importNote, setImportNote] = useState('')
  const [importSaving, setImportSaving] = useState(false)
  const [skuDetail, setSkuDetail] = useState(null)
  const [skuDetailLoading, setSkuDetailLoading] = useState(false)
  const [skuImportOpen, setSkuImportOpen] = useState(false)
  const [skuImportQty, setSkuImportQty] = useState('')
  const [skuImportNote, setSkuImportNote] = useState('')
  const [skuImportSaving, setSkuImportSaving] = useState(false)
  const [skuDetailTab, setSkuDetailTab] = useState('stock')

  const headers = useMemo(() => ({ token }), [token])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const q = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''
      const res = await axios.get(`${backendUrl}/api/inventory/list${q}`, { headers })
      if (res.data.success) {
        setRows(res.data.rows || [])
        setThreshold(res.data.lowStockThreshold ?? 5)
        setThresholdDraft(res.data.lowStockThreshold ?? 5)
      } else toast.error(res.data.message)
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
    } finally {
      setLoading(false)
    }
  }, [headers, search])

  const loadLow = useCallback(async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/inventory/low-stock`, { headers })
      if (res.data.success) {
        setLowRows(res.data.rows || [])
        setThreshold(res.data.lowStockThreshold ?? 5)
      }
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
    }
  }, [headers])

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const q = historySearch.trim() ? `?q=${encodeURIComponent(historySearch.trim())}` : ''
      const res = await axios.get(`${backendUrl}/api/inventory/history${q}`, { headers })
      if (res.data.success) setHistoryRows(res.data.rows || [])
      else toast.error(res.data.message)
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
    } finally {
      setLoadingHistory(false)
    }
  }, [headers, historySearch])

  useEffect(() => {
    loadAll()
    loadLow()
  }, [loadAll, loadLow])

  useEffect(() => {
    if (activeTab === 'history') loadHistory()
  }, [activeTab, loadHistory])

  const displayRows = activeTab === 'low' ? lowRows : rows

  const saveSettings = async () => {
    setSavingSettings(true)
    try {
      const res = await axios.put(
        `${backendUrl}/api/inventory/settings`,
        { lowStockThreshold: Number(thresholdDraft) || 0 },
        { headers }
      )
      if (res.data.success) {
        toast.success('Đã lưu mức tồn kho tối thiểu')
        setThreshold(Number(thresholdDraft) || 0)
        loadAll()
        loadLow()
      } else toast.error(res.data.message)
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
    } finally {
      setSavingSettings(false)
    }
  }

  const patchStock = async (row, { quantity, addQty: add, note }) => {
    try {
      const res = await axios.post(
        `${backendUrl}/api/inventory/update-stock`,
        {
          productId: row.productId,
          colorName: row.colorName,
          size: row.size,
          variantIndex: row.variantIndex,
          quantity,
          addQty: add,
          sku: row.sku,
          note,
        },
        { headers }
      )
      if (res.data.success) {
        toast.success(res.data.message)
        setEditRow(null)
        setImportModal(null)
        setImportQty('')
        setImportNote('')
        loadAll()
        loadLow()
        if (activeTab === 'history') loadHistory()
      } else toast.error(res.data.message)
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
    }
  }

  const submitImport = async () => {
    if (!importModal) return
    const add = Math.floor(Number(importQty) || 0)
    if (add <= 0) {
      toast.error('Số lượng nhập phải lớn hơn 0')
      return
    }
    setImportSaving(true)
    try {
      await patchStock(importModal, { addQty: add, note: importNote.trim() })
    } finally {
      setImportSaving(false)
    }
  }

  const fetchSkuDetail = async (sku) => {
    const res = await axios.get(
      `${backendUrl}/api/inventory/sku/${encodeURIComponent(sku)}`,
      { headers }
    )
    if (res.data.success) return res.data
    throw new Error(res.data.message || 'Không tải được chi tiết SKU')
  }

  const openSkuDetail = async (sku) => {
    if (!sku) return
    setSkuDetailLoading(true)
    setSkuImportOpen(false)
    setSkuImportQty('')
    setSkuImportNote('')
    setSkuDetailTab('stock')
    setSkuDetail({ sku, loading: true })
    try {
      setSkuDetail(await fetchSkuDetail(sku))
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
      setSkuDetail(null)
    } finally {
      setSkuDetailLoading(false)
    }
  }

  const submitSkuDetailImport = async () => {
    const row = skuDetail?.importMeta
    if (!row) {
      toast.error('Không tìm thấy thông tin SKU để nhập kho')
      return
    }
    const add = Math.floor(Number(skuImportQty) || 0)
    if (add <= 0) {
      toast.error('Số lượng nhập phải lớn hơn 0')
      return
    }
    setSkuImportSaving(true)
    try {
      const res = await axios.post(
        `${backendUrl}/api/inventory/update-stock`,
        {
          productId: row.productId,
          colorName: row.colorName,
          size: row.size,
          variantIndex: row.variantIndex,
          addQty: add,
          sku: row.sku,
          note: skuImportNote.trim(),
        },
        { headers }
      )
      if (res.data.success) {
        toast.success(res.data.message)
        setSkuImportOpen(false)
        setSkuImportQty('')
        setSkuImportNote('')
        loadAll()
        loadLow()
        if (activeTab === 'history') loadHistory()
        setSkuDetail(await fetchSkuDetail(skuDetail.sku))
      } else {
        toast.error(res.data.message)
      }
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
    } finally {
      setSkuImportSaving(false)
    }
  }

  const isLow = (qty) => qty <= threshold

  const tabs = [
    { id: 'all', label: 'Tất cả SKU' },
    { id: 'low', label: 'Sản phẩm sắp hết hàng' },
    { id: 'history', label: 'Lịch sử kho' },
    { id: 'settings', label: 'Cài đặt' },
  ]

  return (
    <div className='w-full max-w-6xl'>
      <p className='font-medium text-lg mb-6'>Quản lý kho hàng</p>

      <div className='flex gap-2 mb-6 flex-wrap'>
        {tabs.map((t) => (
          <button
            key={t.id}
            type='button'
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded text-sm border ${TAB_BTN(activeTab === t.id)}`}
          >
            {t.label}
            {t.id === 'low' && lowRows.length > 0 && (
              <span className='ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full'>
                {lowRows.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'settings' && (
        <div className='border rounded p-4 bg-white max-w-md'>
          <p className='font-medium text-sm mb-3'>Mức tồn kho tối thiểu để cảnh báo</p>
          <input
            type='number'
            min={0}
            className='border px-3 py-2 rounded w-full mb-4'
            value={thresholdDraft}
            onChange={(e) => setThresholdDraft(e.target.value)}
          />
          <button
            type='button'
            disabled={savingSettings}
            onClick={saveSettings}
            className='bg-blue-600 hover:bg-blue-700 transition-colors text-white px-4 py-2 rounded text-sm disabled:opacity-50'
          >
            {savingSettings ? 'Đang lưu...' : 'Lưu cài đặt'}
          </button>
        </div>
      )}

      {activeTab === 'history' && (
        <>
          <div className='flex gap-2 mb-4'>
            <input
              className='border px-3 py-2 rounded flex-1 max-w-md text-sm'
              placeholder='Tìm SKU, tên sản phẩm...'
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadHistory()}
            />
            <button type='button' onClick={loadHistory} className='border px-4 py-2 rounded text-sm'>
              Tìm
            </button>
          </div>
          {loadingHistory ? (
            <p className='text-sm text-gray-500'>Đang tải...</p>
          ) : (
            <div className='overflow-x-auto border rounded bg-white'>
              <table className='w-full text-sm min-w-[800px]'>
                <thead className='bg-gray-50 border-b'>
                  <tr>
                    <th className='text-left p-3'>Ngày</th>
                    <th className='text-left p-3'>SKU</th>
                    <th className='text-left p-3'>Tên sản phẩm</th>
                    <th className='text-left p-3'>Size</th>
                    <th className='text-left p-3'>Loại</th>
                    <th className='text-left p-3'>Số lượng</th>
                    <th className='text-left p-3'>Người thực hiện</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className='p-6 text-center text-gray-500'>
                        Chưa có lịch sử kho
                      </td>
                    </tr>
                  ) : (
                    historyRows.map((h) => (
                      <tr key={h._id} className='border-t'>
                        <td className='p-3 whitespace-nowrap'>{formatDate(h.createdAt)}</td>
                        <td className='p-3'>
                          <button
                            type='button'
                            className='font-mono text-xs text-blue-700 underline hover:text-blue-900'
                            onClick={() => openSkuDetail(h.sku)}
                          >
                            {h.sku}
                          </button>
                        </td>
                        <td className='p-3'>{h.productName || '—'}</td>
                        <td className='p-3'>{h.size || '—'}</td>
                        <td className='p-3'>{h.typeLabel || h.type}</td>
                        <td
                          className={`p-3 font-semibold ${
                            h.quantity > 0 ? 'text-green-700' : 'text-red-600'
                          }`}
                        >
                          {qtyDisplay(h.quantity)}
                        </td>
                        <td className='p-3'>{h.performedBy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {(activeTab === 'all' || activeTab === 'low') && (
        <>
          {activeTab === 'all' && (
            <div className='flex gap-2 mb-4'>
              <input
                className='border px-3 py-2 rounded flex-1 max-w-md text-sm'
                placeholder='Tìm SKU, tên SP, màu, size...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadAll()}
              />
              <button type='button' onClick={loadAll} className='border px-4 py-2 rounded text-sm'>
                Tìm
              </button>
            </div>
          )}

          {loading ? (
            <p className='text-sm text-gray-500'>Đang tải...</p>
          ) : (
            <div className='overflow-x-auto border rounded bg-white'>
              <table className='w-full text-sm min-w-[720px]'>
                <thead className='bg-gray-50 border-b'>
                  <tr>
                    <th className='text-left p-3'>Mã SKU</th>
                    <th className='text-left p-3'>Tên sản phẩm</th>
                    <th className='text-left p-3'>Màu</th>
                    <th className='text-left p-3'>Size</th>
                    <th className='text-left p-3'>Tồn kho</th>
                    <th className='text-left p-3'>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className='p-6 text-center text-gray-500'>
                        {activeTab === 'low' ? 'Không có SKU sắp hết hàng' : 'Không có dữ liệu'}
                      </td>
                    </tr>
                  ) : (
                    displayRows.map((row) => (
                      <tr key={rowKeyOf(row)} className='border-t'>
                        <td className='p-3'>
                          <button
                            type='button'
                            className='font-mono text-xs text-blue-700 underline hover:text-blue-900 text-left'
                            onClick={() => openSkuDetail(row.sku)}
                          >
                            {row.sku}
                          </button>
                        </td>
                        <td className='p-3'>{row.productName}</td>
                        <td className='p-3'>{row.colorName}</td>
                        <td className='p-3'>{row.size}</td>
                        <td className='p-3'>
                          <span
                            className={`font-semibold inline-flex items-center gap-1 ${
                              isLow(row.quantity) ? 'text-red-600' : ''
                            }`}
                          >
                            {isLow(row.quantity) && <span title='Sắp hết'>⚠️</span>}
                            {row.quantity}
                          </span>
                        </td>
                        <td className='p-3'>
                          <div className='flex flex-wrap gap-2'>
                            {sameRow(editRow, row) ? (
                              <>
                                <input
                                  type='number'
                                  min={0}
                                  className='border w-16 px-1 py-0.5 rounded text-xs'
                                  value={editQty}
                                  onChange={(e) => setEditQty(e.target.value)}
                                />
                                <button
                                  type='button'
                                  className='text-xs text-green-700'
                                  onClick={() => patchStock(row, { quantity: editQty })}
                                >
                                  Lưu
                                </button>
                                <button type='button' className='text-xs' onClick={() => setEditRow(null)}>
                                  Hủy
                                </button>
                              </>
                            ) : (
                              <button
                                type='button'
                                className='text-xs text-blue-700 underline'
                                onClick={() => {
                                  setEditRow({ ...row })
                                  setEditQty(String(row.quantity))
                                  setImportModal(null)
                                }}
                              >
                                Sửa nhanh
                              </button>
                            )}
                            <button
                              type='button'
                              className='text-xs text-gray-700 underline'
                              onClick={() => {
                                setImportModal({ ...row })
                                setImportQty('10')
                                setImportNote('')
                                setEditRow(null)
                              }}
                            >
                              Nhập thêm
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {importModal && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'
          onClick={() => !importSaving && setImportModal(null)}
          role='presentation'
        >
          <div
            className='bg-white rounded-xl shadow-xl w-full max-w-md p-6'
            onClick={(e) => e.stopPropagation()}
            role='dialog'
            aria-modal='true'
          >
            <h3 className='text-lg font-semibold mb-1'>Nhập thêm tồn kho</h3>
            <p className='text-xs font-mono text-gray-500 mb-4'>{importModal.sku}</p>
            <div className='space-y-3'>
              <div>
                <label className='text-sm text-gray-700 block mb-1'>Số lượng nhập</label>
                <input
                  type='number'
                  min={1}
                  className='border px-3 py-2 rounded w-full'
                  value={importQty}
                  onChange={(e) => setImportQty(e.target.value)}
                  disabled={importSaving}
                />
              </div>
              <div>
                <label className='text-sm text-gray-700 block mb-1'>Ghi chú</label>
                <input
                  type='text'
                  className='border px-3 py-2 rounded w-full'
                  placeholder='VD: Nhập từ nhà cung cấp ABC'
                  value={importNote}
                  onChange={(e) => setImportNote(e.target.value)}
                  disabled={importSaving}
                />
              </div>
            </div>
            <div className='mt-6 flex justify-end gap-2'>
              <button
                type='button'
                disabled={importSaving}
                onClick={() => setImportModal(null)}
                className='border px-4 py-2 rounded text-sm hover:bg-gray-50 disabled:opacity-50'
              >
                Hủy
              </button>
              <button
                type='button'
                disabled={importSaving}
                onClick={submitImport}
                className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50'
              >
                {importSaving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {skuDetail && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'
          onClick={() => {
            if (!skuDetailLoading && !skuImportSaving) {
              setSkuDetail(null)
              setSkuImportOpen(false)
            }
          }}
          role='presentation'
        >
          <div
            className='bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6'
            onClick={(e) => e.stopPropagation()}
            role='dialog'
            aria-modal='true'
          >
            <div className='flex items-start justify-between gap-3 mb-4'>
              <div>
                <h3 className='text-lg font-semibold'>Chi tiết SKU</h3>
                <p className='font-mono text-sm text-gray-600 mt-0.5'>{skuDetail.sku}</p>
              </div>
              <button
                type='button'
                onClick={() => {
                  setSkuDetail(null)
                  setSkuImportOpen(false)
                }}
                className='text-gray-400 hover:text-gray-800 text-2xl leading-none'
                aria-label='Đóng'
              >
                ×
              </button>
            </div>

            {skuDetailLoading ? (
              <p className='text-sm text-gray-500'>Đang tải...</p>
            ) : (
              <>
                <div className='bg-gray-50 border rounded-lg p-4 mb-6'>
                  <p className='font-medium text-sm mb-3'>Thống kê SKU</p>
                  <div className='grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm'>
                    <div className='space-y-2'>
                      <p>
                        Tồn kho hiện tại:{' '}
                        <span className='font-semibold'>{skuDetail.stats?.currentStock ?? 0}</span>
                      </p>
                      <p>
                        Tổng đã bán:{' '}
                        <span className='font-semibold text-red-600'>
                          {skuDetail.stats?.totalSold ?? 0}
                        </span>
                      </p>
                      <p>
                        Doanh thu:{' '}
                        <span className='font-semibold text-green-700'>
                          {formatVnd(skuDetail.stats?.revenue)}
                        </span>
                      </p>
                    </div>
                    <div className='space-y-2'>
                      <p>
                        Tổng đã nhập:{' '}
                        <span className='font-semibold text-green-700'>
                          {skuDetail.stats?.totalImported ?? 0}
                        </span>
                      </p>
                      <p>
                        Số lần nhập hàng:{' '}
                        <span className='font-semibold'>{skuDetail.stats?.importCount ?? 0}</span>
                      </p>
                      {skuDetail.importMeta && (
                        <button
                          type='button'
                          onClick={() => {
                            setSkuImportOpen(true)
                            setSkuImportQty('')
                            setSkuImportNote('')
                          }}
                          disabled={skuImportSaving || skuImportOpen}
                          className='text-sm text-blue-700 underline hover:text-blue-900 disabled:opacity-50 disabled:no-underline'
                        >
                          Nhập thêm
                        </button>
                      )}
                      {skuImportOpen && (
                        <div className='mt-1 border rounded-lg bg-white p-3 space-y-3'>
                          <div>
                            <label className='text-sm text-gray-700 block mb-1'>Số lượng</label>
                            <input
                              type='number'
                              min={1}
                              className='border px-3 py-2 rounded w-full max-w-[200px]'
                              value={skuImportQty}
                              onChange={(e) => setSkuImportQty(e.target.value)}
                              disabled={skuImportSaving}
                            />
                          </div>
                          <div>
                            <label className='text-sm text-gray-700 block mb-1'>Ghi chú</label>
                            <input
                              type='text'
                              className='border px-3 py-2 rounded w-full'
                              placeholder='Nhập từ NCC ABC'
                              value={skuImportNote}
                              onChange={(e) => setSkuImportNote(e.target.value)}
                              disabled={skuImportSaving}
                            />
                          </div>
                          <div className='flex gap-2'>
                            <button
                              type='button'
                              disabled={skuImportSaving}
                              onClick={() => {
                                setSkuImportOpen(false)
                                setSkuImportQty('')
                                setSkuImportNote('')
                              }}
                              className='border px-4 py-2 rounded text-sm hover:bg-gray-50 disabled:opacity-50'
                            >
                              Hủy
                            </button>
                            <button
                              type='button'
                              disabled={skuImportSaving}
                              onClick={submitSkuDetailImport}
                              className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50'
                            >
                              {skuImportSaving ? 'Đang lưu...' : 'Xác nhận'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className='flex gap-2 mb-3 flex-wrap'>
                  <button
                    type='button'
                    onClick={() => setSkuDetailTab('stock')}
                    className={`px-4 py-2 rounded text-sm border ${TAB_BTN(skuDetailTab === 'stock')}`}
                  >
                    Lịch sử nhập kho
                  </button>
                  <button
                    type='button'
                    onClick={() => setSkuDetailTab('price')}
                    className={`px-4 py-2 rounded text-sm border ${TAB_BTN(skuDetailTab === 'price')}`}
                  >
                    Lịch sử giá
                  </button>
                </div>

                {skuDetailTab === 'stock' ? (
                  <div className='overflow-x-auto border rounded'>
                    <table className='w-full text-sm min-w-[480px]'>
                      <thead className='bg-gray-50 border-b'>
                        <tr>
                          <th className='text-left p-2'>Ngày</th>
                          <th className='text-left p-2'>Hoạt động</th>
                          <th className='text-left p-2'>Số lượng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(skuDetail.history || []).length === 0 ? (
                          <tr>
                            <td colSpan={3} className='p-4 text-center text-gray-500'>
                              Chưa có lịch sử nhập kho
                            </td>
                          </tr>
                        ) : (
                          skuDetail.history.map((h) => (
                            <tr key={h._id} className='border-t'>
                              <td className='p-2 whitespace-nowrap'>{formatDate(h.createdAt)}</td>
                              <td className='p-2'>{h.typeLabel}</td>
                              <td
                                className={`p-2 font-semibold ${
                                  h.quantity > 0 ? 'text-green-700' : 'text-red-600'
                                }`}
                              >
                                {qtyDisplay(h.quantity)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className='overflow-x-auto border rounded'>
                    <table className='w-full text-sm min-w-[560px]'>
                      <thead className='bg-gray-50 border-b'>
                        <tr>
                          <th className='text-left p-2'>Ngày</th>
                          <th className='text-left p-2'>Giá cũ</th>
                          <th className='text-left p-2'>Giá mới</th>
                          <th className='text-left p-2'>Lý do (tùy chọn)</th>
                          <th className='text-left p-2'>Người thực hiện</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(skuDetail.priceHistory || []).length === 0 ? (
                          <tr>
                            <td colSpan={5} className='p-4 text-center text-gray-500'>
                              Chưa có lịch sử giá
                            </td>
                          </tr>
                        ) : (
                          skuDetail.priceHistory.map((p) => (
                            <tr key={p._id} className='border-t'>
                              <td className='p-2 whitespace-nowrap'>{formatDate(p.createdAt)}</td>
                              <td className='p-2'>{formatVnd(p.oldPrice)}</td>
                              <td className='p-2 font-semibold text-green-700'>{formatVnd(p.newPrice)}</td>
                              <td className='p-2 text-gray-600'>{p.reason || '—'}</td>
                              <td className='p-2'>{p.performedBy || 'Admin'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Inventory
