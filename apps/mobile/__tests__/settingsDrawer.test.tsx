import { SettingsHeaderButton } from "@/components/settings/HeaderButtons";
import { DialogProvider } from "@/components/ui";
import { SEARCH_RADIUS_KEY } from "@/constants";
import { setSearchRadiusKm } from "@/helpers/searchRadius";
import { SettingsProvider, useSettings } from "@/src/context/SettingsContext";
import { getSupportChannels } from "@nearcommerce/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Linking, Pressable, Text } from "react-native";

jest.mock("@/src/context/AuthContext", () => ({
  useAuth: () => ({ logout: jest.fn(), token: "t" }),
}));
jest.mock("@/components/VerifyEmailPrompt", () => () => null);
jest.mock("@nearcommerce/api", () => ({
  ...jest.requireActual("@nearcommerce/api"),
  getSupportChannels: jest.fn(),
  apiClient: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));
jest.mock("expo-location", () => ({
  geocodeAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  PermissionStatus: { GRANTED: "granted", DENIED: "denied" },
  Accuracy: { Balanced: 3 },
}));
const channels = getSupportChannels as jest.Mock;

function OpenSupport() {
  const { openSupport } = useSettings();
  return (
    <Pressable onPress={openSupport}>
      <Text>open-support</Text>
    </Pressable>
  );
}

function renderApp() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <DialogProvider>
        <SettingsProvider>
          <SettingsHeaderButton />
          <OpenSupport />
        </SettingsProvider>
      </DialogProvider>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  await setSearchRadiusKm(5);
  channels.mockResolvedValue({
    channels: { email: "help@near.test", phone: "+905551112233" },
  });
});

describe("settings drawer", () => {
  it("is closed until the app-bar settings button is pressed", () => {
    const { queryByText, getByLabelText } = renderApp();
    expect(queryByText("Search distance")).toBeNull();
    fireEvent.press(getByLabelText("Open settings"));
    expect(queryByText("Search distance")).toBeTruthy();
  });

  it("holds every setting a shopper needs", () => {
    const { getByLabelText, getByText } = renderApp();
    fireEvent.press(getByLabelText("Open settings"));
    for (const text of [
      "Settings",
      "Search distance",
      "Routing preferences",
      "Avoid Tolls on Route",
      "Location",
      "Set location by ZIP code",
      "Contact support",
      "Appearance",
      "Sign out",
      "Delete account",
    ])
      expect(getByText(text)).toBeTruthy();
  });

  it("closes from the close button", async () => {
    const { getByLabelText, queryByText } = renderApp();
    fireEvent.press(getByLabelText("Open settings"));
    fireEvent.press(getByLabelText("Close settings"));
    await waitFor(() => expect(queryByText("Search distance")).toBeNull());
  });
});

describe("search distance setting", () => {
  it("starts at 5 km and saves a new distance for every search to use", async () => {
    const { getByLabelText, getByTestId, getByRole } = renderApp();
    fireEvent.press(getByLabelText("Open settings"));
    expect(getByTestId("radius-value").props.children).toBe("5 km");

    const slider = getByRole("adjustable");
    fireEvent(slider, "accessibilityAction", {
      nativeEvent: { actionName: "increment" },
    });

    await waitFor(() =>
      expect(getByTestId("radius-value").props.children).toBe("6 km"),
    );
    expect(await AsyncStorage.getItem(SEARCH_RADIUS_KEY)).toBe("6");
  });

  it("says 1 km at the minimum and cannot go lower", async () => {
    await setSearchRadiusKm(1);
    const { getByLabelText, getByTestId, getByRole } = renderApp();
    fireEvent.press(getByLabelText("Open settings"));
    expect(getByTestId("radius-value").props.children).toBe("1 km");
    fireEvent(getByRole("adjustable"), "accessibilityAction", {
      nativeEvent: { actionName: "decrement" },
    });
    expect(await AsyncStorage.getItem(SEARCH_RADIUS_KEY)).toBe("1");
  });
});

describe("sheets opened from settings", () => {
  it("opens the ZIP sheet and closes the drawer (no nested pop-ups)", async () => {
    const { getByLabelText, getByText, queryByText, findByText } = renderApp();
    fireEvent.press(getByLabelText("Open settings"));
    fireEvent.press(getByText("Set location by ZIP code"));
    expect(await findByText("Set your location")).toBeTruthy();
    await waitFor(() => expect(queryByText("Search distance")).toBeNull());
  });

  it("opens support with the email and phone, and no opening hours", async () => {
    const { getByLabelText, getByText, findByText, queryByText } = renderApp();
    fireEvent.press(getByLabelText("Open settings"));
    fireEvent.press(getByText("Contact support"));
    expect(await findByText(/help with your account/)).toBeTruthy();
    expect(await findByText("help@near.test")).toBeTruthy();
    expect(getByText("+905551112233")).toBeTruthy();
    expect(queryByText(/24\/7|hours/i)).toBeNull();
  });

  it("support rows open the mail and phone apps", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    const { getByText, findByLabelText } = renderApp();
    fireEvent.press(getByText("open-support"));
    fireEvent.press(await findByLabelText("Email: help@near.test"));
    fireEvent.press(await findByLabelText("Phone: +905551112233"));
    expect(open).toHaveBeenCalledWith("mailto:help@near.test");
    expect(open).toHaveBeenCalledWith("tel:+905551112233");
  });

  it("shows a skeleton (no loading text) while support loads, and a retry on failure", async () => {
    channels.mockReturnValueOnce(new Promise(() => {}));
    const first = renderApp();
    fireEvent.press(first.getByText("open-support"));
    expect(await first.findByTestId("skeleton")).toBeTruthy();
    expect(first.queryByText(/loading/i)).toBeNull();
    first.unmount();

    channels.mockRejectedValueOnce(new Error("down"));
    const second = renderApp();
    fireEvent.press(second.getByText("open-support"));
    expect(
      await second.findByText("We couldn't load the support details."),
    ).toBeTruthy();
    channels.mockResolvedValue({
      channels: { email: "again@near.test", phone: "1" },
    });
    await act(async () => {
      fireEvent.press(second.getByText("Try again"));
    });
    expect(await second.findByText("again@near.test")).toBeTruthy();
  });
});
