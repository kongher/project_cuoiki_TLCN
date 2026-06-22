import React, { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { assets } from '../assets/assets'

const linkClass = ({ isActive }) =>
  `flex items-center gap-2 border border-gray-300 border-r-0 px-3 py-2 rounded-l text-[14px] ${
    isActive ? 'bg-gray-100 border-black font-medium' : 'hover:bg-gray-50'
  }`

const childLinkClass = ({ isActive }) =>
  `flex items-center gap-2 pl-9 pr-3 py-2 text-[13px] border-l-2 ml-3 ${
    isActive ? 'border-black font-medium text-black bg-gray-50' : 'border-transparent text-gray-600 hover:text-black hover:bg-gray-50'
  }`

const MenuGroup = ({ id, title, open, onToggle, children }) => (
  <div className='mb-1'>
    <button
      type='button'
      onClick={() => onToggle(id)}
      className='w-full flex items-center justify-between gap-2 px-3 py-2 text-[14px] font-semibold text-gray-800 hover:bg-gray-50 rounded-l'
    >
      <span className='hidden md:block text-left'>{title}</span>
      <span className='md:hidden text-left flex-1'>{title}</span>
      <span className={`text-xs transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
    </button>
    {open && <div className='flex flex-col gap-0.5 mt-0.5'>{children}</div>}
  </div>
)

const Badge = ({ count }) =>
  count > 0 ? (
    <span className='ml-auto inline-flex items-center justify-center min-w-[18px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold'>
      {count}
    </span>
  ) : null

const MENU_GROUPS = [
  {
    id: 'products',
    title: 'Quản lý Sản phẩm',
    paths: ['/add', '/list', '/colors', '/inventory', '/edit'],
    items: [
      { to: '/add', label: 'Thêm sản phẩm', icon: <img className='w-4 h-4' src={assets.add_icon} alt='' /> },
      { to: '/list', label: 'Danh sách sản phẩm', icon: <img className='w-4 h-4' src={assets.order_icon} alt='' /> },
      { to: '/colors', label: 'Danh mục màu', icon: <span className='text-base leading-none'>🎨</span> },
      { to: '/inventory', label: 'Quản lý kho', icon: <span className='text-base leading-none'>📦</span> },
    ],
  },
  {
    id: 'sales',
    title: 'Quản lý Bán hàng',
    paths: ['/orders', '/customers', '/reviews'],
    items: [
      { to: '/orders', label: 'Đơn hàng', icon: <img className='w-4 h-4' src={assets.order_icon} alt='' />, badgeKey: 'orders' },
      { to: '/customers', label: 'Khách hàng', icon: <span className='text-base leading-none'>👤</span> },
      { to: '/reviews', label: 'Quản lý đánh giá', icon: <span className='text-base leading-none'>⭐</span>, badgeKey: 'reviews' },
    ],
  },
  {
    id: 'marketing',
    title: 'Chiến dịch Marketing',
    paths: ['/list-coupon', '/add-coupon'],
    items: [
      { to: '/list-coupon', label: 'Danh sách coupon', icon: <span className='text-base leading-none'>📋</span> },
      { to: '/add-coupon', label: 'Thêm mã giảm giá', icon: <span className='text-base leading-none'>🏷️</span> },
    ],
  },
  {
    id: 'cms',
    title: 'Cài đặt Giao diện',
    paths: ['/banners'],
    items: [
      {
        to: '/banners',
        label: 'Quản lý Banner (Trang chủ)',
        icon: <span className='text-base leading-none'>🖼️</span>,
      },
    ],
  },
]

const Sidebar = ({ pendingReviewCount = 0, pendingOrderCount = 0 }) => {
  const { pathname } = useLocation()

  const activeGroupId = useMemo(() => {
    const hit = MENU_GROUPS.find((g) =>
      g.paths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
    )
    return hit?.id || null
  }, [pathname])

  const [openGroups, setOpenGroups] = useState(() =>
    MENU_GROUPS.reduce((acc, g) => ({ ...acc, [g.id]: false }), {})
  )

  useEffect(() => {
    if (!activeGroupId) return
    setOpenGroups((prev) => ({ ...prev, [activeGroupId]: true }))
  }, [activeGroupId])

  const toggleGroup = (id) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const badges = {
    orders: pendingOrderCount,
    reviews: pendingReviewCount,
  }

  return (
    <div className='w-[18%] min-h-screen border-r-2 shrink-0'>
      <div className='flex flex-col gap-2 pt-6 pl-[12%] pr-2 text-[15px]'>

        {MENU_GROUPS.map((group) => (
          <MenuGroup
            key={group.id}
            id={group.id}
            title={group.title}
            open={!!openGroups[group.id]}
            onToggle={toggleGroup}
          >
            {group.items.map((item) => (
              <NavLink key={item.to} to={item.to} className={childLinkClass}>
                {item.icon}
                <span className='hidden md:inline flex-1'>{item.label}</span>
                <Badge count={item.badgeKey ? badges[item.badgeKey] : 0} />
              </NavLink>
            ))}
          </MenuGroup>
        ))}

        <hr className='my-2 border-gray-200' />

        <NavLink to='/dashboard' className={linkClass}>
          <span className='text-lg leading-none'>📊</span>
          <p className='hidden md:block'>Thống kê</p>
        </NavLink>
      </div>
    </div>
  )
}

export default Sidebar
