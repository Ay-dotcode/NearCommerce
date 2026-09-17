import { db } from "@/config/database";
import redisClient from "@/config/redis";
import { Request, Response } from "express";

export async function toggleStoreSuspension(req: Request, res: Response) {
  const { storeId } = req.params;
  const adminId = req.user!.id;
  const { is_suspended, reason } = req.body;

  if (typeof is_suspended !== "boolean")
    return res.status(400).json({ error: "is_suspended must be a boolean." });

  try {
    await db.query("BEGIN");

    // 1. Update the store and fetch the owner_id to bust their cache
    const storeRes = await db.query(
      `UPDATE stores SET is_suspended = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 RETURNING id, owner_id, is_suspended`,
      [is_suspended, storeId],
    );

    if (storeRes.rows.length === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({ error: "Store not found." });
    }

    const store = storeRes.rows[0];

    // 2. Log the action
    await db.query(
      `INSERT INTO admin_audit_logs (admin_id, action, target_id, target_type, reason) 
       VALUES ($1, $2, $3, 'STORE', $4)`,
      [
        adminId,
        is_suspended ? "SUSPEND_STORE" : "UNSUSPEND_STORE",
        storeId,
        reason || null,
      ],
    );

    // 3. Immediately bust the Redis cache for the store owner
    try {
      if (redisClient.isOpen || typeof (redisClient as any).del === "function")
        await redisClient.del(`suspended:${store.owner_id}`);
    } catch (redisError) {
      console.error("[ADMIN] Redis cache bust error:", redisError);
    }
    await db.query("COMMIT");

    return res.status(200).json({
      message: `Store suspension set to ${is_suspended}`,
      data: store,
    });
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("[ADMIN] toggleStoreSuspension error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function deleteStore(req: Request, res: Response) {
  const { storeId } = req.params;
  const adminId = req.user!.id;
  const { reason } = req.body;

  try {
    await db.query("BEGIN");

    // 1. Fetch the row to serialize into the snapshot
    const storeRes = await db.query(`SELECT * FROM stores WHERE id = $1`, [
      storeId,
    ]);

    if (storeRes.rows.length === 0) {
      await db.query("ROLLBACK");
      return res.status(404).json({ error: "Store not found." });
    }

    const snapshot = storeRes.rows[0];

    // 2. Insert into audit logs with the pre-deletion snapshot
    await db.query(
      `INSERT INTO admin_audit_logs (admin_id, action, target_id, target_type, reason, snapshot) 
       VALUES ($1, 'DELETE_STORE', $2, 'STORE', $3, $4)`,
      [
        adminId,
        storeId,
        reason || "No reason provided",
        JSON.stringify(snapshot),
      ],
    );

    // 3. Hard delete the store (cascades to products, reviews, etc. based on schema)
    await db.query(`DELETE FROM stores WHERE id = $1`, [storeId]);

    // 4. Bust the Redis cache for the owner just in case
    try {
      if (redisClient.isOpen || typeof (redisClient as any).del === "function")
        await redisClient.del(`suspended:${snapshot.owner_id}`);
    } catch (redisError) {
      console.error("[ADMIN] Redis cache bust error:", redisError);
    }

    await db.query("COMMIT");

    return res
      .status(200)
      .json({ message: "Store successfully deleted and audited." });
  } catch (error) {
    await db.query("ROLLBACK");
    console.error("[ADMIN] deleteStore error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
