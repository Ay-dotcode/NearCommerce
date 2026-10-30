import { buildMapsUrl, buildWebMapsUrl, openNativeMaps } from "@/helpers/maps";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking, Platform } from "react-native";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
}));

const setOS = (os: "ios" | "android") => {
  Object.defineProperty(Platform, "OS", { get: () => os, configurable: true });
  jest
    .spyOn(Platform, "select")
    .mockImplementation((o: any) => o[os] ?? o.default);
};

describe("buildMapsUrl", () => {
  it("uses Apple Maps directions on iOS", () => {
    setOS("ios");
    expect(buildMapsUrl(1.5, 2.5, "Corner Shop")).toBe(
      "maps://?daddr=1.5,2.5&q=Corner%20Shop",
    );
  });

  it("uses a geo: link on Android, or the navigation intent when avoiding tolls", () => {
    setOS("android");
    expect(buildMapsUrl(1.5, 2.5, "Shop")).toBe("geo:1.5,2.5?q=1.5,2.5(Shop)");
    expect(buildMapsUrl(1.5, 2.5, "Shop", true)).toBe(
      "google.navigation:q=1.5,2.5&avoid=t",
    );
  });
});

describe("openNativeMaps", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    setOS("android");
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it("applies the saved avoid-tolls preference", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("true");
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);

    expect(await openNativeMaps(1, 2, "Shop")).toBe(true);
    expect(Linking.openURL).toHaveBeenCalledWith(
      "google.navigation:q=1,2&avoid=t",
    );
  });

  // Regression: canOpenURL answers false for geo: links on Android 11+ (package visibility)
  // even when Google Maps is installed, so it must never decide whether to open the link.
  it("opens the link even though canOpenURL says no (Android 11+ package visibility)", async () => {
    const canOpen = jest.spyOn(Linking, "canOpenURL").mockResolvedValue(false);
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);

    expect(await openNativeMaps(1, 2, "Shop")).toBe(true);
    expect(Linking.openURL).toHaveBeenCalledWith("geo:1,2?q=1,2(Shop)");
    expect(canOpen).not.toHaveBeenCalled();
  });

  it("falls back to the https Google Maps link when no app handles the native link", async () => {
    const open = jest
      .spyOn(Linking, "openURL")
      .mockRejectedValueOnce(new Error("No Activity found to handle Intent"))
      .mockResolvedValueOnce(undefined);

    expect(await openNativeMaps(1, 2, "Shop")).toBe(true);
    expect(open).toHaveBeenNthCalledWith(1, "geo:1,2?q=1,2(Shop)");
    expect(open).toHaveBeenNthCalledWith(2, buildWebMapsUrl(1, 2));
  });

  it("keeps avoid-tolls on the https fallback", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("true");
    const open = jest
      .spyOn(Linking, "openURL")
      .mockRejectedValueOnce(new Error("nope"))
      .mockResolvedValueOnce(undefined);

    expect(await openNativeMaps(1, 2, "Shop")).toBe(true);
    expect(open).toHaveBeenLastCalledWith(
      "https://www.google.com/maps/dir/?api=1&destination=1,2&avoid=tolls",
    );
  });

  it("returns false only when nothing can open any of the links", async () => {
    jest.spyOn(Linking, "openURL").mockRejectedValue(new Error("nope"));

    expect(await openNativeMaps(1, 2, "Shop")).toBe(false);
    expect(Linking.openURL).toHaveBeenCalledTimes(2);
  });
});
