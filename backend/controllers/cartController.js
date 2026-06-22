import userModel from "../models/userModel.js"
import productModel from "../models/productModel.js"

const norm = (s) => String(s || '').trim().toLowerCase()

const readSizeStock = (variant, size) => {
    const map = variant?.stockBySize
    if (!map || typeof map !== 'object') return null
    const s = String(size)
    const key = Object.keys(map).find((k) => k === s || norm(k) === norm(s))
    if (key === undefined) return null
    const n = Number(map[key])
    if (!Number.isFinite(n)) return 0
    return Math.max(0, Math.floor(n))
}

const getStockForLine = (product, color, size) => {
    const variants = Array.isArray(product?.variants) ? product.variants : []
    if (!variants.length || !size) return null
    const c = norm(color || 'DEFAULT')
    let variant = variants.find((v) => norm(v?.colorName) === c)
    if (!variant && c === 'default' && variants.length === 1) variant = variants[0]
    if (!variant) variant = variants.find((v) => readSizeStock(v, size) !== null) || null
    if (!variant) return null
    return readSizeStock(variant, size)
}

const getStockLimitMessage = (requestedQty, maxStock) => {
    if (typeof maxStock !== 'number' || maxStock < 0) return null
    if (!Number.isFinite(requestedQty) || requestedQty <= maxStock) return null
    if (maxStock === 1) return 'sản phẩm này chỉ còn 1'
    return 'bạn đã tăng quá số lượng hiện có'
}

const readCartQty = (cartData, itemId, color, size) => {
    if (!cartData?.[itemId]) return 0
    const node = cartData[itemId]
    if (typeof node[size] === 'number') return Number(node[size]) || 0
    return Number(node?.[color]?.[size] || 0)
}

// add products to user cart
const addToCart = async (req,res) => {
    try {
        
        const { userId, itemId, size } = req.body
        const color = String(req.body.color || 'DEFAULT')

        const product = await productModel.findById(itemId)
        const maxStock = product ? getStockForLine(product, color, size) : null

        const userData = await userModel.findById(userId)
        let cartData = await userData.cartData;
        // Backward compatible:
        // Old format: cartData[itemId][size] = qty
        // New format: cartData[itemId][color][size] = qty
        if (!cartData[itemId]) cartData[itemId] = {}

        if (typeof cartData[itemId][size] === 'number') {
            const oldQty = cartData[itemId][size]
            cartData[itemId] = { DEFAULT: { [size]: oldQty } }
        }

        if (!cartData[itemId][color]) cartData[itemId][color] = {}
        const currentQty = readCartQty(cartData, itemId, color, size)

        if (currentQty > 0) {
            return res.json({ success: false, message: 'bạn đã có sản phẩm này trong giỏ hàng' })
        }

        if (typeof maxStock === 'number' && maxStock < 1) {
            return res.json({ success: false, message: 'sản phẩm không đủ' })
        }

        cartData[itemId][color][size] = 1

        await userModel.findByIdAndUpdate(userId, {cartData})

        res.json({ success: true, message: "Added To Cart" })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// update user cart
const updateCart = async (req,res) => {
    try {
        
        const { userId ,itemId, size, quantity } = req.body
        const color = String(req.body.color || 'DEFAULT')
        const qty = Number(quantity)

        if (!Number.isFinite(qty) || qty < 0) {
            return res.json({ success: false, message: 'Số lượng không hợp lệ' })
        }

        const product = await productModel.findById(itemId)
        const maxStock = product ? getStockForLine(product, color, size) : null

        const stockMsg = getStockLimitMessage(qty, maxStock)
        if (qty > 0 && stockMsg) {
            return res.json({ success: false, message: stockMsg })
        }

        const userData = await userModel.findById(userId)
        let cartData = await userData.cartData;

        if (!cartData[itemId]) cartData[itemId] = {}
        if (typeof cartData[itemId][size] === 'number') {
            const oldQty = cartData[itemId][size]
            cartData[itemId] = { DEFAULT: { [size]: oldQty } }
        }
        if (!cartData[itemId][color]) cartData[itemId][color] = {}
        cartData[itemId][color][size] = qty

        await userModel.findByIdAndUpdate(userId, {cartData})
        res.json({ success: true, message: "Cart Updated" })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}


// get user cart data
const getUserCart = async (req,res) => {

    try {
        
        const { userId } = req.body
        
        const userData = await userModel.findById(userId)
        let cartData = await userData.cartData;

        res.json({ success: true, cartData })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}

export { addToCart, updateCart, getUserCart }