import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import { toast } from 'react-toastify'

const CATEGORY_OPTIONS = [
  { value: 'nam-quan-jean', label: 'Quần Jean Nam' },
  { value: 'nu-quan-jean', label: 'Quần Jean Nữ' },
  { value: 'nam-ao-thun', label: 'Áo thun Nam' },
  { value: 'nam-ao-polo', label: 'Áo Polo Nam' },
  { value: 'nam-quan-short', label: 'Quần Short Nam' },
  { value: 'nu-ao-thun', label: 'Áo thun Nữ' },
  { value: 'nu-vay', label: 'Váy Nữ' },
]

const formatVnd = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`
const formatDate = (ts) => (ts ? new Date(Number(ts)).toLocaleDateString('vi-VN') : 'Không')

const CouponTypeBadge = ({ type }) => {
  const isAmount = type === 'amount'
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
        isAmount ? 'bg-amber-100 text-amber-900' : 'bg-violet-100 text-violet-900'
      }`}
    >
      {isAmount ? 'Số tiền' : 'Phần trăm'}
    </span>
  )
}

const CouponValueBadge = ({ item }) => {
  const isAmount = item.type === 'amount'
  if (isAmount) {
    return (
      <span className='inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold bg-orange-50 text-orange-700 border border-orange-200/80'>
        {formatVnd(item.amount)}
      </span>
    )
  }
  return (
    <span className='inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold bg-sky-50 text-sky-900 border border-sky-200/80'>
      {Number(item.percent || 0)}%
    </span>
  )
}

const CouponUsageLabel = ({ used, limit }) => {
  if (limit > 0) {
    const cappedUsed = Math.min(used, limit)
    return (
      <span className='text-gray-800'>
        {cappedUsed} / {limit} lượt
      </span>
    )
  }
  return (
    <span className='text-gray-800'>
      {used} / <span className='text-gray-400 font-normal'>Vô hạn</span>
    </span>
  )
}

