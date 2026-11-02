import ProductCard from "@/components/ProductCard";
import ProductImage, { IMAGE_RETRY_DELAYS_MS } from "@/components/ProductImage";
import { resolveImageUrl } from "@/helpers/imageUrl";
import { act, fireEvent, render } from "@testing-library/react-native";

jest.mock("@/constants", () => ({ API_URL: "https://api.example.com/" }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));

const ID = "3f2b8c1e-5a4d-4e6f-9a7b-1c2d3e4f5a6b";

describe("resolveImageUrl", () => {
  it("returns null when the product has no picture", () => {
    expect(resolveImageUrl(undefined)).toBeNull();
    expect(resolveImageUrl(null)).toBeNull();
    expect(resolveImageUrl("   ")).toBeNull();
  });

  it("rebuilds uploaded pictures against the API address, whatever host was saved", () => {
    expect(resolveImageUrl(`http://localhost:4000/api/images/${ID}`)).toBe(
      `https://api.example.com/api/images/${ID}`,
    );
    expect(resolveImageUrl(`/api/images/${ID}`)).toBe(
      `https://api.example.com/api/images/${ID}`,
    );
  });

  it("leaves other full web addresses (for example from a CSV import) alone", () => {
    expect(resolveImageUrl("https://cdn.shop.com/p/cable.jpg")).toBe(
      "https://cdn.shop.com/p/cable.jpg",
    );
  });

  it("resolves other server-relative paths against the API, and rejects junk", () => {
    expect(resolveImageUrl("/static/cable.png")).toBe(
      "https://api.example.com/static/cable.png",
    );
    expect(resolveImageUrl("cable.png")).toBeNull();
  });
});

describe("ProductImage", () => {
  it("shows the picture when there is one", () => {
    const { getByTestId, queryByTestId } = render(
      <ProductImage uri={`/api/images/${ID}`} label="USB-C Cable" />,
    );
    expect(getByTestId("product-image").props.source).toEqual({
      uri: `https://api.example.com/api/images/${ID}`,
    });
    expect(getByTestId("product-image").props.accessibilityLabel).toBe(
      "USB-C Cable",
    );
    expect(queryByTestId("product-image-placeholder")).toBeNull();
  });

  it("shows a placeholder when the product has no picture", () => {
    const { getByTestId, queryByTestId } = render(
      <ProductImage uri={null} label="USB-C Cable" />,
    );
    expect(getByTestId("product-image-placeholder")).toBeTruthy();
    expect(queryByTestId("product-image")).toBeNull();
  });

  describe("when the picture fails to load", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const fail = (api: ReturnType<typeof render>) =>
      fireEvent(api.getByTestId("product-image"), "error");

    it("tries again, and shows the picture if a retry works", () => {
      const api = render(
        <ProductImage uri="https://cdn.shop.com/slow.jpg" label="Cable" />,
      );
      fail(api);
      // Still the picture while a retry is pending: no flicker to the placeholder.
      expect(api.getByTestId("product-image")).toBeTruthy();
      act(() => {
        jest.advanceTimersByTime(IMAGE_RETRY_DELAYS_MS[0]);
      });
      expect(api.getByTestId("product-image")).toBeTruthy();
      expect(api.queryByTestId("product-image-placeholder")).toBeNull();
    });

    it("falls back to the placeholder once every retry has failed", () => {
      const api = render(
        <ProductImage uri="https://cdn.shop.com/missing.jpg" label="Cable" />,
      );
      for (const delay of IMAGE_RETRY_DELAYS_MS) {
        fail(api);
        act(() => {
          jest.advanceTimersByTime(delay);
        });
      }
      fail(api);
      expect(api.getByTestId("product-image-placeholder")).toBeTruthy();
      expect(api.queryByTestId("product-image")).toBeNull();
    });

    it("starts over when the product (and so the picture) changes", () => {
      const api = render(
        <ProductImage uri="https://cdn.shop.com/a.jpg" label="A" />,
      );
      for (const delay of IMAGE_RETRY_DELAYS_MS) {
        fail(api);
        act(() => {
          jest.advanceTimersByTime(delay);
        });
      }
      fail(api);
      expect(api.getByTestId("product-image-placeholder")).toBeTruthy();

      api.rerender(<ProductImage uri="https://cdn.shop.com/b.jpg" label="B" />);
      expect(api.getByTestId("product-image").props.source).toEqual({
        uri: "https://cdn.shop.com/b.jpg",
      });
    });
  });
});

describe("ProductCard picture", () => {
  const base = {
    name: "USB-C Cable",
    price: 15.5,
    inStock: true,
    isStale: false,
    onPress: jest.fn(),
  };

  it("shows the product's picture next to the name and price", () => {
    const { getByTestId, getByText } = render(
      <ProductCard {...base} imageUrl="https://cdn.shop.com/cable.jpg" />,
    );
    expect(getByTestId("product-image").props.source).toEqual({
      uri: "https://cdn.shop.com/cable.jpg",
    });
    expect(getByText("USB-C Cable")).toBeTruthy();
    expect(getByText("₺15.50")).toBeTruthy();
  });

  it("keeps the card layout with a placeholder when there is no picture", () => {
    const { getByTestId } = render(<ProductCard {...base} />);
    expect(getByTestId("product-image-placeholder")).toBeTruthy();
  });
});
