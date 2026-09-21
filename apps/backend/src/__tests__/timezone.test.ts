import { checkIfStoreIsOpen } from "@/utils/timezone";

describe("Store timezone evaluation", () => {
  const wednesday = new Date("2023-10-25T12:00:00Z");

  it("evaluates the schedule in the store timezone", () => {
    const schedule = {
      wednesday: { open: "09:00", close: "17:00" },
    };

    expect(checkIfStoreIsOpen(schedule, "America/New_York", wednesday)).toBe(
      false,
    );
    expect(checkIfStoreIsOpen(schedule, "Europe/Berlin", wednesday)).toBe(true);
  });

  it("honors an explicitly closed day and invalid timezone", () => {
    const closedSchedule = {
      wednesday: { open: "09:00", close: "17:00", isClosed: true },
    };

    expect(checkIfStoreIsOpen(closedSchedule, "Europe/Berlin", wednesday)).toBe(
      false,
    );
    expect(
      checkIfStoreIsOpen(closedSchedule, "Invalid/Timezone", wednesday),
    ).toBe(false);
  });

  it("treats the closing time as open", () => {
    const closingTime = new Date("2023-10-25T15:00:00Z");
    const schedule = {
      wednesday: { open: "09:00", close: "17:00" },
    };

    expect(checkIfStoreIsOpen(schedule, "Europe/Berlin", closingTime)).toBe(
      true,
    );
  });
});
