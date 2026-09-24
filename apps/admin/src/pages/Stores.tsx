import { getStores, toggleStoreSuspension } from "@/api/admin";
import type { AdminStore } from "@/types/admin";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nearcommerce/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function Stores() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-stores"],
    queryFn: () => getStores(),
  });
  const mutation = useMutation({
    mutationFn: ({ store, reason }: { store: AdminStore; reason: string }) =>
      toggleStoreSuspension(store.id, !store.is_suspended, reason),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] }),
  });

  if (query.isLoading) return <p className="text-slate-400">Loading stores…</p>;
  if (query.isError)
    return <p className="text-red-400">Unable to load stores.</p>;

  return (
    <section>
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">
          Moderation
        </p>
        <h2 className="mt-1 text-3xl font-bold">Stores</h2>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data?.data.map((store) => (
              <TableRow key={store.id}>
                <TableCell>{store.name}</TableCell>
                <TableCell>{store.owner_id}</TableCell>
                <TableCell
                  className={
                    store.is_suspended ? "text-red-400" : "text-emerald-400"
                  }
                >
                  {store.is_suspended ? "Suspended" : "Active"}
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    disabled={mutation.isPending}
                    onClick={() => {
                      const reason = window.prompt(
                        "Reason for this store status change?",
                      );
                      if (reason?.trim()) mutation.mutate({ store, reason });
                    }}
                  >
                    {store.is_suspended ? "Unsuspend" : "Suspend"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
