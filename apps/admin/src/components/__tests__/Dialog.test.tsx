import { Dialog } from "@/components/Dialog";
import { fireEvent, render, screen } from "@testing-library/react";

const setup = (props: Partial<React.ComponentProps<typeof Dialog>> = {}) => {
  const onClose = jest.fn();
  render(
    <>
      <button>Opener</button>
      <Dialog
        open
        onClose={onClose}
        title="Edit thing"
        description="Careful"
        footer={<button>Save</button>}
        {...props}
      >
        <input aria-label="First" />
        <input aria-label="Second" data-autofocus />
      </Dialog>
    </>,
  );
  return onClose;
};

describe("admin Dialog", () => {
  it("renders nothing when closed", () => {
    render(
      <Dialog open={false} onClose={jest.fn()} title="x">
        body
      </Dialog>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("is a labelled, described modal dialog", () => {
    setup();
    const dialog = screen.getByRole("dialog", { name: "Edit thing" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("Careful");
  });

  it("focuses the data-autofocus field, else the first focusable", () => {
    setup();
    expect(screen.getByLabelText("Second")).toHaveFocus();
  });

  it("closes on Escape and on backdrop click", () => {
    const onClose = setup();
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByTestId("dialog-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("ignores Escape and backdrop while not dismissible", () => {
    const onClose = setup({ dismissible: false });
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByTestId("dialog-backdrop"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps Tab focus inside the dialog", () => {
    setup();
    const save = screen.getByRole("button", { name: "Save" });
    save.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(screen.getByLabelText("First")).toHaveFocus(); // wrapped to the first control
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(save).toHaveFocus(); // wrapped back to the last
  });

  it("returns focus to the trigger when it closes", () => {
    const { rerender } = render(<button>Opener</button>);
    screen.getByText("Opener").focus();
    rerender(
      <>
        <button>Opener</button>
        <Dialog open onClose={jest.fn()} title="t">
          <input aria-label="in" />
        </Dialog>
      </>,
    );
    expect(screen.getByLabelText("in")).toHaveFocus();
    rerender(
      <>
        <button>Opener</button>
        <Dialog open={false} onClose={jest.fn()} title="t">
          <input aria-label="in" />
        </Dialog>
      </>,
    );
    expect(screen.getByText("Opener")).toHaveFocus();
  });
});
