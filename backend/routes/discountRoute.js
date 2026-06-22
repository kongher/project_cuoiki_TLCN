import express from 'express'
import { applyCoupon, createCoupon, listCoupons, toggleCouponActive, updateCoupon, listAvailableCoupons } from '../controllers/discountController.js'
import authUser from '../middleware/auth.js'
import adminAuth from '../middleware/adminAuth.js'

const discountRouter = express.Router()

discountRouter.post('/apply', authUser, applyCoupon)
discountRouter.post('/available', authUser, listAvailableCoupons)
discountRouter.post('/add', adminAuth, createCoupon)
discountRouter.get('/list', adminAuth, listCoupons)
discountRouter.post('/toggle', adminAuth, toggleCouponActive)
discountRouter.post('/update', adminAuth, updateCoupon)

export default discountRouter
