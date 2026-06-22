import express from 'express'
import adminAuth from '../middleware/adminAuth.js'
import {
  getTopCustomers,
  toggleCustomerBlock,
  deleteCustomer,
  grantCustomerReward,
} from '../controllers/adminController.js'

const adminRouter = express.Router()

adminRouter.get('/top-customers', adminAuth, getTopCustomers)
adminRouter.patch('/customers/:userId/block', adminAuth, toggleCustomerBlock)
adminRouter.delete('/customers/:userId', adminAuth, deleteCustomer)
adminRouter.post('/grant-reward', adminAuth, grantCustomerReward)

export default adminRouter
