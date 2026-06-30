import * as brevo from '@getbrevo/brevo';

/**
 * Hàm hỗ trợ gửi mail chung qua Brevo API
 */
const sendBrevoMail = async ({ to, subject, htmlContent }) => {
  const apiInstance = new brevo.TransactionalEmailsApi();
  
  // Cấu hình API Key từ .env
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = htmlContent;
  sendSmtpEmail.sender = { "name": "Forever Shop", "email": "herkong633@gmail.com" }; 
  sendSmtpEmail.to = [{ "email": to }];

  return await apiInstance.sendTransacEmail(sendSmtpEmail);
};

/**
 * Gửi mã OTP đặt lại mật khẩu
 */
export const sendPasswordResetOtpEmail = async ({ to, otp, expiresInSec = 180 }) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111;">
      <h2 style="margin:0 0 12px;">Lấy lại mật khẩu</h2>
      <p style="color:#444;line-height:1.6;">Bạn đã yêu cầu đặt lại mật khẩu. Mã OTP của bạn là:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:20px 0;">${otp}</p>
      <p style="color:#666;font-size:14px;">Mã có hiệu lực trong <strong>${expiresInSec}</strong> giây (3 phút). Không chia sẻ mã này với bất kỳ ai.</p>
      <p style="color:#999;font-size:12px;margin-top:24px;">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    </div>
  `;

  await sendBrevoMail({ to, subject: 'Mã OTP đặt lại mật khẩu', htmlContent: html });
};

/**
 * Gửi mã OTP xác thực đăng ký tài khoản
 */
export const sendRegisterOtpEmail = async ({ to, otp, expiresInSec = 180 }) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111;">
      <h2 style="margin:0 0 12px;">Xác thực đăng ký tài khoản</h2>
      <p style="color:#444;line-height:1.6;">Cảm ơn bạn đã đăng ký Forever Shop. Mã OTP của bạn là:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:20px 0;">${otp}</p>
      <p style="color:#666;font-size:14px;">Mã có hiệu lực trong <strong>${expiresInSec}</strong> giây (3 phút).</p>
    </div>
  `;

  await sendBrevoMail({ to, subject: 'Mã OTP đăng ký tài khoản', htmlContent: html });
};

const formatVnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`;

/**
 * Gửi mã giảm giá ưu đãi
 */
export const sendVoucherGiftEmail = async ({ to, customerName, coupon }) => {
  const code = coupon?.code || '';
  const discountText = coupon?.type === 'amount' 
    ? `Giảm ${formatVnd(coupon.amount)}` 
    : `Giảm ${coupon?.percent || 0}%`;
  const minText = coupon?.minAmount ? `Áp dụng đơn từ ${formatVnd(coupon.minAmount)}` : '';
  const expireText = coupon?.expiresAt 
    ? `Hạn dùng: ${new Date(Number(coupon.expiresAt)).toLocaleDateString('vi-VN')}` 
    : 'Không giới hạn thời gian';

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
  `;

  await sendBrevoMail({ to, subject: 'Forever Shop tặng bạn mã giảm giá ưu đãi', htmlContent: html });
};