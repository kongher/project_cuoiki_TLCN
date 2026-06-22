import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { backendUrl } from '../App'
import { BANNER_DESTINATIONS, getBannerDestinationLabel } from '../config/bannerDestinations'

const emptyBannerForm = () => ({
  id: '',
  name: '',
  linkUrl: '',
  isActive: true,
  sortOrder: 0,
  imageUrl: '',
})

const emptyAnnouncementForm = () => ({
  id: '',
  text: '',
  linkUrl: '',
  isActive: true,
  sortOrder: 0,
})

const groups = [...new Set(BANNER_DESTINATIONS.map((d) => d.group))]

const SORT_ORDER_MIN_MSG = 'hãy nhập thứ tự hiện'

const onSortOrderInvalid = (e) => {
  e.target.setCustomValidity(SORT_ORDER_MIN_MSG)
}

const onSortOrderInput = (e) => {
  e.target.setCustomValidity('')
}

const DestinationSelect = ({ value, onChange, label }) => (
  <div>
    <label className='text-xs text-gray-500 block mb-1'>{label}</label>
    <select
      className='border px-3 py-2 rounded w-full text-sm bg-white'
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {groups.map((group) => (
        <optgroup key={group} label={group}>
          {BANNER_DESTINATIONS.filter((d) => d.group === group).map((d) => (
            <option key={d.value || 'none'} value={d.value}>
              {d.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  </div>
)

const ConfirmDeleteModal = ({ title, message, detail, onCancel, onConfirm, deleting }) => (
  <div
    className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'
    onClick={onCancel}
    role='presentation'
  >
    <div
      className='bg-white rounded-xl shadow-xl max-w-sm w-full p-6'
      onClick={(e) => e.stopPropagation()}
      role='dialog'
      aria-modal='true'
    >
      <h3 className='text-lg font-semibold mb-2'>{title}</h3>
      <p className='text-sm text-gray-600 mb-6'>
        {message}
        {detail ? <span className='block mt-2 font-medium text-gray-800'>{detail}</span> : null}
      </p>
      <div className='flex justify-end gap-3'>
        <button
          type='button'
          onClick={onCancel}
          disabled={deleting}
          className='border px-4 py-2 rounded text-sm hover:bg-gray-50 disabled:opacity-50'
        >
          Hủy
        </button>
        <button
          type='button'
          onClick={onConfirm}
          disabled={deleting}
          className='bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 disabled:opacity-50'
        >
          {deleting ? 'Đang xóa...' : 'Xóa'}
        </button>
      </div>
    </div>
  </div>
)

const Banners = ({ token }) => {
  const [activeTab, setActiveTab] = useState('banners')

  const [banners, setBanners] = useState([])
  const [loadingBanners, setLoadingBanners] = useState(true)
  const [bannerForm, setBannerForm] = useState(emptyBannerForm())
  const [imageFile, setImageFile] = useState(null)
  const [savingBanner, setSavingBanner] = useState(false)
  const [deleteBannerTarget, setDeleteBannerTarget] = useState(null)

  const [announcements, setAnnouncements] = useState([])
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true)
  const [announcementForm, setAnnouncementForm] = useState(emptyAnnouncementForm())
  const [savingAnnouncement, setSavingAnnouncement] = useState(false)
  const [deleteAnnouncementTarget, setDeleteAnnouncementTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const headers = useMemo(() => ({ token }), [token])

  const loadBanners = useCallback(async () => {
    setLoadingBanners(true)
    try {
      const res = await axios.get(`${backendUrl}/api/banner/admin/list`, { headers })
      if (res.data.success) setBanners(res.data.banners || [])
      else toast.error(res.data.message)
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
    } finally {
      setLoadingBanners(false)
    }
  }, [headers])

  const loadAnnouncements = useCallback(async () => {
    setLoadingAnnouncements(true)
    try {
      const res = await axios.get(`${backendUrl}/api/banner/menu-announcement/admin/list`, { headers })
      if (res.data.success) setAnnouncements(res.data.announcements || [])
      else toast.error(res.data.message)
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
    } finally {
      setLoadingAnnouncements(false)
    }
  }, [headers])

  useEffect(() => {
    loadBanners()
    loadAnnouncements()
  }, [loadBanners, loadAnnouncements])

  const resetBannerForm = () => {
    setBannerForm(emptyBannerForm())
    setImageFile(null)
  }

  const resetAnnouncementForm = () => {
    setAnnouncementForm(emptyAnnouncementForm())
  }

  const onEditBanner = (b) => {
    const linkUrl = b.linkUrl || ''
    const inList = BANNER_DESTINATIONS.some((d) => d.value === linkUrl)
    setBannerForm({
      id: b._id,
      name: b.name || '',
      linkUrl: inList ? linkUrl : '',
      isActive: b.isActive !== false,
      sortOrder: b.sortOrder ?? 0,
      imageUrl: b.imageUrl || '',
    })
    setImageFile(null)
    setActiveTab('banners')
  }

  const onEditAnnouncement = (a) => {
    const linkUrl = a.linkUrl || ''
    const inList = BANNER_DESTINATIONS.some((d) => d.value === linkUrl)
    setAnnouncementForm({
      id: a._id,
      text: a.text || '',
      linkUrl: inList ? linkUrl : '',
      isActive: a.isActive !== false,
      sortOrder: a.sortOrder ?? 0,
    })
    setActiveTab('announcement')
  }

  const validateBannerSortOrder = (sortOrder, { excludeId = '', isActive = true, isNew = true }) => {
    const order = Math.floor(Number(sortOrder) || 0)
    if (order <= 0) {
      toast.error('Hãy chọn thứ tự hiển thị')
      return false
    }
    if (isNew || isActive) {
      const conflict = banners.some(
        (b) =>
          b.isActive !== false &&
          Math.floor(Number(b.sortOrder) || 0) === order &&
          String(b._id) !== String(excludeId)
      )
      if (conflict) {
        toast.error('Hãy chọn thứ tự khác')
        return false
      }
    }
    return true
  }

  const onSubmitBanner = async (e) => {
    e.preventDefault()
    if (!bannerForm.id && !imageFile) {
      toast.error('Vui lòng chọn ảnh banner')
      return
    }
    if (
      !validateBannerSortOrder(bannerForm.sortOrder, {
        excludeId: bannerForm.id || '',
        isActive: bannerForm.isActive,
        isNew: !bannerForm.id,
      })
    ) {
      return
    }
    setSavingBanner(true)
    try {
      const fd = new FormData()
      if (bannerForm.id) fd.append('id', bannerForm.id)
      fd.append('name', bannerForm.name.trim())
      fd.append('linkUrl', bannerForm.linkUrl)
      fd.append('isActive', bannerForm.isActive ? 'true' : 'false')
      fd.append('sortOrder', String(bannerForm.sortOrder ?? 0))
      if (bannerForm.imageUrl && !imageFile) fd.append('imageUrl', bannerForm.imageUrl)
      if (imageFile) fd.append('image', imageFile)

      const res = await axios.post(`${backendUrl}/api/banner/admin/save`, fd, {
        headers: { token: headers.token },
      })
      if (res.data.success) {
        toast.success(res.data.message)
        resetBannerForm()
        loadBanners()
      } else toast.error(res.data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setSavingBanner(false)
    }
  }

  const validateAnnouncementSortOrder = (sortOrder, { isNew }) => {
    if (!isNew) return true
    const order = Math.floor(Number(sortOrder) || 0)
    if (order <= 0) {
      toast.error('Hãy chọn thứ tự hiển thị')
      return false
    }
    const conflict = announcements.some(
      (a) => a.isActive !== false && Math.floor(Number(a.sortOrder) || 0) === order
    )
    if (conflict) {
      toast.error('Hãy chọn thứ tự khác')
      return false
    }
    return true
  }

  const onSubmitAnnouncement = async (e) => {
    e.preventDefault()
    if (!announcementForm.text.trim()) {
      toast.error('Vui lòng nhập nội dung thông báo')
      return
    }
    if (!validateAnnouncementSortOrder(announcementForm.sortOrder, { isNew: !announcementForm.id })) {
      return
    }
    setSavingAnnouncement(true)
    try {
      const res = await axios.post(
        `${backendUrl}/api/banner/menu-announcement/admin/save`,
        {
          id: announcementForm.id || undefined,
          text: announcementForm.text.trim(),
          linkUrl: announcementForm.linkUrl,
          isActive: announcementForm.isActive,
          sortOrder: announcementForm.sortOrder,
        },
        { headers }
      )
      if (res.data.success) {
        toast.success(res.data.message)
        resetAnnouncementForm()
        loadAnnouncements()
      } else toast.error(res.data.message)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message)
    } finally {
      setSavingAnnouncement(false)
    }
  }

  const executeDeleteBanner = async () => {
    if (!deleteBannerTarget?.id) return
    setDeleting(true)
    try {
      const res = await axios.post(
        `${backendUrl}/api/banner/admin/remove`,
        { id: deleteBannerTarget.id },
        { headers }
      )
      if (res.data.success) {
        toast.success('Đã xóa banner')
        setDeleteBannerTarget(null)
        if (bannerForm.id === deleteBannerTarget.id) resetBannerForm()
        loadBanners()
      } else toast.error(res.data.message)
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
    } finally {
      setDeleting(false)
    }
  }

  const executeDeleteAnnouncement = async () => {
    if (!deleteAnnouncementTarget?.id) return
    setDeleting(true)
    try {
      const res = await axios.post(
        `${backendUrl}/api/banner/menu-announcement/admin/remove`,
        { id: deleteAnnouncementTarget.id },
        { headers }
      )
      if (res.data.success) {
        toast.success('Đã xóa thông báo')
        setDeleteAnnouncementTarget(null)
        if (announcementForm.id === deleteAnnouncementTarget.id) resetAnnouncementForm()
        loadAnnouncements()
      } else toast.error(res.data.message)
    } catch (e) {
      toast.error(e.response?.data?.message || e.message)
    } finally {
      setDeleting(false)
    }
  }

  const loading = activeTab === 'banners' ? loadingBanners : loadingAnnouncements

  return (
    <div className='w-full max-w-5xl'>
      <p className='font-medium text-lg mb-4'>Quản lý Banner (Trang chủ)</p>

      <div className='flex gap-2 mb-6 flex-wrap'>
        <button
          type='button'
          onClick={() => setActiveTab('banners')}
          className={`px-4 py-2 rounded text-sm border ${
            activeTab === 'banners'
              ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 transition-colors'
              : 'bg-white border-gray-300 hover:bg-blue-50 transition-colors'
          }`}
        >
          Banner slider
        </button>
        <button
          type='button'
          onClick={() => {
            setActiveTab('announcement')
            resetAnnouncementForm()
          }}
          className={`px-4 py-2 rounded text-sm border ${
            activeTab === 'announcement'
              ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 transition-colors'
              : 'bg-white border-gray-300 hover:bg-blue-50 transition-colors'
          }`}
        >
          Thông báo thanh menu
        </button>
      </div>

      {loading ? (
        <p className='text-sm text-gray-500'>Đang tải...</p>
      ) : activeTab === 'banners' ? (
        <>
          <form onSubmit={onSubmitBanner} className='border rounded p-4 bg-white mb-8 max-w-xl flex flex-col gap-3'>
            <p className='font-medium text-sm'>{bannerForm.id ? 'Sửa banner' : 'Thêm banner mới'}</p>
            <div>
              <label className='text-xs text-gray-500'>Tải ảnh lên</label>
              <input
                type='file'
                accept='image/*'
                className='block mt-1 text-sm'
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
              {bannerForm.imageUrl && !imageFile && (
                <img src={bannerForm.imageUrl} alt='' className='mt-2 h-20 object-cover rounded border' />
              )}
            </div>
            <DestinationSelect
              label='Chuyển tới trang'
              value={bannerForm.linkUrl}
              onChange={(linkUrl) => setBannerForm((f) => ({ ...f, linkUrl }))}
            />
            <div className='flex gap-4 items-center flex-wrap'>
              <label className='flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={bannerForm.isActive}
                  onChange={(e) => setBannerForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                Hiển thị (Bật)
              </label>
              <label className='text-sm flex items-center gap-2'>
                Thứ tự:
                <input
                  type='number'
                  min={1}
                  className='border w-16 px-2 py-1 rounded'
                  value={bannerForm.sortOrder}
                  onChange={(e) => setBannerForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
                  onInvalid={onSortOrderInvalid}
                  onInput={onSortOrderInput}
                />
              </label>
            </div>
            <div className='flex gap-2'>
              <button
                type='submit'
                disabled={savingBanner}
                className='bg-blue-600 hover:bg-blue-700 transition-colors text-white px-4 py-2 rounded text-sm disabled:opacity-50 disabled:hover:bg-blue-600'
              >
                {savingBanner ? 'Đang lưu...' : bannerForm.id ? 'Cập nhật' : 'Thêm banner'}
              </button>
              {bannerForm.id && (
                <button
                  type='button'
                  onClick={resetBannerForm}
                  className='border border-blue-200 text-blue-700 px-4 py-2 rounded text-sm hover:bg-blue-50 transition-colors'
                >
                  Hủy sửa
                </button>
              )}
            </div>
          </form>

          <div className='overflow-x-auto border rounded bg-white'>
            <table className='w-full text-sm min-w-[640px]'>
              <thead className='bg-gray-50 border-b'>
                <tr>
                  <th className='text-left p-3'>Ảnh</th>
                  <th className='text-left p-3'>Tên</th>
                  <th className='text-left p-3'>Chuyển tới</th>
                  <th className='text-left p-3'>TT</th>
                  <th className='text-left p-3'>STT</th>
                  <th className='text-left p-3'></th>
                </tr>
              </thead>
              <tbody>
                {banners.length === 0 ? (
                  <tr>
                    <td colSpan={6} className='p-6 text-center text-gray-500'>
                      Chưa có banner
                    </td>
                  </tr>
                ) : (
                  banners.map((b) => (
                    <tr key={b._id} className='border-t'>
                      <td className='p-3'>
                        <img src={b.imageUrl} alt='' className='h-12 w-24 object-cover rounded' />
                      </td>
                      <td className='p-3'>{b.name || '—'}</td>
                      <td className='p-3 text-xs max-w-[220px]'>{getBannerDestinationLabel(b.linkUrl)}</td>
                      <td className='p-3'>
                        <span className={b.isActive ? 'text-green-700' : 'text-gray-400'}>
                          {b.isActive ? 'Hiện' : 'Ẩn'}
                        </span>
                      </td>
                      <td className='p-3'>{b.sortOrder}</td>
                      <td className='p-3'>
                        <button type='button' className='text-xs text-blue-700 mr-3' onClick={() => onEditBanner(b)}>
                          Sửa
                        </button>
                        <button
                          type='button'
                          className='text-xs text-red-600'
                          onClick={() =>
                            setDeleteBannerTarget({ id: b._id, name: b.name || 'Banner' })
                          }
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <form
            onSubmit={onSubmitAnnouncement}
            className='border rounded p-4 bg-white mb-8 max-w-xl flex flex-col gap-3'
          >
            <p className='font-medium text-sm'>
              {announcementForm.id ? 'Sửa thông báo' : 'Thêm thông báo'}
            </p>
            <div>
              <input
                className='border px-3 py-2 rounded w-full'
                placeholder='Hãy nhập nội dung'
                value={announcementForm.text}
                onChange={(e) => setAnnouncementForm((f) => ({ ...f, text: e.target.value }))}
                required
              />
            </div>
            <DestinationSelect
              label='Chuyển tới trang'
              value={announcementForm.linkUrl}
              onChange={(linkUrl) => setAnnouncementForm((f) => ({ ...f, linkUrl }))}
            />
            <div className='flex gap-4 items-center flex-wrap'>
              <label className='flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={announcementForm.isActive}
                  onChange={(e) => setAnnouncementForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                Hiển thị (Bật)
              </label>
              <label className='text-sm flex items-center gap-2'>
                Thứ tự chạy:
                <input
                  type='number'
                  min={1}
                  className='border w-16 px-2 py-1 rounded'
                  value={announcementForm.sortOrder}
                  onChange={(e) =>
                    setAnnouncementForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))
                  }
                  onInvalid={onSortOrderInvalid}
                  onInput={onSortOrderInput}
                />
              </label>
            </div>
            <div className='flex gap-2'>
              <button
                type='submit'
                disabled={savingAnnouncement}
                className='bg-blue-600 hover:bg-blue-700 transition-colors text-white px-4 py-2 rounded text-sm disabled:opacity-50 disabled:hover:bg-blue-600'
              >
                {savingAnnouncement ? 'Đang lưu...' : announcementForm.id ? 'Cập nhật' : 'Thêm thông báo'}
              </button>
              {announcementForm.id && (
                <button
                  type='button'
                  onClick={resetAnnouncementForm}
                  className='border border-blue-200 text-blue-700 px-4 py-2 rounded text-sm hover:bg-blue-50 transition-colors'
                >
                  Hủy sửa
                </button>
              )}
            </div>
          </form>

          <div className='overflow-x-auto border rounded bg-white'>
            <table className='w-full text-sm min-w-[560px]'>
              <thead className='bg-gray-50 border-b'>
                <tr>
                  <th className='text-left p-3'>Nội dung</th>
                  <th className='text-left p-3'>Chuyển tới</th>
                  <th className='text-left p-3'>TT</th>
                  <th className='text-left p-3'>Thứ tự</th>
                  <th className='text-left p-3'></th>
                </tr>
              </thead>
              <tbody>
                {announcements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className='p-6 text-center text-gray-500'>
                      Chưa có thông báo — thêm mới ở form phía trên
                    </td>
                  </tr>
                ) : (
                  announcements.map((a) => (
                    <tr key={a._id} className='border-t'>
                      <td className='p-3 max-w-[280px]'>{a.text}</td>
                      <td className='p-3 text-xs'>{getBannerDestinationLabel(a.linkUrl)}</td>
                      <td className='p-3'>
                        <span className={a.isActive ? 'text-green-700' : 'text-gray-400'}>
                          {a.isActive ? 'Hiện' : 'Ẩn'}
                        </span>
                      </td>
                      <td className='p-3 font-medium'>{a.sortOrder ?? 0}</td>
                      <td className='p-3 whitespace-nowrap'>
                        <button
                          type='button'
                          className='text-xs text-blue-700 mr-3'
                          onClick={() => onEditAnnouncement(a)}
                        >
                          Sửa
                        </button>
                        <button
                          type='button'
                          className='text-xs text-red-600'
                          onClick={() => setDeleteAnnouncementTarget({ id: a._id, text: a.text })}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {deleteBannerTarget && (
        <ConfirmDeleteModal
          title='Xác nhận xóa banner'
          message='Bạn có chắc muốn xóa không?'
          detail={deleteBannerTarget.name}
          onCancel={() => !deleting && setDeleteBannerTarget(null)}
          onConfirm={executeDeleteBanner}
          deleting={deleting}
        />
      )}

      {deleteAnnouncementTarget && (
        <ConfirmDeleteModal
          title='Xác nhận xóa thông báo'
          message='Bạn có chắc muốn xóa thông báo này?'
          detail={deleteAnnouncementTarget.text}
          onCancel={() => !deleting && setDeleteAnnouncementTarget(null)}
          onConfirm={executeDeleteAnnouncement}
          deleting={deleting}
        />
      )}
    </div>
  )
}

export default Banners
