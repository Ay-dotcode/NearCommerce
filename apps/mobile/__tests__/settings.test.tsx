import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import SettingsScreen from "../app/(tabs)/settings";

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(() => Promise.resolve("false")),
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
});
