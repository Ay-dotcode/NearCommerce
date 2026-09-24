import { getUsers, toggleUserSuspension } from "@/api/admin";
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
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";

const columnHelper = createColumnHelper<AdminUser>();

export default function AdminUsers() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin-users", page],
    queryFn: () => getUsers(page),
  });
  const mutation = useMutation({
    mutationFn: ({
      id,
      suspended,
      reason,
    }: {
      id: string;
      suspended: boolean;
      reason: string;
    }) => toggleUserSuspension(id, suspended, reason),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const columns = [
    columnHelper.accessor("full_name", { header: "Name" }),
    columnHelper.accessor("email", { header: "Email" }),
    columnHelper.accessor("role", { header: "Role" }),
    columnHelper.accessor("is_suspended", {
      header: "Status",
      cell: ({ getValue }) => (
        <span className={getValue() ? "text-red-400" : "text-emerald-400"}>
          {getValue() ? "Suspended" : "Active"}
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const user = row.original;
        const targetIsAdmin = user.role === "SYSTEM_ADMIN";
        return (
          <Button
            type="button"
            disabled={targetIsAdmin || mutation.isPending}
            className={
              user.is_suspended
                ? "border-emerald-700 text-emerald-300"
                : "border-red-700 text-red-300"
            }
            onClick={() => {
              const reason = window.prompt(
                `Reason for ${user.is_suspended ? "unsuspending" : "suspending"} ${user.email}?`,
              );
              if (reason?.trim())
                mutation.mutate({
                  id: user.id,
                  suspended: !user.is_suspended,
                  reason,
                });
            }}
          >
            {user.is_suspended ? "Unsuspend" : "Suspend"}
          </Button>
        );
      },
    }),
  ];
  const table = useReactTable({
    data: query.data?.data ?? [],
    columns,
    state: { globalFilter: filter },
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (query.isLoading)
    return <p className="text-slate-400">Loading users...</p>;
  if (query.isError)
    return <p className="text-red-400">Unable to load users.</p>;

  const totalPages = Math.max(
    1,
    Math.ceil(
      (query.data?.pagination.total ?? 0) /
        (query.data?.pagination.limit ?? 20),
    ),
  );
  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
            Moderation
          </p>
          <h2 className="mt-1 text-3xl font-bold">Users</h2>
        </div>
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Search users"
          className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
        />
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-slate-800/60">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-8 text-center text-slate-400"
                >
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </Button>
          <Button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </section>
  );
}
