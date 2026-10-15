/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  moduleNameMapper: {
    "^@nearcommerce/helpers$": "<rootDir>/../helpers/src/index.ts",
    "\\.svg$": "<rootDir>/src/__mocks__/fileMock.js",
    "^@nearcommerce/ui/(.*)$": "<rootDir>/$1",
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
