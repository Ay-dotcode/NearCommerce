import { createProduct } from "@/api/products";
import { ProductForm } from "@/forms/ProductForm";
import { clearImageCheckCache } from "@/helpers/image";
import { installImageLoadStub } from "@/testing/image";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("@/api/products", () => ({
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
}));
const createMock = createProduct as jest.Mock;

const set = (label: RegExp | string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

function fillBasics() {
  set(/Product Name/, "Olive oil");
  set(/^Price/, "7.5");
  set(/Quantity in Stock/, "4");
}

describe("ProductForm image URL check", () => {
  let restore: () => void;
  beforeEach(() => {
    jest.resetAllMocks();
    clearImageCheckCache();
    restore = installImageLoadStub();
  });
  afterEach(() => restore());

  it("refuses a link that does not lead to an image and keeps the form open", async () => {
    const onSuccess = jest.fn();
    render(<ProductForm storeId="s1" onSuccess={onSuccess} />);
    fillBasics();
    set("Image URL", "https://example.com/broken-link");
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(
      await screen.findByText(/link doesn't lead to an image/i),
    ).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("flags a bad link as soon as typing pauses, and blocks publishing it", async () => {
    render(<ProductForm storeId="s1" onSuccess={jest.fn()} />);
    set("Image URL", "https://example.com/broken-link");
    expect(
      await screen.findByText(/link doesn't lead to an image/i, undefined, {
        timeout: 3000,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /published/i })).toBeDisabled();
  });

  it("saves when the link really is an image", async () => {
    createMock.mockResolvedValue({});
    const onSuccess = jest.fn();
    render(<ProductForm storeId="s1" onSuccess={onSuccess} />);
    fillBasics();
    set("Image URL", "https://cdn.example.com/oil.jpg");
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(createMock).toHaveBeenCalledWith(
      "s1",
      expect.objectContaining({ imageUrl: "https://cdn.example.com/oil.jpg" }),
    );
  });
});
