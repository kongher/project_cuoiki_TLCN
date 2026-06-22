import express from 'express'
import adminAuth from '../middleware/adminAuth.js'
import upload from '../middleware/multer.js'
import {
  listPublicBanners,
  adminListBanners,
  saveBanner,
  removeBanner,
} from '../controllers/bannerController.js'
import {
  listPublicMenuAnnouncement,
  adminListMenuAnnouncements,
  saveMenuAnnouncement,
  removeMenuAnnouncement,
} from '../controllers/menuAnnouncementController.js'

const bannerRouter = express.Router()

bannerRouter.get('/list', listPublicBanners)
bannerRouter.get('/admin/list', adminAuth, adminListBanners)
bannerRouter.post('/admin/save', adminAuth, upload.single('image'), saveBanner)
bannerRouter.post('/admin/remove', adminAuth, removeBanner)

bannerRouter.get('/menu-announcement', listPublicMenuAnnouncement)
bannerRouter.get('/menu-announcement/admin/list', adminAuth, adminListMenuAnnouncements)
bannerRouter.post('/menu-announcement/admin/save', adminAuth, saveMenuAnnouncement)
bannerRouter.post('/menu-announcement/admin/remove', adminAuth, removeMenuAnnouncement)

export default bannerRouter
