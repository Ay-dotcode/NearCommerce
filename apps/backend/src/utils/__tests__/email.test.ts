// ---------------------------------------------------------------------------
// email.test.ts — unit tests for the email-dispatch helpers.
// Kept as describe.skip so the tests compile and can be re-enabled in one
// line when email sending is switched back on.  Do NOT delete this file.
// To re-enable: change `describe.skip` → `describe` and remove this comment.
// ---------------------------------------------------------------------------
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
  transporter,
} from "@/utils/email";

const env = process.env as Record<string, string | undefined>;

describe.skip("auth emails", () => {
  const saved = { ...env };
  beforeEach(() => {
    // The mailer is skipped under NODE_ENV=test; pretend to be a real run.
    env.NODE_ENV = "development";
    env.SMTP_HOST = "smtp.example.test";
    env.FRONTEND_URL = "http://localhost:3001";
  });
  afterEach(() => {
    for (const key of ["NODE_ENV", "SMTP_HOST", "FRONTEND_URL"])
      env[key] = saved[key];
    jest.restoreAllMocks();
  });

  const mockSend = () =>
    jest.spyOn(transporter, "sendMail").mockResolvedValue({} as never);
  const sent = (spy: ReturnType<typeof mockSend>) =>
    spy.mock.calls[0][0] as { html: string; to: string; subject: string };

  describe("password reset", () => {
    it("contains the reset link AND the reset code the mobile app asks for", async () => {
      const sendMail = mockSend();

      await sendPasswordResetEmail("shopper@example.com", "abc123token");

      const { html } = sent(sendMail);
      expect(html).toContain("/reset-password?token=abc123token");
      expect(html).toMatch(/reset code/i);
      // The code itself is shown on its own, so it can be copied into the app.
      expect(html).toContain(">abc123token<");
    });

    it("is addressed to the user and says what it is", async () => {
      const sendMail = mockSend();
      await sendPasswordResetEmail("shopper@example.com", "t");
      expect(sent(sendMail)).toMatchObject({
        to: "shopper@example.com",
        subject: expect.stringMatching(/reset your .*password/i),
      });
    });
  });

  describe("email verification", () => {
    it("links to the web app's verify page with the token", async () => {
      const sendMail = mockSend();
      await sendVerificationEmail("owner@example.com", "tok/en+1");
      const { html, to } = sent(sendMail);
      expect(to).toBe("owner@example.com");
      expect(html).toContain(
        `http://localhost:3001/verify-email?token=${encodeURIComponent("tok/en+1")}`,
      );
    });
  });

  describe("links", () => {
    it.each(["https://portal.example.com/", "https://portal.example.com///"])(
      "never doubles the slash when FRONTEND_URL ends with one (%s)",
      async (url) => {
        env.FRONTEND_URL = url;
        const verify = mockSend();
        await sendVerificationEmail("a@example.com", "t1");
        expect(sent(verify).html).toContain(
          "https://portal.example.com/verify-email?token=t1",
        );
        verify.mockClear();
        await sendPasswordResetEmail("a@example.com", "t2");
        expect(sent(verify).html).toContain(
          "https://portal.example.com/reset-password?token=t2",
        );
      },
    );
  });

  describe("without SMTP configured", () => {
    it("fails with a clear message instead of trying localhost", async () => {
      delete env.SMTP_HOST;
      const sendMail = mockSend();
      await expect(
        sendVerificationEmail("a@example.com", "t"),
      ).rejects.toThrow(/SMTP_HOST/);
      await expect(
        sendPasswordResetEmail("a@example.com", "t"),
      ).rejects.toThrow(/SMTP_HOST/);
      expect(sendMail).not.toHaveBeenCalled();
    });

    it("does nothing at all under NODE_ENV=test", async () => {
      env.NODE_ENV = "test";
      delete env.SMTP_HOST;
      const sendMail = mockSend();
      await sendPasswordResetEmail("a@example.com", "t");
      expect(sendMail).not.toHaveBeenCalled();
    });
  });
});
