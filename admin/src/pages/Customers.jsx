import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { backendUrl } from '../App'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'

const genderLabel = (g) => {
  if (g === 'male') return 'Nam'
  if (g === 'female') return 'Nữ'
  if (g === 'other') return 'Khác'
  return g || '—'
}

const formatDate = (d) => {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('vi-VN')
  } catch {
    return '—'
  }
}

const formatVnd = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`

const Customers = ({ token }) => {
  const [customers, setCustomers] = useState([])
  const [topCustomers, setTopCustomers] = useState([])
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingTop, setLoadingTop] = useState(true)
  const [search, setSearch] = useState('')
  const [actionId, setActionId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deletingCustomer, setDeletingCustomer] = useState(false)

  const [rewardModal, setRewardModal] = useState(null)
  const [rewardType, setRewardType] = useState('voucher')
  const [selectedCouponId, setSelectedCouponId] = useState('')
  const [customCouponCode, setCustomCouponCode] = useState('')
  const [customCouponAmount, setCustomCouponAmount] = useState('')
  const [vipPoints, setVipPoints] = useState(100)
  const [granting, setGranting] = useState(false)
  const [activeTab, setActiveTab] = useState('list') // list | top
  const [tabAnimKey, setTabAnimKey] = useState(0)

  const headers = useMemo(() => ({ token }), [token])

  const switchTab = (tab) => {
    if (tab === activeTab) return
    setActiveTab(tab)
    setTabAnimKey((k) => k + 1)
  }

    // danh sách khách hàng 
  const loadCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${backendUrl}/api/user/customers`, { headers })
      if (res.data.success) {
        setCustomers(res.data.customers || [])
      } else {
        toast.error(res.data.message || 'Không tải được danh sách khách hàng')
      }
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
    } finally {
      setLoading(false)
    }
  }, [headers])

  // laod danh sách top khác hàng thân thiết
  const loadTopCustomers = useCallback(async () => {
    setLoadingTop(true)
    try {
      const res = await axios.get(`${backendUrl}/api/admin/top-customers?limit=20`, { headers })
      if (res.data.success) {
        setTopCustomers(res.data.customers || [])
      } else {
        toast.error(res.data.message || 'Không tải được top khách hàng')
      }
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
    } finally {
      setLoadingTop(false)
    }
  }, [headers])

  const loadCoupons = useCallback(async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/discount/list`, { headers })
      if (res.data.success) {
        setCoupons((res.data.coupons || []).filter((c) => c.active !== false))
      }
    } catch {
      // bỏ qua — cửa sổ bật lên vẫn hoạt động đối với VIP
    }
  }, [headers])

  useEffect(() => {
    if (!token) return
    loadCustomers()
    loadTopCustomers()
    loadCoupons()
  }, [token, loadCustomers, loadTopCustomers, loadCoupons])

  // tìm kiếm người dùng
  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) => {
      const name = String(c.name || '').toLowerCase()
      const phone = String(c.phone || '').toLowerCase()
      const email = String(c.email || '').toLowerCase()
      return name.includes(q) || phone.includes(q) || email.includes(q)
    })
  }, [customers, search])

  // khóa user
  const handleToggleBlock = async (customer) => {
    setActionId(customer._id)
    try {
      const res = await axios.patch(
        `${backendUrl}/api/admin/customers/${customer._id}/block`,
        {},
        { headers }
      )
      if (res.data.success) {
        setCustomers((prev) =>
          prev.map((c) =>
            String(c._id) === String(customer._id) ? { ...c, isBlocked: res.data.isBlocked } : c
          )
        )
        toast.success(res.data.message)
      } else {
        toast.error(res.data.message)
      }
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
    } finally {
      setActionId(null)
    }
  }

    // xác nhận xóa user
  const confirmDeleteCustomer = async () => {
    if (!deleteTarget?._id || deletingCustomer) return
    setDeletingCustomer(true)
    setActionId(deleteTarget._id)
    try {
      const res = await axios.delete(`${backendUrl}/api/admin/customers/${deleteTarget._id}`, { headers })
      if (res.data.success) {
        setCustomers((prev) => prev.filter((c) => String(c._id) !== String(deleteTarget._id)))
        toast.success(res.data.message)
        setDeleteTarget(null)
        loadTopCustomers()
      } else {
        toast.error(res.data.message)
      }
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
    } finally {
      setDeletingCustomer(false)
      setActionId(null)
    }
  }

  // mở modal để tăng thưởng 
  const openRewardModal = (row) => {
    setRewardModal(row)
    setRewardType('voucher')
    setSelectedCouponId(coupons[0]?._id || '')
    setCustomCouponCode('')
    setCustomCouponAmount('')
    setVipPoints(100)
  }

  const closeRewardModal = () => {
    setRewardModal(null)
    setGranting(false)
  }

  const isCustomCoupon = selectedCouponId === 'custom'
  
  const handleGrantReward = async () => {
    if (!rewardModal?.userId) return

    if (rewardType === 'voucher') {
      if (!selectedCouponId) {
        toast.error('Vui lòng chọn mã giảm giá')
        return
      }
      if (isCustomCoupon) {
        if (!customCouponCode.trim()) {
          toast.error('Vui lòng nhập mã giảm giá tùy chỉnh')
          return
        }
        if (!Number(customCouponAmount) || Number(customCouponAmount) <= 0) {
          toast.error('Số tiền giảm phải lớn hơn 0')
          return
        }
      }
    }

    setGranting(true)
    try {
      const payload = {
        userId: rewardModal.userId,
        rewardType,
        couponId: selectedCouponId,
        points: vipPoints,
      }
      if (rewardType === 'voucher' && isCustomCoupon) {
        payload.useCustom = true
        payload.customCode = customCouponCode.trim().toUpperCase()
        payload.customAmount = Number(customCouponAmount)
      }

      const res = await axios.post(`${backendUrl}/api/admin/grant-reward`, payload, { headers })
      if (res.data.success) {
        toast.success(res.data.message)
        if (rewardType === 'vip') {
          loadCustomers()
          loadTopCustomers()
        }
        if (rewardType === 'voucher') {
          loadCoupons()
        }
        closeRewardModal()
      } else {
        toast.error(res.data.message)
      }
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
    } finally {
      setGranting(false)
    }
  }

  return (
    <section>
      <h2 className='text-xl font-semibold mb-5'>Quản lý khách hàng</h2>

      <nav className='customer-tabs' role='tablist' aria-label='Điều hướng khách hàng'>
        <button
          type='button'
          role='tab'
          aria-selected={activeTab === 'list'}
          aria-controls='tab-danh-sach'
          id='tab-btn-danh-sach'
          className={`customer-tab-btn ${activeTab === 'list' ? 'customer-tab-btn--active' : ''}`}
          onClick={() => switchTab('list')}
        >
          Danh sách khách hàng ({customers.length})
        </button>
        <button
          type='button'
          role='tab'
          aria-selected={activeTab === 'top'}
          aria-controls='tab-top-vip'
          id='tab-btn-top-vip'
          className={`customer-tab-btn ${activeTab === 'top' ? 'customer-tab-btn--active' : ''}`}
          onClick={() => switchTab('top')}
        >
          Top khách hàng thân thiết
        </button>
      </nav>

      <div
        id='tab-danh-sach'
        role='tabpanel'
        aria-labelledby='tab-btn-danh-sach'
        key={`list-${tabAnimKey}`}
        className={`customer-tab-panel ${activeTab === 'list' ? 'customer-tab-panel--active' : ''}`}
      >
        <input
          type='search'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Tìm kiếm khách hàng...'
          className='w-full max-w-md border border-gray-300 rounded-lg px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-gray-400'
        />

        {loading ? (
          <p className='text-gray-500'>Đang tải...</p>
        ) : filteredCustomers.length === 0 ? (
          <p className='text-gray-500'>Không có khách hàng phù hợp.</p>
        ) : (
          <div className='overflow-x-auto border border-gray-200 rounded-lg bg-white'>
            <table className='min-w-full text-sm text-left'>
              <thead className='bg-gray-50 text-gray-700 border-b'>
                <tr>
                  <th className='px-4 py-3 font-medium'>STT</th>
                  <th className='px-4 py-3 font-medium'>Số điện thoại</th>
                  <th className='px-4 py-3 font-medium'>Họ tên</th>
                  <th className='px-4 py-3 font-medium'>Email</th>
                  <th className='px-4 py-3 font-medium'>Giới tính</th>
                  <th className='px-4 py-3 font-medium'>Ngày sinh</th>
                  <th className='px-4 py-3 font-medium'>Trạng thái</th>
                  <th className='px-4 py-3 font-medium'>Ngày đăng ký</th>
                  <th className='px-4 py-3 font-medium text-center'>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c, index) => (
                  <tr
                    key={c._id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${c.isBlocked ? 'bg-red-50/40' : ''}`}
                  >
                    <td className='px-4 py-3'>{index + 1}</td>
                    <td className='px-4 py-3'>{c.phone || '—'}</td>
                    <td className='px-4 py-3'>{c.name || '—'}</td>
                    <td className='px-4 py-3'>{c.email || '—'}</td>
                    <td className='px-4 py-3'>{genderLabel(c.gender)}</td>
                    <td className='px-4 py-3'>{c.dob || '—'}</td>
                    <td className='px-4 py-3'>
                      {c.isBlocked ? (
                        <span className='text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded'>
                          Bị khóa
                        </span>
                      ) : (
                        <span className='text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded'>
                          Hoạt động
                        </span>
                      )}
                      {c.membershipTier === 'vip' && (
                        <span className='ml-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded'>
                          VIP
                        </span>
                      )}
                    </td>
                    <td className='px-4 py-3 whitespace-nowrap'>{formatDate(c.createdAt)}</td>
                    <td className='px-4 py-3'>
                      <div className='flex items-center justify-center gap-2'>
                        <button
                          type='button'
                          title={c.isBlocked ? 'Mở khóa' : 'Khóa tài khoản'}
                          disabled={actionId === c._id}
                          onClick={() => handleToggleBlock(c)}
                          className={`p-2 rounded border text-sm ${
                            c.isBlocked
                              ? 'border-green-300 text-green-700 hover:bg-green-50'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                          } disabled:opacity-50`}
                        >
                          {c.isBlocked ? '🔓' : '🔒'}
                        </button>
                        <button
                          type='button'
                          title='Xóa khách hàng'
                          disabled={actionId === c._id}
                          onClick={() => setDeleteTarget(c)}
                          className='p-2 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50'
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div
        id='tab-top-vip'
        role='tabpanel'
        aria-labelledby='tab-btn-top-vip'
        key={`top-${tabAnimKey}`}
        className={`customer-tab-panel ${activeTab === 'top' ? 'customer-tab-panel--active' : ''}`}
      >
        {loadingTop ? (
          <p className='text-gray-500'>Đang tải...</p>
        ) : topCustomers.length === 0 ? (
          <p className='text-gray-500'>Chưa có dữ liệu đơn hàng thành công.</p>
        ) : (
          <div className='overflow-x-auto border border-gray-200 rounded-lg bg-white'>
            <table className='min-w-full text-sm text-left'>
              <thead className='bg-amber-50 text-gray-800 border-b'>
                <tr>
                  <th className='px-4 py-3 font-medium'>Top</th>
                  <th className='px-4 py-3 font-medium'>Họ tên</th>
                  <th className='px-4 py-3 font-medium'>Số điện thoại</th>
                  <th className='px-4 py-3 font-medium'>Email</th>
                  <th className='px-4 py-3 font-medium'>Tổng đơn</th>
                  <th className='px-4 py-3 font-medium'>Tổng tiền tích lũy</th>
                  <th className='px-4 py-3 font-medium text-center'>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((row) => (
                  <tr key={row.userId} className='border-b border-gray-100 hover:bg-amber-50/30'>
                    <td className='px-4 py-3 font-bold text-amber-700'>#{row.rank}</td>
                    <td className='px-4 py-3'>{row.name}</td>
                    <td className='px-4 py-3'>{row.phone || '—'}</td>
                    <td className='px-4 py-3'>{row.email || '—'}</td>
                    <td className='px-4 py-3'>{row.orderCount}</td>
                    <td className='px-4 py-3 font-semibold text-gray-900'>{formatVnd(row.totalSpent)}</td>
                    <td className='px-4 py-3 text-center'>
                      <button
                        type='button'
                        onClick={() => openRewardModal(row)}
                        className='px-3 py-1.5 text-xs font-semibold text-white rounded bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors'
                      >
                        TẶNG ƯU ĐÃI
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rewardModal && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'
          onClick={closeRewardModal}
          role='presentation'
        >
          <div
            className='bg-white rounded-xl shadow-xl max-w-md w-full p-6'
            onClick={(e) => e.stopPropagation()}
            role='dialog'
            aria-modal='true'
          >
            <h3 className='text-lg font-semibold mb-1'>Tặng ưu đãi</h3>
            <p className='text-sm text-gray-500 mb-4'>
              Khách: <strong>{rewardModal.name}</strong>
              {rewardModal.email ? ` (${rewardModal.email})` : ''}
            </p>

            <div className='space-y-3 mb-5'>
              <label className='flex items-start gap-2 cursor-pointer'>
                <input
                  type='radio'
                  name='rewardType'
                  checked={rewardType === 'voucher'}
                  onChange={() => setRewardType('voucher')}
                  className='mt-1'
                />
                <span className='font-medium block'>Gửi mã giảm giá qua Email</span>
              </label>
              {rewardType === 'voucher' && (
                <div className='ml-6 space-y-3'>
                  <select
                    value={selectedCouponId}
                    onChange={(e) => setSelectedCouponId(e.target.value)}
                    className='w-full border border-gray-300 rounded px-3 py-2 text-sm'
                  >
                    <option value=''>— Chọn mã giảm giá —</option>
                    {coupons.map((cp) => (
                      <option key={cp._id} value={cp._id}>
                        {cp.code} ({cp.type === 'amount' ? formatVnd(cp.amount) : `${cp.percent}%`})
                      </option>
                    ))}
                    <option value='custom'>--- Tự tạo mã mới ---</option>
                  </select>

                  <div
                    className='space-y-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3'
                    style={{ display: isCustomCoupon ? 'block' : 'none' }}
                  >
                    <label className='block text-xs text-gray-600'>
                      Mã giảm giá tùy chỉnh
                      <input
                        type='text'
                        value={customCouponCode}
                        onChange={(e) => setCustomCouponCode(e.target.value.toUpperCase())}
                        placeholder='KONGHERVIP'
                        className='mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm uppercase'
                      />
                    </label>
                    <label className='block text-xs text-gray-600'>
                      Số tiền giảm (VNĐ)
                      <input
                        type='number'
                        min={1}
                        value={customCouponAmount}
                        onChange={(e) => setCustomCouponAmount(e.target.value)}
                        placeholder='100000'
                        className='mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm'
                      />
                    </label>
                  </div>
                </div>
              )}

              <label className='flex items-start gap-2 cursor-pointer'>
                <input
                  type='radio'
                  name='rewardType'
                  checked={rewardType === 'vip'}
                  onChange={() => setRewardType('vip')}
                  className='mt-1'
                />
                <span>
                  <span className='font-medium block'>Nâng hạng Khách hàng VIP</span>
                  <span className='text-xs text-gray-500'>Cộng điểm thưởng tích lũy</span>
                </span>
              </label>
              {rewardType === 'vip' && (
                <div className='ml-6'>
                  <label className='text-xs text-gray-600 block mb-1'>Điểm thưởng cộng thêm</label>
                  <input
                    type='number'
                    min={0}
                    value={vipPoints}
                    onChange={(e) => setVipPoints(Number(e.target.value) || 0)}
                    className='w-full border border-gray-300 rounded px-3 py-2 text-sm'
                  />
                </div>
              )}
            </div>

            <div className='flex gap-3 justify-end'>
              <button
                type='button'
                onClick={closeRewardModal}
                className='px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50'
              >
                Hủy
              </button>
              <button
                type='button'
                disabled={granting}
                onClick={handleGrantReward}
                className='customer-reward-confirm-btn px-4 py-2 text-sm rounded disabled:opacity-60'
              >
                {granting ? 'Đang xử lý...' : 'Xác nhận tặng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          title='Xóa khách hàng'
          message='Bạn có chắc muốn xóa khách hàng này hay không?'
          detail={[deleteTarget.name, deleteTarget.phone].filter(Boolean).join(' · ') || deleteTarget.email}
          deleting={deletingCustomer}
          confirmLabel='Xóa'
          confirmVariant='primary'
          onCancel={() => {
            if (!deletingCustomer) setDeleteTarget(null)
          }}
          onConfirm={confirmDeleteCustomer}
        />
      )}
    </section>
  )
}

export default Customers
