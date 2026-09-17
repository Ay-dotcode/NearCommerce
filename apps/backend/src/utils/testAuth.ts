import { db } from "@/config/database";
import { JWT_ACCESS_SECRET } from "@/constants";
import jwt, { SignOptions } from "jsonwebtoken";

// Generates a mock JWT access token for tests.
export function generateMockToken(
  userOrId: string | { id: string; role?: string },
  role: string = "CUSTOMER",
  expiresIn: SignOptions["expiresIn"] = "1h",
): string {
  if (typeof userOrId === "object" && userOrId !== null)
    return jwt.sign(
      { id: userOrId.id, role: userOrId.role || "CUSTOMER" },
      JWT_ACCESS_SECRET,
      { expiresIn },
    );
  return jwt.sign({ id: userOrId, role }, JWT_ACCESS_SECRET, { expiresIn });
}

export async function generateMockUserWithRole(
  role: "CUSTOMER" | "STORE_OWNER" | "SYSTEM_ADMIN",
  emailPrefix: string = "user",
): Promise<{ id: string; email: string; role: string }> {
  const uniqueEmail = `${emailPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@admin.test`;
  const result = await db.query(
    `INSERT INTO users (email, password_hash, full_name, role, email_verified_at)
     VALUES ($1, 'hashed_pwd', 'Mock User', $2, NOW())
     RETURNING id, email, role`,
    [uniqueEmail, role],
  );
  return result.rows[0];
}
