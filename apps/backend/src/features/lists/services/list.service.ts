import { db } from "@/config/database";
import { getIO } from "@/config/socket";
import { AddListItemSchema } from "@nearcommerce/api";
import { z } from "zod";

type AddItemInput = z.infer<typeof AddListItemSchema> & { user_id: string };

/**
 * Adds an item to a household list using an UPSERT strategy:
 * - If the (list_id, product_id) pair already exists, the quantity is
 *   incremented and `is_checked` is reset to false (re-activates checked items).
 * - On success the updated row is broadcast to all Socket.io clients in the
 *   `list:<list_id>` room.
 */
export const addListItem = async (input: AddItemInput) => {
  const { list_id, product_id, custom_item_name, quantity, user_id } = input;

  // The ON CONFLICT target only covers (list_id, product_id) for catalogue
  // products. Custom items always insert as new rows (no conflict path).
  const query = `
    INSERT INTO household_list_items (list_id, product_id, custom_item_name, quantity, added_by)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (list_id, product_id)
    DO UPDATE SET
      quantity   = household_list_items.quantity + EXCLUDED.quantity,
      is_checked = false
    RETURNING *;
  `;

  const result = await db.query(query, [
    list_id,
    product_id ?? null,
    custom_item_name ?? null,
    quantity,
    user_id,
  ]);

  const item = result.rows[0];

  // Notify all connected clients that are subscribed to this list's room.
  getIO().to(`list:${list_id}`).emit("list_item_updated", item);

  return item;
};
