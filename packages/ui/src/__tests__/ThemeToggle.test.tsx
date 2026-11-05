import { ThemeToggle } from "@nearcommerce/ui/src/index";
import { fireEvent, render, screen } from "@testing-library/react";

type Doc = Document & { startViewTransition?: unknown };
const doc = document as Doc;
const animate = jest.fn();
let transition: jest.Mock;

const deviceIs = (scheme: "light" | "dark") =>
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query.includes("prefers-color-scheme: dark") && scheme === "dark",
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
  });

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  animate.mockReset();
  (document.documentElement as unknown as { animate: unknown }).animate = animate;
  deviceIs("light");
  transition = jest.fn((update: () => void) => {
    update();
    return { ready: Promise.resolve(), finished: Promise.resolve() };
  });
  doc.startViewTransition = transition;
});

afterEach(() => {
  delete doc.startViewTransition;
});

const radio = (name: RegExp) => screen.getByRole("radio", { name });

// jsdom has no layout; give the pressed button a position.
const placeAt = (el: HTMLElement, left: number, top: number) =>
  (el.getBoundingClientRect = () =>
    ({ left, top, width: 40, height: 20, right: left + 40, bottom: top + 20 }) as DOMRect);

describe("ThemeToggle wave", () => {
  it("spreads the new theme from the pressed button, and the page changes inside the transition", async () => {
    render(<ThemeToggle compact />);
    placeAt(radio(/^Dark$/), 100, 50);

    fireEvent.click(radio(/^Dark$/));

    expect(transition).toHaveBeenCalledTimes(1);
    // The theme was switched synchronously inside the transition callback.
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("nearcommerce-theme")).toBe("dark");
    await Promise.resolve();
    await Promise.resolve();
    // Origin is the centre of the pressed button.
    expect(animate.mock.calls[0][0].clipPath[0]).toBe("circle(0px at 120px 60px)");
    expect(radio(/^Dark$/)).toHaveAttribute("aria-checked", "true");
  });

  it("waves for dark to light too", () => {
    render(<ThemeToggle compact />);
    fireEvent.click(radio(/^Dark$/));
    transition.mockClear();
    fireEvent.click(radio(/^Light$/));
    expect(transition).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("does nothing when the theme that is already chosen is pressed", () => {
    render(<ThemeToggle compact />);
    // Starts on Auto.
    fireEvent.click(radio(/^Auto$/));
    expect(transition).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("changes without a wave when the choice would look the same as what is showing", () => {
    // Auto on a light device already looks light, so forcing Light changes nothing visible.
    render(<ThemeToggle compact />);
    fireEvent.click(radio(/^Light$/));
    expect(transition).not.toHaveBeenCalled();
    expect(radio(/^Light$/)).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("still switches theme when the browser has no View Transitions", () => {
    delete doc.startViewTransition;
    render(<ThemeToggle compact />);
    fireEvent.click(radio(/^Dark$/));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
