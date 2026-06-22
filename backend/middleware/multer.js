import multer from "multer";

const storage = multer.diskStorage({
    filename: function (req, file, callback) {
        const safe = String(file.originalname || 'image').replace(/[^\w.\-]+/g, '_')
        callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safe}`)
    },
})

const upload = multer({storage})

export default upload