import crypto from "crypto";
import { generateVerificationToken } from "@/features/auth/utils/crypto";

describe("Crypto Utils", () => {
  it("should generate a raw token and a valid SHA-256 hash", () => {
    const { rawToken, tokenHash } = generateVerificationToken();

    expect(rawToken).toBeDefined();
    expect(tokenHash).toBeDefined();

    // Verify the hash is actually SHA-256
    const expectedHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    expect(tokenHash).toBe(expectedHash);
  });
});
