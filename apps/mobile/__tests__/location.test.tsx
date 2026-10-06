import SettingsScreen from "@/app/(tabs)/settings";
import LocationFallbackModal from "@/components/LocationFallbackModal";
import { useLocationFetcher } from "@/src/hooks/useLocationFetcher";
import {
  PostalCodeError,
  clearManualLocation,
  getManualLocation,
  getSessionLocation,
  loadManualLocation,
  resolvePostalCode,
  setManualLocation,
} from "@/utils/location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  fireEvent,
  render,
  renderHook,
  waitFor,
} from "@testing-library/react-native";
import * as Location from "expo-location";

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  geocodeAsync: jest.fn(),
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
    const { getByText, findByText } = render(<SettingsScreen />);
    expect(getByText("Using your device location")).toBeTruthy();
    fireEvent.press(getByText("Set location by ZIP code"));
    expect(await findByText("Set your location")).toBeTruthy();
  });

  it("shows the saved ZIP code and can switch back to the device", async () => {
    await setManualLocation(SF);
    const { findByText, getByText } = render(<SettingsScreen />);
    expect(await findByText("Using ZIP code 94103")).toBeTruthy();
    fireEvent.press(getByText("Use my device location"));
    expect(await findByText("Using your device location")).toBeTruthy();
    expect(getManualLocation()).toBeNull();
  });
});
