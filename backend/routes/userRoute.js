import express from 'express';
import {
    loginUser,
    registerUser,
    adminLogin,
    getProfile,
    updateProfile,
    uploadAvatar,
    changePassword,
    sendRegisterOtp,
    verifyRegisterOtpHandler,
    resendRegisterOtp,
    getRegisterOtpStatus,
    listCustomers,
    sendForgotPasswordOtp,
    verifyForgotPasswordOtp,
    resetPasswordWithOtp,
} from '../controllers/userController.js';
import authUser from '../middleware/auth.js'
import adminAuth from '../middleware/adminAuth.js'
import upload from '../middleware/multer.js'

const userRouter = express.Router();

userRouter.post('/register/send-otp', sendRegisterOtp)
userRouter.post('/register/verify-otp', verifyRegisterOtpHandler)
userRouter.post('/register/resend-otp', resendRegisterOtp)
userRouter.post('/register/otp-status', getRegisterOtpStatus)
userRouter.post('/register', registerUser)
userRouter.post('/login', loginUser)
userRouter.post('/forgot-password/send-otp', sendForgotPasswordOtp)
userRouter.post('/forgot-password/verify-otp', verifyForgotPasswordOtp)
userRouter.post('/forgot-password/reset', resetPasswordWithOtp)
userRouter.post('/admin', adminLogin)
userRouter.get('/customers', adminAuth, listCustomers)

// profile
userRouter.get('/profile', authUser, getProfile)
userRouter.post('/profile/update', authUser, updateProfile)
userRouter.post('/profile/avatar', authUser, upload.single('avatar'), uploadAvatar)
userRouter.post('/change-password', authUser, changePassword)

export default userRouter;