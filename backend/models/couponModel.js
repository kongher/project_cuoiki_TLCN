import mongoose from 'mongoose'

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    type: { type: String, enum: ['percent', 'amount'], default: 'percent' },
    percent: { type: Number, required: true, default: 0 },
    amount: { type: Number, default: 0 }, // used when type = amount
    minAmount: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    expiresAt: { type: Number, default: null },
    usageLimit: { type: Number, default: 0 }, // 0 = unlimited
    usedCount: { type: Number, default: 0 },
    /** Mã tặng riêng — chỉ user này được áp dụng */
    assignedToUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
    /** User đã dùng mã (mỗi user tối đa 1 lần khi có assignedToUserId hoặc singleUsePerUser) */
    usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
    singleUsePerUser: { type: Boolean, default: false },
    /** Mã tạo từ luồng Admin → Tặng ưu đãi VIP */
    isPersonalGift: { type: Boolean, default: false },
    /** all | category | product | sku */
    applyScope: { type: String, default: 'all' },
    /** catalogSlug / productId / sku */
    applyTargets: { type: [String], default: [] },
    /** all | new | vip | repeat_3 | assigned | birthday */
    audienceType: { type: String, default: 'all' },
    /** public | private | auto */
    visibility: { type: String, default: 'public' },
    startsAt: { type: Number, default: null },
    showOnHomepage: { type: Boolean, default: false },
}, { timestamps: true })

const couponModel = mongoose.models.coupon || mongoose.model('coupon', couponSchema)
export default couponModel
