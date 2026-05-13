// src/utils/emailService.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(email, token) {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const link = `${baseUrl}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `"SAMS Admission System" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Verify your email – SAMS',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#0b1120">Verify your email address</h2>
        <p>Thank you for registering. Click the button below to verify your email.</p>
        <a href="${link}" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Verify Email
        </a>
        <p style="color:#888;font-size:0.85rem">This link expires in 24 hours. If you did not register, ignore this email.</p>
        <p style="color:#aaa;font-size:0.8rem">Or copy this link: ${link}</p>
      </div>
    `,
  });
}
