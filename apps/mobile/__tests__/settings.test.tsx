import SettingsScreen from "@/app/(tabs)/settings";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(() => Promise.resolve("false")),
}));

const mockLogout = jest.fn();
jest.mock("@/src/context/AuthContext", () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

describe("SettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads and displays initial routing preferences from AsyncStorage", async () => {
    const { getByText } = render(<SettingsScreen />);

    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalledWith("@routing_avoid_tolls");
      expect(getByText("Avoid Tolls on Route")).toBeTruthy();
    });
  });

  it("saves routing preferences to AsyncStorage when toggled", async () => {
    const { getByTestId } = render(<SettingsScreen />);

    const switchElement = getByTestId("tolls-switch");
    fireEvent(switchElement, "valueChange", true);

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@routing_avoid_tolls",
        "true",
      );
    });
  });

  it("signs out from the settings screen", () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText("Sign out"));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
