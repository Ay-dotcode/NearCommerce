import { UpdateScreen } from "@/components/UpdateScreen";
import { UPDATE_SKIPPED_KEY } from "@/constants";
import { useAppUpdate } from "@/src/hooks/useAppUpdate";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Platform, Text } from "react-native";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));
jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn(), hide: jest.fn() },
}));
jest.mock("@/helpers/appInstall", () => ({
  ...jest.requireActual("@/helpers/appInstall"),
  canInstallInApp: jest.fn(() => true),
}));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { nativeAppVersion: "1.0.2", expoConfig: { version: "1.0.2" } },
}));

const RELEASES = "https://github.com/Ay-dotcode/NearCommerce/releases";

function mockRelease(tag: string, withApk = false) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          tag_name: tag,
          html_url: `${RELEASES}/tag/${tag}`,
          assets: withApk
            ? [
                {
                  name: `NearCommerce-${tag}.apk`,
                  browser_download_url: `${RELEASES}/download/${tag}/NearCommerce-${tag}.apk`,
                },
              ]
            : [],
        }),
    }),
  ) as unknown as typeof fetch;
}

// The app shell in miniature: the app, covered by the update screen when one is out.
function Shell() {
  const update = useAppUpdate();
  return (
    <>
      <Text testID="status">{update.status}</Text>
      {update.status !== "checking" && <Text testID="app">the app</Text>}
      {(update.status === "required" || update.status === "optional") && (
        <UpdateScreen
          mode={update.status}
          current={update.current}
          latest={update.latest}
          url={update.url}
          onContinue={update.skip}
        />
      )}
    </>
  );
}

beforeEach(async () => {
  jest.replaceProperty(Platform, "OS", "android");
  await AsyncStorage.clear();
});
afterEach(() => jest.restoreAllMocks());

describe("the update check when the app opens", () => {
  it("waits for the answer, then shows nothing when the app is up to date", async () => {
    mockRelease("v1.0.2");
    const { getByTestId, queryByTestId } = render(<Shell />);
    expect(getByTestId("status").props.children).toBe("checking");
    await waitFor(() =>
      expect(getByTestId("status").props.children).toBe("none"),
    );
    expect(queryByTestId("update-screen")).toBeNull();
  });

  it("forces a major update: no Continue, and nothing is remembered", async () => {
    mockRelease("v2.0.0");
    const { findByTestId, queryByTestId, getByText } = render(<Shell />);
    expect(await findByTestId("update-screen")).toBeTruthy();
    expect(getByText("Update required")).toBeTruthy();
    expect(queryByTestId("update-continue")).toBeNull();
    expect(await AsyncStorage.getItem(UPDATE_SKIPPED_KEY)).toBeNull();
  });

  it("downloads and installs inside the app when the release has an APK", async () => {
    mockRelease("v2.0.0", true);
    const { findByTestId } = render(<Shell />);
    const button = await findByTestId("update-button");
    expect(button).toHaveTextContent("Download update");
  });

  it("just opens the release page when the release has no APK", async () => {
    mockRelease("v2.0.0", false);
    const { findByTestId } = render(<Shell />);
    expect(await findByTestId("update-button")).toHaveTextContent("Update");
  });

  it("lets a minor update be skipped, and doesn't ask again for that version", async () => {
    mockRelease("v1.1.0");
    const first = render(<Shell />);
    fireEvent.press(await first.findByTestId("update-continue"));
    await waitFor(() => expect(first.queryByTestId("update-screen")).toBeNull());
    expect(first.getByTestId("status").props.children).toBe("none");
    await waitFor(async () =>
      expect(await AsyncStorage.getItem(UPDATE_SKIPPED_KEY)).toBe("1.1.0"),
    );
    first.unmount();

    // The next time the app is opened, the same version isn't offered again.
    const second = render(<Shell />);
    await waitFor(() =>
      expect(second.getByTestId("status").props.children).toBe("none"),
    );
    expect(second.queryByTestId("update-screen")).toBeNull();
    second.unmount();

    // ...but a newer one is.
    mockRelease("v1.2.0");
    const third = render(<Shell />);
    expect(await third.findByTestId("update-screen")).toBeTruthy();
    expect(third.getByText("Update available")).toBeTruthy();
  });

  it("carries on as normal when the check can't be made", async () => {
    global.fetch = jest.fn(() =>
      Promise.reject(new Error("offline")),
    ) as unknown as typeof fetch;
    const { getByTestId, queryByTestId } = render(<Shell />);
    await waitFor(() =>
      expect(getByTestId("status").props.children).toBe("none"),
    );
    expect(queryByTestId("update-screen")).toBeNull();
    expect(getByTestId("app")).toBeTruthy();
  });

  it("ignores an answer that arrives after the screen has gone", async () => {
    mockRelease("v2.0.0");
    const { unmount } = render(<Shell />);
    unmount();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  });
});
