import { getGlobalMetrics } from "@/api/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@nearcommerce/ui";
import { useQuery } from "@tanstack/react-query";

const metricCards = [
  ["Total active stores", "totalActiveStores"],
  ["New registrations", "newRegistrations"],
  ["Flagged items", "flaggedItems"],
  ["Suspended users", "suspendedUsers"],
] as const;

export default function Dashboard() {
  const query = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: getGlobalMetrics,
  });

  if (query.isLoading)
    return <p className="text-slate-400">Loading platform metrics…</p>;
  if (query.isError)
    return <p className="text-red-400">Unable to load platform metrics.</p>;

  return (
    <section>
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
          Global metrics hub
        </p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">
          Platform health
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map(([label, key]) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-sm text-slate-400">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-white">
                {query.data?.[key] ?? 0}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
