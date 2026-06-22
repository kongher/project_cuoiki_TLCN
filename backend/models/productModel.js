import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    discountPercent: { type: Number, default: 0 },
    salePrice: { type: Number, default: 0 },
    isSpecialSale: { type: Boolean, default: false },
    /** Nhãn marketing linh hoạt, ví dụ: "Sản phẩm bán chạy", "SIÊU SALE TRONG THÁNG" */
    tags: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    image: { type: Array, required: true },
    variants: {
        type: Array,
        default: []
        /*
          [
            {
              colorName: "Đen",
              sku: "SKU-001",
              thumbnail: "https://...",
              images: ["https://main...", "https://gallery1..."],
              imageItems: [{ url, is_main: true, is_hover: false }, { url, is_hover: true }],
              colorHex: "#000000",
              stockBySize: { S: 5, M: 0, L: 2 }
            }
          ]
        */
    },
    category: { type: String, required: true },
    /** Dòng sản phẩm chi tiết (Navbar + bộ lọc), ví dụ nam-ao-thun */
    catalogSlug: { type: String, default: '' },
    /** Mã gốc để sinh SKU chi tiết: {parent}-{màu}-{size} */
    parentSku: { type: String, default: '' },
    subCategory: { type: String, required: true }, // Topwear | Bottomwear | Outerwear | Dresswear | Winterwear
    sizes: { type: Array, required: true },
    bestseller: { type: Boolean },
    reviews: { type: Array, default: [] },
    numReviews: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    date: { type: Number, required: true }
})

const productModel  = mongoose.models.product || mongoose.model("product",productSchema);

export default productModel