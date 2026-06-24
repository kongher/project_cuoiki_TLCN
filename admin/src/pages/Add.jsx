import { useEffect, useMemo, useState } from 'react'
import { assets } from '../assets/assets'
import axios from 'axios'
import { backendUrl } from '../App'
import { toast } from 'react-toastify'
import { catalogLeavesForCategoryAndSub } from '../catalogTaxonomy.js'
import { buildSkuBySizeMap } from '../utils/skuAuto.js'
import VariantImageGallery from '../components/VariantImageGallery'
import StockQtyInput from '../components/StockQtyInput'
import ProductTagsInput from '../components/ProductTagsInput'
import { buildImageMetaPayload } from '../utils/variantImages'

const NUMERIC_SIZES = ['28', '29', '30', '31', '32', '33', '34', '36', '38']

const Add = ({ token }) => {

  const [parentSku, setParentSku] = useState('')
  const [colors, setColors] = useState([])

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [category, setCategory] = useState("Men");
  const [subCategory, setSubCategory] = useState("Topwear");
  const [catalogSlug, setCatalogSlug] = useState('');
  const [tags, setTags] = useState([]);
  const [tagPoolRefresh, setTagPoolRefresh] = useState(0);
  const [sizes, setSizes] = useState([]);
  const emptyVariant = () => ({
    colorCatalogId: '',
    colorName: '',
    colorHex: '',
    colorSkuCode: '',
    sku: '',
    thumbnailFile: null,
    mainFile: null,
    hoverFile: null,
    gallerySlots: [null, null, null],
    imageItems: [],
    hoverUrl: '',
    stockBySize: {}
  })

  const [variants, setVariants] = useState([emptyVariant()])

  useEffect(() => {
    const loadColors = async () => {
      try {
        const res = await axios.get(backendUrl + '/api/color/list')
        if (res.data.success) setColors(res.data.colors || [])
      } catch (e) {
        console.log(e)
      }
    }
    loadColors()
  }, [])

  const catalogOptions = useMemo(
    () => catalogLeavesForCategoryAndSub(category, subCategory),
    [category, subCategory]
  )

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

  useEffect(() => {
    //Đảm bảo các khóa stockBySize khớp với kích thước đã chọn.
    setVariants((prev) =>
      prev.map((v) => {
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

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    try {

      const formData = new FormData()

      formData.append("name", name)
      formData.append("description", description)
      formData.append("price", price)
      formData.append("discountPercent", discountPercent)
      formData.append("category", category)
      formData.append("subCategory", subCategory)
      formData.append("catalogSlug", catalogSlug)
      formData.append("parentSku", parentSku)
      formData.append('tags', JSON.stringify(tags))
      formData.append("sizes", JSON.stringify(sizes))

      const normalizedVariants = (variants || [])
        .filter((v) => String(v?.colorName || '').trim())
        .map((v) => {
          const skuBySize = buildSkuBySizeMap(parentSku, v.colorSkuCode, sizes)
          const firstSku = Object.values(skuBySize)[0] || ''
          return {
            colorName: String(v.colorName).trim(),
            colorHex: String(v?.colorHex || '').trim(),
            sku: firstSku || String(v?.sku || '').trim(),
            skuBySize,
            stockBySize: v.stockBySize || {},
            hoverUrl: v.hoverUrl || '',
            imageMeta: buildImageMetaPayload(v),
          }
        })

      formData.append("variants", JSON.stringify(normalizedVariants))

      ;(variants || []).forEach((v, idx) => {
        if (v.thumbnailFile) formData.append(`variantThumbnail${idx}`, v.thumbnailFile)
        // 
        if (v.mainFile) formData.append(`variantMain${idx}`, v.mainFile)
        if (v.hoverFile) formData.append(`variantHover${idx}`, v.hoverFile)
        ;(v.gallerySlots || []).forEach((f) => {
          if (f) formData.append(`variantGallery${idx}`, f)
        })
      })

      const response = await axios.post(backendUrl + "/api/product/add", formData, { headers: { token } })

      if (response.data.success) {
        toast.success('Đã thêm sản phẩm thành công')
        setName('')
        setDescription('')
        setPrice('')
        setSizes([])
        setTags([])
        setTagPoolRefresh((v) => v + 1)
        setParentSku('')
        setVariants([emptyVariant()])
        setCatalogSlug('')
      } else {
        toast.error(response.data.message)
      }

    } catch (error) {
      console.log(error);
      toast.error(error.message)
    }
  }

  return (
    <form onSubmit={onSubmitHandler} className='flex flex-col w-full items-start gap-3'>
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
                        const id = e.target.value
                        const c = colors.find((x) => String(x._id) === id)
                        setVariants((prev) =>
                          prev.map((x, i) =>
                            i === idx
                              ? {
                                  ...x,
                                  colorCatalogId: id,
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
                        <option key={c._id} value={c._id}>
                          {c.name} ({c.skuCode})
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

      {/* Thông tin sản phẩm */}
      <div className='w-full mt-3'>
        <p className='mb-2 font-medium'>Tên sản phẩm</p>
        <input onChange={(e) => setName(e.target.value)} value={name} className='w-full max-w-[500px] px-3 py-2 border border-gray-300 outline-none focus:border-black' type="text" placeholder='Nhập tên sản phẩm' required />
      </div>

      <div className='w-full mt-2'>
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
        <textarea onChange={(e) => setDescription(e.target.value)} value={description} className='w-full max-w-[500px] px-3 py-2 border border-gray-300 outline-none focus:border-black' type="text" placeholder='Viết nội dung tại đây' required />
      </div>

      <div className='flex flex-col sm:flex-row gap-2 w-full sm:gap-8'>

        <div>
          <p className='mb-2 font-medium'>Danh mục sản phẩm</p>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className='w-full px-3 py-2 border border-gray-300 outline-none focus:border-black'>
            <option value="Men">Nam</option>
            <option value="Women">Nữ</option>
            <option value="Kids">Trẻ em</option>
          </select>
        </div>

        <div>
          <p className='mb-2 font-medium'>Danh mục phụ</p>
          <select
            value={subCategory}
            onChange={(e) => {
              setSubCategory(e.target.value)
              setCatalogSlug('')
            }}
            className='w-full px-3 py-2 border border-gray-300 outline-none focus:border-black'
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
            className='w-full px-3 py-2 border border-gray-300 outline-none focus:border-black'
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
          <input onChange={(e) => setPrice(e.target.value)} value={price} className='w-full px-3 py-2 border border-gray-300 outline-none focus:border-black sm:w-[120px]' type="Number" placeholder='10000' />
        </div>

        <div>
          <p className='mb-2 font-medium'>Giảm giá (%)</p>
          <input onChange={(e) => setDiscountPercent(e.target.value)} value={discountPercent} className='w-full px-3 py-2 border border-gray-300 outline-none focus:border-black sm:w-[120px]' type="number" min="0" max="100" placeholder='0' />
        </div>

      </div>

      <div>
        <p className='mb-2 font-medium'>Size</p>
        <div className='flex flex-wrap gap-3'>
          <div onClick={() => setSizes(prev => prev.includes("S") ? prev.filter(item => item !== "S") : [...prev, "S"])}>
            <p className={`${sizes.includes("S") ? "bg-pink-100 border-pink-400" : "bg-slate-200"} px-3 py-1 cursor-pointer border transition-all`}>S</p>
          </div>

          <div onClick={() => setSizes(prev => prev.includes("M") ? prev.filter(item => item !== "M") : [...prev, "M"])}>
            <p className={`${sizes.includes("M") ? "bg-pink-100 border-pink-400" : "bg-slate-200"} px-3 py-1 cursor-pointer border transition-all`}>M</p>
          </div>

          <div onClick={() => setSizes(prev => prev.includes("L") ? prev.filter(item => item !== "L") : [...prev, "L"])}>
            <p className={`${sizes.includes("L") ? "bg-pink-100 border-pink-400" : "bg-slate-200"} px-3 py-1 cursor-pointer border transition-all`}>L</p>
          </div>

          <div onClick={() => setSizes(prev => prev.includes("XL") ? prev.filter(item => item !== "XL") : [...prev, "XL"])}>
            <p className={`${sizes.includes("XL") ? "bg-pink-100 border-pink-400" : "bg-slate-200"} px-3 py-1 cursor-pointer border transition-all`}>XL</p>
          </div>

          <div onClick={() => setSizes(prev => prev.includes("XXL") ? prev.filter(item => item !== "XXL") : [...prev, "XXL"])}>
            <p className={`${sizes.includes("XXL") ? "bg-pink-100 border-pink-400" : "bg-slate-200"} px-3 py-1 cursor-pointer border transition-all`}>XXL</p>
          </div>
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
        <p className='mb-2 font-medium'>Tồn kho & Biến thể màu</p>
        <div className='flex flex-col gap-3 w-full max-w-[900px]'>
          {(variants || []).map((v, idx) => {
            const skuMap = buildSkuBySizeMap(parentSku, v.colorSkuCode, sizes)
            return (
            <div key={idx} className='border rounded p-4 bg-white'>
              <p className='text-sm font-medium mb-3'>
                Màu: <span className='text-gray-800'>{v.colorName || '(chưa chọn)'}</span>
                {Object.keys(skuMap).length > 0 ? (
                  <span className='text-gray-500 ml-2 text-xs font-mono'>· {Object.values(skuMap)[0]}…</span>
                ) : null}
              </p>

              {sizes.length > 0 ? (
                <div>
                  <p className='text-sm font-medium mb-2'>Tồn kho theo Size (mã SKU tự sinh)</p>
                  <div className='grid grid-cols-2 sm:grid-cols-5 gap-2'>
                    {sizes.map((s) => (
                      <div key={s} className='flex flex-col gap-1'>
                        <span className='text-xs text-gray-600'>{s}</span>
                        <span className='text-[10px] text-gray-500 font-mono truncate' title={skuMap[s] || ''}>
                          {skuMap[s] || '—'}
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
                <p className='text-sm text-gray-500'>Hãy chọn Size trước để nhập tồn kho.</p>
              )}
            </div>
            )
          })}

          {/* Khung nhỏ + Thêm màu */}
          <button
            type='button'
            onClick={() =>
              setVariants((prev) => [...(prev || []), emptyVariant()])
            }
            className='w-full max-w-[900px] border border-dashed border-gray-300 rounded-lg py-6 text-sm text-gray-700 hover:bg-gray-50'
          >
            + Thêm màu
          </button>
        </div>
      </div>

      {/* Đã xóa Gallery chung theo yêu cầu */}

      <div className='mt-4'>
        <ProductTagsInput token={token} refreshKey={tagPoolRefresh} value={tags} onChange={setTags} />
      </div>

      <button type="submit" className='w-28 py-3 mt-4 bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 ease-in-out active:bg-blue-800 font-medium'>
        THÊM
      </button>

    </form>
  )
}

export default Add