import { getAuditLogs } from "@/api/admin";
import { useQuery } from "@tanstack/react-query";

export default function AdminAuditLogs() {
  const query = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: () => getAuditLogs(),
  });
  if (query.isLoading)
    return <p className="text-slate-400">Loading audit ledger...</p>;
  if (query.isError)
    return <p className="text-red-400">Unable to load audit logs.</p>;

  return (
    <section>
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
          Immutable oversight
        </p>
        <h2 className="mt-1 text-3xl font-bold">System audit ledger</h2>
      </div>
      <div className="space-y-4">
        {query.data?.data.length ? (
          query.data.data.map((log) => (
            <article
              key={log.id}
              className="rounded-lg border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex flex-wrap justify-between gap-2 border-b border-slate-800 pb-3">
                <strong className="text-cyan-300">{log.action}</strong>
                <time className="text-sm text-slate-400">
                  {new Date(log.created_at).toLocaleString()}
                </time>
              </div>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Admin ID</dt>
                  <dd>{log.admin_id ?? "Deleted admin"}</dd>
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
                  <p className="mb-2 text-sm font-medium text-slate-300">
                    Pre-mutation snapshot
                  </p>
                  <pre className="max-h-80 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-300">
                    {JSON.stringify(log.snapshot, null, 2)}
                  </pre>
                </div>
              )}
            </article>
          ))
        ) : (
          <p className="rounded-lg border border-dashed border-slate-700 p-8 text-slate-400">
            No audit events recorded.
          </p>
        )}
      </div>
    </section>
  );
}
