import {
  ThemeWaveHost,
  THEME_WAVE_CHANGE_TIMEOUT_MS,
} from "@/components/ThemeWaveHost";
import { ThemeWaveLayer } from "@/components/ThemeWaveLayer";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  changeThemeWithWave,
  getActiveWave,
  isWaveActive,
  subscribeWave,
} from "@/helpers/themeWave";
import { darkTheme, lightTheme, useTheme } from "@/theme";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Text, useColorScheme, View } from "react-native";

jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: jest.fn(() => "light"),
}));
const scheme = useColorScheme as unknown as jest.Mock;

let mockReduceMotion = false;
jest.mock("@/src/hooks/useReduceMotion", () => ({
  useReduceMotion: () => mockReduceMotion,
}));

const ORIGIN = { x: 300, y: 80 };
// Longer than the whole wave (about a second), for waiting on it.
const WAVE_TIMEOUT = 4000;

// The app in miniature: the wave layer first (so it is behind), then the content on top of it.
function Content() {
  return <Text testID="screen-background">{useTheme().colors.background}</Text>;
}
function App() {
  return (
    <View>
      <ThemeWaveLayer token="background" />
      <Content />
      <ThemeWaveHost />
    </View>
  );
}

beforeEach(() => {
  mockReduceMotion = false;
  scheme.mockReturnValue("light");
});

