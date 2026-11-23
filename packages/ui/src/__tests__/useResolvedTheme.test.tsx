import { useResolvedTheme } from "@nearcommerce/ui/src/index";
import { act, renderHook, waitFor } from "@testing-library/react";

let darkDevice = false;
const listeners = new Set<() => void>();

beforeEach(() => {
  darkDevice = false;
  listeners.clear();
  delete document.documentElement.dataset.theme;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("dark") ? darkDevice : false,
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    }),
  });
});

describe("useResolvedTheme", () => {
  it("follows the device when no theme is forced", () => {
    expect(renderHook(() => useResolvedTheme()).result.current).toBe("light");
    darkDevice = true;
    expect(renderHook(() => useResolvedTheme()).result.current).toBe("dark");
  });

  it("a theme forced on <html> wins over the device", () => {
    darkDevice = true;
    document.documentElement.dataset.theme = "light";
    expect(renderHook(() => useResolvedTheme()).result.current).toBe("light");
  });

  it("updates when the theme toggle changes data-theme", async () => {
    const { result } = renderHook(() => useResolvedTheme());
    expect(result.current).toBe("light");
    act(() => {
      document.documentElement.dataset.theme = "dark";
    });
    await waitFor(() => expect(result.current).toBe("dark"));
    act(() => {
      delete document.documentElement.dataset.theme;
    });
    await waitFor(() => expect(result.current).toBe("light"));
  });

  it("updates when the device switches while following it", () => {
    const { result } = renderHook(() => useResolvedTheme());
    act(() => {
      darkDevice = true;
      listeners.forEach((notify) => notify());
    });
    expect(result.current).toBe("dark");
  });

  it("stops listening when unmounted", () => {
    const { unmount } = renderHook(() => useResolvedTheme());
    expect(listeners.size).toBe(1);
    unmount();
    expect(listeners.size).toBe(0);
  });
});
