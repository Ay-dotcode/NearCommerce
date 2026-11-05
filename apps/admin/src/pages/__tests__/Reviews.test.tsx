import Reviews from "@/pages/Reviews";
import { apiClient } from "@nearcommerce/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";

jest.mock("@nearcommerce/api", () => ({
  ...jest.requireActual("@nearcommerce/api"),
  apiClient: { get: jest.fn(), delete: jest.fn() },
}));
const get = apiClient.get as jest.Mock;

const review = (over = {}) => ({
  id: "r1",
  user_id: "u1",
  store_id: null,
  product_id: "p1",
  rating: 5,
  comment: "Great",
  created_at: "2026-10-30T10:00:00Z",
  updated_at: null,
  reviewer_name: "Amy",
  reviewer_email: "amy@shop.test",
  target_type: "PRODUCT",
  target_name: "Fresh Milk",
  store_name: "Corner Market",
  ...over,
});

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Reviews />
    </QueryClientProvider>,
  );

describe("Admin Reviews: which store sells the reviewed product", () => {
  beforeEach(() => get.mockReset());

  it("shows the store that sells a reviewed product next to the product", async () => {
    get.mockResolvedValue({
      data: { data: [review()], pagination: { page: 1, limit: 20, total: 1 } },
    });
    renderPage();
    const line = await screen.findByText(/Fresh Milk/);
    expect(line).toHaveTextContent("Product: Fresh Milk · Sold by Corner Market");
  });

  it("does not add a selling store to a review of a store (the store is the target)", async () => {
    get.mockResolvedValue({
      data: {
        data: [
          review({
            id: "r2",
            product_id: null,
            store_id: "s1",
            target_type: "STORE",
            target_name: "Corner Market",
            store_name: null,
          }),
        ],
        pagination: { page: 1, limit: 20, total: 1 },
      },
    });
    renderPage();
    const line = await screen.findByText(/Store: Corner Market/);
    expect(line).not.toHaveTextContent("Sold by");
  });
});
