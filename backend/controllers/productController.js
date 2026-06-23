import { v2 as cloudinary } from "cloudinary"
import productModel from "../models/productModel.js"
import {
    buildVariantImageItems,
    galleryUrlsFromItems,
    normalizeImageItems,
    serializeProductImages,
} from "../utils/productImages.js"
import {
    TAG_SUPER_SALE,
    TAG_SUPER_SALE_ALIASES,
    addTagToDocument,
    applyTagsToDocument,
    collectDistinctProductTags,
    parseTagsFromBody,
    syncLegacyFlagsFromTags,
} from "../utils/productTags.js"
import { assertSkusAvailable } from "../utils/productSku.js"
import { logInitialProductInventory } from "../utils/inventory.js"
import { logPriceHistory } from "../services/priceHistory.js"

const safeJsonParse = (value, fallback) => {
    if (value === undefined || value === null || value === '') return fallback
    try {
        return JSON.parse(value)
    } catch (e) {
        return fallback
    }
}

const uploadCloudinary = async (file) => {
    if (!file?.path) return ''
    const result = await cloudinary.uploader.upload(file.path, { resource_type: 'image' });
    return result.secure_url
}
// Chuyển file upload thành map theo fieldname để dễ truy xuất
const toFileArrayMap = (files) => {
    const list = Array.isArray(files) ? files : []
    const map = {}
    list.forEach((f) => {
        if (!f?.fieldname) return
        if (!map[f.fieldname]) map[f.fieldname] = []
        map[f.fieldname].push(f)
    })
    return map
}
// Chuẩn hóa màu sắc: chỉ chấp nhận hex code, tự động thêm # nếu thiếu, và chuyển thành chữ hoa
const sanitizeColorHex = (raw) => {
    const s = String(raw || '').trim()
    if (!s) return ''
    if (/^#[0-9A-Fa-f]{6}$/.test(s)) return s.toUpperCase()
    const noHash = s.replace(/^#/, '')
    if (/^[0-9A-Fa-f]{6}$/.test(noHash)) return `#${noHash.toUpperCase()}`
    return ''
}
// Chuẩn hóa parentSku: chỉ giữ lại chữ, số, gạch ngang, gạch dưới; xóa khoảng trắng; chuyển thành chữ hoa
const normalizeParentSku = (raw) =>
    String(raw || '')
        .trim()
        .replace(/\s+/g, '')
        .replace(/[^A-Za-z0-9_-]/g, '')

const cleanSkuBySize = (raw, stockBySize) => {
    const out = {}
    if (!stockBySize || typeof stockBySize !== 'object') return out
    const src = raw && typeof raw === 'object' ? raw : {}
    Object.keys(stockBySize).forEach((sz) => {
        const k = String(sz)
        const v = String(src[k] ?? src[sz] ?? '').trim()
        if (v) out[k] = v
    })
    return out
}

    // Admin: add new product

const addProduct = async (req, res) => {
    try {

        const { name, description, price, category, subCategory, sizes } = req.body
        const catalogSlug = String(req.body?.catalogSlug || '').trim()
        const parentSku = normalizeParentSku(req.body?.parentSku)
        const discountPercent = Number(req.body.discountPercent || 0)
        const salePrice = discountPercent > 0 ? Math.round(Number(price) * (100 - discountPercent) / 100) : Number(price)
        const tags = parseTagsFromBody(req.body.tags)
        const legacyFlags = syncLegacyFlagsFromTags(tags)
        const isActive = req.body.isActive === undefined ? true : (req.body.isActive === "true" || req.body.isActive === true)

        const rawVariantsForSku = safeJsonParse(req.body.variants, [])
        const skuConflict = await assertSkusAvailable(productModel, rawVariantsForSku)
        if (skuConflict) {
            return res.json({ success: false, message: skuConflict.message })
        }
        // Kiểm tra trùng SKU với các sản phẩm khác 
        const files = Array.isArray(req.files) ? req.files : []
        const filesByField = toFileArrayMap(files)
        const firstFile = (field) => (Array.isArray(filesByField[field]) ? filesByField[field][0] : undefined)

        //sản phẩm mới có thể có gallery hình ảnh riêng, nếu có thì ưu tiên dùng gallery này
        const galleryFiles = filesByField.images || []
        const galleryUrls = await Promise.all((Array.isArray(galleryFiles) ? galleryFiles : []).map(uploadCloudinary))

        //nếu không có gallery riêng thì dùng các file image1-image4 như trước đây
        const legacyImages = ['image1', 'image2', 'image3', 'image4']
            .map((k) => firstFile(k))
            .filter(Boolean)
        const legacyImagesUrl = await Promise.all(legacyImages.map(uploadCloudinary))

        // Nếu không có gallery nào thì dùng ảnh thumbnail của variants làm ảnh hiển thị
        const rawVariants = rawVariantsForSku
        const variantsInput = Array.isArray(rawVariants) ? rawVariants : []

        const variants = await Promise.all(
            variantsInput.map(async (v, idx) => {
                const colorName = String(v?.colorName || '').trim()
                const colorHex = sanitizeColorHex(v?.colorHex)
                const stockBySize = v?.stockBySize && typeof v.stockBySize === 'object' ? v.stockBySize : {}
                const skuBySize = cleanSkuBySize(v?.skuBySize, stockBySize)
                const skuFromSizes = Object.values(skuBySize).find(Boolean) || ''
                const sku = String(v?.sku || '').trim() || skuFromSizes

                const thumbFile = firstFile(`variantThumbnail${idx}`)
                const mainFile = firstFile(`variantMain${idx}`) || firstFile(`variantImage${idx}`)
                const hoverFile = firstFile(`variantHover${idx}`)
                const galleryExtraFiles = filesByField[`variantGallery${idx}`] || []
                
                const thumbnail = await uploadCloudinary(thumbFile)
                const uploadedMain = await uploadCloudinary(mainFile)
                const mainImage = uploadedMain || thumbnail
                const hoverImage = await uploadCloudinary(hoverFile)
                const galleryUrls = await Promise.all(galleryExtraFiles.map(uploadCloudinary))
                const orderedUrls = [mainImage, ...galleryUrls].filter(Boolean)
                const imageItems = buildVariantImageItems(orderedUrls, {
                    hoverUrl: hoverImage || v?.hoverUrl || '',
                    thumbnailUrl: thumbnail,
                })
            
                const gallery = galleryUrlsFromItems(imageItems)

                return {
                    colorName,
                    sku,
                    skuBySize,
                    colorHex,
                    thumbnail: thumbnail || mainImage,
                    images: gallery.length ? gallery : (mainImage ? [mainImage] : []),
                    imageItems,
                    stockBySize
                }
            })
        ).then((arr) => arr.filter((v) => v.colorName))

        const variantDisplayUrls = variants.flatMap((v) => {
            const urls = Array.isArray(v.images) ? v.images.filter(Boolean) : []
            if (urls.length) return urls
            if (v.thumbnail) return [v.thumbnail]
            return []
        })
        const imagesUrl =
            galleryUrls.filter(Boolean).length > 0
                ? galleryUrls.filter(Boolean)
                : (legacyImagesUrl.filter(Boolean).length > 0
                    ? legacyImagesUrl.filter(Boolean)
                    : variantDisplayUrls)
        
        const productData = {
            name,
            description,
            category,
            catalogSlug,
            parentSku,
            price: Number(price),
            discountPercent,
            salePrice,
            tags,
            isSpecialSale: legacyFlags.isSpecialSale,
            isActive,
            subCategory,
            bestseller: legacyFlags.bestseller,
            sizes: safeJsonParse(sizes, []),
            image: imagesUrl.length ? imagesUrl : legacyImagesUrl,
            variants,
            date: Date.now()
        }

        console.log(productData);
        // Lưu sản phẩm mới vào database
        const product = new productModel(productData);
        await product.save()

        try {
            await logInitialProductInventory(product, 'Admin')
            await logPriceHistory({
                productId: product._id,
                oldPrice: 0,
                newPrice: Number(price) || 0,
                reason: 'Giá khởi tạo',
                performedBy: 'Admin',
            })
        } catch {
            /* ignore log errors */
        }

        res.json({ success: true, message: 'Đã thêm sản phẩm thành công' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// Danh sách sản phẩm cho trang chủ và trang bộ sưu tập
const listProducts = async (req, res) => {
    try {
        
        const specialSaleQuery =
            req.query.isSpecialSale === 'true' || req.query.specialSale === 'true'

        const activeQuery = { isActive: { $ne: false } }

        const query = specialSaleQuery
            ? {
                ...activeQuery,
                $or: [{ tags: { $in: TAG_SUPER_SALE_ALIASES } }, { isSpecialSale: true }],
              }
            : activeQuery

        const products = await productModel.find(query);
        res.json({ success: true, products: products.map(serializeProductImages) })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// Danh sách sản phẩm cho trang admin bao gòm cả sản phẩm ẩn
const adminListProducts = async (req, res) => {
    try {
        const products = await productModel.find({})
        res.json({ success: true, products: products.map(serializeProductImages) })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// Admin: bật/tắt hiển thị sản phẩm

const toggleProductActive = async (req, res) => {
    try {
        const { id, isActive } = req.body
        if (!id) return res.json({ success: false, message: 'Missing id' })
        const next = Boolean(isActive)
        const updated = await productModel.findByIdAndUpdate(id, { isActive: next }, { new: true })
        if (!updated) return res.json({ success: false, message: 'Product not found' })
        res.json({ success: true, message: 'Updated', product: updated })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// Admin: xóa sản phẩm

const bulkDeleteProducts = async (req, res) => {
    try {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids : []
        if (!ids.length) return res.json({ success: false, message: 'No products selected' })
        const result = await productModel.deleteMany({ _id: { $in: ids } })
        res.json({ success: true, message: `Deleted ${result.deletedCount || 0} products` })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// Admin: áp dụng giảm giá 10% và thêm vào "Siêu sale"
const bulkSpecialSale10 = async (req, res) => {
    try {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids : []
        if (!ids.length) return res.json({ success: false, message: 'No products selected' })

        const products = await productModel.find({ _id: { $in: ids } })
        await Promise.all(products.map(async (p) => {
            const price = Number(p.price) || 0
            const discountPercent = 10
            const salePrice = price > 0 ? Math.round(price * (100 - discountPercent) / 100) : 0
            p.discountPercent = discountPercent
            p.salePrice = salePrice
            addTagToDocument(p, TAG_SUPER_SALE)
            await p.save()
        }))

        res.json({ success: true, message: `Đã áp dụng giảm 10% và thêm vào Siêu sale cho ${products.length} sản phẩm` })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// Admin: áp dụng giảm giá tùy chọn và thêm vào "Siêu sale" tùy chọn
const bulkSpecialSalePercent = async (req, res) => {
    try {
        const ids = Array.isArray(req.body?.ids) ? req.body.ids : []
        const raw = req.body?.discountPercent
        const discountPercent = Number(raw)

        if (!ids.length) return res.json({ success: false, message: 'No products selected' })
        if (!Number.isFinite(discountPercent)) return res.json({ success: false, message: 'Invalid discountPercent' })
        if (discountPercent <= 0 || discountPercent > 90) {
            return res.json({ success: false, message: 'discountPercent must be between 1 and 90' })
        }

        const addToSpecialSale =
            req.body?.isSpecialSale === undefined
                ? true
                : (req.body.isSpecialSale === true || req.body.isSpecialSale === 'true')

        const products = await productModel.find({ _id: { $in: ids } })
        await Promise.all(products.map(async (p) => {
            const price = Number(p.price) || 0
            const salePrice = price > 0 ? Math.round(price * (100 - discountPercent) / 100) : 0
            p.discountPercent = discountPercent
            p.salePrice = salePrice
            if (addToSpecialSale) addTagToDocument(p, TAG_SUPER_SALE)
            await p.save()
        }))

        const suffix = addToSpecialSale
            ? ` và thêm vào Siêu sale trong tháng cho ${products.length} sản phẩm`
            : ` cho ${products.length} sản phẩm (không gắn Siêu sale)`

        res.json({
            success: true,
            message: `Đã áp dụng giảm ${discountPercent}%${suffix}`
        })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// Admin: cập nhật thông tin sản phẩm (bao gồm cả hình ảnh và variants)
const updateProduct = async (req, res) => {
    try {
        const id = req.body?.id
        if (!id) return res.json({ success: false, message: 'Missing id' })

        const existing = await productModel.findById(id)
        if (!existing) return res.json({ success: false, message: 'Product not found' })

        const files = Array.isArray(req.files) ? req.files : []
        const filesByField = toFileArrayMap(files)
        const firstFile = (field) => (Array.isArray(filesByField[field]) ? filesByField[field][0] : undefined)

        const nextName = req.body?.name ?? existing.name
        const nextDescription = req.body?.description ?? existing.description
        const nextCategory = req.body?.category ?? existing.category
        const nextSubCategory = req.body?.subCategory ?? existing.subCategory
        const nextCatalogSlug =
            req.body?.catalogSlug !== undefined ? String(req.body.catalogSlug || '').trim() : (existing.catalogSlug || '')

        const nextParentSku =
            req.body?.parentSku !== undefined
                ? normalizeParentSku(req.body.parentSku)
                : normalizeParentSku(existing.parentSku || '')

        const nextTags =
            req.body?.tags !== undefined
                ? parseTagsFromBody(req.body.tags)
                : (Array.isArray(existing.tags) ? existing.tags : [])

        const nextIsActive =
            req.body?.isActive === undefined
                ? existing.isActive
                : (req.body.isActive === "true" || req.body.isActive === true)

        const nextSizes = req.body?.sizes !== undefined ? safeJsonParse(req.body.sizes, existing.sizes) : existing.sizes

        const prevPrice = Number(existing.price) || 0
        const nextPrice =
            req.body?.price !== undefined
                ? Number(req.body.price)
                : prevPrice

        const nextDiscountPercent =
            req.body?.discountPercent !== undefined
                ? Number(req.body.discountPercent || 0)
                : Number(existing.discountPercent || 0)

        const nextSalePrice =
            nextDiscountPercent > 0
                ? Math.round(nextPrice * (100 - nextDiscountPercent) / 100)
                : nextPrice

        // Nếu có gallery mới thì ưu tiên dùng gallery này, không thì giữ nguyên
        const galleryFiles = filesByField.images || []
        const galleryUrls = galleryFiles.length > 0
            ? await Promise.all(galleryFiles.map(uploadCloudinary))
            : []

        // Nếu có gallery mới thì dùng gallery mới, không thì dùng các file image1-image4 nếu có, nếu không có nữa thì giữ nguyên ảnh cũ
        const rawVariants = req.body?.variants !== undefined ? safeJsonParse(req.body.variants, []) : null
        const variantsInput = rawVariants === null ? null : (Array.isArray(rawVariants) ? rawVariants : [])
        const existingVariants = Array.isArray(existing.variants) ? existing.variants : []

        if (variantsInput !== null) {
            // Sửa SP: chỉ chặn trùng SKU trong cùng form; không so với CSDL (tránh báo lỗi khi giữ mã cũ / đổi giá-tồn-size-màu)
            const skuConflict = await assertSkusAvailable(productModel, variantsInput, {
                skipExternal: true,
            })
            if (skuConflict) {
                return res.json({ success: false, message: skuConflict.message })
            }
        }

        // Xử lý variants: nếu có input mới thì cập nhật theo input, nếu không có input mới thì giữ nguyên
        let nextVariants = existingVariants
        if (variantsInput !== null) {
            nextVariants = await Promise.all(
                variantsInput.map(async (v, idx) => {
                    const colorName = String(v?.colorName || '').trim()
                    if (!colorName) return null

                    const stockBySize = v?.stockBySize && typeof v.stockBySize === 'object' ? v.stockBySize : {}
                    const prev = existingVariants[idx] || {}
                    const skuBySize = cleanSkuBySize(v?.skuBySize ?? prev?.skuBySize, stockBySize)
                    const skuFromSizes = Object.values(skuBySize).find(Boolean) || ''
                    const sku = String(v?.sku ?? prev?.sku ?? '').trim() || skuFromSizes

                    const prevImages = Array.isArray(prev?.images) ? prev.images.filter(Boolean) : []
                    const colorHex = sanitizeColorHex(v?.colorHex ?? prev?.colorHex)

                    const thumbFile = firstFile(`variantThumbnail${idx}`)
                    const mainFile = firstFile(`variantMain${idx}`) || firstFile(`variantImage${idx}`)
                    const hoverFile = firstFile(`variantHover${idx}`)
                    const galleryExtraFiles = filesByField[`variantGallery${idx}`] || []

                    const uploadedThumb = await uploadCloudinary(thumbFile)
                    const uploadedMain = await uploadCloudinary(mainFile)
                    const uploadedHover = await uploadCloudinary(hoverFile)

                    const thumbnail = uploadedThumb || prev?.thumbnail || ''

                    const prevItems = normalizeImageItems(prev?.imageItems, prevImages)
                    const prevHoverUrl = prevItems.find((x) => x.is_hover)?.url || ''
                    const prevGalleryUrls = prevItems.filter((x) => !x.is_hover).map((x) => x.url)
                    const mainUrl = uploadedMain || prevGalleryUrls[0] || prevImages[0] || thumbnail || ''

                    const uploadedGallery = galleryExtraFiles.length > 0
                        ? await Promise.all(galleryExtraFiles.map(uploadCloudinary))
                        : null
                    const extraUrls = uploadedGallery === null
                        ? prevGalleryUrls.slice(1)
                        : uploadedGallery.filter(Boolean)
                    const orderedUrls = [mainUrl, ...extraUrls].filter(Boolean)
                    const hoverFromMeta = Array.isArray(v?.imageMeta)
                        ? v.imageMeta.find((x) => x?.is_hover)?.url
                        : ''
                    const imageItems = buildVariantImageItems(orderedUrls, {
                        hoverUrl: uploadedHover || hoverFromMeta || v?.hoverUrl || prevHoverUrl || '',
                        thumbnailUrl: thumbnail,
                    })
                    const gallery = galleryUrlsFromItems(imageItems)

                    return {
                        colorName,
                        sku,
                        skuBySize,
                        colorHex,
                        thumbnail: thumbnail || mainUrl,
                        images: gallery.length ? gallery : (mainUrl ? [mainUrl] : []),
                        imageItems,
                        stockBySize
                    }
                })
            ).then((arr) => (arr || []).filter(Boolean))
        }

        // Xử lý ảnh hiển thị: ưu tiên gallery mới, nếu không có thì dùng các file image1-image4, nếu không có nữa thì dùng ảnh từ variants, nếu vẫn không có thì giữ nguyên
        const legacyImages = ['image1', 'image2', 'image3', 'image4']
            .map((k) => firstFile(k))
            .filter(Boolean)
        const legacyImagesUrl = legacyImages.length > 0 ? await Promise.all(legacyImages.map(uploadCloudinary)) : []

        const variantFlatImages =
            variantsInput !== null && nextVariants.length > 0
                ? nextVariants.flatMap((v) => (Array.isArray(v?.images) ? v.images : [])).filter(Boolean)
                : []

        const nextImage =
            galleryUrls.filter(Boolean).length > 0
                ? galleryUrls.filter(Boolean)
                : (legacyImagesUrl.length > 0
                    ? legacyImagesUrl
                    : (variantFlatImages.length > 0
                        ? variantFlatImages
                        : (Array.isArray(existing.image) ? existing.image : [])))

        existing.name = nextName
        existing.description = nextDescription
        existing.category = nextCategory
        existing.subCategory = nextSubCategory
        existing.catalogSlug = nextCatalogSlug
        existing.parentSku = nextParentSku
        applyTagsToDocument(existing, nextTags)
        existing.isActive = nextIsActive
        existing.sizes = nextSizes
        existing.price = nextPrice
        existing.discountPercent = nextDiscountPercent
        existing.salePrice = nextSalePrice
        existing.variants = nextVariants
        existing.image = nextImage

        await existing.save()

        if (nextPrice !== prevPrice) {
            try {
                await logPriceHistory({
                    productId: existing._id,
                    oldPrice: prevPrice,
                    newPrice: nextPrice,
                    reason: String(req.body?.priceChangeReason || 'Cập nhật giá').trim(),
                    performedBy: 'Admin',
                })
            } catch {
                /* ignore log errors */
            }
        }

        res.json({ success: true, message: 'Updated', product: existing })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// Admin: danh sách nhãn không trùng (từ mọi sản phẩm)
const listProductTags = async (req, res) => {
    try {
        const tags = await collectDistinctProductTags(productModel)
        res.json({ success: true, tags })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// Admin: xóa sản phẩm

const removeProduct = async (req, res) => {
    try {
        
        await productModel.findByIdAndDelete(req.body.id)
        res.json({ success: true, message: 'Bạn đã xóa thành công' })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// Admin: xem thông tin chi tiết sản phẩm
const singleProduct = async (req, res) => {
    try {
        
        const { productId } = req.body
        const product = await productModel.findById(productId) //Tìm kiếm sản phẩm theo ID
        if (!product) return res.json({ success: false, message: 'Product not found' })
        res.json({ success: true, product: serializeProductImages(product) })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// Admin: xem tóm tắt đánh giá sản phẩm

const reviewSummary = async (req, res) => {
    try {
        const { productId } = req.body
        const product = await productModel.findById(productId)
        if (!product) return res.json({ success: false, message: 'Product not found' })

        const reviews = Array.isArray(product.reviews) ? product.reviews : []
        const total = reviews.length
        const counts = [0, 0, 0, 0, 0]
        let sum = 0

        reviews.forEach((review) => {
            const value = Number(review.rating) || 0
            if (value >= 1 && value <= 5) {
                counts[value - 1] += 1
                sum += value
            }
        })
// Tính điểm trung bình, làm tròn 1 chữ số thập phân
        const average = total > 0 ? Number((sum / total).toFixed(1)) : 0
        res.json({ success: true, summary: { average, total, counts } })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

export {
    listProducts,
    addProduct,
    removeProduct,
    singleProduct,
    reviewSummary,
    adminListProducts,
    listProductTags,
    toggleProductActive,
    bulkDeleteProducts,
    bulkSpecialSale10,
    bulkSpecialSalePercent,
    updateProduct
}