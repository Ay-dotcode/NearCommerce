import {
  THEME_WAVE_MS,
  startThemeWave,
  waveRadius,
} from "@nearcommerce/ui/src/helpers/themeTransition";

type Doc = Document & { startViewTransition?: unknown };
const doc = document as Doc;
const animate = jest.fn();

const withMotion = (reduced: boolean) =>
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: reduced && query.includes("prefers-reduced-motion"),
    }),
  });

beforeEach(() => {
  animate.mockReset();
  (document.documentElement as unknown as { animate: unknown }).animate = animate;
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  withMotion(false);
});

afterEach(() => {
  delete doc.startViewTransition;
});

describe("waveRadius", () => {
  it("reaches the corner farthest from where the wave starts", () => {
    expect(waveRadius({ x: 0, y: 0 }, 1000, 800)).toBeCloseTo(Math.hypot(1000, 800));
    expect(waveRadius({ x: 1000, y: 800 }, 1000, 800)).toBeCloseTo(Math.hypot(1000, 800));
    expect(waveRadius({ x: 900, y: 40 }, 1000, 800)).toBeCloseTo(Math.hypot(900, 760));
  });
});

describe("startThemeWave", () => {
  it("just changes the theme where View Transitions are not supported", () => {
    const change = jest.fn();
    startThemeWave({ x: 10, y: 10 }, change);
    expect(change).toHaveBeenCalledTimes(1);
    expect(animate).not.toHaveBeenCalled();
  });

  it("just changes the theme for people who asked for less motion", () => {
    withMotion(true);
    const start = jest.fn();
    doc.startViewTransition = start;
    const change = jest.fn();
    startThemeWave({ x: 10, y: 10 }, change);
    expect(change).toHaveBeenCalledTimes(1);
    expect(start).not.toHaveBeenCalled();
  });

  it("changes the theme inside the transition, then grows a circle from the origin", async () => {
    const change = jest.fn();
    doc.startViewTransition = jest.fn((update: () => void) => {
      update();
      return { ready: Promise.resolve(), finished: Promise.resolve() };
    });

    startThemeWave({ x: 900, y: 40 }, change);
    await Promise.resolve();
    await Promise.resolve();

    expect(change).toHaveBeenCalledTimes(1);
    expect(animate).toHaveBeenCalledTimes(1);
    const [keyframes, options] = animate.mock.calls[0];
    expect(keyframes.clipPath[0]).toBe("circle(0px at 900px 40px)");
    expect(keyframes.clipPath[1]).toBe(
      `circle(${Math.hypot(900, 760)}px at 900px 40px)`,
    );
    expect(options).toMatchObject({
      duration: THEME_WAVE_MS,
      pseudoElement: "::view-transition-new(root)",
    });
  });

  it("does not break when the browser skips the transition", async () => {
    const change = jest.fn();
    doc.startViewTransition = jest.fn((update: () => void) => {
      update();
      return { ready: Promise.reject(new Error("skipped")), finished: Promise.resolve() };
    });
    startThemeWave({ x: 1, y: 1 }, change);
    await Promise.resolve();
    await Promise.resolve();
    expect(change).toHaveBeenCalledTimes(1);
    expect(animate).not.toHaveBeenCalled();
  });
});
