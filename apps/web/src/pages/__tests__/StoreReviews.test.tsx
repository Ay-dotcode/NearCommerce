import { listProductReviews } from "@/api/reviews";
import StoreReviews from "@/pages/store-owner/Reviews";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

jest.mock("@/api/reviews", () => ({ listProductReviews: jest.fn() }));
const listMock = listProductReviews as jest.Mock;

const review = (n: number, over: object = {}) => ({
  id: `r${n}`,
  rating: 4,
  comment: `Comment ${n}`,
  created_at: "2026-10-30T10:00:00Z",
  updated_at: null,
  product_id: `p${n}`,
  product_name: `Product ${n}`,
  reviewer_name: "Alice W.",
  ...over,
});

const response = (
  reviews: unknown[],
  total = reviews.length,
  over: object = {},
) => ({
  data: reviews,
  summary: {
    rating: 4,
    review_count: total,
    distribution: { "1": 0, "2": 0, "3": 1, "4": 1, "5": 1 },
  },
  pagination: { page: 1, limit: 10, total },
  ...over,
});

const renderPage = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <StoreReviews />
    </QueryClientProvider>,
  );

describe("Store owner: reviews of my products", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("x-store-id", "store-1");
    listMock.mockReset();
  });

  it("asks for the reviews of the open store", async () => {
    listMock.mockResolvedValue(response([review(1)]));
    renderPage();
    await screen.findByText("Product 1");
    expect(listMock).toHaveBeenCalledWith("store-1", 1, 10);
  });

  it("shows each review with its product, stars, comment, reviewer and date", async () => {
    listMock.mockResolvedValue(
      response([
        review(1, {
          rating: 5,
          comment: "Very fresh",
          updated_at: "2026-10-31T10:00:00Z",
        }),
        review(2, { rating: 2, comment: null, reviewer_name: "Bob" }),
      ]),
    );
    renderPage();

    const list = await screen.findByRole("list", { name: "Product reviews" });
    const [first, second] = within(list).getAllByRole("listitem");

    expect(within(first).getByText("Product 1")).toBeInTheDocument();
    expect(
      within(first).getByRole("img", { name: "5 out of 5 stars" }),
    ).toBeInTheDocument();
    expect(within(first).getByText("Very fresh")).toBeInTheDocument();
    expect(within(first).getByText(/Alice W\./)).toBeInTheDocument();
    expect(within(first).getByText(/edited/)).toBeInTheDocument();

    expect(
      within(second).getByRole("img", { name: "2 out of 5 stars" }),
    ).toBeInTheDocument();
    expect(within(second).getByText("No comment")).toBeInTheDocument();
    expect(within(second).queryByText(/edited/)).toBeNull();
  });

  it("summarises the rating", async () => {
    listMock.mockResolvedValue(response([review(1), review(2), review(3)]));
    renderPage();
    await screen.findByText("4.0");
    expect(screen.getByText("3 reviews")).toBeInTheDocument();
    const breakdown = screen.getByLabelText("Ratings breakdown");
    expect(within(breakdown).getByText("5 ★")).toBeInTheDocument();
  });

  it("says so when no product has been reviewed yet", async () => {
    listMock.mockResolvedValue(
      response([], 0, {
        summary: {
          rating: 0,
          review_count: 0,
          distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
        },
      }),
    );
    renderPage();
    expect(await screen.findByText("No reviews yet")).toBeInTheDocument();
    expect(screen.queryByLabelText("Ratings breakdown")).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
  });

  it("explains a failure instead of showing an empty page", async () => {
    listMock.mockRejectedValue({
      response: { status: 500, data: { error: "Internal Server Error" } },
    });
    renderPage();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("No reviews yet")).toBeNull();
  });

  it("pages through the reviews", async () => {
    listMock.mockImplementation((_s: string, page: number) =>
      Promise.resolve(
        response([review(page * 10)], 25, {
          pagination: { page, limit: 10, total: 25 },
        }),
      ),
    );
    renderPage();
    await screen.findByText("Product 10");
    expect(screen.getByText("Showing 1–10 of 25")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Product 20");
    expect(listMock).toHaveBeenLastCalledWith("store-1", 2, 10);
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  });

  it("does not show the store's own name or any email (the owner knows their store)", async () => {
    listMock.mockResolvedValue(response([review(1)]));
    const { container } = renderPage();
    await screen.findByText("Product 1");
    await waitFor(() => expect(container.textContent).not.toMatch(/@/));
    expect(container.textContent).not.toMatch(/Sold by/i);
  });
});
