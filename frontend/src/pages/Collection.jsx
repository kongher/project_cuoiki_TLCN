import React, { useContext, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ShopContext } from '../context/ShopContext'
import { assets } from '../assets/assets'
import Title from '../components/Title'
import ProductItem from '../components/ProductItem'
import { DEPARTMENTS, LEGACY_CATALOG_SLUG_ALIASES } from '../config/catalogTaxonomy'

const norm = (s) => String(s || '').trim().toLowerCase()

const sanitizeHex = (raw) => {
  const s = String(raw || '').trim()
  if (!s) return ''
  if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s.toUpperCase()
  const noHash = s.replace(/^#/, '')
  if (/^[0-9A-Fa-f]{6}$/.test(noHash)) return `#${noHash.toUpperCase()}`
  return ''
}

const colorKeyFromVariant = (v) => {
  const hx = sanitizeHex(v?.colorHex)
  if (hx) return `hex:${hx}`
  return `name:${norm(v?.colorName)}`
}

const productMatchesQuery = (p, q) => {
  if (!q) return true
  if (norm(p.name).includes(q)) return true
  const variants = Array.isArray(p.variants) ? p.variants : []
  for (const v of variants) {
    if (norm(v.sku).includes(q)) return true
  }
  return false
}

const stockForVariantSize = (v, size) => {
  if (!v || !size) return 0
  const m = v.stockBySize || {}
  return Number(m[size] ?? 0) || 0
}

const resolveVariantForColorKey = (p, colorKey) => {
  if (!colorKey) return null
  const vs = Array.isArray(p.variants) ? p.variants : []
  if (!vs.length) return null
  if (colorKey.startsWith('hex:')) {
    const hx = colorKey.slice(4)
    return vs.find((v) => sanitizeHex(v.colorHex) === hx) || null
  }
  const keyName = colorKey.startsWith('name:') ? colorKey.slice(5) : ''
  return vs.find((v) => norm(v.colorName) === keyName) || null
}

const getStockHint = (p, colorFilter, sizeFilter) => {
  if (!sizeFilter) return ''
  const variants = Array.isArray(p.variants) ? p.variants : []
  if (!variants.length) return (p.sizes || []).includes(sizeFilter) ? '' : 'Hết hàng'

  if (colorFilter) {
    const v = resolveVariantForColorKey(p, colorFilter)
    if (!v) return 'Hết hàng'
    return stockForVariantSize(v, sizeFilter) > 0 ? '' : 'Hết hàng'
  }
  const ok = variants.some((v) => stockForVariantSize(v, sizeFilter) > 0)
  return ok ? '' : 'Hết hàng'
}

const PRICE_QUICK_OPTS = [
  { id: 'lt200', label: 'Dưới 200.000đ' },
  { id: '200-500', label: '200.000đ - 500.000đ' },
  { id: '500-1000', label: '500.000đ - 1.000.000đ' },
  { id: 'gt1000', label: 'Trên 1.000.000đ' }
]

const priceQuickTest = (id, price) => {
  if (!id) return true
  if (id === 'lt200') return price < 200000
  if (id === '200-500') return price >= 200000 && price <= 500000
  if (id === '500-1000') return price >= 500000 && price <= 1000000
  if (id === 'gt1000') return price > 1000000
  return true
}

const parsePriceDigits = (raw) => {
  const n = String(raw || '').replace(/\D/g, '')
  if (!n) return null
  const v = Number(n)
  return Number.isFinite(v) ? v : null
}

const LETTER_SIZES = ['S', 'M', 'L', 'XL', 'XXL']

const sortSizeLabels = (sizes) => {
  const uniq = Array.from(new Set((sizes || []).map(String)))
  const alpha = uniq.filter((s) => LETTER_SIZES.includes(s)).sort((a, b) => LETTER_SIZES.indexOf(a) - LETTER_SIZES.indexOf(b))
  const num = uniq.filter((s) => !LETTER_SIZES.includes(s)).sort((a, b) => Number(a) - Number(b))
  return [...alpha, ...num]
}

const productMatchesCatalogFilter = (p, slugSet) => {
  if (!slugSet.size) return true
  const slug = String(p?.catalogSlug || '').trim()
  if (!slug) return false
  if (slugSet.has(slug)) return true
  const mapped = LEGACY_CATALOG_SLUG_ALIASES[slug]
  if (mapped && slugSet.has(mapped)) return true
  return Object.entries(LEGACY_CATALOG_SLUG_ALIASES).some(
    ([legacy, next]) => slugSet.has(next) && slug === legacy
  )
}

const productHasSize = (p, size) => {
  if (!size) return true
  const vs = Array.isArray(p.variants) ? p.variants : []
  if (vs.length) {
    return vs.some((v) => Object.prototype.hasOwnProperty.call(v.stockBySize || {}, size))
  }
  return (p.sizes || []).includes(size)
}

/** Tránh nháy mở rộng trước khi effect chạy (chỉ SPA) */
const initialFilterSectionsOpen = () => {
  if (typeof window === 'undefined') return true
  try {
    const q = new URLSearchParams(window.location.search || '')
    const bare =
      window.location.pathname === '/collection' &&
      !q.get('dept') &&
      !q.get('slug') &&
      !q.get('group')
    return !bare
  } catch {
    return true
  }
}

const Collection = () => {
  const { products, search, getProductSalePrice } = useContext(ShopContext)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [showFilter, setShowFilter] = useState(false)
  const [sortType, setSortType] = useState('relavent')

  const [priceQuick, setPriceQuick] = useState('')
  const [priceMinInput, setPriceMinInput] = useState('')
  const [priceMaxInput, setPriceMaxInput] = useState('')
  const [colorFilter, setColorFilter] = useState('')
  const [sizeFilter, setSizeFilter] = useState('')

  const [allPagePickSlug, setAllPagePickSlug] = useState(null)

  const [openDept, setOpenDept] = useState(() => ({
    Men: false,
    Women: false,
    Kids: false
  }))

  const [secColor, setSecColor] = useState(initialFilterSectionsOpen)
  const [secSize, setSecSize] = useState(initialFilterSectionsOpen)
  const [secPrice, setSecPrice] = useState(initialFilterSectionsOpen)

  const slugParam = String(searchParams.get('slug') || '').trim()
  const groupParam = String(searchParams.get('group') || '').trim()
  const deptParam = String(searchParams.get('dept') || '').trim()

  /** Trang chỉ /collection — bộ lọc thu gọn mặc định */
  const isAllProductsOnly =
    location.pathname === '/collection' && !deptParam && !slugParam && !groupParam

  const urlDerivedSlugs = useMemo(() => {
    if (slugParam) return new Set([slugParam])
    if (groupParam && (deptParam === 'Men' || deptParam === 'Women' || deptParam === 'Kids')) {
      const dep = DEPARTMENTS.find((d) => d.id === deptParam)
      const g = dep?.groups.find((x) => x.id === groupParam)
      if (g) return new Set(g.items.map((i) => i.slug))
    }
    return new Set()
  }, [slugParam, groupParam, deptParam])

  const catalogSlugSet = urlDerivedSlugs

  useEffect(() => {
    if (!isAllProductsOnly) setAllPagePickSlug(null)
  }, [isAllProductsOnly])

  useEffect(() => {
    if (isAllProductsOnly) {
      setOpenDept({ Men: false, Women: false, Kids: false })
      setSecColor(false)
      setSecSize(false)
      setSecPrice(false)
    } else {
      setSecColor(true)
      setSecSize(true)
      setSecPrice(true)
    }
  }, [isAllProductsOnly])

  const listAfterCatalog = useMemo(() => {
    let list = (products || []).slice()
    if (deptParam === 'Men' || deptParam === 'Women' || deptParam === 'Kids') {
      list = list.filter((p) => String(p.category) === deptParam)
    }
    const q = String(search || '').trim().toLowerCase()
    if (q) {
      list = list.filter((p) => productMatchesQuery(p, q))
    }
    if (catalogSlugSet.size > 0) {
      list = list.filter((p) => productMatchesCatalogFilter(p, catalogSlugSet))
    }
    if (isAllProductsOnly && allPagePickSlug) {
      list = list.filter((p) => productMatchesCatalogFilter(p, new Set([allPagePickSlug])))
    }
    return list
  }, [products, search, deptParam, catalogSlugSet, isAllProductsOnly, allPagePickSlug])

  const priceCustomMin = parsePriceDigits(priceMinInput)
  const priceCustomMax = parsePriceDigits(priceMaxInput)

  const baseList = useMemo(() => {
    let list = listAfterCatalog.slice()
    if (colorFilter) {
      list = list.filter((p) => {
        const vs = Array.isArray(p.variants) ? p.variants : []
        return vs.some((v) => colorKeyFromVariant(v) === colorFilter)
      })
    }
    if (sizeFilter) {
      list = list.filter((p) => productHasSize(p, sizeFilter))
    }
    if (priceQuick) {
      list = list.filter((p) => priceQuickTest(priceQuick, getProductSalePrice(p)))
    } else if (priceCustomMin != null || priceCustomMax != null) {
      const lo = priceCustomMin != null ? priceCustomMin : 0
      const hi = priceCustomMax != null ? priceCustomMax : Number.POSITIVE_INFINITY
      list = list.filter((p) => {
        const pr = getProductSalePrice(p)
        return pr >= lo && pr <= hi
      })
    }
    return list
  }, [
    listAfterCatalog,
    colorFilter,
    sizeFilter,
    priceQuick,
    priceCustomMin,
    priceCustomMax,
    getProductSalePrice
  ])

  const colorOptions = useMemo(() => {
    const map = new Map()
    listAfterCatalog.forEach((p) => {
      const vs = Array.isArray(p.variants) ? p.variants : []
      vs.forEach((v) => {
        const key = colorKeyFromVariant(v)
        if (!key || key === 'name:') return
        const label = String(v.colorName || '').trim() || 'Màu'
        const hex = sanitizeHex(v.colorHex)
        if (!map.has(key)) map.set(key, { key, label, hex })
      })
    })
    return Array.from(map.values())
  }, [listAfterCatalog])

  const sizeOptions = useMemo(() => {
    const set = new Set()
    listAfterCatalog.forEach((p) => {
      const vs = Array.isArray(p.variants) ? p.variants : []
      if (vs.length) {
        vs.forEach((v) => {
          Object.keys(v.stockBySize || {}).forEach((s) => set.add(String(s)))
        })
      } else {
        ;(p.sizes || []).forEach((s) => set.add(String(s)))
      }
    })
    return sortSizeLabels(Array.from(set))
  }, [listAfterCatalog])

  const sizeHasGlobalStock = (size) =>
    listAfterCatalog.some((p) => {
      const vs = Array.isArray(p.variants) ? p.variants : []
      if (vs.length) return vs.some((v) => stockForVariantSize(v, size) > 0)
      return (p.sizes || []).includes(size)
    })

  const [filterProducts, setFilterProducts] = useState([])

  useEffect(() => {
    let list = baseList.slice()
    if (sortType === 'low-high') {
      list = list.sort((a, b) => getProductSalePrice(a) - getProductSalePrice(b))
    } else if (sortType === 'high-low') {
      list = list.sort((a, b) => getProductSalePrice(b) - getProductSalePrice(a))
    }
    setFilterProducts(list)
  }, [baseList, sortType, getProductSalePrice])

  const clearAllFilters = () => {
    setAllPagePickSlug(null)
    setOpenDept({ Men: false, Women: false, Kids: false })
    setPriceQuick('')
    setPriceMinInput('')
    setPriceMaxInput('')
    setColorFilter('')
    setSizeFilter('')
    navigate('/collection')
  }

  const setQuickPrice = (id) => {
    setPriceQuick(id)
    setPriceMinInput('')
    setPriceMaxInput('')
  }

  const onCustomPriceChange = (which, val) => {
    if (which === 'min') setPriceMinInput(val)
    else setPriceMaxInput(val)
    setPriceQuick('')
  }

  const FilterSection = ({ title, open, onToggle, dense, children }) => (
    <div
      className={`border border-gray-300 rounded-lg bg-white overflow-hidden ${dense ? 'border-gray-200' : ''}`}
    >
      <button
        type='button'
        onClick={() => onToggle(!open)}
        className={`flex w-full items-center justify-between text-left ${dense ? 'px-2.5 py-2' : 'px-3 py-2.5'}`}
      >
        <span
          className={`font-bold tracking-wide text-gray-900 ${dense ? 'text-[10px]' : 'text-xs'}`}
        >
          {title}
        </span>
        <span className='text-gray-500 text-base leading-none'>{open ? '—' : '+'}</span>
      </button>
      {open ? (
        <div className={`border-t border-gray-100 ${dense ? 'px-2.5 pb-2 pt-0' : 'px-3 pb-3 pt-0'}`}>{children}</div>
      ) : null}
    </div>
  )

  const dense = isAllProductsOnly

  return (
    <div className='flex flex-col sm:flex-row gap-1 sm:gap-10 pt-10 border-t'>
      <div className={`min-w-60 max-w-[320px] ${dense ? 'max-w-[280px]' : ''}`}>
        <p
          onClick={() => setShowFilter(!showFilter)}
          className='my-2 text-xl flex items-center cursor-pointer gap-2 font-semibold tracking-wide'
        >
          {isAllProductsOnly ? 'Bộ lọc' : 'BỘ LỌC'}
          <img className={`h-3 sm:hidden ${showFilter ? 'rotate-90' : ''}`} src={assets.dropdown_icon} alt='' />
        </p>

        <div className={`space-y-2 ${showFilter ? '' : 'hidden'} sm:block`}>
          <button
            type='button'
            onClick={clearAllFilters}
            className={`w-full rounded-md border border-blue-600 bg-blue-600 font-semibold text-white hover:bg-blue-700 active:bg-blue-800 ${
              dense ? 'px-2 py-2 text-[11px]' : 'px-3 py-2.5 text-xs'
            }`}
          >
            {isAllProductsOnly ? 'Xóa tất cả' : 'Xóa bộ lọc'}
          </button>

          {isAllProductsOnly ? (
            <div className='border border-gray-300 rounded-lg p-3 bg-white'>
              <p className='mb-1.5 text-sm font-semibold text-gray-900'>Danh mục</p>
              <p className='text-[11px] text-gray-500 mb-3'>
                Lọc nhanh theo đối tượng
              </p>
              {DEPARTMENTS.map((dep) => (
                <div key={dep.id} className='mb-3 border-b border-gray-100 last:border-0 pb-2 last:pb-0'>
                  <button
                    type='button'
                    onClick={() =>
                      setOpenDept((o) => {
                        const willOpen = !o[dep.id]
                        if (willOpen) {
                          return { Men: dep.id === 'Men', Women: dep.id === 'Women', Kids: dep.id === 'Kids' }
                        }
                        return { ...o, [dep.id]: false }
                      })
                    }
                    className='flex w-full items-center justify-between text-sm font-medium text-gray-800 py-1'
                  >
                    {dep.label}
                    <span className='text-gray-400 text-xs'>{openDept[dep.id] ? '▾' : '›'}</span>
                  </button>
                  {openDept[dep.id] ? (
                    <div className='mt-2 space-y-2 pl-1'>
                      {dep.groups.map((g) => (
                        <div key={g.id}>
                          <p className='text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1'>
                            {g.label}
                          </p>
                          <div className='grid grid-cols-3 gap-1.5'>
                            {g.items.map((item) => {
                              const on = allPagePickSlug === item.slug
                              return (
                                <button
                                  key={item.slug}
                                  type='button'
                                  onClick={() =>
                                    setAllPagePickSlug((s) => (s === item.slug ? null : item.slug))
                                  }
                                  className={`product-size-btn relative flex flex-col items-center justify-center overflow-hidden border px-0.5 py-1.5 text-[10px] leading-tight min-h-[52px] transition-all ${
                                    on
                                      ? 'product-size-btn--selected border-red-600 bg-white text-gray-900'
                                      : 'border-gray-300 bg-white text-gray-700 hover:border-red-400'
                                  }`}
                                >
                                  <span className='line-clamp-2 text-center'>{item.label}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <FilterSection title='MÀU SẮC' open={secColor} onToggle={setSecColor} dense={dense}>
            <div className={`flex flex-wrap gap-1.5 items-center ${dense ? 'pt-1.5' : 'pt-2'}`}>
              <button
                type='button'
                onClick={() => setColorFilter('')}
                className={`rounded border ${dense ? 'px-1.5 py-0.5 text-[10px]' : 'text-xs px-2 py-1'} ${
                  colorFilter === '' ? 'border-black' : 'border-gray-200'
                }`}
              >
                Tất cả
              </button>
              {colorOptions.map((c) => {
                const active = colorFilter === c.key
                const fill = c.hex || '#E5E7EB'
                return (
                  <button
                    key={c.key}
                    type='button'
                    title={c.label}
                    onClick={() => setColorFilter(active ? '' : c.key)}
                    className={`rounded-full border-2 flex items-center justify-center transition-all ${
                      dense ? 'w-7 h-7' : 'w-9 h-9'
                    } ${active ? 'border-black ring-2 ring-black/20 scale-105' : 'border-gray-200 hover:border-gray-400'}`}
                  >
                    <span
                      className={`rounded-full border border-black/10 ${dense ? 'w-4 h-4' : 'w-6 h-6'}`}
                      style={{ backgroundColor: fill }}
                    />
                  </button>
                )
              })}
            </div>
            {!colorOptions.length ? (
              <p className='text-[10px] text-gray-400 mt-1.5'>Chưa có dữ liệu màu.</p>
            ) : null}
          </FilterSection>

          <FilterSection title='KÍCH THƯỚC' open={secSize} onToggle={setSecSize} dense={dense}>
            {!dense ? (
              <p className='text-[11px] text-gray-500 pt-2 mb-2'>Ô mờ = hết hàng trong danh sách đang xem.</p>
            ) : null}
            <div className={`flex flex-wrap gap-1.5 ${dense ? 'pt-1.5' : ''}`}>
              <button
                type='button'
                onClick={() => setSizeFilter('')}
                className={`rounded border ${dense ? 'px-1.5 py-0.5 min-w-[32px] text-[10px]' : 'px-2 py-1 text-xs'} ${
                  sizeFilter === '' ? 'border-black bg-black text-white' : 'border-gray-200'
                }`}
              >
                Tất cả
              </button>
              {sizeOptions.map((sz) => {
                const has = sizeHasGlobalStock(sz)
                const active = sizeFilter === sz
                return (
                  <button
                    key={sz}
                    type='button'
                    onClick={() => setSizeFilter(active ? '' : sz)}
                    className={`rounded border transition-all ${
                      dense ? 'min-w-[30px] px-1.5 py-0.5 text-[10px]' : 'min-w-[36px] px-2 py-1 text-xs'
                    } ${active ? 'border-black bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-800'} ${
                      !has && !active ? 'opacity-45 border-dashed' : ''
                    }`}
                    title={!has && !active ? 'Hết hàng' : ''}
                  >
                    {sz}
                  </button>
                )
              })}
            </div>
          </FilterSection>

          <FilterSection title='MỨC GIÁ' open={secPrice} onToggle={setSecPrice} dense={dense}>
            <div className={`flex items-center gap-1.5 ${dense ? 'pt-1.5' : 'pt-2'}`}>
              <input
                type='text'
                inputMode='numeric'
                placeholder='Từ'
                value={priceMinInput}
                onChange={(e) => onCustomPriceChange('min', e.target.value)}
                className={`w-full min-w-0 border border-gray-300 rounded ${dense ? 'px-1.5 py-1 text-[10px]' : 'px-2 py-1.5 text-xs'}`}
              />
              <span className='text-gray-400 shrink-0 text-xs'>—</span>
              <input
                type='text'
                inputMode='numeric'
                placeholder='Đến'
                value={priceMaxInput}
                onChange={(e) => onCustomPriceChange('max', e.target.value)}
                className={`w-full min-w-0 border border-gray-300 rounded ${dense ? 'px-1.5 py-1 text-[10px]' : 'px-2 py-1.5 text-xs'}`}
              />
            </div>
            {!dense ? (
              <p className='text-[10px] text-gray-400 mt-1'>Nhập số (vd 200000).</p>
            ) : null}
            <div className={`flex flex-col gap-1.5 ${dense ? 'mt-2' : 'mt-3'}`}>
              <label
                className={`flex items-center gap-2 cursor-pointer text-gray-800 ${dense ? 'text-[10px]' : 'text-xs'}`}
              >
                <input type='radio' name='priceq' checked={priceQuick === ''} onChange={() => setQuickPrice('')} />
                Tất cả giá
              </label>
              {PRICE_QUICK_OPTS.map((o) => (
                <label
                  key={o.id}
                  className={`flex items-center gap-2 cursor-pointer text-gray-800 ${dense ? 'text-[10px]' : 'text-xs'}`}
                >
                  <input
                    type='radio'
                    name='priceq'
                    checked={priceQuick === o.id}
                    onChange={() => setQuickPrice(o.id)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </FilterSection>
        </div>
      </div>

      <div className='flex-1'>
        <div className='flex justify-between text-base sm:text-2xl mb-4 flex-wrap gap-2'>
          <Title text1={'Tất cả'} text2={'Sản phẩm'} />
          <select
            onChange={(e) => setSortType(e.target.value)}
            className='border-2 border-gray-300 text-sm px-2 rounded'
            value={sortType}
          >
            <option value='relavent'>Sắp xếp theo: Liên quan</option>
            <option value='low-high'>Sắp xếp theo: Giá thấp đến cao</option>
            <option value='high-low'>Sắp xếp theo: Giá cao đến thấp</option>
          </select>
        </div>

        {!filterProducts.length ? (
          <p className='text-sm text-gray-500 py-10'>Không có sản phẩm phù hợp. Thử bỏ bộ lọc hoặc tìm theo tên / mã SP.</p>
        ) : (
          <div className='grid grid-cols-3 gap-3 sm:gap-5 md:gap-6 gap-y-6 sm:gap-y-8 md:gap-y-10'>
            {filterProducts.map((item, index) => (
              <ProductItem
                key={item._id || index}
                name={item.name}
                id={item._id}
                price={item.price}
                image={item.image}
                variants={item.variants}
                mainImageUrl={item.mainImageUrl}
                hoverImageUrl={item.hoverImageUrl}
                discountPercent={item.discountPercent}
                salePrice={item.salePrice}
                stockHint={getStockHint(item, colorFilter, sizeFilter)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Collection
