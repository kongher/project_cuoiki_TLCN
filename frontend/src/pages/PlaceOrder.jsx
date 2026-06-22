import { useContext, useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Title from '../components/Title'
import DiscountBox from '../components/DiscountBox'
import FreeShipBanner from '../components/FreeShipBanner'
import { ShopContext } from '../context/ShopContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { computeCouponDiscount } from '../utils/couponDiscount'

const PlaceOrder = () => {
    const [method, setMethod] = useState('cod')
    const location = useLocation()
    const [selectedCartItems, setSelectedCartItems] = useState([])
    const [discount, setDiscount] = useState(0); // Khởi tạo state discount
    const [payLoading, setPayLoading] = useState(false)

    const {
        navigate,
        backendUrl,
        token,
        cartItems,
        setCartItems,
        getShippingFee,
        products,
        currency,
        coupon,
        applyCouponCode,
        removeCoupon
    } = useContext(ShopContext)

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        address: '',
        province: '',
        district: '',
        ward: ''
    })

    const [provinces, setProvinces] = useState([])
    const [districts, setDistricts] = useState([])
    const [wards, setWards] = useState([])

    useEffect(() => {
        const selected = location.state?.selectedCartItems || JSON.parse(localStorage.getItem('selectedCartItems') || '[]')
        if (selected && selected.length > 0) {
            setSelectedCartItems(selected)
        }
        if (location.state?.buyNow) {
            setDiscount(0)
            removeCoupon()
            try {
                localStorage.removeItem('appliedDiscount')
                localStorage.removeItem('couponCode')
                localStorage.removeItem('appliedCoupon')
            } catch (e) {}
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.state])

    // Tính toán số tiền tạm tính của các sản phẩm đã chọn
    const selectedAmount = selectedCartItems.reduce((sum, selected) => {
        const itemInfo = products.find(product => product._id === selected._id)
        if (!itemInfo) return sum;
        const productPrice = itemInfo.discountPercent > 0
            ? (itemInfo.salePrice && itemInfo.salePrice > 0
                ? itemInfo.salePrice
                : Math.round(itemInfo.price * (100 - itemInfo.discountPercent) / 100))
            : itemInfo.price;
        return sum + productPrice * selected.quantity
    }, 0)

    const shippingFee = getShippingFee(selectedAmount)

    // Tổng tiền cuối cùng sau khi trừ discount
    const finalAmount = selectedAmount + shippingFee - discount

    const onChangeHandler = (event) => {
        const name = event.target.name
        const value = event.target.value
        setFormData(data => ({ ...data, [name]: value }))
    }

    const handleApplyCoupon = async (code) => {
        const r = await applyCouponCode(code, selectedAmount, selectedCartItems)
        if (r?.success) {
            const d =
                Number(r.discountAmount) ||
                Number(r.coupon?.discountAmount) ||
                computeCouponDiscount(r.coupon, selectedAmount)
            setDiscount(d)
            try {
                localStorage.setItem('appliedDiscount', String(d))
            } catch (e) {}
        }
    }

    useEffect(() => {
        if (!coupon) {
            setDiscount(0)
            return
        }
        setDiscount(computeCouponDiscount(coupon, selectedAmount))
    }, [coupon, selectedAmount])

    const handleRemoveCoupon = () => {
        removeCoupon()
        setDiscount(0)
        try {
            localStorage.removeItem('appliedDiscount')
        } catch (e) {}
    }

    // Load địa chỉ...
    useEffect(() => {
        const fetchProvinces = async () => {
            try {
                const res = await axios.get("https://provinces.open-api.vn/api/p/")
                setProvinces(res.data)
            } catch (error) { console.log(error) }
        }
        fetchProvinces()
    }, [])

    const handleProvinceChange = async (e) => {
        const provinceCode = e.target.value
        if (!provinceCode) {
            setDistricts([])
            setWards([])
            setFormData((prev) => ({ ...prev, province: '', district: '', ward: '' }))
            return
        }
        const res = await axios.get(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`)
        setDistricts(res.data.districts)
        setFormData((prev) => ({ ...prev, province: res.data.name, district: '', ward: '' }))
    }

    const handleDistrictChange = async (e) => {
        const districtCode = e.target.value
        if (!districtCode) {
            setWards([])
            setFormData((prev) => ({ ...prev, district: '', ward: '' }))
            return
        }
        const res = await axios.get(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`)
        setWards(res.data.wards)
        setFormData((prev) => ({ ...prev, district: res.data.name, ward: '' }))
    }

    const removeSelectedFromCart = (itemsToRemove) => {
        const nextCart = structuredClone(cartItems)
        itemsToRemove.forEach(item => {
            const color = item.color || 'DEFAULT'
            if (!nextCart[item._id]) return

            // legacy
            if (typeof nextCart[item._id][item.size] === 'number') {
                delete nextCart[item._id][item.size]
                if (Object.keys(nextCart[item._id]).length === 0) delete nextCart[item._id]
                return
            }

            if (nextCart[item._id][color]) {
                delete nextCart[item._id][color][item.size]
                if (Object.keys(nextCart[item._id][color]).length === 0) delete nextCart[item._id][color]
            }
            if (nextCart[item._id] && Object.keys(nextCart[item._id]).length === 0) delete nextCart[item._id]
        })
        setCartItems(nextCart)
        localStorage.removeItem('selectedCartItems')
        localStorage.removeItem('appliedDiscount') // Xóa discount sau khi đặt hàng
        try {
            localStorage.removeItem('couponCode')
        } catch (e) {}
        removeCoupon()
    }

    const onSubmitHandler = async (event) => {
        event.preventDefault()
        try {
            if (selectedCartItems.length === 0) return toast.error('Giỏ hàng trống');
            if (!formData.province || !String(formData.province).trim()) {
                toast.error('Vui lòng chọn Tỉnh / Thành phố')
                return
            }
            if (!formData.district || !String(formData.district).trim()) {
                toast.error('Vui lòng chọn Quận / Huyện')
                return
            }
            if (!formData.ward || !String(formData.ward).trim()) {
                toast.error('Vui lòng chọn Phường / Xã')
                return
            }
            if (payLoading) return
            setPayLoading(true)

            let orderItems = []
            selectedCartItems.forEach((selected) => {
                const itemInfo = structuredClone(products.find(product => product._id === selected._id))
                if (itemInfo) {
                    itemInfo.size = selected.size
                    itemInfo.color = selected.color || 'DEFAULT'
                    itemInfo.quantity = selected.quantity
                    orderItems.push(itemInfo)
                }
            })

            let orderData = {
                address: formData,
                items: orderItems,
                amount: finalAmount, // Số tiền đã giảm
                discount: discount,
                couponCode: localStorage.getItem('couponCode') || ""
            }

            switch (method) {
                case 'cod': {
                    const responseCOD = await axios.post(backendUrl + '/api/order/place', orderData, { headers: { token } })
                    if (responseCOD.data.success) {
                        removeSelectedFromCart(selectedCartItems)
                        navigate('/orders')
                        toast.success('Đặt hàng thành công')
                    } else {
                        toast.error(responseCOD.data.message || 'Đặt hàng thất bại')
                    }
                    break
                }
                case 'vnpay': {
                    const responseVNPay = await axios.post(backendUrl + '/api/order/vnpay', orderData, { headers: { token } })
                    if (responseVNPay.data.success && responseVNPay.data.payment_url) {
                        window.location.href = responseVNPay.data.payment_url;
                    } else {
                        toast.error(responseVNPay.data.message || 'Không tạo được link VNPAY')
                    }
                    break
                }
                case 'momo': {
                    const responseMoMo = await axios.post(backendUrl + '/api/order/momo', orderData, { headers: { token } })
                    if (responseMoMo.data.success && responseMoMo.data.payment_url) {
                        window.location.href = responseMoMo.data.payment_url;
                    } else {
                        toast.error(responseMoMo.data.message || 'Không tạo được link MoMo')
                    }
                    break
                }
                default: break
            }
        } catch (error) {
            toast.error(error.message)
        } finally {
            setPayLoading(false)
        }
    }

    return (
        <form onSubmit={onSubmitHandler} className='flex flex-col sm:flex-row justify-between gap-4 pt-5 sm:pt-14 min-h-[80vh] border-t'>
            {/* LEFT SIDE - FORM ĐỊA CHỈ */}
            <div className='flex flex-col gap-4 w-full sm:max-w-[480px]'>
                <div className='text-xl sm:text-2xl my-3'>
                    <Title text1={'THÔNG TIN'} text2={'GIAO HÀNG'} />
                </div>
                <input required name='fullName' onChange={onChangeHandler} placeholder='Họ và tên' className='border border-gray-300 rounded py-1.5 px-3.5 w-full'/>
                <div className='flex gap-3'>
                    <input required name='email' onChange={onChangeHandler} placeholder='Email' className='border border-gray-300 rounded py-1.5 px-3.5 w-full'/>
                    <input required name='phone' onChange={onChangeHandler} placeholder='Số điện thoại' className='border border-gray-300 rounded py-1.5 px-3.5 w-full'/>
                </div>
                <input required name='address' onChange={onChangeHandler} placeholder='Địa chỉ' className='border border-gray-300 rounded py-1.5 px-3.5 w-full'/>
                <select required onChange={handleProvinceChange} className='border border-gray-300 rounded py-1.5 px-3.5 w-full'>
                    <option value=''>Chọn tỉnh / thành *</option>
                    {provinces.map((province) => (<option key={province.code} value={province.code}>{province.name}</option>))}
                </select>
                <select required onChange={handleDistrictChange} className='border border-gray-300 rounded py-1.5 px-3.5 w-full'>
                    <option value=''>Chọn quận / huyện *</option>
                    {districts.map((district) => (<option key={district.code} value={district.code}>{district.name}</option>))}
                </select>
                <select required name="ward" onChange={onChangeHandler} className='border border-gray-300 rounded py-1.5 px-3.5 w-full'>
                    <option value=''>Chọn phường / xã *</option>
                    {wards.map((ward) => (<option key={ward.code} value={ward.name}>{ward.name}</option>))}
                </select>
            </div>

            {/* RIGHT SIDE - TỔNG TIỀN & THANH TOÁN */}
            <div className='mt-8 min-w-80'>
                <div className='border p-5 rounded-lg bg-white shadow-sm'>
                    <div className='mb-5'>
                        <DiscountBox
                            coupon={coupon}
                            discountAmount={discount}
                            onApply={handleApplyCoupon}
                            onRemove={handleRemoveCoupon}
                            selectedAmount={selectedAmount}
                            currency={currency}
                            cartItems={selectedCartItems}
                            hint='Chọn voucher hoặc nhập mã để giảm giá đơn hàng này.'
                        />
                    </div>
                    <Title text1={'TỔNG'} text2={'ĐƠN HÀNG'} />
                    <div className='mt-4 mb-3'>
                        <FreeShipBanner subtotal={selectedAmount} />
                    </div>
                    <div className='flex flex-col gap-2 mt-4'>
                        <div className='flex justify-between'>
                            <p>Tạm tính</p>
                            <p>{selectedAmount.toLocaleString('vi-VN')}{currency}</p>
                        </div>
                        <hr />
                        <div className='flex justify-between'>
                            <p>Phí vận chuyển</p>
                            <p>{shippingFee === 0 ? 'Miễn phí ship' : `${shippingFee.toLocaleString('vi-VN')}${currency}`}</p>
                        </div>
                        {/* HIỂN THỊ DÒNG GIẢM GIÁ */}
                        {discount > 0 && (
                            <>
                                <hr />
                                <div className='flex justify-between text-green-700'>
                                    <p>Giảm giá</p>
                                    <p>-{discount.toLocaleString('vi-VN')}{currency}</p>
                                </div>
                            </>
                        )}
                        <hr />
                        <div className='flex justify-between font-bold text-lg'>
                            <p>Tổng cộng</p>
                            <p>{finalAmount.toLocaleString('vi-VN')}{currency}</p>
                        </div>
                    </div>
                </div>

                <div className='mt-12'>
                    <Title text1={'PHƯƠNG THỨC'} text2={'THANH TOÁN'} />
                    <div className='flex flex-col gap-3 mt-4'>
                        <button
                            type='button'
                            onClick={() => setMethod('cod')}
                            className={`flex items-center gap-4 w-full rounded-xl border-2 p-4 text-left transition ${
                                method === 'cod' ? 'border-blue-800 bg-blue-50/50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                        >
                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${method === 'cod' ? 'border-blue-800' : 'border-gray-300'}`}>
                                {method === 'cod' ? <span className='h-2 w-2 rounded-full bg-blue-800' /> : null}
                            </span>
                            <span className='rounded-md bg-blue-900 px-3 py-1.5 text-xs font-bold tracking-wide text-white'>COD</span>
                            <span className='text-sm text-gray-600'>Thanh toán khi nhận hàng</span>
                        </button>
                        <button
                            type='button'
                            onClick={() => setMethod('vnpay')}
                            className={`flex items-center gap-4 w-full rounded-xl border-2 p-4 text-left transition ${
                                method === 'vnpay' ? 'border-blue-800 bg-blue-50/50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                        >
                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${method === 'vnpay' ? 'border-blue-800' : 'border-gray-300'}`}>
                                {method === 'vnpay' ? <span className='h-2 w-2 rounded-full bg-blue-800' /> : null}
                            </span>
                            <span className='rounded-md bg-blue-900 px-3 py-1.5 text-xs font-bold tracking-wide text-white'>VNPAY</span>
                            <span className='text-sm text-gray-600'>Thẻ / QR qua cổng VNPAY</span>
                        </button>
                        <button
                            type='button'
                            onClick={() => setMethod('momo')}
                            className={`flex items-center gap-4 w-full rounded-xl border-2 p-4 text-left transition ${
                                method === 'momo' ? 'border-pink-600 bg-pink-50/50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                        >
                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${method === 'momo' ? 'border-pink-600' : 'border-gray-300'}`}>
                                {method === 'momo' ? <span className='h-2 w-2 rounded-full bg-pink-600' /> : null}
                            </span>
                            <span className='rounded-md bg-gradient-to-br from-pink-500 to-rose-600 px-3 py-1.5 text-xs font-bold tracking-wide text-white'>momo</span>
                            <span className='text-sm text-gray-600'>Ví MoMo</span>
                        </button>
                    </div>

                    <div className='w-full text-end mt-8'>
                        <button type='submit' className='bg-blue-600 text-white px-16 py-3 text-sm hover:bg-blue-700 active:bg-blue-800 transition-all duration-300'>
                            {payLoading ? 'ĐANG XỬ LÝ...' : 'ĐẶT HÀNG'}
                        </button>
                    </div>
                </div>
            </div>
        </form>
    )
}

export default PlaceOrder