import { useContext, useEffect } from 'react'
import { ShopContext } from '../context/ShopContext'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import axios from 'axios'

const Verify = () => {
    const { navigate, token, setCartItems, backendUrl, cartItems } = useContext(ShopContext)
    const [searchParams] = useSearchParams()


    const method = searchParams.get('method') 
    const vnp_ResponseCode = searchParams.get('vnp_ResponseCode')
    const vnp_OrderId = searchParams.get('vnp_TxnRef')
    const momoOrderId = searchParams.get('orderId')
    const momoResultCode = searchParams.get('resultCode')
    const momoRequestId = searchParams.get('requestId')
    const momoAmount = searchParams.get('amount')
    const momoOrderInfo = searchParams.get('orderInfo')
    const momoOrderType = searchParams.get('orderType')
    const momoTransId = searchParams.get('transId')
    const momoMessage = searchParams.get('message')
    const momoPayType = searchParams.get('payType')
    const momoResponseTime = searchParams.get('responseTime')
    const momoExtraData = searchParams.get('extraData')
    const momoSignature = searchParams.get('signature')

    useEffect(() => {
        const verifyPayment = async () => {
            try {
                if (!token) return null

                let response;

                if (method === 'vnpay') {
                    // Kiểm tra mã thành công của VNPAY là '00'
                    const isSuccess = vnp_ResponseCode === '00'
                    response = await axios.post(backendUrl + '/api/order/verifyVnpay', 
                        { success: isSuccess, orderId: vnp_OrderId }, 
                        { headers: { token } }
                    )
                } else if (method === 'momo') {
                    response = await axios.post(
                        backendUrl + '/api/order/verifyMomo',
                        {
                            orderId: momoOrderId,
                            requestId: momoRequestId,
                            amount: momoAmount,
                            orderInfo: momoOrderInfo,
                            orderType: momoOrderType,
                            transId: momoTransId,
                            resultCode: momoResultCode,
                            message: momoMessage,
                            payType: momoPayType,
                            responseTime: momoResponseTime,
                            extraData: momoExtraData,
                            signature: momoSignature
                        },
                        { headers: { token } }
                    )
                }
                
                if (response && response.data.success) {
                    const selected = JSON.parse(localStorage.getItem('selectedCartItems') || '[]')
                    if (selected && selected.length > 0) {
                        const nextCart = structuredClone(cartItems)
                        selected.forEach(item => {
                            if (nextCart[item._id] && nextCart[item._id][item.size] !== undefined) {
                                delete nextCart[item._id][item.size]
                            }
                            if (nextCart[item._id] && Object.keys(nextCart[item._id]).length === 0) {
                                delete nextCart[item._id]
                            }
                        })
                        setCartItems(nextCart)
                        localStorage.removeItem('selectedCartItems')
                    } else {
                        setCartItems({})
                    }
                    toast.success("Thanh toán thành công!")
                    navigate('/orders')
                } else {
                    toast.error("Thanh toán thất bại!")
                    navigate('/cart')
                }

            } catch (error) {
                console.log(error)
                toast.error(error.message)
            }
        }

        verifyPayment()
    }, [
        token,
        backendUrl,
        cartItems,
        method,
        navigate,
        setCartItems,
        vnp_OrderId,
        vnp_ResponseCode,
        momoOrderId,
        momoResultCode,
        momoSignature
    ])

    return (
        <div className='min-h-[60vh] flex items-center justify-center'>
            <div className="w-12 h-12 border-4 border-gray-300 border-t-black rounded-full animate-spin"></div>
        </div>
    )
}

export default Verify