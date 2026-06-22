import mongoose from 'mongoose'

const priceHistorySchema = new mongoose.Schema({
  productId: { type: String, required: true, index: true },
  oldPrice: { type: Number, default: 0 },
  newPrice: { type: Number, required: true },
  reason: { type: String, default: '' },
  performedBy: { type: String, default: 'Admin' },
  createdAt: { type: Number, default: () => Date.now() },
})

priceHistorySchema.index({ productId: 1, createdAt: -1 })

const priceHistoryModel =
  mongoose.models.price_history || mongoose.model('price_history', priceHistorySchema)

export default priceHistoryModel
