import mongoose from 'mongoose'

const inventoryHistorySchema = new mongoose.Schema({
  sku: { type: String, required: true, index: true },
  productId: { type: String, default: '' },
  productName: { type: String, default: '' },
  colorName: { type: String, default: '' },
  size: { type: String, default: '' },
  /** IMPORT | SALE | ADJUST | RESTORE */
  type: { type: String, required: true },
  /** Dương = nhập/hoàn, âm = bán/điều chỉnh giảm */
  quantity: { type: Number, required: true },
  note: { type: String, default: '' },
  performedBy: { type: String, default: 'Admin' },
  orderId: { type: String, default: '' },
  unitPrice: { type: Number, default: 0 },
  createdAt: { type: Number, default: () => Date.now() },
})

inventoryHistorySchema.index({ createdAt: -1 })
inventoryHistorySchema.index({ sku: 1, createdAt: -1 })

const inventoryHistoryModel =
  mongoose.models.inventory_history ||
  mongoose.model('inventory_history', inventoryHistorySchema)

export default inventoryHistoryModel
