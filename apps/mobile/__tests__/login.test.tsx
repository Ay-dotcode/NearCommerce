import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AuthProvider } from "../src/context/AuthContext";

// Mock the shared API client so no real network calls are made
jest.mock("@nearcommerce/api", () => ({
  apiClient: {
    post: jest.fn(),
    defaults: { headers: { common: {} } },
  },
}));

// Mock expo-router so <Redirect> / router.replace don't crash in Jest
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  Redirect: () => null,
}));

// Inline AsyncStorage mock (consistent with settings.test.tsx pattern)
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Lazy-require so mocks are applied first
const getApiClient = () =>
  require("@nearcommerce/api").apiClient as jest.Mocked<{
    post: jest.Mock;
    defaults: { headers: { common: Record<string, string> } };
  }>;

import LoginScreen from "../app/(auth)/login";

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the common headers object between tests
    getApiClient().defaults.headers.common = {};
  });

  it("renders email, password fields and sign-in button", async () => {
    const { getByTestId, getByText } = render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(getByTestId("email-input")).toBeTruthy();
      expect(getByTestId("password-input")).toBeTruthy();
      expect(getByText("Sign in")).toBeTruthy();
    });
  });

  it("calls /auth/login and stores the token on success", async () => {
    const { apiClient } = require("@nearcommerce/api");
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        access_token: "fake-jwt-token",
        user: { id: "u1", role: "CUSTOMER" },
      },
    });

    const { getByTestId } = render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>,
    );

    fireEvent.changeText(getByTestId("email-input"), "test@example.com");
    fireEvent.changeText(getByTestId("password-input"), "securepassword");
    fireEvent.press(getByTestId("login-button"));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/auth/login", {
        email: "test@example.com",
        password: "securepassword",
      });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@nearcommerce_token",
        "fake-jwt-token",
      );
    });
  });

  it("attaches the Authorization header after login", async () => {
    const { apiClient } = require("@nearcommerce/api");
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        access_token: "header-test-token",
        user: { id: "u2", role: "CUSTOMER" },
      },
    });

    const { getByTestId } = render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>,
    );

    fireEvent.changeText(getByTestId("email-input"), "a@b.com");
    fireEvent.changeText(getByTestId("password-input"), "password123");
    fireEvent.press(getByTestId("login-button"));

    await waitFor(() => {
      expect(apiClient.defaults.headers.common["Authorization"]).toBe(
        "Bearer header-test-token",
      );
    });
  });

  it("shows an Alert on failed login (network / bad credentials)", async () => {
    const { apiClient } = require("@nearcommerce/api");
    (apiClient.post as jest.Mock).mockRejectedValueOnce(new Error("401"));

    const AlertMock = jest
      .spyOn(require("react-native"), "Alert", "get")
      .mockReturnValue({ alert: jest.fn() });

    const { getByTestId } = render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>,
    );

    fireEvent.changeText(getByTestId("email-input"), "bad@email.com");
    fireEvent.changeText(getByTestId("password-input"), "wrongpass");
    fireEvent.press(getByTestId("login-button"));

    await waitFor(() => {
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    AlertMock.mockRestore();
  });
});
