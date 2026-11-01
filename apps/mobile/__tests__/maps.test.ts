import {
  buildMapsCandidates,
  buildMapsUrl,
  buildWebMapsUrl,
  openNativeMaps,
} from "@/helpers/maps";
import { Linking, Platform } from "react-native";

const setOS = (os: "ios" | "android" | "web") => {
  Object.defineProperty(Platform, "OS", { get: () => os, configurable: true });
  jest
    .spyOn(Platform, "select")
    .mockImplementation((o: any) => o[os] ?? o.default);
};

describe("map links", () => {
  it("uses Apple Maps directions on iOS, to the coordinates only", () => {
    setOS("ios");
    expect(buildMapsUrl(1.5, 2.5)).toBe("maps://?daddr=1.5,2.5&dirflg=d");
  });

  it("uses the Google Maps navigation intent on Android", () => {
    setOS("android");
    expect(buildMapsUrl(1.5, 2.5)).toBe("google.navigation:q=1.5,2.5");
  });

  it("tries the navigation intent, then any maps app, then the web link on Android", () => {
    setOS("android");
    expect(buildMapsCandidates(1.5, 2.5)).toEqual([
      "google.navigation:q=1.5,2.5",
      "geo:1.5,2.5?q=1.5,2.5",
      buildWebMapsUrl(1.5, 2.5),
    ]);
  });

  it("tries Apple Maps, then the web link on iOS", () => {
    setOS("ios");
    expect(buildMapsCandidates(1.5, 2.5)).toEqual([
      "maps://?daddr=1.5,2.5&dirflg=d",
      buildWebMapsUrl(1.5, 2.5),
    ]);
  });

  it("never puts a store name in any link, so no place is searched for", () => {
    for (const os of ["ios", "android", "web"] as const) {
      setOS(os);
      for (const url of [
        ...buildMapsCandidates(35.1, 33.9),
        buildMapsUrl(35.1, 33.9) as string,
      ])
        // Only the coordinates (and fixed flags) appear: no free text to search for.
        expect(url.replace(/[0-9.,-]+/g, "#")).not.toMatch(/%20|\(|[?&]q=[A-Za-z]/);
    }
  });

  it("has no avoid-tolls option in any link", () => {
    for (const os of ["ios", "android", "web"] as const) {
      setOS(os);
      for (const url of buildMapsCandidates(35.1, 33.9))
        expect(url).not.toMatch(/avoid/i);
    }
  });
});

describe("openNativeMaps", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    setOS("android");
  });

  it("opens the first link that works", async () => {
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);

    expect(await openNativeMaps(1, 2)).toBe(true);
    expect(Linking.openURL).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).toHaveBeenCalledWith("google.navigation:q=1,2");
  });

  // Regression: canOpenURL answers false for geo: links on Android 11+ (package visibility)
  // even when Google Maps is installed, so it must never decide whether to open the link.
  it("opens the link even though canOpenURL says no (Android 11+ package visibility)", async () => {
    const canOpen = jest.spyOn(Linking, "canOpenURL").mockResolvedValue(false);
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);

    expect(await openNativeMaps(1, 2)).toBe(true);
    expect(Linking.openURL).toHaveBeenCalledWith("google.navigation:q=1,2");
    expect(canOpen).not.toHaveBeenCalled();
  });

  it("falls back to any maps app when Google Maps isn't installed", async () => {
    const open = jest
      .spyOn(Linking, "openURL")
      .mockRejectedValueOnce(new Error("No Activity found to handle Intent"))
      .mockResolvedValueOnce(undefined);

    expect(await openNativeMaps(1, 2)).toBe(true);
    expect(open).toHaveBeenNthCalledWith(1, "google.navigation:q=1,2");
    expect(open).toHaveBeenNthCalledWith(2, "geo:1,2?q=1,2");
  });

  it("falls back to the https link when no maps app handles a link", async () => {
    const open = jest
      .spyOn(Linking, "openURL")
      .mockRejectedValueOnce(new Error("nope"))
      .mockRejectedValueOnce(new Error("nope"))
      .mockResolvedValueOnce(undefined);

    expect(await openNativeMaps(1, 2)).toBe(true);
    expect(open).toHaveBeenLastCalledWith(buildWebMapsUrl(1, 2));
  });

  it("returns false only when nothing can open any of the links", async () => {
    jest.spyOn(Linking, "openURL").mockRejectedValue(new Error("nope"));

    expect(await openNativeMaps(1, 2)).toBe(false);
    expect(Linking.openURL).toHaveBeenCalledTimes(3);
  });
});
