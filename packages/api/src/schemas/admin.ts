import { z } from "zod";

export const PaginationQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).default("1"),
  limit: z.string().regex(/^\d+$/).default("20"),
});

export const ToggleSuspensionSchema = z.object({
  is_suspended: z.boolean(),
  reason: z.string().min(5),
});

export const AdminDeleteSchema = z.object({
  reason: z.string().min(5),
});
