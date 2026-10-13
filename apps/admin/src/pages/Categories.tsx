import {
  createCategory,
  createSubcategory,
  deleteCategory,
  deleteSubcategory,
  generateDefaultCatalog,
  getCategories,
  updateCategory,
  updateSubcategory,
} from "@/api/admin";
import { CategoriesSkeleton } from "@/components/PageSkeletons";
import { ReasonDialog } from "@/components/ReasonDialog";
import { ADMIN_CATEGORIES_KEY } from "@/constants";
import { NameFormDialog } from "@/pages/categories/NameFormDialog";
import type { AdminCategory, AdminSubcategory } from "@/types/admin";
import { categoryEmoji, parseApiError } from "@nearcommerce/api";
import { Button, EmptyState } from "@nearcommerce/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

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

  const generate = useMutation({
    mutationFn: generateDefaultCatalog,
    onSuccess: async (result) => {
      const { categories_created: c, subcategories_created: s } = result;
      setNotice(
        c + s === 0
          ? result.message
          : `Added ${plural(c, "category", "categories")} and ${plural(s, "subcategory", "subcategories")}.`,
      );
      await refresh();
    },
    onError: (err) =>
      setNotice(
        parseApiError(err, "We couldn't generate the default catalog.").message,
      ),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_KEY });
  const refreshAudit = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });

  const categories: AdminCategory[] = Array.isArray(query.data)
    ? query.data
    : Array.isArray((query.data as any)?.data)
      ? (query.data as any).data
      : [];

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
          <p className="text-sm uppercase tracking-[0.2em] text-brand-700">
            Catalog
          </p>
          <h2 className="mt-1 text-3xl font-bold">Categories</h2>
          <p className="mt-1 text-sm text-slate-500">
            The browse tree shoppers see, and the options store owners pick for
            their products.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            loading={generate.isPending}
            onClick={() => generate.mutate()}
          >
            Generate default catalog
          </Button>
          <Button
            type="button"
            onClick={() => setCategoryForm({ mode: "create" })}
          >
            Add category
          </Button>
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className="mb-4 flex items-start justify-between gap-3 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss message"
            className="text-emerald-600 hover:text-emerald-800"
          >
            ×
          </button>
        </div>
      )}

      {query.isLoading && <CategoriesSkeleton />}

      {query.isError && (
        <div
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-4"
        >
          <p className="text-red-700">Unable to load categories.</p>
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
        <EmptyState
          title="No categories yet"
          description="Generate the standard catalog (Dairy, Bakery, Pantry and more, with subcategories) in one click, or add your own."
          action={
            <>
              <Button
                type="button"
                loading={generate.isPending}
                onClick={() => generate.mutate()}
              >
                Generate default catalog
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCategoryForm({ mode: "create" })}
              >
                Add category
              </Button>
            </>
          }
        />
      )}

      <ul className="grid gap-4 lg:grid-cols-2">
        {categories.map((category) => (
          <li key={category.id}>
            <article
              aria-labelledby={`cat-${category.id}`}
              className="h-full rounded-lg border border-slate-200 bg-white p-4"
            >
              <header className="flex items-start gap-3">
                {category.icon_url ? (
                  <img
                    src={category.icon_url}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded border border-slate-300 object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-xl"
                  >
                    {categoryEmoji(category.name)}
                  </div>
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
                <ul className="mt-4 divide-y divide-slate-200 rounded border border-slate-200">
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

      <NameFormDialog
        open={categoryForm !== null}
        title={categoryForm?.mode === "edit" ? "Edit category" : "Add category"}
        description="Shoppers browse the catalog by category, then subcategory. The icon is chosen automatically."
        initialName={
          categoryForm?.mode === "edit" ? categoryForm.category.name : ""
        }
        submitLabel={
          categoryForm?.mode === "edit" ? "Save changes" : "Add category"
        }
        onClose={() => setCategoryForm(null)}
        onSubmit={async (name) => {
          if (categoryForm?.mode === "edit") {
            await updateCategory(categoryForm.category.id, { name });
            setNotice(`Saved "${name}".`);
          } else {
            await createCategory({ name });
            setNotice(`Added "${name}".`);
          }
          setCategoryForm(null);
          await refresh();
        }}
      />

      <NameFormDialog
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

      <ReasonDialog
        open={deleting !== null}
        title={
          deleting?.kind === "sub"
            ? `Delete subcategory "${deleting.sub.name}"?`
            : `Delete category "${deleting?.category.name ?? ""}"?`
        }
        description={deleting ? deleteConsequences(deleting) : ""}
        confirmLabel={
          deleting?.kind === "sub" ? "Delete subcategory" : "Delete category"
        }
        busyLabel="Deleting…"
        hint="Recorded in the audit ledger with a snapshot of what is removed."
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
