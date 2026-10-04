import {
  ADMIN_CATEGORIES_KEY,
  createCategory,
  createSubcategory,
  deleteCategory,
  deleteSubcategory,
  getCategories,
  updateCategory,
  updateSubcategory,
} from "@/api/admin";
import type { AdminCategory, AdminSubcategory } from "@/types/admin";
import { Button } from "@nearcommerce/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  CategoryFormDialog,
  DeleteReasonDialog,
  SubcategoryFormDialog,
} from "./categories/CategoryDialogs";

type CategoryForm =
  | { mode: "create" }
  | { mode: "edit"; category: AdminCategory };
type SubForm =
  | { mode: "create"; category: AdminCategory }
  | { mode: "edit"; category: AdminCategory; sub: AdminSubcategory };
type Deleting =
  | { kind: "category"; category: AdminCategory }
  | { kind: "sub"; category: AdminCategory; sub: AdminSubcategory };

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

export default function Categories() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ADMIN_CATEGORIES_KEY,
    queryFn: getCategories,
  });

  const [categoryForm, setCategoryForm] = useState<CategoryForm | null>(null);
  const [subForm, setSubForm] = useState<SubForm | null>(null);
  const [deleting, setDeleting] = useState<Deleting | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_KEY });
  const refreshAudit = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });

  const categories = query.data ?? [];

  const deleteConsequences = (d: Deleting) => {
    if (d.kind === "sub") {
      const n = d.sub.product_count;
      return n === 0
        ? `"${d.sub.name}" has no products. This can't be undone.`
        : `${plural(n, "product")} in "${d.sub.name}" will become uncategorised and stay on sale. This can't be undone.`;
    }
    const subs = d.category.subcategories.length;
    const n = d.category.product_count;
    const parts = [
      subs > 0 ? `its ${plural(subs, "subcategory", "subcategories")}` : null,
      n > 0 ? `${plural(n, "product")} will become uncategorised` : null,
    ].filter(Boolean);
    return parts.length === 0
      ? `"${d.category.name}" is empty. This can't be undone.`
      : `Deleting "${d.category.name}" also deletes ${parts.join("; ")}. This can't be undone.`;
  };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">
            Catalog
          </p>
          <h2 className="mt-1 text-3xl font-bold">Categories</h2>
          <p className="mt-1 text-sm text-slate-400">
            The browse tree shoppers see, and the options store owners pick for
            their products.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setCategoryForm({ mode: "create" })}
        >
          Add category
        </Button>
      </div>

      {notice && (
        <div
          role="status"
          className="mb-4 flex items-start justify-between gap-3 rounded border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss message"
            className="text-emerald-400 hover:text-emerald-200"
          >
            ×
          </button>
        </div>
      )}

      {query.isLoading && <p className="text-slate-400">Loading categories…</p>}

      {query.isError && (
        <div
          role="alert"
          className="rounded border border-red-800 bg-red-950/40 p-4"
        >
          <p className="text-red-300">Unable to load categories.</p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3"
            onClick={() => query.refetch()}
          >
            Try again
          </Button>
        </div>
      )}

      {query.isSuccess && categories.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900 px-6 py-12 text-center">
          <h3 className="text-lg font-semibold">No categories yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
            Add your first category, such as Groceries, then give it
            subcategories like Dairy or Bakery.
          </p>
          <Button
            type="button"
            className="mt-4"
            onClick={() => setCategoryForm({ mode: "create" })}
          >
            Add category
          </Button>
        </div>
      )}

      <ul className="grid gap-4 lg:grid-cols-2">
        {categories.map((category) => (
          <li key={category.id}>
            <article
              aria-labelledby={`cat-${category.id}`}
              className="h-full rounded-lg border border-slate-800 bg-slate-900 p-4"
            >
              <header className="flex items-start gap-3">
                {category.icon_url ? (
                  <img
                    src={category.icon_url}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded border border-slate-700 object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="h-10 w-10 shrink-0 rounded bg-slate-800"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <h3
                    id={`cat-${category.id}`}
                    className="truncate text-lg font-semibold"
                  >
                    {category.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {plural(category.product_count, "product")} ·{" "}
                    {plural(
                      category.subcategories.length,
                      "subcategory",
                      "subcategories",
                    )}
                  </p>
                </div>
              </header>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  aria-label={`Edit ${category.name}`}
                  onClick={() => setCategoryForm({ mode: "edit", category })}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  aria-label={`Add subcategory to ${category.name}`}
                  onClick={() => setSubForm({ mode: "create", category })}
                >
                  Add subcategory
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  aria-label={`Delete ${category.name}`}
                  onClick={() => setDeleting({ kind: "category", category })}
                >
                  Delete
                </Button>
              </div>

              {category.subcategories.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  No subcategories yet.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-800 rounded border border-slate-800">
                  {category.subcategories.map((sub) => (
                    <li
                      key={sub.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <span className="font-medium">{sub.name}</span>
                        <span className="ml-2 text-xs text-slate-500">
                          {plural(sub.product_count, "product")}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="secondary"
                          className="px-2 py-1"
                          aria-label={`Rename ${sub.name}`}
                          onClick={() =>
                            setSubForm({ mode: "edit", category, sub })
                          }
                        >
                          Rename
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          className="px-2 py-1"
                          aria-label={`Delete ${sub.name}`}
                          onClick={() =>
                            setDeleting({ kind: "sub", category, sub })
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </li>
        ))}
      </ul>

      <CategoryFormDialog
        open={categoryForm !== null}
        category={
          categoryForm?.mode === "edit" ? categoryForm.category : undefined
        }
        onClose={() => setCategoryForm(null)}
        onSubmit={async (values) => {
          if (categoryForm?.mode === "edit") {
            await updateCategory(categoryForm.category.id, values);
            setNotice(`Saved "${values.name}".`);
          } else {
            await createCategory(values);
            setNotice(`Added "${values.name}".`);
          }
          setCategoryForm(null);
          await refresh();
        }}
      />

      <SubcategoryFormDialog
        open={subForm !== null}
        title={
          subForm?.mode === "edit"
            ? "Rename subcategory"
            : `Add subcategory${subForm ? ` to ${subForm.category.name}` : ""}`
        }
        initialName={subForm?.mode === "edit" ? subForm.sub.name : ""}
        submitLabel={
          subForm?.mode === "edit" ? "Save changes" : "Add subcategory"
        }
        onClose={() => setSubForm(null)}
        onSubmit={async (name) => {
          if (!subForm) return;
          if (subForm.mode === "edit") {
            await updateSubcategory(subForm.sub.id, name);
            setNotice(`Renamed to "${name}".`);
          } else {
            await createSubcategory(subForm.category.id, name);
            setNotice(`Added "${name}" to ${subForm.category.name}.`);
          }
          setSubForm(null);
          await refresh();
        }}
      />

      <DeleteReasonDialog
        open={deleting !== null}
        title={
          deleting?.kind === "sub"
            ? `Delete subcategory "${deleting.sub.name}"?`
            : `Delete category "${deleting?.category.name ?? ""}"?`
        }
        consequences={deleting ? deleteConsequences(deleting) : ""}
        confirmLabel={
          deleting?.kind === "sub" ? "Delete subcategory" : "Delete category"
        }
        onClose={() => setDeleting(null)}
        onConfirm={async (reason) => {
          if (!deleting) return;
          const name =
            deleting.kind === "sub"
              ? deleting.sub.name
              : deleting.category.name;
          if (deleting.kind === "sub")
            await deleteSubcategory(deleting.sub.id, reason);
          else await deleteCategory(deleting.category.id, reason);
          setDeleting(null);
          setNotice(`Deleted "${name}". It is recorded in the audit ledger.`);
          await Promise.all([refresh(), refreshAudit()]);
        }}
      />
    </section>
  );
}
