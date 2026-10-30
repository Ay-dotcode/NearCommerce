// Native AsyncStorage does not exist in Jest. Screens now read the saved search distance,
// so provide the official in-memory mock everywhere (a test can still mock it itself).
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Insets are provided by a native view; use the official mock so sheets and drawers can render.
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);

// Clipboard is a native module; tests only need to see that it was called.
jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(() => Promise.resolve(true)),
}));

// The "using your location" indicator talks to native notification / Live Activity modules that
// don't exist in Jest. Screens only need to know it was started; its own test uses the real one.
jest.mock("@/helpers/locationIndicator", () => ({
  startLocationIndicator: jest.fn(() => jest.fn(() => Promise.resolve())),
  withLocationIndicator: jest.fn((task) => task()),
}));
