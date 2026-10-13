module.exports = {
  testTimeout: 30000,
  preset: "jest-expo",
  setupFiles: ["<rootDir>/jest.setup.js"],
  setupFilesAfterEnv: ["@testing-library/jest-native/extend-expect"],
  // pnpm stores scoped packages as "@scope+name", so those need listing explicitly.
  transformIgnorePatterns: [
    "node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo\\+.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@react-navigation\\+.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))",
  ],
};
