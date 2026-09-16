import { VERIFICATION_TOKEN_BYTES } from "@/constants";
import crypto from "crypto";

export function generateVerificationToken() {
  const rawToken = crypto.randomBytes(VERIFICATION_TOKEN_BYTES).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}
