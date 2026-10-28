import { ForgotPasswordForm } from "@/forms/ForgotPasswordForm";
import { LoginForm } from "@/forms/LoginForm";
import { RegisterForm } from "@/forms/RegisterForm";
import { ResetPasswordForm } from "@/forms/ResetPasswordForm";
import { apiClient } from "@nearcommerce/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("@nearcommerce/api", () => ({
  ...jest.requireActual("@nearcommerce/api"),
  UserRole: {
    CUSTOMER: "CUSTOMER",
    STORE_OWNER: "STORE_OWNER",
    SYSTEM_ADMIN: "SYSTEM_ADMIN",
  },
  STORE_KEY: "x-store-id",
  getSupportChannels: jest.fn().mockResolvedValue({ channels: {} }),
  apiClient: { post: jest.fn(), defaults: { headers: { common: {} } } },
}));
const post = apiClient.post as jest.Mock;

function renderAt(ui: React.ReactElement, url = "/") {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const type = (label: RegExp | string, value: string) =>
  fireEvent.change(screen.getByLabelText(label, { selector: "input" }), {
    target: { value },
  });

// A request that stays pending until the test lets it finish.
function pendingRequest() {
  let settle!: (outcome: { ok: boolean }) => void;
  post.mockReturnValue(
    new Promise((resolve, reject) => {
      settle = ({ ok }) =>
        ok
          ? resolve({ data: { message: "done" } })
          : reject(Object.assign(new Error("no"), { isAxiosError: true }));
    }),
  );
  return (ok = true) => settle({ ok });
}

const textInputs = () =>
  screen
    .getAllByRole("textbox", { hidden: false })
    .concat(
      Array.from(document.querySelectorAll<HTMLInputElement>("input")).filter(
        (i) => i.type === "password",
      ),
    );

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe("forms lock their inputs while the request is running", () => {
  it("login", async () => {
    const finish = pendingRequest();
    renderAt(<LoginForm />);
    type(/^email/i, "jane@example.com");
    type(/^password/i, "secret123");
    expect(screen.getByLabelText(/^email/i)).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() =>
      expect(screen.getByLabelText(/^email/i)).toBeDisabled(),
    );
    expect(
      screen.getByLabelText(/^password/i, { selector: "input" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /show password/i }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /logging in/i })).toBeDisabled();

    finish(false);
    await waitFor(() => expect(screen.getByLabelText(/^email/i)).toBeEnabled());
    expect(screen.getByLabelText(/^email/i)).toHaveValue("jane@example.com");
  });

  it("register", async () => {
    const finish = pendingRequest();
    renderAt(<RegisterForm />);
    type(/full name/i, "Jane Doe");
    type(/^email/i, "jane@example.com");
    type(/^password/i, "password123");
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByLabelText(/full name/i)).toBeDisabled(),
    );
    expect(screen.getByLabelText(/^email/i)).toBeDisabled();
    expect(
      screen.getByLabelText(/^password/i, { selector: "input" }),
    ).toBeDisabled();

    finish(false);
    await waitFor(() => expect(screen.getByLabelText(/^email/i)).toBeEnabled());
  });

  it("forgot password (disabled on mock app)", () => {
    renderAt(<ForgotPasswordForm />);
    expect(screen.getByText("Feature Disabled")).toBeInTheDocument();
  });

  it("reset password", async () => {
    const finish = pendingRequest();
    renderAt(<ResetPasswordForm />, "/reset-password?token=abc");
    type(/^new password/i, "brandNewPass1");
    type(/confirm new password/i, "brandNewPass1");
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() =>
      expect(
        screen.getByLabelText(/^new password/i, { selector: "input" }),
      ).toBeDisabled(),
    );
    expect(
      screen.getByLabelText(/confirm new password/i, { selector: "input" }),
    ).toBeDisabled();
    finish(false);
    await waitFor(() =>
      expect(
        screen.getByLabelText(/^new password/i, { selector: "input" }),
      ).toBeEnabled(),
    );
  });

  it("never disables anything before the form is submitted", () => {
    renderAt(<LoginForm />);
    for (const input of textInputs()) expect(input).toBeEnabled();
  });
});

describe("show / hide password", () => {
  it("login has one working toggle", () => {
    renderAt(<LoginForm />);
    const input = screen.getByLabelText(/^password/i, { selector: "input" });
    expect(
      screen.getAllByRole("button", { name: /show password/i }),
    ).toHaveLength(1);
    expect(input).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: /show password/i }));
    expect(input).toHaveAttribute("type", "text");
  });

  it("register has a toggle", () => {
    renderAt(<RegisterForm />);
    fireEvent.click(screen.getByRole("button", { name: /show password/i }));
    expect(
      screen.getByLabelText(/^password/i, { selector: "input" }),
    ).toHaveAttribute("type", "text");
  });

  it("reset has one toggle per password field, working independently", () => {
    renderAt(<ResetPasswordForm />, "/reset-password?token=abc");
    const toggles = screen.getAllByRole("button", { name: /show password/i });
    expect(toggles).toHaveLength(2);
    fireEvent.click(toggles[0]);
    expect(
      screen.getByLabelText(/^new password/i, { selector: "input" }),
    ).toHaveAttribute("type", "text");
    expect(
      screen.getByLabelText(/confirm new password/i, { selector: "input" }),
    ).toHaveAttribute("type", "password");
  });
});
