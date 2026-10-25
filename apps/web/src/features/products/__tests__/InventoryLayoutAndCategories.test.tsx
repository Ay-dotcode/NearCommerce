import { installImageLoadStub } from "@/testing/image";
import { ToastProvider } from "@nearcommerce/ui";
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

jest.mock("@nearcommerce/api", () => {
  const actual = jest.requireActual("@nearcommerce/api");
  return {
    ...actual,
    STORE_KEY: "x-store-id",
    apiClient: {
      get: jest.fn(),
      patch: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
    },
  };
});

const get = apiClient.get as jest.Mock;
const del = apiClient.delete as jest.Mock;

const CATEGORIES = [
  {
    id: "cat-dairy",
    name: "Dairy",
    icon_url: null,
    product_count: 0,
    subcategories: [{ id: "sub-milk", name: "Milk", product_count: 0 }],
  },
  {
    id: "cat-bakery",
    name: "Bakery",
    icon_url: null,
    product_count: 0,
    subcategories: [{ id: "sub-bread", name: "Bread", product_count: 0 }],
  },
  {
    id: "cat-unused",
    name: "Garden",
    icon_url: null,
    product_count: 0,
    subcategories: [{ id: "sub-seeds", name: "Seeds", product_count: 0 }],
  },
];

const product = (o: Record<string, unknown> = {}) => ({
  id: "p1",
  name: "Whole Milk",
  price: 2.49,
  quantity: 5,
  is_published: true,
  image_url: "https://example.com/milk.jpg",
  subcategory_id: "sub-milk",
  last_verified_at: new Date().toISOString(),
  isStale: false,
  ...o,
});

const PRODUCTS = [
  product(),
  product({ id: "p2", name: "Rye Bread", subcategory_id: "sub-bread" }),
  product({ id: "p3", name: "Mystery Box", subcategory_id: null }),
];

