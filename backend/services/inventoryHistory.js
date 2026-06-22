import inventoryHistoryModel from '../models/inventoryHistoryModel.js'

export const HISTORY_TYPE_LABELS = {
  IMPORT: 'Nhập kho',
  SALE: 'Bán hàng',
  ADJUST: 'Điều chỉnh',
  RESTORE: 'Hoàn kho',
}

export const getHistoryTypeLabel = (type) =>
  HISTORY_TYPE_LABELS[String(type || '').toUpperCase()] || String(type || '')

export const logInventoryHistory = async ({
  sku,
  productId = '',
  productName = '',
  colorName = '',
  size = '',
  type,
  quantity,
  note = '',
  performedBy = 'Admin',
  orderId = '',
  unitPrice = 0,
}) => {
  const qty = Math.floor(Number(quantity) || 0)
  if (!sku || !type || qty === 0) return null

  return inventoryHistoryModel.create({
    sku: String(sku).trim(),
    productId: String(productId || '').trim(),
    productName: String(productName || '').trim(),
    colorName: String(colorName || '').trim(),
    size: String(size || '').trim(),
    type: String(type).toUpperCase(),
    quantity: qty,
    note: String(note || '').trim(),
    performedBy: String(performedBy || 'Admin').trim(),
    orderId: String(orderId || '').trim(),
    unitPrice: Math.max(0, Number(unitPrice) || 0),
    createdAt: Date.now(),
  })
}
