import { listMyStores } from "@/api/stores";
import { StoreOwnerLayout } from "@/app/layouts/StoreOwnerLayout";
import {
  useMe,
  useResendVerification,
} from "@/features/auth/api/useEmailVerification";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

jest.mock("@/api/stores", () => ({
  listMyStores: jest.fn(),
}));
jest.mock("@/api/support", () => ({
  SUPPORT_KEY: ["support-channels"],
  getSupportChannels: jest.fn().mockResolvedValue({
    channels: { email: "help@example.com", phone: "+90555" },
    operating_hours: "24/7",
  }),
}));
jest.mock("@/features/auth/api/useEmailVerification", () => ({
  useMe: jest.fn(),
  useResendVerification: jest.fn(),
}));
const listMock = listMyStores as jest.Mock;
const meMock = useMe as jest.Mock;
const resendMock = useResendVerification as jest.Mock;

const store = (id: string, name: string, is_suspended = false) => ({
  id,
  name,
  is_suspended,
  address: "a",
  latitude: 0,
  longitude: 0,
  timezone: "UTC",
  opening_hours: {},
});

function renderLayout() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/owner/dashboard"]}>
        <Routes>
          <Route element={<StoreOwnerLayout />}>
            <Route
              path="/owner/dashboard"
              element={<div>Dashboard content</div>}
            />
            <Route path="/owner/profile" element={<div>Profile content</div>} />
          </Route>
          <Route
            path="/owner/onboarding"
            element={<div>Onboarding page</div>}
          />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("StoreOwnerLayout", () => {
  beforeEach(() => {
    localStorage.clear();
    listMock.mockReset();
    meMock.mockReturnValue({
      data: { email: "o@shop.test", email_verified: true },
    });
    resendMock.mockReturnValue({ mutate: jest.fn(), isPending: false });
  });

  it("sends an owner with no stores to onboarding and clears a stale store id", async () => {
    localStorage.setItem("x-store-id", "stale");
    listMock.mockResolvedValue([]);
    renderLayout();
    expect(await screen.findByText("Onboarding page")).toBeInTheDocument();
    expect(localStorage.getItem("x-store-id")).toBeNull();
  });

  it("selects the first store when none was remembered and persists it as X-Store-ID", async () => {
    listMock.mockResolvedValue([store("s1", "Alpha"), store("s2", "Beta")]);
    renderLayout();
    expect(await screen.findByText("Dashboard content")).toBeInTheDocument();
    expect(screen.getByLabelText("Active store")).toHaveValue("s1");
    expect(localStorage.getItem("x-store-id")).toBe("s1");
  });

  it("restores the remembered store, and replaces it when the account no longer owns it", async () => {
    localStorage.setItem("x-store-id", "s2");
    listMock.mockResolvedValue([store("s1", "Alpha"), store("s2", "Beta")]);
    const first = renderLayout();
    expect(await screen.findByLabelText("Active store")).toHaveValue("s2");
    first.unmount();

    localStorage.setItem("x-store-id", "deleted-elsewhere");
    renderLayout();
    await waitFor(() =>
      expect(screen.getByLabelText("Active store")).toHaveValue("s1"),
    );
    expect(localStorage.getItem("x-store-id")).toBe("s1");
  });

  it("switching stores updates the persisted store id", async () => {
    listMock.mockResolvedValue([store("s1", "Alpha"), store("s2", "Beta")]);
    renderLayout();
    fireEvent.change(await screen.findByLabelText("Active store"), {
      target: { value: "s2" },
    });
    expect(localStorage.getItem("x-store-id")).toBe("s2");
  });

  it("warns when the active store is suspended", async () => {
    listMock.mockResolvedValue([store("s1", "Alpha", true)]);
    renderLayout();
    expect(
      await screen.findByText(/This store is suspended and hidden from search/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Alpha (suspended)" }),
    ).toBeInTheDocument();
  });

  it("prompts an unverified owner and can resend the verification email", async () => {
    const mutate = jest.fn();
    meMock.mockReturnValue({
      data: { email: "o@shop.test", email_verified: false },
    });
    resendMock.mockReturnValue({ mutate, isPending: false });
    listMock.mockResolvedValue([store("s1", "Alpha")]);
    renderLayout();

    expect(await screen.findByText(/please verify your email/i)).toBeTruthy();
    expect(screen.getByText("o@shop.test")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: /resend verification email/i }),
    );
    expect(mutate).toHaveBeenCalledWith("o@shop.test");
  });

  it("shows no verification prompt once the email is verified", async () => {
    listMock.mockResolvedValue([store("s1", "Alpha")]);
    renderLayout();
    await screen.findByText("Dashboard content");
    expect(screen.queryByText(/please verify your email/i)).toBeNull();
  });

  it("navigates between Inventory and Store settings", async () => {
    listMock.mockResolvedValue([store("s1", "Alpha")]);
    renderLayout();
    fireEvent.click(
      await screen.findByRole("link", { name: "Store settings" }),
    );
    expect(await screen.findByText("Profile content")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Store settings" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("signs out on 401: clears the session and returns to login", async () => {
    localStorage.setItem("access_token", "t");
    listMock.mockRejectedValue({
      response: { status: 401, data: { error: "Access token expired" } },
    });
    renderLayout();
    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(localStorage.getItem("access_token")).toBeNull();
  });

  it("shows the guidance from the server when a customer opens the owner portal (403)", async () => {
    listMock.mockRejectedValue({
      response: {
        status: 403,
        data: {
          error:
            "This portal is for store owners. Shoppers can use the NearCommerce mobile app.",
          code: "OWNER_ROLE_REQUIRED",
        },
      },
    });
    renderLayout();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This portal is for store owners",
    );
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull(); // retrying cannot help
  });

  it("offers a retry on other failures and recovers", async () => {
    listMock.mockRejectedValueOnce({
      response: { status: 500, data: { error: "boom" } },
    });
    listMock.mockResolvedValueOnce([store("s1", "Alpha")]);
    renderLayout();
    expect(
      await screen.findByText("We couldn't load your stores."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Dashboard content")).toBeInTheDocument();
  });

  it("Add store goes to onboarding; Sign out clears the session", async () => {
    localStorage.setItem("access_token", "t");
    listMock.mockResolvedValue([store("s1", "Alpha")]);
    const { unmount } = renderLayout();
    fireEvent.click(await screen.findByRole("button", { name: "Add store" }));
    expect(await screen.findByText("Onboarding page")).toBeInTheDocument();
    unmount();

    renderLayout();
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(localStorage.getItem("access_token")).toBeNull();
  });
  it("opens the support dialog from the header", async () => {
    listMock.mockResolvedValue([store("s1", "Alpha")]);
    renderLayout();
    fireEvent.click(await screen.findByRole("button", { name: "Support" }));
    expect(
      await screen.findByRole("dialog", { name: "Contact support" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: "help@example.com" }),
    ).toBeInTheDocument();
  });

  it("signs out on request: clears token and store, returns to login", async () => {
    localStorage.setItem("access_token", "t");
    listMock.mockResolvedValue([store("s1", "Alpha")]);
    renderLayout();
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("x-store-id")).toBeNull();
  });
});
