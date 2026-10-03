import { createProduct, updateProduct } from "@/api/products";
import { ProductForm } from "@/pages/owner/ProductForm";
import type { StoreProduct } from "@/types/products";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("@/api/products", () => ({ createProduct: jest.fn(), updateProduct: jest.fn() }));
const createMock = createProduct as jest.Mock;
const updateMock = updateProduct as jest.Mock;

const set = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const save = (name = /save/i) => fireEvent.click(screen.getByRole("button", { name }));

describe("ProductForm", () => {
  beforeEach(() => jest.resetAllMocks());

  describe("create", () => {
    it("creates a draft by default, without an image, and reports success", async () => {
      createMock.mockResolvedValue({});
      const onSuccess = jest.fn();
      render(<ProductForm storeId="s1" onSuccess={onSuccess} />);
      set(/Product Name/, "Olive oil");
      set(/^Price/, "7.5");
      set(/Quantity in Stock/, "4");
      save();

      await waitFor(() => expect(onSuccess).toHaveBeenCalled());
      expect(createMock).toHaveBeenCalledWith("s1", {
        name: "Olive oil", description: undefined, price: 7.5, quantity: 4, imageUrl: undefined, isPublished: false,
      });
    });

    it("validates before calling the API", async () => {
      render(<ProductForm storeId="s1" onSuccess={jest.fn()} />);
      set(/Product Name/, "x");
      set(/^Price/, "0");
      set(/Quantity in Stock/, "-1");
      save();

      expect(await screen.findByText("Enter at least 2 characters")).toBeInTheDocument();
      expect(screen.getByText("Price must be greater than zero")).toBeInTheDocument();
      expect(screen.getByText("Quantity can't be negative")).toBeInTheDocument();
      expect(createMock).not.toHaveBeenCalled();
    });

    it("rejects prices with more than two decimals and fractional quantities", async () => {
      render(<ProductForm storeId="s1" onSuccess={jest.fn()} />);
      set(/Product Name/, "Tea");
      set(/^Price/, "1.005");
      set(/Quantity in Stock/, "1.5");
      save();
      expect(await screen.findByText("Price can have at most 2 decimal places")).toBeInTheDocument();
      expect(screen.getByText("Use a whole number")).toBeInTheDocument();
    });

    it("keeps Published disabled until an image URL exists, then publishes", async () => {
      createMock.mockResolvedValue({});
      render(<ProductForm storeId="s1" onSuccess={jest.fn()} />);
      const published = screen.getByRole("checkbox", { name: /Published/ });
      expect(published).toBeDisabled();
      expect(screen.getByText(/Add an image URL to publish/)).toBeInTheDocument();

      set(/Image URL/, "https://cdn.test/a.jpg");
      expect(published).toBeEnabled();
      fireEvent.click(published);
      set(/Product Name/, "Feta");
      set(/^Price/, "4");
      set(/Quantity in Stock/, "1");
      save();
      await waitFor(() => expect(createMock).toHaveBeenCalled());
      expect(createMock.mock.calls[0][1]).toMatchObject({ imageUrl: "https://cdn.test/a.jpg", isPublished: true });
    });

    it("rejects non-http image URLs", async () => {
      render(<ProductForm storeId="s1" onSuccess={jest.fn()} />);
      set(/Product Name/, "Feta");
      set(/^Price/, "4");
      set(/Quantity in Stock/, "1");
      set(/Image URL/, "javascript:alert(1)");
      save();
      expect(await screen.findByText("Enter a valid http(s) image URL")).toBeInTheDocument();
      expect(createMock).not.toHaveBeenCalled();
    });

    it("maps server field errors onto the inputs and keeps the entered values", async () => {
      createMock.mockRejectedValue({
        response: { status: 400, data: { error: "Validation failed", details: [{ path: "price", message: "Price is too large" }] } },
      });
      const onSuccess = jest.fn();
      render(<ProductForm storeId="s1" onSuccess={onSuccess} />);
      set(/Product Name/, "Gold bar");
      set(/^Price/, "5");
      set(/Quantity in Stock/, "1");
      save();

      expect(await screen.findByText("Price is too large")).toBeInTheDocument();
      expect(screen.getByText("Validation failed")).toBeInTheDocument();
      expect(screen.getByLabelText(/Product Name/)).toHaveValue("Gold bar");
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it("clears the form after a successful save so the next product starts empty", async () => {
      createMock.mockResolvedValue({});
      render(<ProductForm storeId="s1" onSuccess={jest.fn()} />);
      set(/Product Name/, "Salt");
      set(/^Price/, "1");
      set(/Quantity in Stock/, "1");
      save();
      await waitFor(() => expect(screen.getByLabelText(/Product Name/)).toHaveValue(""));
    });
  });

  describe("edit", () => {
    const product: StoreProduct = {
      id: "p1", name: "Milk", description: "Whole", price: 2.5, quantity: 8, image_url: "https://cdn.test/m.jpg",
      is_published: true, last_verified_at: "2026-10-01T00:00:00Z",
    };

    it("prefills, labels the button Save changes and PATCHes with the store id", async () => {
      updateMock.mockResolvedValue({});
      const onSuccess = jest.fn();
      render(<ProductForm storeId="s1" product={product} onSuccess={onSuccess} />);
      expect(screen.getByLabelText(/Product Name/)).toHaveValue("Milk");
      expect(screen.getByLabelText(/^Price/)).toHaveValue(2.5);
      expect(screen.getByRole("checkbox", { name: /Published/ })).toBeChecked();

      set(/Quantity in Stock/, "9");
      save(/save changes/i);
      await waitFor(() => expect(onSuccess).toHaveBeenCalled());
      expect(updateMock).toHaveBeenCalledWith("s1", "p1", expect.objectContaining({ price: 2.5, quantity: 9, isPublished: true }));
      expect(createMock).not.toHaveBeenCalled();
    });

    it("sends null for cleared optional fields so they are really removed, and unpublishes first", async () => {
      updateMock.mockResolvedValue({});
      render(<ProductForm storeId="s1" product={product} onSuccess={jest.fn()} />);
      set(/Description/, "");
      set(/Image URL/, "");
      fireEvent.click(screen.getByRole("checkbox", { name: /Published/ })); // untick
      save(/save changes/i);
      await waitFor(() => expect(updateMock).toHaveBeenCalled());
      expect(updateMock.mock.calls[0][2]).toMatchObject({ description: null, imageUrl: null, isPublished: false });
    });

    it("blocks removing the image while the product stays published", async () => {
      render(<ProductForm storeId="s1" product={product} onSuccess={jest.fn()} />);
      set(/Image URL/, "");
      save(/save changes/i);
      expect(await screen.findByText("Add an image URL before publishing")).toBeInTheDocument();
      expect(updateMock).not.toHaveBeenCalled();
    });

    it("Cancel calls back without saving", () => {
      const onCancel = jest.fn();
      render(<ProductForm storeId="s1" product={product} onSuccess={jest.fn()} onCancel={onCancel} />);
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onCancel).toHaveBeenCalled();
      expect(updateMock).not.toHaveBeenCalled();
    });
  });
});
