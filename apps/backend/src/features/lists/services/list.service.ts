import { db } from "@/config/database";
import {
  INVITE_CODE_GENERATION_ATTEMPTS,
  LIST_EVENT_ACCESS_REVOKED,
  LIST_EVENT_DELETED,
  LIST_EVENT_ITEM_REMOVED,
  LIST_EVENT_ITEM_UPDATED,
  LIST_EVENT_MEMBER_JOINED,
  LIST_EVENT_MEMBER_LEFT,
  LIST_EVENT_UPDATED,
  MAX_LIST_ITEMS,
  MAX_LIST_MEMBERS,
  MAX_LISTS_PER_USER,
} from "@/constants";
import {
  closeListRoom,
  emitToList,
  emitToUser,
  removeUserFromListRoom,
} from "@/features/lists/lib/list.events";
import { generateShortCode } from "@/features/lists/utils/crypto";
import {
  AddListItemSchema,
  LIST_MAX_ITEM_QUANTITY,
  type UpdateListItemInput,
} from "@nearcommerce/api";
import type { PoolClient } from "pg";
import { z } from "zod";

export type ListRole = "OWNER" | "MEMBER";

// A failure the controller (or socket handler) can turn into a response.
export class ListError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ListError";
  }
}

const notFound = () => new ListError(404, "List not found", "LIST_NOT_FOUND");

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

export async function getMemberRole(
  listId: string,
  userId: string,
  client: Pick<PoolClient, "query"> = db,
): Promise<ListRole | null> {
  const { rows } = await client.query(
    `SELECT role FROM household_list_members WHERE list_id = $1 AND user_id = $2`,
    [listId, userId],
  );
  return rows.length ? (rows[0].role as ListRole) : null;
}

// Non-members get the same 404 as a missing list, so list ids can't be probed.
export async function requireMember(
  listId: string,
  userId: string,
): Promise<ListRole> {
  const role = await getMemberRole(listId, userId);
  if (!role) throw notFound();
  return role;
}

export async function requireOwner(
  listId: string,
  userId: string,
  forbiddenMessage: string,
): Promise<void> {
  const role = await requireMember(listId, userId);
  if (role !== "OWNER")
    throw new ListError(403, forbiddenMessage, "OWNER_ONLY");
}

async function inTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

const SUMMARY_SQL = `
  SELECT l.id, l.name, l.invite_code, l.created_at, m.role,
         (SELECT COUNT(*)::int FROM household_list_members WHERE list_id = l.id) AS member_count,
         (SELECT COUNT(*)::int FROM household_list_items WHERE list_id = l.id) AS item_count,
         (SELECT COUNT(*)::int FROM household_list_items WHERE list_id = l.id AND NOT is_checked) AS unchecked_count
    FROM household_lists l
    JOIN household_list_members m ON m.list_id = l.id AND m.user_id = $1`;

// Most recently joined first, so a list you just created or joined is the "current" one.
export async function listUserLists(userId: string) {
  const { rows } = await db.query(
    `${SUMMARY_SQL} ORDER BY m.joined_at DESC, l.id`,
    [userId],
  );
  return rows;
}

export async function getListSummary(listId: string, userId: string) {
  const { rows } = await db.query(`${SUMMARY_SQL} WHERE l.id = $2`, [
    userId,
    listId,
  ]);
  if (!rows.length) throw notFound();
  return rows[0];
}

export async function getCurrentList(userId: string) {
  const rows = await listUserLists(userId);
  if (!rows.length)
    throw new ListError(
      404,
      "You are not in any household list yet",
      "NO_LIST",
    );
  return rows[0];
}

export async function getListDetail(listId: string, userId: string) {
  const summary = await getListSummary(listId, userId);
  const [members, items] = await Promise.all([
    db.query(
      `SELECT m.user_id, m.role, m.joined_at, u.full_name
         FROM household_list_members m
         JOIN users u ON u.id = m.user_id
        WHERE m.list_id = $1
        ORDER BY (m.role = 'OWNER') DESC, m.joined_at ASC, m.id`,
      [listId],
    ),
    db.query(
      `SELECT * FROM household_list_items WHERE list_id = $1
        ORDER BY is_checked ASC, lower(item_name) ASC, id`,
      [listId],
    ),
  ]);
  return {
    ...summary,
    viewer_id: userId,
    members: members.rows,
    items: items.rows,
  };
}

