import { ToastProvider } from "@/components/ui";
import StoreOwnerDashboard from "@/pages/store-owner/Dashboard";
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
  STORE_KEY: "x-store-id",
  apiClient: {
    get: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const get = apiClient.get as jest.Mock;
const patch = apiClient.patch as jest.Mock;
const del = apiClient.delete as jest.Mock;

const product = (o: Record<string, unknown> = {}) => ({
  id: "p1",
  name: "Whole Milk",
  price: 2.49,
  quantity: 5,
  is_published: true,
  image_url: "https://example.com/milk.jpg",
  last_verified_at: new Date().toISOString(),
  isStale: false,
  ...o,
});

const listResponse = (
  products: any[],
  summary: Record<string, number> = {},
  meta: Record<string, unknown> = {},
) => ({
  data: {
    data: products,
    meta: {
      total: products.length,
      page: 1,
      pageSize: 25,
      totalPages: 1,
      summary: {
        total: products.length,
        published: products.length,
        drafts: 0,
        outOfStock: 0,
        stale: 0,
        ...summary,
      },
      ...meta,
    },
  },
});

const lastListParams = () => {
  const calls = get.mock.calls.filter((c) => c[0] === "/api/products");
  return calls[calls.length - 1][1].params;
};

function renderDashboard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <StoreOwnerDashboard />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe("StoreOwnerDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem("x-store-id", "store-123");
    get.mockResolvedValue(listResponse([product()]));
  });

  it("shows a loading state first", () => {
    get.mockReturnValue(new Promise(() => {}));
    renderDashboard();
    expect(screen.getByText(/loading inventory/i)).toBeInTheDocument();
  });

  it("guides a store with no store id selected", () => {
    localStorage.clear();
    renderDashboard();
    expect(screen.getByText(/no store selected/i)).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });

  it("shows a first-run empty state and opens the add-product dialog", async () => {
    get.mockResolvedValue(listResponse([], { total: 0 }));
    renderDashboard();
    expect(await screen.findByText("No products yet")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Add product" })[0]);
    const dialog = await screen.findByRole("dialog", { name: "Add product" });
    expect(within(dialog).getByLabelText(/product name/i)).toBeInTheDocument();
  });

  it("renders products with status badges and summary counts", async () => {
    get.mockResolvedValue(
      listResponse(
        [
          product(),
          product({
            id: "p2",
            name: "Sourdough",
            is_published: false,
            image_url: null,
            quantity: 0,
          }),
          product({ id: "p3", name: "Old Tea", isStale: true }),
        ],
        { total: 3, published: 2, drafts: 1, outOfStock: 1, stale: 1 },
      ),
    );
    renderDashboard();

    const milk = (
      await screen.findByRole("rowheader", { name: /Whole Milk/ })
    ).closest("tr")!;
    expect(within(milk).getByText("Published")).toBeInTheDocument();
    expect(within(milk).getByText("2.49")).toBeInTheDocument();

    const bread = screen
      .getByRole("rowheader", { name: /Sourdough/ })
      .closest("tr")!;
    expect(within(bread).getByText("Draft")).toBeInTheDocument();
    expect(within(bread).getByText("Out of stock")).toBeInTheDocument();

    const tea = screen
      .getByRole("rowheader", { name: /Old Tea/ })
      .closest("tr")!;
    expect(within(tea).getByText("Needs verification")).toBeInTheDocument();

    const tile = (name: RegExp) => screen.getByRole("button", { name });
    expect(tile(/^Total products/)).toHaveTextContent("3");
    expect(tile(/^Published/)).toHaveTextContent("2");
    expect(tile(/^Drafts/)).toHaveTextContent("1");
    expect(tile(/^Out of stock/)).toHaveTextContent("1");
    expect(tile(/^Needs verification/)).toHaveTextContent("1");
  });

  it("confirms stock for the right product and refreshes the list", async () => {
    get.mockResolvedValue(
      listResponse([product(), product({ id: "p2", name: "Eggs" })]),
    );
    patch.mockResolvedValue({ data: { success: true } });
    renderDashboard();

    fireEvent.click(
      await screen.findByRole("button", {
        name: /confirm still in stock: eggs/i,
      }),
    );

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/api/products/p2/verify"),
    );
    expect(patch).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Stock confirmed")).toBeInTheDocument();
    await waitFor(() => expect(get.mock.calls.length).toBeGreaterThan(1)); // list refetched
  });

  it("reports a failed stock confirmation", async () => {
    patch.mockRejectedValue({
      response: { status: 403, data: { error: "Not your product" } },
    });
    renderDashboard();
    fireEvent.click(
      await screen.findByRole("button", { name: /confirm still in stock/i }),
    );
    expect(await screen.findByText("Not your product")).toBeInTheDocument();
  });

  it("searches with a debounce and sends the term to the API", async () => {
    renderDashboard();
    await screen.findByText("Whole Milk");

    fireEvent.change(screen.getByLabelText("Search products"), {
      target: { value: "milk" },
    });
    await waitFor(
      () => expect(lastListParams()).toMatchObject({ q: "milk", page: 1 }),
      { timeout: 2000 },
    );
  });

  it("filters by status from the dropdown and from a summary tile", async () => {
    renderDashboard();
    await screen.findByText("Whole Milk");

    fireEvent.change(screen.getByLabelText("Filter by status"), {
      target: { value: "draft" },
    });
    await waitFor(() => expect(lastListParams().status).toBe("draft"));

    fireEvent.click(screen.getByRole("button", { name: /^Out of stock/ }));
    await waitFor(() => expect(lastListParams().status).toBe("out_of_stock"));
    expect(
      screen.getByRole("button", { name: /^Out of stock/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("offers to review stale products", async () => {
    get.mockResolvedValue(
      listResponse([product({ isStale: true })], { stale: 2 }),
    );
    renderDashboard();
    fireEvent.click(await screen.findByRole("button", { name: "Review them" }));
    await waitFor(() => expect(lastListParams().status).toBe("stale"));
  });

  it("explains an empty result and clears filters", async () => {
    renderDashboard();
    await screen.findByText("Whole Milk");

    get.mockResolvedValue(listResponse([], { total: 4 }));
    fireEvent.change(screen.getByLabelText("Filter by status"), {
      target: { value: "draft" },
    });
    expect(
      await screen.findByText("No products match your filters"),
    ).toBeInTheDocument();

    get.mockResolvedValue(listResponse([product()]));
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(await screen.findByText("Whole Milk")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by status")).toHaveValue("all");
  });

  it("paginates and disables the edges", async () => {
    get.mockImplementation(async (_url: string, cfg: any) =>
      listResponse(
        [
          product({
            id: `p${cfg.params.page}`,
            name: `Item page ${cfg.params.page}`,
          }),
        ],
        {},
        { total: 60, page: cfg.params.page, totalPages: 3 },
      ),
    );
    renderDashboard();
    await screen.findByText("Item page 1");
    expect(screen.getByText("Showing 1–25 of 60")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Item page 2")).toBeInTheDocument();
    expect(screen.getByText("Showing 26–50 of 60")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Item page 3");
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByText("Showing 51–60 of 60")).toBeInTheDocument();
  });

  it("steps back a page when the current page no longer exists", async () => {
    get.mockImplementation(async (_url: string, cfg: any) =>
      cfg.params.page === 1
        ? listResponse([product()], {}, { total: 26, totalPages: 2 })
        : listResponse([], {}, { total: 1, page: 2, totalPages: 1 }),
    );
    renderDashboard();
    await screen.findByText("Whole Milk");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(lastListParams().page).toBe(1));
    expect(await screen.findByText("Whole Milk")).toBeInTheDocument();
  });

  it("deletes a product only after confirmation", async () => {
    del.mockResolvedValue({});
    renderDashboard();
    fireEvent.click(
      await screen.findByRole("button", { name: "Delete Whole Milk" }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: "Delete this product?",
    });
    expect(del).not.toHaveBeenCalled();
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Delete product" }),
    );

    await waitFor(() => expect(del).toHaveBeenCalledWith("/api/products/p1"));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(await screen.findByText("Deleted Whole Milk")).toBeInTheDocument();
  });

  it("cancelling the delete dialog deletes nothing", async () => {
    renderDashboard();
    fireEvent.click(
      await screen.findByRole("button", { name: "Delete Whole Milk" }),
    );
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(del).not.toHaveBeenCalled();
  });

  it("shows the server's message when a delete fails", async () => {
    del.mockRejectedValue({
      response: { status: 409, data: { error: "Product is on active lists" } },
    });
    renderDashboard();
    fireEvent.click(
      await screen.findByRole("button", { name: "Delete Whole Milk" }),
    );
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Delete product",
      }),
    );
    expect(
      await screen.findByText("Product is on active lists"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("edits a product in a dialog scoped to the active store", async () => {
    patch.mockResolvedValue({
      data: { data: product({ name: "Skimmed Milk" }) },
    });
    renderDashboard();
    fireEvent.click(
      await screen.findByRole("button", { name: "Edit Whole Milk" }),
    );

    const dialog = await screen.findByRole("dialog", { name: "Edit product" });
    const name = within(dialog).getByLabelText(/product name/i);
    expect(name).toHaveValue("Whole Milk");
    fireEvent.change(name, { target: { value: "Skimmed Milk" } });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Save changes" }),
    );

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith(
        "/api/products/p1",
        expect.objectContaining({ name: "Skimmed Milk" }),
        { headers: { "x-store-id": "store-123" } },
      ),
    );
    expect(await screen.findByText("Product updated")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Edit product" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("shows an error with retry when the inventory cannot be loaded", async () => {
    get.mockRejectedValueOnce({
      response: { status: 500, data: { error: "Database is down" } },
    });
    renderDashboard();
    expect(await screen.findByText("Database is down")).toBeInTheDocument();

    get.mockResolvedValue(listResponse([product()]));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Whole Milk")).toBeInTheDocument();
  });
});
