import Users from "@/pages/Users";
import { apiClient } from "@nearcommerce/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

jest.mock("@nearcommerce/api", () => ({
  ...jest.requireActual("@nearcommerce/api"),
  apiClient: { get: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));
jest.mock("@/session", () => ({ getCurrentUserId: () => "admin-1" }));
const get = apiClient.get as jest.Mock;
const patch = apiClient.patch as jest.Mock;
const del = apiClient.delete as jest.Mock;

const user = (over = {}) => ({
  id: "u1",
  email: "amy@shop.test",
  full_name: "Amy Owner",
  role: "STORE_OWNER",
  is_suspended: false,
  email_verified_at: "2026-09-01T10:00:00Z",
  created_at: "2026-08-01T10:00:00Z",
  updated_at: "2026-09-02T10:00:00Z",
  ...over,
});

const details = (over = {}) => ({
  ...user(),
  stores: [{ id: "s1", name: "Corner Market", is_suspended: false }],
  review_count: 3,
  list_count: 1,
  ...over,
});

function mockApi(users = [user()], detail = details()) {
  get.mockImplementation(async (url: string) =>
    /\/admin\/users\/[^/]+$/.test(url)
      ? { data: { data: detail } }
      : {
          data: {
            data: users,
            pagination: { page: 1, limit: 20, total: users.length },
          },
        },
  );
}

function renderPage() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <Users />
    </QueryClientProvider>,
  );
}

