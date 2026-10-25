import { AnimatedSplash } from "@/components/AnimatedSplash";
import OnboardingScreen from "@/components/onboarding/OnboardingScreen";
import { ONBOARDING_SLIDES } from "@/components/onboarding/slides";
import SettingsContent from "@/components/settings/SettingsContent";
import { DialogProvider } from "@/components/ui";
import { ONBOARDING_SEEN_KEY } from "@/constants";
import {
  OnboardingProvider,
  useOnboarding,
} from "@/src/context/OnboardingContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

jest.mock("@/src/context/AuthContext", () => ({
  useAuth: () => ({ logout: jest.fn() }),
}));
jest.mock("@react-native-async-storage/async-storage", () => {
  const store: Record<string, string> = {};
  return {
    __store: store,
    getItem: jest.fn((k: string) => Promise.resolve(store[k] ?? null)),
    setItem: jest.fn((k: string, v: string) => {
      store[k] = v;
      return Promise.resolve();
    }),
    removeItem: jest.fn((k: string) => {
      delete store[k];
      return Promise.resolve();
    }),
  };
});
const storage = AsyncStorage as unknown as {
  __store: Record<string, string>;
  getItem: jest.Mock;
  setItem: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
  for (const k of Object.keys(storage.__store)) delete storage.__store[k];
});

function Probe() {
  const o = useOnboarding();
  return (
    <>
      <Text testID="state">
        {JSON.stringify({
          loaded: o.loaded,
          visible: o.visible,
          firstRun: o.firstRun,
        })}
      </Text>
      <Text testID="finish" onPress={o.finish}>
        finish
      </Text>
      <Text testID="open" onPress={o.open}>
        open
      </Text>
    </>
  );
}
const state = (r: ReturnType<typeof render>) =>
  JSON.parse(r.getByTestId("state").props.children);

describe("OnboardingProvider", () => {
  it("is shown on the very first launch", async () => {
    const r = render(
      <OnboardingProvider>
        <Probe />
      </OnboardingProvider>,
    );
    expect(state(r).loaded).toBe(false);
    await waitFor(() => expect(state(r).loaded).toBe(true));
    expect(state(r)).toEqual({ loaded: true, visible: true, firstRun: true });
  });

  it("remembers that it was finished and stays away next time", async () => {
    const first = render(
      <OnboardingProvider>
        <Probe />
      </OnboardingProvider>,
    );
    await waitFor(() => expect(state(first).visible).toBe(true));
    fireEvent.press(first.getByTestId("finish"));
    expect(state(first)).toMatchObject({ visible: false, firstRun: false });
    expect(storage.setItem).toHaveBeenCalledWith(ONBOARDING_SEEN_KEY, "1");
    first.unmount();

    const second = render(
      <OnboardingProvider>
        <Probe />
      </OnboardingProvider>,
    );
    await waitFor(() => expect(state(second).loaded).toBe(true));
    expect(state(second)).toEqual({
      loaded: true,
      visible: false,
      firstRun: false,
    });
  });

  it("can be replayed later without counting as a first run", async () => {
    storage.__store[ONBOARDING_SEEN_KEY] = "1";
    const r = render(
      <OnboardingProvider>
        <Probe />
      </OnboardingProvider>,
    );
    await waitFor(() => expect(state(r).loaded).toBe(true));
    fireEvent.press(r.getByTestId("open"));
    expect(state(r)).toEqual({ loaded: true, visible: true, firstRun: false });
    fireEvent.press(r.getByTestId("finish"));
    expect(state(r).visible).toBe(false);
  });

  it("never traps anyone behind the guide when the phone's storage fails", async () => {
    storage.getItem.mockRejectedValueOnce(new Error("disk"));
    const r = render(
      <OnboardingProvider>
        <Probe />
      </OnboardingProvider>,
    );
    await waitFor(() => expect(state(r).loaded).toBe(true));
    expect(state(r).visible).toBe(false);
  });
});

describe("OnboardingScreen", () => {
  const total = ONBOARDING_SLIDES.length;

  it("explains the app in plain language, one page at a time", () => {
    const { getByText } = render(<OnboardingScreen onFinish={jest.fn()} />);
    for (const slide of ONBOARDING_SLIDES) {
      expect(getByText(slide.title)).toBeTruthy();
      expect(getByText(slide.body)).toBeTruthy();
      for (const tip of slide.tips) expect(getByText(tip)).toBeTruthy();
    }
    expect(getByText(`1 / ${total}`)).toBeTruthy();
  });

  it("steps forward with Next and finishes on the last page", () => {
    const onFinish = jest.fn();
    const { getByTestId, getByText, queryByTestId } = render(
      <OnboardingScreen onFinish={onFinish} />,
    );
    for (let i = 1; i < total; i++) {
      expect(getByTestId("onboarding-next").props.accessibilityLabel).toBe(
        "Next",
      );
      fireEvent.press(getByTestId("onboarding-next"));
      expect(getByText(`${i + 1} / ${total}`)).toBeTruthy();
    }
    expect(onFinish).not.toHaveBeenCalled();
    expect(getByTestId("onboarding-next").props.accessibilityLabel).toBe(
      "Get started",
    );
    expect(queryByTestId("onboarding-skip")).toBeNull();

    fireEvent.press(getByTestId("onboarding-next"));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("can be skipped from any page before the last", () => {
    const onFinish = jest.fn();
    const { getByTestId } = render(<OnboardingScreen onFinish={onFinish} />);
    fireEvent.press(getByTestId("onboarding-next"));
    fireEvent.press(getByTestId("onboarding-skip"));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("covers the topics a newcomer needs, in language that matches the app", () => {
    const text = ONBOARDING_SLIDES.map((s) =>
      [s.title, s.body, ...s.tips].join(" "),
    ).join(" ");
    for (const word of [
      "nearby",
      "Search",
      "Favorites",
      "Lists",
      "invite code",
      "ZIP",
      "Directions",
      "verified",
    ])
      expect(text).toMatch(new RegExp(word, "i"));
  });
});

describe("AnimatedSplash", () => {
  it("waits for the app, then leaves", async () => {
    const onDone = jest.fn();
    const { rerender, getByTestId } = render(
      <AnimatedSplash ready={false} onDone={onDone} />,
    );
    expect(getByTestId("splash")).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();

    rerender(<AnimatedSplash ready onDone={onDone} />);
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it("announces itself to screen readers", () => {
    const { getByLabelText } = render(
      <AnimatedSplash ready={false} onDone={jest.fn()} />,
    );
    expect(getByLabelText("Loading Near Commerce")).toBeTruthy();
  });
});

describe("Settings → How Near Commerce works", () => {
  it("closes the drawer first, then replays the guide", async () => {
    storage.__store[ONBOARDING_SEEN_KEY] = "1";
    const onClose = jest.fn();
    const r = render(
      <DialogProvider>
        <OnboardingProvider>
          <SettingsContent
            onOpenZip={() => {}}
            onOpenSupport={() => {}}
            onClose={onClose}
          />
          <Probe />
        </OnboardingProvider>
      </DialogProvider>,
    );
    await waitFor(() => expect(state(r).loaded).toBe(true));
    expect(state(r).visible).toBe(false);

    await act(async () => {
      fireEvent.press(r.getByTestId("replay-onboarding"));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(state(r).visible).toBe(true);
  });
});
