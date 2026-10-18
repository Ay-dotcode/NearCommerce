import SettingsContent from "@/components/settings/SettingsContent";
import { DialogProvider } from "@/components/ui";
import { apiClient } from "@nearcommerce/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import Toast from "react-native-toast-message";
const SettingsScreen = ({
  onOpenZip = () => {},
}: {
  onOpenZip?: () => void;
}) => (
  <DialogProvider>
    <SettingsContent
      onOpenZip={onOpenZip}
      onOpenSupport={() => {}}
      onClose={() => {}}
    />
  </DialogProvider>
);

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(() => Promise.resolve("false")),
}));

jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn() },
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

  it("closes the drawer first, then signs out", async () => {
    const order: string[] = [];
    mockLogout.mockImplementationOnce(() => order.push("logout"));
    const { getByText } = render(
      <DialogProvider>
        <SettingsContent
          onOpenZip={() => {}}
          onOpenSupport={() => {}}
          onClose={() => order.push("close")}
        />
      </DialogProvider>,
    );
    fireEvent.press(getByText("Sign out"));
    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
    expect(order).toEqual(["close", "logout"]);
  });

  describe("delete account", () => {
    const pressConfirm = async (utils: ReturnType<typeof render>) =>
      fireEvent.press(await utils.findByTestId("dialog-confirm"));

    beforeEach(() => {
      jest.spyOn(Alert, "alert");
    });

    it("asks for confirmation on a blurred sheet before calling the API", async () => {
      const del = jest.spyOn(apiClient, "delete");
      const utils = render(<SettingsScreen />);
      fireEvent.press(utils.getByText("Delete account"));

      expect(await utils.findByText("Delete your account?")).toBeTruthy();
      expect(Alert.alert).not.toHaveBeenCalled();
      expect(del).not.toHaveBeenCalled();
    });

    it("does nothing when the shopper cancels", async () => {
      const del = jest.spyOn(apiClient, "delete");
      const utils = render(<SettingsScreen />);
      fireEvent.press(utils.getByText("Delete account"));
      fireEvent.press(await utils.findByTestId("dialog-cancel"));
      expect(del).not.toHaveBeenCalled();
      expect(mockLogout).not.toHaveBeenCalled();
    });

    it("deletes via /users/me and then signs out", async () => {
      const del = jest.spyOn(apiClient, "delete").mockResolvedValue({});
      const utils = render(<SettingsScreen />);
      fireEvent.press(utils.getByText("Delete account"));
      await pressConfirm(utils);

      await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
      expect(del).toHaveBeenCalledWith("/users/me");
    });

    it("stays signed in and explains when deletion fails", async () => {
      jest.spyOn(apiClient, "delete").mockRejectedValue({
        response: { data: { error: "Server said no" } },
      });
      const utils = render(<SettingsScreen />);
      fireEvent.press(utils.getByText("Delete account"));
      await pressConfirm(utils);

      await waitFor(() =>
        expect(Toast.show).toHaveBeenCalledWith(
          expect.objectContaining({
            text1: "Couldn't delete account",
            text2: "Server said no",
          }),
        ),
      );
      expect(mockLogout).not.toHaveBeenCalled();
    });
  });
});
