import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { backendUrl, currency } from '../App'
import { TAG_SUPER_SALE, resolveProductTags } from '../config/productTags'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import { toast } from 'react-toastify'

const List = ({ token }) => {

  const navigate = useNavigate()
  const [list, setList] = useState([])
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkDiscount, setBulkDiscount] = useState('10')
  const [bulkToSpecialSale, setBulkToSpecialSale] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Hàm dịch danh mục sang tiếng Việt
  const translateCategory = (category) => {
    const categories = {
      'Men': 'Nam',
      'Women': 'Nữ',
      'Kids': 'Trẻ em'
    };
    return categories[category] || category;
  }

  const fetchList = async () => {
    try {
      const response = await axios.get(backendUrl + '/api/product/admin/list', { headers: { token } })
      if (response.data.success) {
        setList(response.data.products.reverse());
      }
      else {
        toast.error(response.data.message)
      }
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

  // xác nhận xóa sản phẩm 
  const confirmRemoveProduct = async () => {
    if (!deleteTarget?.id) return
    setDeleting(true)
    try {
      const response = await axios.post(
        backendUrl + '/api/product/remove',
        { id: deleteTarget.id },
        { headers: { token } }
      )
      if (response.data.success) {
        toast.success('Bạn đã xóa thành công')
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.delete(deleteTarget.id)
          return next
        })
        setDeleteTarget(null)
        await fetchList()
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    } finally {
      setDeleting(false)
    }
  }

  const toggleActive = async (id, next) => {
    try {
      const response = await axios.post(
        backendUrl + '/api/product/admin/toggle-active',
        { id, isActive: next },
        { headers: { token } }
      )
      if (!response.data.success) return toast.error(response.data.message)
      setList((prev) => prev.map((p) => (p._id === id ? { ...p, isActive: next } : p)))
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    }
  }

    // chọn xóa nhiều sản phẩm cùng lúc
  const bulkDelete = async () => {
    const ids = Array.from(selectedIds)
    if (!ids.length) return toast.info('Bạn chưa chọn sản phẩm nào')
    setBulkLoading(true)
    try {
      const response = await axios.post(
        backendUrl + '/api/product/admin/bulk-delete',
        { ids },
        { headers: { token } }
      )
      if (response.data.success) {
        toast.success(response.data.message)
        setSelectedIds(new Set())
        await fetchList()
      } else toast.error(response.data.message)
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    } finally {
      setBulkLoading(false)
    }
  }

  //chọn sản phẩm để giảm gia 
  const bulkApplyDiscount = async () => {
    const ids = Array.from(selectedIds)
    if (!ids.length) return toast.info('Bạn chưa chọn sản phẩm nào')

    const discountPercent = Number(String(bulkDiscount || '').trim())
    if (!Number.isFinite(discountPercent) || discountPercent <= 0) {
      return toast.error('Vui lòng nhập % giảm giá hợp lệ')
    }
    if (discountPercent > 90) {
      return toast.error('Giảm giá tối đa 90%')
    }
    // thông tin xác nhận
    const ok = window.confirm(
      bulkToSpecialSale
        ? `Bạn có chắc chắn muốn giảm giá ${discountPercent}% cho ${ids.length} sản phẩm đã chọn và đưa vào Siêu sale trong tháng không?`
        : `Bạn có chắc chắn muốn giảm giá ${discountPercent}% cho ${ids.length} sản phẩm đã chọn không? (chỉ giảm giá, không gắn Siêu sale)`
    )
    if (!ok) return

    setBulkLoading(true)
    try {
      const response = await axios.post(
        backendUrl + '/api/product/admin/bulk-special-sale',
        { ids, discountPercent, isSpecialSale: bulkToSpecialSale },
        { headers: { token } }
      )
      if (response.data.success) {
        toast.success(response.data.message)
        setSelectedIds(new Set())
        await fetchList()
      } else toast.error(response.data.message)
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    } finally {
      setBulkLoading(false)
    }
  }

  const computeTotalStock = (product) => {
    const variants = Array.isArray(product?.variants) ? product.variants : []
    if (!variants.length) return null
    let sum = 0
    variants.forEach((v) => {
      const stockBySize = v?.stockBySize && typeof v.stockBySize === 'object' ? v.stockBySize : {}
      Object.values(stockBySize).forEach((n) => {
        sum += Number(n) || 0
      })
    })
    return sum
  }

  // lọc theo danh mục
  const categories = useMemo(() => {
    const set = new Set((list || []).map((p) => p?.category).filter(Boolean))
    return ['ALL', ...Array.from(set)]
  }, [list])

  const filteredList = useMemo(() => {
    const q = String(query || '').trim().toLowerCase()
    return (list || []).filter((p) => {
      if (!p) return false
      if (categoryFilter !== 'ALL' && String(p.category) !== String(categoryFilter)) return false
      if (!q) return true
      const nameMatch = String(p.name || '').toLowerCase().includes(q)
      const variants = Array.isArray(p?.variants) ? p.variants : []
      const skuList = variants.map((v) => String(v?.sku || '').trim()).filter(Boolean)
      const skuMatch = skuList.some((sku) => sku.toLowerCase().includes(q))
      return nameMatch || skuMatch
    })
  }, [list, query, categoryFilter])

  const getSkuDisplay = (product) => {
    const variants = Array.isArray(product?.variants) ? product.variants : []
    const skuList = variants.map((v) => String(v?.sku || '').trim()).filter(Boolean)
    if (!skuList.length) return ''
    const unique = Array.from(new Set(skuList))
    if (unique.length === 1) return unique[0]
    return unique.slice(0, 2).join(', ') + (unique.length > 2 ? ` (+${unique.length - 2})` : '')
  }

  const allChecked = filteredList.length > 0 && filteredList.every((p) => selectedIds.has(p._id))

  useEffect(() => {
    fetchList()
  }, [])

  return (
    <>
      <div className='flex flex-col gap-3 mb-3'>
        <p className='font-medium text-lg'>Danh sách tất cả sản phẩm</p>

        <div className='flex flex-col md:flex-row gap-3 md:items-center md:justify-between'>
          <div className='flex flex-col sm:flex-row gap-3 w-full'>
            <div className='flex-1'>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='Tìm theo tên hoặc Mã SP...'
                className='w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-black bg-white'
              />
            </div>
            <div className='min-w-[180px]'>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded outline-none focus:border-black bg-white'
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'ALL' ? 'Tất cả danh mục' : translateCategory(c)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
            <div className='flex flex-col gap-1'>
              <div className='flex items-center gap-2'>
                <input
                  type='number'
                  min='1'
                  max='90'
                  value={bulkDiscount}
                  onChange={(e) => setBulkDiscount(e.target.value)}
                  className='w-[88px] px-3 py-2 border border-gray-300 rounded outline-none focus:border-black bg-white'
                  placeholder='%'
                  title='Nhập % giảm giá'
                />
                <button
                  type='button'
                  onClick={bulkApplyDiscount}
                  disabled={bulkLoading || selectedIds.size === 0}
                  className='px-4 py-2 rounded bg-black text-white hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed'
                  title={
                    bulkToSpecialSale
                      ? 'Áp dụng giảm giá và đưa các sản phẩm đã chọn vào Siêu sale trong tháng'
                      : 'Chỉ áp dụng % giảm giá, không gắn Siêu sale'
                  }
                >
                  Áp dụng
                </button>
              </div>
              <label className='flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none max-w-[260px]'>
                <input
                  type='checkbox'
                  checked={bulkToSpecialSale}
                  onChange={(e) => setBulkToSpecialSale(e.target.checked)}
                  className='rounded border-gray-400'
                />
                <span>Đưa vào Siêu sale trong tháng</span>
              </label>
            </div>
            <button
              type='button'
              onClick={bulkDelete}
              disabled={bulkLoading || selectedIds.size === 0}
              className='px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Xóa đã chọn
            </button>
          </div>
        </div>
      </div>

      <div className='flex flex-col gap-2'>

        {/* ------- Tiêu đề bảng ---------- */}
        <div className='hidden md:grid grid-cols-[0.6fr_1fr_3fr_1.2fr_1fr_1fr_1fr_1fr_1.2fr] items-center py-2 px-4 border bg-gray-100 text-sm font-bold rounded'>
          <div className='flex items-center gap-2'>
            <input
              type='checkbox'
              checked={allChecked}
              onChange={(e) => {
                const checked = e.target.checked
                setSelectedIds((prev) => {
                  const next = new Set(prev)
                  if (checked) filteredList.forEach((p) => next.add(p._id))
                  else filteredList.forEach((p) => next.delete(p._id))
                  return next
                })
              }}
            />
            <span>#</span>
          </div>
          <span>Ảnh</span>
          <span>Tên sản phẩm</span>
          <span>Mã SP</span>
          <span>Danh mục</span>
          <span>Giá</span>
          <span>Kho</span>
          <span>Trạng thái</span>
          <span className='text-center'>Thao tác</span>
        </div>

        {/* ------ Danh sách sản phẩm ------ */}
        {
          filteredList.map((item, index) => {
            const totalStock = computeTotalStock(item)
            const outOfStock = typeof totalStock === 'number' && totalStock <= 0
            const isChecked = selectedIds.has(item._id)

            return (
              <div
                className='grid grid-cols-[1fr_3fr_1fr] md:grid-cols-[0.6fr_1fr_3fr_1.2fr_1fr_1fr_1fr_1fr_1.2fr] items-center gap-2 py-2 px-4 border text-sm hover:bg-gray-50 transition-all rounded'
                key={item._id || index}
              >
                <div className='flex items-center gap-2'>
                  <input
                    type='checkbox'
                    checked={isChecked}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setSelectedIds((prev) => {
                        const next = new Set(prev)
                        if (checked) next.add(item._id)
                        else next.delete(item._id)
                        return next
                      })
                    }}
                  />
                  <span className='text-xs text-gray-500'>{index + 1}</span>
                </div>

                <img className='w-12 rounded border' src={item.image?.[0]} alt="" />

                <div>
                  <p className='font-medium text-gray-800'>{item.name}</p>
                  {resolveProductTags(item).includes(TAG_SUPER_SALE) && (
                    <span className='inline-block mt-1 text-[11px] px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200'>
                      SIÊU SALE
                    </span>
                  )}
                </div>

                <div className='text-[12px] text-gray-700 font-mono break-words'>
                  {getSkuDisplay(item) || <span className='text-gray-400'>—</span>}
                </div>

                <p>{translateCategory(item.category)}</p>

                <p className='font-medium'>
                  {Number(item.price).toLocaleString('vi-VN')}{currency}
                  {Number(item.discountPercent) > 0 && (
                    <span className='ml-2 text-xs text-red-600'>-{Number(item.discountPercent)}%</span>
                  )}
                </p>

                <div>
                  {typeof totalStock === 'number' ? (
                    outOfStock ? (
                      <span className='inline-block text-xs px-2 py-1 rounded bg-red-50 text-red-700 border border-red-200'>
                        Hết hàng
                      </span>
                    ) : (
                      <span className='font-medium'>{totalStock}</span>
                    )
                  ) : (
                    <span className='text-gray-400'>-</span>
                  )}
                </div>

                <div className='flex items-center gap-2'>
                  <button
                    type='button'
                    onClick={() => toggleActive(item._id, !Boolean(item.isActive))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      item.isActive ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                    title={item.isActive ? 'Đang hiển thị' : 'Đang ẩn'}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                        item.isActive ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`text-xs ${item.isActive ? 'text-green-700' : 'text-gray-600'}`}>
                    {item.isActive ? 'Bật' : 'Tắt'}
                  </span>
                </div>

                <div className='flex justify-end md:justify-center gap-2'>
                  <button
                    type='button'
                    onClick={() => navigate(`/edit/${item._id}`)}
                    className='p-2 rounded border hover:bg-blue-50 text-blue-600 border-blue-200'
                    title='Sửa'
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  <button
                    type='button'
                    onClick={() => setDeleteTarget({ id: item._id, name: item.name || 'Sản phẩm' })}
                    className='p-2 rounded border hover:bg-red-50 text-red-600 border-red-200'
                    title='Xóa'
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M8 6V4h8v2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                      <path d="M6 6l1 16h10l1-16" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                      <path d="M10 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            )
          })
        }

      </div>

      {deleteTarget && (
        <ConfirmDeleteModal
          title='Xóa sản phẩm'
          message='Bạn có chắc muốn xóa sản phẩm này không?'
          detail={deleteTarget.name}
          deleting={deleting}
          onCancel={() => {
            if (!deleting) setDeleteTarget(null)
          }}
          onConfirm={confirmRemoveProduct}
          confirmLabel='Xác nhận xóa'
        />
      )}
    </>
  )
}

export default List