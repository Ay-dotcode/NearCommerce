import LocationFallbackModal from "@/components/LocationFallbackModal";
import SettingsContent from "@/components/settings/SettingsContent";
import { DialogProvider } from "@/components/ui";
import {
  PostalCodeError,
  clearManualLocation,
  getManualLocation,
  getSessionLocation,
  loadManualLocation,
  resolvePostalCode,
  setManualLocation,
  switchToDeviceLocation,
} from "@/helpers/location";
import { withLocationIndicator } from "@/helpers/locationIndicator";
import { useLocationFetcher } from "@/src/hooks/useLocationFetcher";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  fireEvent,
  render,
  renderHook,
  waitFor,
} from "@testing-library/react-native";
import * as Location from "expo-location";
import { Linking } from "react-native";
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

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  geocodeAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  PermissionStatus: { GRANTED: "granted", DENIED: "denied" },
  Accuracy: { Balanced: 3 },
}));
jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn(), hide: jest.fn() },
}));
jest.mock("@/src/context/AuthContext", () => ({
  useAuth: () => ({ logout: jest.fn() }),
}));
jest.mock("@react-native-async-storage/async-storage", () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItem: jest.fn(async (k: string) => store.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => void store.set(k, v)),
    removeItem: jest.fn(async (k: string) => void store.delete(k)),
  };
});

const loc = Location as unknown as Record<string, jest.Mock>;
const store = (AsyncStorage as unknown as { __store: Map<string, string> })
  .__store;
const SF = { postalCode: "94103", latitude: 37.77, longitude: -122.41 };

beforeEach(async () => {
  jest.clearAllMocks();
  store.clear();
  await clearManualLocation();
  loc.geocodeAsync.mockResolvedValue([{ latitude: 37.77, longitude: -122.41 }]);
  loc.reverseGeocodeAsync.mockResolvedValue([
    { city: "Nicosia", country: "Cyprus" },
  ]);
  loc.getLastKnownPositionAsync.mockResolvedValue(null);
});

describe("resolvePostalCode", () => {
  it("geocodes a normalised code", async () => {
    await expect(resolvePostalCode(" 94103 ")).resolves.toEqual(SF);
    expect(loc.geocodeAsync).toHaveBeenCalledWith("94103");
  });

  it("uppercases international codes", async () => {
    await resolvePostalCode("sw1a 1aa");
    expect(loc.geocodeAsync).toHaveBeenCalledWith("SW1A 1AA");
  });

  it.each(["", "12", "!!!!!", "x".repeat(20)])(
    "rejects %p without calling the geocoder",
    async (value) => {
      await expect(resolvePostalCode(value)).rejects.toMatchObject({
        reason: "invalid",
      });
      expect(loc.geocodeAsync).not.toHaveBeenCalled();
    },
  );

  it("reports a code the geocoder doesn't know", async () => {
    loc.geocodeAsync.mockResolvedValue([]);
    await expect(resolvePostalCode("00000")).rejects.toMatchObject({
      reason: "not_found",
    });
  });

  it("reports a geocoder failure separately", async () => {
    loc.geocodeAsync.mockRejectedValue(new Error("offline"));
    const error = await resolvePostalCode("94103").catch((e) => e);
    expect(error).toBeInstanceOf(PostalCodeError);
    expect(error.reason).toBe("unavailable");
  });
});

describe("manual location store", () => {
  it("persists, reloads and clears", async () => {
    await setManualLocation(SF);
    expect(JSON.parse(store.get("@nearcommerce_manual_location")!)).toEqual(SF);
    await loadManualLocation();
    expect(getManualLocation()).toEqual(SF);
    await clearManualLocation();
    expect(getManualLocation()).toBeNull();
    expect(store.size).toBe(0);
  });

  it("doesn't let a slow load undo a newer clear", async () => {
    await setManualLocation(SF);
    const loading = loadManualLocation();
    await clearManualLocation();
    await loading;
    expect(getManualLocation()).toBeNull();
  });

  it("ignores corrupt saved data", async () => {
    store.set("@nearcommerce_manual_location", "{not json");
    await loadManualLocation();
    expect(getManualLocation()).toBeNull();
  });

  it("makes getSessionLocation return the ZIP location without asking for GPS", async () => {
    await setManualLocation(SF);
    await expect(getSessionLocation()).resolves.toEqual(SF);
    expect(loc.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe("useLocationFetcher", () => {
  it("uses GPS when permission is granted", async () => {
    loc.requestForegroundPermissionsAsync.mockResolvedValue({
      status: "granted",
    });
    loc.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 1, longitude: 2 },
    });
    const { result } = renderHook(() => useLocationFetcher());
    await waitFor(() =>
      expect(result.current.location?.coords.latitude).toBe(1),
    );
    expect(result.current.permissionDenied).toBe(false);
    expect(result.current.source).toBe("gps");
  });

  it("flags a denied permission so the app can ask for a ZIP code", async () => {
    loc.requestForegroundPermissionsAsync.mockResolvedValue({
      status: "denied",
    });
    const { result } = renderHook(() => useLocationFetcher());
    await waitFor(() => expect(result.current.permissionDenied).toBe(true));
    expect(result.current.location).toBeNull();
    expect(result.current.isFetching).toBe(false);
  });

  it("switches to the ZIP code as soon as it is saved", async () => {
    loc.requestForegroundPermissionsAsync.mockResolvedValue({
      status: "denied",
    });
    const { result } = renderHook(() => useLocationFetcher());
    await waitFor(() => expect(result.current.permissionDenied).toBe(true));

    await act(async () => setManualLocation(SF));
    expect(result.current.location?.coords).toMatchObject({
      latitude: 37.77,
      longitude: -122.41,
    });
    expect(result.current.source).toBe("manual");
  });

  it("prefers a saved ZIP code over GPS", async () => {
    await setManualLocation(SF);
    loc.requestForegroundPermissionsAsync.mockResolvedValue({
      status: "granted",
    });
    loc.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 1, longitude: 2 },
    });
    const { result } = renderHook(() => useLocationFetcher());
    await waitFor(() => expect(result.current.source).toBe("manual"));
    expect(result.current.location?.coords.latitude).toBe(37.77);
  });
});

