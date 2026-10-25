import { OwnerTour } from "@/features/onboarding/OwnerTour";
import { OWNER_TOUR_STEPS } from "@/features/onboarding/tourSteps";
import { useOwnerTour } from "@/features/onboarding/useOwnerTour";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from "@testing-library/react";

const SEEN = "nc-owner-tour-seen";
const LAST = OWNER_TOUR_STEPS.length;

beforeEach(() => localStorage.clear());

describe("OwnerTour", () => {
  const open = (onClose = jest.fn()) => {
    render(<OwnerTour open onClose={onClose} />);
    return onClose;
  };
  const dialog = () => screen.getByRole("dialog");
  const next = () =>
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

  it("renders nothing while closed", () => {
    render(<OwnerTour open={false} onClose={jest.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("is an accessible dialog in the document body that starts at step 1", () => {
    open();
    expect(dialog()).toHaveAccessibleName("Welcome to Near Commerce");
    expect(dialog().parentElement?.parentElement).toBe(document.body);
    expect(screen.getByText(`Step 1 of ${LAST}`)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Back" }),
    ).not.toBeInTheDocument();
  });

  it("explains every step with a picture, a sentence and tips", () => {
    open();
    for (let i = 0; i < LAST; i++) {
      const step = OWNER_TOUR_STEPS[i];
      expect(dialog()).toHaveAccessibleName(step.title);
      expect(screen.getByText(step.body)).toBeInTheDocument();
      for (const tip of step.tips)
        expect(screen.getByText(tip)).toBeInTheDocument();
      expect(within(dialog()).getByRole("img")).toBeInTheDocument();
      if (i < LAST - 1) next();
    }
  });

  it("moves forward and back with the buttons", () => {
    open();
    next();
    expect(screen.getByText(`Step 2 of ${LAST}`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText(`Step 1 of ${LAST}`)).toBeInTheDocument();
  });

  it("moves with the arrow keys and never past either end", () => {
    open();
    fireEvent.keyDown(dialog(), { key: "ArrowLeft" });
    expect(screen.getByText(`Step 1 of ${LAST}`)).toBeInTheDocument();
    fireEvent.keyDown(dialog(), { key: "ArrowRight" });
    expect(screen.getByText(`Step 2 of ${LAST}`)).toBeInTheDocument();
    for (let i = 0; i < LAST + 3; i++)
      fireEvent.keyDown(dialog(), { key: "ArrowRight" });
    expect(screen.getByText(`Step ${LAST} of ${LAST}`)).toBeInTheDocument();
  });

  it("jumps to a step from the progress dots", () => {
    open();
    fireEvent.click(
      screen.getByRole("button", { name: /Go to step 3: Add your products/ }),
    );
    expect(dialog()).toHaveAccessibleName("Add your products");
    expect(
      screen.getByRole("button", { name: /Go to step 3/ }),
    ).toHaveAttribute("aria-current", "step");
  });

  it("can be skipped at any step except the last, and Escape skips too", () => {
    const onClose = open();
    fireEvent.click(screen.getByRole("button", { name: "Skip tour" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("ends with a call to action instead of Next or Skip", () => {
    const onClose = open();
    fireEvent.click(
      screen.getByRole("button", { name: new RegExp(`Go to step ${LAST}`) }),
    );
    expect(
      screen.queryByRole("button", { name: "Next" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Skip tour" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Let's go" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("starts again from step 1 every time it is reopened", () => {
    const { rerender } = render(<OwnerTour open onClose={jest.fn()} />);
    next();
    next();
    rerender(<OwnerTour open={false} onClose={jest.fn()} />);
    rerender(<OwnerTour open onClose={jest.fn()} />);
    expect(screen.getByText(`Step 1 of ${LAST}`)).toBeInTheDocument();
  });

  it("only promises things the app really does", () => {
    // Guards the copy against drifting from the product's behaviour.
    const text = OWNER_TOUR_STEPS.map((s) =>
      [s.body, ...s.tips].join(" "),
    ).join(" ");
    expect(text).toMatch(/30 days/);
    expect(text).toMatch(/photo before it can be published/i);
    expect(text).toMatch(/Needs verification/);
    expect(text).toMatch(/Confirm still in stock/);
  });
});

describe("useOwnerTour", () => {
  it("opens once for a new owner, then stays closed", () => {
    const { result, unmount } = renderHook(() => useOwnerTour());
    expect(result.current.open).toBe(true);
    act(() => result.current.finish());
    expect(result.current.open).toBe(false);
    expect(localStorage.getItem(SEEN)).toBe("1");
    unmount();

    const again = renderHook(() => useOwnerTour());
    expect(again.result.current.open).toBe(false);
  });

  it("waits until the page behind it is ready", () => {
    const { result, rerender } = renderHook(
      ({ ready }) => useOwnerTour(ready),
      {
        initialProps: { ready: false },
      },
    );
    expect(result.current.open).toBe(false);
    rerender({ ready: true });
    expect(result.current.open).toBe(true);
  });

  it("can be started by hand even after it was seen", () => {
    localStorage.setItem(SEEN, "1");
    const { result } = renderHook(() => useOwnerTour());
    expect(result.current.open).toBe(false);
    act(() => result.current.start());
    expect(result.current.open).toBe(true);
    act(() => result.current.finish());
    expect(result.current.open).toBe(false);
  });

  it("does not nag on every load when storage is blocked", () => {
    const get = jest
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    const { result } = renderHook(() => useOwnerTour());
    expect(result.current.open).toBe(false);
    get.mockRestore();
  });
});
