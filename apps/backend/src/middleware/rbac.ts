import { NextFunction, Request, Response } from "express";

//  Enforces specific user roles for route access.
export function requireRole(requiredRole: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Assumes req.user is populated by requireAuth middleware
    if (!req.user || req.user.role !== requiredRole) {
      return res
        .status(403)
        .json({ error: "Forbidden: Insufficient permissions." });
    }
    next();
  };
}
