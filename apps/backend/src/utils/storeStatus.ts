import { formatInTimeZone } from "date-fns-tz";

export type OperatingHours = {
  [day: string]: { open: string; close: string; closed?: boolean } | null;
};

// Evaluates if a store is currently open based on its IANA timezone and JSONB schedule.
export function isStoreOpen(
  openingHours: OperatingHours,
  timezone: string,
  targetDate: Date = new Date(),
): boolean {
  if (!openingHours || !timezone) return false;

  try {
    // Extract the current day in the store's timezone (e.g., 'monday')
    const dayOfWeek = formatInTimeZone(
      targetDate,
      timezone,
      "EEEE",
    ).toLowerCase();
    const todaySchedule = openingHours[dayOfWeek];

    if (
      !todaySchedule ||
      todaySchedule.closed ||
      !todaySchedule.open ||
      !todaySchedule.close
    )
      return false; // Closed today or schedule missing

    // Extract the current 24h time in the store's timezone (e.g., '14:30')
    const currentTime = formatInTimeZone(targetDate, timezone, "HH:mm");

    return (
      currentTime >= todaySchedule.open && currentTime < todaySchedule.close
    );
  } catch (error) {
    // Gracefully handle invalid IANA timezone strings
    return false;
  }
}
