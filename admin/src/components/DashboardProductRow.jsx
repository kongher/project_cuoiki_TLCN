import { useState } from 'react'
import { Link } from 'react-router-dom'

const DashboardProductRow = ({
  rank,
  item,
  totalLabel,
  totalValue,
  totalValueClass,
  breakdown,
  breakdownValueKey,
  breakdownValueLabel,
  breakdownValueClass,
}) => {
  const [open, setOpen] = useState(false)
  const id = item.productId
  const lines = breakdown || []

  return (
    <li className='border-b pb-2 last:border-0'>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='w-full flex justify-between gap-2 text-sm text-left hover:bg-gray-50 rounded px-1 py-1 -mx-1'
      >
        <span className='min-w-0'>
          <span className='font-bold text-gray-400 mr-2'>#{rank}</span>
          <span className='font-medium'>{item.name}</span>
          {item.parentSku ? (
            <span className='block text-xs text-gray-500 font-mono mt-0.5'>Mã SP: {item.parentSku}</span>
          ) : null}
        </span>
        <span className='flex items-center gap-2 shrink-0'>
          <span className={`font-medium whitespace-nowrap ${totalValueClass}`}>
            {totalValue} {totalLabel}
          </span>
          <span className='text-gray-400 text-xs'>{open ? '▲' : '▼'}</span>
        </span>
      </button>

      {open && (
        <div className='mt-2 ml-6 mr-1 p-3 bg-gray-50 rounded border text-xs'>
          <p className='font-medium text-gray-700 mb-2'>
            {item.name} (Tổng: {totalValue} {totalLabel})
          </p>
          {lines.length === 0 ? (
            <p className='text-gray-500'>Không có chi tiết SKU</p>
          ) : (
            <ul className='space-y-1.5'>
              {lines.map((line) => (
                <li key={`${id}-${line.sku}-${line.size}`} className='flex justify-between gap-2 font-mono'>
                  <span className='text-gray-800 truncate'>
                    {line.sku}
                    {line.colorName && line.colorName !== '—' ? (
                      <span className='font-sans text-gray-500 ml-1'>
                        ({line.colorName}
                        {line.size && line.size !== '—' ? ` · ${line.size}` : ''})
                      </span>
                    ) : line.size && line.size !== '—' ? (
                      <span className='font-sans text-gray-500 ml-1'>(Size {line.size})</span>
                    ) : null}
                  </span>
                  <span className={`shrink-0 font-sans font-medium ${breakdownValueClass}`}>
                    {line[breakdownValueKey]} {breakdownValueLabel}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            to={`/edit/${id}`}
            className='inline-block mt-3 text-blue-700 hover:underline font-sans'
            onClick={(e) => e.stopPropagation()}
          >
            Mở sản phẩm →
          </Link>
        </div>
      )}
    </li>
  )
}

export default DashboardProductRow