describe("changeThemeWithWave", () => {
  it("just changes the theme when nothing is mounted to draw the wave", async () => {
    const apply = jest.fn();
    await changeThemeWithWave(ORIGIN, apply);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("just changes the theme when it isn't known where the wave should start", async () => {
    render(<ThemeWaveHost />);
    const apply = jest.fn();
    await changeThemeWithWave(undefined, apply);
    expect(apply).toHaveBeenCalledTimes(1);
  });
});

describe("ThemeWaveHost", () => {
  // Switching the phone's look, as `apply` does when it changes the theme.
  const makeApply = (api: ReturnType<typeof render>, to: "dark" | "light") =>
    jest.fn(() => {
      act(() => {
        scheme.mockReturnValue(to);
        api.rerender(<App />);
      });
    });

  it("when the new look isn't known beforehand: puts the wave up, switches the theme, then spreads", async () => {
    const api = render(<App />);
    expect(api.queryByTestId("theme-wave-background")).toBeNull();

    let layerUpWhenApplied: boolean | null = null;
    const apply = jest.fn(() => {
      layerUpWhenApplied = api.queryByTestId("theme-wave-background") !== null;
      act(() => {
        scheme.mockReturnValue("dark");
        api.rerender(<App />);
      });
    });

    let finished = false;
    const played = changeThemeWithWave(ORIGIN, apply).then(() => {
      finished = true;
    });

    await waitFor(() =>
      expect(api.getByTestId("theme-wave-background")).toBeTruthy(),
    );
    await waitFor(() => expect(apply).toHaveBeenCalledTimes(1), {
      timeout: WAVE_TIMEOUT,
    });
    // The old look was already on screen behind the content when the theme changed.
    expect(layerUpWhenApplied).toBe(true);

    await act(async () => {
      await played;
    });
    expect(finished).toBe(true);
    expect(api.queryByTestId("theme-wave-background")).toBeNull();
    expect(isWaveActive()).toBe(false);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("never covers the content: the layer is behind it, can't be tapped, and the screen is see-through", async () => {
    const api = render(<App />);
    expect(api.getByTestId("screen-background").props.children).toBe(
      lightTheme.colors.background,
    );

    const played = changeThemeWithWave(ORIGIN, makeApply(api, "dark"));
    const layer = await waitFor(() => api.getByTestId("theme-wave-background"));

    // Drawn first in its parent, so everything else paints on top of it.
    const parent = api.toJSON() as { children: { props: { testID?: string } }[] };
    expect(parent.children[0].props.testID).toBe("theme-wave-background");
    expect(layer.props.pointerEvents).toBe("none");
    // Screens that paint their own background show the wave through instead.
    expect(api.getByTestId("screen-background").props.children).toBe(
      "transparent",
    );

    await act(async () => {
      await played;
    });
    // And the real background is back, in the new look, once the wave is over.
    expect(api.getByTestId("screen-background").props.children).toBe(
      darkTheme.colors.background,
    );
  });

  it("spreads the new look's colour over the old one", async () => {
    const api = render(<App />);
    const played = changeThemeWithWave(ORIGIN, makeApply(api, "dark"), true);

    const layer = await waitFor(() => api.getByTestId("theme-wave-background"));
    const flat = (node: { props: { style?: unknown } }) =>
      Object.assign({}, ...[node.props.style].flat(Infinity)) as Record<string, unknown>;
    // The base is the look being left...
    expect(flat(layer).backgroundColor).toBe(lightTheme.colors.background);
    // ...and the growing circle is the look being switched to.
    const circle = await waitFor(
      () => api.getByTestId("theme-wave-background-circle"),
      { timeout: WAVE_TIMEOUT },
    );
    expect(flat(circle).backgroundColor).toBe(darkTheme.colors.background);

    await act(async () => {
      await played;
    });
  });

  it("also plays when going back to the other look (for example from Dark back to Auto)", async () => {
    scheme.mockReturnValue("dark");
    const api = render(<App />);
    const played = changeThemeWithWave(ORIGIN, makeApply(api, "light"));

    const circle = await waitFor(
      () => api.getByTestId("theme-wave-background-circle"),
      { timeout: WAVE_TIMEOUT },
    );
    const style = Object.assign({}, ...[circle.props.style].flat(Infinity));
    expect(style.backgroundColor).toBe(lightTheme.colors.background);
    await act(async () => {
      await played;
    });
  });


  it("starts spreading straight away when the look is known, and switches the theme while it is moving", async () => {
    const api = render(<App />);
    let circleUpWhenApplied: boolean | null = null;
    const apply = jest.fn(() => {
      circleUpWhenApplied =
        api.queryByTestId("theme-wave-background-circle") !== null;
      act(() => {
        scheme.mockReturnValue("dark");
        api.rerender(<App />);
      });
    });

    const played = changeThemeWithWave(ORIGIN, apply, true);
    await waitFor(
      () => expect(api.getByTestId("theme-wave-background-circle")).toBeTruthy(),
      { timeout: WAVE_TIMEOUT },
    );
    await act(async () => {
      await played;
    });
    // The circle was already out when the theme changed: no dead time with the wrong colours.
    expect(circleUpWhenApplied).toBe(true);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(isWaveActive()).toBe(false);
  });

  it("waits for the phone to report the new look before taking the wave down", async () => {
    const api = render(<App />);
    let reportLook: () => void = () => {};
    // The phone is slow to report: the look changes well after the wave has finished growing.
    const apply = jest.fn(() => {
      reportLook = () =>
        act(() => {
          scheme.mockReturnValue("dark");
          api.rerender(<App />);
        });
    });
    let finished = false;
    const played = changeThemeWithWave(ORIGIN, apply, true).then(() => {
      finished = true;
    });
    await waitFor(() => expect(apply).toHaveBeenCalled(), {
      timeout: WAVE_TIMEOUT,
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 900));
    });
    // The circle has finished growing but the look hasn't been reported: still up.
    expect(finished).toBe(false);
    expect(api.queryByTestId("theme-wave-background")).not.toBeNull();

    reportLook();
    await act(async () => {
      await played;
    });
    expect(finished).toBe(true);
    expect(api.queryByTestId("theme-wave-background")).toBeNull();
  }, WAVE_TIMEOUT * 2);

  it("corrects the colour, and shows the correction, if the look turns out not to be the expected one", async () => {
    const api = render(<App />);
    // What the circle showed, each time the wave changed: true = dark, false = light.
    const seen: (boolean | null | "over")[] = [];
    const unsubscribe = subscribeWave(() => {
      const wave = getActiveWave();
      seen.push(wave ? (wave.to ? wave.to.isDark : null) : "over");
    });
    // The wave is told the look is going dark, but the phone stays light.
    const apply = jest.fn();
    await act(async () => {
      await changeThemeWithWave(ORIGIN, apply, true);
    });
    unsubscribe();

    // Dark was drawn first, then the circle was corrected to light, and only then taken down.
    const dark = seen.indexOf(true);
    const light = seen.indexOf(false);
    expect(dark).toBeGreaterThanOrEqual(0);
    expect(light).toBeGreaterThan(dark);
    expect(seen[seen.length - 1]).toBe("over");
    expect(seen.lastIndexOf("over")).toBeGreaterThan(light);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(isWaveActive()).toBe(false);
    expect(api.queryByTestId("theme-wave-background")).toBeNull();
  }, THEME_WAVE_CHANGE_TIMEOUT_MS + WAVE_TIMEOUT);

  it("ends quietly, without drawing a circle, when the look turns out not to change", async () => {
    const api = render(<App />);
    const apply = jest.fn();
    const played = changeThemeWithWave(ORIGIN, apply);

    await waitFor(() =>
      expect(api.getByTestId("theme-wave-background")).toBeTruthy(),
    );
    await act(async () => {
      await played;
    });
    expect(apply).toHaveBeenCalledTimes(1);
    expect(api.queryByTestId("theme-wave-background-circle")).toBeNull();
    expect(api.queryByTestId("theme-wave-background")).toBeNull();
    expect(isWaveActive()).toBe(false);
  }, THEME_WAVE_CHANGE_TIMEOUT_MS + WAVE_TIMEOUT);

  it("draws a surface layer too, for panels that have a colour of their own", async () => {
    const api = render(
      <View>
        <ThemeWaveLayer token="surface" />
        <ThemeWaveHost />
      </View>,
    );
    const played = changeThemeWithWave(ORIGIN, jest.fn());
    const layer = await waitFor(() => api.getByTestId("theme-wave-surface"));
    const style = Object.assign({}, ...[layer.props.style].flat(Infinity));
    expect(style.backgroundColor).toBe(lightTheme.colors.surface);
    await act(async () => {
      await played;
    });
  });

  it("switches instantly, with no wave, when the phone's reduce-motion setting is on", async () => {
    mockReduceMotion = true;
    const api = render(<App />);
    const apply = jest.fn();
    await changeThemeWithWave(ORIGIN, apply);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(api.queryByTestId("theme-wave-background")).toBeNull();
  });

  it("never loses the theme change if the screen goes away mid-wave", async () => {
    const api = render(<App />);
    const apply = jest.fn();
    void changeThemeWithWave(ORIGIN, apply);
    await waitFor(() =>
      expect(api.getByTestId("theme-wave-background")).toBeTruthy(),
    );
    api.unmount();
    expect(apply).toHaveBeenCalledTimes(1);
    expect(isWaveActive()).toBe(false);
  });

  it("lets a new choice replace a wave that is still playing, losing neither change", async () => {
    const api = render(<App />);
    const first = jest.fn();
    const second = jest.fn();
    const playedFirst = changeThemeWithWave(ORIGIN, first);
    await waitFor(() =>
      expect(api.getByTestId("theme-wave-background")).toBeTruthy(),
    );
    const playedSecond = changeThemeWithWave(ORIGIN, second);
    await act(async () => {
      await Promise.all([playedFirst, playedSecond]);
    });
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(isWaveActive()).toBe(false);
  }, THEME_WAVE_CHANGE_TIMEOUT_MS + WAVE_TIMEOUT);
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
