import SettingsContent from "@/components/settings/SettingsContent";
import { DialogProvider } from "@/components/ui";
import { fireEvent, render } from "@testing-library/react-native";

const mockSetPreference = jest.fn();
jest.mock("@/src/hooks/useThemePreference", () => ({
  useThemePreference: () => ({
    preference: "system",
    setPreference: mockSetPreference,
  }),
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

function renderSettings() {
  return render(
    <DialogProvider>
      <SettingsContent
        onOpenZip={() => {}}
        onOpenSupport={() => {}}
        onClose={() => {}}
      />
    </DialogProvider>,
  );
}

describe("Settings: choosing a theme", () => {
  beforeEach(() => mockSetPreference.mockClear());

  it.each(["light", "dark", "system"] as const)(
    "switches to %s straight away",
    (value) => {
      const { getByTestId } = renderSettings();
      fireEvent.press(getByTestId(`theme-control-${value}`));
      expect(mockSetPreference).toHaveBeenCalledTimes(1);
      expect(mockSetPreference).toHaveBeenCalledWith(value);
    },
  );
});
