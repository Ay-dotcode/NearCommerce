import { ErrorBoundary, NotFoundPage } from "@nearcommerce/ui/src/index";
import { fireEvent, render, screen } from "@testing-library/react";

let shouldThrow = true;
function Bomb() {
  if (shouldThrow) throw new Error("boom");
  return <p>All good</p>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    shouldThrow = true;
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it("shows an accessible fallback instead of a blank page and reports the error", () => {
    const onError = jest.fn();
    render(
      <ErrorBoundary onError={onError}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toBe("boom");
  });

  it("renders the children again after Try again once the problem is gone", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("renders children untouched when nothing fails", () => {
    shouldThrow = false;
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText("All good")).toBeInTheDocument();
  });
});

describe("NotFoundPage", () => {
  it("explains the page is missing and shows the supplied action", () => {
    render(<NotFoundPage action={<a href="/">Back home</a>} />);
    expect(
      screen.getByRole("heading", { name: "Page not found" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back home" })).toBeInTheDocument();
  });
});
