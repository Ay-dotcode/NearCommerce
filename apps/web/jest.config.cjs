/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  moduleNameMapper: {
    "\\.svg$": "<rootDir>/../../packages/ui/src/__mocks__/fileMock.js",
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@nearcommerce/api/(.*)$": "<rootDir>/../../packages/api/$1",
    "^@nearcommerce/ui/(.*)$": "<rootDir>/../../packages/ui/$1",
    "^@nearcommerce/api$": "<rootDir>/../../packages/api/src/index.ts",
    "^@nearcommerce/ui$": "<rootDir>/../../packages/ui/src/index.ts",
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
