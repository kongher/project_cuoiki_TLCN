import orderModel from '../models/orderModel.js'
import productModel from '../models/productModel.js'
import { getShopSettings } from '../services/shopSettings.js'
import { flattenInventoryRows, findVariantForLine, getSkuForLine } from '../utils/inventory.js'
import {
  getPeriodRanges,
  isInRange,
  PERIOD_LABELS,
  resolveAllTimeRange,
} from '../utils/analyticsPeriod.js'

const isCountableOrder = (order) => {
  if (String(order?.status) === 'Cancelled') return false
  if (order?.paymentMethod === 'COD') return true
  return order?.payment === true
}

const isCancelledOrReturn = (order) => {
  const st = String(order?.status || '')
  return st === 'Cancelled' || st === 'Returned' || st === 'Refunded'
}

const calcKpisForRange = (orders, start, end) => {
  let totalRevenue = 0
  let totalOrders = 0
  let cancelledOrReturn = 0
  let allInRange = 0

  for (const order of orders) {
    const t = Number(order.date) || 0
    if (!isInRange(t, start, end)) continue
    allInRange += 1
    if (isCancelledOrReturn(order)) {
      cancelledOrReturn += 1
      continue
    }
    if (isCountableOrder(order)) {
      totalOrders += 1
      totalRevenue += Number(order.amount) || 0
    }
  }

  const cancelReturnRate =
    allInRange > 0 ? Math.round((cancelledOrReturn / allInRange) * 1000) / 10 : 0

  return { totalRevenue, totalOrders, cancelReturnRate, allInRange }
}

const growthPercent = (current, previous) => {
  const c = Number(current) || 0
  const p = Number(previous) || 0
  if (p <= 0) return c > 0 ? 100 : 0
  return Math.round(((c - p) / p) * 1000) / 10
}

const buildSoldSkuMap = (orders, since, productMap) => {
  /** productId -> sku -> soldQty */
  const byProduct = new Map()

  for (const order of orders) {
    if (!isCountableOrder(order)) continue
    if (Number(order.date) < since) continue
    for (const item of order.items || []) {
      const pid = String(item._id || item.productId || '')
      if (!pid) continue
      const qty = Math.max(1, Math.floor(Number(item.quantity) || 1))
      const size = String(item.size || '').trim()
      const color = String(item.color || 'DEFAULT').trim()
      const product = productMap.get(pid)
      let sku = String(item.sku || '').trim()
      if (!sku && product) {
        const variant = findVariantForLine(product, color)
        if (variant) sku = getSkuForLine(product, variant, size)
      }
      if (!sku) sku = `${pid}-${color}-${size}`

      if (!byProduct.has(pid)) byProduct.set(pid, new Map())
      const skuMap = byProduct.get(pid)
      skuMap.set(sku, (skuMap.get(sku) || 0) + qty)
    }
  }
  return byProduct
}

const buildSoldBreakdownForProduct = (product, soldSkuMap) => {
  const variants = Array.isArray(product?.variants) ? product.variants : []
  const lines = []
  const seen = new Set()

  for (const v of variants) {
    const colorName = String(v?.colorName || '').trim() || '—'
    const stockBySize =
      v?.stockBySize && typeof v.stockBySize === 'object' ? v.stockBySize : {}
    const sizes = Object.keys(stockBySize)
    const sizeList = sizes.length ? sizes : ['']

    for (const size of sizeList) {
      const sizeStr = String(size).trim()
      const sku = getSkuForLine(product, v, sizeStr)
      if (seen.has(sku)) continue
      seen.add(sku)
      lines.push({
        sku,
        colorName,
        size: sizeStr || '—',
        soldQty: Math.max(0, soldSkuMap?.get(sku) || 0),
      })
    }
  }

  if (!lines.length && soldSkuMap?.size) {
    for (const [sku, soldQty] of soldSkuMap.entries()) {
      lines.push({ sku, colorName: '—', size: '—', soldQty })
    }
  }

  return lines.sort((a, b) => b.soldQty - a.soldQty || String(a.sku).localeCompare(String(b.sku)))
}

