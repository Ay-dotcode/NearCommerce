import ReviewScreen from "@/app/review/index";
import ReviewsSection from "@/components/ReviewsSection";
import { renderWithClient } from "@/testing/render";
import { apiClient } from "@nearcommerce/api";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import Toast from "react-native-toast-message";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));
jest.mock("@nearcommerce/api", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const api = apiClient as unknown as Record<
  "get" | "post" | "patch" | "delete",
  jest.Mock
>;
const { router, useLocalSearchParams } = require("expo-router");

const review = (over: Record<string, unknown> = {}) => ({
  id: "r1",
  rating: 4,
  comment: "Friendly staff",
  created_at: "2026-01-02T10:00:00Z",
  updated_at: null,
  reviewer_name: "Jane D.",
  is_mine: false,
  ...over,
});

const page = (
  data: unknown[],
  total = data.length,
  pageNo = 1,
  limit = 10,
) => ({
  data,
  summary: {
    rating: 4.5,
    review_count: total,
    distribution: { "1": 0, "2": 0, "3": 1, "4": 2, "5": 1 },
  },
  pagination: { page: pageNo, limit, total },
});

beforeEach(() => {
  jest.clearAllMocks();
  useLocalSearchParams.mockReturnValue({});
});

describe("ReviewsSection", () => {
  const target = { storeId: "s1" };

  it("shows the average, count and reviewers", async () => {
    api.get.mockResolvedValue({ data: page([review()], 4) });
    const { findByText, getByText } = renderWithClient(
      <ReviewsSection target={target} />,
    );
    expect(await findByText("4.5")).toBeTruthy();
    expect(getByText("4 reviews")).toBeTruthy();
    expect(getByText("Friendly staff")).toBeTruthy();
    expect(getByText(/Jane D\./)).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith("/reviews", {
      params: { store_id: "s1", page: 1, limit: 10 },
    });
  });

  it("queries products by product_id", async () => {
    api.get.mockResolvedValue({ data: page([review()]) });
    const { findByText } = renderWithClient(
      <ReviewsSection target={{ productId: "p1" }} />,
    );
    await findByText("Friendly staff");
    expect(api.get).toHaveBeenCalledWith("/reviews", {
      params: { product_id: "p1", page: 1, limit: 10 },
    });
  });

  it("invites the first review when there are none", async () => {
    api.get.mockResolvedValue({ data: page([], 0) });
    const { findByText } = renderWithClient(<ReviewsSection target={target} />);
    expect(await findByText(/No reviews yet/)).toBeTruthy();
    fireEvent.press(await findByText("Write a review"));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/review",
      params: { storeId: "s1" },
    });
  });

  it("lets the author edit and hides Write a review", async () => {
    api.get.mockResolvedValue({
      data: page([review({ is_mine: true, updated_at: "2026-01-03" })], 1),
    });
    const { findByLabelText, queryByText, getByText } = renderWithClient(
      <ReviewsSection target={target} />,
    );
    fireEvent.press(await findByLabelText("Edit your review"));
    expect(queryByText("Write a review")).toBeNull();
    expect(getByText(/\(edited\)/)).toBeTruthy();
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/review",
      params: {
        storeId: "s1",
        reviewId: "r1",
        rating: "4",
        comment: "Friendly staff",
      },
    });
  });

  it("does not offer edit or delete on other people's reviews", async () => {
    api.get.mockResolvedValue({ data: page([review()], 1) });
    const { findByText, queryByLabelText } = renderWithClient(
      <ReviewsSection target={target} />,
    );
    await findByText("Friendly staff");
    expect(queryByLabelText("Edit your review")).toBeNull();
    expect(queryByLabelText("Delete your review")).toBeNull();
  });

  it("deletes after confirmation", async () => {
    api.get.mockResolvedValue({
      data: page([review({ is_mine: true })], 1),
    });
    api.delete.mockResolvedValue({});
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const { findByLabelText } = renderWithClient(
      <ReviewsSection target={target} />,
    );
    fireEvent.press(await findByLabelText("Delete your review"));
    expect(api.delete).not.toHaveBeenCalled();

    const buttons = alert.mock.calls[0][2]!;
    buttons.find((b) => b.text === "Delete")!.onPress!();
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/reviews/r1"));
    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ text1: "Review deleted" }),
      ),
    );
    alert.mockRestore();
  });

  it("loads further pages", async () => {
    api.get
      .mockResolvedValueOnce({ data: page([review()], 12) })
      .mockResolvedValueOnce({
        data: page(
          [
            review({
              id: "r2",
              comment: "Great prices",
              reviewer_name: "Sam K.",
            }),
          ],
          12,
          2,
        ),
      });
    const { findByText, getByText } = renderWithClient(
      <ReviewsSection target={target} />,
    );
    fireEvent.press(await findByText("Show more (11 more)"));
    expect(await findByText("Great prices")).toBeTruthy();
    expect(getByText("Friendly staff")).toBeTruthy();
    expect(api.get).toHaveBeenLastCalledWith("/reviews", {
      params: { store_id: "s1", page: 2, limit: 10 },
    });
  });

  it("offers a retry when loading fails", async () => {
    api.get.mockRejectedValue(new Error("down"));
    const { findByText } = renderWithClient(<ReviewsSection target={target} />);
    expect(await findByText("Couldn't load reviews.")).toBeTruthy();
    expect(await findByText("Try again")).toBeTruthy();
  });
});

