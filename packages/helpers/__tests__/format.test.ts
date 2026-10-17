import {
  formatPrice,
  timeAgo,
  formatDate,
  formatKm,
  formatDistance,
  formatShortDate,
  initialOf,
  pluralize,
} from "../src/format";

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

describe("pluralize / formatKm", () => {
  it("uses the singular for exactly one and adds s otherwise", () => {
    expect(pluralize(1, "day")).toBe("1 day");
    expect(pluralize(0, "day")).toBe("0 days");
    expect(pluralize(2, "category", "categories")).toBe("2 categories");
    expect(formatKm(1)).toBe("1 km");
    expect(formatKm(5)).toBe("5 km");
  });
});

describe("formatDate / formatShortDate / initialOf", () => {
  it("formats real dates and refuses bad ones", () => {
    expect(formatDate("2026-10-12T10:00:00Z")).toBe("12 Oct 2026");
    expect(formatDate(undefined)).toBe("unknown");
    expect(formatDate("not a date")).toBe("unknown");
    expect(formatShortDate("2026-10-12")).toBe("12 Oct");
  });

  it("takes the first letter of a name for an avatar, with a fallback", () => {
    expect(initialOf("  jane doe")).toBe("J");
    expect(initialOf("")).toBe("?");
  });
});

describe("formatDistance", () => {
  it("shows kilometres with one decimal, and metres when under a kilometre", () => {
    expect(formatDistance(1234)).toBe("1.2 km");
    expect(formatDistance(5000)).toBe("5.0 km");
    expect(formatDistance(420.4)).toBe("420 m");
    expect(formatDistance(NaN)).toBe("unknown");
  });
});
