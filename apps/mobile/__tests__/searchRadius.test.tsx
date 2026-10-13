import {
  SEARCH_RADIUS_DEFAULT_MILES,
  SEARCH_RADIUS_KEY,
  SEARCH_RADIUS_MAX_MILES,
  SEARCH_RADIUS_MIN_MILES,
} from "@/constants";
import { useSearchRadius } from "@/src/hooks/useSearchRadius";
import {
  clampRadiusMiles,
  getSearchRadiusMiles,
  loadSearchRadius,
  milesToMeters,
  setSearchRadiusMiles,
} from "@/utils/searchRadius";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

beforeEach(async () => {
  await AsyncStorage.clear();
  await setSearchRadiusMiles(SEARCH_RADIUS_DEFAULT_MILES);
  jest.clearAllMocks();
});

describe("search distance", () => {
  it("defaults to about the server's own 5 km", () => {
    expect(SEARCH_RADIUS_DEFAULT_MILES).toBe(3);
    expect(milesToMeters(3)).toBe(4828);
  });

  it("never allows less than the minimum or more than the server's 50 km cap", () => {
    expect(clampRadiusMiles(0)).toBe(SEARCH_RADIUS_MIN_MILES);
    expect(clampRadiusMiles(500)).toBe(SEARCH_RADIUS_MAX_MILES);
    expect(clampRadiusMiles(7.6)).toBe(8);
    expect(milesToMeters(SEARCH_RADIUS_MAX_MILES)).toBeLessThanOrEqual(50_000);
  });

  it("is saved on the device and read back on the next launch", async () => {
    await setSearchRadiusMiles(12);
    expect(await AsyncStorage.getItem(SEARCH_RADIUS_KEY)).toBe("12");
    await setSearchRadiusMiles(SEARCH_RADIUS_DEFAULT_MILES);
    await AsyncStorage.setItem(SEARCH_RADIUS_KEY, "12");
    await loadSearchRadius();
    expect(getSearchRadiusMiles()).toBe(12);
  });

  it("ignores corrupt or out-of-range saved values", async () => {
    await AsyncStorage.setItem(SEARCH_RADIUS_KEY, "banana");
    expect(await loadSearchRadius()).toBe(SEARCH_RADIUS_DEFAULT_MILES);
    await AsyncStorage.setItem(SEARCH_RADIUS_KEY, "9999");
    expect(await loadSearchRadius()).toBe(SEARCH_RADIUS_MAX_MILES);
  });

  it("a slow load does not undo a newer choice", async () => {
    await AsyncStorage.setItem(SEARCH_RADIUS_KEY, "20");
    const pending = loadSearchRadius();
    await setSearchRadiusMiles(6);
    await pending;
    expect(getSearchRadiusMiles()).toBe(6);
  });
});

describe("useSearchRadius", () => {
  it("exposes miles and metres, and updates every user of it when it changes", async () => {
    const a = renderHook(() => useSearchRadius());
    const b = renderHook(() => useSearchRadius());
    expect(a.result.current.meters).toBe(4828);
    await act(async () => {
      await a.result.current.setMiles(10);
    });
    await waitFor(() => expect(b.result.current.miles).toBe(10));
    expect(b.result.current.meters).toBe(milesToMeters(10));
  });
});
