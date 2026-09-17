import { apiClient } from "@nearcommerce/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LoginForm } from "../ui/LoginForm";

// ---------------------------------------------------------------------------
// Mock the shared Axios client so tests never hit the real network
// ---------------------------------------------------------------------------
jest.mock("@nearcommerce/api", () => ({
  apiClient: {
    post: jest.fn(),
    defaults: { headers: { common: {} } },
  },
}));

describe("LoginForm & RBAC Routing (Task 4.1)", () => {
  // Create a fresh QueryClient per test suite to avoid cross-test cache bleed
  const makeQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

  const renderWithProviders = (queryClient: QueryClient) => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<LoginForm />} />
            <Route
              path="/admin/dashboard"
              element={<div data-testid="admin-dash">Admin Dashboard</div>}
            />
            <Route
              path="/owner/dashboard"
              element={<div data-testid="owner-dash">Owner Dashboard</div>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset any headers set during a previous test
    (apiClient.defaults.headers.common as Record<string, string | undefined>)[
      "X-Store-ID"
    ] = undefined;
  });

  // ---------------------------------------------------------------------------
  // Test 1: SYSTEM_ADMIN is routed to /admin/dashboard
  // ---------------------------------------------------------------------------
  it("routes to /admin/dashboard for SYSTEM_ADMIN role", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        accessToken: "mock-admin-token",
        user: { id: "1", role: "SYSTEM_ADMIN" },
      },
    });

    const queryClient = makeQueryClient();
    renderWithProviders(queryClient);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "admin@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByTestId("admin-dash")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Test 2: STORE_OWNER is routed to /owner/dashboard and X-Store-ID is set
  // ---------------------------------------------------------------------------
  it("routes to /owner/dashboard and sets X-Store-ID for STORE_OWNER role", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        accessToken: "mock-owner-token",
        user: { id: "2", role: "STORE_OWNER", storeId: "store-123" },
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

    // Verify the store-scoping header was attached by the mutation's onSuccess
    expect(
      (apiClient.defaults.headers.common as Record<string, string>)[
        "X-Store-ID"
      ],
    ).toBe("store-123");
  });

  // ---------------------------------------------------------------------------
  // Test 3: Failed login shows an error message inline
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Test 4: Validation blocks submission with empty fields
  // ---------------------------------------------------------------------------
  it("shows required validation errors when fields are empty", async () => {
    const queryClient = makeQueryClient();
    renderWithProviders(queryClient);

    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/required/i)).toHaveLength(2);
    });

    // The API should never be called if validation fails
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});
