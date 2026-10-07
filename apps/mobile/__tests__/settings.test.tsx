import SettingsScreen from "@/app/(tabs)/settings";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "@nearcommerce/api";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

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

  describe("delete account", () => {
    const pressConfirm = () => {
      const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as {
        text: string;
        onPress?: () => void;
      }[];
      buttons.find((b) => b.text === "Delete account")!.onPress!();
    };

    beforeEach(() => {
      jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    });

    it("asks for confirmation before calling the API", () => {
      const del = jest.spyOn(apiClient, "delete");
      const { getByText } = render(<SettingsScreen />);
      fireEvent.press(getByText("Delete account"));

      expect(Alert.alert).toHaveBeenCalledWith(
        "Delete your account?",
        expect.any(String),
        expect.any(Array),
      );
      expect(del).not.toHaveBeenCalled();
    });

    it("deletes via /users/me and then signs out", async () => {
      const del = jest.spyOn(apiClient, "delete").mockResolvedValue({});
      const { getByText } = render(<SettingsScreen />);
      fireEvent.press(getByText("Delete account"));
      pressConfirm();

      await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
      expect(del).toHaveBeenCalledWith("/users/me");
    });

    it("stays signed in and explains when deletion fails", async () => {
      jest.spyOn(apiClient, "delete").mockRejectedValue({
        response: { data: { error: "Server said no" } },
      });
      const { getByText } = render(<SettingsScreen />);
      fireEvent.press(getByText("Delete account"));
      pressConfirm();

      await waitFor(() =>
        expect(Alert.alert).toHaveBeenLastCalledWith(
          "Couldn't delete account",
          "Server said no",
        ),
      );
      expect(mockLogout).not.toHaveBeenCalled();
    });
  });
});
