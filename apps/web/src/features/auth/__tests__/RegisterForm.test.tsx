import { RegisterForm } from "@/forms/RegisterForm";
import { apiClient } from "@nearcommerce/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock persistSession so we don't touch localStorage.
jest.mock("@/features/auth/session", () => ({
  persistSession: jest.fn(),
}));

jest.mock("@nearcommerce/api", () => ({
  ...jest.requireActual("@nearcommerce/api"),
  UserRole: {
    CUSTOMER: "CUSTOMER",
    STORE_OWNER: "STORE_OWNER",
    SYSTEM_ADMIN: "SYSTEM_ADMIN",
  },
  STORE_KEY: "x-store-id",
  apiClient: { post: jest.fn() },
}));
const post = apiClient.post as jest.Mock;

// Mock navigate so we can assert routing without a real router.
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

function renderForm() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RegisterForm />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const fill = (name: string, email: string, password: string) => {
  fireEvent.change(screen.getByLabelText(/full name/i), {
    target: { value: name },
  });
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText(/password/i, { selector: "input" }), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole("button", { name: /create account/i }));
};

describe("RegisterForm", () => {
  beforeEach(() => jest.clearAllMocks());

  it("registers as STORE_OWNER, logs in and redirects to dashboard", async () => {
    // First call: register (returns 201 with message).
    post.mockResolvedValueOnce({ data: { message: "Account created. You can log in now." } });
    // Second call: automatic login.
    post.mockResolvedValueOnce({
      data: {
        access_token: "tok",
        refresh_token: "ref",
        user: { id: "u1", role: "STORE_OWNER" },
      },
    });
    renderForm();
    fill("  Jane Doe ", "jane@example.com", "password123");

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/auth/register", {
        full_name: "Jane Doe",
        email: "jane@example.com",
        password: "password123",
        role: "STORE_OWNER",
      }),
    );
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/auth/login", {
        email: "jane@example.com",
        password: "password123",
      }),
    );
    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    // No "go to login" link — user is taken straight to the dashboard.
    expect(screen.queryByRole("link", { name: /go to login/i })).toBeNull();
  });

  it("accepts a pasted email with stray spaces and sends it trimmed", async () => {
    post.mockResolvedValueOnce({ data: { message: "Account created. You can log in now." } });
    post.mockResolvedValueOnce({
      data: { access_token: "tok", user: { id: "u2", role: "STORE_OWNER" } },
    });
    renderForm();
    fill("Jane Doe", "  jane@example.com ", "password123");

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        "/auth/register",
        expect.objectContaining({ email: "jane@example.com" }),
      ),
    );
  });

  it("validates before calling the API", async () => {
    renderForm();
    fill("J", "not-an-email", "short");
    expect(
      await screen.findByText("Full name must be at least 2 characters"),
    ).toBeInTheDocument();
    expect(screen.getByText("Invalid email address")).toBeInTheDocument();
    expect(
      screen.getByText("Password must be at least 8 characters"),
    ).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it("shows the server's message, such as a duplicate email", async () => {
    post.mockRejectedValue({
      response: { data: { error: "Email already registered" } },
    });
    renderForm();
    fill("Jane Doe", "jane@example.com", "password123");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email already registered",
    );
  });
});
