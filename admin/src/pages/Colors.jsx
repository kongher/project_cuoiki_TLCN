import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { backendUrl } from '../App'
import { toast } from 'react-toastify'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'

const normHexInput = (raw) => {
  const s = String(raw || '').trim()
  if (!s) return ''
  if (/^#[0-9A-Fa-f]{6}$/i.test(s)) return s.toUpperCase()
  const no = s.replace(/^#/, '')
  if (/^[0-9A-Fa-f]{6}$/i.test(no)) return `#${no.toUpperCase()}`
  return ''
}

const ColorSwatch = ({ hex, size = 40, shape = 'square' }) => {
  const valid = normHexInput(hex)
  const rounded = shape === 'circle' ? 'rounded-full' : 'rounded'

  if (!valid) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-200 border border-gray-300 shrink-0 ${rounded}`}
        style={{ width: size, height: size }}
        title='Mã màu không hợp lệ'
      >
        <span className='text-gray-400 text-base leading-none select-none'>/</span>
      </div>
    )
  }

  return (
    <div
      className={`border border-gray-300 shrink-0 ${rounded}`}
      style={{ width: size, height: size, backgroundColor: valid }}
      title={valid}
    />
  )
}

const Colors = ({ token }) => {
  const [colors, setColors] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [hex, setHex] = useState('')
  const [skuCode, setSkuCode] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [editTarget, setEditTarget] = useState(null)
  const [editName, setEditName] = useState('')
  const [editHex, setEditHex] = useState('')
  const [editSkuCode, setEditSkuCode] = useState('')
  const [editSortOrder, setEditSortOrder] = useState(0)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const previewHex = useMemo(() => normHexInput(hex), [hex])
  const editPreviewHex = useMemo(() => normHexInput(editHex), [editHex])

  const load = async () => {
    setLoading(true)
    try {
      const res = await axios.get(backendUrl + '/api/color/admin/list', { headers: { token } })
      if (res.data.success) setColors(res.data.colors || [])
      else toast.error(res.data.message || 'Không tải được danh sách')
    } catch (e) {
      toast.error('Lỗi tải danh mục màu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const resetAddForm = () => {
    setName('')
    setHex('')
    setSkuCode('')
    setSortOrder(0)
  }

  const closeEditModal = () => {
    if (saving) return
    setEditTarget(null)
    setEditName('')
    setEditHex('')
    setEditSkuCode('')
    setEditSortOrder(0)
  }

  const onAdd = async (e) => {
    e.preventDefault()
    try {
      const res = await axios.post(
        backendUrl + '/api/color/admin/add',
        { name, hex: normHexInput(hex), skuCode, sortOrder: Number(sortOrder) || 0 },
        { headers: { token } }
      )
      if (res.data.success) {
        toast.success(res.data.message)
        resetAddForm()
        load()
      } else toast.error(res.data.message)
    } catch (e) {
      toast.error(e.message)
    }
  }

  const onEdit = (color) => {
    setEditTarget(color)
    setEditName(color.name)
    setEditHex(color.hex)
    setEditSkuCode(color.skuCode)
    setEditSortOrder(color.sortOrder ?? 0)
  }

  const onUpdate = async (e) => {
    e.preventDefault()
    if (!editTarget) return
    setSaving(true)
    try {
      const res = await axios.post(
        backendUrl + '/api/color/admin/update',
        {
          id: editTarget._id,
          name: editName,
          hex: normHexInput(editHex),
          skuCode: editSkuCode,
          sortOrder: Number(editSortOrder) || 0,
        },
        { headers: { token } }
      )
      if (res.data.success) {
        toast.success(res.data.message)
        closeEditModal()
        load()
      } else toast.error(res.data.message)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await axios.post(
        backendUrl + '/api/color/admin/remove',
        { id: deleteTarget._id },
        { headers: { token } }
      )
      if (res.data.success) {
        toast.success('Đã xóa')
        if (editTarget?._id === deleteTarget._id) closeEditModal()
        setDeleteTarget(null)
        load()
      } else toast.error(res.data.message)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <p className='text-sm text-gray-600'>Đang tải...</p>

  return (
    <div className='w-full max-w-4xl'>
      <p className='font-medium text-lg mb-6'>Danh mục màu (SKU màu)</p>

      <form onSubmit={onAdd} className='border rounded p-4 mb-8 bg-white flex flex-col gap-3 max-w-xl'>
        <p className='font-medium text-sm'>Thêm màu mới</p>
        <input
          className='border px-3 py-2 rounded outline-none focus:border-black'
          placeholder='Tên màu (VD: Trắng)'
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className='flex gap-2 flex-wrap items-center'>
          <input
            className='border px-3 py-2 rounded outline-none focus:border-black font-mono text-sm flex-1 min-w-[140px]'
            placeholder='mã hex (vd:#FFFFFF)'
            value={hex}
            onChange={(e) => setHex(e.target.value)}
          />
          <ColorSwatch hex={hex} size={40} />
          <input
            className='border px-3 py-2 rounded outline-none focus:border-black font-mono text-sm w-28'
            placeholder='WH'
            value={skuCode}
            onChange={(e) => setSkuCode(e.target.value.toUpperCase())}
          />
          <input
            type='number'
            className='border px-3 py-2 rounded w-24'
            placeholder='Thứ tự'
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>
        {hex && !previewHex && (
          <p className='text-xs text-amber-600'>Mã hex chưa hợp lệ — nhập đủ 6 ký tự (VD: #FFFFFF)</p>
        )}
        <button
          type='submit'
          className='w-fit px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors'
        >
          Thêm
        </button>
      </form>

      <div className='border rounded overflow-hidden bg-white'>
        <table className='w-full text-sm'>
          <thead className='bg-gray-100 text-left'>
            <tr>
              <th className='p-2'>Tên</th>
              <th className='p-2'>Hex</th>
              <th className='p-2'>Màu sắc</th>
              <th className='p-2'>Mã SKU màu</th>
              <th className='p-2 w-20'>TT</th>
              <th className='p-2 w-32' />
            </tr>
          </thead>
          <tbody>
            {colors.map((c) => (
              <tr key={c._id} className='border-t'>
                <td className='p-2'>{c.name}</td>
                <td className='p-2 font-mono text-xs'>{c.hex}</td>
                <td className='p-2'>
                  <ColorSwatch hex={c.hex} size={28} shape='circle' />
                </td>
                <td className='p-2 font-mono font-semibold'>{c.skuCode}</td>
                <td className='p-2'>{c.sortOrder}</td>
                <td className='p-2'>
                  <div className='flex items-center gap-3'>
                    <button
                      type='button'
                      className='text-blue-600 text-xs underline hover:text-blue-800'
                      onClick={() => onEdit(c)}
                    >
                      Sửa
                    </button>
                    <button
                      type='button'
                      className='text-red-600 text-xs underline hover:text-red-800'
                      onClick={() => setDeleteTarget(c)}
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editTarget && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'
          onClick={closeEditModal}
          role='presentation'
        >
          <div
            className='bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-100'
            onClick={(e) => e.stopPropagation()}
            role='dialog'
            aria-modal='true'
            aria-labelledby='edit-color-title'
          >
            <h3 id='edit-color-title' className='text-lg font-semibold text-gray-900 mb-4'>
              Sửa màu
            </h3>
            <form onSubmit={onUpdate} className='flex flex-col gap-3'>
              <input
                className='border px-3 py-2 rounded outline-none focus:border-black'
                placeholder='Tên màu (VD: Trắng)'
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <div className='flex gap-2 flex-wrap items-center'>
                <input
                  className='border px-3 py-2 rounded outline-none focus:border-black font-mono text-sm flex-1 min-w-[140px]'
                  placeholder='mã hex (vd:#FFFFFF)'
                  value={editHex}
                  onChange={(e) => setEditHex(e.target.value)}
                />
                <ColorSwatch hex={editHex} size={40} />
                <input
                  className='border px-3 py-2 rounded outline-none focus:border-black font-mono text-sm w-28'
                  placeholder='WH'
                  value={editSkuCode}
                  onChange={(e) => setEditSkuCode(e.target.value.toUpperCase())}
                />
                <input
                  type='number'
                  className='border px-3 py-2 rounded w-24'
                  placeholder='Thứ tự'
                  value={editSortOrder}
                  onChange={(e) => setEditSortOrder(e.target.value)}
                />
              </div>
              {editHex && !editPreviewHex && (
                <p className='text-xs text-amber-600'>Mã hex chưa hợp lệ — nhập đủ 6 ký tự (VD: #FFFFFF)</p>
              )}
              <div className='flex justify-end gap-3 pt-2'>
                <button
                  type='button'
                  onClick={closeEditModal}
                  disabled={saving}
                  className='border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors'
                >
                  Hủy
                </button>
                <button
                  type='submit'
                  disabled={saving}
                  className='px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors'
                >
                  {saving ? 'Đang lưu...' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          title='Xóa màu'
          message='Bạn có chắc muốn xóa màu này?'
          detail={deleteTarget.name}
          deleting={deleting}
          onCancel={() => {
            if (!deleting) setDeleteTarget(null)
          }}
          onConfirm={confirmDelete}
          confirmLabel='Xóa'
          cancelLabel='Hủy'
        />
      )}
    </div>
  )
}

export default Colors
