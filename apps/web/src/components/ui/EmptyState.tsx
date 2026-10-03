import { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
          {description}
        </p>
      )}
      {action && <div className="mt-4 flex justify-center gap-2">{action}</div>}
    </div>
  );
}