describe("LocationFallbackModal", () => {
  it("saves the location and closes", async () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <LocationFallbackModal visible onClose={onClose} />,
    );
    fireEvent.changeText(getByTestId("zip-input"), "94103");
    fireEvent.press(getByTestId("zip-submit"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(getManualLocation()).toEqual(SF);
  });

  it("explains an invalid code and stays open", async () => {
    const onClose = jest.fn();
    const { getByTestId, findByText } = render(
      <LocationFallbackModal visible onClose={onClose} />,
    );
    fireEvent.changeText(getByTestId("zip-input"), "9");
    fireEvent.press(getByTestId("zip-submit"));
    expect(await findByText("Enter a valid ZIP or postal code.")).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    expect(getManualLocation()).toBeNull();
  });

  it("explains an unknown code", async () => {
    loc.geocodeAsync.mockResolvedValue([]);
    const { getByTestId, findByText } = render(
      <LocationFallbackModal visible onClose={jest.fn()} />,
    );
    fireEvent.changeText(getByTestId("zip-input"), "00000");
    fireEvent.press(getByTestId("zip-submit"));
    expect(await findByText(/couldn't find that ZIP/i)).toBeTruthy();
  });

  it("lets the shopper dismiss without choosing", () => {
    const onClose = jest.fn();
    const { getByTestId, getByText } = render(
      <LocationFallbackModal visible onClose={onClose} />,
    );
    expect(getByText("Location is turned off")).toBeTruthy();
    fireEvent.press(getByTestId("zip-dismiss"));
    expect(onClose).toHaveBeenCalled();
    expect(getManualLocation()).toBeNull();
  });
});

describe("Settings location", () => {
  it("shows the device location by default and opens the ZIP dialog", async () => {
    const onOpenZip = jest.fn();
    const { getByText } = render(<SettingsScreen onOpenZip={onOpenZip} />);
    expect(getByText("Using your device location")).toBeTruthy();
    fireEvent.press(getByText("Set location by ZIP code"));
    expect(onOpenZip).toHaveBeenCalled();
  });

  it("shows the saved ZIP code and can switch back to the device", async () => {
    loc.requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    loc.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 35.17, longitude: 33.36 },
    });
    await setManualLocation(SF);
    const { findByText, getByText } = render(<SettingsScreen />);
    expect(await findByText("Using ZIP code 94103")).toBeTruthy();
    fireEvent.press(getByText("Use my device location"));
    expect(await findByText(/^Using your device location/)).toBeTruthy();
    expect(getManualLocation()).toBeNull();
  });
});

describe("ZIP sheet", () => {
  it("keeps 'Use this location' disabled until a ZIP code is typed", () => {
    const { getByTestId } = render(
      <LocationFallbackModal visible reason="manual" onClose={jest.fn()} />,
    );
    const button = () => getByTestId("zip-submit");
    expect(button().props.accessibilityState?.disabled).toBe(true);
    fireEvent.changeText(getByTestId("zip-input"), "94103");
    expect(button().props.accessibilityState?.disabled).toBeFalsy();
    fireEvent.changeText(getByTestId("zip-input"), "   ");
    expect(button().props.accessibilityState?.disabled).toBe(true);
  });

  it("confirms with a pop-up once the location is set", async () => {
    const { getByTestId } = render(
      <LocationFallbackModal visible reason="manual" onClose={jest.fn()} />,
    );
    fireEvent.changeText(getByTestId("zip-input"), "94103");
    fireEvent.press(getByTestId("zip-submit"));
    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "success",
          text1: "Location updated",
          text2: expect.stringContaining("94103"),
        }),
      ),
    );
  });
});

