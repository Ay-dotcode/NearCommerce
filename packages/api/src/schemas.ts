import { z } from "zod";
import { UserRole } from "./types/roles";
export * from "./schemas/admin";
export * from "./schemas/auth";
export * from "./schemas/catalog";
export * from "./schemas/lists";
export * from "./schemas/product";
export * from "./schemas/review";
export * from "./schemas/search";
export * from "./schemas/store";

export const UserRoleSchema = z.nativeEnum(UserRole);
export const MemberRoleSchema = z.enum(["OWNER", "MEMBER"]);

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Shared Household Lists
export const CreateHouseholdListSchema = z.object({
  name: z.string().min(1, "List name is required").max(100),
});

export const AddHouseholdListItemSchema = z
  .object({
    productId: z.string().uuid().optional(),
    customItemName: z.string().max(255).optional(),
    quantity: z
      .number()
      .int()
      .positive("Quantity must be at least 1")
      .default(1),
  })
  // Ensures either a product from the database or a custom text entry is provided
  .refine((data) => data.productId || data.customItemName, {
    message: "Must provide either a product ID or a custom item name",
    path: ["customItemName"],
  });

// Type Exports for Frontend & Backend
export type LoginInput = z.infer<typeof LoginSchema>;
export type AddHouseholdListItemInput = z.infer<
  typeof AddHouseholdListItemSchema
>;
