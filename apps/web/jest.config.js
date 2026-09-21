/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  // Extends Jest matchers with DOM assertions (toBeInTheDocument, etc.)
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // Resolve the workspace package without requiring a build step
    "^@nearcommerce/api$": "<rootDir>/../../packages/api/src/index.ts",
    // Stub the YOLO web worker — the Worker constructor itself is mocked in tests
    "\\.worker\\.(ts|js)$": "<rootDir>/src/__mocks__/workerMock.js",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          esModuleInterop: true,
          skipLibCheck: true,
          moduleResolution: "node",
          module: "commonjs",
        },
      },
    ],
  },
  testMatch: ["**/__tests__/**/*.test.tsx", "**/__tests__/**/*.test.ts"],
};
