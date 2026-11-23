import { AppRoutes } from "@/constants/routes";
import { clearSession, getUserRole } from "@/features/auth/session";
import { LoginForm } from "@/forms/LoginForm";
import { RegisterForm } from "@/forms/RegisterForm";
import { apiClient } from "@nearcommerce/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

let mockClientId = "web-client.apps.googleusercontent.com";
jest.mock("@/features/auth/googleClientId", () => ({
  get googleClientId() {
    return mockClientId;
  },
}));

// Google's real button is an iframe; this stand-in lets the test "complete" or "cancel" it, and
// records the look it was asked to draw.
let mockButtonProps: { theme?: string; width?: number | string } = {};
jest.mock("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  GoogleLogin: (props: {
    onSuccess: (r: { credential?: string }) => void;
    onError: () => void;
    theme?: string;
    width?: number | string;
  }) => {
    mockButtonProps = { theme: props.theme, width: props.width };
    return (
      <>
        <button
          type="button"
          onClick={() => props.onSuccess({ credential: "google-id-token" })}
        >
          Continue with Google
        </button>
        <button type="button" onClick={() => props.onSuccess({})}>
          Google returns nothing
        </button>
        <button type="button" onClick={() => props.onError()}>
          Cancel Google
        </button>
      </>
    );
  },
}));

jest.mock("@nearcommerce/api", () => ({
  ...jest.requireActual("@nearcommerce/api"),
  getSupportChannels: jest.fn().mockResolvedValue({ channels: {} }),
  apiClient: { post: jest.fn(), defaults: { headers: { common: {} } } },
}));
const post = apiClient.post as jest.Mock;

const renderPage = (page: "login" | "register") =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[page === "login" ? "/" : "/register"]}>
        <Routes>
          <Route path={AppRoutes.home} element={<LoginForm />} />
          <Route path={AppRoutes.register} element={<RegisterForm />} />
          <Route
            path={AppRoutes.storeOwnerDashboard}
            element={<div data-testid="owner-dash">Owner Dashboard</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

const googleResponse = (role: string, extra = {}) => ({
  data: {
    access_token: "access",
    refresh_token: "refresh",
    user: { id: "u1", role, ...extra },
    is_new_user: false,
  },
});

describe("Continue with Google (store portal)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearSession();
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    mockButtonProps = {};
    mockClientId = "web-client.apps.googleusercontent.com";
  });

  it("is hidden when no Google client id is configured", () => {
    mockClientId = "";
    renderPage("login");
    expect(screen.queryByText("Continue with Google")).not.toBeInTheDocument();
    expect(screen.queryByTestId("google-sign-in")).not.toBeInTheDocument();
  });

  it("signs a store owner in and opens the dashboard", async () => {
    post.mockResolvedValueOnce(
      googleResponse("STORE_OWNER", { store_id: "s1" }),
    );
    renderPage("login");
    fireEvent.click(screen.getByText("Continue with Google"));

    await waitFor(() =>
      expect(screen.getByTestId("owner-dash")).toBeInTheDocument(),
    );
    expect(post).toHaveBeenCalledWith("/auth/google", {
      id_token: "google-id-token",
      role: "STORE_OWNER",
    });
    expect(getUserRole()).toBe("STORE_OWNER");
  });

  it("does not keep a session for a shopper account and says where to go", async () => {
    post.mockResolvedValueOnce(googleResponse("CUSTOMER"));
    renderPage("login");
    fireEvent.click(screen.getByText("Continue with Google"));

    expect(
      await screen.findByText("This portal is for store owners"),
    ).toBeInTheDocument();
    expect(getUserRole()).toBeNull();
    expect(screen.queryByTestId("owner-dash")).not.toBeInTheDocument();
  });

  it("shows the server's message when the email already has a password account", async () => {
    post.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          error:
            "An account with this email already exists. Log in with your email and password instead.",
          code: "EMAIL_EXISTS_USE_PASSWORD",
        },
      },
    });
    renderPage("login");
    fireEvent.click(screen.getByText("Continue with Google"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /already exists\. Log in with your email and password/i,
    );
    expect(getUserRole()).toBeNull();
  });

  it("offers support when the account is suspended", async () => {
    post.mockRejectedValueOnce({
      response: {
        status: 403,
        data: { error: "Account is suspended.", code: "ACCOUNT_SUSPENDED" },
      },
    });
    renderPage("login");
    fireEvent.click(screen.getByText("Continue with Google"));
    expect(
      await screen.findByText("Account is suspended."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Contact support" }),
    ).toBeInTheDocument();
  });

  it("explains a cancelled or failed Google prompt without calling the API", async () => {
    renderPage("login");
    fireEvent.click(screen.getByText("Cancel Google"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /cancelled or could not start/i,
    );
    fireEvent.click(screen.getByText("Google returns nothing"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /did not return a sign-in/i,
    );
    expect(post).not.toHaveBeenCalled();
  });

  it("works on the register page too and lands on the dashboard", async () => {
    post.mockResolvedValueOnce({
      data: { ...googleResponse("STORE_OWNER").data, is_new_user: true },
    });
    renderPage("register");
    fireEvent.click(screen.getByText("Continue with Google"));
    await waitFor(() =>
      expect(screen.getByTestId("owner-dash")).toBeInTheDocument(),
    );
    expect(post).toHaveBeenCalledWith(
      "/auth/google",
      expect.objectContaining({ role: "STORE_OWNER" }),
    );
  });

  it("tells a shopper on the register page this portal is for store owners", async () => {
    post.mockResolvedValueOnce(googleResponse("CUSTOMER"));
    renderPage("register");
    fireEvent.click(screen.getByText("Continue with Google"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /shopper account.*store owners/i,
    );
    expect(getUserRole()).toBeNull();
  });

  it("uses a width Google accepts (200 to 400 px)", () => {
    renderPage("login");
    const width = Number(mockButtonProps.width);
    expect(width).toBeGreaterThanOrEqual(200);
    expect(width).toBeLessThanOrEqual(400);
  });
});
