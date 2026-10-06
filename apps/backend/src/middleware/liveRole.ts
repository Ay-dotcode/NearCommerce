import { db } from "@/config/database";
import { NextFunction, Request, Response } from "express";

// The JWT role is only refreshed every 15 minutes, so a demoted or suspended
// admin could keep using an old token. Admin routes re-read the user instead.
export function requireLiveRole(requiredRole: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { rows } = await db.query(
        `SELECT role, is_suspended FROM users WHERE id = $1`,
        [req.user?.id],
      );
      if (!rows.length) return res.status(401).json({ error: "Invalid token" });
      if (rows[0].is_suspended)
        return res.status(403).json({ error: "Account is suspended." });
      if (rows[0].role !== requiredRole)
        return res
          .status(403)
          .json({ error: "Forbidden: Insufficient permissions." });
      return next();
    } catch (error) {
      console.error("[AUTH] Live role check failed:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };
}
