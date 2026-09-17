import { db } from "@/config/database";
import { isStoreOpen } from "@/utils/storeStatus";
import { Request, Response } from "express";

export async function getStoreDetails(req: Request, res: Response) {
  const { storeId } = req.params;

  try {
    const result = await db.query(
      `SELECT id, name, timezone, opening_hours, latitude, longitude
       FROM stores 
       WHERE id = $1 AND is_suspended = false`,
      [storeId],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Store not found or suspended" });
    const store = result.rows[0];
    const isOpen = isStoreOpen(store.opening_hours, store.timezone);

    return res.status(200).json({
      data: {
        ...store,
        is_open_now: isOpen,
      },
    });
  } catch (error) {
    console.error("Get store details error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
