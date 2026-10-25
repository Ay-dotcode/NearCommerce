import { SplashScreen } from "@nearcommerce/ui/src/index";
import { act, render, screen } from "@testing-library/react";

const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
};

// Plays the animation and the exit fade. They are separate steps (the exit timer only starts
// once React has rendered the "leaving" phase), so time is advanced in two stages.
const playThrough = (playMs: number) => {
  act(() => void jest.advanceTimersByTime(playMs));
  act(() => void jest.advanceTimersByTime(400));
};

describe("SplashScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    sessionStorage.clear();
    setReducedMotion(false);
  });
  afterEach(() => jest.useRealTimers());

  const renderSplash = () =>
    render(
      <SplashScreen title="Near Commerce" subtitle="Store Owner Portal" durationMs={1000}>
        <button>App content</button>
      </SplashScreen>,
    );

  it("covers the app, announces itself, and keeps the app out of reach while playing", () => {
    renderSplash();
    expect(
      screen.getByRole("status", { name: "Loading Near Commerce" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Store Owner Portal")).toBeInTheDocument();
    // The app is already mounted underneath (so it can load), but is inert.
    expect(screen.getByText("App content").parentElement).toHaveAttribute("inert");
  });

  it("fades out after the duration, then reveals an interactive app", () => {
    renderSplash();
    act(() => void jest.advanceTimersByTime(1000));
    // Leaving: still on screen for the exit fade.
    expect(screen.getByRole("status").className).toContain("animate-splash-out");
    act(() => void jest.advanceTimersByTime(400));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("App content").parentElement).not.toHaveAttribute("inert");
  });

  it("plays once per tab session", () => {
    const first = renderSplash();
    playThrough(1000);
    first.unmount();

    renderSplash();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("App content")).toBeInTheDocument();
  });

  it("is much shorter when the person asks for reduced motion", () => {
    setReducedMotion(true);
    renderSplash();
    // Reduced motion: half a second instead of the full animation.
    act(() => void jest.advanceTimersByTime(499));
    expect(screen.getByRole("status")).toBeInTheDocument();
    playThrough(1);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("still works when session storage is blocked", () => {
    const get = jest
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    const set = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    renderSplash();
    expect(screen.getByRole("status")).toBeInTheDocument();
    playThrough(1000);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    get.mockRestore();
    set.mockRestore();
  });
});
