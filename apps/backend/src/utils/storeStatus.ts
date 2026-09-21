export {
  checkIfStoreIsOpen,
  type OperatingHours,
  type StoreSchedule,
} from "@/utils/timezone";

import { checkIfStoreIsOpen, StoreSchedule } from "@/utils/timezone";

export function isStoreOpen(
  openingHours: StoreSchedule | null | undefined,
  timezone: string,
  targetDate: Date = new Date(),
): boolean {
  return checkIfStoreIsOpen(openingHours, timezone, targetDate);
}
