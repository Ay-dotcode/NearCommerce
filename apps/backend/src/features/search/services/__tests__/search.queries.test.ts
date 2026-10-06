import {
  SqlParams,
  containsPattern,
  distanceExpr,
  productVisibilityWhere,
} from "@/features/search/services/search.queries";
import { escapeLike } from "@/utils/like";
import { toRating } from "@/utils/ratings";

const base = { lat: 35.1, lng: 33.3, radius_meters: 5000 };
const CAT = "11111111-1111-4111-8111-111111111111";
const SUB = "22222222-2222-4222-8222-222222222222";

describe("SqlParams", () => {
  it("numbers placeholders in the order values are added", () => {
    const p = new SqlParams();
    expect(p.add("a")).toBe("$1");
    expect(p.add(2)).toBe("$2");
    expect(p.values).toEqual(["a", 2]);
  });
});

describe("productVisibilityWhere", () => {
  it("always requires published, in-stock, active store AND active owner", () => {
    const sql = productVisibilityWhere(new SqlParams(), base);
    expect(sql).toContain("p.is_published = true");
    expect(sql).toContain("p.quantity > 0");
    expect(sql).toContain("s.is_suspended = false");
    expect(sql).toContain("u.is_suspended = false"); // owner suspension (SRS 3.2.1)
  });

  it("binds lat, lng and radius as $1..$3 and adds nothing else without filters", () => {
    const params = new SqlParams();
    const sql = productVisibilityWhere(params, base);
    expect(params.values).toEqual([35.1, 33.3, 5000]);
    expect(sql).toContain("earth_box(ll_to_earth($1, $2), $3)");
    expect(sql).not.toContain("subcategory");
  });

  it("filters by a whole category through its subcategories", () => {
    const params = new SqlParams();
    const sql = productVisibilityWhere(params, { ...base, category_id: CAT });
    expect(params.values).toEqual([35.1, 33.3, 5000, CAT]);
    expect(sql).toContain("parent_category_id = $4");
  });

  it("filters by a subcategory directly", () => {
    const params = new SqlParams();
    const sql = productVisibilityWhere(params, {
      ...base,
      subcategory_id: SUB,
    });
    expect(params.values).toEqual([35.1, 33.3, 5000, SUB]);
    expect(sql).toContain("p.subcategory_id = $4");
  });

  it("lets the narrower subcategory win when both are sent", () => {
    const params = new SqlParams();
    const sql = productVisibilityWhere(params, {
      ...base,
      category_id: CAT,
      subcategory_id: SUB,
    });
    expect(params.values).toEqual([35.1, 33.3, 5000, SUB]);
    expect(sql).not.toContain("parent_category_id");
  });

  it("leaves later placeholders to the caller, continuing the numbering", () => {
    const params = new SqlParams();
    productVisibilityWhere(params, { ...base, subcategory_id: SUB });
    expect(params.add("%milk%")).toBe("$5");
  });
});

describe("distanceExpr", () => {
  it("uses the given placeholders", () => {
    expect(distanceExpr("$1", "$2")).toBe(
      "earth_distance(ll_to_earth($1, $2), ll_to_earth(s.latitude, s.longitude))",
    );
  });
});

describe("LIKE escaping", () => {
  it.each([
    ["milk", "%milk%"],
    ["100%", "%100\\%%"],
    ["a_b", "%a\\_b%"],
    ["back\\slash", "%back\\\\slash%"],
  ])("containsPattern(%j) -> %j", (input, expected) => {
    expect(containsPattern(input)).toBe(expected);
  });

  it("escapeLike only touches wildcard characters", () => {
    expect(escapeLike("plain text 123")).toBe("plain text 123");
  });
});

describe("toRating", () => {
  it("passes real values through", () => {
    expect(toRating({ rating_avg: 4.3, review_count: 12 })).toEqual({
      rating: 4.3,
      review_count: 12,
    });
  });
  it("reports unreviewed items as 0 / 0", () => {
    expect(toRating({ rating_avg: null, review_count: 0 })).toEqual({
      rating: 0,
      review_count: 0,
    });
    expect(toRating({})).toEqual({ rating: 0, review_count: 0 });
  });
});