const buildStockBreakdownForProduct = (product) => {
  const rows = flattenInventoryRows([product])
  return rows
    .map((r) => ({
      sku: r.sku,
      colorName: r.colorName,
      size: r.size,
      stockQty: r.quantity,
    }))
    .sort((a, b) => b.stockQty - a.stockQty || String(a.sku).localeCompare(String(b.sku)))
}

const buildTopSellersAndDeadstock = async (orders, deadstockDays) => {
  const since = Date.now() - deadstockDays * 24 * 60 * 60 * 1000
  const salesMap = new Map()
  const products = await productModel.find({}).lean()
  const productMap = new Map(products.map((p) => [String(p._id), p]))
  const soldByProduct = buildSoldSkuMap(orders, since, productMap)

  for (const order of orders) {
    if (!isCountableOrder(order)) continue
    if (Number(order.date) < since) continue
    for (const item of order.items || []) {
      const pid = String(item._id || item.productId || '')
      if (!pid) continue
      const prev = salesMap.get(pid) || { productId: pid, name: item.name || '', qty: 0 }
      prev.qty += Math.max(1, Math.floor(Number(item.quantity) || 1))
      if (item.name) prev.name = item.name
      salesMap.set(pid, prev)
    }
  }

  const topIds = [...salesMap.values()]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)
    .map((r) => r.productId)

  const topSellers = topIds.map((productId) => {
    const agg = salesMap.get(productId)
    const product = productMap.get(productId)
    const parentSku = String(product?.parentSku || '').trim()
    const soldSkuMap = soldByProduct.get(productId) || new Map()
    return {
      productId,
      name: agg?.name || product?.name || 'Sản phẩm',
      parentSku,
      soldQty: agg?.qty || 0,
      skuBreakdown: product ? buildSoldBreakdownForProduct(product, soldSkuMap) : [],
    }
  })

  const soldProductIds = new Set()
  for (const order of orders) {
    if (!isCountableOrder(order)) continue
    if (Number(order.date) < since) continue
    for (const item of order.items || []) {
      soldProductIds.add(String(item._id || item.productId || ''))
    }
  }

  const deadCandidates = []

  for (const p of products) {
    const pid = String(p._id)
    if (soldProductIds.has(pid)) continue
    const rows = flattenInventoryRows([p])
    const totalStock = rows.reduce((s, r) => s + r.quantity, 0)
    if (totalStock <= 0) continue
    deadCandidates.push({
      productId: pid,
      name: p.name,
      parentSku: String(p.parentSku || '').trim(),
      totalStock,
      stockBreakdown: buildStockBreakdownForProduct(p),
    })
  }

  const deadstock = deadCandidates.sort((a, b) => b.totalStock - a.totalStock).slice(0, 5)
  return { topSellers, deadstock }
}

export const getDashboardAnalytics = async (req, res) => {
  try {
    const periodKey = String(req.query.period || 'this_month')
    const settings = await getShopSettings()
    const deadstockDays = Number(settings.deadstockDaysMin) || 30

    const orders = await orderModel.find({}).lean()

    let ranges
    if (periodKey === 'all_time') {
      let firstOrderTs = Date.now()
      for (const order of orders) {
        const t = Number(order.date) || 0
        if (t > 0 && t < firstOrderTs) firstOrderTs = t
      }
      ranges = resolveAllTimeRange(firstOrderTs)
    } else {
      ranges = getPeriodRanges(periodKey)
    }

    const current = calcKpisForRange(orders, ranges.start, ranges.end)
    const previous = calcKpisForRange(orders, ranges.prevStart, ranges.prevEnd)

    const { topSellers, deadstock } = await buildTopSellersAndDeadstock(orders, deadstockDays)

    res.json({
      success: true,
      period: ranges.key,
      periodLabel: ranges.label || PERIOD_LABELS[ranges.key],
      kpis: {
        totalRevenue: current.totalRevenue,
        totalOrders: current.totalOrders,
        cancelReturnRate: current.cancelReturnRate,
        revenueGrowthPercent: growthPercent(current.totalRevenue, previous.totalRevenue),
        ordersGrowthPercent: growthPercent(current.totalOrders, previous.totalOrders),
        previousRevenue: previous.totalRevenue,
        previousOrders: previous.totalOrders,
      },
      topSellers,
      deadstock,
      deadstockDays,
      lowStockThreshold: settings.lowStockThreshold,
    })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}
