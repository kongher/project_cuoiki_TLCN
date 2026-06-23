import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { fileURLToPath } from 'url';

// Lấy thư mục hiện tại
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '../data');

// Tạo thư mục dữ liệu nếu nó chưa tồn tại.
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

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

// Xác định các bộ sưu tập cần xuất
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

// Hàm xuất dữ liệu từ MongoDB sang các tệp JSON
async function exportData() {
  try {
    console.log(' Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(' Connected to MongoDB successfully');

    // Xuất dữ liệu sang tệp JSON
    console.log('\n Exporting data to JSON files...');
    console.log(`Export location: ${dataPath}\n`);
    
    let totalExported = 0;

    for (const collection of collections) {
      try {
        const documents = await collection.model.find({}).lean();
        
        if (documents.length > 0) {
          const filePath = path.join(dataPath, collection.file);
          fs.writeFileSync(filePath, JSON.stringify(documents, null, 2), 'utf-8');
          console.log(`    Exported ${documents.length} ${collection.name} documents`);
          totalExported += documents.length;
        } else {
          console.log(`    ${collection.name} collection is empty`);
        }
      } catch (err) {
        console.log(`     ${collection.name} - ${err.message}`);
      }
    }

    console.log(`\n Export completed! Total documents exported: ${totalExported}`);
    console.log(`\n Files saved to: backend/data/`);
    console.log('   You can now share these JSON files with others');
    
    process.exit(0);
  } catch (error) {
    console.error(' Error exporting data:', error.message);
    process.exit(1);
  }
}
exportData();
