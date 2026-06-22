import fs from 'fs/promises'
import { v2 as cloudinary } from 'cloudinary'

/** Chuẩn hóa mảng URL ảnh đánh giá (tối đa 5) */
export const normalizeReviewImages = (input) => {
  if (input == null) return []

  let arr = input
  if (typeof arr === 'string') {
    const trimmed = arr.trim()
    if (!trimmed) return []
    try {
      arr = JSON.parse(trimmed)
    } catch {
      arr = [trimmed]
    }
  }

  if (!Array.isArray(arr)) return []

  return arr
    .map((v) => {
      if (typeof v === 'string') return v.trim()
      if (v && typeof v === 'object') return String(v.url || v.secure_url || '').trim()
      return ''
    })
    .filter((url) => /^https?:\/\//i.test(url))
    .slice(0, 5)
}

/** Upload file từ multer lên Cloudinary, trả về danh sách URL */
export const uploadReviewFilesToCloudinary = async (files = []) => {
  if (!files?.length) return []

  const urls = []
  for (const file of files) {
    if (!file?.path) continue
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        resource_type: 'image',
        folder: 'reviews',
      })
      if (result?.secure_url) urls.push(result.secure_url)
    } catch (err) {
      console.log('review image upload error:', err?.message || err)
    } finally {
      try {
        await fs.unlink(file.path)
      } catch {
        // ignore
      }
    }
  }
  return urls
}
