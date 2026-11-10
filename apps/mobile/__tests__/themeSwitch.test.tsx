import SettingsContent from "@/components/settings/SettingsContent";
import { DialogProvider } from "@/components/ui";
import { registerThemeWave } from "@/helpers/themeWave";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useColorScheme } from "react-native";

jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: jest.fn(() => "light"),
}));
const scheme = useColorScheme as unknown as jest.Mock;

let mockDeviceIsDark: boolean | undefined = true;
jest.mock("@/helpers/themePreference", () => ({
  getDeviceIsDark: () => mockDeviceIsDark,
}));

const mockSetPreference = jest.fn();
jest.mock("@/src/hooks/useThemePreference", () => ({
  useThemePreference: () => ({ preference: "system", setPreference: mockSetPreference }),
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@/src/context/AuthContext", () => ({
  useAuth: () => ({ logout: jest.fn() }),
}));
jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

const press = { nativeEvent: { pageX: 200, pageY: 500 } };

function renderSettings() {
  return render(
    <DialogProvider>
      <SettingsContent onOpenZip={() => {}} onOpenSupport={() => {}} onClose={() => {}} />
    </DialogProvider>,
  );
}

// Stands in for the wave: records the request and plays it instantly.
function recordWaves() {
  const waves: { origin: unknown; targetDark?: boolean }[] = [];
  const unregister = registerThemeWave(async (origin, apply, targetDark) => {
    waves.push({ origin, targetDark });
    apply();
  });
  return { waves, unregister };
}

describe("Settings: choosing a theme", () => {
  beforeEach(() => {
    mockSetPreference.mockClear();
    scheme.mockReturnValue("light");
  });

  it("spreads the wave from the tapped choice, then switches to dark", async () => {
    const { waves, unregister } = recordWaves();
    const { getByTestId } = renderSettings();

    fireEvent.press(getByTestId("theme-control-dark"), press);

    await waitFor(() => expect(mockSetPreference).toHaveBeenCalledWith("dark"));
    expect(waves).toEqual([{ origin: { x: 200, y: 500 }, targetDark: true }]);
    unregister();
  });

  it("plays the wave when going from dark to light", async () => {
    scheme.mockReturnValue("dark");
    const { waves, unregister } = recordWaves();
    const { getByTestId } = renderSettings();

    fireEvent.press(getByTestId("theme-control-light"), press);

    await waitFor(() => expect(mockSetPreference).toHaveBeenCalledWith("light"));
    expect(waves).toEqual([{ origin: { x: 200, y: 500 }, targetDark: false }]);
    unregister();
  });

  it("plays the wave for Auto too, from the tapped choice, towards the phone's own look", async () => {
    scheme.mockReturnValue("light");
    mockDeviceIsDark = true;
    const { waves, unregister } = recordWaves();
    const { getByTestId } = renderSettings();

    fireEvent.press(getByTestId("theme-control-system"), press);

    await waitFor(() => expect(mockSetPreference).toHaveBeenCalledWith("system"));
    expect(waves).toEqual([{ origin: { x: 200, y: 500 }, targetDark: true }]);
    unregister();
  });

  it("still plays the wave for Auto when the phone's own look isn't known yet", async () => {
    mockDeviceIsDark = undefined;
    const { waves, unregister } = recordWaves();
    const { getByTestId } = renderSettings();

    fireEvent.press(getByTestId("theme-control-system"), press);

    await waitFor(() => expect(mockSetPreference).toHaveBeenCalledWith("system"));
    expect(waves).toEqual([{ origin: { x: 200, y: 500 }, targetDark: undefined }]);
    mockDeviceIsDark = true;
    unregister();
  });

  it("switches without a wave when the chosen look is the one already showing", () => {
    scheme.mockReturnValue("light");
    const { waves, unregister } = recordWaves();
    const { getByTestId } = renderSettings();

    fireEvent.press(getByTestId("theme-control-light"), press);

    expect(mockSetPreference).toHaveBeenCalledWith("light");
    expect(waves).toEqual([]);
    unregister();
  });

  it("still switches when nothing is there to draw the wave", () => {
    const { getByTestId } = renderSettings();
    fireEvent.press(getByTestId("theme-control-dark"), press);
    expect(mockSetPreference).toHaveBeenCalledWith("dark");
  });
});
