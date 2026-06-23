import { createContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import axios from 'axios'
import { getProductSizeStock, getStockLimitMessage } from '../utils/stock'
import { computeCouponDiscount } from '../utils/couponDiscount'
import AddToCartSuccessModal from '../components/AddToCartSuccessModal'
import { getBackendUrl } from '../utils/backendUrl'

export const ShopContext = createContext();

const ShopContextProvider = (props) => {

    const currency = 'đ';
    /** Phí ship mặc định  */
    const SHIPPING_FEE_DEFAULT = 30000
    const FREE_SHIP_THRESHOLD = 300000

    const getShippingFee = (subtotalBeforeShipping) => {
        const s = Number(subtotalBeforeShipping) || 0
        return s >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FEE_DEFAULT
    }

    const backendUrl = getBackendUrl()
    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [cartItems, setCartItems] = useState({});
    const [products, setProducts] = useState([]);
    const [coupon, setCoupon] = useState(null)
    const [couponMessage, setCouponMessage] = useState('')
    const [couponLoading, setCouponLoading] = useState(false)
    const [token, setToken] = useState('')
    const [replyCount, setReplyCount] = useState(0)
    const [cartSuccessModal, setCartSuccessModal] = useState({ open: false, productName: '' })
    const navigate = useNavigate();

    const closeCartSuccessModal = () => setCartSuccessModal({ open: false, productName: '' })
        //thêm vào giỏ hàng 
    const addToCart = async (itemId, size, color = 'DEFAULT', maxStock = null, productName = null) => {

        if (!size) { //Kiểm tra size đã được chọn hay chưa
            toast.error('Select Product Size');
            return;
        }

        let cartData = structuredClone(cartItems);

        if (!cartData[itemId]) cartData[itemId] = {} // Khởi tạo mục nếu nó chưa tồn tại.

    
        if (typeof cartData[itemId][size] === 'number') {
            const oldQty = cartData[itemId][size]
            cartData[itemId] = { DEFAULT: { [size]: oldQty } } 
        }

        if (!cartData[itemId][color]) cartData[itemId][color] = {}
        const currentQty = Number(cartData[itemId][color][size] || 0)

        if (currentQty > 0) {
            toast.info('bạn đã có sản phẩm này trong giỏ hàng')
            return
        }
        //Kiểm tra stock
        let stockLimit = maxStock
        if (stockLimit === null) {
            const product = products.find((p) => p._id === itemId)
            stockLimit = getProductSizeStock(product, color, size)
            //Lấy tồn kho từ variant
        }
        if (typeof stockLimit === 'number' && stockLimit < 1) {
            toast.error('sản phẩm không đủ')
            return
        }
            //Cập nhật giỏ hàng
        cartData[itemId][color][size] = 1
        setCartItems(cartData);

        const resolvedName =
            productName ||
            products.find((p) => p._id === itemId)?.name ||
            'sản phẩm'
        setCartSuccessModal({ open: true, productName: resolvedName })

        if (token) { // Nếu người dùng đã đăng nhập, gửi yêu cầu cập nhật giỏ hàng đến backend
            try {
                const response = await axios.post(backendUrl + '/api/cart/add', { itemId, size, color }, { headers: { token } })
                if (!response.data?.success) {
                    const msg = response.data?.message || 'Không thể thêm vào giỏ hàng'
                    closeCartSuccessModal()
                    if (msg.includes('giỏ hàng')) toast.info(msg)
                    else toast.error(msg)
                    setCartItems(cartItems)
                }
            } catch (error) {
                console.log(error)
                closeCartSuccessModal()
                toast.error(error.message)
                setCartItems(cartItems)
            }
        }

    }

    const getCartCount = () => {
        let totalCount = 0;
        for (const items in cartItems) {
            for (const color in cartItems[items]) {
                const maybeQty = cartItems[items][color]
                if (typeof maybeQty === 'number') {
                    // legacy: cartItems[items][size] = qty
                    if (maybeQty > 0) totalCount += maybeQty
                    continue
                }
                for (const size in cartItems[items][color]) {
                    try {
                        if (cartItems[items][color][size] > 0) {
                            totalCount += cartItems[items][color][size];
                        }
                    } catch (error) {}
                }
            }
        }
        return totalCount;
    }
    // cập nhập giỏ hàng khi thay đổi số lượng
    const updateQuantity = async (itemId, size, quantity, color = 'DEFAULT', maxStock = null) => {

        let cartData = structuredClone(cartItems);

        if (!cartData[itemId]) cartData[itemId] = {}

        if (typeof cartData[itemId][size] === 'number') {
            const oldQty = cartData[itemId][size]
            cartData[itemId] = { DEFAULT: { [size]: oldQty } }
        }

        if (!cartData[itemId][color]) cartData[itemId][color] = {}

        if (quantity > 0) {
            let stockLimit = maxStock
            if (stockLimit === null) {
                const product = products.find((p) => p._id === itemId)
                stockLimit = getProductSizeStock(product, color, size)
            }
            const stockMsg = getStockLimitMessage(quantity, stockLimit)
            if (stockMsg) {
                toast.error(stockMsg)
                return
            }
        }

        const prevCart = cartItems
        cartData[itemId][color][size] = quantity;

        setCartItems(cartData)

        if (token) {
            try {
                const response = await axios.post(backendUrl + '/api/cart/update', { itemId, size, quantity, color }, { headers: { token } })
                if (!response.data?.success) {
                    toast.error(response.data?.message || getStockLimitMessage(quantity, maxStock) || 'Không thể cập nhật số lượng')
                    setCartItems(prevCart)
                }
            } catch (error) {
                console.log(error)
                toast.error(error.message)
                setCartItems(prevCart)
            }
        }

    }

    const getProductSalePrice = (product) => {
        if (!product) return 0;
        if (product.discountPercent > 0) {
            return product.salePrice && product.salePrice > 0
                ? product.salePrice
                : Math.round(product.price * (100 - product.discountPercent) / 100);
        }
        return product.price;
    }

    const getCartAmount = () => {
        let totalAmount = 0;
        for (const items in cartItems) {
            let itemInfo = products.find((product) => product._id === items);
            for (const color in cartItems[items]) {
                const maybeQty = cartItems[items][color]
                if (typeof maybeQty === 'number') {
                    if (maybeQty > 0 && itemInfo) totalAmount += getProductSalePrice(itemInfo) * maybeQty
                    continue
                }
                for (const size in cartItems[items][color]) {
                    try {
                        const qty = cartItems[items][color][size]
                        if (qty > 0 && itemInfo) {
                            totalAmount += getProductSalePrice(itemInfo) * qty;
                        }
                    } catch (error) {}
                }
            }
        }
        return totalAmount;
    }

    const getDiscountAmount = (amount) => computeCouponDiscount(coupon, amount)

    const applyCouponCode = async (code, amount, items = []) => {
        if (!token) {
            toast.error('Vui lòng đăng nhập để áp dụng mã giảm giá');
            return { success: false }
        }

        setCouponLoading(true);
        try {
            const response = await axios.post(
                backendUrl + '/api/discount/apply',
                { code, amount, items: Array.isArray(items) ? items : [] },
                { headers: { token } }
            );

            if (response.data.success) {
                const enriched = {
                    ...response.data.coupon,
                    code: response.data.couponCode || response.data.coupon?.code,
                    type: response.data.type || response.data.coupon?.typeLabel,
                    typeLabel: response.data.type || response.data.coupon?.typeLabel,
                    discountType: response.data.discountType || response.data.coupon?.discountType,
                    value: response.data.value ?? response.data.discountValue,
                    discountValue: response.data.value ?? response.data.discountValue ?? response.data.coupon?.discountValue,
                    discountAmount: Number(response.data.discountAmount) || 0,
                }
                setCoupon(enriched);
                setCouponMessage(response.data.message);
                toast.success(response.data.message);
                try {
                    localStorage.setItem('couponCode', String(enriched.code || '').trim())
                    localStorage.setItem('appliedDiscount', String(enriched.discountAmount))
                } catch (e) {}
                return {
                    success: true,
                    coupon: enriched,
                    discountAmount: enriched.discountAmount,
                    discountType: enriched.discountType,
                    discountValue: enriched.discountValue,
                }
            } else {
                setCoupon(null);
                setCouponMessage('');
                toast.error(response.data.message);
            }
        } catch (error) {
            console.log(error);
            setCoupon(null);
            setCouponMessage('');
            const msg = error.response?.data?.message || error.message
            toast.error(msg);
        } finally {
            setCouponLoading(false);
        }
        return { success: false }
    }

    const removeCoupon = () => {
        setCoupon(null);
        setCouponMessage('');
        try {
            localStorage.removeItem('couponCode')
            localStorage.removeItem('appliedDiscount')
        } catch (e) {}
    }

    // Lấy dữ liệu sản phẩm từ backend

    const getProductsData = async () => {
        try {
            const response = await axios.get(backendUrl + '/api/product/list')
            if (response.data.success) {
                setProducts(response.data.products.reverse())
            } else {
                toast.error(response.data.message)
            }

        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    // Lấy dữ liệu giỏ hàng của người dùng từ backend sau khi đăng nhập thành công 
    const getUserCart = async ( token ) => {
        try {
            
            const response = await axios.post(backendUrl + '/api/cart/get',{},{headers:{token}})
            if (response.data.success) {
                setCartItems(response.data.cartData)
            }
        } catch (error) {
            console.log(error)
            toast.error(error.message)
        }
    }

    // Lấy số lượng phản hồi chưa đọc của người dùng từ backend
    const getUserReplies = async (token) => {
        try {
            const response = await axios.post(backendUrl + '/api/order/user-replies', {}, { headers: { token } })
            if (response.data.success) {
                setReplyCount(response.data.replies.length)
            }
        } catch (error) {
            console.log(error)
        }
    }

    useEffect(() => {
        getProductsData()
    }, [])
    // tải dữ liệu giỏ hàng khi token thay đổi
    useEffect(() => {
        if (!token && localStorage.getItem('token')) {
            setToken(localStorage.getItem('token'))
            getUserCart(localStorage.getItem('token'))
        }
        if (token) {
            getUserCart(token)
        }
    }, [token])

    useEffect(() => {
        if (!token) return

        const fetchReplies = async () => {
            await getUserReplies(token)
        }

        fetchReplies()
        const interval = setInterval(fetchReplies, 30000) // Check every 30 seconds
        return () => clearInterval(interval)
    }, [token])
    const value = {
        products, currency,
        SHIPPING_FEE_DEFAULT, FREE_SHIP_THRESHOLD, getShippingFee,
        search, setSearch, showSearch, setShowSearch,
        cartItems, addToCart,setCartItems,
        getCartCount, updateQuantity,
        getCartAmount, getProductSalePrice, getDiscountAmount,
        applyCouponCode, removeCoupon,
        coupon, couponMessage, couponLoading,
        navigate, backendUrl,
        setToken, token, replyCount,
        refreshProducts: getProductsData
    }

    return (
        <ShopContext.Provider value={value}>
            {props.children}
            <AddToCartSuccessModal
                open={cartSuccessModal.open}
                productName={cartSuccessModal.productName}
                onClose={closeCartSuccessModal}
            />
        </ShopContext.Provider>
    )

}

export default ShopContextProvider;