import { Platform } from "react-native";

// The global setup replaces this module with a stub; this file tests the real one.
jest.unmock("@/helpers/locationIndicator");

const mockNotifications = {
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  scheduleNotificationAsync: jest.fn(async () => "nearcommerce-location-status"),
  dismissNotificationAsync: jest.fn(async () => undefined),
  AndroidImportance: { LOW: 4 },
  AndroidNotificationPriority: { LOW: -1 },
};
const mockLiveActivity = {
  startActivity: jest.fn(
    (_state?: unknown, _config?: unknown): string | undefined => "activity-1",
  ),
  stopActivity: jest.fn(),
};
const mockVoltra = {
  upsertAndroidOngoingNotification: jest.fn(),
  stopAndroidOngoingNotification: jest.fn(async () => ({ ok: true })),
};
jest.mock("expo-notifications", () => mockNotifications);
jest.mock("@use-voltra/android-client", () => mockVoltra);
jest.mock("expo-live-activity", () => mockLiveActivity);

import {
  LOCATION_CHANNEL_ID,
  LOCATION_INDICATOR_TITLE,
  MIN_VISIBLE_MS,
  startLocationIndicator,
  withLocationIndicator,
} from "@/helpers/locationIndicator";

const setOS = (os: "ios" | "android" | "web") =>
  Object.defineProperty(Platform, "OS", { get: () => os, configurable: true });

// Lets the async show() chain settle without moving the fake clock.
const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockNotifications.getPermissionsAsync.mockResolvedValue({
    granted: true,
    canAskAgain: true,
  });
  mockLiveActivity.startActivity.mockReturnValue("activity-1");
  // Default: Live Updates unavailable, so Android tests below exercise the plain notification.
  mockVoltra.upsertAndroidOngoingNotification.mockRejectedValue(
    new Error("no native module"),
  );
});

afterEach(() => {
  jest.useRealTimers();
});

describe("on iOS", () => {
  beforeEach(() => setOS("ios"));

  it("starts a Live Activity and ends it once the minimum time has passed", async () => {
    const stop = startLocationIndicator();
    await flush();
    expect(mockLiveActivity.startActivity).toHaveBeenCalledTimes(1);
    expect(mockLiveActivity.startActivity.mock.calls[0][0]).toMatchObject({
      title: LOCATION_INDICATOR_TITLE,
    });

    const stopped = stop();
    await flush();
    expect(mockLiveActivity.stopActivity).not.toHaveBeenCalled();
    jest.advanceTimersByTime(MIN_VISIBLE_MS);
    await stopped;
    expect(mockLiveActivity.stopActivity).toHaveBeenCalledWith(
      "activity-1",
      expect.objectContaining({ title: LOCATION_INDICATOR_TITLE }),
    );
  });

  it("does nothing, and does not throw, when Live Activities are unavailable", async () => {
    mockLiveActivity.startActivity.mockReturnValue(undefined);
    const stop = startLocationIndicator();
    await flush();
    await expect(stop()).resolves.toBeUndefined();
    expect(mockLiveActivity.stopActivity).not.toHaveBeenCalled();
    // Never falls back to a notification on iOS.
    expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("shares one Live Activity between overlapping readers and ends it with the last", async () => {
    const stopA = startLocationIndicator();
    const stopB = startLocationIndicator();
    await flush();
    expect(mockLiveActivity.startActivity).toHaveBeenCalledTimes(1);

    await stopA();
    expect(mockLiveActivity.stopActivity).not.toHaveBeenCalled();

    const lastStopped = stopB();
    await flush();
    jest.advanceTimersByTime(MIN_VISIBLE_MS);
    await lastStopped;
    expect(mockLiveActivity.stopActivity).toHaveBeenCalledTimes(1);
  });
});

describe("on Android", () => {
  beforeEach(() => setOS("android"));

  it("posts a silent, ongoing notification on its own channel and dismisses it afterwards", async () => {
    const stop = startLocationIndicator();
    await flush();

    expect(mockNotifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      LOCATION_CHANNEL_ID,
      expect.objectContaining({ importance: 4, enableVibrate: false }),
    );
    expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: LOCATION_INDICATOR_TITLE,
          sticky: true,
          autoDismiss: false,
        }),
        trigger: { channelId: LOCATION_CHANNEL_ID },
      }),
    );

    const stopped = stop();
    await flush();
    jest.advanceTimersByTime(MIN_VISIBLE_MS);
    await stopped;
    expect(mockNotifications.dismissNotificationAsync).toHaveBeenCalledWith(
      "nearcommerce-location-status",
    );
  });

  it("asks for the notification permission when it hasn't been decided yet", async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: true,
    });
    mockNotifications.requestPermissionsAsync.mockResolvedValue({
      granted: true,
    });
    const stop = startLocationIndicator();
    await flush();
    expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const stopped = stop();
    await flush();
    jest.advanceTimersByTime(MIN_VISIBLE_MS);
    await stopped;
  });

  it("skips quietly when notifications are blocked", async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: false,
    });
    const stop = startLocationIndicator();
    await flush();
    await expect(stop()).resolves.toBeUndefined();
    expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("never lets a notification failure break the location read", async () => {
    mockNotifications.scheduleNotificationAsync.mockRejectedValueOnce(
      new Error("boom"),
    );
    await expect(withLocationIndicator(async () => "coords")).resolves.toBe(
      "coords",
    );
    await flush();
  });
});

