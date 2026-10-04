import HomeScreen from "@/app/(tabs)/index";
import CategoryScreen from "@/app/category/[id]";
import { renderWithClient, serveGet } from "@/testing/render";
import { iconForCategory } from "@/utils/categoryIcon";
import { apiClient } from "@nearcommerce/api";
import { fireEvent, waitFor } from "@testing-library/react-native";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("expo-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => ({ id: "cat-1" }),
}));
jest.mock("@/src/hooks/useLocationFetcher", () => ({
  useLocationFetcher: () => ({
    location: { coords: { latitude: 1, longitude: 2 } },
    isFetching: false,
  }),
}));
jest.mock("@/utils/location", () => ({
  getSessionLocation: jest.fn(async () => ({ latitude: 1, longitude: 2 })),
}));
jest.mock("@nearcommerce/api", () => ({
  apiClient: { get: jest.fn() },
}));

const get = apiClient.get as jest.Mock;
const tree = {
  data: [
    {
      id: "cat-1",
      name: "Groceries",
      subcategories: [
        { id: "sub-1", name: "Dairy" },
        { id: "sub-2", name: "Bakery" },
      ],
    },
    { id: "cat-2", name: "Toys", subcategories: [] },
  ],
};
const stores = {
  data: [
    {
      id: "s1",
      name: "Corner Shop",
      is_open: true,
      rating: 4,
      distance_meters: 1609.34,
    },
  ],
};

beforeEach(() => jest.clearAllMocks());

describe("HomeScreen", () => {
  it("renders categories from the API and nearby stores from { data }", async () => {
    serveGet(get, { "/categories": tree, "/search/stores": stores });
    const { findByText, getByLabelText, getByText } = renderWithClient(
      <HomeScreen />,
    );
    expect(await findByText("Groceries")).toBeTruthy();
    expect(getByLabelText("Browse Toys")).toBeTruthy();
    expect(await findByText("Corner Shop")).toBeTruthy();
    expect(getByText("1.0 miles away")).toBeTruthy();
    expect(get).toHaveBeenCalledWith("/search/stores", {
      params: { lat: 1, lng: 2 },
    });
  });

  it("shows a message when categories fail to load", async () => {
    get.mockImplementation(async (url: string) => {
      if (url === "/categories") throw new Error("down");
      return { data: stores };
    });
    const { findByText } = renderWithClient(<HomeScreen />);
    expect(await findByText(/Couldn't load categories/)).toBeTruthy();
  });
});

describe("CategoryScreen", () => {
  const products = {
    data: [
      {
        id: "p1",
        name: "Milk",
        price: "2.5",
        store_id: "s1",
        store_name: "Corner Shop",
        distance_meters: 800,
      },
    ],
    used_fallback: false,
  };

  it("browses a whole category, then narrows to a subcategory", async () => {
    serveGet(get, { "/categories": tree, "/search": products });
    const { findByText, getByText } = renderWithClient(<CategoryScreen />);
    expect(await findByText("Milk")).toBeTruthy();
    expect(getByText("Groceries")).toBeTruthy();
    expect(get).toHaveBeenCalledWith("/search", {
      params: expect.objectContaining({
        category_id: "cat-1",
        subcategory_id: undefined,
      }),
    });

    fireEvent.press(getByText("Dairy"));
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith("/search", {
        params: expect.objectContaining({
          category_id: undefined,
          subcategory_id: "sub-1",
        }),
      }),
    );
  });

  it("shows an empty state", async () => {
    serveGet(get, {
      "/categories": tree,
      "/search": { data: [], used_fallback: false },
    });
    const { findByText } = renderWithClient(<CategoryScreen />);
    expect(
      await findByText(/No nearby products in this category/),
    ).toBeTruthy();
  });
});

describe("iconForCategory", () => {
  it("maps known names and falls back for unknown ones", () => {
    expect(iconForCategory("Fresh Groceries")).toBe("basket-outline");
    expect(iconForCategory("Pharmacy")).toBe("medkit-outline");
    expect(iconForCategory("Pet care")).toBe("paw-outline");
    expect(iconForCategory("Household")).toBe("home-outline");
    expect(iconForCategory("Toys")).toBe("grid-outline");
  });
});
