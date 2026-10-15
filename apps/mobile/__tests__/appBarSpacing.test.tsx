import FavoritesScreen from "@/app/(tabs)/favorites";
import HomeScreen from "@/app/(tabs)/index";
import ListsScreen from "@/app/(tabs)/lists";
import JoinScreen from "@/app/(tabs)/lists/join";
import SearchScreen from "@/app/(tabs)/search";
import ProductScreen from "@/app/product/[id]";
import ReviewScreen from "@/app/review/index";
import StoreScreen from "@/app/store/[id]";
import { renderWithClient } from "@/testing/render";
import { apiClient } from "@nearcommerce/api";

const seen: { edges?: string[] }[] = [];

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({
    children,
    edges,
  }: {
    children: React.ReactNode;
    edges?: string[];
  }) => {
    seen.push({ edges });
    return children;
  },
}));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));
jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: "x", storeId: "x" }),
}));
jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));
jest.mock("@/src/hooks/useLocationFetcher", () => ({
  useLocationFetcher: () => ({
    location: { coords: { latitude: 1, longitude: 2 } },
    isFetching: false,
  }),
}));
jest.mock("@/helpers/location", () => ({
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

beforeEach(() => {
  seen.length = 0;
  (apiClient.get as jest.Mock).mockReturnValue(new Promise(() => {}));
});

// The navigation header (or tab bar) already keeps content clear of the status bar, notch and
// home indicator. If a screen asks for the top inset again, an empty gap appears under the bar.
describe("no empty gap under the app bar", () => {
  it.each([
    ["Home", HomeScreen],
    ["Search", SearchScreen],
    ["Lists", ListsScreen],
    ["Favorites", FavoritesScreen],
    ["Join list", JoinScreen],
    ["Store", StoreScreen],
    ["Product", ProductScreen],
    ["Review", ReviewScreen],
  ])("%s does not add the top safe-area padding again", (_name, Screen) => {
    renderWithClient(<Screen />);
    expect(seen.length).toBeGreaterThan(0);
    for (const { edges } of seen) {
      expect(edges).toBeDefined();
      expect(edges).not.toContain("top");
    }
  });

  it("tab screens leave the bottom to the tab bar", () => {
    renderWithClient(<HomeScreen />);
    expect(seen[0].edges).not.toContain("bottom");
  });

  it("stack screens still keep clear of the home indicator", () => {
    renderWithClient(<StoreScreen />);
    expect(seen[0].edges).toContain("bottom");
  });
});
