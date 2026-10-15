import { CreateSubcategorySchema } from "@nearcommerce/api";

export interface NameValues {
  name: string;
}

// Categories and subcategories share one rule for names (1-100 characters), so one schema.
export function validateName(values: NameValues) {
  const parsed = CreateSubcategorySchema.safeParse(values);
  return parsed.success ? {} : { name: parsed.error.issues[0].message };
}

export const parseName = (values: NameValues) =>
  CreateSubcategorySchema.parse(values).name;
