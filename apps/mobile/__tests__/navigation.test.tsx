import { render } from "@testing-library/react-native";
import type { ReactNode } from "react";

// Capture what the layouts hand to the navigators.
const captured: {
  tabsOptions?: Record<string, any>;
  tabScreens: { name: string; options?: Record<string, any> }[];
  stacks: Record<string, any>[];
  stackScreens: { name: string; options?: Record<string, any> }[];
} = { tabScreens: [], stacks: [], stackScreens: [] };

jest.mock("expo-router", () => {
  const Tabs = ({
    screenOptions,
    children,
  }: {
    screenOptions: Record<string, any>;
    children: ReactNode;
  }) => {
    captured.tabsOptions = screenOptions;
    return children;
  };
  Tabs.Screen = ({
    name,
    options,
  }: {
    name: string;
    options?: Record<string, any>;
  }) => {
    captured.tabScreens.push({ name, options });
    return null;
  };
  const Stack = ({
    screenOptions,
    children,
  }: {
    screenOptions: Record<string, any>;
    children: ReactNode;
  }) => {
    captured.stacks.push(screenOptions);
    return children;
  };
  Stack.Screen = ({
    name,
    options,
  }: {
    name: string;
    options?: Record<string, any>;
  }) => {
    captured.stackScreens.push({ name, options });
    return null;
  };
  return {
    Tabs,
    Stack,
    Redirect: () => null,
    ThemeProvider: ({ children }: { children: ReactNode }) => children,
    DarkTheme: { colors: {} },
    DefaultTheme: { colors: {} },
  };
});
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
jest.mock("@/src/context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({ token: "t", isLoading: false, logout: jest.fn() }),
}));
jest.mock("@/src/hooks/useLocationFetcher", () => ({
  useLocationFetcher: () => ({
    isFetching: false,
    permissionDenied: false,
    manualLocation: null,
  }),
}));
jest.mock("@/components/settings/SettingsContent", () => () => null);
jest.mock("@/components/settings/SupportSheet", () => () => null);
jest.mock("@/components/ToastHost", () => () => null);

import AuthLayout from "@/app/(auth)/_layout";
import RootLayout from "@/app/_layout";
import TabLayout from "@/app/(tabs)/_layout";
import { SettingsHeaderButton } from "@/components/settings/HeaderButtons";

beforeEach(() => {
  captured.tabScreens = [];
  captured.stacks = [];
  captured.stackScreens = [];
});

describe("bottom tabs", () => {
  it("are Home, Search, Lists and Favorites: settings is not a tab", () => {
    render(<TabLayout />);
    const names = captured.tabScreens.map((s) => s.name);
    expect(names).toEqual([
      "index",
      "search",
      "lists",
      "favorites",
      "lists/join",
    ]);
    expect(names).not.toContain("settings");
    expect(
      captured.tabScreens.map((s) => s.options?.title).filter(Boolean),
    ).toEqual(["Home", "Search", "Lists", "Favorites"]);
  });

  it("does not show the join screen as its own tab", () => {
    render(<TabLayout />);
    expect(
      captured.tabScreens.find((s) => s.name === "lists/join")?.options?.href,
    ).toBeNull();
  });

  it("animate when switching tabs", () => {
    render(<TabLayout />);
    expect(captured.tabsOptions?.animation).toBe("shift");
  });

  it("put the settings button in the app bar of every tab screen", () => {
    render(<TabLayout />);
    const left = captured.tabsOptions?.headerLeft();
    expect(left.type).toBe(SettingsHeaderButton);
  });
});

describe("page transitions", () => {
  it("the main stack slides pages in from the right", () => {
    render(<RootLayout />);
    expect(captured.stacks[0].animation).toBe("slide_from_right");
    expect(
      captured.stackScreens.find((s) => s.name === "review/index")?.options
        ?.animation,
    ).toBe("slide_from_bottom");
  });

  it("the sign-in flow slides between its screens", () => {
    render(<AuthLayout />);
    expect(captured.stacks[0].animation).toBe("slide_from_right");
  });
});
