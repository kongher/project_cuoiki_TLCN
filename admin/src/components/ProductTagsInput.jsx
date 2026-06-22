import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import { TAG_DISCOUNT } from '../config/productTags'
import {
  PRODUCT_TAG_DESTINATION_GROUPS,
  PRODUCT_TAG_DESTINATIONS,
  getProductTagLabel,
  getProductTagLink,
  tagValueFromStored,
} from '../config/productTagDestinations'

const GROUP_CUSTOM = 'Nhãn tùy chỉnh (không điều hướng)'

const ProductTagsInput = ({ value = [], onChange, token, refreshKey = 0 }) => {
  const [draft, setDraft] = useState('')
  const [pickValue, setPickValue] = useState('')
  const [pool, setPool] = useState([])
  const [loadingPool, setLoadingPool] = useState(false)

  const tags = Array.isArray(value) ? value : []
  const selectedValueSet = useMemo(() => new Set(tags.map(tagValueFromStored)), [tags])

  const loadPool = useCallback(async () => {
    if (!token) return
    setLoadingPool(true)
    try {
      const res = await axios.get(`${backendUrl}/api/product/admin/tags`, {
        headers: { token },
      })
      if (res.data?.success && Array.isArray(res.data.tags)) {
        setPool(res.data.tags)
      }
    } catch {
      /* giữ pool hiện tại */
    } finally {
      setLoadingPool(false)
    }
  }, [token])

  useEffect(() => {
    loadPool()
  }, [loadPool, refreshKey])

  const addTag = (raw) => {
    const stored = String(raw || '').trim()
    if (!stored) return
    const canonical = tagValueFromStored(stored)
    const exists = tags.some((t) => tagValueFromStored(t) === canonical || t === stored)
    if (exists) return
    onChange([...tags, canonical])
    setDraft('')
    setPickValue('')
  }

  const removeTag = (tag) => {
    const key = tagValueFromStored(tag)
    onChange(tags.filter((t) => tagValueFromStored(t) !== key))
  }

  const destinationGroups = useMemo(() => {
    const available = PRODUCT_TAG_DESTINATIONS.filter((d) => !selectedValueSet.has(d.value))
    return PRODUCT_TAG_DESTINATION_GROUPS.map((group) => ({
      label: group,
      items: available.filter((d) => d.group === group),
    })).filter((g) => g.items.length > 0)
  }, [selectedValueSet])

  const customPoolItems = useMemo(() => {
    const destValues = new Set(PRODUCT_TAG_DESTINATIONS.map((d) => d.value))
    const destLabels = new Set(PRODUCT_TAG_DESTINATIONS.map((d) => d.label))
    return pool.filter((t) => {
      const v = tagValueFromStored(t)
      if (selectedValueSet.has(v)) return false
      if (destValues.has(v) || destLabels.has(t)) return false
      return true
    })
  }, [pool, selectedValueSet])

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(draft)
    }
  }

  const hasDestinationOptions = destinationGroups.length > 0
  const hasCustomOptions = customPoolItems.length > 0 || !selectedValueSet.has(TAG_DISCOUNT)

  return (
    <div className='w-full max-w-[900px]'>
      <p className='mb-2 font-medium'>Nhãn sản phẩm (Tags)</p>

      {tags.length > 0 && (
        <div className='flex flex-wrap gap-2 mb-3'>
          {tags.map((tag) => {
            const label = getProductTagLabel(tag)
            const link = getProductTagLink(tag)
            return (
              <span
                key={tagValueFromStored(tag)}
                className='inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 text-gray-800 text-xs font-medium border border-gray-200'
                title={link ? `Khách bấm sẽ chuyển tới: ${label}` : label}
              >
                {label}
                <button
                  type='button'
                  onClick={() => removeTag(tag)}
                  className='text-gray-500 hover:text-red-600 leading-none'
                  aria-label={`Xóa nhãn ${label}`}
                >
                  ×
                </button>
              </span>
            )
          })}
        </div>
      )}

      <div className='mb-3'>
        <select
          className='border px-3 py-2 rounded w-full text-sm bg-white outline-none focus:border-black disabled:bg-gray-50'
          value={pickValue}
          disabled={!hasDestinationOptions && !hasCustomOptions}
          onChange={(e) => {
            const v = e.target.value
            setPickValue(v)
            if (v) addTag(v)
          }}
        >
          <option value=''>
            {hasDestinationOptions || hasCustomOptions
              ? '— Chọn trang / nhãn —'
              : '— Đã chọn hết nhãn —'}
          </option>
          {destinationGroups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.items.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </optgroup>
          ))}
          {hasCustomOptions && (
            <optgroup label={GROUP_CUSTOM}>
              {!selectedValueSet.has(TAG_DISCOUNT) && (
                <option value={TAG_DISCOUNT}>{TAG_DISCOUNT}</option>
              )}
              {customPoolItems.map((t) => (
                <option key={t} value={t}>
                  {getProductTagLabel(t)}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <div>
        <label className='text-xs text-gray-500 block mb-1'>Nhãn mới</label>
        <div className='flex gap-2 flex-wrap sm:flex-nowrap'>
          <input
            type='text'
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder='Nhập nhãn mới…'
            className='flex-1 min-w-[200px] border px-3 py-2 rounded text-sm outline-none focus:border-black'
          />
          <button
            type='button'
            onClick={() => addTag(draft)}
            disabled={!String(draft).trim()}
            className='px-4 py-2 rounded border border-gray-300 text-sm bg-gray-50 hover:bg-gray-100 disabled:opacity-50 whitespace-nowrap'
          >
            + Thêm nhanh
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductTagsInput
