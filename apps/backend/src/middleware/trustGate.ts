import { db } from "@/config/database";
import { NextFunction, Request, Response } from "express";

// Enforces email_verified_at IS NOT NULL. Fails with 403 if the user is unverified.
export async function requireVerifiedEmail(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const result = await db.query(
      `SELECT email_verified_at FROM users WHERE id = $1`,
      [userId],
    );

    if (result.rows.length === 0 || result.rows[0].email_verified_at === null)
      return res.status(403).json({
        error: "Email verification is required to perform this action.",
      });
    next();
  } catch (error) {
    console.error("[TRUST GATE] Error verifying email status:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
