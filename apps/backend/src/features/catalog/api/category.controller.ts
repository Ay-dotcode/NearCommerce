import {
  createCategory,
  createSubcategory,
  deleteCategory,
  deleteSubcategory,
  listCategoryTree,
  updateCategory,
  updateSubcategory,
} from "@/features/catalog/services/category.service";
import { handleKnownError, isUuid, sendValidationError } from "@/utils/http";
import {
  AdminDeleteSchema,
  CreateCategorySchema,
  CreateSubcategorySchema,
  UpdateCategorySchema,
  UpdateSubcategorySchema,
} from "@nearcommerce/api";
import { Request, Response } from "express";

const fail = (res: Response, label: string, error: unknown) => {
  if (handleKnownError(res, error)) return;
  console.error(`${label} error:`, error);
  return res.status(500).json({ error: "Internal Server Error" });
};

export async function getCategories(_req: Request, res: Response) {
  try {
    return res.status(200).json({ data: await listCategoryTree("public") });
  } catch (error) {
    return fail(res, "getCategories", error);
  }
}

export async function adminListCategories(_req: Request, res: Response) {
  try {
    return res.status(200).json({ data: await listCategoryTree("all") });
  } catch (error) {
    return fail(res, "adminListCategories", error);
  }
}

export async function adminCreateCategory(req: Request, res: Response) {
  const parsed = CreateCategorySchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);
  try {
    return res.status(201).json({ data: await createCategory(parsed.data) });
  } catch (error) {
    return fail(res, "adminCreateCategory", error);
  }
}

export async function adminUpdateCategory(req: Request, res: Response) {
  if (!isUuid(req.params.categoryId))
    return res.status(404).json({ error: "Category not found" });
  const parsed = UpdateCategorySchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);
  try {
    return res
      .status(200)
      .json({ data: await updateCategory(req.params.categoryId, parsed.data) });
  } catch (error) {
    return fail(res, "adminUpdateCategory", error);
  }
}

export async function adminDeleteCategory(req: Request, res: Response) {
  if (!isUuid(req.params.categoryId))
    return res.status(404).json({ error: "Category not found" });
  const parsed = AdminDeleteSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);
  try {
    const result = await deleteCategory(
      req.params.categoryId,
      req.user!.id,
      parsed.data.reason,
    );
    return res.status(200).json({
      message: "Category deleted and audited successfully.",
      affected_products: result.affectedProducts,
      deleted_subcategories: result.deletedSubcategories,
    });
  } catch (error) {
    return fail(res, "adminDeleteCategory", error);
  }
}

export async function adminCreateSubcategory(req: Request, res: Response) {
  if (!isUuid(req.params.categoryId))
    return res.status(404).json({ error: "Category not found" });
  const parsed = CreateSubcategorySchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);
  try {
    return res.status(201).json({
      data: await createSubcategory(req.params.categoryId, parsed.data.name),
    });
  } catch (error) {
    return fail(res, "adminCreateSubcategory", error);
  }
}

export async function adminUpdateSubcategory(req: Request, res: Response) {
  if (!isUuid(req.params.subcategoryId))
    return res.status(404).json({ error: "Subcategory not found" });
  const parsed = UpdateSubcategorySchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);
  try {
    return res.status(200).json({
      data: await updateSubcategory(req.params.subcategoryId, parsed.data.name),
    });
  } catch (error) {
    return fail(res, "adminUpdateSubcategory", error);
  }
}

export async function adminDeleteSubcategory(req: Request, res: Response) {
  if (!isUuid(req.params.subcategoryId))
    return res.status(404).json({ error: "Subcategory not found" });
  const parsed = AdminDeleteSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);
  try {
    const result = await deleteSubcategory(
      req.params.subcategoryId,
      req.user!.id,
      parsed.data.reason,
    );
    return res.status(200).json({
      message: "Subcategory deleted and audited successfully.",
      affected_products: result.affectedProducts,
    });
  } catch (error) {
    return fail(res, "adminDeleteSubcategory", error);
  }
}
