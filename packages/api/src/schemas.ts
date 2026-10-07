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

import { AddListItemSchema } from "./schemas/lists";

export const UserRoleSchema = z.nativeEnum(UserRole);
export const MemberRoleSchema = z.enum(["OWNER", "MEMBER"]);

// Type Exports for Frontend & Backend
export type AddHouseholdListItemInput = z.infer<typeof AddListItemSchema>;
