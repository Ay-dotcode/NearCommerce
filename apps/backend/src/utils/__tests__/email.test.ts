import { sendPasswordResetEmail, transporter } from "@/utils/email";

describe("password reset email", () => {
  const env = process.env.NODE_ENV;
  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = env;
    jest.restoreAllMocks();
  });

  it("contains the reset link AND the reset code the mobile app asks for", async () => {
    // The mailer is skipped under NODE_ENV=test; pretend to be a real run for this test.
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    const sendMail = jest
      .spyOn(transporter, "sendMail")
      .mockResolvedValue({} as never);

    await sendPasswordResetEmail("shopper@example.com", "abc123token");

    const { html } = sendMail.mock.calls[0][0] as { html: string };
    expect(html).toContain("/reset-password?token=abc123token");
    expect(html).toMatch(/reset code/i);
    // The code itself is shown on its own, so it can be copied into the app.
    expect(html).toContain(">abc123token<");
  });
});
