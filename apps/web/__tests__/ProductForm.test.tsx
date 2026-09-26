import { apiClient } from "@nearcommerce/api";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { ProductForm } from "../src/pages/owner/ProductForm";

// Mock shared API client
jest.mock("@nearcommerce/api", () => ({
  apiClient: { post: jest.fn() },
}));

describe("ProductForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("submits valid product data to the API", async () => {
    const onSuccess = jest.fn();
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { success: true },
    });

    const { getByLabelText, getByText } = render(
      <ProductForm storeId="store-123" onSuccess={onSuccess} />,
    );

    fireEvent.change(getByLabelText(/Product Name/i), {
      target: { value: "Mechanical Keyboard" },
    });
    fireEvent.change(getByLabelText(/Price/i), {
      target: { value: "129.99" },
    });
    fireEvent.change(getByLabelText(/Quantity in Stock/i), {
      target: { value: "15" },
    });

    fireEvent.click(getByText(/Save Product/i));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        "/stores/store-123/products",
        expect.objectContaining({
          name: "Mechanical Keyboard",
          price: 129.99,
          quantity: 15,
        }),
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
