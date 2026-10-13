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
