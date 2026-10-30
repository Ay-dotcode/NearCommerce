import { Platform } from "react-native";

export const LOCATION_CHANNEL_ID = "location-status";
export const LOCATION_NOTIFICATION_ID = "nearcommerce-location-status";
export const LOCATION_INDICATOR_TITLE = "Getting your location";
export const LOCATION_INDICATOR_BODY =
  "Near Commerce is finding shops near you.";
export const LOCATION_INDICATOR_DONE_BODY = "Showing shops near you.";
// A GPS fix can take under a second, which would make the indicator flash by unseen.
export const MIN_VISIBLE_MS = 2000;

const BRAND_BLUE = "#2563EB";

type ActiveIndicator = { shownAt: number; end: () => Promise<void> };

let holders = 0;
let active: Promise<ActiveIndicator | null> | null = null;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function loadNotifications(): typeof import("expo-notifications") | null {
  try {
    return require("expo-notifications");
  } catch {
    return null;
  }
}

function loadLiveActivity(): typeof import("expo-live-activity") | null {
  try {
    return require("expo-live-activity");
  } catch {
    return null;
  }
}

async function showLiveActivity(): Promise<ActiveIndicator | null> {
  const LiveActivity = loadLiveActivity();
  if (!LiveActivity) return null;
  const id = LiveActivity.startActivity(
    { title: LOCATION_INDICATOR_TITLE, subtitle: LOCATION_INDICATOR_BODY },
    {
      backgroundColor: BRAND_BLUE,
      titleColor: "#FFFFFF",
      subtitleColor: "#DBEAFE",
      deepLinkUrl: "/",
    },
  );
  // undefined: Live Activities are unavailable (iOS < 16.2) or switched off by the shopper.
  if (!id) return null;
  return {
    shownAt: Date.now(),
    end: async () => {
      LiveActivity.stopActivity(id, {
        title: LOCATION_INDICATOR_TITLE,
        subtitle: LOCATION_INDICATOR_DONE_BODY,
      });
    },
  };
}

async function showAndroidNotification(): Promise<ActiveIndicator | null> {
  const Notifications = loadNotifications();
  if (!Notifications) return null;

  // Android 13+ needs the notification permission. Without it the indicator is skipped quietly
  // (the location read itself must carry on).
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain)
    permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return null;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  await Notifications.setNotificationChannelAsync(LOCATION_CHANNEL_ID, {
    name: "Location status",
    description: "Shown while Near Commerce is getting your location.",
    // LOW: no sound, no heads-up pop-up, still shown in the status bar and the shade.
    importance: Notifications.AndroidImportance.LOW,
    enableVibrate: false,
    showBadge: false,
  });
  const id = await Notifications.scheduleNotificationAsync({
    identifier: LOCATION_NOTIFICATION_ID,
    content: {
      title: LOCATION_INDICATOR_TITLE,
      body: LOCATION_INDICATOR_BODY,
      color: BRAND_BLUE,
      sticky: true,
      autoDismiss: false,
      priority: Notifications.AndroidNotificationPriority.LOW,
    },
    trigger: { channelId: LOCATION_CHANNEL_ID },
  });
  return {
    shownAt: Date.now(),
    end: () => Notifications.dismissNotificationAsync(id),
  };
}

async function show(): Promise<ActiveIndicator | null> {
  try {
    if (Platform.OS === "ios") return await showLiveActivity();
    if (Platform.OS === "android") return await showAndroidNotification();
  } catch {
    // Indicator is best-effort.
  }
  return null;
}

// Starts showing the indicator and returns a function that stops it. Overlapping callers (the
// home screen, the layout and the settings drawer can all read the location at once) share a
// single indicator, which goes away when the last of them stops.
export function startLocationIndicator(): () => Promise<void> {
  holders++;
  if (!active) active = show();
  let released = false;

  return async () => {
    if (released) return;
    released = true;
    holders--;
    if (holders > 0) return;

    const current = active;
    try {
      const shown = await current;
      if (shown) {
        const remaining = MIN_VISIBLE_MS - (Date.now() - shown.shownAt);
        if (remaining > 0) await sleep(remaining);
      }
      // Someone started reading the location again while we waited: keep it up for them.
      if (holders > 0 || active !== current) return;
      active = null;
      await shown?.end();
    } catch {
      if (active === current) active = null;
    }
  };
}

// Shows the indicator for the duration of `task`. The caller gets the task's result straight
// away; the indicator lingers for MIN_VISIBLE_MS in the background.
export async function withLocationIndicator<T>(
  task: () => Promise<T>,
): Promise<T> {
  const stop = startLocationIndicator();
  try {
    return await task();
  } finally {
    void stop();
  }
}
