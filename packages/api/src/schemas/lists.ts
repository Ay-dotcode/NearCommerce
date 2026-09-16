import { z } from "zod";

export const AddListItemSchema = z
  .object({
    list_id: z.string().uuid(),
    product_id: z.string().uuid().optional(),
    custom_item_name: z.string().max(255).optional(),
    quantity: z.number().int().positive().default(1),
  })
  .refine((data) => data.product_id || data.custom_item_name, {
    message: "Must provide either a product_id or a custom_item_name",
    path: ["custom_item_name"],
  });

export const RegenerateInviteCodeSchema = z.object({
  list_id: z.string().uuid(),
});

export type AddListItemInput = z.infer<typeof AddListItemSchema>;
export type RegenerateInviteCodeInput = z.infer<typeof RegenerateInviteCodeSchema>;
