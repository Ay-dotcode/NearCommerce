import { cn } from "@nearcommerce/helpers";

export interface BreakdownItem {
  label: string;
  value: number;
  bar: string;
}

export function BreakdownBars({
  items,
  total,
}: {
  items: BreakdownItem[];
  total?: number;
}) {
  const denominator = Math.max(
    1,
    total ?? Math.max(...items.map((i) => i.value)),
  );
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-slate-700">{item.label}</span>
            <span className="font-semibold tabular-nums">{item.value}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn("h-full rounded-full", item.bar)}
              style={{
                width: `${Math.min(100, (item.value / denominator) * 100)}%`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
