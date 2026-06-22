import express from 'express'
import { placeOrder, allOrders, getOrderById, userOrders, updateStatus, cancelUserOrder, confirmReceived, placeOrderVNPAY, placeOrderMomo, verifyVnpay, verifyMomo, addReview, reviewList, replyReview, userReplies } from '../controllers/orderController.js'
import adminAuth from '../middleware/adminAuth.js'
import authUser from '../middleware/auth.js'
import upload from '../middleware/multer.js'
 
const orderRouter = express.Router()
 
// Admin Features
orderRouter.post('/list', adminAuth, allOrders)
orderRouter.post('/status', adminAuth, updateStatus)
 
// Payment Features
orderRouter.post('/place', authUser, placeOrder)      // COD
orderRouter.post('/vnpay', authUser, placeOrderVNPAY) // VNPAY
orderRouter.post('/momo', authUser, placeOrderMomo)   // MOMO
orderRouter.post('/verifyVnpay', authUser, verifyVnpay) // VNPAY verify
orderRouter.post('/verifyMomo', authUser, verifyMomo) // MOMO verify
 
// User Feature
orderRouter.post('/userorders', authUser, userOrders)
orderRouter.post('/cancel-user', authUser, cancelUserOrder)
orderRouter.post('/confirm-received', authUser, confirmReceived)
orderRouter.post('/review', authUser, upload.array('reviewImages', 5), addReview)
orderRouter.post('/user-replies', authUser, userReplies)

// Admin review features
orderRouter.get('/reviews', adminAuth, reviewList)
orderRouter.post('/reply-review', adminAuth, replyReview)

// Admin order detail (đặt sau /reviews để không bị nuốt path)
orderRouter.get('/:id', adminAuth, getOrderById)
 
export default orderRouter