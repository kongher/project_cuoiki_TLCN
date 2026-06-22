import { useContext, useEffect, useState } from 'react'
import { assets } from '../assets/assets'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ShopContext } from '../context/ShopContext'
import DepartmentMegaMenu from './DepartmentMegaMenu'
import AccountMenu from './AccountMenu'
import NotificationMenu from './NotificationMenu'
import { DEPARTMENTS } from '../config/catalogTaxonomy'
import MenuAnnouncementBar from './MenuAnnouncementBar'

const Navbar = ({ compact = false }) => {
  const [visible, setVisible] = useState(false)

  const { setShowSearch, getCartCount, navigate } = useContext(ShopContext)
  const location = useLocation()

  const deptInCollection = () => {
    if (location.pathname !== '/collection') return null
    return new URLSearchParams(location.search).get('dept')
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }

  const dept = deptInCollection()
  const collectionAllActive =
    location.pathname === '/collection' &&
    !new URLSearchParams(location.search).get('dept') &&
    !new URLSearchParams(location.search).get('slug') &&
    !new URLSearchParams(location.search).get('group')
  const [mobileDept, setMobileDept] = useState(null)
  const [mobileGroupId, setMobileGroupId] = useState(null)
  useEffect(() => {
    if (!visible) {
      setMobileDept(null)
      setMobileGroupId(null)
    }
  }, [visible])

  return (
    <>
      <MenuAnnouncementBar />

      <div
        className={`flex items-center justify-between px-4 sm:px-[5vw] md:px-[7vw] lg:px-[9vw] transition-[padding] duration-300 ease-out ${
          compact ? 'py-2.5 sm:py-3' : 'py-5 sm:py-6'
        }`}
      >
        <Link to='/' onClick={scrollToTop} className='shrink-0 transition-transform duration-300 ease-out'>
          <img
            src={assets.logo}
            className={`${compact ? 'w-[7.25rem] sm:w-32' : 'w-36 sm:w-40'} h-auto transition-[width] duration-300 ease-out`}
            alt=''
          />
        </Link>

        <nav className='hidden sm:flex items-center gap-3 md:gap-5 text-base md:text-[1.0625rem] font-bold text-gray-900 tracking-wide flex-wrap justify-end'>
          <NavLink
            to='/'
            onClick={scrollToTop}
            className={({ isActive }) =>
              `group flex flex-col items-center gap-1 ${isActive ? 'text-gray-900' : ''}`
            }
          >
            <p>TRANG CHỦ</p>
            <hr className='w-full border-none h-[1.5px] bg-gray-800 transform origin-left transition-transform duration-300 scale-x-0 group-hover:scale-x-100 group-[.active]:scale-x-100' />
          </NavLink>

          <NavLink
            to='/collection'
            onClick={() => {
              scrollToTop()
              setShowSearch(false)
            }}
            className={() =>
              `group flex flex-col items-center gap-1 ${collectionAllActive ? 'text-gray-900' : ''}`
            }
          >
            <p className='text-center leading-tight max-w-[5.5rem] sm:max-w-none'>TẤT CẢ SẢN PHẨM</p>
            <hr
              className={`w-full border-none h-[1.5px] bg-gray-800 transform origin-left transition-transform duration-300 ${
                collectionAllActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
              }`}
            />
          </NavLink>
          <DepartmentMegaMenu
            deptId='Men'
            label='NAM'
            compact={compact}
            active={dept === 'Men'}
            scrollToTop={scrollToTop}
            onCloseSearch={() => setShowSearch(false)}
          />
          <DepartmentMegaMenu
            deptId='Women'
            label='NỮ'
            compact={compact}
            active={dept === 'Women'}
            scrollToTop={scrollToTop}
            onCloseSearch={() => setShowSearch(false)}
          />
          <DepartmentMegaMenu
            deptId='Kids'
            label='TRẺ EM'
            compact={compact}
            active={dept === 'Kids'}
            scrollToTop={scrollToTop}
            onCloseSearch={() => setShowSearch(false)}
          />

          <div className='relative group/sale'>
            <Link
              to='/sale'
              onClick={() => {
                scrollToTop()
                setShowSearch(false)
              }}
              className={`font-bold tracking-wide text-base md:text-[1.0625rem] ${
                location.pathname === '/sale' ? 'text-red-700' : 'text-red-600'
              } hover:text-red-800`}
            >
              SALE
            </Link>
            <div className='hidden group-hover/sale:block absolute right-0 top-full pt-2 z-[60] min-w-[200px]'>
              <div className='bg-white border border-gray-200 shadow-lg rounded-md py-2 text-left text-xs font-normal'>
                <Link
                  to='/sale?dept=Men'
                  className='block px-4 py-2 text-gray-700 hover:bg-gray-50'
                  onClick={() => {
                    scrollToTop()
                    setShowSearch(false)
                  }}
                >
                  Sale cho Nam
                </Link>
                <Link
                  to='/sale?dept=Women'
                  className='block px-4 py-2 text-gray-700 hover:bg-gray-50'
                  onClick={() => {
                    scrollToTop()
                    setShowSearch(false)
                  }}
                >
                  Sale cho Nữ
                </Link>
                <Link
                  to='/sale?dept=Kids'
                  className='block px-4 py-2 text-gray-700 hover:bg-gray-50'
                  onClick={() => {
                    scrollToTop()
                    setShowSearch(false)
                  }}
                >
                  Trẻ em
                </Link>
                <Link
                  to='/sale?band=99-199'
                  className='block px-4 py-2 text-gray-700 hover:bg-gray-50 border-t border-gray-100'
                  onClick={() => {
                    scrollToTop()
                    setShowSearch(false)
                  }}
                >
                  Đồng giá 99k – 199k
                </Link>
              </div>
            </div>
          </div>

          <NavLink
            to='/about'
            onClick={scrollToTop}
            className={({ isActive }) =>
              `group flex flex-col items-center gap-1 ${isActive ? 'text-gray-900' : ''}`
            }
          >
            <p>GIỚI THIỆU</p>
            <hr className='w-full border-none h-[1.5px] bg-gray-800 transform origin-left transition-transform duration-300 scale-x-0 group-hover:scale-x-100 group-[.active]:scale-x-100' />
          </NavLink>

          <NavLink
            to='/contact'
            onClick={scrollToTop}
            className={({ isActive }) =>
              `group flex flex-col items-center gap-1 ${isActive ? 'text-gray-900' : ''}`
            }
          >
            <p>LIÊN HỆ</p>
            <hr className='w-full border-none h-[1.5px] bg-gray-800 transform origin-left transition-transform duration-300 scale-x-0 group-hover:scale-x-100 group-[.active]:scale-x-100' />
          </NavLink>
        </nav>

        <div className='flex items-center gap-6'>
          <img
            onClick={() => {
              setShowSearch(true)
              navigate('/collection')
            }}
            src={assets.search_icon}
            className='w-5 cursor-pointer'
            alt=''
          />

          <AccountMenu />

          <NotificationMenu />

          <Link to='/cart' className='relative'>
            <img src={assets.cart_icon} className='w-5 min-w-5' alt='' />
            <p className='absolute right-[-5px] bottom-[-5px] w-4 text-center leading-4 bg-red-600 text-white aspect-square rounded-full text-[8px]'>
              {getCartCount()}
            </p>
          </Link>

          <img onClick={() => setVisible(true)} src={assets.menu_icon} className='w-5 cursor-pointer sm:hidden' alt='' />
        </div>

        <div className={`absolute top-0 right-0 bottom-0 overflow-hidden bg-white transition-all ${visible ? 'w-full' : 'w-0'}`}>
          <div className='flex flex-col text-gray-600'>
            <div onClick={() => setVisible(false)} className='flex items-center gap-4 p-3 cursor-pointer'>
              <img className='h-4 rotate-180' src={assets.dropdown_icon} alt='' />
              <p>Quay lại</p>
            </div>

            <NavLink onClick={() => { setVisible(false); scrollToTop() }} className='py-2 pl-6 border' to='/'>
              TRANG CHỦ
            </NavLink>
            <NavLink
              onClick={() => {
                setVisible(false)
                scrollToTop()
                setShowSearch(false)
              }}
              className='py-2 pl-6 border'
              to='/collection'
            >
              TẤT CẢ SẢN PHẨM
            </NavLink>
            {!mobileDept ? (
              <>
                <button
                  type='button'
                  className='w-full py-2 pl-6 border text-left'
                  onClick={() => setMobileDept('Men')}
                >
                  NAM <span className='text-gray-400'>›</span>
                </button>
                <button
                  type='button'
                  className='w-full py-2 pl-6 border text-left'
                  onClick={() => setMobileDept('Women')}
                >
                  NỮ <span className='text-gray-400'>›</span>
                </button>
                <button
                  type='button'
                  className='w-full py-2 pl-6 border text-left'
                  onClick={() => setMobileDept('Kids')}
                >
                  TRẺ EM <span className='text-gray-400'>›</span>
                </button>
              </>
            ) : (
              <div className='border-b'>
                <button
                  type='button'
                  className='w-full py-2 pl-4 text-left text-sm text-gray-500'
                  onClick={() => {
                    if (mobileGroupId) setMobileGroupId(null)
                    else setMobileDept(null)
                  }}
                >
                  ‹ {mobileGroupId ? 'Nhóm' : 'Danh mục'}
                </button>
                {!mobileGroupId ? (
                  DEPARTMENTS.filter((d) => d.id === mobileDept).map((dep) => (
                    <div key={dep.id}>
                      <Link
                        to={`/collection?dept=${dep.id}`}
                        onClick={() => {
                          setVisible(false)
                          scrollToTop()
                          setShowSearch(false)
                          setMobileDept(null)
                        }}
                        className='block py-2 pl-6 text-sm font-semibold border-t'
                      >
                        Xem tất cả {dep.label}
                      </Link>
                      {dep.groups.map((g) => (
                        <button
                          key={g.id}
                          type='button'
                          className='w-full py-2 pl-8 border-t text-left text-sm'
                          onClick={() => setMobileGroupId(g.id)}
                        >
                          {g.label} <span className='text-gray-400'>›</span>
                        </button>
                      ))}
                    </div>
                  ))
                ) : (
                  DEPARTMENTS.filter((d) => d.id === mobileDept).map((dep) => {
                    const g = dep.groups.find((x) => x.id === mobileGroupId)
                    if (!g) return null
                    return (
                      <div key={g.id} className='pb-2'>
                        <Link
                          to={`/collection?dept=${dep.id}&group=${encodeURIComponent(g.id)}`}
                          onClick={() => {
                            setVisible(false)
                            scrollToTop()
                            setShowSearch(false)
                            setMobileDept(null)
                            setMobileGroupId(null)
                          }}
                          className='block py-2 pl-6 text-sm font-medium border-t'
                        >
                          Xem tất cả — {g.label}
                        </Link>
                        {g.items.map((item) => (
                          <Link
                            key={item.slug}
                            to={`/collection?dept=${dep.id}&slug=${encodeURIComponent(item.slug)}`}
                            onClick={() => {
                              setVisible(false)
                              scrollToTop()
                              setShowSearch(false)
                              setMobileDept(null)
                              setMobileGroupId(null)
                            }}
                            className='block py-1.5 pl-8 text-sm border-t border-gray-100'
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    )
                  })
                )}
              </div>
            )}
            <Link
              onClick={() => {
                setVisible(false)
                scrollToTop()
                setShowSearch(false)
              }}
              className='py-2 pl-6 border font-bold text-red-600'
              to='/sale'
            >
              SALE
            </Link>
            <p className='pl-6 pt-2 text-[11px] font-semibold text-gray-500'>Sale theo nhóm</p>
            <Link onClick={() => setVisible(false)} className='py-1 pl-10 text-sm' to='/sale?dept=Men'>
              Sale cho Nam
            </Link>
            <Link onClick={() => setVisible(false)} className='py-1 pl-10 text-sm' to='/sale?dept=Women'>
              Sale cho Nữ
            </Link>
            <Link onClick={() => setVisible(false)} className='py-1 pl-10 text-sm' to='/sale?dept=Kids'>
              Trẻ em
            </Link>
            <Link onClick={() => setVisible(false)} className='py-1 pl-10 text-sm' to='/sale?band=99-199'>
              Đồng giá 99k – 199k
            </Link>
            <NavLink onClick={() => { setVisible(false); scrollToTop() }} className='py-2 pl-6 border' to='/about'>
              GIỚI THIỆU
            </NavLink>
            <NavLink onClick={() => { setVisible(false); scrollToTop() }} className='py-2 pl-6 border' to='/contact'>
              LIÊN HỆ
            </NavLink>
          </div>
        </div>
      </div>
    </>
  )
}

export default Navbar
