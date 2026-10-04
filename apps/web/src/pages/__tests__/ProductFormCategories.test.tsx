import { createProduct, updateProduct } from "@/api/products";
import { ProductForm } from "@/pages/owner/ProductForm";
import type { Category } from "@/types/categories";
import type { StoreProduct } from "@/types/products";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("@/api/products", () => ({
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
}));
const createMock = createProduct as jest.Mock;
const updateMock = updateProduct as jest.Mock;

const categories: Category[] = [
  {
    id: "c1",
    name: "Groceries",
    icon_url: null,
    product_count: 3,
    subcategories: [
      { id: "s1", name: "Dairy", product_count: 2 },
      { id: "s2", name: "Bakery", product_count: 1 },
    ],
  },
  {
    id: "c2",
    name: "Pharmacy",
    icon_url: null,
    product_count: 1,
    subcategories: [{ id: "s3", name: "Vitamins", product_count: 1 }],
  },
];

const existing: StoreProduct = {
  id: "p1",
  name: "Milk",
  price: 2,
  quantity: 3,
  is_published: false,
  image_url: null,
  last_verified_at: new Date().toISOString(),
  subcategory_id: "s1",
};

const set = (label: RegExp | string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const optionNames = (select: HTMLElement) =>
  [...select.querySelectorAll("option")].map((o) => o.textContent);
const fillBasics = () => {
  set(/Product Name/, "Olive oil");
  set(/^Price/, "7.5");
  set(/Quantity in Stock/, "4");
};

describe("ProductForm category picker", () => {
  beforeEach(() => jest.resetAllMocks());

  it("is hidden when no categories are provided", () => {
    render(<ProductForm storeId="s" onSuccess={jest.fn()} />);
    expect(screen.queryByLabelText("Category")).not.toBeInTheDocument();
    render(<ProductForm storeId="s" categories={[]} onSuccess={jest.fn()} />);
    expect(screen.queryByLabelText("Category")).not.toBeInTheDocument();
  });

  it("lists categories, and subcategories only for the chosen category", () => {
    render(
      <ProductForm storeId="s" categories={categories} onSuccess={jest.fn()} />,
    );
    expect(optionNames(screen.getByLabelText("Category"))).toEqual([
      "No category",
      "Groceries",
      "Pharmacy",
    ]);
    expect(screen.getByLabelText("Subcategory")).toBeDisabled();

    set("Category", "c1");
    expect(screen.getByLabelText("Subcategory")).toBeEnabled();
    expect(optionNames(screen.getByLabelText("Subcategory"))).toEqual([
      "None",
      "Dairy",
      "Bakery",
    ]);

    set("Category", "c2");
    expect(optionNames(screen.getByLabelText("Subcategory"))).toEqual([
      "None",
      "Vitamins",
    ]);
  });

  it("resets the subcategory when the category changes", () => {
    render(
      <ProductForm storeId="s" categories={categories} onSuccess={jest.fn()} />,
    );
    set("Category", "c1");
    set("Subcategory", "s2");
    expect(screen.getByLabelText("Subcategory")).toHaveValue("s2");
    set("Category", "c2");
    expect(screen.getByLabelText("Subcategory")).toHaveValue("");
    set("Category", "");
    expect(screen.getByLabelText("Subcategory")).toBeDisabled();
  });

  describe("create", () => {
    it("sends the chosen subcategory", async () => {
      createMock.mockResolvedValue({});
      render(
        <ProductForm
          storeId="s"
          categories={categories}
          onSuccess={jest.fn()}
        />,
      );
      fillBasics();
      set("Category", "c1");
      set("Subcategory", "s2");
      fireEvent.click(screen.getByRole("button", { name: /save product/i }));
      await waitFor(() =>
        expect(createMock).toHaveBeenCalledWith(
          "s",
          expect.objectContaining({ subcategoryId: "s2" }),
        ),
      );
    });

    it("sends nothing when no category is chosen", async () => {
      createMock.mockResolvedValue({});
      render(
        <ProductForm
          storeId="s"
          categories={categories}
          onSuccess={jest.fn()}
        />,
      );
      fillBasics();
      fireEvent.click(screen.getByRole("button", { name: /save product/i }));
      await waitFor(() => expect(createMock).toHaveBeenCalled());
      expect(createMock.mock.calls[0][1].subcategoryId).toBeUndefined();
    });

    it("sends a category with no subcategory as no category", async () => {
      createMock.mockResolvedValue({});
      render(
        <ProductForm
          storeId="s"
          categories={categories}
          onSuccess={jest.fn()}
        />,
      );
      fillBasics();
      set("Category", "c1"); // category alone isn't stored; products belong to subcategories
      fireEvent.click(screen.getByRole("button", { name: /save product/i }));
      await waitFor(() => expect(createMock).toHaveBeenCalled());
      expect(createMock.mock.calls[0][1].subcategoryId).toBeUndefined();
    });
  });

  describe("edit", () => {
    it("pre-selects the product's category and subcategory", () => {
      render(
        <ProductForm
          storeId="s"
          product={existing}
          categories={categories}
          onSuccess={jest.fn()}
        />,
      );
      expect(screen.getByLabelText("Category")).toHaveValue("c1");
      expect(screen.getByLabelText("Subcategory")).toHaveValue("s1");
    });

    it("keeps the same subcategory when nothing changes", async () => {
      updateMock.mockResolvedValue({});
      render(
        <ProductForm
          storeId="s"
          product={existing}
          categories={categories}
          onSuccess={jest.fn()}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
      await waitFor(() =>
        expect(updateMock).toHaveBeenCalledWith(
          "s",
          "p1",
          expect.objectContaining({ subcategoryId: "s1" }),
        ),
      );
    });

    it("moves the product to another category", async () => {
      updateMock.mockResolvedValue({});
      render(
        <ProductForm
          storeId="s"
          product={existing}
          categories={categories}
          onSuccess={jest.fn()}
        />,
      );
      set("Category", "c2");
      set("Subcategory", "s3");
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
      await waitFor(() =>
        expect(updateMock).toHaveBeenCalledWith(
          "s",
          "p1",
          expect.objectContaining({ subcategoryId: "s3" }),
        ),
      );
    });

    it("clears the category by sending null", async () => {
      updateMock.mockResolvedValue({});
      render(
        <ProductForm
          storeId="s"
          product={existing}
          categories={categories}
          onSuccess={jest.fn()}
        />,
      );
      set("Category", "");
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
      await waitFor(() => expect(updateMock).toHaveBeenCalled());
      expect(updateMock.mock.calls[0][2].subcategoryId).toBeNull();
    });

    it("treats a deleted subcategory as uncategorised", () => {
      render(
        <ProductForm
          storeId="s"
          product={{ ...existing, subcategory_id: "gone" }}
          categories={categories}
          onSuccess={jest.fn()}
        />,
      );
      expect(screen.getByLabelText("Category")).toHaveValue("");
      expect(screen.getByLabelText("Subcategory")).toBeDisabled();
    });

    it("leaves the category alone when the picker isn't shown", async () => {
      updateMock.mockResolvedValue({});
      render(
        <ProductForm storeId="s" product={existing} onSuccess={jest.fn()} />,
      );
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
      await waitFor(() => expect(updateMock).toHaveBeenCalled());
      expect(updateMock.mock.calls[0][2]).not.toHaveProperty("subcategoryId");
    });

    it("shows a server error about the subcategory on the field", async () => {
      updateMock.mockRejectedValue({
        response: {
          status: 422,
          data: {
            error: "Referenced record does not exist",
            details: [
              {
                path: "subcategoryId",
                message: "This subcategory no longer exists",
              },
            ],
          },
        },
      });
      render(
        <ProductForm
          storeId="s"
          product={existing}
          categories={categories}
          onSuccess={jest.fn()}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
      expect(
        await screen.findByText("This subcategory no longer exists"),
      ).toBeInTheDocument();
    });
  });
});
