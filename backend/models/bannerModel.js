import mongoose from 'mongoose'

const bannerSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  imageUrl: { type: String, required: true },
  linkUrl: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  createdAt: { type: Number, default: Date.now },
  updatedAt: { type: Number, default: Date.now },
})

const bannerModel = mongoose.models.banner || mongoose.model('banner', bannerSchema)
export default bannerModel
