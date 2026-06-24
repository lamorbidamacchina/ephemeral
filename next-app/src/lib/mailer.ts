import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host:       process.env.SMTP_HOST,
  port:       Number(process.env.SMTP_PORT) || 587,
  secure:     false,     // STARTTLS on port 587
  requireTLS: true,      // refuse connection if STARTTLS unavailable
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify/${token}`;

  await transporter.sendMail({
    from: `"Ephemeral" <${process.env.SMTP_FROM}>`,
    to:      email,
    subject: 'Verify your email address',
    html: `
      <p>Thanks for signing up.</p>
      <p>Click the link below to verify your email address. This link expires in 24 hours.</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>If you did not create an account, you can ignore this email.</p>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/${token}`;

  await transporter.sendMail({
    from:    `"Ephemeral" <${process.env.SMTP_FROM}>`,
    to:      email,
    subject: 'Reset your password',
    html: `
      <p>You requested a password reset.</p>
      <p>Click the link below to set a new password. This link expires in 1 hour.</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
}

export async function sendInviteEmail(inviterEmail: string, toEmail: string, token: string) {
  const registerUrl = `${process.env.NEXT_PUBLIC_APP_URL}/register?ref=${token}`;

  await transporter.sendMail({
    from:    `"Ephemeral" <${process.env.SMTP_FROM}>`,
    to:      toEmail,
    subject: `${inviterEmail} invited you to join Ephemeral`,
    html: `
      <p><strong>${inviterEmail}</strong> invited you to join Ephemeral — a private messaging app where messages disappear after being read, leaving no trace.</p>
      <p><a href="${registerUrl}">Join Ephemeral</a></p>
      <p style="color:#888;font-size:12px;">If you don't want to join, you can ignore this email.</p>
    `,
  });
}