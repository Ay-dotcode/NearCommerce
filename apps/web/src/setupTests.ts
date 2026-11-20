import "@testing-library/jest-dom";

// The real module reads import.meta.env, which the CommonJS test build cannot compile. By
// default Google sign-in is "not configured"; tests that need it override this mock.
jest.mock("@/features/auth/googleClientId", () => ({ googleClientId: "" }));
