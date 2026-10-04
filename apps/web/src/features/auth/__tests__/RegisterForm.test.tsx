import { RegisterForm } from "@/features/auth/ui/RegisterForm";
import { apiClient } from "@nearcommerce/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("@nearcommerce/api", () => ({
  UserRole: {
    CUSTOMER: "CUSTOMER",
    STORE_OWNER: "STORE_OWNER",
    SYSTEM_ADMIN: "SYSTEM_ADMIN",
  },
  STORE_KEY: "x-store-id",
  apiClient: { post: jest.fn() },
}));
const post = apiClient.post as jest.Mock;

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
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole("button", { name: /create account/i }));
};

describe("RegisterForm", () => {
  beforeEach(() => jest.clearAllMocks());

  it("registers the account as a STORE_OWNER", async () => {
    post.mockResolvedValue({ data: { message: "Welcome aboard" } });
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
    expect(await screen.findByText("Welcome aboard")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /go to login/i }),
    ).toBeInTheDocument();
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
