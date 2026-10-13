import Dashboard from "@/pages/Dashboard";
import { apiClient } from "@nearcommerce/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("@nearcommerce/api", () => ({
  ...jest.requireActual("@nearcommerce/api"),
  apiClient: { get: jest.fn() },
}));
const get = apiClient.get as jest.Mock;

const day = (n: number) => ({
  date: `2026-10-${String(n).padStart(2, "0")}`,
  users: n % 3,
  stores: n % 2,
  reviews: 1,
});

const metrics = {
  totalActiveStores: 12,
  newRegistrations: 34,
  flaggedItems: 5,
  suspendedUsers: 2,
  totals: { users: 120, stores: 15, products: 480, reviews: 77 },
  usersByRole: { CUSTOMER: 100, STORE_OWNER: 18, SYSTEM_ADMIN: 2 },
  catalog: { published: 400, drafts: 80, outOfStock: 20, stale: 5 },
  activity: Array.from({ length: 14 }, (_, i) => day(i + 1)),
};

const logs = {
  data: [
    {
      id: "l1",
      admin_id: "a1",
      admin_email: "boss@near.test",
      action: "DELETE_REVIEW",
      target_id: "r1",
      target_type: "REVIEW",
      reason: "Abusive language",
      snapshot: null,
      created_at: new Date().toISOString(),
    },
  ],
  pagination: { page: 1, limit: 5, total: 1 },
};

function renderPage() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Admin dashboard", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    get.mockImplementation(async (url: string) =>
      url.includes("audit-logs") ? { data: logs } : { data: metrics },
    );
  });

  it("shows a skeleton and no loading text while the metrics load", () => {
    get.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(
      screen.getByRole("status", { name: "Platform metrics" }),
    ).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it("shows the headline numbers and the platform totals", async () => {
    renderPage();
    const card = (await screen.findByText("Total active stores")).closest(
      "div",
    )!.parentElement!;
    expect(within(card).getByText("12")).toBeInTheDocument();
    for (const [label, value] of [
      ["Total users", "120"],
      ["Total products", "480"],
      ["Total reviews", "77"],
      ["Suspended users", "2"],
    ]) {
      const c = screen.getByText(label).closest("div")!.parentElement!;
      expect(within(c).getByText(value)).toBeInTheDocument();
    }
  });

  it("draws the 14-day activity chart with a screen-reader table of the same data", async () => {
    renderPage();
    const chart = await screen.findByRole("img", {
      name: /new users, stores and reviews over the last 14 days/i,
    });
    expect(chart.querySelectorAll("polyline")).toHaveLength(3);
    expect(chart.querySelectorAll("circle")).toHaveLength(42);
    expect(
      screen
        .getByRole("table", { name: /daily activity/i })
        .querySelectorAll("tbody tr"),
    ).toHaveLength(14);
  });

  it("breaks users down by role and shows catalog health", async () => {
    renderPage();
    await screen.findByText("Users by role");
    expect(screen.getByText("Customers").parentElement).toHaveTextContent(
      "100",
    );
    expect(screen.getByText("Store owners").parentElement).toHaveTextContent(
      "18",
    );
    expect(screen.getByText("Published").parentElement).toHaveTextContent(
      "400",
    );
    expect(
      screen.getByText("Not verified in 30 days").parentElement,
    ).toHaveTextContent("5");
  });

  it("lists recent moderation activity with a link to the full ledger", async () => {
    renderPage();
    expect(await screen.findByText("Deleted a review")).toBeInTheDocument();
    expect(screen.getByText(/Abusive language/)).toBeInTheDocument();
    expect(screen.getByText(/boss@near.test/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view audit ledger/i }),
    ).toHaveAttribute("href", "/audit-logs");
  });

  it("says so plainly when no moderation has happened yet", async () => {
    get.mockImplementation(async (url: string) =>
      url.includes("audit-logs")
        ? { data: { data: [], pagination: { page: 1, limit: 5, total: 0 } } }
        : { data: metrics },
    );
    renderPage();
    expect(
      await screen.findByText(/no moderation actions/i),
    ).toBeInTheDocument();
  });

  it("shows an error when the metrics cannot be loaded", async () => {
    get.mockRejectedValue(new Error("boom"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /unable to load platform metrics/i,
    );
  });
});
