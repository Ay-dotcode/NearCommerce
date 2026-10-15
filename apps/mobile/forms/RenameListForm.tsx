import { renameList } from "@/api/lists";
import { InlineForm } from "@/forms/InlineForm";

type Props = {
  listId: string;
  name: string;
  // Called after a successful save or when the owner cancels.
  onDone: (saved: boolean) => void;
};

export default function RenameListForm({ listId, name, onDone }: Props) {
  return (
    <InlineForm
      initialValue={name}
      accessibilityLabel="List name"
      maxLength={100}
      autoFocus
      submitLabel="Save"
      submitAccessibilityLabel="Save name"
      cancel={{
        label: "Cancel",
        accessibilityLabel: "Cancel rename",
        onPress: () => onDone(false),
      }}
      errorFallback="Couldn't rename the list. Please try again."
      resetOnSuccess={false}
      onSubmit={async (value) => {
        // Saving the same name is just a cancel.
        if (value === name) return onDone(false);
        await renameList(listId, value);
        onDone(true);
      }}
    />
  );
}
