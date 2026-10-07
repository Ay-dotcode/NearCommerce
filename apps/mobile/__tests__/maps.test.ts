import { buildMapsUrl, openNativeMaps } from "@/utils/maps";
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
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  });

  it("applies the saved avoid-tolls preference", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("true");
    jest.spyOn(Linking, "canOpenURL").mockResolvedValue(true);

    expect(await openNativeMaps(1, 2, "Shop")).toBe(true);
    expect(Linking.openURL).toHaveBeenCalledWith(
      "google.navigation:q=1,2&avoid=t",
    );
  });

  it("returns false when no maps app can open the link", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    jest.spyOn(Linking, "canOpenURL").mockResolvedValue(false);

    expect(await openNativeMaps(1, 2, "Shop")).toBe(false);
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});
