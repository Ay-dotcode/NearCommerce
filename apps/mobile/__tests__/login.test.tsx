import LoginScreen from "@/app/(auth)/login";
import { AuthProvider } from "@/src/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

// Mock the shared API client so no real network calls are made
jest.mock("@nearcommerce/api", () => {
  const actual = jest.requireActual("@nearcommerce/api");
  return {
    ...actual,
    apiClient: {
      post: jest.fn(),
      defaults: { headers: { common: {} } },
    },
    configureTokenRefresh: jest.fn(),
  };
});

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
  removeMany: jest.fn(() => Promise.resolve()),
  setMany: jest.fn(() => Promise.resolve()),
}));

// Lazy-require so mocks are applied first
const getApiClient = () =>
  require("@nearcommerce/api").apiClient as jest.Mocked<{
    post: jest.Mock;
    defaults: { headers: { common: Record<string, string> } };
  }>;

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

  it.each([
    [
      "wrong credentials",
      { response: { status: 401, data: { error: "Invalid credentials" } } },
      "Invalid email or password.",
    ],
    [
      "a lockout",
      {
        response: {
          status: 429,
          data: {
            error: "Too many failed login attempts. Try again in 60 seconds.",
          },
        },
      },
      "Too many failed login attempts. Try again in 60 seconds.",
    ],
    [
      "an unreachable server",
      new Error("Network Error"),
      "Can't reach the server. Check your connection and try again.",
    ],
  ])("shows an Alert explaining %s", async (_name, rejection, message) => {
    const { apiClient } = require("@nearcommerce/api");
    (apiClient.post as jest.Mock).mockRejectedValueOnce(rejection);

    const alert = jest.fn();
    const AlertMock = jest
      .spyOn(require("react-native"), "Alert", "get")
      .mockReturnValue({ alert });

    const { getByTestId } = render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>,
    );

    fireEvent.changeText(getByTestId("email-input"), "bad@email.com");
    fireEvent.changeText(getByTestId("password-input"), "wrongpass");
    fireEvent.press(getByTestId("login-button"));

    await waitFor(() => {
      expect(alert).toHaveBeenCalledWith("Login Failed", message);
    });
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();

    AlertMock.mockRestore();
  });

  it("stores the refresh token alongside the access token", async () => {
    const { apiClient } = require("@nearcommerce/api");
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        access_token: "access-1",
        refresh_token: "refresh-1",
        user: { id: "u3", role: "CUSTOMER" },
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

    await waitFor(() =>
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "@nearcommerce_refresh_token",
        "refresh-1",
      ),
    );
  });

  it("links to the forgot-password screen", () => {
    const { getByTestId } = render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>,
    );
    fireEvent.press(getByTestId("forgot-password-link"));
    expect(require("expo-router").router.push).toHaveBeenCalledWith(
      "/(auth)/forgot-password",
    );
  });
});
