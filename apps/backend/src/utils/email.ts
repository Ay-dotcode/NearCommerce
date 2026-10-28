// Email functionality is completely disabled on this mock application.
// No emails (verification, password reset, or notifications) are sent.

export async function sendVerificationEmail(
  toEmail: string,
  rawToken: string,
): Promise<void> {
  // Disabled: no-op
}

export async function sendPasswordResetEmail(
  toEmail: string,
  rawToken: string,
): Promise<void> {
  // Disabled: no-op
}

// Dummy transporter export kept for backwards compatibility with tests/imports if needed
export const transporter = {
  sendMail: async () => ({ messageId: "mock-disabled" }),
};

