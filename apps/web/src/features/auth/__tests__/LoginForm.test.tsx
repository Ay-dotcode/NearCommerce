import { AppRoutes } from "@/constants/routes";
import { clearSession } from "@/features/auth/session";
import { LoginForm } from "@/features/auth/ui/LoginForm";
import { apiClient } from "@nearcommerce/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// ---------------------------------------------------------------------------
// Mock the shared Axios client so tests never hit the real network
// ---------------------------------------------------------------------------
jest.mock("@nearcommerce/api", () => ({
  UserRole: {
    CUSTOMER: "CUSTOMER",
    STORE_OWNER: "STORE_OWNER",
    SYSTEM_ADMIN: "SYSTEM_ADMIN",
  },
  STORE_KEY: "x-store-id",
  apiClient: {
    post: jest.fn(),
    defaults: { headers: { common: {} } },
  },
}));

describe("LoginForm & Store Owner Routing (Task 4.1)", () => {
  const makeQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

  const renderWithProviders = (
    queryClient: QueryClient,
    entry: string | { pathname: string; state?: unknown } = "/",
  ) => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[entry]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path={AppRoutes.home} element={<LoginForm />} />
            <Route
              path={AppRoutes.register}
              element={<div>Register page</div>}
            />
            <Route
              path={AppRoutes.storeProfile}
              element={<div data-testid="owner-profile">Profile</div>}
            />
            <Route
              path={AppRoutes.storeOwnerDashboard}
              element={<div data-testid="owner-dash">Owner Dashboard</div>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clearSession();
    (apiClient.defaults.headers.common as Record<string, string | undefined>)[
      "x-store-id"
    ] = undefined;
  });

  it("routes to /owner/dashboard and sets X-Store-ID for STORE_OWNER role", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        access_token: "mock-owner-token",
        user: { id: "2", role: "STORE_OWNER", store_id: "store-123" },
      },
    });

    const queryClient = makeQueryClient();
    renderWithProviders(queryClient);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "owner@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByTestId("owner-dash")).toBeInTheDocument();
    });

    expect(
      (apiClient.defaults.headers.common as Record<string, string>)[
        "x-store-id"
      ],
    ).toBe("store-123");
  });

  it("rejects unauthorized role for store portal", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        access_token: "mock-admin-token",
        user: { id: "1", role: "CUSTOMER" },
      },
    });

    const queryClient = makeQueryClient();
    renderWithProviders(queryClient);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "customer@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    const alert = await screen.findByRole("alert");
    expect(
      within(alert).getByText(/this portal is for store owners/i),
    ).toBeInTheDocument();
    expect(within(alert).getByText(/mobile app/i)).toBeInTheDocument();
    fireEvent.click(
      within(alert).getByRole("link", {
        name: /create a store owner account/i,
      }),
    );
    expect(await screen.findByText("Register page")).toBeInTheDocument();
    // No session is kept for a shopper.
    expect(localStorage.getItem("access_token")).toBeNull();
  });

  it("points administrators to the admin console and keeps no session", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        access_token: "admin-token",
        user: { id: "9", role: "SYSTEM_ADMIN" },
      },
    });
    renderWithProviders(makeQueryClient());
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "admin@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    expect(await screen.findByText(/admin console/i)).toBeInTheDocument();
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("user_role")).toBeNull();
    expect(
      (apiClient.defaults.headers.common as Record<string, unknown>)
        .Authorization,
    ).toBeUndefined();
  });

  it("returns an owner to the page they were sent from", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        access_token: "t",
        user: { id: "2", role: "STORE_OWNER", store_id: "s1" },
      },
    });
    renderWithProviders(makeQueryClient(), {
      pathname: "/",
      state: { from: AppRoutes.storeProfile },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "o@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));
    expect(await screen.findByTestId("owner-profile")).toBeInTheDocument();
  });

  it("ignores an external or unexpected return path", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        access_token: "t",
        user: { id: "2", role: "STORE_OWNER", store_id: "s1" },
      },
    });
    renderWithProviders(makeQueryClient(), {
      pathname: "/",
      state: { from: "//evil.example/phish" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "o@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));
    expect(await screen.findByTestId("owner-dash")).toBeInTheDocument();
  });

  it("shows an error message when credentials are rejected", async () => {
    (apiClient.post as jest.Mock).mockRejectedValueOnce(
      new Error("Unauthorized"),
    );

    const queryClient = makeQueryClient();
    renderWithProviders(queryClient);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "wrong@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "wrongpassword" },
    });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/invalid email or password/i),
      ).toBeInTheDocument();
    });
  });

  it("shows required validation errors when fields are empty", async () => {
    const queryClient = makeQueryClient();
    renderWithProviders(queryClient);

    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/required/i)).toHaveLength(2);
    });

    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
