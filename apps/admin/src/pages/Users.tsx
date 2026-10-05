import {
  ADMIN_USERS_KEY,
  deleteUser,
  demoteAdmin,
  getUsers,
  toggleUserSuspension,
  type UserFilters,
} from "@/api/admin";
import { ReasonDialog } from "@/components/ReasonDialog";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { getCurrentUserId } from "@/session";
import type { AdminUser } from "@/types/admin";
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

type Action = {
  kind: "suspend" | "demote" | "delete";
  user: AdminUser;
};

const ROLE_LABELS: Record<AdminUser["role"], string> = {
  CUSTOMER: "Customer",
  STORE_OWNER: "Store owner",
  SYSTEM_ADMIN: "System admin",
};

const selectClass =
  "rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400";

export default function Users() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserFilters["role"] | "">("");
  const [status, setStatus] = useState<UserFilters["status"] | "">("");
  const [action, setAction] = useState<Action | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const q = useDebouncedValue(search.trim(), 300);
  const filters: UserFilters = {
    q,
    role: role || undefined,
    status: status || undefined,
  };
  const currentUserId = getCurrentUserId();

  const query = useQuery({
    queryKey: [...ADMIN_USERS_KEY, page, filters],
    queryFn: () => getUsers(page, 20, filters),
  });

  // Any filter change goes back to the first page.
  const changeFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const run = useMutation({
    mutationFn: ({ act, reason }: { act: Action; reason: string }) => {
      if (act.kind === "demote") return demoteAdmin(act.user.id, reason);
      if (act.kind === "delete") return deleteUser(act.user.id, reason);
      return toggleUserSuspension(act.user.id, !act.user.is_suspended, reason);
    },
    onSuccess: (_data, { act }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
      setNotice(
        {
          suspend: act.user.is_suspended
            ? `${act.user.email} was unsuspended.`
            : `${act.user.email} was suspended.`,
          demote: `${act.user.email} is now a customer.`,
          delete: `${act.user.email} was deleted.`,
        }[act.kind],
      );
      setAction(null);
    },
  });

  const totalPages = Math.max(
    1,
    Math.ceil(
      (query.data?.pagination.total ?? 0) /
        (query.data?.pagination.limit ?? 20),
    ),
  );
  const users = query.data?.data ?? [];

  const dialog = action && dialogCopy(action);

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
            Moderation
          </p>
          <h2 className="mt-1 text-3xl font-bold">Users</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            aria-label="Search users"
            value={search}
            onChange={(e) => changeFilter(() => setSearch(e.target.value))}
            placeholder="Search name or email"
            className={`${selectClass} w-56`}
          />
          <select
            aria-label="Filter by role"
            value={role}
            onChange={(e) =>
              changeFilter(() => setRole(e.target.value as typeof role))
            }
            className={selectClass}
          >
            <option value="">All roles</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) =>
              changeFilter(() => setStatus(e.target.value as typeof status))
            }
            className={selectClass}
          >
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {notice && (
        <p
          role="status"
          className="mb-4 rounded border border-emerald-800 bg-emerald-950 px-4 py-2 text-sm text-emerald-300"
        >
          {notice}
        </p>
      )}

      {query.isError ? (
        <p role="alert" className="text-red-400">
          Unable to load users.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-slate-400"
                  >
                    Loading users…
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-slate-400"
                  >
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    isSelf={user.id === currentUserId}
                    onAction={(kind) => {
                      setNotice(null);
                      setAction({ kind, user });
                    }}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
        <span>
          Page {page} of {totalPages}
          {query.data && ` · ${query.data.pagination.total} users`}
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

function UserRow({
  user,
  isSelf,
  onAction,
}: {
  user: AdminUser;
  isSelf: boolean;
  onAction: (kind: Action["kind"]) => void;
}) {
  const isAdmin = user.role === "SYSTEM_ADMIN";
  return (
    <TableRow className="hover:bg-slate-800/60">
      <TableCell>
        {user.full_name}
        {isSelf && <span className="ml-2 text-xs text-slate-500">(you)</span>}
      </TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>{ROLE_LABELS[user.role] ?? user.role}</TableCell>
      <TableCell>
        <span
          className={user.is_suspended ? "text-red-400" : "text-emerald-400"}
        >
          {user.is_suspended ? "Suspended" : "Active"}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={isAdmin}
            title={isAdmin ? "Demote an admin before suspending" : undefined}
            className={
              user.is_suspended
                ? "border-emerald-700 text-emerald-300"
                : "border-amber-700 text-amber-300"
            }
            onClick={() => onAction("suspend")}
          >
            {user.is_suspended ? "Unsuspend" : "Suspend"}
          </Button>
          {isAdmin && (
            <Button
              type="button"
              disabled={isSelf}
              title={isSelf ? "Another admin must demote you" : undefined}
              onClick={() => onAction("demote")}
            >
              Demote
            </Button>
          )}
          <Button
            type="button"
            variant="danger"
            disabled={isAdmin || isSelf}
            title={
              isAdmin
                ? "Demote this admin before deleting the account"
                : undefined
            }
            onClick={() => onAction("delete")}
          >
            Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function dialogCopy({ kind, user }: Action) {
  if (kind === "demote")
    return {
      title: `Demote ${user.email}?`,
      description:
        "They become a customer, lose access to the admin console immediately and are signed out everywhere.",
      confirmLabel: "Demote to customer",
      busyLabel: "Demoting…",
      tone: "danger" as const,
    };
  if (kind === "delete")
    return {
      title: `Delete ${user.email}?`,
      description:
        "This permanently removes the account, their stores, products and reviews. Household lists they own pass to the next member. A snapshot is kept in the audit log.",
      confirmLabel: "Delete account",
      busyLabel: "Deleting…",
      tone: "danger" as const,
    };
  return user.is_suspended
    ? {
        title: `Unsuspend ${user.email}?`,
        description: "They can sign in again and their stores become visible.",
        confirmLabel: "Unsuspend",
        busyLabel: "Unsuspending…",
        tone: "primary" as const,
      }
    : {
        title: `Suspend ${user.email}?`,
        description:
          "They are blocked immediately and their stores and products are hidden from shoppers.",
        confirmLabel: "Suspend",
        busyLabel: "Suspending…",
        tone: "danger" as const,
      };
}