describe("on Android, as an Android 16 Live Update", () => {
  beforeEach(() => {
    setOS("android");
    mockVoltra.upsertAndroidOngoingNotification.mockResolvedValue({
      ok: true,
      notificationId: "nearcommerce-location-status",
      action: "started",
    });
  });

  it("posts a promoted ongoing progress notification instead of a plain one", async () => {
    const stop = startLocationIndicator();
    await flush();

    // The channel has to exist before Voltra can post to it.
    expect(mockNotifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      LOCATION_CHANNEL_ID,
      expect.anything(),
    );
    const [payload, options] =
      mockVoltra.upsertAndroidOngoingNotification.mock.calls[0];
    expect(payload).toMatchObject({
      kind: "progress",
      title: LOCATION_INDICATOR_TITLE,
      indeterminate: true,
    });
    expect(payload.shortCriticalText.length).toBeLessThanOrEqual(7);
    expect(options).toMatchObject({
      channelId: LOCATION_CHANNEL_ID,
      requestPromotedOngoing: true,
      fallbackBehavior: "standard",
    });
    expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();

    const stopped = stop();
    await flush();
    jest.advanceTimersByTime(MIN_VISIBLE_MS);
    await stopped;
    expect(mockVoltra.stopAndroidOngoingNotification).toHaveBeenCalledWith(
      "nearcommerce-location-status",
    );
  });

  it("falls back to a plain notification when Live Updates refuse", async () => {
    mockVoltra.upsertAndroidOngoingNotification.mockResolvedValue({
      ok: false,
      reason: "already_exists",
    });
    const stop = startLocationIndicator();
    await flush();
    expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const stopped = stop();
    await flush();
    jest.advanceTimersByTime(MIN_VISIBLE_MS);
    await stopped;
    expect(mockVoltra.stopAndroidOngoingNotification).not.toHaveBeenCalled();
    expect(mockNotifications.dismissNotificationAsync).toHaveBeenCalled();
  });

  it("does not post anything when notifications are blocked (Live Updates need the permission too)", async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: false,
    });
    const stop = startLocationIndicator();
    await flush();
    await stop();
    expect(mockVoltra.upsertAndroidOngoingNotification).not.toHaveBeenCalled();
    expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

describe("withLocationIndicator", () => {
  beforeEach(() => setOS("ios"));

  it("returns the task's result straight away, without waiting for the minimum display time", async () => {
    const result = await withLocationIndicator(async () => 42);
    expect(result).toBe(42);
    expect(mockLiveActivity.stopActivity).not.toHaveBeenCalled();
    await flush();
    jest.advanceTimersByTime(MIN_VISIBLE_MS);
    await flush();
    expect(mockLiveActivity.stopActivity).toHaveBeenCalledTimes(1);
  });

  it("still ends the indicator when the task fails", async () => {
    await expect(
      withLocationIndicator(async () => {
        throw new Error("no fix");
      }),
    ).rejects.toThrow("no fix");
    await flush();
    jest.advanceTimersByTime(MIN_VISIBLE_MS);
    await flush();
    expect(mockLiveActivity.stopActivity).toHaveBeenCalledTimes(1);
  });
});

describe("on other platforms", () => {
  it("does nothing", async () => {
    setOS("web");
    const stop = startLocationIndicator();
    await flush();
    await stop();
    expect(mockLiveActivity.startActivity).not.toHaveBeenCalled();
    expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
