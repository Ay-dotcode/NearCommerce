import type { PoolClient } from "pg";

export async function releaseHouseholdLists(
  client: Pick<PoolClient, "query">,
  userId: string,
) {
  const { rows: ownedLists } = await client.query(
    `SELECT list_id FROM household_list_members
      WHERE user_id = $1 AND role = 'OWNER'`,
    [userId],
  );

  let transferred = 0;
  let deleted = 0;
  for (const list of ownedLists) {
    const { rows: others } = await client.query(
      `SELECT user_id FROM household_list_members
        WHERE list_id = $1 AND user_id != $2
        ORDER BY joined_at ASC, id ASC LIMIT 1`,
      [list.list_id, userId],
    );

    if (others.length) {
      await client.query(
        `UPDATE household_list_members SET role = 'OWNER'
          WHERE list_id = $1 AND user_id = $2`,
        [list.list_id, others[0].user_id],
      );
      transferred++;
    } else {
      await client.query(`DELETE FROM household_lists WHERE id = $1`, [
        list.list_id,
      ]);
      deleted++;
    }
  }
  return { transferred, deleted };
}
