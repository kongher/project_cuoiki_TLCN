import 'dotenv/config';
import mongoose from 'mongoose';
import orderModel from './models/orderModel.js';

const main = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI + '/e-commerce');
    const orders = await orderModel.find({});
    for (const o of orders) {
      if (Array.isArray(o.items)) {
        for (const i of o.items) {
          if (i && i.review) {
            console.log('Order:', o._id, 'Item _id:', i._id, 'productId:', i.productId, 'name:', i.name);
          }
        }
      }
    }
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
};

main();