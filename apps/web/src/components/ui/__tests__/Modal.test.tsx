import { ConfirmDialog, Modal } from "@/components/ui";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

function Harness({ dismissible = true }: { dismissible?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open it</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit thing" description="Make changes" dismissible={dismissible}
        footer={<button>Save</button>}>
        <input aria-label="Name" />
      </Modal>
    </>
  );
}

describe("Modal", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("renders nothing while closed", () => {
    render(<Modal open={false} onClose={() => {}} title="T">x</Modal>);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is an accessible, labelled modal dialog", () => {
    render(<Modal open onClose={() => {}} title="Edit thing" description="Make changes">x</Modal>);
    const dialog = screen.getByRole("dialog", { name: "Edit thing" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("Make changes");
  });

  it("moves focus into the dialog, locks scroll, then restores focus and scroll on close", () => {
    render(<Harness />);
    const trigger = screen.getByText("Open it");
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByLabelText("Name")).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("closes on backdrop click", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Open it"));
    fireEvent.click(screen.getByTestId("modal-backdrop"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("ignores Escape and backdrop clicks when not dismissible (request in flight)", () => {
    render(<Harness dismissible={false} />);
    fireEvent.click(screen.getByText("Open it"));
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByTestId("modal-backdrop"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("traps Tab and Shift+Tab inside the dialog", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Open it"));
    const input = screen.getByLabelText("Name");
    const save = screen.getByText("Save");

    save.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(input).toHaveFocus();

    input.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(save).toHaveFocus();
  });
});

describe("ConfirmDialog", () => {
  const setup = (props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(<ConfirmDialog open title="Delete it?" description="Gone forever" confirmLabel="Delete" onConfirm={onConfirm} onCancel={onCancel} {...props} />);
    return { onConfirm, onCancel };
  };

  it("confirms and cancels", () => {
    const { onConfirm, onCancel } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("requires the exact text before enabling the destructive button", () => {
    const { onConfirm } = setup({ requireText: "Corner Market" });
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button).toBeDisabled();

    const input = screen.getByLabelText(/Type "Corner Market" to confirm/);
    fireEvent.change(input, { target: { value: "corner market" } }); // case matters
    expect(button).toBeDisabled();
    fireEvent.change(input, { target: { value: "Corner Market" } });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onConfirm).toHaveBeenCalled();
  });

  it("disables both buttons and blocks dismissal while loading", () => {
    const { onCancel } = setup({ loading: true });
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Delete/ })).toBeDisabled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).not.toHaveBeenCalled();
  });
});
