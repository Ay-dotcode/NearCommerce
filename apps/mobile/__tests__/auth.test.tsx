import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import ForgotPasswordScreen from "../app/(auth)/forgot-password";
import ResetPasswordScreen from "../app/(auth)/reset-password";
import { AuthProvider, useAuth } from "../src/context/AuthContext";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock("@nearcommerce/api", () => ({
  apiClient: {
    post: jest.fn(),
    defaults: { headers: { common: {} as Record<string, string> } },
  },
  configureTokenRefresh: jest.fn(),
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  removeMany: jest.fn(() => Promise.resolve()),
  setMany: jest.fn(() => Promise.resolve()),
}));

const api = require("@nearcommerce/api");
const post = api.apiClient.post as jest.Mock;
const configure = api.configureTokenRefresh as jest.Mock;
const storage = AsyncStorage as unknown as Record<string, jest.Mock>;
const { router } = require("expo-router");
const { useLocalSearchParams } = require("expo-router");

beforeEach(() => {
  jest.clearAllMocks();
  api.apiClient.defaults.headers.common = {};
  storage.getItem.mockResolvedValue(null);
  useLocalSearchParams.mockReturnValue({});
});

describe("AuthProvider token refresh", () => {
  let auth: ReturnType<typeof useAuth>;
  function Probe() {
    auth = useAuth();
    return <Text testID="token">{auth.token ?? "none"}</Text>;
  }
  const mount = async () => {
    const utils = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(auth.isLoading).toBe(false));
    return utils;
  };
  const handlers = () => configure.mock.calls[0][0];

  it("registers refresh handlers and removes them on unmount", async () => {
    const { unmount } = await mount();
    expect(configure).toHaveBeenCalledWith(
      expect.objectContaining({ onTokens: expect.any(Function) }),
    );
    unmount();
    expect(configure).toHaveBeenLastCalledWith(null);
  });

  it("reads the stored refresh token on demand", async () => {
    await mount();
    storage.getItem.mockResolvedValueOnce("stored-refresh");
    await expect(handlers().getRefreshToken()).resolves.toBe("stored-refresh");
    expect(storage.getItem).toHaveBeenCalledWith("@nearcommerce_refresh_token");
  });

  it("saves rotated tokens and updates the token the app (and sockets) use", async () => {
    const { getByTestId } = await mount();
    await act(async () => {
      await handlers().onTokens({ accessToken: "a2", refreshToken: "r2" });
    });
    expect(storage.setMany).toHaveBeenCalledWith({
      "@nearcommerce_token": "a2",
      "@nearcommerce_refresh_token": "r2",
    });
    expect(api.apiClient.defaults.headers.common.Authorization).toBe(
      "Bearer a2",
    );
    expect(getByTestId("token").props.children).toBe("a2");
  });

  it("signs out locally when the refresh token is rejected", async () => {
    const { getByTestId } = await mount();
    await act(async () => auth.login("a1", "r1"));
    expect(getByTestId("token").props.children).toBe("a1");

    await act(async () => {
      await handlers().onAuthFailure();
    });
    expect(storage.removeMany).toHaveBeenCalled();
    expect(getByTestId("token").props.children).toBe("none");
    expect(post).not.toHaveBeenCalled();
  });

  it("logout revokes the refresh token on the server and clears local state", async () => {
    const { getByTestId } = await mount();
    await act(async () => auth.login("a1", "r1"));
    storage.getItem.mockResolvedValue("r1");
    post.mockResolvedValue({});

    await act(async () => auth.logout());
    expect(post).toHaveBeenCalledWith("/auth/logout", { refresh_token: "r1" });
    expect(getByTestId("token").props.children).toBe("none");
    expect(api.apiClient.defaults.headers.common.Authorization).toBeUndefined();
  });

  it("logout still signs out when the server is unreachable", async () => {
    const { getByTestId } = await mount();
    await act(async () => auth.login("a1", "r1"));
    storage.getItem.mockResolvedValue("r1");
    post.mockRejectedValue(new Error("offline"));
    await act(async () => auth.logout());
    expect(getByTestId("token").props.children).toBe("none");
  });
});

