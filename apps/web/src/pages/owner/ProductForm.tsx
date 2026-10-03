import { parseApiError } from "@/api/errors";
import { createProduct, updateProduct } from "@/api/products";
import { Button, TextAreaField, TextField } from "@/components/ui";
import type { StoreProduct } from "@/types/products";
import { useFormik } from "formik";
import { useState } from "react";
import * as Yup from "yup";

const hasAtMostTwoDecimals = (v: unknown) => typeof v !== "number" || Math.abs(v * 100 - Math.round(v * 100)) < 1e-6;

const ProductSchema = Yup.object().shape({
  name: Yup.string().trim().min(2, "Enter at least 2 characters").max(255).required("Product name is required"),
  price: Yup.number()
    .typeError("Enter a price")
    .moreThan(0, "Price must be greater than zero")
    .max(99_999_999.99, "Price is too large")
    .test("decimals", "Price can have at most 2 decimal places", hasAtMostTwoDecimals)
    .required("Price is required"),
  quantity: Yup.number()
    .typeError("Enter a quantity")
    .integer("Use a whole number")
    .min(0, "Quantity can't be negative")
    .required("Quantity is required"),
  description: Yup.string().max(5000, "Keep the description under 5000 characters"),
  imageUrl: Yup.string()
    .trim()
    .max(512)
    .test("url", "Enter a valid http(s) image URL", (v) => !v || /^https?:\/\/\S+$/i.test(v)),
  isPublished: Yup.boolean().test("needs-image", "Add an image URL before publishing", function (v) {
    return !v || Boolean(this.parent.imageUrl?.trim());
  }),
});

interface Props {
  storeId: string;
  // Provide to edit an existing product; omit to create one.
  product?: StoreProduct;
  onSuccess: () => void;
  onCancel?: () => void;
}

const FIELD_NAMES = ["name", "description", "price", "quantity", "imageUrl", "isPublished"] as const;
type FieldName = (typeof FIELD_NAMES)[number];

export const ProductForm = ({ storeId, product, onSuccess, onCancel }: Props) => {
  const editing = Boolean(product);
  const [formError, setFormError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      name: product?.name ?? "",
      description: product?.description ?? "",
      price: product ? String(product.price) : "",
      quantity: product ? String(product.quantity) : "",
      imageUrl: product?.image_url ?? "",
      isPublished: product?.is_published ?? false,
    },
    validationSchema: ProductSchema,
    onSubmit: async (values, helpers) => {
      setFormError(null);
      // When editing, cleared optional fields are sent as null so they are actually removed.
      const payload = {
        name: values.name.trim(),
        description: values.description.trim() || (editing ? null : undefined),
        price: Number(values.price),
        quantity: Number(values.quantity),
        imageUrl: values.imageUrl.trim() || (editing ? null : undefined),
        isPublished: values.isPublished,
      };
      try {
        if (product) await updateProduct(storeId, product.id, payload);
        else await createProduct(storeId, payload);
        helpers.resetForm();
        onSuccess();
      } catch (err) {
        const apiError = parseApiError(err, "We couldn't save the product. Please try again.");
        const fieldErrors: Record<string, string> = {};
        for (const d of apiError.details) if ((FIELD_NAMES as readonly string[]).includes(d.path)) fieldErrors[d.path] = d.message;
        helpers.setErrors(fieldErrors);
        setFormError(apiError.message);
      }
    },
  });

  const error = (name: FieldName) =>
    formik.touched[name] || formik.submitCount > 0 ? (formik.errors[name] as string | undefined) : undefined;

  const imageUrl = formik.values.imageUrl.trim();
  const imagePreview = /^https?:\/\/\S+$/i.test(imageUrl) ? imageUrl : null;
  const canPublish = Boolean(imageUrl);

  return (
    <form onSubmit={formik.handleSubmit} noValidate className="space-y-4">
      <TextField label="Product Name" required {...formik.getFieldProps("name")} error={error("name")} autoComplete="off" data-autofocus />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Price" required type="number" inputMode="decimal" step="0.01" min="0" {...formik.getFieldProps("price")} error={error("price")} />
        <TextField label="Quantity in Stock" required type="number" inputMode="numeric" step="1" min="0" {...formik.getFieldProps("quantity")} error={error("quantity")} />
      </div>

      <TextAreaField label="Description" rows={3} {...formik.getFieldProps("description")} error={error("description")} hint="Helps shoppers and improves search results." />

      <div className="space-y-3">
        <TextField
          label="Image URL"
          type="url"
          inputMode="url"
          placeholder="https://"
          {...formik.getFieldProps("imageUrl")}
          error={error("imageUrl")}
          hint="Products need an image before they can be published."
        />
        {imagePreview && (
          <img
            src={imagePreview}
            alt="Product preview"
            className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
          />
        )}
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
            <span className="block text-sm font-medium text-slate-800">Published</span>
            <span className="block text-sm text-slate-500">
              {canPublish ? "Visible to shoppers in search once it's in stock." : "Add an image URL to publish. Until then it stays a draft."}
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
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {formError}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={formik.isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={formik.isSubmitting}>
          {editing ? "Save changes" : "Save Product"}
        </Button>
      </div>
    </form>
  );
};
