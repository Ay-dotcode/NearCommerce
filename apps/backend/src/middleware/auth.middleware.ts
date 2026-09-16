import redisClient from "@/config/redis";
import { JWT_ACCESS_SECRET } from "@/constants";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res
        .status(401)
        .json({ error: "Missing or invalid authorization header" });

    const token = authHeader.split(" ")[1];

    // 1. Verify the JWT signature and expiry
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as {
      id: string;
      role: string;
    };

    // 2. Real-Time Suspension Check via Redis (SRS Rule 1.3.2)
    let isSuspended: string | null = null;
    try {
      if (redisClient.isOpen)
        isSuspended = await redisClient.get(`suspended:${decoded.id}`);
    } catch (redisError) {
      console.error("[AUTH] Redis check error:", redisError);
    }

    if (isSuspended === "true")
      return res.status(403).json({ error: "Account is suspended." });

    // 3. Attach user to request
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError)
      return res.status(401).json({ error: "Access token expired" });
    return res.status(401).json({ error: "Invalid token" });
  }
};
