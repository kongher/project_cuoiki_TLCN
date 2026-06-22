import productModel from '../models/productModel.js'
import { flattenInventoryRows, getSkuForLine, readStock, setStockOnVariant } from '../utils/inventory.js'
import { getShopSettings } from '../services/shopSettings.js'
import { logInventoryHistory } from '../services/inventoryHistory.js'
const norm = (s) => String(s || '').trim().toLowerCase()

export const listInventory = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase()
    const products = await productModel.find({}).sort({ date: -1 }).lean()
    let rows = flattenInventoryRows(products)
    if (q) {
      rows = rows.filter(
        (r) =>
          String(r.sku).toLowerCase().includes(q) ||
          String(r.productName).toLowerCase().includes(q) ||
          String(r.colorName).toLowerCase().includes(q) ||
          String(r.size).toLowerCase().includes(q)
      )
    }
    const settings = await getShopSettings()
    const threshold = Number(settings.lowStockThreshold) || 5
    res.json({ success: true, rows, lowStockThreshold: threshold })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

export const listLowStock = async (req, res) => {
  try {
    const settings = await getShopSettings()
    const threshold = Number(settings.lowStockThreshold) || 5
    const products = await productModel.find({}).lean()
    const rows = flattenInventoryRows(products).filter((r) => r.quantity <= threshold)
    res.json({ success: true, rows, lowStockThreshold: threshold })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

export const updateStock = async (req, res) => {
  try {
    const { productId, colorName, size, quantity, addQty, variantIndex } = req.body
    if (!productId || !size) {
      return res.json({ success: false, message: 'Thiếu productId hoặc size' })
    }

    const product = await productModel.findById(productId)
    if (!product) return res.json({ success: false, message: 'Không tìm thấy sản phẩm' })

    const variants = Array.isArray(product.variants) ? [...product.variants] : []
    const c = norm(colorName || '')
    let idx = -1
    if (variantIndex !== undefined && variantIndex !== null && variantIndex !== '') {
      const vi = Math.floor(Number(variantIndex))
      if (vi >= 0 && vi < variants.length) idx = vi
    }
    if (idx < 0 && c) {
      idx = variants.findIndex((v) => norm(v?.colorName) === c)
    }
    if (idx < 0) {
      return res.json({
        success: false,
        message: `Không tìm thấy biến thể màu "${colorName || ''}"`,
      })
    }
    const variant = { ...(variants[idx] || {}) }
    const current = readStock(variant, size)
    const resolvedSku =
      String(req.body.sku || '').trim() ||
      getSkuForLine(product, variant, String(size || '').trim())

    let next
    let logType = 'ADJUST'
    let logQty = 0
    const note = String(req.body.note || '').trim()

    if (addQty !== undefined && addQty !== null && addQty !== '') {
      const add = Math.floor(Number(addQty) || 0)
      next = current + add
      logType = 'IMPORT'
      logQty = add
    } else {
      next = Math.floor(Number(quantity) || 0)
      logQty = next - current
    }
    if (next < 0) return res.json({ success: false, message: 'Số lượng không hợp lệ' })

    setStockOnVariant(variant, size, next)
    variants[idx] = variant
    product.variants = variants
    product.markModified('variants')
    await product.save()

    if (logQty !== 0) {
      try {
        await logInventoryHistory({
          sku: resolvedSku,
          productId: String(product._id),
          productName: product.name,
          colorName: String(variant.colorName || colorName || '').trim(),
          size: String(size || '').trim(),
          type: logType,
          quantity: logType === 'IMPORT' ? logQty : logQty,
          note: note || (logType === 'ADJUST' ? 'Sửa nhanh tồn kho' : ''),
          performedBy: 'Admin',
        })
      } catch {
        /* ignore log errors */
      }
    }

    res.json({
      success: true,
      message: 'Đã cập nhật tồn kho',
      quantity: next,
      sku: resolvedSku,
    })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

export const getInventorySettings = async (req, res) => {
  try {
    const settings = await getShopSettings()
    res.json({
      success: true,
      settings: {
        lowStockThreshold: settings.lowStockThreshold,
        deadstockDaysMin: settings.deadstockDaysMin,
        deadstockDaysMax: settings.deadstockDaysMax,
      },
    })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

export const updateInventorySettings = async (req, res) => {
  try {
    const settings = await getShopSettings()
    const { lowStockThreshold, deadstockDaysMin, deadstockDaysMax } = req.body
    if (lowStockThreshold !== undefined) {
      settings.lowStockThreshold = Math.max(0, Math.floor(Number(lowStockThreshold) || 0))
    }
    if (deadstockDaysMin !== undefined) {
      settings.deadstockDaysMin = Math.max(1, Math.floor(Number(deadstockDaysMin) || 30))
    }
    if (deadstockDaysMax !== undefined) {
      settings.deadstockDaysMax = Math.max(
        settings.deadstockDaysMin || 30,
        Math.floor(Number(deadstockDaysMax) || 60)
      )
    }
    settings.updatedAt = Date.now()
    await settings.save()
    res.json({ success: true, message: 'Đã lưu cài đặt', settings })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}
