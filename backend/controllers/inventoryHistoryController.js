import orderModel from '../models/orderModel.js'
import productModel from '../models/productModel.js'
import inventoryHistoryModel from '../models/inventoryHistoryModel.js'
import { getHistoryTypeLabel } from '../services/inventoryHistory.js'
import {
  flattenInventoryRows,
  findVariantForLine,
  getSkuForLine,
  readStock,
} from '../utils/inventory.js'
import { getPeriodRanges, isInRange } from '../utils/analyticsPeriod.js'
import { listPriceHistoryForProduct } from '../services/priceHistory.js'

const isCountableOrder = (order) => {
  if (String(order?.status) === 'Cancelled') return false
  if (order?.paymentMethod === 'COD') return true
  return order?.payment === true
}

const formatHistoryRow = (row) => ({
  _id: row._id,
  sku: row.sku,
  productName: row.productName,
  colorName: row.colorName,
  size: row.size,
  type: row.type,
  typeLabel: getHistoryTypeLabel(row.type),
  quantity: row.quantity,
  note: row.note || '',
  performedBy: row.performedBy || 'Admin',
  orderId: row.orderId || '',
  unitPrice: row.unitPrice || 0,
  createdAt: row.createdAt,
})

// tra kiếu tồn kho
const findCurrentStockBySku = async (sku) => {
  const products = await productModel.find({}).lean()
  const rows = flattenInventoryRows(products)
  const hit = rows.find((r) => String(r.sku) === String(sku))
  return hit ? { quantity: hit.quantity, productName: hit.productName, row: hit } : null
}

// danh sách tồn kho
export const listInventoryHistory = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim()
    const sku = String(req.query.sku || '').trim()
    const filter = {}

    if (sku) {
      filter.sku = sku
    } else if (q) {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = [{ sku: re }, { productName: re }]
    }

    // tim kiếm tồn kho
    const rows = await inventoryHistoryModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()

    res.json({
      success: true,
      rows: rows.map(formatHistoryRow),
    })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

