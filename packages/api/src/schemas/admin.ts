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

export const CreateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  iconUrl: z
    .string()
    .trim()
    .url("Icon URL must be http(s)")
    .refine((u) => /^https?:\/\//i.test(u), "Icon URL must be http(s)")
    .nullable()
    .optional(),
});

export const CreateSubcategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type CreateSubcategoryInput = z.infer<typeof CreateSubcategorySchema>;
