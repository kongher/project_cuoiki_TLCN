import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { backendUrl } from '../App'
import { toast } from 'react-toastify'
import { catalogLeavesForCategoryAndSub, normalizeSubCategory } from '../catalogTaxonomy.js'
import { buildSkuBySizeMap } from '../utils/skuAuto.js'
import VariantImageGallery from '../components/VariantImageGallery'
import StockQtyInput from '../components/StockQtyInput'
import ProductTagsInput from '../components/ProductTagsInput'
import { resolveProductTags } from '../config/productTags'
import { variantFromApi, buildImageMetaPayload } from '../utils/variantImages'

const NUMERIC_SIZES = ['28', '29', '30', '31', '32', '33', '34', '36', '38']

/** Gắn biến thể với bản ghi danh mục màu (ưu tiên id lưu DB, sau đó hex, rồi tên). */
function matchCatalogColor(colors, v) {
  if (!Array.isArray(colors) || !colors.length) return null
  const id = v?.colorCatalogId
  if (id) {
    const byId = colors.find((c) => String(c._id) === String(id))
    if (byId) return byId
  }
  const hex = String(v?.colorHex || '').trim().toLowerCase()
  if (hex) {
    const byHex = colors.find((c) => String(c.hex || '').trim().toLowerCase() === hex)
    if (byHex) return byHex
  }
  const name = String(v?.colorName || '').trim()
  if (name) {
    const byName = colors.find((c) => String(c.name || '').trim() === name)
    if (byName) return byName
  }
  return null
}

const emptyVariant = () => ({
  colorCatalogId: '',
  colorName: '',
  colorHex: '',
  colorSkuCode: '',
  sku: '',
  skuBySize: {},
  thumbnailFile: null,
  mainFile: null,
  gallerySlots: [null, null, null],
  existingThumbnail: '',
  existingImages: [],
  imageItems: [],
  hoverUrl: '',
  hoverFile: null,
  stockBySize: {}
})

