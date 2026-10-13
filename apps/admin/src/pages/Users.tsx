import {
  deleteUser,
  demoteAdmin,
  getUsers,
  toggleUserSuspension,
} from "@/api/admin";
import { ReasonDialog } from "@/components/ReasonDialog";
import { UserDetailsModal } from "@/components/UserDetailsModal";
import { ADMIN_USER_KEY, ADMIN_USERS_KEY } from "@/constants";
import {
  actionDialogCopy,
  ROLE_LABELS,
  userActionRules,
  type UserActionKind,
} from "@/lib/userActions";
import { getCurrentUserId } from "@/session";
import type { AdminUser, UserFilters } from "@/types/admin";
import {
  Badge,
  Button,
  SelectField,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TextField,
  useDebouncedValue,
} from "@nearcommerce/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

type Action = { kind: UserActionKind; user: AdminUser };

const COLUMNS = 5;

export default function Users() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserFilters["role"] | "">("");
  const [status, setStatus] = useState<UserFilters["status"] | "">("");
  const [action, setAction] = useState<Action | null>(null);
  const [viewing, setViewing] = useState<AdminUser | null>(null);
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
      queryClient.invalidateQueries({ queryKey: ADMIN_USER_KEY });
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
  const dialog = action && actionDialogCopy(action.kind, action.user);

  // Starts a moderation action from the row or the details dialog.
  const startAction = (kind: UserActionKind, user: AdminUser) => {
    setNotice(null);
    setViewing(null);
    setAction({ kind, user });
  };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-700">
            Moderation
          </p>
          <h2 className="mt-1 text-3xl font-bold">Users</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <TextField
            type="search"
            label="Search users"
            hideLabel
            value={search}
            onChange={(e) => changeFilter(() => setSearch(e.target.value))}
            placeholder="Search name or email"
            className="w-56"
          />
          <SelectField
            label="Filter by role"
            hideLabel
            value={role}
            onChange={(e) =>
              changeFilter(() => setRole(e.target.value as typeof role))
            }
          >
            <option value="">All roles</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Filter by status"
            hideLabel
            value={status}
            onChange={(e) =>
              changeFilter(() => setStatus(e.target.value as typeof status))
            }
          >
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </SelectField>
        </div>
      </div>

      {notice && (
        <p
          role="status"
          className="mb-4 rounded border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700"
        >
          {notice}
        </p>
      )}

      {query.isError ? (
        <p role="alert" className="text-red-600">
          Unable to load users.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
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
                Array.from({ length: 8 }, (_, r) => (
                  <TableRow key={r} aria-hidden="true">
                    {Array.from({ length: COLUMNS }, (_, c) => (
                      <TableCell key={c}>
                        <Skeleton className="h-5 w-full min-w-16" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={COLUMNS}
                    className="py-8 text-center text-slate-500"
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
                    onOpen={() => setViewing(user)}
                    onAction={(kind) => startAction(kind, user)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          Page {page} of {totalPages}
          {query.data && ` · ${query.data.pagination.total} users`}
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

      <UserDetailsModal
        user={viewing}
        currentUserId={currentUserId}
        onClose={() => setViewing(null)}
        onAction={startAction}
      />

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
  onOpen,
  onAction,
}: {
  user: AdminUser;
  isSelf: boolean;
  onOpen: () => void;
  onAction: (kind: UserActionKind) => void;
}) {
  const rules = userActionRules(user, isSelf);
  return (
    <TableRow
      className="cursor-pointer hover:bg-slate-50"
      onClick={(e) => {
        // Row click opens the details, except for clicks on its own buttons.
        if (!(e.target as HTMLElement).closest("button, a")) onOpen();
      }}
    >
      <TableCell>
        <button
          type="button"
          onClick={onOpen}
          aria-label={`View details: ${user.full_name}`}
          className="rounded text-left font-medium hover:text-brand-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {user.full_name}
        </button>
        {isSelf && <span className="ml-2 text-xs text-slate-500">(you)</span>}
      </TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>{ROLE_LABELS[user.role] ?? user.role}</TableCell>
      <TableCell>
        <Badge tone={user.is_suspended ? "danger" : "success"}>
          {user.is_suspended ? "Suspended" : "Active"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!rules.canSuspend}
            title={rules.suspendHint}
            onClick={() => onAction("suspend")}
          >
            {user.is_suspended ? "Unsuspend" : "Suspend"}
          </Button>
          {rules.showDemote && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!rules.canDemote}
              title={rules.demoteHint}
              onClick={() => onAction("demote")}
            >
              Demote
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={!rules.canDelete}
            title={rules.deleteHint}
            onClick={() => onAction("delete")}
          >
            Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
