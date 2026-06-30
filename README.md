# Hướng dẫn cài đặt dự án

## 1. Yêu cầu hệ thống
* **MongoDB:** Sử dụng [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (tạo cluster miễn phí).
* **Công cụ:** [Visual Studio Code](https://code.visualstudio.com/), [Node.js](https://nodejs.org/).

## 2. Các bước cài đặt

## Bước 1: Clone dự án
```bash
git clone [https://github.com/kongher/project_cuoiki_TLCN.git](https://github.com/kongher/project_cuoiki_TLCN.git)
cd project_cuoiki_TLCN
## Bước 2: Cấu hình Backend
#1 Di chuyển vào thư mục backend:
cd backend
npm install
#2 Tạo file .env trong thư mục backend và điền các thông tin sau (bạn có thể tham khảo file .env.example có sẵn):
PORT=4001
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/<dbname>
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
JWT_SECRET=your_jwt_secret
# 3 Import dữ liệu và chạy server:
npm run import-data -- --clear
npm run server
##Bước 3: Cài đặt Front-end
#1Mở một terminal mới trong VS Code:
cd frontend
npm install
npm run dev

##Bước 4: Cài đặt Admin Dashboard
#Mở một terminal mới nữa trong VS Code:
cd admin
npm install
npm run dev