import type { Category } from "@/types/categories";
import { cn } from "@nearcommerce/helpers";
import { UNCATEGORIZED_FILTER } from "@nearcommerce/api";

interface Props {
  categories?: Category[];
  // Products per category id across the store; null is "no category yet".
  counts?: { id: string | null; count: number }[];
  total?: number;
  // "" is every category, UNCATEGORIZED_FILTER is products without one, otherwise a category id.
  selected: string;
  onSelect: (categoryId: string) => void;
}

// Filter chips for the inventory: "All", then one chip per category the store actually uses
// (with its product count), then "Uncategorized". Scrolls sideways on small screens.
export function CategoryChips({
  categories,
  counts,
  total,
  selected,
  onSelect,
}: Props) {
  if (!categories || !counts) return null;

  const countOf = new Map(counts.map((c) => [c.id, c.count]));
  const used = categories.filter(
    (c) => (countOf.get(c.id) ?? 0) > 0 || c.id === selected,
  );
  const uncategorized = countOf.get(null) ?? 0;
  const showUncategorized =
    uncategorized > 0 || selected === UNCATEGORIZED_FILTER;

  // Nothing to filter by until at least one product has a category.
  if (used.length === 0) return null;

  const chips: { id: string; label: string; count?: number }[] = [
    { id: "", label: "All", count: total },
    ...used.map((c) => ({
      id: c.id,
      label: c.name,
      count: countOf.get(c.id) ?? 0,
    })),
    ...(showUncategorized
      ? [{ id: UNCATEGORIZED_FILTER, label: "Uncategorized", count: uncategorized }]
      : []),
  ];

  return (
    <div
      role="group"
      aria-label="Filter by category"
      className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
    >
      {chips.map((chip) => {
        const active = selected === chip.id;
        return (
          <button
            key={chip.id || "all"}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(chip.id)}
            className={cn(
              "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
              active
                ? "border-brand-600 bg-brand-600 text-onbrand"
                : "border-slate-300 bg-white text-slate-700 hover:border-brand-500 hover:bg-slate-50",
            )}
          >
            {chip.label}
            {chip.count !== undefined && (
              <span
                className={cn(
                  "text-xs tabular-nums",
                  active ? "text-onbrand/80" : "text-slate-500",
                )}
              >
                {chip.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
