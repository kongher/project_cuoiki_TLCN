import priceHistoryModel from '../models/priceHistoryModel.js'

export const logPriceHistory = async ({
  productId,
  oldPrice = 0,
  newPrice,
  reason = '',
  performedBy = 'Admin',
}) => {
  const pid = String(productId || '').trim()
  const next = Math.max(0, Number(newPrice) || 0)
  const prev = Math.max(0, Number(oldPrice) || 0)
  if (!pid || next === prev) return null

  return priceHistoryModel.create({
    productId: pid,
    oldPrice: prev,
    newPrice: next,
    reason: String(reason || '').trim(),
    performedBy: String(performedBy || 'Admin').trim(),
    createdAt: Date.now(),
  })
}

export const listPriceHistoryForProduct = async (productId, limit = 100) => {
  const pid = String(productId || '').trim()
  if (!pid) return []
  return priceHistoryModel.find({ productId: pid }).sort({ createdAt: -1 }).limit(limit).lean()
}
