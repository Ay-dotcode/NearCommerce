import type { OpeningHours } from "@/types/stores";
import { WEEKDAYS, type Weekday } from "@nearcommerce/api";

export interface DayState {
  open: string;
  close: string;
  isClosed: boolean;
}
export type HoursState = Record<Weekday, DayState>;

export const DAY_LABELS: Record<Weekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export const defaultHours = (): HoursState => ({
  monday: { open: "09:00", close: "18:00", isClosed: false },
  tuesday: { open: "09:00", close: "18:00", isClosed: false },
  wednesday: { open: "09:00", close: "18:00", isClosed: false },
  thursday: { open: "09:00", close: "18:00", isClosed: false },
  friday: { open: "09:00", close: "18:00", isClosed: false },
  saturday: { open: "10:00", close: "16:00", isClosed: false },
  sunday: { open: "09:00", close: "18:00", isClosed: true },
});

// API -> editor state. Missing or null days are shown as closed.
export function hoursFromApi(hours: OpeningHours | undefined | null): HoursState {
  const base = defaultHours();
  for (const day of WEEKDAYS) {
    const value = hours?.[day];
    base[day] = value
      ? { open: value.open, close: value.close, isClosed: Boolean(value.isClosed || (value as any).closed) }
      : { ...base[day], isClosed: true };
  }
  return base;
}

// Editor state -> API payload (all seven days, explicit isClosed).
export function hoursToPayload(hours: HoursState) {
  return Object.fromEntries(WEEKDAYS.map((day) => [day, { ...hours[day] }])) as Record<Weekday, DayState>;
}
