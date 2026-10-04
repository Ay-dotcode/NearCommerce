import StoreDetailScreen from "@/app/store/[id]";
import { renderWithClient, serveGet } from "@/testing/render";
import { apiClient } from "@nearcommerce/api";
import { waitFor } from "@testing-library/react-native";

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
    });

    const { getByText, getByLabelText } = renderWithClient(
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
  });

  it("shows a not-found message when the store request fails", async () => {
    (apiClient.get as jest.Mock).mockRejectedValue(new Error("404"));
    const { findByText } = renderWithClient(<StoreDetailScreen />);
    expect(await findByText("Store not found or suspended.")).toBeTruthy();
  });
});
