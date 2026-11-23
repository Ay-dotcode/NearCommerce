import LoginScreen from "@/app/(auth)/login";
import RegisterScreen from "@/app/(auth)/register";
import { AuthProvider } from "@/src/context/AuthContext";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { useColorScheme } from "react-native";

jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: jest.fn(() => "light"),
}));
const scheme = useColorScheme as unknown as jest.Mock;

jest.mock("@nearcommerce/api", () => {
  const actual = jest.requireActual("@nearcommerce/api");
  return {
    ...actual,
    apiClient: { post: jest.fn(), defaults: { headers: { common: {} } } },
    configureTokenRefresh: jest.fn(),
  };
});
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  Redirect: () => null,
}));
jest.mock("@/src/context/SettingsContext", () => ({
  useOptionalSettings: () => ({ openSupport: jest.fn() }),
}));

const post = () =>
  (require("@nearcommerce/api").apiClient as { post: jest.Mock }).post;
const signIn = GoogleSignin.signIn as jest.Mock;
const signOut = GoogleSignin.signOut as jest.Mock;

const withAuth = (screen: React.ReactElement) =>
  render(<AuthProvider>{screen}</AuthProvider>);
const googleButton = (utils: ReturnType<typeof withAuth>) =>
  utils.getByLabelText("Sign in with Google");

const googleToken = (idToken: string | null = "google-id-token") => ({
  type: "success",
  data: { idToken },
});

describe("Sign in with Google (mobile)", () => {
  const original = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID =
      "web-client.apps.googleusercontent.com";
  });
  afterAll(() => {
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = original;
  });

  it("shows no Google button when Google is not configured", async () => {
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    const utils = withAuth(<LoginScreen />);
    await waitFor(() => expect(utils.getByTestId("login-button")).toBeTruthy());
    expect(utils.queryByTestId("google-sign-in")).toBeNull();
  });

  it("uses Google's light button in the light theme and the dark one in the dark theme", () => {
    scheme.mockReturnValue("light");
    const light = withAuth(<LoginScreen />);
    expect(light.getByTestId("google-button-light")).toBeTruthy();
    light.unmount();

    scheme.mockReturnValue("dark");
    const dark = withAuth(<LoginScreen />);
    expect(dark.getByTestId("google-button-dark")).toBeTruthy();
    scheme.mockReturnValue("light");
  });

  it("signs in with the Google token, stores the session and opens the app", async () => {
    signIn.mockResolvedValueOnce(googleToken());
    post().mockResolvedValueOnce({
      data: {
        access_token: "access",
        refresh_token: "refresh",
        user: { id: "u1", role: "CUSTOMER" },
        is_new_user: true,
      },
    });
    const utils = withAuth(<LoginScreen />);
    fireEvent.press(googleButton(utils));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/(tabs)"));
    expect(GoogleSignin.configure).toHaveBeenCalledWith(
      expect.objectContaining({
        webClientId: "web-client.apps.googleusercontent.com",
      }),
    );
    expect(post()).toHaveBeenCalledWith("/auth/google", {
      id_token: "google-id-token",
      role: "CUSTOMER",
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@nearcommerce_token",
      "access",
    );
  });

  it("says nothing when the person closes the Google sheet", async () => {
    signIn.mockResolvedValueOnce({ type: "cancelled", data: null });
    const utils = withAuth(<LoginScreen />);
    fireEvent.press(googleButton(utils));
    await waitFor(() => expect(signIn).toHaveBeenCalled());
    expect(post()).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(utils.queryByText(/could not start|failed/i)).toBeNull();
  });

  it("shows the server's message when the email already has a password account, and forgets the Google account", async () => {
    signIn.mockResolvedValueOnce(googleToken());
    post().mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          error:
            "An account with this email already exists. Log in with your email and password instead.",
          code: "EMAIL_EXISTS_USE_PASSWORD",
        },
      },
    });
    const utils = withAuth(<LoginScreen />);
    fireEvent.press(googleButton(utils));

    expect(
      await utils.findByText(/already exists\. Log in with your email/i),
    ).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
  });

  it("offers support when the account is suspended", async () => {
    signIn.mockResolvedValueOnce(googleToken());
    post().mockRejectedValueOnce({
      response: {
        status: 403,
        data: { error: "Account is suspended.", code: "ACCOUNT_SUSPENDED" },
      },
    });
    const utils = withAuth(<LoginScreen />);
    fireEvent.press(googleButton(utils));
    expect(await utils.findByText("Account is suspended.")).toBeTruthy();
    expect(utils.getByTestId("contact-support-link")).toBeTruthy();
  });

  it("explains a Google sheet failure instead of blaming the server", async () => {
    // Axios errors also have a `code`; this one comes from the native sign-in step.
    signIn.mockRejectedValueOnce({ code: "PLAY_SERVICES_NOT_AVAILABLE" });
    const utils = withAuth(<LoginScreen />);
    fireEvent.press(googleButton(utils));
    expect(await utils.findByText(/Google Play services/i)).toBeTruthy();
    expect(post()).not.toHaveBeenCalled();
  });

  it("does not treat an API error that has a `code` as a Google sheet failure", async () => {
    signIn.mockResolvedValueOnce(googleToken());
    post().mockRejectedValueOnce({
      code: "ERR_BAD_REQUEST",
      response: {
        status: 503,
        data: { error: "Google sign-in is not configured on this server." },
      },
    });
    const utils = withAuth(<LoginScreen />);
    fireEvent.press(googleButton(utils));
    expect(
      await utils.findByText(/not configured on this server/i),
    ).toBeTruthy();
  });

  it("is also on the register screen and creates a shopper account", async () => {
    signIn.mockResolvedValueOnce(googleToken());
    post().mockResolvedValueOnce({
      data: {
        access_token: "access",
        refresh_token: "refresh",
        user: { id: "u1", role: "CUSTOMER" },
        is_new_user: true,
      },
    });
    const utils = withAuth(<RegisterScreen />);
    fireEvent.press(googleButton(utils));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/(tabs)"));
    expect(post()).toHaveBeenCalledWith(
      "/auth/google",
      expect.objectContaining({ role: "CUSTOMER" }),
    );
  });

  it("signs out of Google when the app signs out, so the next person gets the picker", async () => {
    const { useAuth } = require("@/src/context/AuthContext");
    let logout: () => Promise<void> = async () => undefined;
    const Probe = () => {
      logout = useAuth().logout;
      return null;
    };
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    // A refresh token is still stored from earlier sign-ins, so logout also calls the API.
    post().mockResolvedValue({});
    await logout();
    expect(signOut).toHaveBeenCalled();
  });
});
