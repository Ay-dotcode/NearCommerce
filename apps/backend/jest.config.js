// @type {import('jest').Config}
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // Each run gets its own throwaway database schema: nothing the tests create outlives the run.
  globalSetup: "<rootDir>/test/globalSetup.cjs",
  globalTeardown: "<rootDir>/test/globalTeardown.cjs",
  testTimeout: 30000,
  testMatch: ["**/src/**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      { tsconfig: "tsconfig.json", diagnostics: { ignoreCodes: [151002] } },
    ],
  },
};
