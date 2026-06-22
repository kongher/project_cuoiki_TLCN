import mongoose from 'mongoose'

const menuAnnouncementSchema = new mongoose.Schema({
  text: { type: String, default: '' },
  linkUrl: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  createdAt: { type: Number, default: Date.now },
  updatedAt: { type: Number, default: Date.now },
})

const menuAnnouncementModel =
  mongoose.models.menuAnnouncement || mongoose.model('menuAnnouncement', menuAnnouncementSchema)

export default menuAnnouncementModel
