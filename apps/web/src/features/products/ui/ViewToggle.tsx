import type { InventoryView } from "@/types/products";
import { cn } from "@nearcommerce/helpers";

const OPTIONS: { value: InventoryView; label: string }[] = [
  { value: "list", label: "List view" },
  { value: "grid", label: "Grid view" },
];

function Icon({ view }: { view: InventoryView }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      {view === "list" ? (
        <path d="M3 5h14M3 10h14M3 15h14" />
      ) : (
        <path d="M3.5 3.5h5v5h-5zM11.5 3.5h5v5h-5zM3.5 11.5h5v5h-5zM11.5 11.5h5v5h-5z" />
      )}
    </svg>
  );
}

// Two-button switch between the table and the card grid. Each button announces which view it
// shows and whether it is the current one.
export function ViewToggle({
  value,
  onChange,
}: {
  value: InventoryView;
  onChange: (view: InventoryView) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Product layout"
      className="inline-flex h-10 shrink-0 overflow-hidden rounded-md border border-slate-300 bg-white shadow-card"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-label={option.label}
          title={option.label}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex w-10 cursor-pointer items-center justify-center transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500",
            value === option.value
              ? "bg-brand-600 text-onbrand"
              : "text-slate-600 hover:bg-slate-100",
          )}
        >
          <Icon view={option.value} />
        </button>
      ))}
    </div>
  );
}
