import { useEffect, useState } from 'react'
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

const AddCoupon = ({ token }) => {
  const [code, setCode] = useState('')
  const [type, setType] = useState('percent')
  const [percent, setPercent] = useState('')
  const [amount, setAmount] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxDiscount, setMaxDiscount] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [usageLimit, setUsageLimit] = useState('')
  const [applyScope, setApplyScope] = useState('all')
  const [applyTargets, setApplyTargets] = useState([])
  const [skuTargets, setSkuTargets] = useState('')
  const [audienceType, setAudienceType] = useState('all')
  const [products, setProducts] = useState([])

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await axios.get(backendUrl + '/api/product/admin/list', { headers: { token } })
        if (res.data.success) setProducts(res.data.products || [])
      } catch {
        /* ignore */
      }
    }
    loadProducts()
  }, [token])

  const resetForm = () => {
    setCode('')
    setType('percent')
    setPercent('')
    setAmount('')
    setMinAmount('')
    setMaxDiscount('')
    setStartsAt('')
    setExpiresAt('')
    setUsageLimit('')
    setApplyScope('all')
    setApplyTargets([])
    setSkuTargets('')
    setAudienceType('all')
  }

  const toggleCategory = (value) => {
    setApplyTargets((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  const toggleProduct = (id) => {
    const pid = String(id)
    setApplyTargets((prev) => (prev.includes(pid) ? prev.filter((v) => v !== pid) : [...prev, pid]))
  }

  const onSubmitHandler = async (e) => {
    e.preventDefault()
    try {
      let targets = applyTargets
      if (applyScope === 'sku') {
        targets = skuTargets.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean)
      }

      const response = await axios.post(
        backendUrl + '/api/discount/add',
        {
          code,
          type,
          percent,
          amount,
          minAmount,
          maxDiscount,
          usageLimit,
          applyScope,
          applyTargets: targets,
          audienceType,
          visibility: 'public',
          startsAt: startsAt ? new Date(startsAt).getTime() : null,
          expiresAt: expiresAt ? new Date(expiresAt).getTime() : null,
        },
        { headers: { token } }
      )

      if (response.data.success) {
        toast.success(response.data.message)
        resetForm()
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <form onSubmit={onSubmitHandler} className='flex flex-col w-full max-w-3xl items-start gap-4'>
      <div className='w-full border rounded-lg p-4 bg-white space-y-3'>
        <p className='font-medium text-sm'>Thông tin cơ bản</p>
        <div>
          <p className='mb-1 text-sm'>Mã giảm giá</p>
          <input
            onChange={(e) => setCode(e.target.value)}
            value={code}
            className='w-full max-w-[500px] px-3 py-2 border rounded'
            placeholder='Ví dụ: SALE10'
            required
          />
        </div>
        <div>
          <p className='mb-1 text-sm'>Loại giảm giá</p>
          <select value={type} onChange={(e) => setType(e.target.value)} className='w-full max-w-[500px] px-3 py-2 border rounded bg-white'>
            <option value='percent'>Phần trăm (%)</option>
            <option value='amount'>Số tiền (VNĐ)</option>
          </select>
        </div>
        <div className='flex flex-col sm:flex-row gap-3'>
          <div>
            <p className='mb-1 text-sm'>{type === 'amount' ? 'Số tiền giảm' : 'Phần trăm giảm (%)'}</p>
            {type === 'amount' ? (
              <input value={amount} onChange={(e) => setAmount(e.target.value)} className='w-full sm:w-[160px] px-3 py-2 border rounded' type='number' required />
            ) : (
              <input value={percent} onChange={(e) => setPercent(e.target.value)} className='w-full sm:w-[160px] px-3 py-2 border rounded' type='number' required />
            )}
          </div>
          <div>
            <p className='mb-1 text-sm'>Giảm tối đa (VNĐ)</p>
            <input disabled={type === 'amount'} value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} className='w-full sm:w-[160px] px-3 py-2 border rounded disabled:opacity-60' type='number' />
          </div>
        </div>
        <div>
          <p className='mb-1 text-sm'>Đơn hàng tối thiểu</p>
          <input value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className='w-full max-w-[500px] px-3 py-2 border rounded' type='number' required />
        </div>
        <div>
          <p className='mb-1 text-sm'>Số lượng mã (0 = không giới hạn)</p>
          <input value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} className='w-full max-w-[500px] px-3 py-2 border rounded' type='number' />
        </div>
        <div className='flex flex-col sm:flex-row gap-3'>
          <div>
            <p className='mb-1 text-sm'>Ngày bắt đầu</p>
            <input value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className='w-full sm:w-[200px] px-3 py-2 border rounded' type='date' />
          </div>
          <div>
            <p className='mb-1 text-sm'>Ngày kết thúc</p>
            <input value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className='w-full sm:w-[200px] px-3 py-2 border rounded' type='date' required />
          </div>
        </div>
      </div>

      <div className='w-full border rounded-lg p-4 bg-white space-y-3'>
        <p className='font-medium text-sm'>Phạm vi áp dụng</p>
        <div className='space-y-2 text-sm'>
          {[
            ['all', 'Toàn bộ cửa hàng'],
            ['category', 'Danh mục sản phẩm'],
            ['product', 'Sản phẩm cụ thể'],
            ['sku', 'SKU cụ thể'],
          ].map(([value, label]) => (
            <label key={value} className='flex items-center gap-2 cursor-pointer'>
              <input type='radio' name='applyScope' value={value} checked={applyScope === value} onChange={() => { setApplyScope(value); setApplyTargets([]) }} />
              {label}
            </label>
          ))}
        </div>
        {applyScope === 'category' && (
          <div className='flex flex-wrap gap-2 pt-2'>
            {CATEGORY_OPTIONS.map((c) => (
              <label key={c.value} className='flex items-center gap-1 text-sm border rounded px-2 py-1 cursor-pointer'>
                <input type='checkbox' checked={applyTargets.includes(c.value)} onChange={() => toggleCategory(c.value)} />
                {c.label}
              </label>
            ))}
          </div>
        )}
        {applyScope === 'product' && (
          <div className='max-h-48 overflow-y-auto border rounded p-2 space-y-1'>
            {products.map((p) => (
              <label key={p._id} className='flex items-center gap-2 text-sm cursor-pointer'>
                <input type='checkbox' checked={applyTargets.includes(String(p._id))} onChange={() => toggleProduct(p._id)} />
                {p.name}
              </label>
            ))}
          </div>
        )}
        {applyScope === 'sku' && (
          <textarea
            value={skuTargets}
            onChange={(e) => setSkuTargets(e.target.value)}
            className='w-full border rounded px-3 py-2 text-sm font-mono min-h-[100px]'
            placeholder='Mỗi SKU một dòng, VD: AT001-D-S'
          />
        )}
      </div>

      <div className='w-full border rounded-lg p-4 bg-white space-y-3'>
        <p className='font-medium text-sm'>Đối tượng được nhận mã</p>
        <select value={audienceType} onChange={(e) => setAudienceType(e.target.value)} className='w-full max-w-[500px] px-3 py-2 border rounded bg-white'>
          <option value='all'>Tất cả khách hàng</option>
          <option value='new'>Khách hàng mới</option>
          <option value='vip'>Khách VIP</option>
          <option value='repeat_3'>Khách đã mua &gt; 3 đơn</option>
        </select>
      </div>

      <button type='submit' className='w-32 py-3 bg-blue-600 text-white hover:bg-blue-700 transition-colors rounded'>
        THÊM MÃ
      </button>
    </form>
  )
}

export default AddCoupon
