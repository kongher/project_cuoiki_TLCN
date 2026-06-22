import { v2 as cloudinary } from 'cloudinary'
import bannerModel from '../models/bannerModel.js'

const uploadCloudinary = async (file) => {
  if (!file?.path) return ''
  const result = await cloudinary.uploader.upload(file.path, { resource_type: 'image' })
  return result?.secure_url || ''
}

const isBannerActive = (b) => {
  const v = b?.isActive
  if (v === false || v === 'false' || v === 0 || v === '0') return false
  return true
}

const parseSortOrder = (value) => Math.floor(Number(value) || 0)

const validateBannerSortOrder = async (sortOrder, { excludeId } = {}) => {
  const order = parseSortOrder(sortOrder)
  if (order <= 0) {
    return { ok: false, message: 'Hãy chọn thứ tự hiển thị' }
  }

  const query = { isActive: true, sortOrder: order }
  if (excludeId) query._id = { $ne: excludeId }

  const conflict = await bannerModel.findOne(query).lean()
  if (conflict) {
    return { ok: false, message: 'Hãy chọn thứ tự khác' }
  }

  return { ok: true, order }
}

export const listPublicBanners = async (req, res) => {
  try {
    const all = await bannerModel.find({}).sort({ sortOrder: 1, createdAt: -1 }).lean()
    const banners = all.filter((b) => isBannerActive(b) && String(b?.imageUrl || '').trim())
    res.json({ success: true, banners })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

export const adminListBanners = async (req, res) => {
  try {
    const banners = await bannerModel.find({}).sort({ sortOrder: 1, createdAt: -1 }).lean()
    res.json({ success: true, banners })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

export const saveBanner = async (req, res) => {
  try {
    const { id, name, linkUrl, isActive, sortOrder } = req.body
    const imageFile = req.file || (Array.isArray(req.files) ? req.files[0] : null)

    const bannerName = String(name || '').trim()

    let imageUrl = String(req.body.imageUrl || '').trim()
    if (imageFile) {
      imageUrl = await uploadCloudinary(imageFile)
    }

    const nextActive =
      isActive === undefined
        ? true
        : !(isActive === false || isActive === 'false' || isActive === 0 || isActive === '0')

    if (id) {
      const doc = await bannerModel.findById(id)
      if (!doc) return res.json({ success: false, message: 'Không tìm thấy banner' })

      if (sortOrder !== undefined && nextActive) {
        const sortCheck = await validateBannerSortOrder(sortOrder, { excludeId: id })
        if (!sortCheck.ok) return res.json({ success: false, message: sortCheck.message })
      }

      doc.name = bannerName
      if (imageUrl) doc.imageUrl = imageUrl
      doc.linkUrl = String(linkUrl || '').trim()
      if (isActive !== undefined) doc.isActive = nextActive
      if (sortOrder !== undefined) {
        const order = parseSortOrder(sortOrder)
        if (order <= 0) {
          return res.json({ success: false, message: 'Hãy chọn thứ tự hiển thị' })
        }
        doc.sortOrder = order
      }
      doc.updatedAt = Date.now()
      await doc.save()
      return res.json({ success: true, message: 'Đã cập nhật banner', banner: doc })
    }

    if (!imageUrl) {
      return res.json({ success: false, message: 'Vui lòng tải ảnh banner' })
    }

    const sortCheck = await validateBannerSortOrder(sortOrder)
    if (!sortCheck.ok) return res.json({ success: false, message: sortCheck.message })

    const banner = await bannerModel.create({
      name: bannerName,
      imageUrl,
      linkUrl: String(linkUrl || '').trim(),
      isActive: nextActive,
      sortOrder: sortCheck.order,
    })
    res.json({ success: true, message: 'Đã thêm banner', banner })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

export const removeBanner = async (req, res) => {
  try {
    const { id } = req.body
    if (!id) return res.json({ success: false, message: 'Thiếu id' })
    await bannerModel.findByIdAndDelete(id)
    res.json({ success: true, message: 'Đã xóa banner' })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}
