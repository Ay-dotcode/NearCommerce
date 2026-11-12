import { UpdateScreen } from "@/components/UpdateScreen";
import { canInstallInApp, downloadApk, installApk } from "@/helpers/appInstall";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { BackHandler, Linking } from "react-native";
import Toast from "react-native-toast-message";

jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));
jest.mock("react-native-toast-message", () => ({
  __esModule: true,
  default: { show: jest.fn(), hide: jest.fn() },
}));
// Downloading and installing need the phone; the screen is tested against stand-ins.
jest.mock("@/helpers/appInstall", () => ({
  ...jest.requireActual("@/helpers/appInstall"),
  canInstallInApp: jest.fn(),
  downloadApk: jest.fn(),
  installApk: jest.fn(),
}));

const PAGE = "https://github.com/Ay-dotcode/NearCommerce/releases/tag/v2.0.0";
const APK =
  "https://github.com/Ay-dotcode/NearCommerce/releases/download/v2.0.0/NearCommerce-v2.0.0.apk";
const FILE = "file:///cache/NearCommerce-2.0.0.apk";

function setup(
  mode: "required" | "optional",
  url = PAGE,
  onContinue = jest.fn(),
) {
  const api = render(
    <UpdateScreen
      mode={mode}
      current="1.0.2"
      latest="2.0.0"
      url={url}
      onContinue={onContinue}
    />,
  );
  return { ...api, onContinue };
}

// The function the screen gave the phone's back button.
function backPress() {
  const add = BackHandler.addEventListener as unknown as jest.Mock;
  return add.mock.calls[add.mock.calls.length - 1][1] as () => boolean;
}