const ListCoupon = ({ token }) => {
  const [list, setList] = useState([])
  const [editing, setEditing] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [products, setProducts] = useState([])

  const fetchList = async () => {
    try {
      const response = await axios.get(backendUrl + '/api/discount/list', { headers: { token } })
      if (response.data.success) {
        setList(response.data.coupons)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    fetchList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!editing || editing.usedCount > 0) return
    const loadProducts = async () => {
      try {
        const res = await axios.get(backendUrl + '/api/product/admin/list', { headers: { token } })
        if (res.data.success) setProducts(res.data.products || [])
      } catch {
        /* ignore */
      }
    }
    loadProducts()
  }, [editing, token])

  const getStatus = (c) => {
    const now = Date.now()
    if (c?.active === false) return { key: 'paused', label: 'Tạm dừng', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200', dim: false }
    if (c?.startsAt && now < Number(c.startsAt)) return { key: 'upcoming', label: 'Sắp diễn ra', cls: 'bg-blue-50 text-blue-700 border-blue-200', dim: false }
    if (c?.expiresAt && now > Number(c.expiresAt)) return { key: 'expired', label: 'Đã hết hạn', cls: 'bg-gray-100 text-gray-700 border-gray-200', dim: true }
    const limit = Number(c.usageLimit) || 0
    const used = Number(c.usedCount) || 0
    if (limit > 0 && used >= limit) return { key: 'exhausted', label: 'Đã hết lượt', cls: 'bg-orange-50 text-orange-700 border-orange-200', dim: true }
    return { key: 'running', label: 'Đang chạy', cls: 'bg-green-50 text-green-700 border-green-200', dim: false }
  }

  const scopeLabel = (c) => {
    const map = { all: 'Toàn shop', category: 'Danh mục', product: 'Sản phẩm', sku: 'SKU' }
    return map[c.applyScope] || 'Toàn shop'
  }

  const visibilityLabel = (c) => {
    const map = { public: 'Công khai', private: 'Riêng tư', auto: 'Tự động' }
    return map[c.visibility] || 'Công khai'
  }

  const toggleActive = async (id, next) => {
    try {
      const response = await axios.post(
        backendUrl + '/api/discount/toggle',
        { id, active: next },
        { headers: { token } }
      )
      if (!response.data.success) return toast.error(response.data.message)
      setList((prev) => prev.map((c) => (c._id === id ? { ...c, active: next } : c)))
    } catch (error) {
      toast.error(error.message)
    }
  }

  const openEdit = (item, used) => {
    const targets = Array.isArray(item.applyTargets) ? [...item.applyTargets] : []
    setEditing({
      id: item._id,
      code: item.code,
      type: item.type || 'percent',
      percent: String(item.percent ?? 0),
      amount: String(item.amount ?? 0),
      minAmount: String(item.minAmount ?? 0),
      maxDiscount: String(item.maxDiscount ?? 0),
      usageLimit: String(item.usageLimit ?? 0),
      expiresAt: item.expiresAt ? new Date(Number(item.expiresAt)).toISOString().slice(0, 10) : '',
      applyScope: item.applyScope || 'all',
      applyTargets: targets,
      skuTargets: item.applyScope === 'sku' ? targets.join('\n') : '',
      usedCount: used,
    })
  }

  const toggleCategory = (value) => {
    setEditing((prev) => {
      if (!prev) return prev
      const next = prev.applyTargets.includes(value)
        ? prev.applyTargets.filter((v) => v !== value)
        : [...prev.applyTargets, value]
      return { ...prev, applyTargets: next }
    })
  }

  const toggleProduct = (id) => {
    const pid = String(id)
    setEditing((prev) => {
      if (!prev) return prev
      const next = prev.applyTargets.includes(pid)
        ? prev.applyTargets.filter((v) => v !== pid)
        : [...prev.applyTargets, pid]
      return { ...prev, applyTargets: next }
    })
  }

  const saveEdit = async () => {
    if (!editing?.id || savingEdit) return

    const usedCount = Number(editing.usedCount) || 0
    const usageLimit = Number(editing.usageLimit) || 0

    if (usageLimit > 0 && usageLimit < usedCount) {
      toast.error(`Số lượng tối đa không được nhỏ hơn ${usedCount} (đã sử dụng)`)
      return
    }

    setSavingEdit(true)
    try {
      const payload = {
        id: editing.id,
        usageLimit,
        expiresAt: editing.expiresAt ? new Date(editing.expiresAt).getTime() : null,
      }

      if (usedCount === 0) {
        let targets = editing.applyTargets
        if (editing.applyScope === 'sku') {
          targets = String(editing.skuTargets || '')
            .split(/[\n,;]+/)
            .map((s) => s.trim())
            .filter(Boolean)
        }

        Object.assign(payload, {
          type: editing.type,
          percent: editing.percent,
          amount: editing.amount,
          minAmount: editing.minAmount,
          maxDiscount: editing.maxDiscount,
          applyScope: editing.applyScope,
          applyTargets: targets,
        })
      }

      const response = await axios.post(backendUrl + '/api/discount/update', payload, {
        headers: { token },
      })
      if (response.data.success) {
        toast.success('Đã cập nhật mã')
        setEditing(null)
        await fetchList()
      } else toast.error(response.data.message)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSavingEdit(false)
    }
  }

  const columns = useMemo(
    () => [
      { key: 'code', label: 'Mã' },
      { key: 'type', label: 'Loại giảm giá' },
      { key: 'value', label: 'Giá trị' },
      { key: 'min', label: 'Đơn tối thiểu' },
      { key: 'usage', label: 'Số lượng' },
      { key: 'expires', label: 'Hết hạn' },
      { key: 'status', label: 'Trạng thái' },
      { key: 'actions', label: 'Thao tác' },
    ],
    []
  )

  const isLocked = Number(editing?.usedCount) > 0

  return (
    <>
      <p className='mb-2 font-medium text-lg'>Quản lý mã giảm giá</p>
      <div className='flex flex-col gap-2'>
        <div className='hidden md:grid grid-cols-[1.2fr_1.2fr_1fr_1.2fr_1.2fr_1.1fr_1.1fr_1.4fr] items-center py-2 px-3 border bg-gray-100 text-sm font-bold rounded'>
          {columns.map((c) => (
            <span key={c.key}>{c.label}</span>
          ))}
        </div>
        {list.map((item, index) =>
          (() => {
            const status = getStatus(item)
            const isPersonalGift = Boolean(
              item.isPersonalGift || item.assignedToUserId || item.singleUsePerUser
            )
            const used = Number(item.usedCount || 0)
            let limit = Number(item.usageLimit || 0)
            if (isPersonalGift && limit <= 0) limit = 1
            return (
              <div
                className={`grid grid-cols-[1fr_1fr] md:grid-cols-[1.2fr_1.2fr_1fr_1.2fr_1.2fr_1.1fr_1.1fr_1.4fr] items-center gap-2 py-2 px-3 border text-sm rounded hover:bg-gray-50 transition ${status.dim ? 'opacity-60' : ''}`}
                key={item._id || index}
              >
                <div>
                  <div className='font-medium'>{item.code}</div>
                  <p className='text-[11px] text-gray-500 mt-0.5'>
                    {scopeLabel(item)} · {visibilityLabel(item)}
                    {item.startsAt ? ` · từ ${formatDate(item.startsAt)}` : ''}
                  </p>
                </div>
                <div>
                  <CouponTypeBadge type={item.type} />
                </div>
                <div>
                  <CouponValueBadge item={item} />
                </div>
                <div>{formatVnd(item.minAmount)}</div>
                <div>
                  <CouponUsageLabel used={used} limit={limit} />
                </div>
                <div>{formatDate(item.expiresAt)}</div>
                <div>
                  <span className={`inline-flex items-center px-2 py-1 text-xs rounded border ${status.cls}`}>
                    {status.label}
                  </span>
                </div>
                <div className='flex justify-end md:justify-start gap-2'>
                  <button
                    type='button'
                    onClick={() => toggleActive(item._id, !Boolean(item.active))}
                    className={`px-3 py-1.5 rounded border text-xs ${item.active ? 'bg-white hover:bg-gray-50' : 'bg-yellow-50 hover:bg-yellow-100'} `}
                    title='Bật/Tắt'
                    disabled={status.key === 'expired' || status.key === 'exhausted'}
                  >
                    {item.active ? 'Tạm dừng' : 'Bật'}
                  </button>
                  <button
                    type='button'
                    onClick={() => openEdit(item, used)}
                    className='px-3 py-1.5 rounded border text-xs text-blue-600 border-blue-200 hover:bg-blue-50'
                    title='Sửa'
                  >
                    Sửa
                  </button>
                </div>
              </div>
            )
          })()
        )}
      </div>

      {editing && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'
          onClick={() => !savingEdit && setEditing(null)}
          role='presentation'
        >
          <div
            className='bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 border border-gray-100'
            onClick={(e) => e.stopPropagation()}
            role='dialog'
            aria-modal='true'
            aria-labelledby='edit-coupon-title'
          >
            <div className='flex items-start justify-between gap-3 mb-4'>
              <div>
                <h3 id='edit-coupon-title' className='text-lg font-semibold text-gray-900'>
                  Sửa mã giảm giá
                </h3>
                {editing.code ? (
                  <p className='text-sm text-gray-500 mt-0.5 font-mono'>{editing.code}</p>
                ) : null}
                {isLocked ? (
                  <p className='text-xs text-amber-700 mt-2 bg-amber-50 border border-amber-100 rounded px-2 py-1.5'>
                    Mã đã được sử dụng {editing.usedCount} lần — chỉ có thể sửa số lượng tối đa và ngày hết hạn.
                  </p>
                ) : (
                  <p className='text-xs text-green-700 mt-2 bg-green-50 border border-green-100 rounded px-2 py-1.5'>
                    Mã chưa được sử dụng — có thể sửa đầy đủ thông tin.
                  </p>
                )}
              </div>
              <button
                type='button'
                onClick={() => !savingEdit && setEditing(null)}
                className='text-gray-400 hover:text-gray-800 text-2xl leading-none px-1'
                aria-label='Đóng'
                disabled={savingEdit}
              >
                ×
              </button>
            </div>

            <div className='flex flex-col gap-3'>
              {!isLocked && (
                <>
                  <div>
                    <p className='text-sm mb-1 text-gray-700'>Loại giảm giá</p>
                    <select
                      value={editing.type}
                      onChange={(e) => setEditing((p) => ({ ...p, type: e.target.value }))}
                      className='w-full px-3 py-2 border rounded bg-white outline-none focus:border-blue-500'
                      disabled={savingEdit}
                    >
                      <option value='percent'>Phần trăm (%)</option>
                      <option value='amount'>Số tiền (VNĐ)</option>
                    </select>
                  </div>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                    <div>
                      <p className='text-sm mb-1 text-gray-700'>
                        {editing.type === 'amount' ? 'Số tiền giảm' : 'Phần trăm giảm (%)'}
                      </p>
                      {editing.type === 'amount' ? (
                        <input
                          value={editing.amount}
                          onChange={(e) => setEditing((p) => ({ ...p, amount: e.target.value }))}
                          className='w-full px-3 py-2 border rounded outline-none focus:border-blue-500'
                          type='number'
                          min='0'
                          disabled={savingEdit}
                        />
                      ) : (
                        <input
                          value={editing.percent}
                          onChange={(e) => setEditing((p) => ({ ...p, percent: e.target.value }))}
                          className='w-full px-3 py-2 border rounded outline-none focus:border-blue-500'
                          type='number'
                          min='0'
                          disabled={savingEdit}
                        />
                      )}
                    </div>
                    {editing.type === 'percent' && (
                      <div>
                        <p className='text-sm mb-1 text-gray-700'>Giảm tối đa (VNĐ)</p>
                        <input
                          value={editing.maxDiscount}
                          onChange={(e) => setEditing((p) => ({ ...p, maxDiscount: e.target.value }))}
                          className='w-full px-3 py-2 border rounded outline-none focus:border-blue-500'
                          type='number'
                          min='0'
                          disabled={savingEdit}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className='text-sm mb-1 text-gray-700'>Đơn hàng tối thiểu</p>
                    <input
                      value={editing.minAmount}
                      onChange={(e) => setEditing((p) => ({ ...p, minAmount: e.target.value }))}
                      className='w-full px-3 py-2 border rounded outline-none focus:border-blue-500'
                      type='number'
                      min='0'
                      disabled={savingEdit}
                    />
                  </div>
                  <div>
                    <p className='text-sm mb-1 text-gray-700 font-medium'>Danh mục áp dụng</p>
                    <div className='space-y-2 text-sm mb-2'>
                      {[
                        ['all', 'Toàn bộ cửa hàng'],
                        ['category', 'Danh mục sản phẩm'],
                        ['product', 'Sản phẩm cụ thể'],
                        ['sku', 'SKU cụ thể'],
                      ].map(([value, label]) => (
                        <label key={value} className='flex items-center gap-2 cursor-pointer'>
                          <input
                            type='radio'
                            name='editApplyScope'
                            value={value}
                            checked={editing.applyScope === value}
                            onChange={() =>
                              setEditing((p) => ({ ...p, applyScope: value, applyTargets: [] }))
                            }
                            disabled={savingEdit}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    {editing.applyScope === 'category' && (
                      <div className='flex flex-wrap gap-2'>
                        {CATEGORY_OPTIONS.map((c) => (
                          <label
                            key={c.value}
                            className='flex items-center gap-1 text-sm border rounded px-2 py-1 cursor-pointer'
                          >
                            <input
                              type='checkbox'
                              checked={editing.applyTargets.includes(c.value)}
                              onChange={() => toggleCategory(c.value)}
                              disabled={savingEdit}
                            />
                            {c.label}
                          </label>
                        ))}
                      </div>
                    )}
                    {editing.applyScope === 'product' && (
                      <div className='max-h-40 overflow-y-auto border rounded p-2 space-y-1'>
                        {products.map((p) => (
                          <label key={p._id} className='flex items-center gap-2 text-sm cursor-pointer'>
                            <input
                              type='checkbox'
                              checked={editing.applyTargets.includes(String(p._id))}
                              onChange={() => toggleProduct(p._id)}
                              disabled={savingEdit}
                            />
                            {p.name}
                          </label>
                        ))}
                      </div>
                    )}
                    {editing.applyScope === 'sku' && (
                      <textarea
                        value={editing.skuTargets}
                        onChange={(e) => setEditing((p) => ({ ...p, skuTargets: e.target.value }))}
                        className='w-full border rounded px-3 py-2 text-sm font-mono min-h-[80px]'
                        placeholder='Mỗi SKU một dòng'
                        disabled={savingEdit}
                      />
                    )}
                  </div>
                </>
              )}

              <div>
                <p className='text-sm mb-1 text-gray-700'>Số lượng phát hành (0 = không giới hạn)</p>
                <input
                  value={editing.usageLimit}
                  onChange={(e) => setEditing((p) => ({ ...p, usageLimit: e.target.value }))}
                  className='w-full px-3 py-2 border rounded outline-none focus:border-blue-500'
                  type='number'
                  min={isLocked ? editing.usedCount : 0}
                  disabled={savingEdit}
                />
                {isLocked && (
                  <p className='text-xs text-gray-500 mt-1'>Tối thiểu: {editing.usedCount} (đã sử dụng)</p>
                )}
              </div>
              <div>
                <p className='text-sm mb-1 text-gray-700'>Ngày hết hạn</p>
                <input
                  value={editing.expiresAt}
                  onChange={(e) => setEditing((p) => ({ ...p, expiresAt: e.target.value }))}
                  className='w-full px-3 py-2 border rounded outline-none focus:border-blue-500'
                  type='date'
                  disabled={savingEdit}
                />
              </div>
            </div>

            <div className='mt-6 flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => setEditing(null)}
                disabled={savingEdit}
                className='px-4 py-2 rounded border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors'
              >
                Hủy
              </button>
              <button
                type='button'
                onClick={saveEdit}
                disabled={savingEdit}
                className='px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:hover:bg-blue-600'
              >
                {savingEdit ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ListCoupon
