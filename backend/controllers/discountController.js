import couponModel from '../models/couponModel.js'

import {

    buildCouponDiscountLabel,

    computeCouponStatus,

    COUPON_STATUS_LABELS,

    serializeCouponForClient,

    validateCouponForCart,

    canUserSeeCoupon,

} from '../utils/couponRules.js'

import {

    computeDiscountAmount,

    getDiscountType,

    getDiscountTypeLabel,

    getDiscountValue,

} from '../utils/couponDiscount.js'

import { notifyVipCustomersAboutCoupon } from '../services/couponAudienceNotify.js'



const GIFT_COUPON_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000

const duplicateCouponCodeMessage = (code) =>
    `Bạn đã có mã:${String(code || '').trim().toUpperCase()} hãy đổi mã khác`

const isDuplicateCouponCodeError = (error) =>
    error?.code === 11000 &&
    (error?.keyPattern?.code || /index:\s*code/i.test(String(error?.message || '')))



const parseTargets = (raw) => {

    if (Array.isArray(raw)) return raw.map((t) => String(t).trim()).filter(Boolean)

    if (typeof raw === 'string') {

        return raw.split(/[\n,;]+/).map((t) => t.trim()).filter(Boolean)

    }

    return []

}



const buildCouponPayload = (body) => {

    const payload = {}

    if (body.code !== undefined) payload.code = String(body.code).trim().toUpperCase()

    if (body.type !== undefined) payload.type = body.type === 'amount' ? 'amount' : 'percent'

    if (body.percent !== undefined) payload.percent = Number(body.percent) || 0

    if (body.amount !== undefined) payload.amount = Number(body.amount) || 0

    if (body.minAmount !== undefined) payload.minAmount = Number(body.minAmount) || 0

    if (body.maxDiscount !== undefined) payload.maxDiscount = Number(body.maxDiscount) || 0

    if (body.usageLimit !== undefined) payload.usageLimit = Number(body.usageLimit) || 0

    if (body.active !== undefined) payload.active = body.active === false ? false : true

    if (body.applyScope !== undefined) payload.applyScope = String(body.applyScope || 'all')

    if (body.applyTargets !== undefined) payload.applyTargets = parseTargets(body.applyTargets)

    if (body.audienceType !== undefined) payload.audienceType = String(body.audienceType || 'all')

    if (body.visibility !== undefined) payload.visibility = String(body.visibility || 'public')

    if (body.showOnHomepage !== undefined) {

        payload.showOnHomepage = body.showOnHomepage === true || body.showOnHomepage === 'true'

    }

    if (body.startsAt !== undefined) payload.startsAt = body.startsAt ? Number(body.startsAt) : null

    if (body.expiresAt !== undefined) payload.expiresAt = body.expiresAt ? Number(body.expiresAt) : null

    if (body.assignedToUserId !== undefined) {

        payload.assignedToUserId = body.assignedToUserId || null

    }

    return payload

}


const applyCoupon = async (req, res) => {

    try {

        const { code, amount, items } = req.body

        if (!code) return res.json({ success: false, message: 'Vui lòng nhập mã giảm giá' })



        const coupon = await couponModel.findOne({ code: code.trim().toUpperCase() })

        if (!coupon) return res.json({ success: false, message: 'Mã giảm giá không hợp lệ' })



        const check = await validateCouponForCart({

            coupon,

            userId: req.userId,

            items: Array.isArray(items) ? items : [],

            cartSubtotal: amount,

        })

        if (!check.ok) return res.json({ success: false, message: check.message })



        const discountType = getDiscountType(coupon)

        const typeLabel = getDiscountTypeLabel(coupon)

        const discountValue = getDiscountValue(coupon)

        const discountAmount = check.discountAmount

        const clientCoupon = serializeCouponForClient(coupon, {

            eligibleSubtotal: check.eligibleSubtotal,

            discountAmount,

        })



        res.json({

            success: true,

            couponCode: coupon.code,

            type: typeLabel,

            discountType,

            value: discountValue,

            discountValue,

            discountAmount,

            finalAmount: check.finalAmount,

            coupon: clientCoupon,

            message: `Áp dụng mã ${coupon.code} thành công! Giảm ${discountAmount.toLocaleString('vi-VN')}đ`,

        })

    } catch (error) {

        console.log(error)

        res.json({ success: false, message: error.message })

    }

}


