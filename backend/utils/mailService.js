import nodemailer from 'nodemailer'

const getMailCredentials = () => {
  const user =
    process.env.EMAIL_USER ||
    process.env.SMTP_USER ||
    process.env.GMAIL_USER
  const pass = (
    process.env.EMAIL_PASS ||
    process.env.SMTP_APP_PASSWORD ||
    process.env.GMAIL_APP_PASSWORD ||
    ''
  ).replace(/\s/g, '')

  return { user, pass }
}

/*const getTransporter = () => {
  const { user, pass } = getMailCredentials()

  if (!user || !pass) {
    throw new Error('Thiếu EMAIL_USER và EMAIL_PASS (hoặc SMTP_USER / SMTP_APP_PASSWORD) trong file .env')
  }

  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  })
}*/

/**
 * Gửi mã OTP đặt lại mật khẩu tới email người dùng (Gmail + mật khẩu ứng dụng).
 */
const getTransporter = () => {
  const { user, pass } = getMailCredentials()

  if (!user || !pass) {
    throw new Error('Thiếu EMAIL_USER hoặc EMAIL_PASS trong file .env')
  }

  return nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'herkong633@gmail.com', // Email của bạn
    pass: 'mật_khẩu_ứng_dụng_gmail' // Phải là App Password
  },
  connectionTimeout: 60000 // Tăng thời gian chờ lên
})
}
export const sendPasswordResetOtpEmail = async ({ to, otp, expiresInSec = 180 }) => {
  const transporter = getTransporter()
  const { user } = getMailCredentials()
  const from = process.env.SMTP_FROM || user

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111;">
      <h2 style="margin:0 0 12px;">Lấy lại mật khẩu</h2>
      <p style="color:#444;line-height:1.6;">Bạn đã yêu cầu đặt lại mật khẩu. Mã OTP của bạn là:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:20px 0;">${otp}</p>
      <p style="color:#666;font-size:14px;">Mã có hiệu lực trong <strong>${expiresInSec}</strong> giây (3 phút). Không chia sẻ mã này với bất kỳ ai.</p>
      <p style="color:#999;font-size:12px;margin-top:24px;">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    </div>
  `

  await transporter.sendMail({
    from: `"Forever Shop" <${from}>`,
    to,
    subject: 'Mã OTP đặt lại mật khẩu',
    text: `Mã OTP đặt lại mật khẩu của bạn là: ${otp}. Mã hết hạn sau ${expiresInSec} giây.`,
    html,
  })
}

/**
 * Gửi mã OTP xác thực đăng ký tài khoản.
 */
export const sendRegisterOtpEmail = async ({ to, otp, expiresInSec = 180 }) => {
  const transporter = getTransporter()
  const { user } = getMailCredentials()
  const from = process.env.SMTP_FROM || user

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111;">
      <h2 style="margin:0 0 12px;">Xác thực đăng ký tài khoản</h2>
      <p style="color:#444;line-height:1.6;">Cảm ơn bạn đã đăng ký Forever Shop. Mã OTP của bạn là:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:20px 0;">${otp}</p>
      <p style="color:#666;font-size:14px;">Mã có hiệu lực trong <strong>${expiresInSec}</strong> giây (3 phút).</p>
    </div>
  `

  await transporter.sendMail({
    from: `"Forever Shop" <${from}>`,
    to,
    subject: 'Mã OTP đăng ký tài khoản',
    text: `Mã OTP đăng ký của bạn là: ${otp}. Mã hết hạn sau ${expiresInSec} giây.`,
    html,
  })
}

const formatVnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`

/**
 * Gửi mã giảm giá ưu đãi cho khách hàng thân thiết.
 */
export const sendVoucherGiftEmail = async ({ to, customerName, coupon }) => {
  const transporter = getTransporter()
  const { user } = getMailCredentials()
  const from = process.env.SMTP_FROM || user

  const code = coupon?.code || ''
  const discountText =
    coupon?.type === 'amount'
      ? `Giảm ${formatVnd(coupon.amount)}`
      : `Giảm ${coupon?.percent || 0}%`
  const minText = coupon?.minAmount ? `Áp dụng đơn từ ${formatVnd(coupon.minAmount)}` : ''
  const expireText = coupon?.expiresAt
    ? `Hạn dùng: ${new Date(Number(coupon.expiresAt)).toLocaleDateString('vi-VN')}`
    : 'Không giới hạn thời gian'

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111;">
      <h2 style="margin:0 0 12px;">Ưu đãi dành riêng cho bạn</h2>
      <p style="color:#444;line-height:1.6;">Xin chào <strong>${customerName || 'khách hàng'}</strong>,</p>
      <p style="color:#444;line-height:1.6;">Forever Shop gửi tặng bạn mã giảm giá tri ân khách hàng thân thiết:</p>
      <p style="font-size:26px;font-weight:bold;letter-spacing:3px;margin:20px 0;padding:12px;background:#f5f5f5;border-radius:8px;text-align:center;">${code}</p>
      <p style="color:#333;"><strong>${discountText}</strong></p>
      ${minText ? `<p style="color:#666;font-size:14px;">${minText}</p>` : ''}
      <p style="color:#666;font-size:14px;">${expireText}</p>
      <p style="color:#999;font-size:12px;margin-top:24px;">Nhập mã khi thanh toán trên website Forever Shop.</p>
    </div>
  `

  await transporter.sendMail({
    from: `"Forever Shop" <${from}>`,
    to,
    subject: 'Forever Shop tặng bạn mã giảm giá ưu đãi',
    text: `Mã giảm giá: ${code}. ${discountText}. ${minText} ${expireText}`,
    html,
  })
}
