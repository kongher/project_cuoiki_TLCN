import { useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { ShopContext } from '../context/ShopContext'

const Account = () => {
  const { backendUrl, token, navigate } = useContext(ShopContext)
  const location = useLocation()

  const [activeSection, setActiveSection] = useState('profile') // profile | address | password
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    gender: '',
    dob: '',
    avatar: '',
    defaultAddress: { fullName: '', phone: '', address: '', province: '', district: '', ward: '' }
  })

  const [provinces, setProvinces] = useState([])
  const [districts, setDistricts] = useState([])
  const [wards, setWards] = useState([])

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const canSubmitPassword = useMemo(() => {
    return Boolean(pw.currentPassword && pw.newPassword && pw.confirm)
  }, [pw])

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    const section = location.state?.section
    if (section === 'password' || section === 'profile') {
      setActiveSection(section)
    }
  }, [location.state])

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) return
      setLoading(true)
      try {
        const res = await axios.get(backendUrl + '/api/user/profile', { headers: { token } })
        if (!res.data.success) throw new Error(res.data.message || 'Không tải được hồ sơ')
        const u = res.data.user
        setProfile((prev) => ({
          ...prev,
          name: u.name || '',
          email: u.email || '',
          phone: u.phone || '',
          gender: u.gender || '',
          dob: u.dob || '',
          avatar: u.avatar || '',
          defaultAddress: {
            fullName: u.defaultAddress?.fullName || '',
            phone: u.defaultAddress?.phone || '',
            address: u.defaultAddress?.address || '',
            province: u.defaultAddress?.province || '',
            district: u.defaultAddress?.district || '',
            ward: u.defaultAddress?.ward || ''
          }
        }))
      } catch (e) {
        toast.error(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [backendUrl, token])

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const res = await axios.get('https://provinces.open-api.vn/api/p/')
        setProvinces(res.data || [])
      } catch (e) {
        // silent
      }
    }
    fetchProvinces()
  }, [])

  const onSaveProfile = async () => {
    if (!token) return
    setSaving(true)
    try {
      const payload = {
        name: profile.name,
        phone: profile.phone,
        gender: profile.gender,
        dob: profile.dob,
        defaultAddress: profile.defaultAddress
      }
      const res = await axios.post(backendUrl + '/api/user/profile/update', payload, { headers: { token } })
      if (!res.data.success) throw new Error(res.data.message || 'Cập nhật thất bại')
      toast.success('Cập nhật thành công')
      if (res.data.user) {
        setProfile((p) => ({ ...p, ...res.data.user }))
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const onChooseAvatar = async (file) => {
    if (!file || !token) return
    setAvatarUploading(true)
    try {
      const fd = new FormData()
      fd.append('avatar', file)
      const res = await axios.post(backendUrl + '/api/user/profile/avatar', fd, {
        headers: { token, 'Content-Type': 'multipart/form-data' }
      })
      if (!res.data.success) throw new Error(res.data.message || 'Tải ảnh thất bại')
      setProfile((p) => ({ ...p, avatar: res.data.avatar || p.avatar }))
      toast.success('Cập nhật ảnh đại diện thành công')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setAvatarUploading(false)
    }
  }

  const onChangeProvince = async (code) => {
    if (!code) {
      setDistricts([])
      setWards([])
      setProfile((p) => ({ ...p, defaultAddress: { ...p.defaultAddress, province: '', district: '', ward: '' } }))
      return
    }
    const res = await axios.get(`https://provinces.open-api.vn/api/p/${code}?depth=2`)
    setDistricts(res.data?.districts || [])
    setWards([])
    setProfile((p) => ({ ...p, defaultAddress: { ...p.defaultAddress, province: res.data?.name || '', district: '', ward: '' } }))
  }

  const onChangeDistrict = async (code) => {
    if (!code) {
      setWards([])
      setProfile((p) => ({ ...p, defaultAddress: { ...p.defaultAddress, district: '', ward: '' } }))
      return
    }
    const res = await axios.get(`https://provinces.open-api.vn/api/d/${code}?depth=2`)
    setWards(res.data?.wards || [])
    setProfile((p) => ({ ...p, defaultAddress: { ...p.defaultAddress, district: res.data?.name || '', ward: '' } }))
  }

  const onSavePassword = async () => {
    if (!canSubmitPassword) {
      toast.error('Vui lòng điền đầy đủ thông tin')
      return
    }
    if (pw.newPassword !== pw.confirm) {
      toast.error('Mật khẩu mới không khớp')
      return
    }
    try {
      const res = await axios.post(
        backendUrl + '/api/user/change-password',
        { currentPassword: pw.currentPassword, newPassword: pw.newPassword },
        { headers: { token } }
      )
      if (!res.data.success) throw new Error(res.data.message || 'Đổi mật khẩu thất bại')
      toast.success('Cập nhật thành công')
      setPw({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (e) {
      toast.error(e.message)
    }
  }

  if (loading) return <div className='border-t pt-10 text-sm text-gray-600'>Đang tải...</div>

  return (
    <div className='border-t pt-10 min-h-[75vh]'>
      <div className='max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6'>
        {/* Left menu */}
        <div className='bg-white border rounded-xl p-4 h-fit'>
          <p className='text-sm font-semibold text-gray-800 mb-3'>Tài khoản</p>
          <div className='flex md:flex-col gap-2 flex-wrap'>
            {[
              { key: 'profile', label: 'Thông tin cá nhân' },
              { key: 'address', label: 'Địa chỉ mặc định' },
              { key: 'password', label: 'Đổi mật khẩu' }
            ].map((it) => {
              const active = activeSection === it.key
              return (
                <button
                  key={it.key}
                  type='button'
                  onClick={() => setActiveSection(it.key)}
                  className={`px-3 py-2 rounded-lg text-sm text-left border transition ${
                    active ? 'bg-gray-50 border-gray-300 text-gray-900' : 'bg-white border-transparent hover:bg-gray-50'
                  }`}
                >
                  {it.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right content */}
        <div className='bg-white border rounded-xl p-6'>
          {/* Avatar */}
          <div className='flex items-center gap-4 pb-6 border-b'>
            <div className='w-16 h-16 rounded-full overflow-hidden border bg-gray-100 flex items-center justify-center'>
              {profile.avatar ? (
                <img src={profile.avatar} alt='' className='w-full h-full object-cover' />
              ) : (
                <span className='text-gray-400 text-xl'>👤</span>
              )}
            </div>
            <div className='flex flex-col gap-1'>
              <p className='font-semibold text-gray-900'>{profile.name || 'Tài khoản'}</p>
              <p className='text-xs text-gray-500'>{profile.email}</p>
              <label className='mt-2 inline-flex items-center gap-2 w-fit cursor-pointer text-sm px-3 py-2 rounded border hover:bg-gray-50'>
                <input
                  type='file'
                  hidden
                  accept='image/*'
                  onChange={(e) => onChooseAvatar(e.target.files?.[0] || null)}
                />
                {avatarUploading ? 'Đang tải...' : 'Chọn ảnh'}
              </label>
            </div>
          </div>

          {activeSection === 'profile' && (
            <div className='pt-6 space-y-4'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div>
                  <label className='text-sm font-medium text-gray-700'>Họ tên</label>
                  <input
                    value={profile.name}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                    className='mt-2 w-full border rounded px-3 py-2 outline-none focus:border-black'
                    placeholder='Nhập họ tên'
                  />
                </div>
                <div>
                  <label className='text-sm font-medium text-gray-700'>Email</label>
                  <input
                    value={profile.email}
                    readOnly
                    className='mt-2 w-full border rounded px-3 py-2 bg-gray-50 text-gray-500'
                  />
                </div>
                <div>
                  <label className='text-sm font-medium text-gray-700'>Số điện thoại</label>
                  <input
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                    className='mt-2 w-full border rounded px-3 py-2 outline-none focus:border-black'
                    placeholder='Nhập số điện thoại'
                  />
                </div>
                <div>
                  <label className='text-sm font-medium text-gray-700'>Giới tính</label>
                  <select
                    value={profile.gender}
                    onChange={(e) => setProfile((p) => ({ ...p, gender: e.target.value }))}
                    className='mt-2 w-full border rounded px-3 py-2 bg-white outline-none focus:border-black'
                  >
                    <option value=''>Không chọn</option>
                    <option value='male'>Nam</option>
                    <option value='female'>Nữ</option>
                    <option value='other'>Khác</option>
                  </select>
                </div>
                <div>
                  <label className='text-sm font-medium text-gray-700'>Ngày sinh</label>
                  <input
                    type='date'
                    value={profile.dob || ''}
                    onChange={(e) => setProfile((p) => ({ ...p, dob: e.target.value }))}
                    className='mt-2 w-full border rounded px-3 py-2 outline-none focus:border-black'
                  />
                </div>
              </div>

              <div className='pt-2'>
                <button
                  type='button'
                  onClick={onSaveProfile}
                  disabled={saving}
                  className='px-6 py-3 rounded bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60'
                >
                  {saving ? 'ĐANG LƯU...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          )}

          {activeSection === 'address' && (
            <div className='pt-6 space-y-4'>
              <p className='text-sm text-gray-600'>Thiết lập địa chỉ nhận hàng mặc định.</p>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div>
                  <label className='text-sm font-medium text-gray-700'>Họ tên người nhận</label>
                  <input
                    value={profile.defaultAddress.fullName}
                    onChange={(e) => setProfile((p) => ({ ...p, defaultAddress: { ...p.defaultAddress, fullName: e.target.value } }))}
                    className='mt-2 w-full border rounded px-3 py-2 outline-none focus:border-black'
                  />
                </div>
                <div>
                  <label className='text-sm font-medium text-gray-700'>Số điện thoại</label>
                  <input
                    value={profile.defaultAddress.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, defaultAddress: { ...p.defaultAddress, phone: e.target.value } }))}
                    className='mt-2 w-full border rounded px-3 py-2 outline-none focus:border-black'
                  />
                </div>
                <div className='sm:col-span-2'>
                  <label className='text-sm font-medium text-gray-700'>Địa chỉ</label>
                  <input
                    value={profile.defaultAddress.address}
                    onChange={(e) => setProfile((p) => ({ ...p, defaultAddress: { ...p.defaultAddress, address: e.target.value } }))}
                    className='mt-2 w-full border rounded px-3 py-2 outline-none focus:border-black'
                    placeholder='Số nhà, tên đường...'
                  />
                </div>
                <div>
                  <label className='text-sm font-medium text-gray-700'>Tỉnh/Thành</label>
                  <select
                    className='mt-2 w-full border rounded px-3 py-2 bg-white outline-none focus:border-black'
                    onChange={(e) => onChangeProvince(e.target.value)}
                    defaultValue=''
                  >
                    <option value=''>Chọn tỉnh / thành</option>
                    {provinces.map((p) => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                  {profile.defaultAddress.province && (
                    <p className='text-xs text-gray-500 mt-1'>Đang chọn: {profile.defaultAddress.province}</p>
                  )}
                </div>
                <div>
                  <label className='text-sm font-medium text-gray-700'>Quận/Huyện</label>
                  <select
                    className='mt-2 w-full border rounded px-3 py-2 bg-white outline-none focus:border-black'
                    onChange={(e) => onChangeDistrict(e.target.value)}
                    defaultValue=''
                  >
                    <option value=''>Chọn quận / huyện</option>
                    {districts.map((d) => (
                      <option key={d.code} value={d.code}>{d.name}</option>
                    ))}
                  </select>
                  {profile.defaultAddress.district && (
                    <p className='text-xs text-gray-500 mt-1'>Đang chọn: {profile.defaultAddress.district}</p>
                  )}
                </div>
                <div className='sm:col-span-2'>
                  <label className='text-sm font-medium text-gray-700'>Phường/Xã</label>
                  <select
                    className='mt-2 w-full border rounded px-3 py-2 bg-white outline-none focus:border-black'
                    onChange={(e) => setProfile((p) => ({ ...p, defaultAddress: { ...p.defaultAddress, ward: e.target.value } }))}
                    value={profile.defaultAddress.ward || ''}
                  >
                    <option value=''>Chọn phường / xã</option>
                    {wards.map((w) => (
                      <option key={w.code} value={w.name}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className='pt-2'>
                <button
                  type='button'
                  onClick={onSaveProfile}
                  disabled={saving}
                  className='px-6 py-3 rounded bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60'
                >
                  {saving ? 'ĐANG LƯU...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          )}

          {activeSection === 'password' && (
            <div className='pt-6 space-y-4'>
              <p className='text-sm text-gray-600'>Mật khẩu mới tối thiểu 8 ký tự và phải khớp nhau.</p>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div className='sm:col-span-2'>
                  <label className='text-sm font-medium text-gray-700'>Mật khẩu hiện tại</label>
                  <input
                    type='password'
                    value={pw.currentPassword}
                    onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))}
                    className='mt-2 w-full border rounded px-3 py-2 outline-none focus:border-black'
                  />
                </div>
                <div>
                  <label className='text-sm font-medium text-gray-700'>Mật khẩu mới</label>
                  <input
                    type='password'
                    value={pw.newPassword}
                    onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))}
                    className='mt-2 w-full border rounded px-3 py-2 outline-none focus:border-black'
                  />
                </div>
                <div>
                  <label className='text-sm font-medium text-gray-700'>Nhập lại mật khẩu</label>
                  <input
                    type='password'
                    value={pw.confirm}
                    onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                    className='mt-2 w-full border rounded px-3 py-2 outline-none focus:border-black'
                  />
                </div>
              </div>
              <button
                type='button'
                onClick={onSavePassword}
                disabled={!canSubmitPassword}
                className='px-6 py-3 rounded bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60'
              >
                Lưu thay đổi
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Account

