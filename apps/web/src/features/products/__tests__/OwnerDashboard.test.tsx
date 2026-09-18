import { apiClient } from "@nearcommerce/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OwnerDashboard } from "../ui/OwnerDashboard";

jest.mock("@nearcommerce/api", () => ({
  apiClient: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

describe("OwnerDashboard (Task 4.2.1)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    jest.clearAllMocks();
  });

  const renderDashboard = () => {
    render(
      <QueryClientProvider client={queryClient}>
        <OwnerDashboard />
      </QueryClientProvider>,
    );
  };

  it("renders loading state initially", () => {
    (apiClient.get as jest.Mock).mockReturnValue(new Promise(() => {})); // Never resolves
    renderDashboard();
    expect(screen.getByText(/loading inventory/i)).toBeInTheDocument();
  });

  it("renders empty state when no products exist", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({ data: { data: [] } });
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/no products found/i)).toBeInTheDocument();
    });
  });

  it("renders products and handles stock confirmation", async () => {
    const mockProducts = [
      {
        id: "prod-1",
        name: "Test Item",
        quantity: 5,
        is_published: true,
        last_verified_at: "2026-09-01T00:00:00.000Z",
      },
    ];

    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: { data: mockProducts },
    });
    (apiClient.patch as jest.Mock).mockResolvedValueOnce({
      data: { success: true },
    });

    renderDashboard();

    // Verify product renders
    await waitFor(() => {
      expect(screen.getByText("Test Item")).toBeInTheDocument();
      expect(screen.getByText(/Quantity:/)).toHaveTextContent("5");
    });

    // Click confirm stock button
    const confirmBtn = screen.getByRole("button", {
      name: /confirm still in stock/i,
    });
    fireEvent.click(confirmBtn);

    // Verify mutation was called with correct ID
    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith(
        "/api/products/prod-1/verify",
      );
    });
  });
});
