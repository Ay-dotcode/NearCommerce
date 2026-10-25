import {
  BusyFieldset,
  Button,
  PasswordField,
  SelectField,
  TextField,
  ToastProvider,
  useToast,
} from "@nearcommerce/ui/src/index";
import { act, fireEvent, render, screen } from "@testing-library/react";

describe("TextField", () => {
  it("associates label, hint and error with the input", () => {
    const { rerender } = render(
      <TextField label="Email" hint="We never share it" />,
    );
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAccessibleDescription("We never share it");
    expect(input).not.toHaveAttribute("aria-invalid");

    rerender(
      <TextField
        label="Email"
        hint="We never share it"
        error="Enter a valid email"
      />,
    );
    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
      "Enter a valid email",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email");
    expect(screen.queryByText("We never share it")).toBeNull(); // error replaces hint
  });

  it("marks required fields visibly and for assistive tech", () => {
    render(<TextField label="Name" required />);
    expect(screen.getByLabelText(/Name/)).toHaveAttribute(
      "aria-required",
      "true",
    );
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("Button", () => {
  it("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("is disabled and busy while loading", () => {
    const onClick = jest.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Toast", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  function Trigger() {
    const toast = useToast();
    return (
      <>
        <button onClick={() => toast.success("Saved")}>ok</button>
        <button onClick={() => toast.error("Broke")}>bad</button>
      </>
    );
  }

  it("announces success politely, errors as alerts, and auto-dismisses", () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("ok"));
    fireEvent.click(screen.getByText("bad"));
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    expect(screen.getByRole("alert")).toHaveTextContent("Broke");

    act(() => {
      jest.advanceTimersByTime(4100);
    });
    expect(screen.queryByText("Saved")).toBeNull();
    expect(screen.getByText("Broke")).toBeInTheDocument(); // errors stay longer
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(screen.queryByText("Broke")).toBeNull();
  });

  it("useToast is a harmless no-op without a provider", () => {
    render(<Trigger />);
    expect(() => fireEvent.click(screen.getByText("ok"))).not.toThrow();
  });
});

describe("PasswordField", () => {
  it("hides the password until the show button is pressed", () => {
    render(<PasswordField label="Password" />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");

    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);

    expect(input).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: "Hide password" }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("has exactly one reveal button and switches off the browser's own (Edge)", () => {
    const { container } = render(<PasswordField label="Password" />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    const cls = container.querySelector("input")!.className;
    expect(cls).toContain("[&::-ms-reveal]:hidden");
    expect(cls).toContain("[&::-ms-clear]:hidden");
  });

  it("keeps the typed value and never submits the form when toggled", () => {
    const onSubmit = jest.fn((e) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <PasswordField label="Password" defaultValue="hunter22" />
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password")).toHaveValue("hunter22");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("is disabled together with the input, and shows errors like other fields", () => {
    render(<PasswordField label="Password" disabled error="Too short" />);
    expect(screen.getByLabelText("Password")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Show password" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Too short");
  });
});

describe("BusyFieldset", () => {
  it("disables every control inside while busy and re-enables them after", () => {
    const Form = ({ busy }: { busy: boolean }) => (
      <form>
        <BusyFieldset busy={busy}>
          <TextField label="Email" />
          <SelectField label="Role">
            <option>a</option>
          </SelectField>
          <button type="submit">Save</button>
        </BusyFieldset>
      </form>
    );
    const { rerender } = render(<Form busy={false} />);
    expect(screen.getByLabelText("Email")).toBeEnabled();

    rerender(<Form busy />);
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.getByLabelText("Role")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    rerender(<Form busy={false} />);
    expect(screen.getByLabelText("Email")).toBeEnabled();
  });
});
