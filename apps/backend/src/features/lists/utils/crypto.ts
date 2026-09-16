import crypto from "crypto";

// Generates a short, human-friendly invite code.e.g. "A1B2C3D4"
export const generateShortCode = (): string =>
  crypto.randomBytes(4).toString("hex").toUpperCase();
