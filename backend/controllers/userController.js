import validator from "validator";
import bcrypt from "bcrypt"
import jwt from 'jsonwebtoken'
import userModel from "../models/userModel.js";
import { v2 as cloudinary } from "cloudinary"
import { normalizePhone, isValidPhone } from "../utils/phone.js"
import {
    createRegisterOtp,
    verifyRegisterOtp,
    isEmailOtpVerified,
    clearRegisterOtp,
    getOtpRemainingSec,
    verifyRegisterToken,
} from "../utils/otpStore.js"
import { sendRegisterOtpEmail, sendPasswordResetOtpEmail } from "../utils/mailService.js"
import {
    createResetOtp,
    verifyResetOtp,
    clearResetOtp,
    verifyResetToken,
} from "../utils/resetOtpStore.js"
import notificationModel from "../models/notificationModel.js"


const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET)
}

// Route for user login (email hoặc số điện thoại)
const loginUser = async (req, res) => {
    try {

        const { email, phone, password } = req.body;
        const identifier = String(email || phone || '').trim()
        if (!identifier || !password) {
            return res.json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin' })
        }

        let user = null
        const normalizedPhone = normalizePhone(identifier)
        if (isValidPhone(identifier)) {
            user = await userModel.findOne({ phone: normalizedPhone })
        } else {
            user = await userModel.findOne({ email: identifier.toLowerCase() })
        }

        if (!user) {
            return res.json({ success: false, message: "Tài khoản không tồn tại" })
        }

        if (user.isBlocked) {
            return res.json({ success: false, message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ hỗ trợ.' })
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {

            const token = createToken(user._id)
            res.json({ success: true, token })

        }
        else {
            res.json({ success: false, message: 'Invalid credentials' })
        }

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const normalizeEmailInput = (raw) => String(raw || '').trim().toLowerCase()

const sendRegisterOtp = async (req, res) => {
    try {
        const email = normalizeEmailInput(req.body.email)
        if (!email) {
            return res.json({ success: false, message: 'Vui lòng nhập email' })
        }
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: 'Email không hợp lệ' })
        }
        const exists = await userModel.findOne({ email })
        if (exists) {
            return res.json({ success: false, message: 'Email này đã được sử dụng' })
        }

        const { code, expiresInSec } = createRegisterOtp(email)
        try {
            await sendRegisterOtpEmail({ to: email, otp: code, expiresInSec })
        } catch (mailErr) {
            console.error('[Gửi email OTP đăng ký thất bại]', mailErr.message)
            return res.json({
                success: false,
                message: 'Không gửi được email OTP. Kiểm tra cấu hình EMAIL_USER / EMAIL_PASS trong .env',
            })
        }

        res.json({
            success: true,
            message: 'Đã gửi mã OTP tới email của bạn',
            expiresInSec,
            email,
        })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

const verifyRegisterOtpHandler = async (req, res) => {
    try {
        const email = normalizeEmailInput(req.body.email)
        const otp = String(req.body.otp || '').trim()
        if (!email || !validator.isEmail(email)) {
            return res.json({ success: false, message: 'Email không hợp lệ' })
        }
        if (!otp) {
            return res.json({ success: false, message: 'Vui lòng nhập mã OTP' })
        }
        const result = verifyRegisterOtp(email, otp)
        if (!result.ok) {
            return res.json({ success: false, message: result.message })
        }
        res.json({
            success: true,
            message: 'Xác thực OTP thành công',
            email,
            register_token: result.registerToken,
            expiresInSec: result.expiresInSec,
        })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

const resendRegisterOtp = async (req, res) => {
    try {
        const email = normalizeEmailInput(req.body.email)
        if (!email || !validator.isEmail(email)) {
            return res.json({ success: false, message: 'Email không hợp lệ' })
        }
        const exists = await userModel.findOne({ email })
        if (exists) {
            return res.json({ success: false, message: 'Email này đã được sử dụng' })
        }

        const { code, expiresInSec } = createRegisterOtp(email)
        try {
            await sendRegisterOtpEmail({ to: email, otp: code, expiresInSec })
        } catch (mailErr) {
            console.error('[Gửi lại email OTP đăng ký thất bại]', mailErr.message)
            return res.json({
                success: false,
                message: 'Không gửi được email OTP. Kiểm tra cấu hình EMAIL_USER / EMAIL_PASS trong .env',
            })
        }

        res.json({ success: true, message: 'Đã gửi lại mã OTP tới email của bạn', expiresInSec })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

const registerUser = async (req, res) => {
    try {
        const email = normalizeEmailInput(req.body.email)
        const phone = normalizePhone(req.body.phone)
        const name = String(req.body.name || '').trim()
        const gender = String(req.body.gender || '').trim()
        const dob = String(req.body.birthday || req.body.dob || '').trim()
        const password = String(req.body.password || '')
        const confirmPassword = String(req.body.confirmPassword || '')
        const registerToken = String(req.body.register_token || req.body.registerToken || '').trim()

        if (!email || !validator.isEmail(email)) {
            return res.json({ success: false, message: 'Email không hợp lệ' })
        }
        const tokenCheck = verifyRegisterToken(email, registerToken)
        if (!tokenCheck.ok) return res.json({ success: false, message: tokenCheck.message })
        if (!isValidPhone(phone)) {
            return res.json({ success: false, message: 'Số điện thoại không hợp lệ' })
        }
        if (!name) return res.json({ success: false, message: 'Vui lòng nhập họ tên' })
        if (!gender || !['male', 'female', 'other'].includes(gender)) {
            return res.json({ success: false, message: 'Vui lòng chọn giới tính' })
        }
        if (!dob) return res.json({ success: false, message: 'Vui lòng chọn ngày sinh' })
        if (password.length < 8) {
            return res.json({ success: false, message: 'Mật khẩu tối thiểu 8 ký tự' })
        }
        if (password !== confirmPassword) {
            return res.json({ success: false, message: 'Mật khẩu xác nhận không khớp' })
        }

        const emailExists = await userModel.findOne({ email })
        if (emailExists) {
            return res.json({ success: false, message: 'Email này đã được sử dụng' })
        }
        const phoneExists = await userModel.findOne({ phone })
        if (phoneExists) {
            return res.json({ success: false, message: 'Số điện thoại này đã được sử dụng' })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password.trim(), salt)

        const newUser = new userModel({
            name,
            phone,
            email,
            gender,
            dob,
            password: hashedPassword,
            role: 'customer',
        })

        await newUser.save()
        clearRegisterOtp(email)

        res.json({ success: true, message: 'Đăng ký thành công' })
    } catch (error) {
        console.log(error)
        if (error?.code === 11000) {
            return res.json({ success: false, message: 'Số điện thoại hoặc email đã tồn tại' })
        }
        res.json({ success: false, message: error.message })
    }
}

const getRegisterOtpStatus = async (req, res) => {
    try {
        const email = normalizeEmailInput(req.body.email)
        res.json({
            success: true,
            remainingSec: getOtpRemainingSec(email),
            verified: isEmailOtpVerified(email),
        })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

const listCustomers = async (req, res) => {
    try {
        const users = await userModel
            .find({ role: { $ne: 'admin' } })
            .select('-password -cartData')
            .sort({ createdAt: -1 })
            .lean()

        const customers = users.map((u, idx) => ({
            stt: idx + 1,
            _id: u._id,
            phone: u.phone || '',
            name: u.name || '',
            email: u.email || '',
            gender: u.gender || '',
            dob: u.dob || '',
            isBlocked: Boolean(u.isBlocked),
            membershipTier: u.membershipTier || 'standard',
            rewardPoints: Number(u.rewardPoints) || 0,
            createdAt: u.createdAt,
        }))

        res.json({ success: true, customers })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

const resetKeyFromEmail = (email) => `email:${email}`

const sendForgotPasswordOtp = async (req, res) => {
    try {
        const email = normalizeEmailInput(req.body.email || req.body.identifier)
        if (!email) {
            return res.json({ success: false, message: 'Vui lòng nhập email' })
        }
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: 'Email không hợp lệ' })
        }

        const user = await userModel.findOne({ email })
        if (!user) {
            return res.json({ success: false, message: 'Email này chưa được đăng ký tài khoản' })
        }

        const resetKey = resetKeyFromEmail(email)
        const { code, expiresInSec } = createResetOtp(resetKey, user._id)

        try {
            await sendPasswordResetOtpEmail({ to: email, otp: code, expiresInSec })
        } catch (mailErr) {
            console.error('[Gửi email OTP thất bại]', mailErr.message)
            return res.json({
                success: false,
                message: 'Không gửi được email OTP. Kiểm tra cấu hình SMTP trong .env',
            })
        }

        res.json({
            success: true,
            message: 'Đã gửi mã OTP tới email của bạn',
            expiresInSec,
            email,
        })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

const verifyForgotPasswordOtp = async (req, res) => {
    try {
        const email = normalizeEmailInput(req.body.email || req.body.identifier)
        const otp = String(req.body.otp || '').trim()
        if (!email || !validator.isEmail(email)) {
            return res.json({ success: false, message: 'Email không hợp lệ' })
        }
        if (!otp) {
            return res.json({ success: false, message: 'Vui lòng nhập mã OTP' })
        }

        const result = verifyResetOtp(resetKeyFromEmail(email), otp)
        if (!result.ok) {
            return res.json({ success: false, message: result.message })
        }

        res.json({
            success: true,
            message: 'Xác thực OTP thành công',
            email,
            reset_token: result.resetToken,
            expiresInSec: result.expiresInSec,
        })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

const resetPasswordWithOtp = async (req, res) => {
    try {
        const email = normalizeEmailInput(req.body.email || req.body.identifier)
        const password = String(req.body.password || '')
        const confirmPassword = String(req.body.confirmPassword || '')
        const resetToken = String(req.body.reset_token || req.body.resetToken || '').trim()
        if (!email || !validator.isEmail(email)) {
            return res.json({ success: false, message: 'Email không hợp lệ' })
        }

        const resetKey = resetKeyFromEmail(email)
        const tokenCheck = verifyResetToken(resetKey, resetToken)
        if (!tokenCheck.ok) {
            if (tokenCheck.code === 'RESET_SESSION_EXPIRED') {
                return res.json({
                    success: false,
                    code: 'RESET_SESSION_EXPIRED',
                    message: 'Phiên làm việc đã hết hạn do bạn thao tác quá lâu, vui lòng nhận lại mã OTP mới',
                })
            }
            if (tokenCheck.code === 'RESET_OTP_REQUIRED') {
                return res.json({ success: false, code: 'RESET_OTP_REQUIRED', message: 'Vui lòng xác thực OTP trước' })
            }
            return res.json({
                success: false,
                code: 'RESET_SESSION_INVALID',
                message: 'Phiên đặt lại mật khẩu không hợp lệ. Vui lòng nhận lại mã OTP mới',
            })
        }
        if (password.length < 8) {
            return res.json({ success: false, message: 'Mật khẩu tối thiểu 8 ký tự' })
        }
        if (password !== confirmPassword) {
            return res.json({ success: false, message: 'Mật khẩu xác nhận không khớp' })
        }

        const userId = tokenCheck.userId

        const user = await userModel.findById(userId)
        if (!user) {
            return res.json({ success: false, message: 'Không tìm thấy tài khoản' })
        }

        const salt = await bcrypt.genSalt(10)
        user.password = await bcrypt.hash(password.trim(), salt)
        await user.save()
        clearResetOtp(resetKey)

        try {
            await notificationModel.create({
                userId: user._id,
                title: 'Đổi mật khẩu thành công',
                content: 'Mật khẩu tài khoản của bạn đã được cập nhật. Nếu không phải bạn, hãy liên hệ hỗ trợ.',
                type: 'security',
                referenceId: String(user._id),
                isRead: false,
            })
        } catch (notifyErr) {
            console.error('[thông báo đổi mật khẩu]', notifyErr.message)
        }

        res.json({ success: true, message: 'Đổi mật khẩu thành công!' })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Route for admin login
const adminLogin = async (req, res) => {
    try {
        
        const {email,password} = req.body

        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            const token = jwt.sign(email+password,process.env.JWT_SECRET);
            res.json({success:true,token})
        } else {
            res.json({success:false,message:"Invalid credentials"})
        }

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}


export {
    loginUser,
    registerUser,
    adminLogin,
    sendRegisterOtp,
    verifyRegisterOtpHandler,
    resendRegisterOtp,
    getRegisterOtpStatus,
    listCustomers,
    sendForgotPasswordOtp,
    verifyForgotPasswordOtp,
    resetPasswordWithOtp,
}

// --- Profile APIs (auth required) ---
const sanitizeUser = (user) => {
    if (!user) return null
    return {
        _id: user._id,
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        gender: user.gender || '',
        dob: user.dob || '',
        avatar: user.avatar || '',
        defaultAddress: user.defaultAddress || {}
    }
}

const getProfile = async (req, res) => {
    try {
        const userId = req.userId || req.body.userId
        const user = await userModel.findById(userId)
        if (!user) return res.json({ success: false, message: 'User not found' })
        res.json({ success: true, user: sanitizeUser(user) })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

const updateProfile = async (req, res) => {
    try {
        const userId = req.userId || req.body.userId
        const user = await userModel.findById(userId)
        if (!user) return res.json({ success: false, message: 'User not found' })

        const name = String(req.body.name || '').trim()
        const phone = String(req.body.phone || '').trim()
        const gender = String(req.body.gender || '').trim()
        const dob = String(req.body.dob || '').trim()
        const defaultAddress = req.body.defaultAddress && typeof req.body.defaultAddress === 'object'
            ? req.body.defaultAddress
            : null

        if (name) user.name = name
        user.phone = phone
        user.gender = ['male', 'female', 'other', ''].includes(gender) ? gender : ''
        user.dob = dob

        if (defaultAddress) {
            user.defaultAddress = {
                fullName: String(defaultAddress.fullName || '').trim(),
                phone: String(defaultAddress.phone || '').trim(),
                address: String(defaultAddress.address || '').trim(),
                province: String(defaultAddress.province || '').trim(),
                district: String(defaultAddress.district || '').trim(),
                ward: String(defaultAddress.ward || '').trim()
            }
            user.markModified('defaultAddress')
        }

        await user.save()
        res.json({ success: true, message: 'Updated', user: sanitizeUser(user) })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

const uploadAvatar = async (req, res) => {
    try {
        const userId = req.userId || req.body.userId
        const user = await userModel.findById(userId)
        if (!user) return res.json({ success: false, message: 'User not found' })

        const file = req.file
        if (!file?.path) return res.json({ success: false, message: 'Thiếu ảnh' })
        const result = await cloudinary.uploader.upload(file.path, { resource_type: 'image' })
        user.avatar = result.secure_url
        await user.save()
        res.json({ success: true, message: 'Updated', avatar: user.avatar })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

const changePassword = async (req, res) => {
    try {
        const userId = req.userId || req.body.userId
        const { currentPassword, newPassword } = req.body
        const user = await userModel.findById(userId)
        if (!user) return res.json({ success: false, message: 'User not found' })

        const cur = String(currentPassword || '')
        const next = String(newPassword || '')
        if (!cur || !next) return res.json({ success: false, message: 'Thiếu mật khẩu' })

        const ok = await bcrypt.compare(cur, user.password)
        if (!ok) return res.json({ success: false, message: 'Mật khẩu hiện tại không đúng' })
        if (next.length < 8) return res.json({ success: false, message: 'hãy nhập ít nhất 8 ký tự' })

        const salt = await bcrypt.genSalt(10)
        user.password = await bcrypt.hash(next, salt)
        await user.save()

        try {
            await notificationModel.create({
                userId: user._id,
                title: 'Đổi mật khẩu thành công',
                content: 'Mật khẩu tài khoản của bạn đã được cập nhật.',
                type: 'security',
                referenceId: String(user._id),
                isRead: false,
            })
        } catch (notifyErr) {
            console.error('[thông báo đổi mật khẩu]', notifyErr.message)
        }

        res.json({ success: true, message: 'Đổi mật khẩu thành công' })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

export { getProfile, updateProfile, uploadAvatar, changePassword }