export async function createList(userId: string, name: string) {
  const listId = await inTransaction(async (client) => {
    const count = await client.query(
      `SELECT COUNT(*)::int AS n FROM household_list_members WHERE user_id = $1`,
      [userId],
    );
    if (count.rows[0].n >= MAX_LISTS_PER_USER)
      throw new ListError(
        409,
        `You can be in at most ${MAX_LISTS_PER_USER} lists. Leave one first.`,
        "LIST_LIMIT",
      );

    for (
      let attempt = 0;
      attempt < INVITE_CODE_GENERATION_ATTEMPTS;
      attempt++
    ) {
      const created = await client.query(
        `INSERT INTO household_lists (name, invite_code) VALUES ($1, $2)
         ON CONFLICT (invite_code) DO NOTHING RETURNING id`,
        [name, generateShortCode()],
      );
      if (!created.rows.length) continue; // code collision, try another
      await client.query(
        `INSERT INTO household_list_members (list_id, user_id, role) VALUES ($1, $2, 'OWNER')`,
        [created.rows[0].id, userId],
      );
      return created.rows[0].id as string;
    }
    throw new Error("Could not allocate a unique invite code");
  });
  return getListSummary(listId, userId);
}

export async function joinList(userId: string, inviteCode: string) {
  const { listId, alreadyMember, fullName } = await inTransaction(
    async (client) => {
      const found = await client.query(
        `SELECT id FROM household_lists WHERE invite_code = $1 FOR UPDATE`,
        [inviteCode],
      );
      if (!found.rows.length)
        throw new ListError(
          404,
          "Invalid or expired invite code.",
          "INVALID_INVITE",
        );
      const id: string = found.rows[0].id;

      if (await getMemberRole(id, userId, client))
        return { listId: id, alreadyMember: true, fullName: "" };

      const members = await client.query(
        `SELECT COUNT(*)::int AS n FROM household_list_members WHERE list_id = $1`,
        [id],
      );
      if (members.rows[0].n >= MAX_LIST_MEMBERS)
        throw new ListError(409, "This list is full.", "LIST_FULL");

      const mine = await client.query(
        `SELECT COUNT(*)::int AS n FROM household_list_members WHERE user_id = $1`,
        [userId],
      );
      if (mine.rows[0].n >= MAX_LISTS_PER_USER)
        throw new ListError(
          409,
          `You can be in at most ${MAX_LISTS_PER_USER} lists. Leave one first.`,
          "LIST_LIMIT",
        );

      await client.query(
        `INSERT INTO household_list_members (list_id, user_id, role) VALUES ($1, $2, 'MEMBER')`,
        [id, userId],
      );
      const user = await client.query(
        `SELECT full_name FROM users WHERE id = $1`,
        [userId],
      );
      return {
        listId: id,
        alreadyMember: false,
        fullName: user.rows[0]?.full_name ?? "",
      };
    },
  );

  if (!alreadyMember)
    emitToList(listId, LIST_EVENT_MEMBER_JOINED, {
      list_id: listId,
      user_id: userId,
      full_name: fullName,
    });

  return {
    ...(await getListSummary(listId, userId)),
    already_member: alreadyMember,
  };
}

export async function renameList(listId: string, userId: string, name: string) {
  await requireOwner(
    listId,
    userId,
    "Only the list owner can rename the list.",
  );
  await db.query(`UPDATE household_lists SET name = $1 WHERE id = $2`, [
    name,
    listId,
  ]);
  emitToList(listId, LIST_EVENT_UPDATED, { list_id: listId, name });
  return getListSummary(listId, userId);
}

export async function deleteList(
  listId: string,
  userId: string,
): Promise<void> {
  await requireOwner(
    listId,
    userId,
    "Only the list owner can delete the list.",
  );
  await db.query(`DELETE FROM household_lists WHERE id = $1`, [listId]);
  emitToList(listId, LIST_EVENT_DELETED, { list_id: listId });
  closeListRoom(listId);
}

export async function regenerateInviteCode(
  listId: string,
  userId: string,
): Promise<string> {
  await requireOwner(
    listId,
    userId,
    "Only list owners can regenerate invite codes.",
  );
  for (let attempt = 0; attempt < INVITE_CODE_GENERATION_ATTEMPTS; attempt++) {
    const code = generateShortCode();
    const updated = await db.query(
      `UPDATE household_lists SET invite_code = $1
        WHERE id = $2 AND NOT EXISTS (SELECT 1 FROM household_lists WHERE invite_code = $1)
        RETURNING invite_code`,
      [code, listId],
    );
    if (updated.rows.length) {
      emitToList(listId, LIST_EVENT_UPDATED, {
        list_id: listId,
        invite_code: code,
      });
      return updated.rows[0].invite_code as string;
    }
  }
  throw new Error("Could not allocate a unique invite code");
}

