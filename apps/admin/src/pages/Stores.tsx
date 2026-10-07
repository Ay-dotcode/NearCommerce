import { deleteStore, getStores, toggleStoreSuspension } from "@/api/admin";
import { ReasonDialog } from "@/components/ReasonDialog";
import { ADMIN_AUDIT_LOGS_KEY, ADMIN_STORES_KEY } from "@/constants";
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
import { useState } from "react";

type Action = { kind: "suspend" | "delete"; store: AdminStore };

function dialogCopy({ kind, store }: Action) {
  if (kind === "delete")
    return {
      title: `Delete ${store.name}?`,
      description:
        "This permanently removes the store and all of its inventory. A snapshot is kept in the audit log.",
      confirmLabel: "Delete store",
      busyLabel: "Deleting…",
      tone: "danger" as const,
    };
  return store.is_suspended
    ? {
        title: `Unsuspend ${store.name}?`,
        description:
          "The store and its published products become visible again.",
        confirmLabel: "Unsuspend",
        busyLabel: "Unsuspending…",
        tone: "primary" as const,
      }
    : {
        title: `Suspend ${store.name}?`,
        description:
          "The store is hidden from search and direct links right away.",
        confirmLabel: "Suspend",
        busyLabel: "Suspending…",
        tone: "danger" as const,
      };
}

export default function Stores() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<Action | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const query = useQuery({
    queryKey: [...ADMIN_STORES_KEY, page],
    queryFn: () => getStores(page),
  });

  const run = useMutation({
    mutationFn: ({ act, reason }: { act: Action; reason: string }) =>
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
  const dialog = action && dialogCopy(action);

  return (
    <section>
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">
          Moderation
        </p>
        <h2 className="mt-1 text-3xl font-bold">Stores</h2>
      </div>

      {notice && (
        <p
          role="status"
          className="mb-4 rounded border border-emerald-800 bg-emerald-950 px-4 py-2 text-sm text-emerald-300"
        >
          {notice}
        </p>
      )}

      {query.isLoading && <p className="text-slate-400">Loading stores…</p>}
      {query.isError && <p className="text-red-400">Unable to load stores.</p>}

      {query.data && (
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
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
                  <TableCell colSpan={4} className="text-slate-400">
                    No stores yet.
                  </TableCell>
                </TableRow>
              ) : (
                stores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell>{store.name}</TableCell>
                    <TableCell>{store.owner_email ?? store.owner_id}</TableCell>
                    <TableCell
                      className={
                        store.is_suspended ? "text-red-400" : "text-emerald-400"
                      }
                    >
                      {store.is_suspended ? "Suspended" : "Active"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => {
                            setNotice(null);
                            setAction({ kind: "suspend", store });
                          }}
                        >
                          {store.is_suspended ? "Unsuspend" : "Suspend"}
                        </Button>
                        <Button
                          type="button"
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

      <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
        <span>
          Page {page} of {totalPages}
          {query.data && ` · ${query.data.pagination.total} stores`}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <Button
            type="button"
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
