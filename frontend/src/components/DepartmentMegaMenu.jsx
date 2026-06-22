import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { DEPARTMENTS } from '../config/catalogTaxonomy'

const DepartmentMegaMenu = ({ deptId, label, active, compact, scrollToTop, onCloseSearch }) => {
  const dept = DEPARTMENTS.find((d) => d.id === deptId)
  const groups = dept?.groups || []
  const [open, setOpen] = useState(false)
  /** Cột phải chỉ mở sau khi bấm một nhóm (Quần / Áo / …) */
  const [expandedGroupId, setExpandedGroupId] = useState(null)
  const leaveTimer = useRef(null)

  const clearLeave = () => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current)
      leaveTimer.current = null
    }
  }

  const scheduleClose = useCallback(() => {
    clearLeave()
    leaveTimer.current = setTimeout(() => {
      setOpen(false)
      setExpandedGroupId(null)
      leaveTimer.current = null
    }, 180)
  }, [])

  const onEnter = () => {
    clearLeave()
    setOpen(true)
  }

  const expanded = groups.find((g) => g.id === expandedGroupId)

  return (
    <div className='relative' onMouseEnter={onEnter} onMouseLeave={scheduleClose}>
      <button
        type='button'
        aria-expanded={open}
        aria-haspopup='true'
        onClick={(e) => {
          e.preventDefault()
          clearLeave()
          setOpen((v) => !v)
          if (open) setExpandedGroupId(null)
        }}
        className={`text-base md:text-[1.0625rem] font-bold tracking-wide transition-colors cursor-pointer bg-transparent border-0 p-0 ${
          active ? 'text-gray-900 border-b-2 border-gray-900 pb-0.5' : 'text-gray-900 hover:text-black'
        }`}
      >
        {label}
      </button>

      {open && groups.length > 0 ? (
        <div
          className='absolute left-0 top-full z-[70] pt-2'
          onMouseEnter={onEnter}
          onMouseLeave={scheduleClose}
        >
          <div
            className={`flex rounded-md border border-gray-200 bg-white shadow-xl overflow-hidden ${
              expanded ? 'min-w-[min(92vw,520px)]' : 'min-w-[240px]'
            } ${compact ? 'text-xs' : 'text-sm'}`}
          >
            <div className={`py-2 bg-white ${expanded ? 'w-[42%] border-r border-gray-200' : 'w-full'}`}>
              {groups.map((g) => {
                const isOpen = expandedGroupId === g.id
                return (
                  <button
                    key={g.id}
                    type='button'
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setExpandedGroupId((cur) => (cur === g.id ? null : g.id))
                    }}
                    className={`flex w-full items-center justify-between px-4 py-2.5 text-left font-medium transition-colors ${
                      isOpen ? 'bg-gray-50 text-gray-900 border-b-2 border-gray-900' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{g.label}</span>
                    <span className='text-gray-400 text-base leading-none'>›</span>
                  </button>
                )
              })}
            </div>
            {expanded ? (
              <div className='min-w-[200px] flex-1 bg-gray-100 py-3 px-4'>
                <p className='mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500'>
                  {expanded.label}
                </p>
                <Link
                  to={`/collection?dept=${deptId}&group=${encodeURIComponent(expanded.id)}`}
                  onClick={() => {
                    scrollToTop()
                    onCloseSearch()
                    setOpen(false)
                    setExpandedGroupId(null)
                  }}
                  className='block rounded-md px-2 py-2 font-bold text-gray-900 hover:bg-white/80'
                >
                  Xem tất cả
                </Link>
                <div className='my-2 border-t border-gray-200/80' />
                <ul className='space-y-0.5'>
                  {expanded.items.map((item) => (
                    <li key={item.slug}>
                      <Link
                        to={`/collection?dept=${deptId}&slug=${encodeURIComponent(item.slug)}`}
                        onClick={() => {
                          scrollToTop()
                          onCloseSearch()
                          setOpen(false)
                          setExpandedGroupId(null)
                        }}
                        className='block rounded-md px-2 py-1.5 text-gray-800 hover:bg-white/80 hover:text-black'
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default DepartmentMegaMenu
