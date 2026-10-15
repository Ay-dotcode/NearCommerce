import { deleteStore, getStores, toggleStoreSuspension } from "@/api/admin";
import { TableSkeleton } from "@/components/PageSkeletons";
import { ReasonDialog } from "@/components/ReasonDialog";
import { ADMIN_AUDIT_LOGS_KEY, ADMIN_STORES_KEY } from "@/constants";
import { storeActionCopy, type StoreAction } from "@/helpers/storeActions";
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@nearcommerce/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function Stores() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<StoreAction | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const query = useQuery({
    queryKey: [...ADMIN_STORES_KEY, page],
    queryFn: () => getStores(page),
  });

  const run = useMutation({
    mutationFn: ({ act, reason }: { act: StoreAction; reason: string }) =>
      act.kind === "delete"
        ? deleteStore(act.store.id, reason)
        : toggleStoreSuspension(act.store.id, !act.store.is_suspended, reason),
    onSuccess: (_data, { act }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_STORES_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_AUDIT_LOGS_KEY });
      setNotice(
        act.kind === "delete"
          ? `${act.store.name} was deleted.`
          : act.store.is_suspended
            ? `${act.store.name} was unsuspended.`
            : `${act.store.name} was suspended.`,
      );
      setAction(null);
      // Deleting the last row of a page would otherwise leave an empty page.
      if (act.kind === "delete" && stores.length === 1 && page > 1)
        setPage((p) => p - 1);
    },
  });

  const stores = query.data?.data ?? [];
  const totalPages = Math.max(
    1,
    Math.ceil(
      (query.data?.pagination.total ?? 0) /
        (query.data?.pagination.limit ?? 20),
    ),
  );
  const dialog = action && storeActionCopy(action);

  return (
    <section>
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-brand-700">
          Moderation
        </p>
        <h2 className="mt-1 text-3xl font-bold">Stores</h2>
      </div>

      {notice && (
        <p
          role="status"
          className="mb-4 rounded border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700"
        >
          {notice}
        </p>
      )}

      {query.isLoading && <TableSkeleton columns={4} />}
      {query.isError && <p className="text-red-600">Unable to load stores.</p>}

      {query.data && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-slate-500">
                    No stores yet.
                  </TableCell>
                </TableRow>
              ) : (
                stores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell>{store.name}</TableCell>
                    <TableCell>{store.owner_email ?? store.owner_id}</TableCell>
                    <TableCell>
                      <Badge tone={store.is_suspended ? "danger" : "success"}>
                        {store.is_suspended ? "Suspended" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setNotice(null);
                            setAction({ kind: "suspend", store });
                          }}
                        >
                          {store.is_suspended ? "Unsuspend" : "Suspend"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            setNotice(null);
                            setAction({ kind: "delete", store });
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          Page {page} of {totalPages}
          {query.data && ` · ${query.data.pagination.total} stores`}
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

      {action && dialog && (
        <ReasonDialog
          open
          title={dialog.title}
          description={dialog.description}
          confirmLabel={dialog.confirmLabel}
          busyLabel={dialog.busyLabel}
          tone={dialog.tone}
          onClose={() => setAction(null)}
          onConfirm={(reason) => run.mutateAsync({ act: action, reason })}
        />
      )}
    </section>
  );
}
