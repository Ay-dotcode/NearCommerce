jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
}));

type Listener = (change: { colorScheme: "light" | "dark" | null }) => void;

// Loads the module fresh, as it is when the app starts, with the phone set to `initial`.
function loadModule(initial: "light" | "dark" | null) {
  const listeners: Listener[] = [];
  let mod!: typeof import("@/helpers/themePreference");
  jest.isolateModules(() => {
    const { Appearance } = require("react-native");
    jest.spyOn(Appearance, "getColorScheme").mockReturnValue(initial);
    jest.spyOn(Appearance, "setColorScheme").mockImplementation(() => {});
    jest.spyOn(Appearance, "addChangeListener").mockImplementation((...args: unknown[]) => {
      listeners.push(args[0] as Listener);
      return { remove() {} };
    });
    mod = require("@/helpers/themePreference");
  });
  return { mod, change: (colorScheme: "light" | "dark" | null) => listeners.forEach((l) => l({ colorScheme })) };
}

describe("getDeviceIsDark (what the phone itself is set to)", () => {
  it("is read when the app starts", () => {
    expect(loadModule("dark").mod.getDeviceIsDark()).toBe(true);
    expect(loadModule("light").mod.getDeviceIsDark()).toBe(false);
  });

  it("is unknown when the phone doesn't say", () => {
    expect(loadModule(null).mod.getDeviceIsDark()).toBeUndefined();
  });

  it("follows the phone while the app follows the phone", () => {
    const { mod, change } = loadModule("light");
    change("dark");
    expect(mod.getDeviceIsDark()).toBe(true);
  });

  it("isn't overwritten by the look the app forces on itself", async () => {
    const { mod, change } = loadModule("dark");
    await mod.setThemePreference("light");
    // Forcing a look makes the app report that look, which says nothing about the phone.
    change("light");
    expect(mod.getDeviceIsDark()).toBe(true);
  });
});
