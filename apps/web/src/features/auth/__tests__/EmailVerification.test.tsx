import { RegisterForm } from "@/features/auth/ui/RegisterForm";
import { VerifyEmailPage } from "@/features/auth/ui/VerifyEmailPage";
import { apiClient } from "@nearcommerce/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { MemoryRouter } from "react-router-dom";

jest.mock("@nearcommerce/api", () => ({
  ...jest.requireActual("@nearcommerce/api"),
  UserRole: {
    CUSTOMER: "CUSTOMER",
    STORE_OWNER: "STORE_OWNER",
    SYSTEM_ADMIN: "SYSTEM_ADMIN",
  },
  STORE_KEY: "x-store-id",
  apiClient: { post: jest.fn(), get: jest.fn() },
}));
const post = apiClient.post as jest.Mock;

function renderAt(ui: React.ReactElement, url = "/") {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
}

beforeEach(() => jest.clearAllMocks());

describe("VerifyEmailPage", () => {
  it("verifies the token from the link exactly once, even under StrictMode", async () => {
    post.mockResolvedValue({
      data: { message: "Email verified successfully." },
    });
    renderAt(<VerifyEmailPage />, "/verify-email?token=abc123");

    expect(await screen.findByText("Email verified")).toBeTruthy();
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith("/auth/verify-email", {
      token: "abc123",
    });
    expect(screen.getByRole("link", { name: /go to login/i })).toBeTruthy();
  });

  it("explains an invalid or expired link", async () => {
    post.mockRejectedValue({
      response: {
        status: 400,
        data: { error: "Invalid or expired verification token" },
      },
    });
    renderAt(<VerifyEmailPage />, "/verify-email?token=old");

    expect(
      await screen.findByText(/invalid or expired verification token/i),
    ).toBeTruthy();
    expect(screen.getByText(/resend verification email/i)).toBeTruthy();
  });

  it("does not call the API without a token", () => {
    renderAt(<VerifyEmailPage />, "/verify-email");
    expect(screen.getByText("Verification link missing")).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });
});

describe("RegisterForm verification prompt", () => {
  it("tells the new owner to check their email and can resend the link", async () => {
    post.mockResolvedValueOnce({
      data: {
        message: "Account created. Check your email for a link to verify.",
      },
    });
    renderAt(<RegisterForm />);

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Jane Doe" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "jane@shop.test" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText(/check your email/i)).toBeTruthy();

    post.mockResolvedValueOnce({
      data: { message: "A new link has been sent." },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /resend verification email/i }),
    );
    await waitFor(() =>
      expect(post).toHaveBeenLastCalledWith("/auth/resend-verification", {
        email: "jane@shop.test",
      }),
    );
    expect(await screen.findByText("A new link has been sent.")).toBeTruthy();
  });
});
