import ProductCard from "@/components/ProductCard";
import { fireEvent, render } from "@testing-library/react-native";

const base = {
  name: "USB-C Cable",
  price: "15.5",
  inStock: true,
  isStale: false,
  onPress: jest.fn(),
};

describe("ProductCard", () => {
  it("shows price, store, distance, stock and freshness", () => {
    const { getByText } = render(
      <ProductCard
        {...base}
        storeName="Tech Shop"
        distanceMeters={1609.34}
        quantity={4}
      />,
    );
    expect(getByText("$15.50")).toBeTruthy();
    expect(getByText("Tech Shop · 1.0 mi")).toBeTruthy();
    expect(getByText("In Stock (4)")).toBeTruthy();
    expect(getByText("Recently verified")).toBeTruthy();
  });

  it("flags out-of-stock and stale listings", () => {
    const { getByText } = render(
      <ProductCard {...base} inStock={false} isStale />,
    );
    expect(getByText("Out of Stock")).toBeTruthy();
    expect(getByText("Not recently verified")).toBeTruthy();
  });

  it("calls onPress", () => {
    const onPress = jest.fn();
    const { getByRole } = render(<ProductCard {...base} onPress={onPress} />);
    fireEvent.press(getByRole("button"));
    expect(onPress).toHaveBeenCalled();
  });
});
