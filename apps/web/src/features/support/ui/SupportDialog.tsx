import { getSupportChannels } from "@/api/support";
import { Button, Modal } from "@/components/ui";
import { SUPPORT_KEY } from "@/constants";
import { useQuery } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onClose: () => void;
}

// Official support channels (SRS 3.1.4), loaded from GET /support so contact details
// change on the server without a web release.
export function SupportDialog({ open, onClose }: Props) {
  const query = useQuery({
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
      title="Contact support"
      description="Our team can help with your store, products, suspensions and account."
      size="sm"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {query.isLoading && (
        <p className="text-sm text-slate-500">Loading support details…</p>
      )}

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
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd>
              <a
                className="font-medium text-brand-700 underline-offset-2 hover:underline"
                href={`mailto:${data.channels.email}`}
              >
                {data.channels.email}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Phone</dt>
            <dd>
              <a
                className="font-medium text-brand-700 underline-offset-2 hover:underline"
                href={`tel:${data.channels.phone}`}
              >
                {data.channels.phone}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Hours</dt>
            <dd className="font-medium text-slate-900">
              {data.operating_hours}
            </dd>
          </div>
        </dl>
      )}
    </Modal>
  );
}
