import { db } from "@/config/database";
import { HttpError } from "@/utils/http";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@nearcommerce/api";

export interface SubcategoryDto {
  id: string;
  name: string;
  product_count: number;
}

export interface CategoryDto {
  id: string;
  name: string;
  icon_url: string | null;
  product_count: number;
  subcategories: SubcategoryDto[];
}

const NAME_TAKEN_DETAILS = [
  { path: "name", message: "That name is already in use" },
];

const isUniqueViolation = (err: unknown) =>
  (err as { code?: string } | null)?.code === "23505";

// The full category tree with subcategories, ordered by name.
export async function listCategoryTree(
  scope: "public" | "all" = "public",
): Promise<CategoryDto[]> {
  const visible =
    scope === "public"
      ? `WHERE p.is_published = true AND p.quantity > 0
           AND st.is_suspended = false AND u.is_suspended = false`
      : "";

  const { rows } = await db.query(
    `SELECT c.id, c.name, c.icon_url,
            s.id AS sub_id, s.name AS sub_name,
            COALESCE(pc.n, 0)::int AS sub_count
       FROM categories c
       LEFT JOIN subcategories s ON s.parent_category_id = c.id
       LEFT JOIN (
         SELECT p.subcategory_id, COUNT(*)::int AS n
           FROM products p
           JOIN stores st ON st.id = p.store_id
           JOIN users u ON u.id = st.owner_id
           ${visible}
          GROUP BY p.subcategory_id
       ) pc ON pc.subcategory_id = s.id
      ORDER BY LOWER(c.name), LOWER(s.name)`,
  );

  const byId = new Map<string, CategoryDto>();
  for (const row of rows) {
    let category = byId.get(row.id);
    if (!category) {
      category = {
        id: row.id,
        name: row.name,
        icon_url: row.icon_url,
        product_count: 0,
        subcategories: [],
      };
      byId.set(row.id, category);
    }
    if (row.sub_id) {
      category.subcategories.push({
        id: row.sub_id,
        name: row.sub_name,
        product_count: row.sub_count,
      });
      category.product_count += row.sub_count;
    }
  }
  return [...byId.values()];
}

export async function createCategory(
  input: CreateCategoryInput,
): Promise<CategoryDto> {
  try {
    const { rows } = await db.query(
      `INSERT INTO categories (name, icon_url) VALUES ($1, $2)
       RETURNING id, name, icon_url`,
      [input.name, input.iconUrl ?? null],
    );
    return { ...rows[0], product_count: 0, subcategories: [] };
  } catch (err) {
    if (isUniqueViolation(err))
      throw new HttpError(
        409,
        "A category with this name already exists",
        NAME_TAKEN_DETAILS,
      );
    throw err;
  }
}

export async function updateCategory(
  categoryId: string,
  patch: UpdateCategoryInput,
) {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.name !== undefined) {
    values.push(patch.name);
    sets.push(`name = $${values.length}`);
  }
  if (patch.iconUrl !== undefined) {
    values.push(patch.iconUrl);
    sets.push(`icon_url = $${values.length}`);
  }
  values.push(categoryId);

  try {
    const { rows } = await db.query(
      `UPDATE categories SET ${sets.join(", ")} WHERE id = $${values.length}
       RETURNING id, name, icon_url`,
      values,
    );
    if (rows.length === 0) throw new HttpError(404, "Category not found");
    return rows[0] as { id: string; name: string; icon_url: string | null };
  } catch (err) {
    if (isUniqueViolation(err))
      throw new HttpError(
        409,
        "A category with this name already exists",
        NAME_TAKEN_DETAILS,
      );
    throw err;
  }
}

export async function createSubcategory(categoryId: string, name: string) {
  try {
    const { rows } = await db.query(
      `INSERT INTO subcategories (parent_category_id, name) VALUES ($1, $2)
       RETURNING id, parent_category_id, name`,
      [categoryId, name],
    );
    return rows[0] as { id: string; parent_category_id: string; name: string };
  } catch (err) {
    if (isUniqueViolation(err))
      throw new HttpError(
        409,
        "This category already has a subcategory with that name",
        NAME_TAKEN_DETAILS,
      );
    // 23503: the parent category does not exist.
    if ((err as { code?: string } | null)?.code === "23503")
      throw new HttpError(404, "Category not found");
    throw err;
  }
}

export async function updateSubcategory(subcategoryId: string, name: string) {
  try {
    const { rows } = await db.query(
      `UPDATE subcategories SET name = $1 WHERE id = $2
       RETURNING id, parent_category_id, name`,
      [name, subcategoryId],
    );
    if (rows.length === 0) throw new HttpError(404, "Subcategory not found");
    return rows[0] as { id: string; parent_category_id: string; name: string };
  } catch (err) {
    if (isUniqueViolation(err))
      throw new HttpError(
        409,
        "This category already has a subcategory with that name",
        NAME_TAKEN_DETAILS,
      );
    throw err;
  }
}

// Deletes a category (its subcategories cascade) after writing an audit snapshot.
// Products that used it are kept and become uncategorised (subcategory_id is set to NULL).
export async function deleteCategory(
  categoryId: string,
  adminId: string,
  reason: string,
): Promise<{ affectedProducts: number; deletedSubcategories: number }> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const category = await client.query(
      "SELECT id, name, icon_url FROM categories WHERE id = $1 FOR UPDATE",
      [categoryId],
    );
    if (category.rows.length === 0)
      throw new HttpError(404, "Category not found");

    const subs = await client.query(
      "SELECT id, name FROM subcategories WHERE parent_category_id = $1",
      [categoryId],
    );
    const affected = await client.query(
      `SELECT COUNT(*)::int AS n FROM products
        WHERE subcategory_id IN (SELECT id FROM subcategories WHERE parent_category_id = $1)`,
      [categoryId],
    );
    const affectedProducts: number = affected.rows[0].n;

    await client.query(
      `INSERT INTO admin_audit_logs (admin_id, action, target_id, target_type, reason, snapshot)
       VALUES ($1, 'DELETE_CATEGORY', $2, 'CATEGORY', $3, $4)`,
      [
        adminId,
        categoryId,
        reason,
        JSON.stringify({
          category: category.rows[0],
          subcategories: subs.rows,
          affected_products: affectedProducts,
        }),
      ],
    );
    await client.query("DELETE FROM categories WHERE id = $1", [categoryId]);
    await client.query("COMMIT");
    return { affectedProducts, deletedSubcategories: subs.rows.length };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteSubcategory(
  subcategoryId: string,
  adminId: string,
  reason: string,
): Promise<{ affectedProducts: number }> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const sub = await client.query(
      "SELECT id, parent_category_id, name FROM subcategories WHERE id = $1 FOR UPDATE",
      [subcategoryId],
    );
    if (sub.rows.length === 0)
      throw new HttpError(404, "Subcategory not found");

    const affected = await client.query(
      "SELECT COUNT(*)::int AS n FROM products WHERE subcategory_id = $1",
      [subcategoryId],
    );
    const affectedProducts: number = affected.rows[0].n;

    await client.query(
      `INSERT INTO admin_audit_logs (admin_id, action, target_id, target_type, reason, snapshot)
       VALUES ($1, 'DELETE_SUBCATEGORY', $2, 'SUBCATEGORY', $3, $4)`,
      [
        adminId,
        subcategoryId,
        reason,
        JSON.stringify({
          subcategory: sub.rows[0],
          affected_products: affectedProducts,
        }),
      ],
    );
    await client.query("DELETE FROM subcategories WHERE id = $1", [
      subcategoryId,
    ]);
    await client.query("COMMIT");
    return { affectedProducts };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