const listResponse = (products: any[]) => ({
  data: {
    data: products,
    meta: {
      total: products.length,
      page: 1,
      pageSize: 25,
      totalPages: 1,
      summary: {
        total: 3,
        published: 3,
        drafts: 0,
        outOfStock: 0,
        stale: 0,
        categories: [
          { id: "cat-dairy", count: 1 },
          { id: "cat-bakery", count: 1 },
          { id: null, count: 1 },
        ],
      },
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

describe("Inventory layout switch and category chips", () => {
  let restoreImage: () => void;
  beforeEach(() => {
    restoreImage = installImageLoadStub();
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("x-store-id", "store-123");
    get.mockImplementation(async (url: string, config?: any) => {
      if (url === "/categories") return { data: { data: CATEGORIES } };
      const categoryId = config?.params?.categoryId;
      const sub: Record<string, string | null> = {
        "cat-dairy": "sub-milk",
        "cat-bakery": "sub-bread",
        none: null,
      };
      return listResponse(
        categoryId
          ? PRODUCTS.filter((p) => p.subcategory_id === sub[categoryId])
          : PRODUCTS,
      );
    });
  });

  afterEach(() => restoreImage());

  describe("list / grid view", () => {
    it("starts as a table and switches to a card grid and back", async () => {
      renderDashboard();
      expect(await screen.findByRole("table")).toBeInTheDocument();
      const list = screen.getByRole("button", { name: "List view" });
      const grid = screen.getByRole("button", { name: "Grid view" });
      expect(list).toHaveAttribute("aria-pressed", "true");
      expect(grid).toHaveAttribute("aria-pressed", "false");

      fireEvent.click(grid);
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      const cards = screen.getByRole("list", { name: "Your products" });
      expect(within(cards).getAllByRole("listitem")).toHaveLength(3);
      expect(grid).toHaveAttribute("aria-pressed", "true");

      fireEvent.click(list);
      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(
        screen.queryByRole("list", { name: "Your products" }),
      ).not.toBeInTheDocument();
    });

    it("does not refetch when the layout changes", async () => {
      renderDashboard();
      await screen.findByRole("table");
      const before = get.mock.calls.length;
      fireEvent.click(screen.getByRole("button", { name: "Grid view" }));
      expect(get.mock.calls.length).toBe(before);
    });

    it("remembers the choice on this device", async () => {
      const first = renderDashboard();
      await screen.findByRole("table");
      fireEvent.click(screen.getByRole("button", { name: "Grid view" }));
      first.unmount();

      renderDashboard();
      expect(
        await screen.findByRole("list", { name: "Your products" }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("still works when storage is unavailable", async () => {
      const original = Storage.prototype.setItem;
      renderDashboard();
      await screen.findByRole("table");
      Storage.prototype.setItem = () => {
        throw new Error("blocked");
      };
      try {
        fireEvent.click(screen.getByRole("button", { name: "Grid view" }));
        expect(
          screen.getByRole("list", { name: "Your products" }),
        ).toBeInTheDocument();
      } finally {
        Storage.prototype.setItem = original;
      }
    });

    it("shows name, price, badges and the same actions on a card", async () => {
      renderDashboard();
      fireEvent.click(await screen.findByRole("button", { name: "Grid view" }));
      const card = (
        await screen.findByRole("button", { name: /Edit Whole Milk/ })
      ).closest("li")!;
      expect(within(card).getByText("Whole Milk")).toBeInTheDocument();
      expect(within(card).getByText("Dairy › Milk")).toBeInTheDocument();
      expect(within(card).getByText("2.49")).toBeInTheDocument();
      expect(within(card).getByText("Published")).toBeInTheDocument();
      expect(
        within(card).getByRole("button", {
          name: /Confirm still in stock: Whole Milk/,
        }),
      ).toBeInTheDocument();
    });

    it("opens the details dialog from a card", async () => {
      renderDashboard();
      fireEvent.click(await screen.findByRole("button", { name: "Grid view" }));
      fireEvent.click(
        await screen.findByRole("button", { name: "View details: Whole Milk" }),
      );
      expect(
        await screen.findByRole("dialog", { name: "Whole Milk" }),
      ).toBeInTheDocument();
    });

    it("deletes from a card only after confirmation", async () => {
      del.mockResolvedValue({});
      renderDashboard();
      fireEvent.click(await screen.findByRole("button", { name: "Grid view" }));
      fireEvent.click(
        await screen.findByRole("button", { name: "Delete Whole Milk" }),
      );
      expect(del).not.toHaveBeenCalled();
      const dialog = await screen.findByRole("dialog");
      fireEvent.click(
        within(dialog).getByRole("button", { name: "Delete product" }),
      );
      await waitFor(() => expect(del).toHaveBeenCalledWith("/api/products/p1"));
    });

    it("shows a grid-shaped skeleton while loading in grid view", async () => {
      localStorage.setItem("nc-inventory-view", "grid");
      get.mockReturnValue(new Promise(() => {}));
      renderDashboard();
      expect(
        screen.getAllByRole("status", { name: "Inventory" }).length,
      ).toBeGreaterThan(0);
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });

  describe("category chips", () => {
    const chips = () => screen.getByRole("group", { name: "Filter by category" });

    it("shows All, each category in use with its count, and Uncategorized", async () => {
      renderDashboard();
      await screen.findByRole("table");
      const group = await screen.findByRole("group", {
        name: "Filter by category",
      });
      const names = within(group)
        .getAllByRole("button")
        .map((b) => b.textContent);
      expect(names).toEqual(["All3", "Dairy1", "Bakery1", "Uncategorized1"]);
      // "Garden" has no products, so there is nothing to filter by.
      expect(within(group).queryByText("Garden")).not.toBeInTheDocument();
      expect(within(group).getByRole("button", { name: /^All/ })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    it("filters through the API by category and returns to everything", async () => {
      renderDashboard();
      await screen.findByRole("table");
      fireEvent.click(
        await within(await screen.findByRole("group", { name: "Filter by category" })).findByRole(
          "button",
          { name: /^Dairy/ },
        ),
      );
      await waitFor(() => expect(lastListParams().categoryId).toBe("cat-dairy"));
      await waitFor(() =>
        expect(screen.queryByText("Rye Bread")).not.toBeInTheDocument(),
      );
      expect(screen.getByText("Whole Milk")).toBeInTheDocument();
      expect(
        within(chips()).getByRole("button", { name: /^Dairy/ }),
      ).toHaveAttribute("aria-pressed", "true");

      fireEvent.click(within(chips()).getByRole("button", { name: /^All/ }));
      await waitFor(() => expect(lastListParams().categoryId).toBeUndefined());
      expect(await screen.findByText("Rye Bread")).toBeInTheDocument();
    });

    it("filters products that have no category", async () => {
      renderDashboard();
      await screen.findByRole("table");
      fireEvent.click(
        await within(await screen.findByRole("group", { name: "Filter by category" })).findByRole(
          "button",
          { name: /^Uncategorized/ },
        ),
      );
      await waitFor(() => expect(lastListParams().categoryId).toBe("none"));
      expect(await screen.findByText("Mystery Box")).toBeInTheDocument();
    });

    it("goes back to page 1 when the category changes", async () => {
      renderDashboard();
      await screen.findByRole("table");
      fireEvent.click(
        await within(await screen.findByRole("group", { name: "Filter by category" })).findByRole(
          "button",
          { name: /^Bakery/ },
        ),
      );
      await waitFor(() => expect(lastListParams()).toMatchObject({ page: 1 }));
    });

    it("works in grid view too", async () => {
      renderDashboard();
      fireEvent.click(await screen.findByRole("button", { name: "Grid view" }));
      fireEvent.click(
        await within(await screen.findByRole("group", { name: "Filter by category" })).findByRole(
          "button",
          { name: /^Bakery/ },
        ),
      );
      await waitFor(() =>
        expect(lastListParams().categoryId).toBe("cat-bakery"),
      );
      const cards = await screen.findByRole("list", { name: "Your products" });
      await waitFor(() =>
        expect(within(cards).getAllByRole("listitem")).toHaveLength(1),
      );
    });

    it("counts as an active filter and is cleared by Clear filters", async () => {
      get.mockImplementation(async (url: string, config?: any) => {
        if (url === "/categories") return { data: { data: CATEGORIES } };
        return config?.params?.categoryId
          ? listResponse([])
          : listResponse(PRODUCTS);
      });
      renderDashboard();
      await screen.findByRole("table");
      fireEvent.click(
        await within(await screen.findByRole("group", { name: "Filter by category" })).findByRole(
          "button",
          { name: /^Dairy/ },
        ),
      );
      expect(
        await screen.findByText("No products match your filters"),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
      await waitFor(() => expect(lastListParams().categoryId).toBeUndefined());
      expect(await screen.findByText("Whole Milk")).toBeInTheDocument();
    });

    it("is hidden when no product has a category yet", async () => {
      get.mockImplementation(async (url: string) => {
        if (url === "/categories") return { data: { data: CATEGORIES } };
        const res = listResponse([product({ subcategory_id: null })]);
        res.data.meta.summary.categories = [{ id: null, count: 1 }];
        return res;
      });
      renderDashboard();
      await screen.findByRole("table");
      expect(
        screen.queryByRole("group", { name: "Filter by category" }),
      ).not.toBeInTheDocument();
    });

    it("is hidden when the categories cannot be loaded", async () => {
      get.mockImplementation(async (url: string) => {
        if (url === "/categories") throw new Error("down");
        return listResponse(PRODUCTS);
      });
      renderDashboard();
      expect(await screen.findByRole("table")).toBeInTheDocument();
      expect(
        screen.queryByRole("group", { name: "Filter by category" }),
      ).not.toBeInTheDocument();
    });
  });
});