// A download the test controls: report progress, then finish or fail it.
function controlledDownload() {
  let onProgress: (fraction: number | null) => void = () => {};
  let finish: (uri: string) => void = () => {};
  let fail: (error: Error) => void = () => {};
  const cancel = jest.fn(() => fail(new Error("aborted")));
  (downloadApk as jest.Mock).mockImplementationOnce((_url, _version, report) => {
    onProgress = report;
    return {
      promise: new Promise<string>((resolve, reject) => {
        finish = resolve;
        fail = reject;
      }),
      cancel,
    };
  });
  return {
    cancel,
    progress: (fraction: number | null) => act(() => onProgress(fraction)),
    finish: (uri = FILE) => act(async () => finish(uri)),
    fail: () => act(async () => fail(new Error("network"))),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (canInstallInApp as jest.Mock).mockReturnValue(true);
  (installApk as jest.Mock).mockResolvedValue(undefined);
  jest.spyOn(BackHandler, "addEventListener");
  jest.spyOn(BackHandler, "exitApp").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe("UpdateScreen: a required (major) update", () => {
  it("says the update is required and shows both versions", () => {
    const { getByText, queryByTestId } = setup("required");
    expect(getByText("Update required")).toBeTruthy();
    expect(getByText(/you need to update to keep using the app/i)).toBeTruthy();
    expect(getByText("1.0.2")).toBeTruthy();
    expect(getByText("2.0.0")).toBeTruthy();
    expect(queryByTestId("update-screen")).not.toBeNull();
  });

  it("has no way to carry on without updating", () => {
    const { queryByTestId, queryByText } = setup("required", APK);
    expect(queryByTestId("update-continue")).toBeNull();
    expect(queryByText("Continue")).toBeNull();
    expect(queryByTestId("update-button")).not.toBeNull();
  });

  it("the phone's back button leaves the app instead of getting past the screen", () => {
    const { onContinue } = setup("required");
    expect(backPress()()).toBe(true);
    expect(BackHandler.exitApp).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
  });
});

describe("UpdateScreen: an optional (minor) update", () => {
  it("says an update is available, and offers Update and Continue", () => {
    const { getByText, getByTestId } = setup("optional");
    expect(getByText("Update available")).toBeTruthy();
    expect(getByText(/update later/i)).toBeTruthy();
    expect(getByTestId("update-button")).toBeTruthy();
    expect(getByTestId("update-continue")).toBeTruthy();
  });

  it("Continue carries on with the current version", () => {
    const { getByTestId, onContinue } = setup("optional");
    fireEvent.press(getByTestId("update-continue"));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("the phone's back button does the same as Continue", () => {
    const { onContinue } = setup("optional");
    expect(backPress()()).toBe(true);
    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(BackHandler.exitApp).not.toHaveBeenCalled();
  });
});

describe("UpdateScreen: Update with a link that isn't an APK (a store page)", () => {
  it.each(["required", "optional"] as const)(
    "just opens the page (%s)",
    async (mode) => {
      const open = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
      const { getByTestId, getByText } = setup(mode, PAGE);
      expect(getByText("Update")).toBeTruthy();
      expect(getByText("Opens the update page.")).toBeTruthy();
      fireEvent.press(getByTestId("update-button"));
      await waitFor(() => expect(open).toHaveBeenCalledWith(PAGE));
      expect(downloadApk).not.toHaveBeenCalled();
    },
  );

  it("tells the shopper when the page couldn't be opened", async () => {
    jest.spyOn(Linking, "openURL").mockRejectedValue(new Error("no browser"));
    const { getByTestId, findByText } = setup("required", PAGE);
    fireEvent.press(getByTestId("update-button"));
    expect(await findByText("Couldn't open the update page. Try again.")).toBeTruthy();
    expect(getByTestId("update-button")).toHaveTextContent("Try again");
  });

  it("opens an APK link in the browser in a build that can't install inside the app", async () => {
    (canInstallInApp as jest.Mock).mockReturnValue(false);
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    const { getByTestId } = setup("required", APK);
    expect(getByTestId("update-button")).toHaveTextContent("Update");
    fireEvent.press(getByTestId("update-button"));
    await waitFor(() => expect(open).toHaveBeenCalledWith(APK));
    expect(downloadApk).not.toHaveBeenCalled();
  });
});

describe("UpdateScreen: Download update (an APK, installed inside the app)", () => {
  it("offers to download, and says what will happen", () => {
    const { getByTestId, getByText, queryByTestId } = setup("required", APK);
    expect(getByTestId("update-button")).toHaveTextContent("Download update");
    expect(getByText(/downloads here, then android asks you to confirm/i)).toBeTruthy();
    expect(queryByTestId("update-progress")).toBeNull();
  });

  it("downloads the APK as soon as it is pressed, showing the progress", async () => {
    const download = controlledDownload();
    const { getByTestId } = setup("required", APK);
    fireEvent.press(getByTestId("update-button"));

    await waitFor(() => expect(downloadApk).toHaveBeenCalledTimes(1));
    expect((downloadApk as jest.Mock).mock.calls[0].slice(0, 2)).toEqual([
      APK,
      "2.0.0",
    ]);
    expect(getByTestId("update-progress")).toBeTruthy();
    expect(getByTestId("update-button")).toHaveTextContent("Downloading… 0%");

    download.progress(0.42);
    expect(getByTestId("update-button")).toHaveTextContent("Downloading… 42%");
    expect(
      getByTestId("update-progress").props.accessibilityValue,
    ).toEqual({ min: 0, max: 100, now: 42 });
  });

  it("doesn't show a percentage while the size isn't known", async () => {
    const download = controlledDownload();
    const { getByTestId } = setup("required", APK);
    fireEvent.press(getByTestId("update-button"));
    await waitFor(() => expect(downloadApk).toHaveBeenCalled());
    download.progress(null);
    expect(getByTestId("update-button")).toHaveTextContent("Downloading…");
    expect(getByTestId("update-button")).not.toHaveTextContent("%");
  });

  it("ignores more presses while it downloads", async () => {
    controlledDownload();
    const { getByTestId } = setup("required", APK);
    fireEvent.press(getByTestId("update-button"));
    await waitFor(() => expect(downloadApk).toHaveBeenCalled());
    fireEvent.press(getByTestId("update-button"));
    fireEvent.press(getByTestId("update-button"));
    expect(downloadApk).toHaveBeenCalledTimes(1);
  });

  it("opens Android's installer with the downloaded file", async () => {
    const download = controlledDownload();
    const { getByTestId } = setup("required", APK);
    fireEvent.press(getByTestId("update-button"));
    await waitFor(() => expect(downloadApk).toHaveBeenCalled());
    await download.finish();
    await waitFor(() => expect(installApk).toHaveBeenCalledWith(FILE));
  });

  it("if the installer is closed without installing, installs again without downloading again", async () => {
    const download = controlledDownload();
    const { getByTestId, getByText } = setup("required", APK);
    fireEvent.press(getByTestId("update-button"));
    await waitFor(() => expect(downloadApk).toHaveBeenCalled());
    await download.finish();

    // The installer closed again: the shopper can try the install again.
    await waitFor(() =>
      expect(getByTestId("update-button")).toHaveTextContent("Install update"),
    );
    expect(getByText(/allow installs from near commerce/i)).toBeTruthy();

    fireEvent.press(getByTestId("update-button"));
    await waitFor(() => expect(installApk).toHaveBeenCalledTimes(2));
    expect(downloadApk).toHaveBeenCalledTimes(1);
  });

  it("stays on screen while the install is happening (the app is replaced once it is done)", async () => {
    (installApk as jest.Mock).mockReturnValue(new Promise(() => {}));
    const download = controlledDownload();
    const { getByTestId, queryByTestId, onContinue } = setup("required", APK);
    fireEvent.press(getByTestId("update-button"));
    await waitFor(() => expect(downloadApk).toHaveBeenCalled());
    await download.finish();
    await waitFor(() =>
      expect(getByTestId("update-button")).toHaveTextContent(
        "Opening the installer…",
      ),
    );
    expect(queryByTestId("update-screen")).not.toBeNull();
    expect(onContinue).not.toHaveBeenCalled();
  });

  describe("when something goes wrong", () => {
    it("says the download failed, and tries again from the start", async () => {
      const first = controlledDownload();
      const { getByTestId, findByText } = setup("required", APK);
      fireEvent.press(getByTestId("update-button"));
      await waitFor(() => expect(downloadApk).toHaveBeenCalled());
      await first.fail();

      expect(
        await findByText(/couldn't download the update/i),
      ).toBeTruthy();
      expect(getByTestId("update-button")).toHaveTextContent("Try again");

      const second = controlledDownload();
      fireEvent.press(getByTestId("update-button"));
      await waitFor(() => expect(downloadApk).toHaveBeenCalledTimes(2));
      await second.finish();
      await waitFor(() => expect(installApk).toHaveBeenCalledWith(FILE));
    });

    it("offers the browser as a last resort", async () => {
      const open = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
      const download = controlledDownload();
      const { getByTestId, findByTestId } = setup("required", APK);
      fireEvent.press(getByTestId("update-button"));
      await waitFor(() => expect(downloadApk).toHaveBeenCalled());
      await download.fail();

      fireEvent.press(await findByTestId("update-browser"));
      await waitFor(() => expect(open).toHaveBeenCalledWith(APK));
    });

    it("says so when the installer can't be opened, and tries only the install again", async () => {
      (installApk as jest.Mock).mockRejectedValueOnce(new Error("no installer"));
      const download = controlledDownload();
      const { getByTestId, findByText } = setup("required", APK);
      fireEvent.press(getByTestId("update-button"));
      await waitFor(() => expect(downloadApk).toHaveBeenCalled());
      await download.finish();

      expect(await findByText("Couldn't open the installer. Try again.")).toBeTruthy();
      fireEvent.press(getByTestId("update-button"));
      await waitFor(() => expect(installApk).toHaveBeenCalledTimes(2));
      expect(downloadApk).toHaveBeenCalledTimes(1);
    });
  });

  describe("cancelling", () => {
    it("a required update can cancel the download and start over", async () => {
      const download = controlledDownload();
      const { getByTestId, queryByTestId } = setup("required", APK);
      fireEvent.press(getByTestId("update-button"));
      await waitFor(() => expect(downloadApk).toHaveBeenCalled());

      fireEvent.press(getByTestId("update-cancel"));
      expect(download.cancel).toHaveBeenCalledTimes(1);
      await waitFor(() =>
        expect(getByTestId("update-button")).toHaveTextContent("Download update"),
      );
      expect(queryByTestId("update-progress")).toBeNull();
      expect(installApk).not.toHaveBeenCalled();
    });

    it("Continue on an optional update stops the download and carries on", async () => {
      const download = controlledDownload();
      const { getByTestId, onContinue } = setup("optional", APK);
      fireEvent.press(getByTestId("update-button"));
      await waitFor(() => expect(downloadApk).toHaveBeenCalled());

      fireEvent.press(getByTestId("update-continue"));
      expect(download.cancel).toHaveBeenCalledTimes(1);
      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it("an optional update has Continue rather than Cancel while downloading", async () => {
      controlledDownload();
      const { getByTestId, queryByTestId } = setup("optional", APK);
      fireEvent.press(getByTestId("update-button"));
      await waitFor(() => expect(downloadApk).toHaveBeenCalled());
      expect(queryByTestId("update-cancel")).toBeNull();
      expect(getByTestId("update-continue")).toBeTruthy();
    });

    it("stops the download when the screen goes away", async () => {
      const download = controlledDownload();
      const { getByTestId, unmount } = setup("required", APK);
      fireEvent.press(getByTestId("update-button"));
      await waitFor(() => expect(downloadApk).toHaveBeenCalled());
      unmount();
      expect(download.cancel).toHaveBeenCalledTimes(1);
    });
  });

  it("never shows an error toast for a cancelled download", async () => {
    controlledDownload();
    const { getByTestId } = setup("required", APK);
    fireEvent.press(getByTestId("update-button"));
    await waitFor(() => expect(downloadApk).toHaveBeenCalled());
    fireEvent.press(getByTestId("update-cancel"));
    await waitFor(() =>
      expect(getByTestId("update-button")).toHaveTextContent("Download update"),
    );
    expect(Toast.show).not.toHaveBeenCalled();
  });
});
