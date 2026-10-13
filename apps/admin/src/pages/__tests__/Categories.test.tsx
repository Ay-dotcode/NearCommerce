import Categories from "@/pages/Categories";
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
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));
const get = apiClient.get as jest.Mock;
const post = apiClient.post as jest.Mock;
const patch = apiClient.patch as jest.Mock;
const del = apiClient.delete as jest.Mock;

const tree = () => [
  {
    id: "c1",
    name: "Groceries",
    icon_url: "https://cdn.test/g.png",
    product_count: 7,
    subcategories: [
      { id: "s1", name: "Dairy", product_count: 5 },
      { id: "s2", name: "Bakery", product_count: 2 },
    ],
  },
  {
    id: "c2",
    name: "Pharmacy",
    icon_url: null,
    product_count: 0,
    subcategories: [],
  },
];

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidate = jest.spyOn(client, "invalidateQueries");
  render(
    <QueryClientProvider client={client}>
      <Categories />
    </QueryClientProvider>,
  );
  return { invalidate };
}

const listCalls = () =>
  get.mock.calls.filter((c) => c[0] === "/admin/categories").length;
const typeInto = (label: RegExp | string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("Admin Categories page", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    get.mockResolvedValue({ data: { data: tree() } });
  });

  it("shows a skeleton of the category cards (and no loading text) while loading", async () => {
    get.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("status", { name: "Categories" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it("lists categories with product and subcategory counts", async () => {
    renderPage();
    const groceries = (
      await screen.findByRole("heading", { name: "Groceries" })
    ).closest("article")!;
    expect(
      within(groceries).getByText(/7 products · 2 subcategories/),
    ).toBeInTheDocument();
    expect(within(groceries).getByText("Dairy")).toBeInTheDocument();
    expect(within(groceries).getByText("5 products")).toBeInTheDocument();
    expect(within(groceries).getByText("2 products")).toBeInTheDocument();

    const pharmacy = screen
      .getByRole("heading", { name: "Pharmacy" })
      .closest("article")!;
    expect(
      within(pharmacy).getByText(/0 products · 0 subcategories/),
    ).toBeInTheDocument();
    expect(
      within(pharmacy).getByText("No subcategories yet."),
    ).toBeInTheDocument();
  });

  it("explains an empty catalog", async () => {
    get.mockResolvedValue({ data: { data: [] } });
    renderPage();
    expect(await screen.findByText("No categories yet")).toBeInTheDocument();
  });

  it("offers a retry when loading fails", async () => {
    get.mockRejectedValueOnce(new Error("down"));
    renderPage();
    expect(
      await screen.findByText("Unable to load categories."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("heading", { name: "Groceries" }),
    ).toBeInTheDocument();
  });

  describe("creating a category", () => {
    const open = async () => {
      renderPage();
      await screen.findByRole("heading", { name: "Groceries" });
      fireEvent.click(
        screen.getAllByRole("button", { name: "Add category" })[0],
      );
      return screen.findByRole("dialog", { name: "Add category" });
    };

    it("sends a trimmed name and no icon, then refreshes", async () => {
      post.mockResolvedValue({ data: { data: { id: "c3" } } });
      const dialog = await open();
      typeInto("Name", "  Pet care ");
      fireEvent.click(
        within(dialog).getByRole("button", { name: "Add category" }),
      );

      await waitFor(() =>
        expect(post).toHaveBeenCalledWith("/admin/categories", {
          name: "Pet care",
        }),
      );
      expect(await screen.findByRole("status")).toHaveTextContent(
        'Added "Pet care".',
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      await waitFor(() => expect(listCalls()).toBe(2));
    });

    it("only asks for a name: the icon is generated automatically", async () => {
      const dialog = await open();
      expect(within(dialog).getByLabelText("Name")).toBeInTheDocument();
      expect(within(dialog).queryByLabelText(/icon/i)).not.toBeInTheDocument();
    });

    it("validates before calling the API", async () => {
      const dialog = await open();
      typeInto("Name", "   ");
      fireEvent.click(
        within(dialog).getByRole("button", { name: "Add category" }),
      );
      expect(await screen.findByText("Name is required")).toBeInTheDocument();
      expect(post).not.toHaveBeenCalled();
      expect(screen.getByLabelText("Name")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });

    it("shows a duplicate-name error on the field and keeps the dialog open", async () => {
      post.mockRejectedValue({
        response: {
          status: 409,
          data: {
            error: "A category with this name already exists",
            details: [{ path: "name", message: "That name is already in use" }],
          },
        },
      });
      const dialog = await open();
      typeInto("Name", "Groceries");
      fireEvent.click(
        within(dialog).getByRole("button", { name: "Add category" }),
      );
      expect(
        await screen.findByText("That name is already in use"),
      ).toBeInTheDocument();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("cancel and Escape close without calling the API", async () => {
      const dialog = await open();
      fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      fireEvent.click(
        screen.getAllByRole("button", { name: "Add category" })[0],
      );
      await screen.findByRole("dialog");
      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(post).not.toHaveBeenCalled();
    });
  });

  describe("editing a category", () => {
    it("prefills the form and saves changes", async () => {
      patch.mockResolvedValue({ data: { data: {} } });
      renderPage();
      fireEvent.click(
        await screen.findByRole("button", { name: "Edit Groceries" }),
      );
      const dialog = await screen.findByRole("dialog", {
        name: "Edit category",
      });
      expect(screen.getByLabelText("Name")).toHaveValue("Groceries");

      typeInto("Name", "Food & Drink");
      fireEvent.click(
        within(dialog).getByRole("button", { name: "Save changes" }),
      );
      await waitFor(() =>
        expect(patch).toHaveBeenCalledWith("/admin/categories/c1", {
          name: "Food & Drink",
        }),
      );
      expect(await screen.findByRole("status")).toHaveTextContent(
        'Saved "Food & Drink".',
      );
    });

    it("shows a generated icon for a category without an icon URL", async () => {
      renderPage();
      const pharmacy = (await screen.findByText("Pharmacy")).closest(
        "article",
      )!;
      expect(pharmacy).toHaveTextContent("💊");
    });
  });

  describe("subcategories", () => {
    it("adds a subcategory to the right category", async () => {
      post.mockResolvedValue({ data: { data: {} } });
      renderPage();
      fireEvent.click(
        await screen.findByRole("button", {
          name: "Add subcategory to Pharmacy",
        }),
      );
      const dialog = await screen.findByRole("dialog", {
        name: "Add subcategory to Pharmacy",
      });
      typeInto("Name", "Vitamins");
      fireEvent.click(
        within(dialog).getByRole("button", { name: "Add subcategory" }),
      );
      await waitFor(() =>
        expect(post).toHaveBeenCalledWith(
          "/admin/categories/c2/subcategories",
          { name: "Vitamins" },
        ),
      );
      expect(await screen.findByRole("status")).toHaveTextContent(
        'Added "Vitamins" to Pharmacy.',
      );
    });

    it("renames a subcategory", async () => {
      patch.mockResolvedValue({ data: { data: {} } });
      renderPage();
      fireEvent.click(
        await screen.findByRole("button", { name: "Rename Dairy" }),
      );
      const dialog = await screen.findByRole("dialog", {
        name: "Rename subcategory",
      });
      expect(screen.getByLabelText("Name")).toHaveValue("Dairy");
      typeInto("Name", "Milk & cheese");
      fireEvent.click(
        within(dialog).getByRole("button", { name: "Save changes" }),
      );
      await waitFor(() =>
        expect(patch).toHaveBeenCalledWith("/admin/subcategories/s1", {
          name: "Milk & cheese",
        }),
      );
    });

    it("rejects an empty subcategory name", async () => {
      renderPage();
      fireEvent.click(
        await screen.findByRole("button", {
          name: "Add subcategory to Groceries",
        }),
      );
      const dialog = await screen.findByRole("dialog");
      fireEvent.click(
        within(dialog).getByRole("button", { name: "Add subcategory" }),
      );
      expect(await screen.findByText("Name is required")).toBeInTheDocument();
      expect(post).not.toHaveBeenCalled();
    });
  });

  describe("deleting", () => {
    it("warns what a subcategory delete does and requires a reason of 5+ characters", async () => {
      del.mockResolvedValue({ data: { message: "ok", affected_products: 5 } });
      const { invalidate } = renderPage();
      fireEvent.click(
        await screen.findByRole("button", { name: "Delete Dairy" }),
      );
      const dialog = await screen.findByRole("dialog", {
        name: 'Delete subcategory "Dairy"?',
      });
      expect(
        within(dialog).getByText(
          /5 products in "Dairy" will become uncategorised/,
        ),
      ).toBeInTheDocument();

      const confirm = within(dialog).getByRole("button", {
        name: "Delete subcategory",
      });
      expect(confirm).toBeDisabled();
      typeInto("Reason", "abc");
      expect(confirm).toBeDisabled();
      typeInto("Reason", "Merged into Milk & cheese");
      expect(confirm).toBeEnabled();
      fireEvent.click(confirm);

      await waitFor(() =>
        expect(del).toHaveBeenCalledWith("/admin/subcategories/s1", {
          data: { reason: "Merged into Milk & cheese" },
        }),
      );
      expect(await screen.findByRole("status")).toHaveTextContent(
        'Deleted "Dairy"',
      );
      await waitFor(() => expect(listCalls()).toBe(2));
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ["admin-audit-logs"],
      });
    });

    it("explains the cascade when deleting a category with content", async () => {
      del.mockResolvedValue({
        data: { message: "ok", affected_products: 7, deleted_subcategories: 2 },
      });
      renderPage();
      fireEvent.click(
        await screen.findByRole("button", { name: "Delete Groceries" }),
      );
      const dialog = await screen.findByRole("dialog", {
        name: 'Delete category "Groceries"?',
      });
      expect(
        within(dialog).getByText(
          /also deletes its 2 subcategories; 7 products will become uncategorised/,
        ),
      ).toBeInTheDocument();

      typeInto("Reason", "Retiring this category");
      fireEvent.click(
        within(dialog).getByRole("button", { name: "Delete category" }),
      );
      await waitFor(() =>
        expect(del).toHaveBeenCalledWith("/admin/categories/c1", {
          data: { reason: "Retiring this category" },
        }),
      );
    });

    it("says so plainly when the category is empty", async () => {
      renderPage();
      fireEvent.click(
        await screen.findByRole("button", { name: "Delete Pharmacy" }),
      );
      expect(
        await screen.findByText(/"Pharmacy" is empty/),
      ).toBeInTheDocument();
    });

    it("shows the server's error and keeps the dialog open if the delete fails", async () => {
      del.mockRejectedValue({
        response: { status: 500, data: { error: "Internal Server Error" } },
      });
      renderPage();
      fireEvent.click(
        await screen.findByRole("button", { name: "Delete Pharmacy" }),
      );
      const dialog = await screen.findByRole("dialog");
      typeInto("Reason", "Not needed anymore");
      fireEvent.click(
        within(dialog).getByRole("button", { name: "Delete category" }),
      );
      expect(
        await screen.findByText("Internal Server Error"),
      ).toBeInTheDocument();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("cancel deletes nothing", async () => {
      renderPage();
      fireEvent.click(
        await screen.findByRole("button", { name: "Delete Dairy" }),
      );
      const dialog = await screen.findByRole("dialog");
      fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(del).not.toHaveBeenCalled();
    });
  });

  it("lets the admin dismiss the status message", async () => {
    post.mockResolvedValue({ data: { data: {} } });
    renderPage();
    fireEvent.click(
      (await screen.findAllByRole("button", { name: "Add category" }))[0],
    );
    typeInto("Name", "Toys");
    fireEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Add category",
      }),
    );
    await screen.findByRole("status");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss message" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  describe("generating the default catalog", () => {
    it("is offered on an empty catalog and fills it in one click", async () => {
      get.mockResolvedValueOnce({ data: { data: [] } });
      post.mockResolvedValue({
        data: {
          message: "Default catalog generated.",
          categories_created: 15,
          subcategories_created: 52,
        },
      });
      get.mockResolvedValue({ data: { data: tree() } });
      renderPage();
      await screen.findByText("No categories yet");
      fireEvent.click(
        screen.getAllByRole("button", { name: "Generate default catalog" })[0],
      );
      await waitFor(() =>
        expect(post).toHaveBeenCalledWith(
          "/admin/categories/generate-defaults",
        ),
      );
      expect(await screen.findByRole("status")).toHaveTextContent(
        "Added 15 categories and 52 subcategories.",
      );
    });

    it("says so when nothing needed adding", async () => {
      post.mockResolvedValue({
        data: {
          message: "The default catalog is already in place.",
          categories_created: 0,
          subcategories_created: 0,
        },
      });
      renderPage();
      fireEvent.click(
        await screen.findByRole("button", { name: "Generate default catalog" }),
      );
      expect(await screen.findByText(/already in place/)).toBeInTheDocument();
    });

    it("shows the server's message if generating fails", async () => {
      post.mockRejectedValue({
        response: { status: 500, data: { error: "Internal Server Error" } },
      });
      renderPage();
      fireEvent.click(
        await screen.findByRole("button", { name: "Generate default catalog" }),
      );
      expect(
        await screen.findByText(/internal server error/i),
      ).toBeInTheDocument();
    });
  });
});
