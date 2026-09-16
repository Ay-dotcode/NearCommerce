import { INVITE_CODE_BYTES } from "@/constants";
import crypto from "crypto";

// Generates a short, human-friendly invite code.e.g. "A1B2C3D4"
export const generateShortCode = (): string =>
  crypto.randomBytes(INVITE_CODE_BYTES).toString("hex").toUpperCase();
