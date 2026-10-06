import ListsScreen from "@/app/(tabs)/lists";
import ListDetailScreen from "@/app/list/[id]";
import { renderWithClient, serveGet } from "@/testing/render";
import { apiClient } from "@nearcommerce/api";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { Alert } from "react-native";
import Toast from "react-native-toast-message";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: "list-1" }),
}));
jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));
jest.mock("@/src/context/AuthContext", () => ({
  useAuth: () => ({ token: "jwt-token" }),
}));
jest.mock("@/hooks/useHouseholdList", () => ({
  useListLiveUpdates: jest.fn(() => ({ isConnected: true })),
}));
jest.mock("@nearcommerce/api", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const api = apiClient as unknown as Record<
  "get" | "post" | "patch" | "delete",
  jest.Mock
>;

const detail = (role: "OWNER" | "MEMBER" = "OWNER") => ({
  id: "list-1",
  name: "Home",
  invite_code: "ABC123",
  role,
  viewer_id: role === "OWNER" ? "u1" : "u2",
  members: [
    { user_id: "u1", role: "OWNER", full_name: "Ada" },
    { user_id: "u2", role: "MEMBER", full_name: "Ben" },
  ],
  items: [
    {
      id: "i1",
      list_id: "list-1",
      product_id: null,
      custom_item_name: "Eggs",
      quantity: 2,
      is_checked: false,
    },
    {
      id: "i2",
      list_id: "list-1",
      product_id: "p1",
      custom_item_name: null,
      item_name: "Milk",
      quantity: 1,
      is_checked: true,
    },
  ],
});

beforeEach(() => {
  jest.clearAllMocks();
  api.post.mockResolvedValue({ data: {} });
  api.patch.mockResolvedValue({ data: {} });
  api.delete.mockResolvedValue({});
});

describe("ListDetailScreen", () => {
  it("renders items using custom or catalogue names and shows the invite code", async () => {
    serveGet(api.get, { "/lists/list-1": detail() });
    const { findByText, getByText } = renderWithClient(<ListDetailScreen />);
    expect(await findByText("Eggs (x2)")).toBeTruthy();
    expect(getByText("Milk (x1)")).toBeTruthy();
    expect(getByText("Invite code: ABC123")).toBeTruthy();
  });

  it("toggles an item by its id via PATCH", async () => {
    serveGet(api.get, { "/lists/list-1": detail() });
    const { findByLabelText } = renderWithClient(<ListDetailScreen />);
    fireEvent.press(await findByLabelText("Eggs"));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/lists/list-1/items/i1", {
        is_checked: true,
      }),
    );
  });

  it("removes an item", async () => {
    serveGet(api.get, { "/lists/list-1": detail() });
    const { findByLabelText } = renderWithClient(<ListDetailScreen />);
    fireEvent.press(await findByLabelText("Remove Eggs"));
    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith("/lists/list-1/items/i1"),
    );
  });

  it("adds a new item without showing the 'already on list' toast", async () => {
    serveGet(api.get, { "/lists/list-1": detail() });
    api.post.mockResolvedValue({
      data: { id: "i3", quantity: 1, already_on_list: false },
    });
    const { findByLabelText } = renderWithClient(<ListDetailScreen />);
    fireEvent.changeText(await findByLabelText("Add an item"), "  Bread ");
    fireEvent.press(await findByLabelText("Add item"));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/lists/list-1/items", {
        custom_item_name: "Bread",
      }),
    );
    expect(Toast.show).not.toHaveBeenCalled();
  });

  it("shows the exact SRS message when the server says the item was already on the list", async () => {
    serveGet(api.get, { "/lists/list-1": detail() });
    api.post.mockResolvedValue({
      data: { id: "i1", quantity: 3, already_on_list: true },
    });
    const { findByLabelText } = renderWithClient(<ListDetailScreen />);
    fireEvent.changeText(await findByLabelText("Add an item"), "Eggs");
    fireEvent.press(await findByLabelText("Add item"));
    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          text2:
            "Item already on list. Quantity increased to 3 and marked un-checked.",
        }),
      ),
    );
  });

  it("disables Add for blank input", async () => {
    serveGet(api.get, { "/lists/list-1": detail() });
    const { findByLabelText } = renderWithClient(<ListDetailScreen />);
    fireEvent.press(await findByLabelText("Add item"));
    expect(api.post).not.toHaveBeenCalled();
  });

  it("lets only the owner regenerate the invite code", async () => {
    serveGet(api.get, { "/lists/list-1": detail("MEMBER") });
    const member = renderWithClient(<ListDetailScreen />);
    await member.findByText("Leave list");
    expect(member.queryByText("Regenerate invite code")).toBeNull();
    member.unmount();

    serveGet(api.get, { "/lists/list-1": detail("OWNER") });
    api.post.mockResolvedValue({ data: { invite_code: "NEW999" } });
    const owner = renderWithClient(<ListDetailScreen />);
    fireEvent.press(await owner.findByText("Regenerate invite code"));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/lists/list-1/regenerate-invite"),
    );
    expect(await owner.findByText("Invite code: NEW999")).toBeTruthy();
  });

  it("shows a fallback when the list can't be loaded", async () => {
    api.get.mockRejectedValue(new Error("403"));
    const { findByText } = renderWithClient(<ListDetailScreen />);
    expect(await findByText("This list isn't available.")).toBeTruthy();
  });
});

