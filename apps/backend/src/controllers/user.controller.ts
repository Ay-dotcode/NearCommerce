import { db } from "@/config/database";
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

    const { rows: ownedLists } = await client.query(
      `SELECT list_id FROM household_list_members WHERE user_id = $1 AND role = 'OWNER'`,
      [userId],
    );

    for (const list of ownedLists) {
      const { rows: otherMembers } = await client.query(
        `SELECT user_id FROM household_list_members 
         WHERE list_id = $1 AND user_id != $2 
         ORDER BY joined_at ASC LIMIT 1`,
        [list.list_id, userId],
      );

      if (otherMembers.length > 0)
        await client.query(
          `UPDATE household_list_members SET role = 'OWNER' WHERE list_id = $1 AND user_id = $2`,
          [list.list_id, otherMembers[0].user_id],
        );
      else
        await client.query(`DELETE FROM household_lists WHERE id = $1`, [
          list.list_id,
        ]);
    }

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
