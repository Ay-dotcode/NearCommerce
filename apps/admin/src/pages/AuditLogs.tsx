import { getAuditLogs } from "@/api/admin";
import { CardListSkeleton } from "@/components/PageSkeletons";
import { ADMIN_AUDIT_LOGS_KEY } from "@/constants";
import { Button } from "@nearcommerce/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: [...ADMIN_AUDIT_LOGS_KEY, page],
    queryFn: () => getAuditLogs(page),
  });
  const totalPages = Math.max(
    1,
    Math.ceil(
      (query.data?.pagination.total ?? 0) /
        (query.data?.pagination.limit ?? 50),
    ),
  );

  if (query.isError)
    return <p className="text-red-600">Unable to load audit logs.</p>;

  return (
    <section>
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-700">
          Immutable oversight
        </p>
        <h2 className="mt-1 text-3xl font-bold">System audit ledger</h2>
      </div>
      {query.isLoading && (
        <CardListSkeleton
          label="Audit ledger"
          count={5}
          className="space-y-4"
        />
      )}
      <div className="space-y-4">
        {query.isLoading ? null : query.data?.data.length ? (
          query.data.data.map((log) => (
            <article
              key={log.id}
              className="rounded-lg border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap justify-between gap-2 border-b border-slate-200 pb-3">
                <strong className="text-brand-700">{log.action}</strong>
                <time className="text-sm text-slate-500">
                  {new Date(log.created_at).toLocaleString()}
                </time>
              </div>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Admin</dt>
                  <dd>{log.admin_email ?? log.admin_id ?? "Deleted admin"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Target</dt>
                  <dd>
                    {log.target_type} / {log.target_id}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">Reason</dt>
                  <dd>{log.reason ?? "No reason supplied"}</dd>
                </div>
              </dl>
              {log.snapshot && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium text-slate-700">
                    Pre-mutation snapshot
                  </p>
                  <pre className="max-h-80 overflow-auto rounded bg-slate-50 p-3 text-xs text-slate-700">
                    {JSON.stringify(log.snapshot, null, 2)}
                  </pre>
                </div>
              )}
            </article>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-slate-300 p-8 text-slate-500">
            No audit events recorded.
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          Page {page} of {totalPages}
          {query.data && ` · ${query.data.pagination.total} events`}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}