const listAvailableCoupons = async (req, res) => {

    try {

        const userId = req.userId

        if (!userId) return res.json({ success: false, message: 'Vui lòng đăng nhập' })
        const { amount, items } = req.body
        const coupons = await couponModel.find({ active: { $ne: false } }).lean()
        const available = []
        for (const coupon of coupons) {
            if (!canUserSeeCoupon(coupon, userId)) continue
            const status = computeCouponStatus(coupon)
            if (status !== 'running') continue
            const check = await validateCouponForCart({
                coupon,
                userId,
                items: Array.isArray(items) ? items : [],
                cartSubtotal: amount,
            })
            if (!check.ok) continue
            available.push(
                serializeCouponForClient(coupon, {
                    eligibleSubtotal: check.eligibleSubtotal,
                    discountAmount: check.discountAmount,
                })
            )
        }

        available.sort((a, b) => (b.discountAmount || 0) - (a.discountAmount || 0))
        res.json({ success: true, coupons: available, count: available.length })

    } catch (error) {

        console.log(error)

        res.json({ success: false, message: error.message })

    }

}

// tạo mã giảm sản phẩm 
const createCoupon = async (req, res) => {

    try {

        const payload = buildCouponPayload(req.body)

        if (!payload.code) return res.json({ success: false, message: 'Thiếu mã giảm giá' })

        const existing = await couponModel.findOne({ code: payload.code }).lean()
        if (existing) {
            return res.json({ success: false, message: duplicateCouponCodeMessage(payload.code) })
        }

        const coupon = new couponModel({

            ...payload,

            type: payload.type || (req.body.type === 'amount' ? 'amount' : 'percent'),

            percent: (payload.percent ?? Number(req.body.percent)) || 0,

            amount: (payload.amount ?? Number(req.body.amount)) || 0,

            minAmount: (payload.minAmount ?? Number(req.body.minAmount)) || 0,

            maxDiscount: (payload.maxDiscount ?? Number(req.body.maxDiscount)) || 0,

            expiresAt: payload.expiresAt ?? (req.body.expiresAt ? Number(req.body.expiresAt) : null),

            startsAt: payload.startsAt ?? (req.body.startsAt ? Number(req.body.startsAt) : null),

            usageLimit: (payload.usageLimit ?? Number(req.body.usageLimit)) || 0,

            usedCount: 0,

            active: payload.active !== false,

            applyScope: payload.applyScope || 'all',

            applyTargets: payload.applyTargets || [],

            audienceType: payload.audienceType || 'all',

            visibility: payload.visibility || 'public',

            showOnHomepage: payload.showOnHomepage || false,

        })

        await coupon.save()

        let message = 'Mã giảm giá đã được tạo'
        let notifyStats = null

        if (coupon.audienceType === 'vip') {
            try {
                notifyStats = await notifyVipCustomersAboutCoupon(coupon)
                if (notifyStats.total === 0) {
                    message = 'Mã giảm giá đã được tạo. Hiện chưa có khách VIP nào trong hệ thống.'
                } else {
                    message = `Mã giảm giá đã được tạo. Đã gửi thông báo cho ${notifyStats.notified}/${notifyStats.total} khách VIP`
                    if (notifyStats.emailed > 0) {
                        message += ` (${notifyStats.emailed} email)`
                    }
                }
            } catch (notifyErr) {
                console.error('[vip coupon notify]', notifyErr)
                message = 'Mã giảm giá đã được tạo nhưng gửi thông báo VIP gặp lỗi.'
            }
        }

        res.json({ success: true, message, coupon, notifyStats })

    } catch (error) {

        console.log(error)

        if (isDuplicateCouponCodeError(error)) {
            const dupCode =
                error?.keyValue?.code ||
                buildCouponPayload(req.body).code ||
                String(req.body?.code || '').trim().toUpperCase()
            return res.json({ success: false, message: duplicateCouponCodeMessage(dupCode) })
        }

        res.json({ success: false, message: error.message })

    }

}

