import { NextFunction, Request, Response } from "express";

//  Enforces specific user roles for route access.
export function requireRole(requiredRole: string | string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Assumes req.user is populated by requireAuth middleware
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Forbidden: Insufficient permissions." });
    }
    next();
  };
}
