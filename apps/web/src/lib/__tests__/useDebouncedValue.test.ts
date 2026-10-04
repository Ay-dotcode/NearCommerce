import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { act, renderHook } from "@testing-library/react";

describe("useDebouncedValue", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebouncedValue("a", 300));
    expect(result.current).toBe("a");
  });

  it("only updates after the value has been stable for the delay", () => {
    const { result, rerender } = renderHook(
      ({ v }) => useDebouncedValue(v, 300),
      { initialProps: { v: "a" } },
    );
    rerender({ v: "ab" });
    act(() => void jest.advanceTimersByTime(200));
    rerender({ v: "abc" });
    act(() => void jest.advanceTimersByTime(200));
    expect(result.current).toBe("a"); // timer restarted by the second change
    act(() => void jest.advanceTimersByTime(100));
    expect(result.current).toBe("abc");
  });
});
