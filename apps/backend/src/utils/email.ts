import nodemailer from "nodemailer";

/**
 * Configure standard SMTP transporter using environment variables.
 */
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Sends account verification email with the 24-hour verification token.
 */
export async function sendVerificationEmail(
  toEmail: string,
  rawToken: string,
): Promise<void> {
  if (process.env.NODE_ENV === "test") return;

  const baseUrl = process.env.VITE_API_URL || "http://localhost:4000";
  const verificationUrl = `${baseUrl}/auth/verify-email?token=${encodeURIComponent(rawToken)}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "noreply@nearcommerce.local",
    to: toEmail,
    subject: "Verify your NearCommerce account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #123047;">Welcome to NearCommerce</h2>
        <p>Thank you for registering. Please click the button below to verify your email address:</p>
        <p style="margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Verify Email
          </a>
        </p>
        <p style="color: #64748b; font-size: 14px;">Or copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #2563eb; font-size: 14px;">${verificationUrl}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">This verification link will expire in 24 hours. If you did not create an account, you can safely ignore this email.</p>
      </div>
    `,
  });
}

/**
 * Sends password reset email with the 1-hour reset token.
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  rawToken: string,
): Promise<void> {
  if (process.env.NODE_ENV === "test") return;

  const baseUrl = process.env.VITE_API_URL || "http://localhost:4000";
  const resetUrl = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(rawToken)}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "noreply@nearcommerce.local",
    to: toEmail,
    subject: "Reset your NearCommerce password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #123047;">Reset Your Password</h2>
        <p>You recently requested to reset your password for your NearCommerce account. Click the button below to proceed:</p>
        <p style="margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="color: #64748b; font-size: 14px;">Or copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #2563eb; font-size: 14px;">${resetUrl}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">This reset link will expire in 1 hour. If you did not request a password reset, please disregard this email.</p>
      </div>
    `,
  });
}
