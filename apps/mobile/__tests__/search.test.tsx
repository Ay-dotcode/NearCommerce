import SearchScreen from "@/app/(tabs)/search";
import { renderWithClient } from "@/testing/render";
import { pickPhoto } from "@/utils/photo";
import { apiClient } from "@nearcommerce/api";
import { fireEvent, waitFor } from "@testing-library/react-native";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  router: { push: jest.fn() },
}));
jest.mock("@nearcommerce/api", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));
jest.mock("@/src/hooks/useSessionCoords", () => ({
  useSessionCoords: jest.fn(() => ({ latitude: 35.1, longitude: 32.8 })),
}));
jest.mock("@/utils/photo", () => ({ pickPhoto: jest.fn() }));

const get = apiClient.get as jest.Mock;
const post = apiClient.post as jest.Mock;
const pick = pickPhoto as jest.Mock;

const product = (id: string, name: string) => ({
  id,
  name,
  price: 2.5,
  quantity: 4,
  in_stock: true,
  isStale: false,
  store_id: "s1",
  store_name: "Corner Shop",
  store_latitude: 35.1,
  store_longitude: 32.8,
  distance_meters: 800,
});
const photo = { base64: "QUJD", mimeType: "image/jpeg" };
const apiError = (status: number, code: string) => ({
  response: { status, data: { error: "x", code } },
});

beforeEach(() => {
  jest.clearAllMocks();
  get.mockResolvedValue({
    data: { data: [product("p1", "Whole Milk")], used_fallback: false },
  });
});

describe("SearchScreen text search", () => {
  it("searches nearby as the shopper types", async () => {
    const { getByPlaceholderText, findByText } = renderWithClient(
      <SearchScreen />,
    );
    fireEvent.changeText(
      getByPlaceholderText("Search nearby products"),
      "milk",
    );

    expect(await findByText("Whole Milk")).toBeTruthy();
    expect(get).toHaveBeenCalledWith("/search", {
      params: expect.objectContaining({ q: "milk", lat: 35.1, lng: 32.8 }),
    });
  });

  it("offers photo search by default", () => {
    const { getByLabelText, queryByText } = renderWithClient(<SearchScreen />);
    expect(getByLabelText("Search by photo")).toBeTruthy();
    expect(getByLabelText("Choose a photo from your library")).toBeTruthy();
    expect(queryByText(/image search is unavailable/i)).toBeNull();
  });
});

describe("SearchScreen photo search", () => {
  it("sends the photo with the shopper's location and shows what it found", async () => {
    pick.mockResolvedValue(photo);
    post.mockResolvedValue({
      data: {
        detected_query: "whole milk",
        data: [product("p1", "Whole Milk")],
        used_fallback: false,
      },
    });
    const { getByLabelText, findByText } = renderWithClient(<SearchScreen />);

    fireEvent.press(getByLabelText("Search by photo"));

    expect(await findByText("Results for “whole milk”")).toBeTruthy();
    expect(await findByText("Whole Milk")).toBeTruthy();
    expect(pick).toHaveBeenCalledWith("camera");
    expect(post).toHaveBeenCalledWith("/search/image", {
      image: "QUJD",
      mime_type: "image/jpeg",
      lat: 35.1,
      lng: 32.8,
    });
  });

  it("uses the photo library from the second button", async () => {
    pick.mockResolvedValue(null);
    const { getByLabelText } = renderWithClient(<SearchScreen />);
    fireEvent.press(getByLabelText("Choose a photo from your library"));
    await waitFor(() => expect(pick).toHaveBeenCalledWith("library"));
  });

  it("does nothing when the shopper backs out of the picker", async () => {
    pick.mockResolvedValue(null);
    const { getByLabelText, queryByRole } = renderWithClient(<SearchScreen />);
    fireEvent.press(getByLabelText("Search by photo"));
    await waitFor(() => expect(pick).toHaveBeenCalled());
    expect(post).not.toHaveBeenCalled();
    expect(queryByRole("alert")).toBeNull();
  });

  it("explains a refused camera permission", async () => {
    pick.mockResolvedValue("denied");
    const { getByLabelText, findByText } = renderWithClient(<SearchScreen />);
    fireEvent.press(getByLabelText("Search by photo"));
    expect(await findByText(/camera access is off/i)).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });

  it("says when no product was spotted, and keeps photo search available", async () => {
    pick.mockResolvedValue(photo);
    post.mockRejectedValue(apiError(422, "NO_PRODUCT_DETECTED"));
    const { getByLabelText, findByText } = renderWithClient(<SearchScreen />);
    fireEvent.press(getByLabelText("Search by photo"));
    expect(await findByText(/couldn't spot a product/i)).toBeTruthy();
    expect(getByLabelText("Search by photo")).toBeTruthy();
  });

  it("degrades to text search when the vision model is unavailable (SRS 3.2.1)", async () => {
    pick.mockResolvedValue(photo);
    post.mockRejectedValue(apiError(503, "VISION_UNAVAILABLE"));
    const {
      getByLabelText,
      findByText,
      queryByLabelText,
      getByPlaceholderText,
    } = renderWithClient(<SearchScreen />);
    fireEvent.press(getByLabelText("Search by photo"));

    expect(
      await findByText(
        "Image search is unavailable right now. Text search is still working.",
      ),
    ).toBeTruthy();
    expect(queryByLabelText("Search by photo")).toBeNull();
    expect(queryByLabelText("Choose a photo from your library")).toBeNull();

    // Text search still works
    fireEvent.changeText(
      getByPlaceholderText("Search nearby products"),
      "milk",
    );
    expect(await findByText("Whole Milk")).toBeTruthy();
  });

  it("shows a generic message for other failures", async () => {
    pick.mockResolvedValue(photo);
    post.mockRejectedValue(new Error("boom"));
    const { getByLabelText, findByText } = renderWithClient(<SearchScreen />);
    fireEvent.press(getByLabelText("Search by photo"));
    expect(await findByText(/photo search failed/i)).toBeTruthy();
  });

  it("returns to text results when the shopper starts typing", async () => {
    pick.mockResolvedValue(photo);
    post.mockResolvedValue({
      data: {
        detected_query: "whole milk",
        data: [product("p9", "Photo Result")],
        used_fallback: false,
      },
    });
    const { getByLabelText, findByText, queryByText, getByPlaceholderText } =
      renderWithClient(<SearchScreen />);
    fireEvent.press(getByLabelText("Search by photo"));
    await findByText("Photo Result");

    fireEvent.changeText(
      getByPlaceholderText("Search nearby products"),
      "milk",
    );
    expect(await findByText("Whole Milk")).toBeTruthy();
    expect(queryByText("Photo Result")).toBeNull();
    expect(queryByText(/Results for/)).toBeNull();
  });
});
