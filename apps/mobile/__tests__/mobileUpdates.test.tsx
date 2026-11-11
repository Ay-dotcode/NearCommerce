import { InviteCodeCard } from "@/components/lists/InviteCodeCard";
import { Drawer } from "@/components/ui/Drawer";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { extractResetToken } from "@/forms/resetPassword.form";
import {
  CATEGORY_COLUMNS,
  COLLAPSED_CATEGORY_COUNT,
  visibleCategories,
} from "@/helpers/categories";
import { inviteShareMessage } from "@/helpers/invite";
import { formatPlaceName } from "@/helpers/placeName";
import {
  getThemePreference,
  loadThemePreference,
  setThemePreference,
} from "@/helpers/themePreference";
import { THEME_STORAGE_KEY } from "@nearcommerce/helpers";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as Clipboard from "expo-clipboard";
import { Appearance, Share, Text } from "react-native";
import Toast from "react-native-toast-message";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));
jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn(), hide: jest.fn() },
}));
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe("home categories", () => {
  const names = Array.from({ length: 9 }, (_, i) => `cat${i}`);

  it("shows two rows until 'Show more'", () => {
    expect(COLLAPSED_CATEGORY_COUNT).toBe(CATEGORY_COLUMNS * 2);
    const collapsed = visibleCategories(names, false);
    expect(collapsed.shown).toHaveLength(4);
    expect(collapsed.hidden).toBe(5);
    const expanded = visibleCategories(names, true);
    expect(expanded.shown).toHaveLength(9);
    expect(expanded.hidden).toBe(0);
  });

  it("hides nothing when there are only a few", () => {
    expect(visibleCategories(["a", "b"], false)).toEqual({
      shown: ["a", "b"],
      hidden: 0,
    });
  });
});

describe("theme preference", () => {
  it("is saved, restored on the next launch and applied to the phone", async () => {
    const spy = jest
      .spyOn(Appearance, "setColorScheme")
      .mockImplementation(() => {});
    await setThemePreference("dark");
    expect(await AsyncStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(spy).toHaveBeenLastCalledWith("dark");

    await setThemePreference("system");
    expect(spy).toHaveBeenLastCalledWith("unspecified");

    await AsyncStorage.setItem(THEME_STORAGE_KEY, "light");
    await loadThemePreference();
    expect(getThemePreference()).toBe("light");
    expect(spy).toHaveBeenLastCalledWith("light");

    await AsyncStorage.setItem(THEME_STORAGE_KEY, "nonsense");
    await loadThemePreference();
    expect(getThemePreference()).toBe("system");
    spy.mockRestore();
  });
});

describe("SegmentedControl", () => {
  it("marks the chosen option and reports changes", () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <SegmentedControl
        label="Theme"
        testID="t"
        value="light"
        onChange={onChange}
        options={[
          { value: "system", label: "Auto" },
          { value: "light", label: "Light" },
        ]}
      />,
    );
    expect(getByTestId("t-light").props.accessibilityState.selected).toBe(true);
    fireEvent.press(getByTestId("t-system"));
    expect(onChange).toHaveBeenCalledWith("system");
  });
});

describe("settings drawer side", () => {
  it("is on the right by default and can be on the left", () => {
    const flat = (node: { props: Record<string, any> }) =>
      Object.assign({}, ...[node.props.style].flat(Infinity).filter(Boolean));
    const right = render(
      <Drawer visible onClose={() => {}} title="Settings" testID="d">
        <Text>x</Text>
      </Drawer>,
    );
    expect(flat(right.getByTestId("d")).right).toBe(0);
    expect(flat(right.getByTestId("d")).left).toBeUndefined();
    right.unmount();
    const left = render(
      <Drawer
        visible
        onClose={() => {}}
        title="Settings"
        testID="d"
        side="left"
      >
        <Text>x</Text>
      </Drawer>,
    );
    expect(flat(left.getByTestId("d")).left).toBe(0);
  });
});

describe("invite code", () => {
  it("builds a share message with the list name and code", () => {
    const message = inviteShareMessage("Weekly shop", "AB12CD");
    expect(message).toContain("Weekly shop");
    expect(message).toContain("AB12CD");
    expect(message).toContain("Near Commerce");
  });

  it("has Copy and Share buttons that copy / share the code", async () => {
    const share = jest
      .spyOn(Share, "share")
      .mockResolvedValue({ action: "sharedAction" });
    const { getByTestId, getByText } = render(
      <InviteCodeCard code="AB12CD" listName="Weekly shop" />,
    );
    expect(getByTestId("invite-code").props.children).toBe("AB12CD");

    fireEvent.press(getByTestId("copy-invite"));
    await waitFor(() =>
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith("AB12CD"),
    );
    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ type: "success", text1: "Invite code copied" }),
    );

    fireEvent.press(getByTestId("share-invite"));
    await waitFor(() =>
      expect(share).toHaveBeenCalledWith({
        message: expect.stringContaining("AB12CD"),
      }),
    );
    expect(getByText("Copy")).toBeTruthy();
    share.mockRestore();
  });
});

describe("place names", () => {
  it("joins the locality and country", () => {
    expect(formatPlaceName({ city: "Nicosia", country: "Cyprus" })).toBe(
      "Nicosia, Cyprus",
    );
    expect(formatPlaceName({ subregion: "Lefka", country: "Cyprus" })).toBe(
      "Lefka, Cyprus",
    );
    expect(formatPlaceName({ city: "Monaco", country: "Monaco" })).toBe(
      "Monaco",
    );
    expect(formatPlaceName({ country: "Cyprus" })).toBe("Cyprus");
    expect(formatPlaceName({})).toBeNull();
    expect(formatPlaceName(undefined)).toBeNull();
  });
});

describe("reset code", () => {
  it("accepts the bare code, or the whole link from the email", () => {
    expect(extractResetToken("  abc123  ")).toBe("abc123");
    expect(
      extractResetToken(
        "https://app.example/reset-password?token=abc%2B123&x=1",
      ),
    ).toBe("abc+123");
  });
});