describe("ReviewScreen", () => {
  it("requires a rating before submitting", async () => {
    useLocalSearchParams.mockReturnValue({ storeId: "s1" });
    const { getByText, findByText } = renderWithClient(<ReviewScreen />);
    fireEvent.press(getByText("Submit review"));
    expect(await findByText(/Choose a rating/)).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("creates a store review with storeId", async () => {
    useLocalSearchParams.mockReturnValue({ storeId: "s1" });
    api.post.mockResolvedValue({ data: {} });
    const { getByText, getByLabelText } = renderWithClient(<ReviewScreen />);
    fireEvent.press(getByLabelText("5 stars"));
    fireEvent.changeText(getByLabelText("Review comment"), "  Lovely  ");
    fireEvent.press(getByText("Submit review"));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/reviews", {
        storeId: "s1",
        rating: 5,
        comment: "Lovely",
      }),
    );
    await waitFor(() => expect(router.back).toHaveBeenCalled());
  });

  it("creates a product review with productId and no empty comment", async () => {
    useLocalSearchParams.mockReturnValue({ productId: "p1" });
    api.post.mockResolvedValue({ data: {} });
    const { getByText, getByLabelText } = renderWithClient(<ReviewScreen />);
    fireEvent.press(getByLabelText("3 stars"));
    fireEvent.press(getByText("Submit review"));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/reviews", {
        productId: "p1",
        rating: 3,
        comment: undefined,
      }),
    );
  });

  it("edits an existing review and can clear the comment", async () => {
    useLocalSearchParams.mockReturnValue({
      storeId: "s1",
      reviewId: "r1",
      rating: "4",
      comment: "Old",
    });
    api.patch.mockResolvedValue({ data: {} });
    const { getByText, getByLabelText } = renderWithClient(<ReviewScreen />);
    expect(getByText("Edit your review")).toBeTruthy();
    fireEvent.changeText(getByLabelText("Review comment"), "");
    fireEvent.press(getByLabelText("2 stars"));
    fireEvent.press(getByText("Save changes"));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/reviews/r1", {
        rating: 2,
        comment: null,
      }),
    );
    expect(api.post).not.toHaveBeenCalled();
  });

  it.each([
    [403, /verify your email/i],
    [409, /already reviewed/i],
  ])("explains a %s response", async (status, message) => {
    useLocalSearchParams.mockReturnValue({ storeId: "s1" });
    api.post.mockRejectedValue({ response: { status, data: { error: "x" } } });
    const { getByText, getByLabelText, findByText } = renderWithClient(
      <ReviewScreen />,
    );
    fireEvent.press(getByLabelText("4 stars"));
    fireEvent.press(getByText("Submit review"));
    expect(await findByText(message)).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
  });

  it("shows the server's message for other errors", async () => {
    useLocalSearchParams.mockReturnValue({ storeId: "s1" });
    api.post.mockRejectedValue({
      response: { status: 400, data: { error: "Comment too long" } },
    });
    const { getByText, getByLabelText, findByText } = renderWithClient(
      <ReviewScreen />,
    );
    fireEvent.press(getByLabelText("4 stars"));
    fireEvent.press(getByText("Submit review"));
    expect(await findByText("Comment too long")).toBeTruthy();
  });
});
