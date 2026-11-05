import TabLayout from "@/app/(tabs)/_layout";
import { render } from "@testing-library/react-native";

// Captures what each tab is told, instead of rendering a real navigator.
const mockScreens: { name: string; options: Record<string, unknown> }[] = [];
jest.mock("expo-router", () => {
  const Tabs = ({ children }: { children: React.ReactNode }) => children;
  Tabs.Screen = (props: { name: string; options: Record<string, unknown> }) => {
    mockScreens.push(props);
    return null;
  };
  return { Tabs };
});
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));
jest.mock("@/components/settings/HeaderButtons", () => ({
  SettingsHeaderButton: () => null,
}));
jest.mock("@/components/ui/BackButton", () => ({ BackButton: () => null }));

describe("tab bar", () => {
  beforeEach(() => {
    mockScreens.length = 0;
    render(<TabLayout />);
  });

  const options = (name: string) =>
    mockScreens.find((screen) => screen.name === name)?.options;

  it("builds the Search tab at start-up, so opening it from Home doesn't stutter", () => {
    // Without this, its first render happened mid-slide (and so did its location lookup).
    expect(options("search")?.lazy).toBe(false);
  });

  it("leaves the other tabs to be built when first opened", () => {
    for (const name of ["index", "lists", "favorites"])
      expect(options(name)).not.toHaveProperty("lazy");
  });

  it("keeps the four tabs in order", () => {
    expect(
      mockScreens
        .filter((screen) => screen.options.href !== null)
        .map((screen) => screen.name),
    ).toEqual(["index", "search", "lists", "favorites"]);
  });
});
