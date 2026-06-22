import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './config/mongodb.js'
import connectCloudinary from './config/cloudinary.js'
import userRouter from './routes/userRoute.js'
import productRouter from './routes/productRoute.js'
import cartRouter from './routes/cartRoute.js'
import orderRouter from './routes/orderRoute.js'
import discountRouter from './routes/discountRoute.js'
import colorRouter from './routes/colorRoute.js'
import adminRouter from './routes/adminRoute.js'
import notificationRouter from './routes/notificationRoute.js'
import inventoryRouter from './routes/inventoryRoute.js'
import bannerRouter from './routes/bannerRoute.js'
import adminAuth from './middleware/adminAuth.js'
import { getOrderById } from './controllers/orderController.js'

// App Config
const app = express()
const port = process.env.PORT || 4000
connectDB()
connectCloudinary()

// middlewares
app.use(express.json())
app.use(cors())

// api endpoints
app.use('/api/user',userRouter)
app.use('/api/product',productRouter)
app.use('/api/cart',cartRouter)
app.use('/api/order',orderRouter)
app.use('/api/discount',discountRouter)
app.use('/api/color', colorRouter)
app.use('/api/admin', adminRouter)
app.use('/api/notifications', notificationRouter)
app.use('/api/inventory', inventoryRouter)
app.use('/api/banner', bannerRouter)
app.get('/api/orders/:id', adminAuth, getOrderById)

app.get('/',(req,res)=>{
    res.send("API Working")
})

app.listen(port, ()=> console.log('Server started on PORT : '+ port))