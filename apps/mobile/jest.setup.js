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

// Google Sign-In is a native module. Importing the real one needs native constants, so tests get
// a stand-in: the official button becomes a plain pressable, and each test decides what
// GoogleSignin.signIn() answers.
jest.mock("@react-native-google-signin/google-signin", () => {
  const React = require("react");
  const { Pressable } = require("react-native");
  const GoogleSigninButton = ({ onPress, accessibilityLabel, color }) =>
    React.createElement(Pressable, {
      accessibilityRole: "button",
      accessibilityLabel,
      testID: `google-button-${color}`,
      onPress,
    });
  GoogleSigninButton.Size = { Icon: 2, Standard: 0, Wide: 1 };
  GoogleSigninButton.Color = { Dark: "dark", Light: "light" };
  return {
    GoogleSignin: {
      configure: jest.fn(),
      hasPlayServices: jest.fn(() => Promise.resolve(true)),
      signIn: jest.fn(),
      signOut: jest.fn(() => Promise.resolve(null)),
    },
    GoogleSigninButton,
    isCancelledResponse: (r) => r?.type === "cancelled",
    isErrorWithCode: (e) => !!e && typeof e === "object" && "code" in e,
    statusCodes: {
      SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
      IN_PROGRESS: "IN_PROGRESS",
      PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
    },
  };
});