const Edit = ({ token }) => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)


  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [discountPercent, setDiscountPercent] = useState(0)
  const [category, setCategory] = useState('Men')
  const [subCategory, setSubCategory] = useState('Topwear')
  const [catalogSlug, setCatalogSlug] = useState('')
  const [tags, setTags] = useState([])
  const [tagPoolRefresh, setTagPoolRefresh] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [sizes, setSizes] = useState([])
  const [variants, setVariants] = useState([])
  const [colors, setColors] = useState([])
  const [parentSku, setParentSku] = useState('')

  const catalogOptions = useMemo(() => catalogLeavesForCategoryAndSub(category, subCategory), [category, subCategory])

  useEffect(() => {
    if (category !== 'Women' && subCategory === 'Dresswear') {
      setSubCategory('Topwear')
    }
    if (category !== 'Men' && subCategory === 'Outerwear') {
      setSubCategory('Topwear')
    }
    if (category === 'Men' && subCategory === 'Winterwear') {
      setSubCategory('Outerwear')
    }
  }, [category, subCategory])

  useEffect(() => {
    if (!catalogSlug) return
    const ok = catalogLeavesForCategoryAndSub(category, subCategory).some((l) => l.slug === catalogSlug)
    if (!ok) setCatalogSlug('')
  }, [category, subCategory, catalogSlug])

  const hasVariants = useMemo(() => (variants || []).some((v) => String(v?.colorName || '').trim()), [variants])

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return
      setLoading(true)
      try {
        const [colorsRes, res] = await Promise.all([
          axios.get(backendUrl + '/api/color/list').catch(() => ({ data: { success: false } })),
          axios.post(backendUrl + '/api/product/single', { productId: id })
        ])
        const colorList = colorsRes?.data?.success ? colorsRes.data.colors || [] : []
        setColors(colorList)

        if (!res.data.success || !res.data.product) {
          toast.error(res.data.message || 'Không tìm thấy sản phẩm')
          navigate('/list')
          return
        }

        const p = res.data.product
        setParentSku(String(p.parentSku || '').trim())
        setName(p.name || '')
        setDescription(p.description || '')
        setPrice(String(p.price ?? ''))
        setDiscountPercent(Number(p.discountPercent || 0))
        setCategory(p.category || 'Men')
        setSubCategory(normalizeSubCategory(p.category || 'Men', p.subCategory || 'Topwear'))
        setCatalogSlug(String(p.catalogSlug || '').trim())
        setTags(resolveProductTags(p))
        setIsActive(p.isActive !== false)
        setSizes(Array.isArray(p.sizes) ? p.sizes : [])

        const vs = Array.isArray(p.variants) ? p.variants : []
        if (vs.length > 0) {
          setVariants(
            vs.map((v) => {
              const c = matchCatalogColor(colorList, v)
              const base = variantFromApi(v)
              return {
                ...base,
                colorCatalogId: c ? String(c._id) : base.colorCatalogId,
                colorName: base.colorName || (c?.name || ''),
                colorHex: base.colorHex || (c?.hex || ''),
                colorSkuCode: c?.skuCode || base.colorSkuCode,
              }
            })
          )
        } else {
          setVariants([emptyVariant()])
        }
      } catch (e) {
        toast.error('Không thể tải dữ liệu sản phẩm')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
    // 
  }, [id])

  useEffect(() => {
    // Đảm bảo các khóa stockBySize khớp với kích thước đã chọn.
    setVariants((prev) =>
      (prev || []).map((v) => {
        const stockBySize = { ...(v.stockBySize || {}) }
        ;(sizes || []).forEach((s) => {
          if (stockBySize[s] === undefined) stockBySize[s] = 0
        })
        Object.keys(stockBySize).forEach((k) => {
          if (!(sizes || []).includes(k)) delete stockBySize[k]
        })
        return { ...v, stockBySize }
      })
    )
  }, [sizes])

    // cập nhập  sản phẩm +
  const onSubmitHandler = async (e) => {
    e.preventDefault()
    if (!id) return

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('id', id)
      formData.append('name', name)
      formData.append('description', description)
      formData.append('price', price)
      formData.append('discountPercent', discountPercent)
      formData.append('category', category)
      formData.append('subCategory', subCategory)
      formData.append('catalogSlug', catalogSlug)
      formData.append('parentSku', parentSku)
      formData.append('tags', JSON.stringify(tags))
      formData.append('isActive', isActive)
      formData.append('sizes', JSON.stringify(sizes))

      // Hình ảnh cũ chỉ được sử dụng khi sản phẩm không có biến thể
// đã xóa: tải lên thư viện sản phẩm (sử dụng hình ảnh biến thể)

      const normalizedVariants = (variants || [])
        .filter((v) => String(v?.colorName || '').trim())
        .map((v) => {
          const built = buildSkuBySizeMap(parentSku, v.colorSkuCode, sizes)
          const skuBySize =
            Object.keys(built).length > 0 ? built : v?.skuBySize && typeof v.skuBySize === 'object' ? v.skuBySize : {}
          const firstSku = Object.values(skuBySize)[0] || String(v?.sku || '').trim()
          return {
            colorName: String(v.colorName).trim(),
            colorHex: String(v?.colorHex || '').trim(),
            colorCatalogId: String(v?.colorCatalogId || '').trim(),
            colorSkuCode: String(v?.colorSkuCode || '').trim(),
            sku: firstSku || String(v?.sku || '').trim(),
            skuBySize,
            stockBySize: v.stockBySize || {},
            hoverUrl: v.hoverUrl || '',
            imageMeta: buildImageMetaPayload(v),
          }
        })

      formData.append('variants', JSON.stringify(normalizedVariants))

      ;(variants || []).forEach((v, idx) => {
        if (v.thumbnailFile) formData.append(`variantThumbnail${idx}`, v.thumbnailFile)
        if (v.mainFile) formData.append(`variantMain${idx}`, v.mainFile)
        if (v.hoverFile) formData.append(`variantHover${idx}`, v.hoverFile)
        ;(v.gallerySlots || []).forEach((f) => {
          if (f) formData.append(`variantGallery${idx}`, f)
        })
      })

      // yêu cầu lưu vào dữ liệu
      const res = await axios.post(backendUrl + '/api/product/admin/update', formData, { headers: { token } })
      if (res.data.success) {
        toast.success('Đã lưu thay đổi')
        setTagPoolRefresh((v) => v + 1)
        navigate('/list')
      } else {
        toast.error(res.data.message || 'Lưu thất bại')
      }
    } catch (error) {
      console.log(error)
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className='text-sm text-gray-600'>Đang tải dữ liệu...</p>
  }

  return (
    <form onSubmit={onSubmitHandler} className='flex flex-col w-full items-start gap-3'>
      <div className='w-full flex items-center justify-between'>
        <div>
          <p className='font-medium text-lg'>Sửa sản phẩm</p>
          <p className='text-xs text-gray-500'>ID: {id}</p>
        </div>
        <button
          type='button'
          onClick={() => navigate('/list')}
          className='px-4 py-2 border rounded hover:bg-gray-50'
        >
          Quay lại
        </button>
      </div>

      {/* Ảnh theo màu đặt ở đầu trang */}
      <div className='w-full mt-1'>
        <p className='font-medium mb-2'>Ảnh theo màu (Thumbnail / Ảnh chính / Ảnh Hover / Gallery)</p>
        <div className='flex flex-col gap-3 w-full max-w-[900px]'>
          {(variants || []).map((v, idx) => (
            <div key={idx} className='flex flex-col gap-3'>
              <VariantImageGallery
                variant={v}
                onChange={(updater) =>
                  setVariants((prev) =>
                    prev.map((x, i) => (i === idx ? (typeof updater === 'function' ? updater(x) : updater) : x))
                  )
                }
                onRemoveVariant={() => setVariants((prev) => prev.filter((_, i) => i !== idx))}
                canRemoveVariant={(variants || []).length > 1}
              />
              <div className='border rounded p-4 bg-white'>
              <div className='flex flex-col gap-3'>
                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  <div className='flex flex-col gap-2'>
                    <label className='text-sm font-medium'>Màu (danh mục)</label>
                    <select
                      value={v.colorCatalogId || ''}
                      onChange={(e) => {
                        const cid = e.target.value
                        const c = colors.find((x) => String(x._id) === cid)
                        setVariants((prev) =>
                          prev.map((x, i) =>
                            i === idx
                              ? {
                                  ...x,
                                  colorCatalogId: cid,
                                  colorName: c?.name || '',
                                  colorHex: c?.hex || '',
                                  colorSkuCode: c?.skuCode || ''
                                }
                              : x
                          )
                        )
                      }}
                      className='w-full px-3 py-2 border border-gray-300 outline-none focus:border-black bg-white'
                    >
                      <option value=''>— Chọn màu —</option>
                      {colors.map((c) => (
                        <option key={String(c._id)} value={String(c._id)}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className='flex flex-col gap-2'>
                    <label className='text-sm font-medium'>Hex & mã màu (SKU)</label>
                    <div className='flex gap-2 items-center flex-wrap'>
                      <span className='font-mono text-sm px-2 py-1 bg-gray-100 rounded border'>{v.colorHex || '—'}</span>
                      <span className='font-mono text-sm font-semibold px-2 py-1 bg-gray-900 text-white rounded'>
                        {v.colorSkuCode || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className='w-full'>
        <p className='mb-2 font-medium'>Tên sản phẩm</p>
        <input onChange={(e) => setName(e.target.value)} value={name} className='w-full max-w-[700px] px-3 py-2 border border-gray-300 outline-none focus:border-black' type="text" placeholder='Nhập tên sản phẩm' required />
      </div>

      <div className='w-full'>
        <p className='mb-2 font-medium'>MÃ SP</p>
        <input
          onChange={(e) => setParentSku(e.target.value)}
          value={parentSku}
          className='w-full max-w-[320px] px-3 py-2 border border-gray-300 outline-none focus:border-black font-mono text-sm uppercase'
          type='text'
          placeholder='VD: QT001'
        />
      </div>

      <div className='w-full'>
        <p className='mb-2 font-medium'>Mô tả sản phẩm</p>
        <textarea onChange={(e) => setDescription(e.target.value)} value={description} className='w-full max-w-[700px] px-3 py-2 border border-gray-300 outline-none focus:border-black' type="text" placeholder='Viết nội dung tại đây' required />
      </div>

      <div className='flex flex-col sm:flex-row gap-2 w-full sm:gap-8'>
        <div>
          <p className='mb-2 font-medium'>Danh mục sản phẩm</p>
          <select onChange={(e) => setCategory(e.target.value)} value={category} className='w-full px-3 py-2 border border-gray-300 outline-none focus:border-black bg-white'>
            <option value="Men">Nam</option>
            <option value="Women">Nữ</option>
            <option value="Kids">Trẻ em</option>
          </select>
        </div>

        <div>
          <p className='mb-2 font-medium'>Danh mục phụ</p>
          <select
            onChange={(e) => {
              setSubCategory(e.target.value)
              setCatalogSlug('')
            }}
            value={subCategory}
            className='w-full px-3 py-2 border border-gray-300 outline-none focus:border-black bg-white'
          >
            <option value='Topwear'>Áo</option>
            <option value='Bottomwear'>Quần</option>
            {category === 'Men' ? <option value='Outerwear'>Áo khoác</option> : null}
            {category === 'Women' ? <option value='Dresswear'>Váy</option> : null}
            {category === 'Kids' ? <option value='Winterwear'>Phụ kiện</option> : null}
          </select>
        </div>

        <div className='w-full sm:max-w-md'>
          <p className='mb-2 font-medium'>Dòng sản phẩm</p>
          <select
            value={catalogSlug}
            onChange={(e) => {
              const slug = e.target.value
              setCatalogSlug(slug)
              if (!slug) return
              const leaf = catalogLeavesForCategoryAndSub(category, subCategory).find((x) => x.slug === slug)
              if (leaf) {
                setCategory(leaf.category)
                setSubCategory(leaf.subCategory)
              }
            }}
            className='w-full px-3 py-2 border border-gray-300 outline-none focus:border-black bg-white'
          >
            <option value=''>— Chưa chọn —</option>
            {catalogOptions.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className='mb-2 font-medium'>Giá sản phẩm</p>
          <input onChange={(e) => setPrice(e.target.value)} value={price} className='w-full px-3 py-2 border border-gray-300 outline-none focus:border-black sm:w-[140px]' type="Number" placeholder='10000' />
        </div>

        <div>
          <p className='mb-2 font-medium'>Giảm giá (%)</p>
          <input onChange={(e) => setDiscountPercent(e.target.value)} value={discountPercent} className='w-full px-3 py-2 border border-gray-300 outline-none focus:border-black sm:w-[140px]' type="number" min="0" max="100" placeholder='0' />
        </div>
      </div>

      <div className='flex gap-3 mt-1 items-center'>
        <button
          type='button'
          onClick={() => setIsActive((p) => !p)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}
          title={isActive ? 'Đang hiển thị' : 'Đang ẩn'}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${isActive ? 'translate-x-5' : 'translate-x-1'}`} />
        </button>
        <span className='text-sm'>{isActive ? 'Đang hiển thị' : 'Đang ẩn'}</span>
      </div>

      <div className='mt-4'>
        <ProductTagsInput token={token} refreshKey={tagPoolRefresh} value={tags} onChange={setTags} />
      </div>

      <div>
        <p className='mb-2 font-medium'>Size</p>
        <div className='flex gap-3 flex-wrap'>
          {['S', 'M', 'L', 'XL', 'XXL'].map((s) => (
            <div key={s} onClick={() => setSizes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))}>
              <p className={`${sizes.includes(s) ? "bg-pink-100 border-pink-400" : "bg-slate-200"} px-3 py-1 cursor-pointer border transition-all`}>{s}</p>
            </div>
          ))}
        </div>
        <p className='mt-2 mb-1 text-xs text-gray-600'>Size số (quần)</p>
        <div className='flex flex-wrap gap-2'>
          {NUMERIC_SIZES.map((ns) => (
            <div key={ns} onClick={() => setSizes((prev) => (prev.includes(ns) ? prev.filter((x) => x !== ns) : [...prev, ns]))}>
              <p className={`${sizes.includes(ns) ? 'bg-pink-100 border-pink-400' : 'bg-slate-200'} px-2 py-1 cursor-pointer border text-sm transition-all`}>{ns}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tồn kho theo màu nằm ngay dưới phần Size */}
      <div className='w-full mt-3'>
        <p className='mb-2 font-medium'>Danh sách màu đã thêm</p>
        <div className='flex flex-col gap-3 w-full max-w-[900px]'>
          {(variants || []).map((v, idx) => {
            const built = buildSkuBySizeMap(parentSku, v.colorSkuCode, sizes)
            const labelFor = (s) => built[s] || (v.skuBySize && v.skuBySize[s]) || '—'
            return (
            <div key={idx} className='border rounded p-4 bg-white'>
              <p className='text-sm font-medium mb-3'>
                Màu: <span className='text-gray-800'>{v.colorName || '(chưa chọn)'}</span>
                {Object.keys(built).length > 0 ? (
                  <span className='text-gray-500 ml-2 text-xs font-mono'>· {Object.values(built)[0]}…</span>
                ) : v.sku ? (
                  <span className='text-gray-500 ml-2 text-xs font-mono'>· {v.sku}</span>
                ) : null}
              </p>
              {sizes.length > 0 ? (
                <div className='mt-4'>
                  <p className='text-sm font-medium mb-2'>Tồn kho theo Size (mã SKU)</p>
                  <div className='grid grid-cols-2 sm:grid-cols-5 gap-2'>
                    {sizes.map((s) => (
                      <div key={s} className='flex flex-col gap-1'>
                        <span className='text-xs text-gray-600'>{s}</span>
                        <span className='text-[10px] text-gray-500 font-mono truncate' title={labelFor(s)}>
                          {labelFor(s)}
                        </span>
                        <StockQtyInput
                          value={v.stockBySize?.[s] ?? 0}
                          onChange={(value) => {
                            setVariants((prev) =>
                              prev.map((x, i) =>
                                i === idx ? { ...x, stockBySize: { ...(x.stockBySize || {}), [s]: value } } : x
                              )
                            )
                          }}
                          className='px-2 py-1 border rounded outline-none focus:border-black w-full'
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className='mt-3 text-sm text-gray-500'>Hãy chọn Size trước để nhập tồn kho.</p>
              )}

              {/* nút xóa đã đưa lên đầu card */}
            </div>
            )
          })}

          {/* Khung nhỏ + Thêm màu */}
          <button
            type='button'
            onClick={() => setVariants((prev) => [...(prev || []), emptyVariant()])}
            className='w-full max-w-[900px] border border-dashed border-gray-300 rounded-lg py-6 text-sm text-gray-700 hover:bg-gray-50'
          >
            + Thêm màu
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className='w-32 py-3 mt-4 bg-blue-600 text-white hover:bg-blue-700 transition-colors active:bg-blue-800 font-medium disabled:opacity-60 disabled:hover:bg-blue-600'
      >
        {saving ? 'ĐANG LƯU...' : 'LƯU'}
      </button>
    </form>
  )
}

export default Edit

