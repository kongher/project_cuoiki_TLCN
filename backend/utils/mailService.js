import nodemailer from 'nodemailer';
import sgTransport from 'nodemailer-sendgrid-transport';

// Sử dụng API Key của SendGrid (bạn cần đăng ký tài khoản SendGrid miễn phí)
const getTransporter = () => {
  const apiKey = process.env.SENDGRID_API_KEY; 

  if (!apiKey) {
    throw new Error('Thiếu SENDGRID_API_KEY trong file .env');
  }

  // Sử dụng cấu hình SendGrid thay vì SMTP truyền thống
  return nodemailer.createTransport(sgTransport({
    auth: {
      api_key: apiKey
    }
  }));
};

/**
 * Các hàm gửi mail giữ nguyên cấu trúc cũ
 */
export const sendPasswordResetOtpEmail = async ({ to, otp, expiresInSec = 180 }) => {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || 'your-verified-email@domain.com';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111;">
      <h2 style="margin:0 0 12px;">Lấy lại mật khẩu</h2>
      <p style="color:#444;line-height:1.6;">Mã OTP của bạn là:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:20px 0;">${otp}</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Forever Shop" <${from}>`,
    to,
    subject: 'Mã OTP đặt lại mật khẩu',
    html,
  });
};

export const sendRegisterOtpEmail = async ({ to, otp, expiresInSec = 180 }) => {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || 'your-verified-email@domain.com';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111;">
      <h2 style="margin:0 0 12px;">Xác thực đăng ký</h2>
      <p>Mã OTP của bạn là:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;margin:20px 0;">${otp}</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Forever Shop" <${from}>`,
    to,
    subject: 'Mã OTP đăng ký tài khoản',
    html,
  });
};

// Hàm sendVoucherGiftEmail tương tự...