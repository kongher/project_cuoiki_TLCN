import express from 'express'
import {
  listProducts,
  addProduct,
  removeProduct,
  singleProduct,
  reviewSummary,
  adminListProducts,
  toggleProductActive,
  bulkDeleteProducts,
  bulkSpecialSale10,
  bulkSpecialSalePercent,
  updateProduct,
  listProductTags
} from '../controllers/productController.js'
import upload from '../middleware/multer.js';
import adminAuth from '../middleware/adminAuth.js';

const productRouter = express.Router();

// Use upload.any() to support variant images (color thumbnail + main image).
// Backward compatible: controller still accepts legacy image1..image4.
productRouter.post('/add', adminAuth, upload.any(), addProduct);
productRouter.post('/remove',adminAuth,removeProduct);
productRouter.post('/single',singleProduct);
productRouter.post('/review-summary',reviewSummary);
productRouter.get('/list',listProducts)

// Admin endpoints
productRouter.get('/admin/list', adminAuth, adminListProducts)
productRouter.get('/admin/tags', adminAuth, listProductTags)
productRouter.post('/admin/toggle-active', adminAuth, toggleProductActive)
productRouter.post('/admin/bulk-delete', adminAuth, bulkDeleteProducts)
productRouter.post('/admin/bulk-special-sale-10', adminAuth, bulkSpecialSale10)
productRouter.post('/admin/bulk-special-sale', adminAuth, bulkSpecialSalePercent)
productRouter.post('/admin/update', adminAuth, upload.any(), updateProduct)

export default productRouter