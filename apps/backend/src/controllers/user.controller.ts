import { db } from "@/config/database";
import { releaseHouseholdLists } from "@/services/account.service";
import { Request, Response } from "express";

export const deleteAccount = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const { rows: userRows } = await client.query(
      "SELECT role FROM users WHERE id = $1",
      [userId],
    );
    if (!userRows.length) throw new Error("User not found.");
    if (userRows[0].role === "SYSTEM_ADMIN")
      throw new Error(
        "SYSTEM_ADMIN cannot self-delete. Account must be demoted first.",
      );

    await releaseHouseholdLists(client, userId);

    await client.query("DELETE FROM users WHERE id = $1", [userId]);

    await client.query("COMMIT");
    return res.status(200).json({ message: "Account successfully deleted." });
  } catch (error: any) {
    await client.query("ROLLBACK");
    return res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
};
