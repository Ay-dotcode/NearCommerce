import { PRODUCT_FRESHNESS_THRESHOLD_DAYS } from "@/constants";
import { differenceInDays } from "date-fns";

export function isProductStale(
  lastVerifiedAt: Date | string | null,
  targetDate: Date = new Date(),
): boolean {
  if (!lastVerifiedAt) return true;

  const parsedDate =
    typeof lastVerifiedAt === "string"
      ? new Date(lastVerifiedAt)
      : lastVerifiedAt;
  if (Number.isNaN(parsedDate.getTime())) return true;

  return (
    differenceInDays(targetDate, parsedDate) > PRODUCT_FRESHNESS_THRESHOLD_DAYS
  );
}
