import { isStoreOpen, OperatingHours } from "../../utils/storeStatus";

describe("Store Timezone & Operating Hours (Task 3.2.3)", () => {
  const schedule: OperatingHours = {
    monday: { open: "09:00", close: "17:00" },
    tuesday: { open: "09:00", close: "17:00" },
    sunday: null, // explicitly closed
  };

  it("should return true if the current time is within operating hours for the given timezone", () => {
    // 2026-09-14 is a Monday. 12:00 PM UTC is 08:00 AM in America/New_York (Closed)
    const testDate = new Date("2026-09-14T12:00:00Z");
    expect(isStoreOpen(schedule, "America/New_York", testDate)).toBe(false);

    // 14:00 PM UTC is 10:00 AM in America/New_York (Open)
    const testDateOpen = new Date("2026-09-14T14:00:00Z");
    expect(isStoreOpen(schedule, "America/New_York", testDateOpen)).toBe(true);
  });

  it("should return false if the day is marked as null (closed)", () => {
    // 2026-09-13 is a Sunday.
    const testDate = new Date("2026-09-13T14:00:00Z");
    expect(isStoreOpen(schedule, "America/New_York", testDate)).toBe(false);
  });

  it("should return false gracefully if an invalid IANA timezone is provided", () => {
    const testDate = new Date("2026-09-14T14:00:00Z");
    expect(isStoreOpen(schedule, "Invalid/Timezone", testDate)).toBe(false);
  });

  it("should return false if closed flag is true", () => {
    const closedSchedule: OperatingHours = {
      monday: { open: "09:00", close: "17:00", closed: true },
    };
    const testDate = new Date("2026-09-14T14:00:00Z");
    expect(isStoreOpen(closedSchedule, "America/New_York", testDate)).toBe(
      false,
    );
  });

  it("should return false if openingHours or timezone is missing", () => {
    expect(
      isStoreOpen(null as unknown as OperatingHours, "America/New_York"),
    ).toBe(false);
    expect(isStoreOpen(schedule, "")).toBe(false);
  });
});