describe("Using the device location from settings", () => {
  const granted = () => {
    loc.requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    loc.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 35.17, longitude: 33.36 },
    });
  };

  it("switches back, closes the drawer and says which place it is using", async () => {
    granted();
    await setManualLocation(SF);
    const onClose = jest.fn();
    const { findByText, getByText } = render(
      <DialogProvider>
        <SettingsContent onOpenZip={() => {}} onOpenSupport={() => {}} onClose={onClose} />
      </DialogProvider>,
    );
    await findByText("Using ZIP code 94103");
    fireEvent.press(getByText("Use my device location"));
    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "success",
          text1: "Now using your device location",
          text2: "Showing shops near Nicosia, Cyprus.",
        }),
      ),
    );
    expect(onClose).toHaveBeenCalled();
    expect(getManualLocation()).toBeNull();
  });

  it("says so, and keeps the ZIP code, when location access is off", async () => {
    loc.requestForegroundPermissionsAsync.mockResolvedValue({ status: "denied" });
    await setManualLocation(SF);
    const { findByText, getByText } = render(
      <DialogProvider>
        <SettingsContent onOpenZip={() => {}} onOpenSupport={() => {}} onClose={() => {}} />
      </DialogProvider>,
    );
    await findByText("Using ZIP code 94103");
    fireEvent.press(getByText("Use my device location"));
    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error", text1: "Location access is off" }),
      ),
    );
    expect(getManualLocation()).toEqual(SF);
  });

  it("shows the name of the place under the device location", async () => {
    loc.getLastKnownPositionAsync.mockResolvedValue({
      coords: { latitude: 35.17, longitude: 33.36 },
    });
    const { findByText } = render(
      <DialogProvider>
        <SettingsContent onOpenZip={() => {}} onOpenSupport={() => {}} onClose={() => {}} />
      </DialogProvider>,
    );
    expect(
      await findByText("Using your device location · Nicosia, Cyprus"),
    ).toBeTruthy();
  });
});

describe("Telling the shopper the location is being read", () => {
  const granted = () => {
    loc.requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    loc.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 35.17, longitude: 33.36 },
    });
  };
  const noLocatingPopup = () =>
    expect(Toast.show).not.toHaveBeenCalledWith(
      expect.objectContaining({ text1: "Locating Stores" }),
    );

  it("uses the system indicator, not a pop-up, when the session location is read", async () => {
    granted();
    // Fresh module: the session location is cached after the first read.
    await jest.isolateModulesAsync(async () => {
      const fresh = require("@/helpers/location");
      const freshIndicator = require("@/helpers/locationIndicator");
      const freshToast = require("react-native-toast-message").default;
      const freshLoc = require("expo-location");
      freshLoc.requestForegroundPermissionsAsync.mockResolvedValue({
        status: "granted",
      });
      freshLoc.getCurrentPositionAsync.mockResolvedValue({
        coords: { latitude: 35.17, longitude: 33.36 },
      });

      await expect(fresh.pollSessionLocation()).resolves.toMatchObject({
        latitude: 35.17,
      });
      expect(freshIndicator.withLocationIndicator).toHaveBeenCalledTimes(1);
      expect(freshToast.show).not.toHaveBeenCalled();
    });
  });

  it("does not show the indicator when permission is denied (nothing is read)", async () => {
    await jest.isolateModulesAsync(async () => {
      const fresh = require("@/helpers/location");
      const freshIndicator = require("@/helpers/locationIndicator");
      const freshToast = require("react-native-toast-message").default;
      const freshLoc = require("expo-location");
      freshLoc.requestForegroundPermissionsAsync.mockResolvedValue({
        status: "denied",
      });

      await expect(fresh.pollSessionLocation()).resolves.toBeNull();
      expect(freshIndicator.withLocationIndicator).not.toHaveBeenCalled();
      expect(freshToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: "error", text1: "Permission Denied" }),
      );
    });
  });

  it("uses the indicator when the hook reads the GPS position", async () => {
    granted();
    const { result } = renderHook(() => useLocationFetcher());
    await waitFor(() => expect(result.current.location).not.toBeNull());
    expect(withLocationIndicator).toHaveBeenCalled();
    noLocatingPopup();
  });

  it("uses the indicator when switching back to the device location", async () => {
    granted();
    await expect(switchToDeviceLocation()).resolves.toMatchObject({ ok: true });
    expect(withLocationIndicator).toHaveBeenCalledTimes(1);
    noLocatingPopup();
  });
});

describe("Getting back to the phone's settings after refusing location", () => {
  it("offers to open the settings when location was refused, and the ZIP form still works", () => {
    const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue();
    const { getByTestId } = render(
      <LocationFallbackModal visible reason="denied" onClose={jest.fn()} />,
    );
    fireEvent.press(getByTestId("open-app-settings"));
    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(getByTestId("zip-input")).toBeTruthy();
  });

  it("does not show it when the shopper just chose to set a ZIP code", () => {
    const { queryByTestId } = render(
      <LocationFallbackModal visible reason="manual" onClose={jest.fn()} />,
    );
    expect(queryByTestId("open-app-settings")).toBeNull();
  });
});
