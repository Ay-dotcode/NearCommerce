import { ForgotPasswordForm } from "@/features/auth/ui/ForgotPasswordForm";
import { ResetPasswordForm } from "@/features/auth/ui/ResetPasswordForm";
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

function renderAt(ui: React.ReactElement, url = "/") {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

describe("ForgotPasswordForm", () => {
  it("validates the email before sending", async () => {
    renderAt(<ForgotPasswordForm />);
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    expect(await screen.findByText("Email is required")).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "nope" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    expect(await screen.findByText("Enter a valid email address")).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });

  it("sends a normalised email and shows the same confirmation either way", async () => {
    post.mockResolvedValue({
      data: {
        message: "If that email is registered, a reset link has been sent.",
      },
    });
    renderAt(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "  Jane@Example.com " },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/auth/forgot-password", {
        email: "jane@example.com",
      }),
    );
    expect(await screen.findByText("Check your email")).toBeTruthy();
    expect(screen.getByText(/if that email is registered/i)).toBeTruthy();
  });

  it("explains rate limiting", async () => {
    post.mockRejectedValue({
      response: { status: 429, data: { error: "Too many" } },
    });
    renderAt(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "a@b.co" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /too many requests/i,
    );
  });

  it("shows a generic error for other failures", async () => {
    post.mockRejectedValue(new Error("network"));
    renderAt(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "a@b.co" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /couldn't send/i,
    );
  });
});

describe("ResetPasswordForm", () => {
  const fillAndSubmit = (password: string, confirm: string) => {
    fireEvent.change(screen.getByLabelText(/^new password/i), {
      target: { value: password },
    });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), {
      target: { value: confirm },
    });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
  };

  it("asks for a new link when the token is missing", () => {
    renderAt(<ResetPasswordForm />, "/reset-password");
    expect(screen.getByText("Reset link missing")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /request a new reset link/i }),
    ).toBeTruthy();
  });

  it("checks length and matching passwords", async () => {
    renderAt(<ResetPasswordForm />, "/reset-password?token=abc");
    fillAndSubmit("short", "short");
    expect(
      await screen.findByText("Password must be at least 8 characters"),
    ).toBeTruthy();
    fillAndSubmit("longenough1", "different1");
    expect(await screen.findByText("Passwords do not match")).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });

  it("submits the token from the URL and confirms success", async () => {
    post.mockResolvedValue({ data: { message: "ok" } });
    renderAt(<ResetPasswordForm />, "/reset-password?token=abc123");
    fillAndSubmit("brandNewPass1", "brandNewPass1");

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/auth/reset-password", {
        token: "abc123",
        new_password: "brandNewPass1",
      }),
    );
    expect(await screen.findByText("Password updated")).toBeTruthy();
    expect(screen.getByRole("link", { name: /go to login/i })).toBeTruthy();
  });

  it("offers a fresh link when the token is expired", async () => {
    post.mockRejectedValue({
      response: {
        status: 400,
        data: { error: "Invalid or expired reset token" },
      },
    });
    renderAt(<ResetPasswordForm />, "/reset-password?token=old");
    fillAndSubmit("brandNewPass1", "brandNewPass1");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /invalid or has expired/i,
    );
    expect(
      screen.getByRole("link", { name: /request a new one/i }),
    ).toBeTruthy();
  });

  it("shows a generic message for server errors", async () => {
    post.mockRejectedValue({ response: { status: 500, data: {} } });
    renderAt(<ResetPasswordForm />, "/reset-password?token=abc");
    fillAndSubmit("brandNewPass1", "brandNewPass1");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /couldn't reset/i,
    );
  });
});
