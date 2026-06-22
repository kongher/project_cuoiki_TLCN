import 'dotenv/config';
import mongoose from 'mongoose';
import orderModel from './models/orderModel.js';

const main = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI + '/e-commerce');
    const orders = await orderModel.find({});
    let reviewOrders = 0;
    let reviewItems = 0;
    for (const o of orders) {
      if (Array.isArray(o.items)) {
        const count = o.items.filter(i => i && i.review).length;
        if (count > 0) {
          reviewOrders++;
          reviewItems += count;
        }
      }
    }
    console.log('orders', orders.length, 'ordersWithReview', reviewOrders, 'reviewItems', reviewItems);
    if (reviewOrders > 0) {
      const sample = orders.find(o => Array.isArray(o.items) && o.items.some(i => i.review));
      console.log(JSON.stringify(sample.items.filter(i => i && i.review), null, 2).slice(0, 2000));
    }
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
};

main();
