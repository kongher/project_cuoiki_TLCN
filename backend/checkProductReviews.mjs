import 'dotenv/config';
import mongoose from 'mongoose';
import productModel from './models/productModel.js';

const main = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI + '/e-commerce');
    const products = await productModel.find({ 'reviews.0': { $exists: true } });
    console.log('productsWithReviews', products.length);
    if (products.length > 0) {
      console.log(JSON.stringify(products[0].reviews.slice(0, 5), null, 2));
    }
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
};

main();
