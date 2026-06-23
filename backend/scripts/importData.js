import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { fileURLToPath } from 'url';

// Lấy thư mục hiện tại
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '../data');

// Import Models
import User from '../models/userModel.js';
import Product from '../models/productModel.js';
import Order from '../models/orderModel.js';
import Coupon from '../models/couponModel.js';
import Color from '../models/colorModel.js';
import Banner from '../models/bannerModel.js';
import Notification from '../models/notificationModel.js';
import InventoryHistory from '../models/inventoryHistoryModel.js';
import PriceHistory from '../models/priceHistoryModel.js';
import MenuAnnouncement from '../models/menuAnnouncementModel.js';
import ShopSettings from '../models/shopSettingsModel.js';

// các  collections  import
const collections = [
  { name: 'users', model: User, file: 'users.json' },
  { name: 'products', model: Product, file: 'products.json' },
  { name: 'orders', model: Order, file: 'orders.json' },
  { name: 'coupons', model: Coupon, file: 'coupons.json' },
  { name: 'colors', model: Color, file: 'colors.json' },
  { name: 'banners', model: Banner, file: 'banners.json' },
  { name: 'notifications', model: Notification, file: 'notifications.json' },
  { name: 'inventoryHistories', model: InventoryHistory, file: 'inventoryHistories.json' },
  { name: 'priceHistories', model: PriceHistory, file: 'priceHistories.json' },
  { name: 'menuAnnouncements', model: MenuAnnouncement, file: 'menuAnnouncements.json' },
  { name: 'shopSettings', model: ShopSettings, file: 'shopSettings.json' },
];

async function importData() {
  try {
    console.log(' Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(' Connected to MongoDB successfully\n');

    // Ask user if they want to clear existing data
    const shouldClear = process.argv.includes('--clear');
    
    if (shouldClear) {
      console.log('  Clearing existing data...');
      for (const collection of collections) {
        try {
          const result = await collection.model.deleteMany({});
          if (result.deletedCount > 0) {
            console.log(`    Cleared ${collection.name} (${result.deletedCount} documents removed)`);
          }
        } catch (err) {
          console.log(`     Could not clear ${collection.name}`);
        }
      }
      console.log('');
    }

    // Nhập dữ liệu từ các tệp JSON
    console.log(' Importing data from JSON files...');
    let totalImported = 0;
    let successCount = 0;
    let skipCount = 0;

    for (const collection of collections) {
      const filePath = path.join(dataPath, collection.file);
      
      if (fs.existsSync(filePath)) {
        try {
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(fileContent);
          
          // Xử lý cả đối tượng đơn lẻ và mảng.
          const dataArray = Array.isArray(data) ? data : [data];
          
          if (dataArray.length > 0) {
            try {
              const result = await collection.model.insertMany(dataArray, { ordered: false });
              console.log(`   ✅ Imported ${result.length} ${collection.name} documents`);
              totalImported += result.length;
              successCount++;
            } catch (err) {
              if (err.code === 11000) {
                // Lỗi khóa trùng lặp - hãy thử chèn mà không có khóa trùng lặp.
                let inserted = 0;
                for (const doc of dataArray) {
                  try {
                    await collection.model.create(doc);
                    inserted++;
                  } catch (e) {
                    
                  }
                }
                if (inserted > 0) {
                  console.log(`    Imported ${inserted} ${collection.name} documents (some duplicates skipped)`);
                  totalImported += inserted;
                  successCount++;
                } else {
                  console.log(`     ${collection.name} - All documents already exist (skipped)`);
                  skipCount++;
                }
              } else {
                console.log(`    Error importing ${collection.name}: ${err.message}`);
              }
            }
          } else {
            console.log(`     ${collection.file} is empty`);
            skipCount++;
          }
        } catch (err) {
          console.log(`    Error reading ${collection.file}: ${err.message}`);
        }
      } else {
        console.log(`     ${collection.file} not found - skipping`);
        skipCount++;
      }
    }

    console.log(`\n Import Summary:`);
    console.log(`    Total documents imported: ${totalImported}`);
    console.log(`   Collections successfully imported: ${successCount}`);
    console.log(`     Collections skipped: ${skipCount}`);
    console.log(`\n Tips:`);
    console.log(`   - Use --clear flag to clear existing data: npm run import-data -- --clear`);
    console.log(`   - Check MongoDB Atlas for imported collections`);
    console.log(`   - If you have duplicates, use --clear to start fresh`);
    
    process.exit(0);
  } catch (error) {
    console.error(' Error importing data:', error.message);
    process.exit(1);
  }
}
importData();
