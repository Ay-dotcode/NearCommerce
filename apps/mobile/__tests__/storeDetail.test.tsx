import { apiClient } from "@nearcommerce/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react-native";
import StoreDetailScreen from "../app/store/[id]";

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
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe("StoreDetailScreen", () => {
  it("fetches and displays store details and inventory", async () => {
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      data: {
        id: "store-123",
        name: "Local Tech Shop",
        address: "123 Main St",
        products: [
          { id: "prod-1", name: "USB-C Cable", price: 15.99, quantity: 10 },
        ],
      },
    });

    const { getByText } = render(
      <QueryClientProvider client={queryClient}>
        <StoreDetailScreen />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(getByText("Local Tech Shop")).toBeTruthy();
      expect(getByText("123 Main St")).toBeTruthy();
      expect(getByText("USB-C Cable")).toBeTruthy();
      expect(getByText("In Stock (10)")).toBeTruthy();
    });
  });
});