// Leaving as the only member deletes the list; leaving as the owner hands ownership
// to the longest-standing member (same rule as account deletion, SRS 1.3.3).
export async function leaveList(listId: string, userId: string) {
  const outcome = await inTransaction(async (client) => {
    const locked = await client.query(
      `SELECT id FROM household_lists WHERE id = $1 FOR UPDATE`,
      [listId],
    );
    if (!locked.rows.length) throw notFound();
    const role = await getMemberRole(listId, userId, client);
    if (!role) throw notFound();

    const others = await client.query(
      `SELECT user_id FROM household_list_members
        WHERE list_id = $1 AND user_id <> $2 ORDER BY joined_at ASC, id ASC`,
      [listId, userId],
    );

    if (others.rows.length === 0) {
      await client.query(`DELETE FROM household_lists WHERE id = $1`, [listId]);
      return { listDeleted: true, newOwnerId: null as string | null };
    }

    let newOwnerId: string | null = null;
    if (role === "OWNER") {
      newOwnerId = others.rows[0].user_id as string;
      await client.query(
        `UPDATE household_list_members SET role = 'OWNER' WHERE list_id = $1 AND user_id = $2`,
        [listId, newOwnerId],
      );
    }
    await client.query(
      `DELETE FROM household_list_members WHERE list_id = $1 AND user_id = $2`,
      [listId, userId],
    );
    return { listDeleted: false, newOwnerId };
  });

  if (outcome.listDeleted) {
    emitToList(listId, LIST_EVENT_DELETED, { list_id: listId });
    closeListRoom(listId);
  } else {
    removeUserFromListRoom(listId, userId);
    emitToList(listId, LIST_EVENT_MEMBER_LEFT, {
      list_id: listId,
      user_id: userId,
      new_owner_id: outcome.newOwnerId,
    });
  }
  return outcome;
}

