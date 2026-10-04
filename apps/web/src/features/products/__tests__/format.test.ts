import { formatPrice, timeAgo } from "@/features/products/lib/format";

describe("timeAgo", () => {
  const now = new Date("2026-10-03T12:00:00Z").getTime();
  const ago = (ms: number) => new Date(now - ms).toISOString();
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  it.each([
    [10_000, "just now"],
    [MIN, "1 minute ago"],
    [45 * MIN, "45 minutes ago"],
    [HOUR, "1 hour ago"],
    [5 * HOUR, "5 hours ago"],
    [DAY, "1 day ago"],
    [29 * DAY, "29 days ago"],
    [30 * DAY, "1 month ago"],
    [90 * DAY, "3 months ago"],
    [400 * DAY, "1 year ago"],
  ])("%d ms -> %s", (ms, expected) => {
    expect(timeAgo(ago(ms), now)).toBe(expected);
  });

  it("never goes negative for clock skew", () => {
    expect(timeAgo(new Date(now + 5 * MIN).toISOString(), now)).toBe(
      "just now",
    );
  });

  it("handles missing or invalid dates", () => {
    expect(timeAgo(undefined, now)).toBe("unknown");
    expect(timeAgo("not a date", now)).toBe("unknown");
  });
});

describe("formatPrice", () => {
  it("always shows two decimals with thousands separators", () => {
    expect(formatPrice(2.4)).toBe("2.40");
    expect(formatPrice(1234.5)).toBe("1,234.50");
    expect(formatPrice(0)).toBe("0.00");
  });
  it("accepts numeric strings from DECIMAL columns", () => {
    expect(formatPrice("19.9")).toBe("19.90");
  });
  it("returns non-numeric input unchanged", () => {
    expect(formatPrice("n/a")).toBe("n/a");
  });
});
