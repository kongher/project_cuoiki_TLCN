import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import couponModel from "../models/couponModel.js";
import notificationModel from "../models/notificationModel.js";
import { recordCouponUsage } from "../utils/couponUsage.js";
import { validateCouponForCart } from "../utils/couponRules.js";
import { v2 as cloudinary } from "cloudinary";
import crypto from 'crypto';
import moment from 'moment';
import axios from 'axios'; // Bắt buộc phải có để chạy MoMo
import qs from 'qs'
import { adjustStockForOrderItems, checkStockForOrderItems } from '../utils/inventory.js'
import { normalizeReviewImages, uploadReviewFilesToCloudinary } from '../utils/reviewImages.js'
import {
    findOrderLineByProductAndVariant,
    getOrderLineProductId,
    resolveVariantId,
} from '../utils/orderLineItem.js'

const applyStockIfNeeded = async (order) => {
    if (order?.stockAdjusted) return { ok: true }
    const result = await adjustStockForOrderItems(order.items, -1, {
        orderId: String(order._id || ''),
    })
    if (!result.ok) return result
    order.stockAdjusted = true
    order.markModified('stockAdjusted')
    await order.save()
    return { ok: true }
}

const restoreStockIfNeeded = async (order) => {
    if (!order?.stockAdjusted) return { ok: true }
    const result = await adjustStockForOrderItems(order.items, 1, {
        orderId: String(order._id || ''),
    })
    if (!result.ok) return result
    order.stockAdjusted = false
    order.markModified('stockAdjusted')
    await order.save()
    return { ok: true }
}

const normalizeCouponCode = (raw) => {
    const code = String(raw || '').trim()
    return code ? code.toUpperCase() : ''
}

const getCouponCodeFromBody = (body) => {
    const couponCode = normalizeCouponCode(body?.couponCode)
    if (couponCode) return couponCode

    const coupon = body?.coupon
    if (typeof coupon === 'string') return normalizeCouponCode(coupon)
    if (coupon && typeof coupon === 'object' && coupon.code) return normalizeCouponCode(coupon.code)
    return ''
}

const validateCouponForOrder = async ({ code, userId, items = [], amount = 0 }) => {
    const coupon = await couponModel.findOne({ code })
    if (!coupon) return { ok: false, message: 'Mã giảm giá không hợp lệ' }
    return validateCouponForCart({ coupon, userId, items, cartSubtotal: amount })
}

const markCouponUsedIfNeeded = async (order) => {
    const code = normalizeCouponCode(order?.coupon?.code)
    if (!code) return
    if (order?.coupon?.applied === true) return

    await recordCouponUsage(couponModel, code, order.userId)
    order.coupon = { ...(order.coupon || {}), code, applied: true }
    order.markModified('coupon')
    await order.save()
}