export const getSkuInventoryDetail = async (req, res) => {
  try {
    const sku = decodeURIComponent(String(req.params.sku || '').trim())
    if (!sku) return res.json({ success: false, message: 'Thiếu SKU' })

    const historyRows = await inventoryHistoryModel
      .find({ sku })
      .sort({ createdAt: -1 })
      .lean()

    const current = await findCurrentStockBySku(sku)

    let totalImported = 0
    let totalSold = 0
    let importCount = 0
    let revenue = 0

    for (const h of historyRows) {
      const type = String(h.type || '').toUpperCase()
      const qty = Math.floor(Number(h.quantity) || 0)
      if (type === 'IMPORT') {
        totalImported += Math.max(0, qty)
        importCount += 1
      } else if (type === 'SALE') {
        const sold = Math.abs(Math.min(0, qty))
        totalSold += sold
        revenue += sold * Math.max(0, Number(h.unitPrice) || 0)
      } else if (type === 'RESTORE') {
        totalSold = Math.max(0, totalSold - Math.max(0, qty))
      }
    }

    const row = current?.row
    const productId =
      row?.productId ||
      historyRows[0]?.productId ||
      ''
    const priceRows = productId ? await listPriceHistoryForProduct(productId) : []

    res.json({
      success: true,
      sku,
      stats: {
        currentStock: current?.quantity ?? 0,
        productName: current?.productName || historyRows[0]?.productName || '—',
        totalImported,
        totalSold,
        importCount,
        revenue,
      },
      importMeta: row
        ? {
            productId: row.productId,
            colorName: row.colorName,
            size: row.size,
            variantIndex: row.variantIndex,
            sku: row.sku,
          }
        : null,
      history: historyRows.map(formatHistoryRow),
      priceHistory: priceRows.map((p) => ({
        _id: p._id,
        oldPrice: p.oldPrice,
        newPrice: p.newPrice,
        reason: p.reason || '',
        performedBy: p.performedBy || 'Admin',
        createdAt: p.createdAt,
      })),
    })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

// báo cáo tồn kho doanh số theo sku
export const getInventorySalesReport = async (req, res) => {
  try {
    const ranges = getPeriodRanges('this_month')
    const orders = await orderModel.find({}).lean()
    const products = await productModel.find({ isActive: { $ne: false } }).lean()
    const productMap = new Map(products.map((p) => [String(p._id), p]))

    /** sku -> { productId, productName, sku, size, colorName, soldQty } */
    const soldBySku = new Map()

    for (const order of orders) {
      if (!isCountableOrder(order)) continue
      const t = Number(order.date) || 0
      if (!isInRange(t, ranges.start, ranges.end)) continue

      for (const item of order.items || []) {
        const pid = String(item._id || item.productId || '')
        if (!pid) continue
        const qty = Math.max(1, Math.floor(Number(item.quantity) || 1))
        const size = String(item.size || '').trim()
        const color = String(item.color || 'DEFAULT').trim()
        const product = productMap.get(pid)
        const name = String(item.name || product?.name || 'Sản phẩm').trim()

        let sku = String(item.sku || '').trim()
        let colorName = color
        if (product) {
          const variant = findVariantForLine(product, color)
          if (variant) {
            colorName = String(variant.colorName || color).trim()
            if (!sku) sku = getSkuForLine(product, variant, size)
          }
        }
        if (!sku) sku = `${pid}-${colorName}-${size}`

        const prev = soldBySku.get(sku) || {
          productId: pid,
          productName: name,
          sku,
          size: size || '—',
          colorName: colorName || '—',
          soldQty: 0,
        }
        prev.soldQty += qty
        prev.productName = name
        prev.size = size || prev.size
        prev.colorName = colorName || prev.colorName
        soldBySku.set(sku, prev)
      }
    }

    const catalogRows = flattenInventoryRows(products)
    const mergedBySku = new Map()

    for (const row of catalogRows) {
      const sku = String(row.sku || '').trim()
      if (!sku || mergedBySku.has(sku)) continue
      const sold = soldBySku.get(sku)
      mergedBySku.set(sku, {
        productId: row.productId,
        productName: row.productName,
        sku,
        size: row.size || '—',
        colorName: row.colorName || '—',
        soldQty: sold?.soldQty || 0,
        stockQty: row.quantity,
      })
    }

    //sản phẩm đã bán 
    for (const [sku, sold] of soldBySku.entries()) {
      if (mergedBySku.has(sku)) continue
      mergedBySku.set(sku, {
        productId: sold.productId,
        productName: sold.productName,
        sku,
        size: sold.size,
        colorName: sold.colorName,
        soldQty: sold.soldQty,
        stockQty: 0,
      })
    }

    const allRows = [...mergedBySku.values()]

    // sản phẩm bá chạy
    const topSkus = allRows
      .filter((r) => r.soldQty > 0)
      .sort((a, b) => b.soldQty - a.soldQty || a.productName.localeCompare(b.productName, 'vi'))
      .slice(0, 10)
      .map(({ productId, productName, sku, size, colorName, soldQty }) => ({
        productId,
        productName,
        sku,
        size,
        colorName,
        soldQty,
      }))

      // sản phẩm tồn kho lâu 
    const slowSkus = allRows
      .sort(
        (a, b) =>
          a.soldQty - b.soldQty ||
          b.stockQty - a.stockQty ||
          a.productName.localeCompare(b.productName, 'vi')
      )
      .slice(0, 10)
      .map(({ productId, productName, sku, size, colorName, soldQty }) => ({
        productId,
        productName,
        sku,
        size,
        colorName,
        soldQty,
      }))

    res.json({
      success: true,
      periodLabel: ranges.label || 'Tháng này',
      topSkus,
      slowSkus,
    })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}
