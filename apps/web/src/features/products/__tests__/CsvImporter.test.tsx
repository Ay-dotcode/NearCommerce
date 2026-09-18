import { apiClient } from "@nearcommerce/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CsvImporter } from "../ui/CsvImporter";

jest.mock("@nearcommerce/api", () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

describe("Dual-Mode CSV Importer (Task 4.2.2)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CsvImporter />
      </QueryClientProvider>,
    );
  };

  it("parses CSV and correctly assigns is_published based on image_url presence", async () => {
    (apiClient.post as jest.Mock).mockResolvedValueOnce({
      data: { success: true },
    });

    renderComponent();

    // Create a mock CSV file string with one row containing an image and one without
    const csvContent = [
      "name,price,quantity,image_url",
      "Published Item,19.99,5,https://example.com/image.jpg",
      "Draft Item,9.99,10,",
    ].join("\n");

    const file = new File([csvContent], "inventory.csv", { type: "text/csv" });
    const input = screen.getByTestId("csv-input");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith("/api/products/import", {
        products: [
          {
            name: "Published Item",
            price: 19.99,
            quantity: 5,
            image_url: "https://example.com/image.jpg",
            is_published: true, // Evaluated to true because URL exists
          },
          {
            name: "Draft Item",
            price: 9.99,
            quantity: 10,
            image_url: null,
            is_published: false, // Auto-drafted because URL is missing
          },
        ],
      });
    });
  });

  it("handles API errors gracefully", async () => {
    (apiClient.post as jest.Mock).mockRejectedValueOnce(new Error("API Error"));

    renderComponent();

    const csvContent = "name,price,quantity,image_url\nTest,1.00,1,";
    const file = new File([csvContent], "bad.csv", { type: "text/csv" });

    fireEvent.change(screen.getByTestId("csv-input"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Server error during import/i),
      ).toBeInTheDocument();
    });
  });
});
