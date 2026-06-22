import menuAnnouncementModel from '../models/menuAnnouncementModel.js'

const isActive = (doc) => {
  const v = doc?.isActive
  if (v === false || v === 'false' || v === 0 || v === '0') return false
  return true
}

const sortAnnouncements = { sortOrder: 1, createdAt: 1 }

const parseSortOrder = (value) => Math.floor(Number(value) || 0)

const validateNewAnnouncementSortOrder = async (sortOrder) => {
  const order = parseSortOrder(sortOrder)
  if (order <= 0) {
    return { ok: false, message: 'Hãy chọn thứ tự hiển thị' }
  }

  const conflict = await menuAnnouncementModel
    .findOne({ isActive: true, sortOrder: order })
    .lean()

  if (conflict) {
    return { ok: false, message: 'Hãy chọn thứ tự khác' }
  }

  return { ok: true, order }
}

export const listPublicMenuAnnouncement = async (req, res) => {
  try {
    const all = await menuAnnouncementModel.find({}).sort(sortAnnouncements).lean()
    const announcements = all.filter((a) => isActive(a) && String(a?.text || '').trim())
    const first = announcements[0] || null
    res.json({ success: true, announcements, announcement: first })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

export const adminListMenuAnnouncements = async (req, res) => {
  try {
    const announcements = await menuAnnouncementModel.find({}).sort(sortAnnouncements).lean()
    res.json({ success: true, announcements })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

export const saveMenuAnnouncement = async (req, res) => {
  try {
    const { id, text, linkUrl, isActive: activeFlag, sortOrder } = req.body
    const content = String(text || '').trim()
    if (!content) {
      return res.json({ success: false, message: 'Vui lòng nhập nội dung thông báo' })
    }

    const payload = {
      text: content,
      linkUrl: String(linkUrl || '').trim(),
      isActive: !(activeFlag === false || activeFlag === 'false' || activeFlag === 0 || activeFlag === '0'),
      sortOrder: Math.floor(Number(sortOrder) || 0),
      updatedAt: Date.now(),
    }

    if (id) {
      const doc = await menuAnnouncementModel.findById(id)
      if (!doc) return res.json({ success: false, message: 'Không tìm thấy thông báo' })
      doc.text = payload.text
      doc.linkUrl = payload.linkUrl
      doc.isActive = payload.isActive
      doc.updatedAt = payload.updatedAt
      await doc.save()
      return res.json({ success: true, message: 'Đã cập nhật thông báo', announcement: doc })
    }

    const sortCheck = await validateNewAnnouncementSortOrder(sortOrder)
    if (!sortCheck.ok) {
      return res.json({ success: false, message: sortCheck.message })
    }
    payload.sortOrder = sortCheck.order

    const announcement = await menuAnnouncementModel.create({
      ...payload,
      createdAt: Date.now(),
    })
    res.json({ success: true, message: 'Đã thêm thông báo', announcement })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

export const removeMenuAnnouncement = async (req, res) => {
  try {
    const { id } = req.body
    if (!id) return res.json({ success: false, message: 'Thiếu id' })
    await menuAnnouncementModel.findByIdAndDelete(id)
    res.json({ success: true, message: 'Đã xóa thông báo' })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}
