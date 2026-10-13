import { createProduct, updateProduct } from "@/api/products";
import {
  checkImageUrl,
  IMAGE_URL_PATTERN,
} from "@/features/products/lib/image";
import { useImageUrlCheck } from "@/features/products/lib/useImageUrlCheck";
import { ProductImagePicker } from "@/features/products/ui/ProductImagePicker";
import type { Category } from "@/types/categories";
import type { StoreProduct } from "@/types/products";
import { hasAtMostTwoDecimals, parseApiError } from "@nearcommerce/api";
import {
  Button,
  FormSelectField,
  FormTextAreaField,
  FormTextField,
} from "@nearcommerce/ui";
import { FormikProvider, useFormik } from "formik";
import { useState } from "react";
import * as Yup from "yup";

const hasValidPriceDecimals = (v: unknown) =>
  typeof v !== "number" || hasAtMostTwoDecimals(v);

const ProductSchema = Yup.object().shape({
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

interface Props {
  storeId: string;
  // Provide to edit an existing product; omit to create one.
  product?: StoreProduct;
  categories?: Category[];
  onSuccess: () => void;
  onCancel?: () => void;
}

const NOT_AN_IMAGE =
  "That link doesn't lead to an image. Check the URL, or upload a photo instead.";

const FIELD_NAMES = [
  "name",
  "description",
  "price",
  "quantity",
  "imageUrl",
  "isPublished",
  "subcategoryId",
] as const;
type FieldName = (typeof FIELD_NAMES)[number];

export const ProductForm = ({
  storeId,
  product,
  categories = [],
  onSuccess,
  onCancel,
}: Props) => {
  const editing = Boolean(product);
  const showCategories = categories.length > 0;
  const initialCategoryId = product?.subcategory_id
    ? (categories.find((c) =>
        c.subcategories.some((s) => s.id === product.subcategory_id),
      )?.id ?? "")
    : "";
  const [formError, setFormError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      name: product?.name ?? "",
      description: product?.description ?? "",
      price: product ? String(product.price) : "",
      quantity: product ? String(product.quantity) : "",
      imageUrl: product?.image_url ?? "",
      isPublished: product?.is_published ?? false,
      categoryId: initialCategoryId,
      subcategoryId: initialCategoryId ? (product?.subcategory_id ?? "") : "",
    },
    validationSchema: ProductSchema,
    onSubmit: async (values, helpers) => {
      setFormError(null);
      const url = values.imageUrl.trim();
      // A typed link must really load as an image before we accept it.
      if (url && !(await checkImageUrl(url))) {
        helpers.setFieldTouched("imageUrl", true, false);
        helpers.setFieldError("imageUrl", NOT_AN_IMAGE);
        helpers.setSubmitting(false);
        return;
      }
      // When editing, cleared optional fields are sent as null so they are actually removed.
      const payload = {
        name: values.name.trim(),
        description: values.description.trim() || (editing ? null : undefined),
        price: Number(values.price),
        quantity: Number(values.quantity),
        imageUrl: values.imageUrl.trim() || (editing ? null : undefined),
        isPublished: values.isPublished,
        // Only sent when the picker was shown, so a form without categories never wipes one.
        ...(showCategories && {
          subcategoryId: values.subcategoryId || (editing ? null : undefined),
        }),
      };
      try {
        if (product) await updateProduct(storeId, product.id, payload);
        else await createProduct(storeId, payload);
        helpers.resetForm();
        onSuccess();
      } catch (err) {
        const apiError = parseApiError(
          err,
          "We couldn't save the product. Please try again.",
        );
        const fieldErrors: Record<string, string> = {};
        for (const d of apiError.details)
          if ((FIELD_NAMES as readonly string[]).includes(d.path))
            fieldErrors[d.path] = d.message;
        helpers.setErrors(fieldErrors);
        setFormError(apiError.message);
      }
    },
  });

  const error = (name: FieldName) =>
    formik.touched[name] || formik.submitCount > 0
      ? (formik.errors[name] as string | undefined)
      : undefined;

  const imageUrl = formik.values.imageUrl.trim();
  const imageStatus = useImageUrlCheck(imageUrl);
  const linkLooksValid = IMAGE_URL_PATTERN.test(imageUrl);
  const imagePreview =
    linkLooksValid && imageStatus !== "invalid" ? imageUrl : null;
  const imageUrlError =
    error("imageUrl") ??
    (linkLooksValid && imageStatus === "invalid" ? NOT_AN_IMAGE : undefined);
  const canPublish = Boolean(imageUrl) && imageStatus !== "invalid";

  return (
    <FormikProvider value={formik}>
      <form onSubmit={formik.handleSubmit} noValidate className="space-y-4">
        <FormTextField
          name="name"
          label="Product Name"
          required
          error={error("name")}
          autoComplete="off"
          data-autofocus
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormTextField
            name="price"
            label="Price"
            required
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            error={error("price")}
          />
          <FormTextField
            name="quantity"
            label="Quantity in Stock"
            required
            type="number"
            inputMode="numeric"
            step="1"
            min="0"
            error={error("quantity")}
          />
        </div>

        <FormTextAreaField
          name="description"
          label="Description"
          rows={3}
          error={error("description")}
          hint="Helps shoppers and improves search results."
        />

        {showCategories && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormSelectField
              name="categoryId"
              label="Category"
              onChange={(e) => {
                // A subcategory only makes sense within its category.
                formik.setFieldValue("categoryId", e.target.value);
                formik.setFieldValue("subcategoryId", "");
              }}
              hint="Helps shoppers find this product when browsing."
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </FormSelectField>
            <FormSelectField
              name="subcategoryId"
              label="Subcategory"
              disabled={!formik.values.categoryId}
              error={error("subcategoryId")}
            >
              <option value="">None</option>
              {(
                categories.find((c) => c.id === formik.values.categoryId)
                  ?.subcategories ?? []
              ).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </FormSelectField>
          </div>
        )}

        <div className="space-y-3">
          <ProductImagePicker
            value={imagePreview ?? ""}
            onChange={(url) => formik.setFieldValue("imageUrl", url)}
          />
          <details
            className="text-sm"
            open={Boolean(imageUrlError) || Boolean(imageUrl)}
          >
            <summary className="cursor-pointer text-slate-600">
              Or use an image URL
            </summary>
            <div className="mt-2">
              <FormTextField
                name="imageUrl"
                label="Image URL"
                type="url"
                inputMode="url"
                placeholder="https://"
                error={imageUrlError}
                hint={
                  imageStatus === "checking"
                    ? "Checking that the link is an image…"
                    : imageStatus === "valid"
                      ? "Image found."
                      : "Products need an image before they can be published."
                }
              />
            </div>
          </details>
        </div>

        <div>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="isPublished"
              checked={formik.values.isPublished}
              onChange={formik.handleChange}
              disabled={!canPublish && !formik.values.isPublished}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:opacity-50"
            />
            <span>
              <span className="block text-sm font-medium text-slate-800">
                Published
              </span>
              <span className="block text-sm text-slate-500">
                {canPublish
                  ? "Visible to shoppers in search once it's in stock."
                  : "Add an image to publish. Until then it stays a draft."}
              </span>
            </span>
          </label>
          {error("isPublished") && (
            <p role="alert" className="mt-1 text-sm text-red-600">
              {error("isPublished")}
            </p>
          )}
        </div>

        {formError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {formError}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          {onCancel && (
            <Button
              variant="secondary"
              onClick={onCancel}
              disabled={formik.isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" loading={formik.isSubmitting}>
            {editing ? "Save changes" : "Save Product"}
          </Button>
        </div>
      </form>
    </FormikProvider>
  );
};
