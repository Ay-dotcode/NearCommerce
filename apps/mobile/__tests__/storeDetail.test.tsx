import StoreDetailScreen from "@/app/store/[id]";
import { renderWithClient, serveGet } from "@/testing/render";
import { openNativeMaps } from "@/utils/maps";
import { apiClient } from "@nearcommerce/api";
import { fireEvent, waitFor } from "@testing-library/react-native";

// Mock vector icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

// Mock safe area context
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock expo-router
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "store-123" }),
  router: { push: jest.fn() },
}));

// Mock shared API client
jest.mock("@nearcommerce/api", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/utils/maps", () => ({ openNativeMaps: jest.fn() }));

jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));

describe("StoreDetailScreen", () => {
  it("fetches and displays store details and inventory", async () => {
    serveGet(apiClient.get as jest.Mock, {
      "/stores/store-123": {
        data: {
          id: "store-123",
          name: "Local Tech Shop",
          address: "123 Main St",
          isOpen: true,
          rating: 4.5,
          review_count: 12,
          products: [
            {
              id: "prod-1",
              name: "USB-C Cable",
              price: 15.99,
              quantity: 10,
              in_stock: true,
            },
            {
              id: "prod-2",
              name: "Charger",
              price: 20,
              quantity: 0,
              in_stock: false,
            },
          ],
        },
      },
      "/favorites": { data: [] },
      "/reviews": {
        data: [],
        summary: { rating: 0, review_count: 0, distribution: {} },
        pagination: { page: 1, limit: 10, total: 0 },
      },
    });

    const { getByText, getByLabelText, findByText } = renderWithClient(
      <StoreDetailScreen />,
    );

    await waitFor(() => {
      expect(getByText("Local Tech Shop")).toBeTruthy();
      expect(getByText("123 Main St")).toBeTruthy();
      expect(getByText("USB-C Cable")).toBeTruthy();
      expect(getByText("In Stock (10)")).toBeTruthy();
      expect(getByText("Out of Stock")).toBeTruthy();
      expect(getByText("Open Now")).toBeTruthy();
      expect(getByText("★ 4.5 (12)")).toBeTruthy();
      expect(getByLabelText("Add to favorites")).toBeTruthy();
    });
    expect(await findByText("Write a review")).toBeTruthy();
  });

  it("shows freshness per product and hands off to native maps", async () => {
    (openNativeMaps as jest.Mock).mockResolvedValue(true);
    serveGet(apiClient.get as jest.Mock, {
      "/stores/store-123": {
        data: {
          id: "store-123",
          name: "Local Tech Shop",
          address: "123 Main St",
          latitude: 35.1,
          longitude: 32.8,
          isOpen: true,
          products: [
            {
              id: "p1",
              name: "Old Cable",
              price: 5,
              quantity: 3,
              in_stock: true,
              isStale: true,
            },
            {
              id: "p2",
              name: "New Cable",
              price: 6,
              quantity: 2,
              in_stock: true,
              isStale: false,
            },
          ],
        },
      },
    });

    const { findByText, getByLabelText, getByText } = renderWithClient(
      <StoreDetailScreen />,
    );
    expect(await findByText("Not recently verified")).toBeTruthy();
    expect(getByText("Recently verified")).toBeTruthy();

    fireEvent.press(getByLabelText("Get directions to Local Tech Shop"));
    await waitFor(() =>
      expect(openNativeMaps).toHaveBeenCalledWith(
        35.1,
        32.8,
        "Local Tech Shop",
      ),
    );
  });

  it("shows a not-found message when the store request fails", async () => {
    (apiClient.get as jest.Mock).mockRejectedValue(new Error("404"));
    const { findByText } = renderWithClient(<StoreDetailScreen />);
    expect(await findByText("Store not found or suspended.")).toBeTruthy();
  });
});