const sortVnpObject = (obj) => {
    const sorted = {}
    const keys = Object.keys(obj || {})
        .filter((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== '')
        .map((k) => encodeURIComponent(k))
        .sort()

    keys.forEach((encodedKey) => {
        const key = decodeURIComponent(encodedKey)
        sorted[encodedKey] = encodeURIComponent(String(obj[key])).replace(/%20/g, '+')
    })
    return sorted
}

const buildVnpayUrl = ({ vnpUrl, secretKey, params }) => {
    const sorted = sortVnpObject(params || {})
    const signData = qs.stringify(sorted, { encode: false })
    const hmac = crypto.createHmac('sha512', secretKey)
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex')
    return `${vnpUrl}?${signData}&vnp_SecureHash=${signed}`
}

// --- 1. PHƯƠNG THỨC COD ---
const placeOrder = async (req, res) => {
    try {
        const userId = req.userId || req.body.userId
        const { items, amount, address, discount = 0 } = req.body;
        const couponCode = getCouponCodeFromBody(req.body)

        let coupon = null
        if (couponCode) {
            const check = await validateCouponForOrder({ code: couponCode, userId, items, amount })
            if (!check.ok) return res.json({ success: false, message: check.message })
            coupon = { code: couponCode, applied: true }
        }

        const stockCheck = await checkStockForOrderItems(items)
        if (!stockCheck.ok) {
            return res.json({ success: false, message: stockCheck.errors[0] || 'Không đủ tồn kho' })
        }

        const orderData = {
            userId, items, address, amount, discount, coupon,
            paymentMethod: "COD", payment: false, date: Date.now()
        };
        const newOrder = new orderModel(orderData);
        await newOrder.save();

        const stockApply = await applyStockIfNeeded(newOrder)
        if (!stockApply.ok) {
            await orderModel.findByIdAndDelete(newOrder._id)
            return res.json({ success: false, message: stockApply.errors?.[0] || 'Không đủ tồn kho' })
        }

        if (couponCode) {
            await recordCouponUsage(couponModel, couponCode, userId)
        }

        await userModel.findByIdAndUpdate(userId, { cartData: {} });
        res.json({ success: true, message: "Đã đặt hàng thành công" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// --- 2. PHƯƠNG THỨC VNPAY ---
const placeOrderVNPAY = async (req, res) => {
    try {
        const userId = req.userId || req.body.userId
        const { items, amount, address, discount = 0 } = req.body;
        const couponCode = getCouponCodeFromBody(req.body)

        let coupon = null
        if (couponCode) {
            const check = await validateCouponForOrder({ code: couponCode, userId, items, amount })
            if (!check.ok) return res.json({ success: false, message: check.message })
            coupon = { code: couponCode, applied: false }
        }

        const newOrder = new orderModel({
            userId, items, address, amount, discount, coupon,
            paymentMethod: "VNPAY", payment: false, date: Date.now()
        });
        await newOrder.save();

        const createDate = moment().format('YYYYMMDDHHmmss');
        const orderId = newOrder._id.toString();

        const tmnCode = process.env.VNP_TMN_CODE || "54E97JYI";
        const secretKey = process.env.VNP_HASH_SECRET || "CNMSX74Q1IZ3C5YY78BCZS6KHWT4SB08";
        const vnpUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
        const returnUrl = "http://localhost:5173/verify?method=vnpay";
        const vnp_Params = {
  'vnp_Version': '2.1.0',
  'vnp_Command': 'pay',
  'vnp_TmnCode': tmnCode,
  'vnp_Locale': 'vn',
  'vnp_CurrCode': 'VND',
  'vnp_TxnRef': orderId,
  'vnp_OrderInfo': 'Thanh toan don hang ' + orderId,
  'vnp_OrderType': 'other',
  'vnp_Amount': Math.round((Number(amount) || 0) * 100),
  'vnp_ReturnUrl': returnUrl,
  'vnp_IpAddr': '127.0.0.1',
  'vnp_CreateDate': createDate,
  'vnp_SecureHashType': 'HmacSHA512'
};

        const finalUrl = buildVnpayUrl({ vnpUrl, secretKey, params: vnp_Params })
        
        res.json({ success: true, payment_url: finalUrl });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// --- 3. PHƯƠNG THỨC MOMO ---
const placeOrderMomo = async (req, res) => {
    try {
        const userId = req.userId || req.body.userId
        const { items, amount, address, discount = 0 } = req.body;
        const couponCode = getCouponCodeFromBody(req.body)

        let coupon = null
        if (couponCode) {
            const check = await validateCouponForOrder({ code: couponCode, userId, items, amount })
            if (!check.ok) return res.json({ success: false, message: check.message })
            coupon = { code: couponCode, applied: false }
        }

        const parsedAmount = parseInt(amount); // Ép kiểu số tuyệt đối

        // Create order first so we can verify with DB id
        const newOrder = new orderModel({
            userId, items, address, amount: parsedAmount, discount, coupon,
            paymentMethod: "Momo", payment: false, date: Date.now()
        })
        await newOrder.save()

        const orderId = newOrder._id.toString()

        // THÔNG SỐ TEST MẶC ĐỊNH (KHÔNG THAY ĐỔI)
        const partnerCode = "MOMOBKUN20180810";
        const accessKey = "klm056883M913412";
        const secretKey = "at67qH6v0HVs7y892p9p66SWh1386B0Z";
        const requestId = orderId;
        const orderInfo = "Thanh toan don hang Forever";
        const redirectUrl = "http://localhost:5173/verify?method=momo";
        const ipnUrl = "https://momo.vn"; 
        const requestType = "captureWallet";
        const extraData = ""; 

        // BƯỚC 1: Tạo Signature
        const rawSignature = `accessKey=${accessKey}&amount=${parsedAmount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

        const signature = crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");

        // BƯỚC 2: Tạo Request Body
        const requestBody = {
            partnerCode,
            requestId,
            amount: parsedAmount,
            orderId,
            orderInfo,
            redirectUrl,
            ipnUrl,
            extraData,
            requestType,
            signature,
            lang: "vi",
        };

        // BƯỚC 3: Gọi API MoMo
        const response = await axios.post("https://test-payment.momo.vn/v2/gateway/api/create", requestBody);

        // BƯỚC 4: Kiểm tra kết quả
        if (response.data && response.data.payUrl) {
            res.json({ success: true, payment_url: response.data.payUrl, orderId });
        } else {
            // remove the pending order if MoMo rejected
            await orderModel.findByIdAndDelete(orderId)
            // IN LỖI CHI TIẾT RA TERMINAL ĐỂ XEM
            console.log("--- MOMO API REJECTED ---");
            console.log(response.data); 
            res.json({ success: false, message: response.data.localMessage || "Cấu hình tài khoản sai" });
        }
    } catch (error) {
        // IN LỖI HỆ THỐNG RA TERMINAL
        console.error("--- MOMO SYSTEM ERROR ---");
        if (error.response) {
            console.log("Data:", error.response.data);
            console.log("Status:", error.response.status);
        } else {
            console.log("Message:", error.message);
        }
        res.json({ success: false, message: "Lỗi kết nối đến hệ thống MoMo" });
    }
};
// --- 4. VERIFY CHUNG ---
const verifyVnpay = async (req, res) => {
    try {
        const { orderId, success, userId } = req.body;
        if (success === "true" || success === true) {
            const order = await orderModel.findById(orderId)
            if (!order) return res.json({ success: false, message: "Đơn hàng không tồn tại" });

            const stockCheck = await checkStockForOrderItems(order.items)
            if (!stockCheck.ok) {
                return res.json({ success: false, message: stockCheck.errors[0] || 'Không đủ tồn kho' })
            }

            const stockApply = await applyStockIfNeeded(order)
            if (!stockApply.ok) {
                return res.json({ success: false, message: stockApply.errors?.[0] || 'Không đủ tồn kho' })
            }

            order.payment = true
            await order.save()

            await markCouponUsedIfNeeded(order)
            await userModel.findByIdAndUpdate(userId, { cartData: {} });
            res.json({ success: true, message: "Thanh toán thành công" });
        } else {
            await orderModel.findByIdAndDelete(orderId);
            res.json({ success: false, message: "Thanh toán thất bại" });
        }
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const verifyMomo = async (req, res) => {
    try {
        const { orderId, resultCode, signature } = req.body || {}
        if (!orderId) return res.json({ success: false, message: 'Thiếu orderId' })

        const partnerCode = "MOMOBKUN20180810";
        const accessKey = "klm056883M913412";
        const secretKey = "at67qH6v0HVs7y892p9p66SWh1386B0Z";

        // Validate signature from redirect
        const payload = { ...(req.body || {}) }
        delete payload.signature

        const rawSignature = [
            `accessKey=${accessKey}`,
            `amount=${payload.amount}`,
            `extraData=${payload.extraData || ''}`,
            `message=${payload.message || ''}`,
            `orderId=${payload.orderId}`,
            `orderInfo=${payload.orderInfo || ''}`,
            `orderType=${payload.orderType || ''}`,
            `partnerCode=${partnerCode}`,
            `payType=${payload.payType || ''}`,
            `requestId=${payload.requestId || ''}`,
            `responseTime=${payload.responseTime || ''}`,
            `resultCode=${payload.resultCode}`,
            `transId=${payload.transId || ''}`
        ].join('&')

        const expected = crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex")
        if (String(expected) !== String(signature)) {
            return res.json({ success: false, message: 'Sai chữ ký MoMo' })
        }

        const isSuccess = String(resultCode) === '0'
        if (!isSuccess) {
            await orderModel.findByIdAndDelete(orderId)
            return res.json({ success: false, message: 'Thanh toán MoMo thất bại' })
        }

        const order = await orderModel.findById(orderId)
        if (!order) return res.json({ success: false, message: 'Đơn hàng không tồn tại' })

        const stockCheck = await checkStockForOrderItems(order.items)
        if (!stockCheck.ok) {
            return res.json({ success: false, message: stockCheck.errors[0] || 'Không đủ tồn kho' })
        }

        const stockApply = await applyStockIfNeeded(order)
        if (!stockApply.ok) {
            return res.json({ success: false, message: stockApply.errors?.[0] || 'Không đủ tồn kho' })
        }

        order.payment = true
        await order.save()

        await markCouponUsedIfNeeded(order)
        await userModel.findByIdAndUpdate(order.userId, { cartData: {} })

        res.json({ success: true, message: 'Thanh toán MoMo thành công' })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

const getItemUnitPrice = (item, product) => {
    if (Number(item?.salePrice) > 0) return Number(item.salePrice)
    if (Number(item?.price) > 0) return Number(item.price)
    if (product?.discountPercent > 0 && Number(product?.salePrice) > 0) return Number(product.salePrice)
    if (Number(product?.price) > 0) return Number(product.price)
    return 0
}

/** GET /api/order/:id hoặc /api/orders/:id — chi tiết đơn (admin) */
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params
        const order = await orderModel.findById(id).lean()
        if (!order) {
            return res.json({ success: false, message: 'Không tìm thấy đơn hàng' })
        }

        const productIds = [
            ...new Set(
                (order.items || [])
                    .map((item) => String(item._id || item.productId || ''))
                    .filter(Boolean)
            ),
        ]

        const products = productIds.length
            ? await productModel.find({ _id: { $in: productIds } }).lean()
            : []
        const productMap = new Map(products.map((p) => [String(p._id), p]))

        const items = (order.items || []).map((item) => {
            const productId = String(item._id || item.productId || '')
            const product = productMap.get(productId) || null
            const unitPrice = getItemUnitPrice(item, product)
            const quantity = Number(item.quantity) || 1
            return {
                productId,
                name: item.name || product?.name || 'Sản phẩm',
                image: item.image?.[0] || product?.image?.[0] || '',
                size: item.size || '',
                color: item.color && item.color !== 'DEFAULT' ? item.color : '',
                quantity,
                unitPrice,
                lineTotal: unitPrice * quantity,
                product: product
                    ? { _id: product._id, name: product.name, image: product.image }
                    : null,
            }
        })

        const subtotal = items.reduce((sum, row) => sum + row.lineTotal, 0)
        const discount = Number(order.discount) || 0
        const couponCode = order.coupon?.code ? String(order.coupon.code).trim() : ''
        const total = Number(order.amount) || 0
        const shippingFee = Math.max(0, total + discount - subtotal)

        res.json({
            success: true,
            order: {
                ...order,
                items,
                financials: {
                    subtotal,
                    couponCode,
                    discount,
                    shippingFee,
                    total,
                },
            },
        })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// đon hàng của admin 
const allOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({});
        res.json({ success: true, orders });
    } catch (error) { res.json({ success: false, message: error.message }); }
};

const mapOrderItemsWithReviewFlag = (order) => {
    const plain = typeof order.toObject === 'function' ? order.toObject() : { ...order }
    plain.items = (plain.items || []).map((item) => {
        const variant_id = resolveVariantId(item)
        return {
            ...item,
            variant_id,
            is_reviewed: Boolean(item?.review),
        }
    })
    return plain
}
// đon hàng của user
const userOrders = async (req, res) => {
    try {
        const userId = req.userId || req.body.userId
        const orders = await orderModel.find({ userId })
        const ordersWithFlags = orders.map(mapOrderItemsWithReviewFlag)
        res.json({ success: true, orders: ordersWithFlags })
    } catch (error) { res.json({ success: false, message: error.message }); }
};

// admin cập nhập trạng thái đơn hàng 
const updateStatus = async (req, res) => {
    try {
        const order = await orderModel.findById(req.body.orderId)
        if (!order) return res.json({ success: false, message: 'Không tìm thấy đơn hàng' })

        const prev = String(order.status || '')
        const next = String(req.body.status || '')
        if (next === 'Cancelled' && prev !== 'Cancelled') {
            const restored = await restoreStockIfNeeded(order)
            if (!restored.ok) {
                return res.json({ success: false, message: restored.errors?.[0] || 'Không hoàn kho được' })
            }
        }

        order.status = next
        await order.save()
        res.json({ success: true, message: 'Updated' });
    } catch (error) { res.json({ success: false, message: error.message }); }
};

// Khách xác nhận đã nhận hàng (chỉ khi đơn đang giao)
const confirmReceived = async (req, res) => {
    try {
        const userId = String(req.userId || req.body.userId || '')
        const { orderId } = req.body
        if (!orderId) return res.json({ success: false, message: 'Thiếu mã đơn hàng' })

        const order = await orderModel.findById(orderId)
        if (!order) return res.json({ success: false, message: 'Không tìm thấy đơn hàng' })
        if (String(order.userId) !== userId) return res.json({ success: false, message: 'Không thể thao tác đơn hàng này' })

        const st = String(order.status || '')
        if (!['Shipped', 'Out for delivery'].includes(st)) {
            return res.json({ success: false, message: 'Đơn hàng chưa ở trạng thái đang giao' })
        }

        order.status = 'Delivered'
        await order.save()

        res.json({ success: true, message: 'Đã xác nhận nhận hàng' })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

/** Khách hủy đơn: chỉ khi Chờ xác nhận (Order Placed) hoặc Chờ xử lý (Processing), chưa đóng gói */
const cancelUserOrder = async (req, res) => {
    try {
        const userId = String(req.userId || req.body.userId || '')
        const { orderId, surveyReason, cancelReason } = req.body
        if (!orderId) return res.json({ success: false, message: 'Thiếu mã đơn hàng' })

        const order = await orderModel.findById(orderId)
        if (!order) return res.json({ success: false, message: 'Không tìm thấy đơn hàng' })
        if (String(order.userId) !== userId) {
            return res.json({ success: false, message: 'Không thể thao tác đơn hàng này' })
        }

        const cancellable = ['Order Placed', 'Processing']
        if (!cancellable.includes(String(order.status))) {
            return res.json({
                success: false,
                message: 'Đơn đang được chuẩn bị hoặc giao hàng, không thể hủy trên web. Vui lòng liên hệ shop nếu cần hỗ trợ.'
            })
        }

        const restored = await restoreStockIfNeeded(order)
        if (!restored.ok) {
            return res.json({ success: false, message: restored.errors?.[0] || 'Không hoàn kho được' })
        }

        order.status = 'Cancelled'
        const reason = String(cancelReason || surveyReason || '').trim()
        if (!reason) return res.json({ success: false, message: 'Vui lòng chọn/nhập lý do hủy' })
        order.cancelReason = reason.slice(0, 500)
        // keep old field populated for old clients/admin screens
        order.cancelSurvey = reason.slice(0, 500)
        order.cancelledAt = Date.now()
        await order.save()

        res.json({ success: true, message: 'Đã hủy đơn hàng' })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
};

    // danh sách đánh giá 
const reviewList = async (req, res) => {
    try {
        const orders = await orderModel.find({});
        const reviews = []

        orders.forEach((order) => {
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach((item) => {
                    if (item && item.review) {
                        const productId = getOrderLineProductId(item)
                        const variant_id = resolveVariantId(item)
                        reviews.push({
                            orderId: order._id,
                            productId,
                            variant_id,
                            size: variant_id,
                            productName: item.name,
                            productImage: item.image?.[0] || '',
                            customerName: order.address?.fullName || 'Khách hàng',
                            rating: item.review.rating,
                            comment: item.review.comment,
                            tags: item.review.tags || [],
                            images: normalizeReviewImages(item.review.images),
                            createdAt: item.review.createdAt || order.date,
                            replied: item.review.adminReply ? true : false,
                            adminReply: item.review.adminReply || ''
                        })
                    }
                })
            }
        })

        reviews.sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
        console.log(`Found ${reviews.length} reviews from ${orders.length} orders`)
        res.json({ success: true, reviews })
    } catch (error) {
        console.log('reviewList error:', error)
        res.json({ success: false, message: error.message })
    }
};

// phản hội đánh giá 
const replyReview = async (req, res) => {
    try {
        const { orderId, productId, reply } = req.body
        const variantFromBody = req.body?.variant_id ?? req.body?.size
        console.log('replyReview called:', { orderId, productId, variant_id: variantFromBody, reply: reply.substring(0, 50) + '...' })

        const order = await orderModel.findById(orderId)
        if (!order) {
            console.log('Order not found:', orderId)
            return res.json({ success: false, message: 'Đơn hàng không tồn tại' })
        }

        const item = findOrderLineByProductAndVariant(order, productId, variantFromBody)
        if (!item) {
            console.log('Item not found in order:', productId, variantFromBody)
            return res.json({ success: false, message: 'Sản phẩm trong đơn không tồn tại' })
        }
        if (!item.review) {
            console.log('Review not found on item')
            return res.json({ success: false, message: 'Review không tồn tại' })
        }

        const repliedAt = Date.now()
        const productName = String(item.name || 'sản phẩm').trim()
        const resolvedProductId = getOrderLineProductId(item) || String(productId)
        const resolvedVariantId = resolveVariantId(item)
        const resolvedOrderId = String(order._id)
        item.review.adminReply = reply
        item.review.adminRepliedAt = repliedAt
        order.markModified('items')
        await order.save()

        try {
            await notificationModel.create({
                userId: order.userId,
                title: 'Đánh giá đã có phản hồi',
                content: `Admin đã phản hồi đánh giá của bạn cho sản phẩm ${productName}.`,
                type: 'review_reply',
                referenceId: resolvedOrderId,
                meta: {
                    orderId: resolvedOrderId,
                    order_id: resolvedOrderId,
                    productId: resolvedProductId,
                    product_id: resolvedProductId,
                    variant_id: resolvedVariantId,
                    variantId: resolvedVariantId,
                    productName,
                    adminRepliedAt: repliedAt,
                },
                isRead: false,
            })
        } catch (notifyErr) {
            console.log('review reply notification error:', notifyErr)
        }

        console.log('Reply saved successfully')
        res.json({ success: true, message: 'Đã lưu phản hồi' })
    } catch (error) {
        console.log('replyReview error:', error)
        res.json({ success: false, message: error.message })
    }
};

// thêm đánh giá 
const addReview = async (req, res) => {
    try {
        const { orderId, productId, rating, comment, tags = [] } = req.body;
        const variantFromBody = req.body?.variant_id ?? req.body?.size;
        const userId = req.body.userId || req.userId;

        const order = await orderModel.findById(orderId);
        if (!order) return res.json({ success: false, message: 'Đơn hàng không tồn tại' });
        if (!productId) return res.json({ success: false, message: 'Thiếu productId' });
        if (!variantFromBody) {
            return res.json({ success: false, message: 'Thiếu phân loại (variant_id / size)' });
        }

        const userIdString = String(userId || '')
        const orderUserId = String(order.userId || '')
        if (orderUserId !== userIdString) {
            return res.json({ success: false, message: 'Không thể đánh giá đơn hàng của người khác' });
        }

        // Only allow review after delivery.
        if (String(order.status) !== 'Delivered') {
            return res.json({
                success: false,
                message: 'Đơn hàng của bạn đang được giao, vui lòng đánh giá sau khi nhận hàng nhé!'
            });
        }

        const productIdString = String(productId)
        const variantId = resolveVariantId(null, variantFromBody)
        const item = findOrderLineByProductAndVariant(order, productIdString, variantId)
        if (!item) {
            return res.json({
                success: false,
                message: 'Không tìm thấy sản phẩm với phân loại này trong đơn hàng',
            });
        }
        if (item.review) {
            return res.json({
                success: false,
                message: `Phân loại size ${variantId} đã được đánh giá`,
            });
        }

        let reviewImages = normalizeReviewImages(req.body?.images)
        const uploadedUrls = await uploadReviewFilesToCloudinary(req.files)
        reviewImages = [...reviewImages, ...uploadedUrls]
          .filter((url, idx, arr) => arr.indexOf(url) === idx)
          .slice(0, 5)

        item.review = {
            userId,
            rating: Number(rating),
            comment,
            tags: Array.isArray(tags) ? tags : [tags],
            images: reviewImages,
            variant_id: variantId,
            size: variantId,
            createdAt: Date.now()
        };

        order.markModified('items');
        await order.save();

        const product = await productModel.findById(productId);
        if (product) {
            const reviewDoc = {
                userId,
                orderId,
                productId: productIdString,
                variant_id: variantId,
                size: variantId,
                rating: Number(rating),
                comment,
                tags: Array.isArray(tags) ? tags : [tags],
                images: reviewImages,
                createdAt: Date.now()
            }

            // newest first
            product.reviews = [reviewDoc, ...(Array.isArray(product.reviews) ? product.reviews : [])]

            const total = product.reviews.length
            const sum = product.reviews.reduce((acc, r) => acc + (Number(r?.rating) || 0), 0)
            product.numReviews = total
            product.rating = total ? Number((sum / total).toFixed(1)) : 0
            await product.save();

            // Reward coupon logic below needs reviewDoc
            req.createdReview = reviewDoc
        }

        // Reward: issue a 5% coupon for next order
        let couponCode = ''
        try {
            const raw = String(orderId || '').slice(-6).toUpperCase()
            couponCode = `REVIEW5-${raw || Date.now().toString().slice(-6)}`
            const expiresAt = Date.now() + 14 * 24 * 60 * 60 * 1000
            await couponModel.create({
                code: couponCode,
                percent: 5,
                minAmount: 0,
                maxDiscount: 50000,
                active: true,
                expiresAt
            })
        } catch (e) {
            // ignore duplicate code or coupon creation failures
            couponCode = ''
        }

        res.json({
            success: true,
            message: couponCode ? `Đã gửi đánh giá. Tặng bạn mã giảm 5%: ${couponCode}` : 'Đã gửi đánh giá',
            couponCode: couponCode || null,
            product_id: productIdString,
            productId: productIdString,
            variant_id: variantId,
            images: reviewImages,
            review: req.createdReview || {
                userId,
                orderId,
                product_id: productIdString,
                productId: productIdString,
                variant_id: variantId,
                size: variantId,
                rating: Number(rating),
                comment,
                tags: Array.isArray(tags) ? tags : [tags],
                images: reviewImages,
                createdAt: Date.now()
            }
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const userReplies = async (req, res) => {
    try {
        const orders = await orderModel.find({ userId: req.body.userId });
        const replies = []

        orders.forEach((order) => {
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach((item) => {
                    if (item && item.review && item.review.adminReply) {
                        replies.push({
                            orderId: order._id,
                            productId: getOrderLineProductId(item),
                            variant_id: resolveVariantId(item),
                            size: resolveVariantId(item),
                            productName: item.name,
                            productImage: item.image?.[0] || '',
                            customerRating: item.review.rating,
                            customerComment: item.review.comment,
                            adminReply: item.review.adminReply,
                            createdAt: item.review.createdAt || order.date,
                            repliedAt: item.review.adminRepliedAt || item.review.createdAt || order.date,
                        })
                    }
                })
            }
        })

        replies.sort((a, b) => Number(b.repliedAt) - Number(a.createdAt))
        res.json({ success: true, replies })
    } catch (error) {
        console.log('userReplies error:', error)
        res.json({ success: false, message: error.message })
    }
};

export { 
    placeOrder, allOrders, getOrderById, userOrders, updateStatus, cancelUserOrder, confirmReceived,
    placeOrderVNPAY, placeOrderMomo, verifyVnpay, verifyMomo, addReview,
    reviewList, replyReview, userReplies
};