describe("ListDetailScreen rename and members", () => {
  it("lets the owner rename the list", async () => {
    serveGet(api.get, { "/lists/list-1": detail() });
    const { findByLabelText, getByLabelText } = renderWithClient(
      <ListDetailScreen />,
    );
    fireEvent.press(await findByLabelText("Rename list"));
    fireEvent.changeText(getByLabelText("List name"), "  Flat shop  ");
    fireEvent.press(getByLabelText("Save name"));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith("/lists/list-1", {
        name: "Flat shop",
      }),
    );
  });

  it("doesn't call the API when the name is unchanged or blank", async () => {
    serveGet(api.get, { "/lists/list-1": detail() });
    const { findByLabelText, getByLabelText, getByText } = renderWithClient(
      <ListDetailScreen />,
    );
    fireEvent.press(await findByLabelText("Rename list"));
    fireEvent.press(getByLabelText("Save name"));
    expect(api.patch).not.toHaveBeenCalled();
    expect(getByText("Home")).toBeTruthy();

    fireEvent.press(getByLabelText("Rename list"));
    fireEvent.changeText(getByLabelText("List name"), "   ");
    fireEvent.press(getByLabelText("Save name"));
    expect(api.patch).not.toHaveBeenCalled();
  });

  it("cancels a rename", async () => {
    serveGet(api.get, { "/lists/list-1": detail() });
    const { findByLabelText, getByLabelText, getByText } = renderWithClient(
      <ListDetailScreen />,
    );
    fireEvent.press(await findByLabelText("Rename list"));
    fireEvent.changeText(getByLabelText("List name"), "Nope");
    fireEvent.press(getByLabelText("Cancel rename"));
    expect(getByText("Home")).toBeTruthy();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it("shows the server's message when renaming fails", async () => {
    serveGet(api.get, { "/lists/list-1": detail() });
    api.patch.mockRejectedValue({
      response: { data: { error: "Only the list owner can rename it." } },
    });
    const { findByLabelText, getByLabelText } = renderWithClient(
      <ListDetailScreen />,
    );
    fireEvent.press(await findByLabelText("Rename list"));
    fireEvent.changeText(getByLabelText("List name"), "New");
    fireEvent.press(getByLabelText("Save name"));
    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          text2: "Only the list owner can rename it.",
        }),
      ),
    );
  });

  it("hides rename from members", async () => {
    serveGet(api.get, { "/lists/list-1": detail("MEMBER") });
    const { findByText, queryByLabelText } = renderWithClient(
      <ListDetailScreen />,
    );
    await findByText("Home");
    expect(queryByLabelText("Rename list")).toBeNull();
  });

  it("lists members, marking the viewer", async () => {
    serveGet(api.get, { "/lists/list-1": detail() });
    const { findByText, getByText, queryByText } = renderWithClient(
      <ListDetailScreen />,
    );
    fireEvent.press(await findByText("Members (2)"));
    expect(getByText("Ada (You)")).toBeTruthy();
    expect(getByText("Ben")).toBeTruthy();
    expect(queryByText("Ben (You)")).toBeNull();
  });

  it("lets the owner remove a member after confirming", async () => {
    serveGet(api.get, { "/lists/list-1": detail() });
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const { findByText, getByLabelText, queryByLabelText } = renderWithClient(
      <ListDetailScreen />,
    );
    fireEvent.press(await findByText("Members (2)"));
    expect(queryByLabelText("Remove Ada")).toBeNull();
    fireEvent.press(getByLabelText("Remove Ben"));
    expect(api.delete).not.toHaveBeenCalled();

    alert.mock.calls[0][2]!.find((b) => b.text === "Remove")!.onPress!();
    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith("/lists/list-1/members/u2"),
    );
    alert.mockRestore();
  });

  it("gives members no remove buttons", async () => {
    serveGet(api.get, { "/lists/list-1": detail("MEMBER") });
    const { findByText, queryByLabelText } = renderWithClient(
      <ListDetailScreen />,
    );
    fireEvent.press(await findByText("Members (2)"));
    expect(queryByLabelText("Remove Ada")).toBeNull();
    expect(queryByLabelText("Remove Ben")).toBeNull();
  });
});

describe("ListsScreen", () => {
  it("shows the user's lists and opens one", async () => {
    serveGet(api.get, {
      "/lists": {
        data: [
          {
            id: "list-1",
            name: "Home",
            invite_code: "A",
            role: "OWNER",
            member_count: 2,
            unchecked_count: 3,
          },
        ],
      },
    });
    const { findByText, getByLabelText } = renderWithClient(<ListsScreen />);
    expect(await findByText("3 to buy · 2 members")).toBeTruthy();
    fireEvent.press(getByLabelText("Open Home"));
    expect(router.push).toHaveBeenCalledWith("/list/list-1");
  });

  it("creates a list and opens it", async () => {
    serveGet(api.get, { "/lists": { data: [] } });
    api.post.mockResolvedValue({ data: { id: "new-1", name: "Flat" } });
    const { findByText, getByLabelText } = renderWithClient(<ListsScreen />);
    await findByText(/No lists yet/);
    fireEvent.changeText(getByLabelText("New list name"), " Flat ");
    fireEvent.press(getByLabelText("Create list"));
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/lists", { name: "Flat" }),
    );
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith("/list/new-1"),
    );
  });

  it("surfaces the server's message when creation fails", async () => {
    serveGet(api.get, { "/lists": { data: [] } });
    api.post.mockRejectedValue({
      response: {
        data: { error: "You can be in at most 10 lists. Leave one first." },
      },
    });
    const { findByText, getByLabelText } = renderWithClient(<ListsScreen />);
    await findByText(/No lists yet/);
    fireEvent.changeText(getByLabelText("New list name"), "Another");
    fireEvent.press(getByLabelText("Create list"));
    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({
          text2: "You can be in at most 10 lists. Leave one first.",
        }),
      ),
    );
  });
});
