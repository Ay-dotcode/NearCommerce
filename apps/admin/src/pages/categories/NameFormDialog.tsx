import { NameForm } from "@/forms/NameForm";
import { useNameForm } from "@/forms/useNameForm";
import { Button, Modal } from "@nearcommerce/ui";
import { useId } from "react";

interface Props {
  open: boolean;
  title: string;
  description?: string;
  initialName?: string;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}

// Dialog to add or rename a category or subcategory. The form itself lives in forms/.
export function NameFormDialog({
  open,
  title,
  description,
  initialName = "",
  submitLabel,
  onClose,
  onSubmit,
}: Props) {
  const formId = useId();
  const { formik, busy } = useNameForm(open, initialName, onSubmit);

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!busy}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={busy}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <NameForm formik={formik} formId={formId} />
    </Modal>
  );
}
