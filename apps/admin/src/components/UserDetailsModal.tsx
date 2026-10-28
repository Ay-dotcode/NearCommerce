import { getUserDetails } from "@/api/admin";
import { ADMIN_USER_KEY } from "@/constants";
import {
  ROLE_LABELS,
  userActionRules,
  type UserActionKind,
} from "@/helpers/userActions";
import type { AdminUser } from "@/types/admin";
import { formatDate, initialOf, timeAgo } from "@nearcommerce/helpers";
import {
  Badge,
  Button,
  Modal,
  Skeleton,
  SkeletonGroup,
} from "@nearcommerce/ui";
import { useQuery } from "@tanstack/react-query";

interface Props {
  user: AdminUser | null;
  currentUserId: string | null;
  onClose: () => void;
  onAction: (kind: UserActionKind, user: AdminUser) => void;
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <SkeletonGroup label="User details" className="space-y-5">
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    </SkeletonGroup>
  );
}

export function UserDetailsModal({
  user,
  currentUserId,
  onClose,
  onAction,
}: Props) {
  const details = useQuery({
    queryKey: [...ADMIN_USER_KEY, user?.id],
    queryFn: () => getUserDetails(user!.id),
    enabled: user !== null,
  });

  const shown = details.data ?? user;
  const rules = shown && userActionRules(shown, shown.id === currentUserId);

  return (
    <Modal
      open={user !== null}
      onClose={onClose}
      title="User details"
      size="md"
      footer={
        shown &&
        rules && (
          <>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            {rules.showPromote && (
              <Button
                variant="secondary"
                disabled={!rules.canPromote}
                title={rules.promoteHint}
                onClick={() => onAction("promote", shown)}
              >
                Make admin
              </Button>
            )}
            {rules.showDemote && (
              <Button
                variant="secondary"
                disabled={!rules.canDemote}
                title={rules.demoteHint}
                onClick={() => onAction("demote", shown)}
              >
                Demote
              </Button>
            )}
            <Button
              variant="secondary"
              disabled={!rules.canSuspend}
              title={rules.suspendHint}
              onClick={() => onAction("suspend", shown)}
            >
              {shown.is_suspended ? "Unsuspend" : "Suspend"}
            </Button>
            <Button
              variant="danger"
              disabled={!rules.canDelete}
              title={rules.deleteHint}
              onClick={() => onAction("delete", shown)}
            >
              Delete
            </Button>
          </>
        )
      }
    >
      {shown && (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-800"
            >
              {initialOf(shown.full_name)}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold">
                {shown.full_name}
                {shown.id === currentUserId && (
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    (you)
                  </span>
                )}
              </h3>
              <p className="truncate text-sm text-slate-500">{shown.email}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge tone="info">{ROLE_LABELS[shown.role]}</Badge>
                <Badge tone={shown.is_suspended ? "danger" : "success"}>
                  {shown.is_suspended ? "Suspended" : "Active"}
                </Badge>
                {rules?.isOwnerAdmin && <Badge tone="info">Owner admin</Badge>}
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <Detail label="Joined">{formatDate(shown.created_at)}</Detail>
            <Detail label="Last updated">{timeAgo(shown.updated_at)}</Detail>
            <div className="col-span-2">
              <dt className="text-slate-500">User ID</dt>
              <dd className="break-all font-mono text-xs">{shown.id}</dd>
            </div>
          </dl>

          {details.isLoading && <DetailsSkeleton />}

          {details.isError && (
            <p role="alert" className="text-sm text-red-600">
              We couldn&apos;t load this user&apos;s activity.
            </p>
          )}

          {details.data && (
            <>
              <ul className="grid grid-cols-3 gap-3 text-center">
                {[
                  ["Stores", details.data.stores.length],
                  ["Reviews", details.data.review_count],
                  ["Shared lists", details.data.list_count],
                ].map(([label, value]) => (
                  <li
                    key={label}
                    className="rounded-lg border border-slate-200 bg-slate-50 py-3"
                  >
                    <p className="text-2xl font-semibold tabular-nums">
                      {value}
                    </p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </li>
                ))}
              </ul>

              {details.data.stores.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-slate-500">
                    Stores
                  </h4>
                  <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                    {details.data.stores.map((store) => (
                      <li
                        key={store.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                      >
                        <span className="truncate font-medium">
                          {store.name}
                        </span>
                        <Badge tone={store.is_suspended ? "danger" : "success"}>
                          {store.is_suspended ? "Suspended" : "Active"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
