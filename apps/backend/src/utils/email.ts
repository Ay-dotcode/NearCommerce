import nodemailer from "nodemailer";

const smtpPort = Number(process.env.SMTP_PORT);

// Configure standard SMTP transporter using environment variables.
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Base URL of the store-owner portal, without a trailing slash so links never contain "//".
function frontendBaseUrl(): string {
  const url =
    process.env.FRONTEND_URL ||
    process.env.WEB_APP_URL ||
    "http://localhost:3001";
  return url.trim().replace(/\/+$/, "");
}

// Fails with a clear message instead of a confusing connection error to localhost.
function assertEmailConfigured(): void {
  if (!process.env.RESEND_API_KEY && !process.env.SMTP_HOST && !process.env.SMTP_PASS) {
    throw new Error("Neither RESEND_API_KEY nor SMTP_HOST is set, so no email can be sent");
  }
}

interface SendMailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
}

// Sends an email via Resend's HTTPS API or falls back to standard SMTP (Nodemailer).
// Using Resend's HTTPS API bypasses cloud provider firewall restrictions on SMTP ports (25, 465, 587).
async function dispatchMail(options: SendMailOptions): Promise<void> {
  const resendApiKey =
    process.env.RESEND_API_KEY ||
    (process.env.SMTP_PASS?.startsWith("re_") ? process.env.SMTP_PASS : undefined) ||
    (process.env.SMTP_HOST?.includes("resend.com") ? process.env.SMTP_PASS : undefined);

  if (resendApiKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: options.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend API failed (${response.status}): ${errorText}`);
    }
    return;
  }

  await transporter.sendMail(options);
}

// Sends account verification email with the 24-hour verification token.
export async function sendVerificationEmail(
  toEmail: string,
  rawToken: string,
): Promise<void> {
  if (process.env.NODE_ENV === "test") return;
  assertEmailConfigured();

  const verificationUrl = `${frontendBaseUrl()}/verify-email?token=${encodeURIComponent(rawToken)}`;

  await dispatchMail({
    from: process.env.EMAIL_FROM || "noreply@nearcommerce.local",
    to: toEmail,
    subject: "Verify your Near Commerce account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #123047;">Welcome to Near Commerce</h2>
        <p>Thank you for registering. Please click the button below to verify your email address:</p>
        <p style="margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Verify Email
          </a>
        </p>
        <p style="color: #64748b; font-size: 14px;">Or copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #2563eb; font-size: 14px;">${verificationUrl}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">This verification link works once and expires in 24 hours. If you did not create an account, you can safely ignore this email.</p>
      </div>
    `,
  });
}

// Sends password reset email with the 1-hour reset token.
export async function sendPasswordResetEmail(
  toEmail: string,
  rawToken: string,
): Promise<void> {
  if (process.env.NODE_ENV === "test") return;
  assertEmailConfigured();

  // The reset form lives in the web app; the API has no page at this path.
  const resetUrl = `${frontendBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;

  await dispatchMail({
    from: process.env.EMAIL_FROM || "noreply@nearcommerce.local",
    to: toEmail,
    subject: "Reset your Near Commerce password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #123047;">Reset Your Password</h2>
        <p>You recently requested to reset your password for your Near Commerce account. Click the button below to proceed:</p>
        <p style="margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="color: #64748b; font-size: 14px;">Or copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; color: #2563eb; font-size: 14px;">${resetUrl}</p>
        <p style="color: #64748b; font-size: 14px; margin-top: 24px;">Resetting from the Near Commerce mobile app? Paste this reset code into the app instead:</p>
        <p style="font-family: monospace; word-break: break-all; background: #f1f5f9; border-radius: 6px; padding: 12px; font-size: 14px; color: #0f172a;">${rawToken}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">The link and the code work once and expire in 1 hour. If you did not request a password reset, please disregard this email.</p>
      </div>
    `,
  });
}
