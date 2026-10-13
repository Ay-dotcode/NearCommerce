import { getAuditLogs, getGlobalMetrics } from "@/api/admin";
import { ActivityChart } from "@/components/ActivityChart";
import { BreakdownBars } from "@/components/BreakdownBars";
import { DashboardSkeleton } from "@/components/PageSkeletons";
import { ADMIN_AUDIT_LOGS_KEY } from "@/constants";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  SkeletonGroup,
  timeAgo,
} from "@nearcommerce/ui";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

const metricCards = [
  ["Total active stores", (m: Metrics) => m.totalActiveStores],
  ["New registrations (30 days)", (m: Metrics) => m.newRegistrations],
  ["Flagged items", (m: Metrics) => m.flaggedItems],
  ["Suspended users", (m: Metrics) => m.suspendedUsers],
  ["Total users", (m: Metrics) => m.totals.users],
  ["Total stores", (m: Metrics) => m.totals.stores],
  ["Total products", (m: Metrics) => m.totals.products],
  ["Total reviews", (m: Metrics) => m.totals.reviews],
] as const;

type Metrics = NonNullable<Awaited<ReturnType<typeof getGlobalMetrics>>>;

const ACTION_LABELS: Record<string, string> = {
  SUSPEND_USER: "Suspended a user",
  UNSUSPEND_USER: "Unsuspended a user",
  DEMOTE_ADMIN: "Demoted an admin",
  DELETE_USER: "Deleted a user",
  SUSPEND_STORE: "Suspended a store",
  UNSUSPEND_STORE: "Unsuspended a store",
  DELETE_STORE: "Deleted a store",
  DELETE_REVIEW: "Deleted a review",
  DELETE_CATEGORY: "Deleted a category",
  DELETE_SUBCATEGORY: "Deleted a subcategory",
};

const actionLabel = (action: string) =>
  ACTION_LABELS[action] ??
  action.charAt(0) + action.slice(1).toLowerCase().replace(/_/g, " ");

export default function Dashboard() {
  const query = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: getGlobalMetrics,
  });
  const recent = useQuery({
    queryKey: [...ADMIN_AUDIT_LOGS_KEY, "recent"],
    queryFn: () => getAuditLogs(1, 5),
  });

  if (query.isLoading) return <DashboardSkeleton />;
  if (query.isError || !query.data)
    return (
      <p role="alert" className="text-red-600">
        Unable to load platform metrics.
      </p>
    );

  const m = query.data;

  return (
    <section>
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-700">
          Global metrics hub
        </p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">
          Platform health
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(([label, read]) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="text-sm text-slate-500">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums">{read(m)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Platform activity · last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityChart data={m.activity} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Users by role</CardTitle>
            </CardHeader>
            <CardContent>
              <BreakdownBars
                total={m.totals.users}
                items={[
                  {
                    label: "Customers",
                    value: m.usersByRole.CUSTOMER,
                    bar: "bg-brand-600",
                  },
                  {
                    label: "Store owners",
                    value: m.usersByRole.STORE_OWNER,
                    bar: "bg-emerald-500",
                  },
                  {
                    label: "System admins",
                    value: m.usersByRole.SYSTEM_ADMIN,
                    bar: "bg-amber-500",
                  },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Catalog health</CardTitle>
            </CardHeader>
            <CardContent>
              <BreakdownBars
                total={m.totals.products}
                items={[
                  {
                    label: "Published",
                    value: m.catalog.published,
                    bar: "bg-emerald-500",
                  },
                  {
                    label: "Drafts",
                    value: m.catalog.drafts,
                    bar: "bg-slate-400",
                  },
                  {
                    label: "Out of stock",
                    value: m.catalog.outOfStock,
                    bar: "bg-red-500",
                  },
                  {
                    label: "Not verified in 30 days",
                    value: m.catalog.stale,
                    bar: "bg-amber-500",
                  },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Recent moderation activity</CardTitle>
          <Link
            to="/audit-logs"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            View audit ledger
          </Link>
        </CardHeader>
        <CardContent>
          {recent.isLoading ? (
            <SkeletonGroup label="Recent activity" className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </SkeletonGroup>
          ) : (recent.data?.data.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-500">
              No moderation actions have been taken yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.data!.data.map((log) => (
                <li
                  key={log.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm"
                >
                  <Badge
                    tone={
                      log.action.startsWith("DELETE") ? "danger" : "warning"
                    }
                  >
                    {log.target_type}
                  </Badge>
                  <span className="font-medium">{actionLabel(log.action)}</span>
                  {log.reason && (
                    <span className="min-w-0 flex-1 truncate text-slate-500">
                      “{log.reason}”
                    </span>
                  )}
                  <span className="ml-auto whitespace-nowrap text-xs text-slate-500">
                    {log.admin_email ?? "Unknown admin"} ·{" "}
                    {timeAgo(log.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
