import express from 'express'
import adminAuth from '../middleware/adminAuth.js'
import {
  listInventory,
  listLowStock,
  updateStock,
  getInventorySettings,
  updateInventorySettings,
} from '../controllers/inventoryController.js'
import {
  listInventoryHistory,
  getSkuInventoryDetail,
  getInventorySalesReport,
} from '../controllers/inventoryHistoryController.js'
import { getDashboardAnalytics } from '../controllers/analyticsController.js'

const inventoryRouter = express.Router()

inventoryRouter.get('/list', adminAuth, listInventory)
inventoryRouter.get('/low-stock', adminAuth, listLowStock)
inventoryRouter.post('/update-stock', adminAuth, updateStock)
inventoryRouter.get('/settings', adminAuth, getInventorySettings)
inventoryRouter.put('/settings', adminAuth, updateInventorySettings)
inventoryRouter.get('/dashboard', adminAuth, getDashboardAnalytics)
inventoryRouter.get('/history', adminAuth, listInventoryHistory)
inventoryRouter.get('/sku/:sku', adminAuth, getSkuInventoryDetail)
inventoryRouter.get('/sales-report', adminAuth, getInventorySalesReport)

export default inventoryRouter
