import { SUPPORT_KEY } from "@/constants";
import { getSupportChannels, type SupportChannels } from "@nearcommerce/api";
import { Button, Modal, Skeleton, SkeletonGroup } from "@nearcommerce/ui";
import { useQuery } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

function ContactRow({
  label,
  href,
  value,
}: {
  label: string;
  href: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd>
        <a
          className="font-medium text-brand-700 underline-offset-2 hover:underline"
          href={href}
        >
          {value}
        </a>
      </dd>
    </div>
  );
}

// Placeholder with the same rows (label line + contact line) as the loaded details.
function SupportSkeleton() {
  return (
    <SkeletonGroup label="Support details" className="space-y-4">
      {[0, 1].map((i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-48" />
        </div>
      ))}
    </SkeletonGroup>
  );
}

// Official support channels (SRS 3.1.4), loaded from GET /support so contact details
// change on the server without a web release.
export function SupportDialog({
  open,
  onClose,
  title = "Contact support",
  description = "Our team can help with your store, products, suspensions and account.",
}: Props) {
  const query = useQuery<SupportChannels>({
    queryKey: SUPPORT_KEY,
    queryFn: getSupportChannels,
    enabled: open,
    staleTime: 10 * 60 * 1000,
  });

  const data = query.data;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {query.isLoading && <SupportSkeleton />}

      {query.isError && (
        <div role="alert" className="space-y-3">
          <p className="text-sm text-red-800">
            We couldn&apos;t load the support details.
          </p>
          <Button variant="secondary" size="sm" onClick={() => query.refetch()}>
            Try again
          </Button>
        </div>
      )}

      {data && (
        <dl className="space-y-4 text-sm">
          <ContactRow
            label="Email"
            href={`mailto:${data.channels.email}`}
            value={data.channels.email}
          />
          <ContactRow
            label="Phone"
            href={`tel:${data.channels.phone}`}
            value={data.channels.phone}
          />
        </dl>
      )}
    </Modal>
  );
}