// cập nhập lại mã 
const listCoupons = async (req, res) => {
    try {
        await couponModel.updateMany(
            {
                $or: [
                    { isPersonalGift: true },

                    { assignedToUserId: { $ne: null }, singleUsePerUser: true },
                ],
                usageLimit: { $lte: 0 },
            },
            { $set: { usageLimit: 1, isPersonalGift: true } }

        )
        // tạo mã giảm giả riêng 
        const giftsMissingExpiry = await couponModel.find({
            assignedToUserId: { $ne: null },
            expiresAt: null,
        })
        const now = Date.now()
        for (const g of giftsMissingExpiry) {
            const base = g.createdAt ? new Date(g.createdAt).getTime() : now
            await couponModel.updateOne(
                { _id: g._id },
                { $set: { expiresAt: base + GIFT_COUPON_VALIDITY_MS, isPersonalGift: true } }
            )

        }
        const coupons = await couponModel.find({}).sort({ createdAt: -1 })
        const expiredIds = coupons
            .filter((c) => c?.expiresAt && now > Number(c.expiresAt) && c.active === true)
            .map((c) => c._id)
        if (expiredIds.length) {
            await couponModel.updateMany({ _id: { $in: expiredIds } }, { $set: { active: false } })

        }
        res.json({
            success: true,
            coupons: coupons.map((c) => ({
                ...c.toObject(),
                status: computeCouponStatus(c),
                statusLabel: COUPON_STATUS_LABELS[computeCouponStatus(c)],
                discountLabel: buildCouponDiscountLabel(c),
            })),

        })

    } catch (error) {

        console.log(error)

        res.json({ success: false, message: error.message })

    }

}
// admin bất tắt mã giảm giá 
const toggleCouponActive = async (req, res) => {

    try {
        const { id, active } = req.body
        if (!id) return res.json({ success: false, message: 'Missing id' })
        const updated = await couponModel.findByIdAndUpdate(id, { active: Boolean(active) }, { new: true })
        if (!updated) return res.json({ success: false, message: 'Coupon not found' })
        res.json({ success: true, coupon: updated, message: 'Updated' })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}
// sửa mã giảm giá 
const updateCoupon = async (req, res) => {
    try {
        const { id } = req.body
        if (!id) return res.json({ success: false, message: 'Missing id' })
        const existing = await couponModel.findById(id)
        if (!existing) return res.json({ success: false, message: 'Coupon not found' })
        const usedCount = Number(existing.usedCount) || 0
        let patch = {}
        if (usedCount > 0) {
           if (req.body.usageLimit !== undefined) {
                const limit = Number(req.body.usageLimit) || 0
                if (limit > 0 && limit < usedCount) {
                    return res.json({
                        success: false,
                        message: `Số lượng tối đa không được nhỏ hơn ${usedCount} (đã sử dụng)`,
                    })
                }
                patch.usageLimit = limit
            }
            if (req.body.expiresAt !== undefined) {
                patch.expiresAt = req.body.expiresAt ? Number(req.body.expiresAt) : null
            }
        } else {

            patch = buildCouponPayload(req.body)
            delete patch.code
        }
        if (!Object.keys(patch).length) {
            return res.json({ success: false, message: 'Không có thông tin để cập nhật' })
        }
        const updated = await couponModel.findByIdAndUpdate(id, patch, { new: true })
        if (!updated) return res.json({ success: false, message: 'Coupon not found' })
        res.json({ success: true, coupon: updated, message: 'Đã cập nhật mã giảm giá' })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

export { applyCoupon, createCoupon, listCoupons, toggleCouponActive, updateCoupon, listAvailableCoupons }

