import { useEffect, useState } from 'react'
import { formatRemainingShort } from '../utils/couponTime'

const VoucherRemainingTime = ({ expiresAt, className = 'text-amber-700 text-xs mt-0.5' }) => {
  const [label, setLabel] = useState('')

  useEffect(() => {
    if (!expiresAt) {
      setLabel('')
      return undefined
    }
    const tick = () => setLabel(formatRemainingShort(expiresAt))
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [expiresAt])

  if (!label) return null

  return <p className={className}>⏳ {label}</p>
}

export default VoucherRemainingTime
