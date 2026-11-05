import { ThemeWaveHost } from "@/components/ThemeWaveHost";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { changeThemeWithWave } from "@/helpers/themeWave";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Dimensions } from "react-native";

let mockReduceMotion = false;
jest.mock("@/src/hooks/useReduceMotion", () => ({
  useReduceMotion: () => mockReduceMotion,
}));

const ORIGIN = { x: 300, y: 80 };
// Longer than the whole wave (about a second), for waiting on it.
const WAVE_TIMEOUT = 4000;

beforeEach(() => {
  mockReduceMotion = false;
});

describe("changeThemeWithWave", () => {
  it("just changes the theme when nothing is mounted to draw the wave", async () => {
    const apply = jest.fn();
    await changeThemeWithWave(ORIGIN, "#000", apply);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("just changes the theme when it isn't known where the wave should start", async () => {
    render(<ThemeWaveHost />);
    const apply = jest.fn();
    await changeThemeWithWave(undefined, "#000", apply);
    expect(apply).toHaveBeenCalledTimes(1);
  });
});

describe("ThemeWaveHost", () => {
  it("covers the screen, switches the theme while it is covered, then lifts the cover", async () => {
    const api = render(<ThemeWaveHost />);
    expect(api.queryByTestId("theme-wave")).toBeNull();

    let coveredWhenApplied: boolean | null = null;
    const apply = jest.fn(() => {
      coveredWhenApplied = api.queryByTestId("theme-wave") !== null;
    });

    let finished = false;
    const played = changeThemeWithWave(ORIGIN, "#0f172a", apply).then(() => {
      finished = true;
    });

    // The cover goes up first, and the theme has not changed behind it yet.
    await waitFor(() => expect(api.getByTestId("theme-wave")).toBeTruthy());
    expect(apply).not.toHaveBeenCalled();

    await waitFor(() => expect(apply).toHaveBeenCalledTimes(1), {
      timeout: WAVE_TIMEOUT,
    });
    // The theme was switched while the cover was still up, so the change is never seen happening.
    expect(coveredWhenApplied).toBe(true);

    await act(async () => {
      await played;
    });
    expect(finished).toBe(true);
    expect(api.queryByTestId("theme-wave")).toBeNull();
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("is a circle in the new theme's colour, starting from where the choice was tapped", async () => {
    const api = render(<ThemeWaveHost />);
    const played = changeThemeWithWave(ORIGIN, "#0f172a", jest.fn());
    const cover = await waitFor(() => api.getByTestId("theme-wave"));
    const circle = cover.children[0] as unknown as {
      props: { style: Record<string, number | string> };
    };
    const style = circle.props.style;

    expect(style.backgroundColor).toBe("#0f172a");
    // Centred on the tap, and large enough to reach every corner from there.
    expect(Number(style.left) + Number(style.width) / 2).toBeCloseTo(ORIGIN.x);
    expect(Number(style.top) + Number(style.height) / 2).toBeCloseTo(ORIGIN.y);
    const { width, height } = Dimensions.get("window");
    expect(Number(style.width) / 2).toBeGreaterThanOrEqual(
      Math.hypot(Math.max(ORIGIN.x, width - ORIGIN.x), Math.max(ORIGIN.y, height - ORIGIN.y)) - 1,
    );
    await act(async () => {
      await played;
    });
  });

  it("switches instantly, with no wave, when the phone's reduce-motion setting is on", async () => {
    mockReduceMotion = true;
    const api = render(<ThemeWaveHost />);
    const apply = jest.fn();
    await changeThemeWithWave(ORIGIN, "#000", apply);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(api.queryByTestId("theme-wave")).toBeNull();
  });

  it("never loses the theme change if the screen goes away mid-wave", async () => {
    const api = render(<ThemeWaveHost />);
    const apply = jest.fn();
    void changeThemeWithWave(ORIGIN, "#000", apply);
    await waitFor(() => expect(api.getByTestId("theme-wave")).toBeTruthy());
    api.unmount();
    expect(apply).toHaveBeenCalledTimes(1);
  });
});

describe("SegmentedControl reports where it was tapped", () => {
  const options = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];

  it("passes the tap position along with the choice", () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <SegmentedControl label="Theme" options={options} value="light" onChange={onChange} />,
    );
    fireEvent.press(getByTestId("segmented-control-dark"), {
      nativeEvent: { pageX: 120, pageY: 340 },
    });
    expect(onChange).toHaveBeenCalledWith("dark", { x: 120, y: 340 });
  });

  it("still reports the choice when the position isn't available", () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <SegmentedControl label="Theme" options={options} value="light" onChange={onChange} />,
    );
    fireEvent.press(getByTestId("segmented-control-dark"), { nativeEvent: {} });
    expect(onChange).toHaveBeenCalledWith("dark", undefined);
  });
});
