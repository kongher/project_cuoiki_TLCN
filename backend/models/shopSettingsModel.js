import mongoose from 'mongoose'

const shopSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  lowStockThreshold: { type: Number, default: 5 },
  deadstockDaysMin: { type: Number, default: 30 },
  deadstockDaysMax: { type: Number, default: 60 },
  updatedAt: { type: Number, default: Date.now },
})

const shopSettingsModel =
  mongoose.models.shopSettings || mongoose.model('shopSettings', shopSettingsSchema)

export default shopSettingsModel
