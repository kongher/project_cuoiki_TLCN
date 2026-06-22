import { useState } from 'react'

/** Ô nhập số lượng tồn — khi đang 0, focus để xóa rồi gõ (tránh 010). */
const StockQtyInput = ({ value = 0, onChange, className = '' }) => {
  const numericValue = Math.max(0, Number(value) || 0)
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState('')

  const displayValue = focused
    ? text
    : numericValue === 0
      ? '0'
      : String(numericValue)

  return (
    <input
      type='text'
      inputMode='numeric'
      autoComplete='off'
      className={className}
      value={displayValue}
      onFocus={(e) => {
        setFocused(true)
        setText(numericValue === 0 ? '' : String(numericValue))
        if (numericValue !== 0) e.target.select()
      }}
      onBlur={() => {
        const t = text.replace(/\D/g, '')
        const next = t === '' ? 0 : Math.max(0, parseInt(t, 10) || 0)
        onChange(next)
        setFocused(false)
        setText('')
      }}
      onChange={(e) => {
        const t = e.target.value.replace(/\D/g, '')
        setText(t)
        if (t === '') return
        onChange(Math.max(0, parseInt(t, 10) || 0))
      }}
    />
  )
}

export default StockQtyInput