describe("Admin Users: details modal", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockApi();
  });

  it("shows skeleton rows (no loading text) while users load", () => {
    get.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    expect(
      document.querySelectorAll(
        '[aria-hidden="true"] .animate-skeleton-shimmer, [aria-hidden="true"].relative',
      ).length,
    ).toBeGreaterThan(0);
  });

  it("opens a modal with the user's details when the name is clicked", async () => {
    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: "View details: Amy Owner" }),
    );

    const dialog = await screen.findByRole("dialog", { name: "User details" });
    expect(within(dialog).getByText("Amy Owner")).toBeInTheDocument();
    expect(within(dialog).getByText("amy@shop.test")).toBeInTheDocument();
    expect(within(dialog).getByText("Store owner")).toBeInTheDocument();
    expect(within(dialog).getByText("Active")).toBeInTheDocument();
    // Email verification is switched off, so the dialog says nothing about it.
    expect(within(dialog).queryByText(/email (not )?verified/i)).toBeNull();
    expect(within(dialog).getByText("u1")).toBeInTheDocument();
    // Activity loaded from GET /admin/users/:id
    expect(
      await within(dialog).findByText("Corner Market"),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Reviews").previousElementSibling,
    ).toHaveTextContent("3");
  });

  it("also opens when anywhere else on the row is clicked", async () => {
    renderPage();
    fireEvent.click(await screen.findByText("amy@shop.test"));
    expect(
      await screen.findByRole("dialog", { name: "User details" }),
    ).toBeInTheDocument();
  });

  it("clicking a row's own Suspend button does not open the details", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Suspend" }));
    expect(
      screen.queryByRole("dialog", { name: "User details" }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole("dialog", { name: /suspend amy@shop.test/i }),
    ).toBeInTheDocument();
  });

  it("closes with the Close button, the backdrop and Escape", async () => {
    renderPage();
    const open = async () =>
      fireEvent.click(
        await screen.findByRole("button", { name: "View details: Amy Owner" }),
      );
    await open();
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Close",
      }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    await open();
    fireEvent.click(screen.getByTestId("modal-backdrop"));
    expect(screen.queryByRole("dialog")).toBeNull();
    await open();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("can suspend from the modal: details close and the reason dialog opens", async () => {
    patch.mockResolvedValue({ data: {} });
    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: "View details: Amy Owner" }),
    );
    const details = await screen.findByRole("dialog", { name: "User details" });
    fireEvent.click(within(details).getByRole("button", { name: "Suspend" }));

    const reason = await screen.findByRole("dialog", {
      name: /suspend amy@shop.test/i,
    });
    expect(screen.queryByRole("dialog", { name: "User details" })).toBeNull();
    fireEvent.change(within(reason).getByLabelText("Reason"), {
      target: { value: "Spamming" },
    });
    fireEvent.click(within(reason).getByRole("button", { name: "Suspend" }));
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/admin/users/u1/suspend", {
        is_suspended: true,
        reason: "Spamming",
      }),
    );
  });

  it("applies the same safeguards as the table: admins cannot be suspended or deleted, yourself cannot be demoted", async () => {
    const self = user({
      id: "admin-1",
      role: "SYSTEM_ADMIN",
      full_name: "Me Admin",
      email: "me@near.test",
    });
    mockApi([self], { ...details(), ...self });
    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: "View details: Me Admin" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "User details" });
    expect(within(dialog).getByText("(you)")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Suspend" }),
    ).toBeDisabled();
    expect(
      within(dialog).getByRole("button", { name: "Delete" }),
    ).toBeDisabled();
    expect(
      within(dialog).getByRole("button", { name: "Demote" }),
    ).toBeDisabled();
  });

  it("can delete from the modal", async () => {
    del.mockResolvedValue({ data: {} });
    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: "View details: Amy Owner" }),
    );
    const details = await screen.findByRole("dialog", { name: "User details" });
    fireEvent.click(within(details).getByRole("button", { name: "Delete" }));
    const reason = await screen.findByRole("dialog", {
      name: /delete amy@shop.test/i,
    });
    fireEvent.change(within(reason).getByLabelText("Reason"), {
      target: { value: "Fraud" },
    });
    fireEvent.click(
      within(reason).getByRole("button", { name: "Delete account" }),
    );
    await waitFor(() =>
      expect(del).toHaveBeenCalledWith("/admin/users/u1", {
        data: { reason: "Fraud" },
      }),
    );
  });

  it("still shows the basics if the extra details fail to load", async () => {
    get.mockImplementation(async (url: string) => {
      if (/\/admin\/users\/[^/]+$/.test(url)) throw new Error("nope");
      return {
        data: { data: [user()], pagination: { page: 1, limit: 20, total: 1 } },
      };
    });
    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: "View details: Amy Owner" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "User details" });
    expect(within(dialog).getByText("amy@shop.test")).toBeInTheDocument();
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      /couldn't load/i,
    );
  });

  describe("making someone an admin", () => {
    const openPromote = async () => {
      renderPage();
      fireEvent.click(await screen.findByRole("button", { name: "Make admin" }));
      return screen.findByRole("dialog", { name: /make amy@shop.test an admin/i });
    };

    it("asks for the admin's own password and sends it to the API", async () => {
      patch.mockResolvedValue({ data: {} });
      const dialog = await openPromote();
      const confirm = within(dialog).getByRole("button", { name: "Make admin" });
      expect(confirm).toBeDisabled();

      fireEvent.change(within(dialog).getByLabelText("Your password"), {
        target: { value: "my-admin-pass" },
      });
      fireEvent.click(confirm);

      await waitFor(() =>
        expect(patch).toHaveBeenCalledWith("/admin/users/u1/promote", {
          password: "my-admin-pass",
        }),
      );
      expect(await screen.findByRole("status")).toHaveTextContent(
        "amy@shop.test is now an admin.",
      );
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("keeps the dialog open and shows the server's message when the password is wrong", async () => {
      patch.mockRejectedValue({
        isAxiosError: true,
        response: { status: 403, data: { error: "Incorrect password." } },
      });
      const dialog = await openPromote();
      fireEvent.change(within(dialog).getByLabelText("Your password"), {
        target: { value: "nope" },
      });
      fireEvent.click(within(dialog).getByRole("button", { name: "Make admin" }));

      expect(await within(dialog).findByText("Incorrect password.")).toBeInTheDocument();
      expect(
        screen.getByRole("dialog", { name: /make amy@shop.test an admin/i }),
      ).toBeInTheDocument();
    });

    it("is offered from the details modal too", async () => {
      renderPage();
      fireEvent.click(
        await screen.findByRole("button", { name: "View details: Amy Owner" }),
      );
      const details = await screen.findByRole("dialog", { name: "User details" });
      fireEvent.click(within(details).getByRole("button", { name: "Make admin" }));
      expect(
        await screen.findByRole("dialog", { name: /make amy@shop.test an admin/i }),
      ).toBeInTheDocument();
    });

    it("is not offered for admins, and is disabled for suspended users", async () => {
      mockApi([user({ id: "a2", role: "SYSTEM_ADMIN", full_name: "Other Admin" })]);
      renderPage();
      await screen.findByText("Other Admin");
      expect(screen.queryByRole("button", { name: "Make admin" })).toBeNull();
    });

    it("disables it for a suspended user", async () => {
      mockApi([user({ is_suspended: true })]);
      renderPage();
      expect(await screen.findByRole("button", { name: "Make admin" })).toBeDisabled();
    });

    it("marks admins added by the owner and explains why they cannot be demoted by others", async () => {
      mockApi([
        user({
          id: "root-2",
          role: "SYSTEM_ADMIN",
          full_name: "Owner Admin",
          is_root_admin: true,
        }),
      ]);
      renderPage();
      await screen.findByText("Owner Admin");
      expect(screen.getByText("Owner")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Demote" })).toHaveAttribute(
        "title",
        expect.stringMatching(/platform owner/i),
      );
    });
  });
});
