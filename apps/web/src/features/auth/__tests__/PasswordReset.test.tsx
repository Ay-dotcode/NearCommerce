import { ForgotPasswordForm } from "@/forms/ForgotPasswordForm";
import { ResetPasswordForm } from "@/forms/ResetPasswordForm";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("@nearcommerce/api", () => ({
  ...jest.requireActual("@nearcommerce/api"),
  getSupportChannels: jest.fn().mockResolvedValue({
    channels: { email: "help@example.com", phone: "+90555" },
  }),
}));

function renderAt(ui: React.ReactElement, url = "/") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ForgotPasswordForm (Password Reset Disabled)", () => {
  it("renders feature disabled notice and contact support button", () => {
    renderAt(<ForgotPasswordForm />);
    expect(screen.getByText("Feature Disabled")).toBeInTheDocument();
    expect(
      screen.getByText(/password reset via email is disabled on this mock app/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /contact support/i }),
    ).toBeInTheDocument();
  });

  it("opens support dialog when contact support is clicked", async () => {
    renderAt(<ForgotPasswordForm />);
    fireEvent.click(screen.getByRole("button", { name: /contact support/i }));
    expect(
      await screen.findByRole("dialog", { name: /password reset disabled/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/help@example\.com/i)).toBeInTheDocument();
  });
});

describe("ResetPasswordForm", () => {
  it("asks for a new link when the token is missing", () => {
    renderAt(<ResetPasswordForm />, "/reset-password");
    expect(screen.getByText("Reset link missing")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /request a new reset link/i }),
    ).toBeTruthy();
  });
});
