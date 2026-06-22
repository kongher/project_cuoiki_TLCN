import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    items: { type: Array, required: true },
    amount: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    coupon: { type: Object, default: null },
    address: { type: Object, required: true },
    status: { type: String, required: true, default:'Order Placed' },
    paymentMethod: { type: String, required: true },
    payment: { type: Boolean, required: true , default: false },
    date: {type: Number, required:true},
    // Lý do hủy đơn (khách)
    cancelReason: { type: String, default: '' },
    // Backward compatible (các đơn cũ từng lưu ở cancelSurvey)
    cancelSurvey: { type: String, default: '' },
    cancelledAt: { type: Number, default: null },
    /** Đã trừ tồn kho cho đơn này */
    stockAdjusted: { type: Boolean, default: false }
})

const orderModel = mongoose.models.order || mongoose.model('order',orderSchema)
export default orderModel;