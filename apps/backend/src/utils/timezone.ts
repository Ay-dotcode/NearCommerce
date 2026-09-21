import { formatInTimeZone } from "date-fns-tz";

export type DailyOperatingHours = {
  open: string;
  close: string;
  isClosed?: boolean;
  closed?: boolean;
};

export type OperatingHours = Record<string, DailyOperatingHours | null>;
export type StoreSchedule = OperatingHours;

export function checkIfStoreIsOpen(
  openingHours: StoreSchedule | null | undefined,
  ianaTimezone: string,
  targetDate: Date = new Date(),
): boolean {
  if (!openingHours || !ianaTimezone) return false;

  try {
    const currentDay = formatInTimeZone(
      targetDate,
      ianaTimezone,
      "EEEE",
    ).toLowerCase();
    const todaysHours = openingHours[currentDay];

    if (
      !todaysHours ||
      todaysHours.isClosed ||
      todaysHours.closed ||
      !todaysHours.open ||
      !todaysHours.close
    )
      return false;

    const currentTime = formatInTimeZone(targetDate, ianaTimezone, "HH:mm");
    return currentTime >= todaysHours.open && currentTime <= todaysHours.close;
  } catch {
    return false;
  }
}
