import express from 'express'
import authUser from '../middleware/auth.js'
import { listNotifications, markNotificationRead } from '../controllers/notificationController.js'

const notificationRouter = express.Router()

notificationRouter.get('/', authUser, listNotifications)
notificationRouter.put('/read/:id', authUser, markNotificationRead)

export default notificationRouter
