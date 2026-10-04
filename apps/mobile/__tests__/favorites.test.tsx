import FavoritesScreen from "@/app/(tabs)/favorites";
import FavoriteButton from "@/components/FavoriteButton";
import { renderWithClient, serveGet } from "@/testing/render";
import { apiClient } from "@nearcommerce/api";
import { fireEvent, waitFor } from "@testing-library/react-native";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));
jest.mock("@nearcommerce/api", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

const get = apiClient.get as jest.Mock;
const post = apiClient.post as jest.Mock;
const del = apiClient.delete as jest.Mock;

const storeFav = {
  id: "fav-1",
  type: "store",
  store_id: "s1",
  product_id: null,
  created_at: "2026-01-01",
  store: {
    id: "s1",
    name: "Corner Shop",
    is_open: true,
    rating: 4.2,
    review_count: 3,
  },
};
const productFav = {
  id: "fav-2",
  type: "product",
  store_id: null,
  product_id: "p1",
  created_at: "2026-01-02",
  product: {
    id: "p1",
    name: "Milk",
    price: 2.5,
    in_stock: false,
    store_id: "s1",
    store_name: "Corner Shop",
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  post.mockResolvedValue({ data: {} });
  del.mockResolvedValue({});
});

describe("FavoriteButton", () => {
  it("adds a store to favorites when it is not saved", async () => {
    serveGet(get, { "/favorites": { data: [] } });
    const { findByLabelText } = renderWithClient(
      <FavoriteButton storeId="s1" />,
    );
    fireEvent.press(await findByLabelText("Add to favorites"));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/favorites", { store_id: "s1" }),
    );
  });

  it("removes the favorite by id when it is already saved", async () => {
    serveGet(get, { "/favorites": { data: [storeFav] } });
    const { findByLabelText } = renderWithClient(
      <FavoriteButton storeId="s1" />,
    );
    fireEvent.press(await findByLabelText("Remove from favorites"));
    await waitFor(() => expect(del).toHaveBeenCalledWith("/favorites/fav-1"));
  });

  it("treats a 404 on removal as success", async () => {
    serveGet(get, { "/favorites": { data: [productFav] } });
    del.mockRejectedValue({ response: { status: 404 } });
    const { Toast } = { Toast: require("react-native-toast-message").default };
    const { findByLabelText } = renderWithClient(
      <FavoriteButton productId="p1" />,
    );
    fireEvent.press(await findByLabelText("Remove from favorites"));
    await waitFor(() => expect(del).toHaveBeenCalled());
    expect(Toast.show).not.toHaveBeenCalled();
  });

  it("matches products, not stores, when given a product id", async () => {
    serveGet(get, { "/favorites": { data: [storeFav] } });
    const { findByLabelText } = renderWithClient(
      <FavoriteButton productId="p1" />,
    );
    expect(await findByLabelText("Add to favorites")).toBeTruthy();
  });
});

describe("FavoritesScreen", () => {
  it("lists stores and products with details", async () => {
    serveGet(get, { "/favorites": { data: [storeFav, productFav] } });
    const { findByText, getByText } = renderWithClient(<FavoritesScreen />);
    expect(await findByText("Corner Shop")).toBeTruthy();
    expect(getByText("Open now · ★ 4.2")).toBeTruthy();
    expect(getByText("Milk")).toBeTruthy();
    expect(getByText("$2.50 · Corner Shop · Out of stock")).toBeTruthy();
  });

  it("filters by type", async () => {
    serveGet(get, { "/favorites": { data: [storeFav, productFav] } });
    const { findByText, getByText, queryByText } = renderWithClient(
      <FavoritesScreen />,
    );
    await findByText("Milk");
    fireEvent.press(getByText("Stores"));
    expect(queryByText("Milk")).toBeNull();
    expect(getByText("Corner Shop")).toBeTruthy();
  });

  it("removes a favorite", async () => {
    serveGet(get, { "/favorites": { data: [productFav] } });
    const { findByLabelText } = renderWithClient(<FavoritesScreen />);
    fireEvent.press(await findByLabelText("Remove Milk from favorites"));
    await waitFor(() => expect(del).toHaveBeenCalledWith("/favorites/fav-2"));
  });

  it("shows an empty state", async () => {
    serveGet(get, { "/favorites": { data: [] } });
    const { findByText } = renderWithClient(<FavoritesScreen />);
    expect(await findByText(/haven't saved any favorites/)).toBeTruthy();
  });

  it("offers a retry when loading fails", async () => {
    get.mockRejectedValue(new Error("down"));
    const { findByText } = renderWithClient(<FavoritesScreen />);
    expect(await findByText("Couldn't load your favorites.")).toBeTruthy();
    expect(await findByText("Try again")).toBeTruthy();
  });
});
