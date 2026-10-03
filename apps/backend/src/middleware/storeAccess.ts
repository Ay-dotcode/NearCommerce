import { db } from "@/config/database";
import { STORE_KEY } from "@/constants";
import { isUuid } from "@/utils/http";
import { NextFunction, Request, Response } from "express";

export function requireStoreAccess(source: "header" | "param" = "header") {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const raw =
      source === "param" ? req.params.storeId : req.headers[STORE_KEY];
    const storeId = Array.isArray(raw) ? raw[0] : raw;

    if (!storeId)
      return res.status(400).json({
        error:
          source === "param" ? "Missing store id" : "Missing X-Store-ID header",
      });
    if (!isUuid(storeId))
      return res.status(400).json({ error: "Invalid store id" });

    try {
      const result = await db.query(
        `SELECT id, owner_id, is_suspended FROM stores WHERE id = $1`,
        [storeId],
      );
      if (result.rows.length === 0)
        return res.status(404).json({ error: "Store not found" });

      const store = result.rows[0];
      if (store.owner_id !== req.user.id)
        return res
          .status(403)
          .json({ error: "You do not have access to this store" });

      req.store = {
        id: store.id,
        ownerId: store.owner_id,
        isSuspended: store.is_suspended,
      };
      return next();
    } catch (error) {
      console.error("[STORE ACCESS] lookup failed:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };
}