describe("ForgotPasswordScreen", () => {
  it("rejects an invalid email without calling the API", () => {
    const { getByTestId, getByText } = render(<ForgotPasswordScreen />);
    fireEvent.changeText(getByTestId("email-input"), "nope");
    fireEvent.press(getByTestId("send-reset-button"));
    expect(getByText("Enter a valid email address.")).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });

  it("sends a normalised email and shows the neutral confirmation", async () => {
    post.mockResolvedValue({ data: {} });
    const { getByTestId, findByText } = render(<ForgotPasswordScreen />);
    fireEvent.changeText(getByTestId("email-input"), "  Jane@Example.com ");
    fireEvent.press(getByTestId("send-reset-button"));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/auth/forgot-password", {
        email: "jane@example.com",
      }),
    );
    expect(await findByText("Check your email")).toBeTruthy();
    fireEvent.press(getByTestId("have-token-link"));
    expect(router.replace).toHaveBeenCalledWith("/(auth)/reset-password");
  });

  it("explains rate limiting", async () => {
    post.mockRejectedValue({
      response: { status: 429, data: { error: "Too many" } },
    });
    const { getByTestId, findByText } = render(<ForgotPasswordScreen />);
    fireEvent.changeText(getByTestId("email-input"), "a@b.co");
    fireEvent.press(getByTestId("send-reset-button"));
    expect(await findByText(/too many requests/i)).toBeTruthy();
  });
});

describe("ResetPasswordScreen", () => {
  const fill = (
    utils: ReturnType<typeof render>,
    pw: string,
    confirm: string,
    token?: string,
  ) => {
    if (token) fireEvent.changeText(utils.getByTestId("token-input"), token);
    fireEvent.changeText(utils.getByTestId("new-password-input"), pw);
    fireEvent.changeText(utils.getByTestId("confirm-password-input"), confirm);
    fireEvent.press(utils.getByTestId("reset-button"));
  };

  it("validates code, length and matching passwords", () => {
    const utils = render(<ResetPasswordScreen />);
    fill(utils, "longenough1", "longenough1");
    expect(
      utils.getByText("Paste the reset code from your email."),
    ).toBeTruthy();
    fill(utils, "short", "short", "tok");
    expect(
      utils.getByText("Password must be at least 8 characters."),
    ).toBeTruthy();
    fill(utils, "longenough1", "different11");
    expect(utils.getByText("Passwords do not match.")).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });

  it("resets with a pasted code", async () => {
    post.mockResolvedValue({ data: {} });
    const utils = render(<ResetPasswordScreen />);
    fill(utils, "brandNewPass1", "brandNewPass1", " abc123 ");
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/auth/reset-password", {
        token: "abc123",
        new_password: "brandNewPass1",
      }),
    );
    expect(await utils.findByText("Password updated")).toBeTruthy();
    fireEvent.press(utils.getByTestId("go-to-login"));
    expect(router.replace).toHaveBeenCalledWith("/(auth)/login");
  });

  it("uses the token from a deep link and hides the code field", async () => {
    useLocalSearchParams.mockReturnValue({ token: "from-link" });
    post.mockResolvedValue({ data: {} });
    const utils = render(<ResetPasswordScreen />);
    expect(utils.queryByTestId("token-input")).toBeNull();
    fill(utils, "brandNewPass1", "brandNewPass1");
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/auth/reset-password", {
        token: "from-link",
        new_password: "brandNewPass1",
      }),
    );
  });

  it("tells the user when the code has expired", async () => {
    post.mockRejectedValue({
      response: {
        status: 400,
        data: { error: "Invalid or expired reset token" },
      },
    });
    const utils = render(<ResetPasswordScreen />);
    fill(utils, "brandNewPass1", "brandNewPass1", "old");
    expect(await utils.findByText(/invalid or has expired/i)).toBeTruthy();
  });
});
