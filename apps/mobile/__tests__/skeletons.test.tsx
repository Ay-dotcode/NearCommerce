import HomeScreen from "@/app/(tabs)/index";
import FavoritesScreen from "@/app/(tabs)/favorites";
import ListsScreen from "@/app/(tabs)/lists";
import CategoryScreen from "@/app/category/[id]";
import ListDetailScreen from "@/app/list/[id]";
import ProductScreen from "@/app/product/[id]";
import StoreScreen from "@/app/store/[id]";
import { renderWithClient } from "@/testing/render";
import { apiClient } from "@nearcommerce/api";
import { ActivityIndicator } from "react-native";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));
jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: "x" }),
}));
jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));
jest.mock("@/src/context/AuthContext", () => ({
  useAuth: () => ({ token: "jwt" }),
}));
jest.mock("@/hooks/useHouseholdList", () => ({
  useListLiveUpdates: jest.fn(() => ({ isConnected: true })),
}));
jest.mock("@/src/hooks/useLocationFetcher", () => ({
  useLocationFetcher: () => ({
    location: { coords: { latitude: 1, longitude: 2 } },
    isFetching: false,
  }),
}));
jest.mock("@/utils/location", () => ({
  getSessionLocation: jest.fn(async () => ({ latitude: 1, longitude: 2 })),
  subscribeManualLocation: jest.fn(() => () => undefined),
}));
jest.mock("@nearcommerce/api", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const get = apiClient.get as jest.Mock;

// Every screen must show skeleton placeholders (and nothing else) while its data loads.
describe.each([
  ["Home", HomeScreen],
  ["Favorites", FavoritesScreen],
  ["Lists", ListsScreen],
  ["Category", CategoryScreen],
  ["Store", StoreScreen],
  ["Product", ProductScreen],
  ["List detail", ListDetailScreen],
])("%s while loading", (_name, Screen) => {
  beforeEach(() => get.mockReturnValue(new Promise(() => {})));

  it("shows skeleton placeholders, never a spinner or loading text", () => {
    const { queryAllByTestId, queryByText, UNSAFE_queryByType } =
      renderWithClient(<Screen />);
    expect(queryAllByTestId("skeleton").length).toBeGreaterThan(0);
    expect(UNSAFE_queryByType(ActivityIndicator as never)).toBeNull();
    expect(queryByText(/loading|please wait/i)).toBeNull();
  });
});

describe("skeleton placeholders disappear when the data arrives", () => {
  it("Favorites replaces its skeleton with the favourites", async () => {
    get.mockResolvedValue({ data: { data: [] } });
    const { findByText, queryAllByTestId } = renderWithClient(
      <FavoritesScreen />,
    );
    expect(await findByText(/haven't saved any favorites/)).toBeTruthy();
    expect(queryAllByTestId("skeleton")).toHaveLength(0);
  });
});
