import { z } from "zod";
import { StoreOpeningHoursSchema } from "./schemas/store";
export * from "./schemas/auth";
export * from "./schemas/lists";
export * from "./schemas/search";
export * from "./schemas/store";

// Enums
export const UserRoleSchema = z.enum([
  "CUSTOMER",
  "STORE_OWNER",
  "SYSTEM_ADMIN",
]);
export const MemberRoleSchema = z.enum(["OWNER", "MEMBER"]);

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const CreateStoreSchema = z.object({
  name: z.string().min(2, "Store name is required").max(255),
  description: z.string().optional(),
  address: z.string().min(5, "Full address is required"),
  latitude: z.number().min(-90, "Invalid latitude").max(90, "Invalid latitude"),
  longitude: z
    .number()
    .min(-180, "Invalid longitude")
    .max(180, "Invalid longitude"),
  timezone: z.string().default("UTC"),
  openingHours: StoreOpeningHoursSchema,
});

// Products & Inventory
export const CreateProductSchema = z
  .object({
    subcategoryId: z.string().uuid().optional(),
    name: z.string().min(2, "Product name is required").max(255),
    description: z.string().optional(),
    price: z.number().positive("Price must be greater than zero"),
    quantity: z
      .number()
      .int()
      .nonnegative("Quantity cannot be negative")
      .default(0),
    imageUrl: z.string().url("Invalid image URL").max(512).optional(),
    isPublished: z.boolean().default(false),
  })
  // Enforces the publish_image_check constraint from the database
  .refine((data) => !data.isPublished || data.imageUrl, {
    message: "Product cannot be published without an uploaded image",
    path: ["isPublished"],
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

// Reviews & Ratings
export const CreateReviewSchema = z
  .object({
    storeId: z.string().uuid().optional(),
    productId: z.string().uuid().optional(),
    rating: z
      .number()
      .int()
      .min(1, "Rating must be at least 1")
      .max(5, "Rating cannot exceed 5"),
    comment: z.string().optional(),
  })
  // Enforces the review_target_check constraint from the database
  .refine(
    (data) =>
      (data.storeId && !data.productId) || (!data.storeId && data.productId),
    {
      message: "Review must target exactly one store OR one product",
      path: ["productId"],
    },
  );

// Type Exports for Frontend & Backend
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateStoreInput = z.infer<typeof CreateStoreSchema>;
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type AddHouseholdListItemInput = z.infer<
  typeof AddHouseholdListItemSchema
>;
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
