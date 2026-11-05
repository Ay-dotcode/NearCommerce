import { SettingsHeaderButton } from "@/components/settings/HeaderButtons";
import { BackButton } from "@/components/ui/BackButton";
import type { IconName } from "@/helpers/categoryIcon";
import { useColors } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

const TABS: {
  name: string;
  title: string;
  icon: IconName;
  lazy?: boolean;
}[] = [
  { name: "index", title: "Home", icon: "home" },
  { name: "search", title: "Search", icon: "search", lazy: false },
  { name: "lists", title: "Lists", icon: "list" },
  { name: "favorites", title: "Favorites", icon: "heart" },
];

export default function TabLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        animation: "shift",
        headerRight: () => <SettingsHeaderButton />,
        headerStyle: { backgroundColor: c.surface },
        headerTitleStyle: { color: c.text, fontWeight: "700" },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: c.background },
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
        },
      }}
    >
      {TABS.map(({ name, title, icon, lazy }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            ...(lazy === undefined ? {} : { lazy }),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={icon} size={size} color={color} />
            ),
          }}
        />
      ))}
      {/* Reached from the Lists tab; not a tab of its own. */}
      <Tabs.Screen
        name="lists/join"
        options={{
          href: null,
          title: "Join a list",
          headerLeft: () => <BackButton fallback="/(tabs)/lists" inHeader />,
        }}
      />
    </Tabs>
  );
}
