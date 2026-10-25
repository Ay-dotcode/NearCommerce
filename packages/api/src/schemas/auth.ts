import { z } from "zod";

// Emails are stored trimmed and lowercase, so every endpoint that looks one up must normalise
// it the same way. Otherwise "Joe@Example.com" registers fine but can't log in or get emails.
const EmailSchema = z.string().trim().toLowerCase().email("Invalid email address");

export const RegisterSchema = z
  .object({
    email: EmailSchema,
    password: z.string().min(8, "Password must be at least 8 characters"),
    full_name: z.string().min(2, "Full name must be at least 2 characters"),
    role: z.enum(["CUSTOMER", "STORE_OWNER"]).default("CUSTOMER"),
  })
  .strict();

export const VerifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export const ResendVerificationSchema = z.object({
  email: EmailSchema,
});

export const ForgotPasswordSchema = z.object({
  email: EmailSchema,
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  new_password: z.string().min(8, "Password must be at least 8 characters"),
});

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof ResendVerificationSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

export const RefreshTokenSchema = z.object({
  refresh_token: z.string().min(1, "Refresh token is required"),
});

export const LogoutSchema = RefreshTokenSchema;

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
