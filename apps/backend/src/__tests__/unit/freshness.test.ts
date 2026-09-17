import { PRODUCT_FRESHNESS_THRESHOLD_DAYS } from "@/constants";
import { subDays } from "date-fns";
import { isProductStale } from "../../utils/freshness";

describe("Product Freshness Engine (Task 3.2.4)", () => {
  it(`should return true if the product was last verified more than ${PRODUCT_FRESHNESS_THRESHOLD_DAYS} days ago`, () => {
    const staleDate = subDays(new Date(), PRODUCT_FRESHNESS_THRESHOLD_DAYS + 1);
    expect(isProductStale(staleDate)).toBe(true);
  });

  it(`should return false if the product was verified within the last ${PRODUCT_FRESHNESS_THRESHOLD_DAYS} days`, () => {
    const freshDate = subDays(
      new Date(),
      Math.floor(PRODUCT_FRESHNESS_THRESHOLD_DAYS / 2),
    );
    expect(isProductStale(freshDate)).toBe(false);
  });

  it(`should return false if verified exactly ${PRODUCT_FRESHNESS_THRESHOLD_DAYS} days ago`, () => {
    const exactDate = subDays(new Date(), PRODUCT_FRESHNESS_THRESHOLD_DAYS);
    expect(isProductStale(exactDate)).toBe(false);
  });

  it("should return true if lastVerifiedAt is null", () => {
    expect(isProductStale(null)).toBe(true);
  });
});
