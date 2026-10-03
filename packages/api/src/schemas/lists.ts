import { z } from "zod";

/** Largest quantity a single list line can hold. */
export const LIST_MAX_ITEM_QUANTITY = 999;

const uuid = z.string().uuid();

const listName = z
  .string()
  .trim()
  .min(1, "List name is required")
  .max(100, "List name must be 100 characters or fewer");

// ---------------------------------------------------------------------------
// REST bodies
// ---------------------------------------------------------------------------

export const AddListItemSchema = z
  .object({
    list_id: uuid,
    product_id: uuid.optional(),
    custom_item_name: z.string().trim().min(1).max(255).optional(),
    quantity: z
      .number()
      .int()
      .positive()
      .max(
        LIST_MAX_ITEM_QUANTITY,
        `Quantity cannot exceed ${LIST_MAX_ITEM_QUANTITY}`,
      )
      .default(1),
  })
  .refine((data) => data.product_id || data.custom_item_name, {
    message: "Must provide either a product_id or a custom_item_name",
    path: ["custom_item_name"],
  });

export const RegenerateInviteCodeSchema = z.object({
  list_id: uuid,
});

export const CreateListSchema = z.object({ name: listName });
export const RenameListSchema = z.object({ name: listName });

/** Invite codes are case-insensitive; normalise to upper case before lookup. */
export const JoinListSchema = z.object({
  invite_code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{4,10}$/, "Enter a valid invite code"),
});

export const UpdateListItemSchema = z
  .object({
    is_checked: z.boolean().optional(),
    quantity: z
      .number()
      .int()
      .min(1, "Quantity must be at least 1")
      .max(LIST_MAX_ITEM_QUANTITY)
      .optional(),
    custom_item_name: z.string().trim().min(1).max(255).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

// ---------------------------------------------------------------------------
// Route params
// ---------------------------------------------------------------------------

export const ListIdParamSchema = z.object({ list_id: uuid });
export const ListItemParamsSchema = z.object({ list_id: uuid, item_id: uuid });
export const ListMemberParamsSchema = z.object({
  list_id: uuid,
  user_id: uuid,
});

// ---------------------------------------------------------------------------
// Socket payloads (camelCase, matching apps/mobile/types/socket.ts)
// ---------------------------------------------------------------------------

export const SocketAddItemSchema = z
  .object({
    listId: uuid,
    productId: uuid.optional(),
    customItemName: z.string().trim().min(1).max(255).optional(),
    quantity: z
      .number()
      .int()
      .positive()
      .max(LIST_MAX_ITEM_QUANTITY)
      .default(1),
  })
  .refine((data) => data.productId || data.customItemName, {
    message: "Must provide either a productId or a customItemName",
    path: ["productId"],
  });

/** The mobile client sends `productId` but falls back to the item id for custom items. */
export const SocketToggleItemSchema = z
  .object({
    listId: uuid,
    productId: uuid.optional(),
    itemId: uuid.optional(),
    isChecked: z.boolean(),
  })
  .refine((data) => data.productId || data.itemId, {
    message: "Must provide a productId or an itemId",
    path: ["itemId"],
  });

export const SocketRemoveItemSchema = z.object({ listId: uuid, itemId: uuid });

export type AddListItemInput = z.infer<typeof AddListItemSchema>;
export type RegenerateInviteCodeInput = z.infer<
  typeof RegenerateInviteCodeSchema
>;
export type CreateListInput = z.infer<typeof CreateListSchema>;
export type JoinListInput = z.infer<typeof JoinListSchema>;
export type UpdateListItemInput = z.infer<typeof UpdateListItemSchema>;
export type SocketAddItemInput = z.infer<typeof SocketAddItemSchema>;
export type SocketToggleItemInput = z.infer<typeof SocketToggleItemSchema>;
