// src/utils/emailService.js
export async function sendVerificationEmail(email, token) {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const link = `${baseUrl}/verify-email?token=${token}`;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'SAMS Admission System', email: process.env.SMTP_USER },
      to: [{ email }],
      subject: 'Verify your email - SAMS',
      htmlContent: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#0b1120">Verify your email address</h2>
          <p>Thank you for registering. Click the button below to verify your email.</p>
          <a href="${link}" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Verify Email
          </a>
          <p style="color:#888;font-size:0.85rem">This link expires in 24 hours.</p>
          <p style="color:#aaa;font-size:0.8rem">Or copy: ${link}</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    console.error('=== BREVO API ERROR ===', err);
    throw new Error(`Brevo API error: ${err.message}`);
  }

  console.log('=== EMAIL SENT OK via Brevo API ===');
}