export async function removeMember(
  listId: string,
  ownerId: string,
  targetUserId: string,
) {
  await requireOwner(
    listId,
    ownerId,
    "Only the list owner can remove members.",
  );
  if (targetUserId === ownerId)
    throw new ListError(400, "Use leave to exit your own list.", "USE_LEAVE");

  const removed = await db.query(
    `DELETE FROM household_list_members WHERE list_id = $1 AND user_id = $2 RETURNING user_id`,
    [listId, targetUserId],
  );
  if (!removed.rows.length)
    throw new ListError(404, "Member not found", "MEMBER_NOT_FOUND");

  removeUserFromListRoom(listId, targetUserId);
  emitToUser(targetUserId, LIST_EVENT_ACCESS_REVOKED, { list_id: listId });
  emitToList(listId, LIST_EVENT_MEMBER_LEFT, {
    list_id: listId,
    user_id: targetUserId,
    removed: true,
  });
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

type AddItemInput = z.infer<typeof AddListItemSchema> & { user_id: string };

// Adds an item to a household list.
//  - Catalogue product already on the list: quantity is incremented and `is_checked`
//    reset (SRS 3.2.2). `already_on_list` lets clients show the "Item already on list" toast.
//  - Product name is copied into `custom_item_name` / `item_name` so deleting the product
//    later doesn't blank the line (orphan prevention, Implementation.md 3.2.3).
//  - Custom items with the same name (case-insensitive) are merged the same way.
export async function addListItem(input: AddItemInput) {
  const { list_id, product_id, custom_item_name, quantity, user_id } = input;
  await requireMember(list_id, user_id);

  const result = await inTransaction(async (client) => {
    let name: string;
    if (product_id) {
      const product = await client.query(
        `SELECT name FROM products WHERE id = $1`,
        [product_id],
      );
      if (!product.rows.length)
        throw new ListError(404, "Product not found", "PRODUCT_NOT_FOUND");
      name = product.rows[0].name;
    } else name = custom_item_name as string;

    // Row-level lock on the list serialises the size check with concurrent adds.
    await client.query(
      `SELECT id FROM household_lists WHERE id = $1 FOR UPDATE`,
      [list_id],
    );

    let existing: { id: string } | undefined;
    if (product_id) {
      existing = (
        await client.query(
          `SELECT id FROM household_list_items WHERE list_id = $1 AND product_id = $2`,
          [list_id, product_id],
        )
      ).rows[0];
    } else {
      existing = (
        await client.query(
          `SELECT id FROM household_list_items
            WHERE list_id = $1 AND product_id IS NULL AND lower(item_name) = lower($2)`,
          [list_id, name],
        )
      ).rows[0];
    }

    if (existing) {
      const updated = await client.query(
        `UPDATE household_list_items
            SET quantity = LEAST(quantity + $2, $3),
                is_checked = false,
                custom_item_name = COALESCE(custom_item_name, $4),
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 RETURNING *`,
        [existing.id, quantity, LIST_MAX_ITEM_QUANTITY, name],
      );
      return { item: updated.rows[0], already_on_list: true };
    }

    const count = await client.query(
      `SELECT COUNT(*)::int AS n FROM household_list_items WHERE list_id = $1`,
      [list_id],
    );
    if (count.rows[0].n >= MAX_LIST_ITEMS)
      throw new ListError(
        409,
        `A list can hold at most ${MAX_LIST_ITEMS} items.`,
        "LIST_ITEMS_LIMIT",
      );

    const inserted = await client.query(
      `INSERT INTO household_list_items
         (list_id, product_id, custom_item_name, item_name, quantity, added_by)
       VALUES ($1, $2, $3, $3, $4, $5) RETURNING *`,
      [list_id, product_id ?? null, name, quantity, user_id],
    );
    return { item: inserted.rows[0], already_on_list: false };
  });

  const payload = { ...result.item, already_on_list: result.already_on_list };
  emitToList(list_id, LIST_EVENT_ITEM_UPDATED, payload);
  return payload;
}

export async function updateListItem(
  listId: string,
  itemId: string,
  userId: string,
  patch: UpdateListItemInput,
) {
  await requireMember(listId, userId);

  const sets: string[] = [];
  const values: unknown[] = [];
  const add = (sql: (n: number) => string, value: unknown) => {
    values.push(value);
    sets.push(sql(values.length));
  };
  if (patch.is_checked !== undefined)
    add((n) => `is_checked = $${n}`, patch.is_checked);
  if (patch.quantity !== undefined)
    add((n) => `quantity = $${n}`, patch.quantity);
  if (patch.custom_item_name !== undefined) {
    add((n) => `custom_item_name = $${n}`, patch.custom_item_name);
    add((n) => `item_name = $${n}`, patch.custom_item_name);
  }

  values.push(itemId, listId);
  const { rows } = await db.query(
    `UPDATE household_list_items SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length - 1} AND list_id = $${values.length}
      RETURNING *`,
    values,
  );
  if (!rows.length)
    throw new ListError(404, "Item not found", "ITEM_NOT_FOUND");

  emitToList(listId, LIST_EVENT_ITEM_UPDATED, {
    ...rows[0],
    already_on_list: false,
  });
  return rows[0];
}

// Checks/unchecks an item addressed by either its product id or its own id. The mobile
// client sends `product_id ?? item.id`, so one lookup has to accept both.
export async function setItemChecked(
  listId: string,
  userId: string,
  ref: { productId?: string; itemId?: string },
  isChecked: boolean,
) {
  await requireMember(listId, userId);
  const key = ref.itemId ?? ref.productId;
  if (!key || !UUID_RE.test(key))
    throw new ListError(404, "Item not found", "ITEM_NOT_FOUND");

  const { rows } = await db.query(
    `UPDATE household_list_items
        SET is_checked = $3, updated_at = CURRENT_TIMESTAMP
      WHERE list_id = $1 AND (id = $2 OR product_id = $2)
      RETURNING *`,
    [listId, key, isChecked],
  );
  if (!rows.length)
    throw new ListError(404, "Item not found", "ITEM_NOT_FOUND");

  emitToList(listId, LIST_EVENT_ITEM_UPDATED, {
    ...rows[0],
    already_on_list: false,
  });
  return rows[0];
}

export async function deleteListItem(
  listId: string,
  itemId: string,
  userId: string,
) {
  await requireMember(listId, userId);
  const { rows } = await db.query(
    `DELETE FROM household_list_items WHERE id = $1 AND list_id = $2 RETURNING id`,
    [itemId, listId],
  );
  if (!rows.length)
    throw new ListError(404, "Item not found", "ITEM_NOT_FOUND");
  emitToList(listId, LIST_EVENT_ITEM_REMOVED, { list_id: listId, id: itemId });
}
