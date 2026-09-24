import { clearSession } from "@/session";
import { apiClient } from "@nearcommerce/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import LoginPage from "../Login";

jest.mock("@nearcommerce/api", () => ({
  UserRole: {
    CUSTOMER: "CUSTOMER",
    STORE_OWNER: "STORE_OWNER",
    SYSTEM_ADMIN: "SYSTEM_ADMIN",
  },
  apiClient: {
    post: jest.fn(),
    defaults: { headers: { common: {} } },
  },
}));

describe("Admin LoginPage & Routing", () => {
  const makeQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

  const renderWithProviders = () => {
    const queryClient = makeQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={<div data-testid="admin-dash">Admin Dashboard</div>}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    clearSession();
  });

  it("authenticates SYSTEM_ADMIN and navigates to /dashboard", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        access_token: "mock-admin-token",
        user: { id: "1", role: "SYSTEM_ADMIN" },
      },
    });

    renderWithProviders();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "admin@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByTestId("admin-dash")).toBeInTheDocument();
    });
  });

  it("rejects non-admin role with an access denied message", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: {
        access_token: "mock-owner-token",
        user: { id: "2", role: "STORE_OWNER" },
      },
    });

    renderWithProviders();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "owner@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "secret123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/this portal is for system admins only/i),
      ).toBeInTheDocument();
    });
  });

  it("displays error on invalid credentials", async () => {
    (apiClient.post as jest.Mock).mockRejectedValueOnce(
      new Error("Unauthorized"),
    );

    renderWithProviders();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "admin@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "wrongpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/invalid email or password/i),
      ).toBeInTheDocument();
    });
  });
});
