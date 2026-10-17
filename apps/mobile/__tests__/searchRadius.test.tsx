import {
  NEARBY_ONLY_KEY,
  SEARCH_RADIUS_DEFAULT_KM,
  SEARCH_RADIUS_KEY,
  SEARCH_RADIUS_MAX_KM,
  SEARCH_RADIUS_MIN_KM,
} from "@/constants";
import {
  clampRadiusKm,
  getNearbyOnly,
  getSearchRadiusKm,
  kmToMeters,
  loadSearchRadius,
  setNearbyOnly,
  setSearchRadiusKm,
} from "@/helpers/searchRadius";
import { useSearchRadius } from "@/src/hooks/useSearchRadius";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

beforeEach(async () => {
  await AsyncStorage.clear();
  await setSearchRadiusKm(SEARCH_RADIUS_DEFAULT_KM);
  await setNearbyOnly(true);
  jest.clearAllMocks();
});

describe("search distance (kilometres)", () => {
  it("defaults to the server's own 5 km", () => {
    expect(SEARCH_RADIUS_DEFAULT_KM).toBe(5);
    expect(kmToMeters(5)).toBe(5000);
  });

  it("never allows less than the minimum or more than the server's 50 km cap", () => {
    expect(clampRadiusKm(0)).toBe(SEARCH_RADIUS_MIN_KM);
    expect(clampRadiusKm(500)).toBe(SEARCH_RADIUS_MAX_KM);
    expect(clampRadiusKm(7.6)).toBe(8);
    expect(kmToMeters(SEARCH_RADIUS_MAX_KM)).toBeLessThanOrEqual(50_000);
  });

  it("is saved on the device and read back on the next launch", async () => {
    await setSearchRadiusKm(12);
    expect(await AsyncStorage.getItem(SEARCH_RADIUS_KEY)).toBe("12");
    await setSearchRadiusKm(SEARCH_RADIUS_DEFAULT_KM);
    await AsyncStorage.setItem(SEARCH_RADIUS_KEY, "12");
    await loadSearchRadius();
    expect(getSearchRadiusKm()).toBe(12);
  });

  it("ignores corrupt or out-of-range saved values", async () => {
    await AsyncStorage.setItem(SEARCH_RADIUS_KEY, "banana");
    expect(await loadSearchRadius()).toBe(SEARCH_RADIUS_DEFAULT_KM);
    await AsyncStorage.setItem(SEARCH_RADIUS_KEY, "9999");
    expect(await loadSearchRadius()).toBe(SEARCH_RADIUS_MAX_KM);
  });

  it("a slow load does not undo a newer choice", async () => {
    await AsyncStorage.setItem(SEARCH_RADIUS_KEY, "20");
    const pending = loadSearchRadius();
    await setSearchRadiusKm(6);
    await pending;
    expect(getSearchRadiusKm()).toBe(6);
  });
});

describe("only-nearby switch", () => {
  it("is on by default, and saved when turned off", async () => {
    expect(getNearbyOnly()).toBe(true);
    await setNearbyOnly(false);
    expect(getNearbyOnly()).toBe(false);
    expect(await AsyncStorage.getItem(NEARBY_ONLY_KEY)).toBe("false");
  });

  it("is read back on the next launch, and anything unexpected means on", async () => {
    await AsyncStorage.setItem(NEARBY_ONLY_KEY, "false");
    await loadSearchRadius();
    expect(getNearbyOnly()).toBe(false);
    await AsyncStorage.setItem(NEARBY_ONLY_KEY, "garbage");
    await loadSearchRadius();
    expect(getNearbyOnly()).toBe(true);
  });
});

describe("useSearchRadius", () => {
  it("exposes km, metres and the switch, and updates every user of it when they change", async () => {
    const a = renderHook(() => useSearchRadius());
    const b = renderHook(() => useSearchRadius());
    expect(a.result.current.meters).toBe(5000);
    await act(async () => {
      await a.result.current.setKm(10);
      await a.result.current.setNearbyOnly(false);
    });
    await waitFor(() => expect(b.result.current.km).toBe(10));
    expect(b.result.current.meters).toBe(kmToMeters(10));
    expect(b.result.current.nearbyOnly).toBe(false);
  });
});
