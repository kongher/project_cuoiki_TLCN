import jwt from 'jsonwebtoken'

/** Token admin từ adminLogin (payload là email+password string). */
const adminAuth = async (req, res, next) => {
  const { token } = req.headers
  if (!token) {
    return res.json({ success: false, message: 'Không có quyền truy cập' })
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch (error) {
    return res.json({ success: false, message: 'Phiên admin không hợp lệ' })
  }
}

export default adminAuth
