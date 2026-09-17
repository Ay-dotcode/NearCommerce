import { JWT_ACCESS_SECRET } from "@/constants";
import jwt, { SignOptions } from "jsonwebtoken";

// Generates a mock JWT access token for tests.
export function generateMockToken(
  userId: string,
  role: string = "CUSTOMER",
  expiresIn: SignOptions["expiresIn"] = "1h",
): string {
  return jwt.sign({ id: userId, role }, JWT_ACCESS_SECRET, { expiresIn });
}
