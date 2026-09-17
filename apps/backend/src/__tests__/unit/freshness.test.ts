import { subDays } from "date-fns";
import { isProductStale } from "../../utils/freshness";

describe("Product Freshness Engine (Task 3.2.4)", () => {
  it("should return true if the product was last verified more than 30 days ago", () => {
    const staleDate = subDays(new Date(), 31);
    expect(isProductStale(staleDate)).toBe(true);
  });

  it("should return false if the product was verified within the last 30 days", () => {
    const freshDate = subDays(new Date(), 15);
    expect(isProductStale(freshDate)).toBe(false);
  });

  it("should return false if verified exactly 30 days ago", () => {
    const exactDate = subDays(new Date(), 30);
    expect(isProductStale(exactDate)).toBe(false);
  });

  it("should return true if lastVerifiedAt is null", () => {
    expect(isProductStale(null)).toBe(true);
  });
});
