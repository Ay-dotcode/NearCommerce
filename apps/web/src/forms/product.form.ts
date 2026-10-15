import { IMAGE_URL_PATTERN } from "@/helpers/image";
import { hasValidPriceDecimals } from "@/helpers/products";
import type { Category } from "@/types/categories";
import type { StoreProduct } from "@/types/products";
import * as Yup from "yup";

// What the product form edits. Numbers are kept as text while typing.
export interface ProductFormValues {
  name: string;
  description: string;
  price: string;
  quantity: string;
  imageUrl: string;
  isPublished: boolean;
  categoryId: string;
  subcategoryId: string;
}

// Shown when a typed image link does not load as an image.
export const NOT_AN_IMAGE =
  "That link doesn't lead to an image. Check the URL, or upload a photo instead.";

// The fields the server can reject; its errors are shown on the matching input.
export const FIELD_NAMES = [
  "name",
  "description",
  "price",
  "quantity",
  "imageUrl",
  "isPublished",
  "subcategoryId",
] as const;
export type FieldName = (typeof FIELD_NAMES)[number];

// Validation rules for the form.
export const ProductSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .min(2, "Enter at least 2 characters")
    .max(255)
    .required("Product name is required"),
  price: Yup.number()
    .typeError("Enter a price")
    .moreThan(0, "Price must be greater than zero")
    .max(99_999_999.99, "Price is too large")
    .test(
      "decimals",
      "Price can have at most 2 decimal places",
      hasValidPriceDecimals,
    )
    .required("Price is required"),
  quantity: Yup.number()
    .typeError("Enter a quantity")
    .integer("Use a whole number")
    .min(0, "Quantity can't be negative")
    .required("Quantity is required"),
  description: Yup.string().max(
    5000,
    "Keep the description under 5000 characters",
  ),
  imageUrl: Yup.string()
    .trim()
    .max(512)
    .test(
      "url",
      "Enter a valid http(s) image URL",
      (v) => !v || IMAGE_URL_PATTERN.test(v),
    ),
  isPublished: Yup.boolean().test(
    "needs-image",
    "Add an image before publishing",
    function (v) {
      return !v || Boolean(this.parent.imageUrl?.trim());
    },
  ),
});

// Starting values: blank for a new product, the product's own values when editing.
export function productInitialValues(
  product?: StoreProduct,
  categories: Category[] = [],
): ProductFormValues {
  const categoryId = product?.subcategory_id
    ? (categories.find((c) =>
        c.subcategories.some((s) => s.id === product.subcategory_id),
      )?.id ?? "")
    : "";
  return {
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product ? String(product.price) : "",
    quantity: product ? String(product.quantity) : "",
    imageUrl: product?.image_url ?? "",
    isPublished: product?.is_published ?? false,
    categoryId,
    subcategoryId: categoryId ? (product?.subcategory_id ?? "") : "",
  };
}

// The request body. When editing, cleared optional fields are sent as null so they are really
// removed; the subcategory is only sent when the picker was shown.
export function toProductPayload(
  values: ProductFormValues,
  { editing, showCategories }: { editing: boolean; showCategories: boolean },
) {
  return {
    name: values.name.trim(),
    description: values.description.trim() || (editing ? null : undefined),
    price: Number(values.price),
    quantity: Number(values.quantity),
    imageUrl: values.imageUrl.trim() || (editing ? null : undefined),
    isPublished: values.isPublished,
    ...(showCategories && {
      subcategoryId: values.subcategoryId || (editing ? null : undefined),
    }),
  };
}
