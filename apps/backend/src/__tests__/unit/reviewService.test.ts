import { displayName } from "@/services/review.service";
import {
  CreateReviewSchema,
  ReviewListQuerySchema,
  UpdateReviewSchema,
} from "@nearcommerce/api";

describe("displayName", () => {
  it.each([
    ["Jane Doe", "Jane D."],
    ["  jane   van der berg ", "jane B."],
    ["Madonna", "Madonna"],
    ["", "Shopper"],
    [null, "Shopper"],
  ])("%p -> %p", (input, expected) => {
    expect(displayName(input)).toBe(expected);
  });
});

describe("review schemas", () => {
  const id = "11111111-1111-4111-8111-111111111111";

  it("requires exactly one target", () => {
    expect(CreateReviewSchema.safeParse({ rating: 3 }).success).toBe(false);
    expect(
      CreateReviewSchema.safeParse({ storeId: id, productId: id, rating: 3 })
        .success,
    ).toBe(false);
    expect(
      CreateReviewSchema.safeParse({ storeId: id, rating: 3 }).success,
    ).toBe(true);
  });

  it("trims comments and accepts null", () => {
    const parsed = CreateReviewSchema.parse({
      storeId: id,
      rating: 3,
      comment: "  hi ",
    });
    expect(parsed.comment).toBe("hi");
    expect(
      CreateReviewSchema.safeParse({ storeId: id, rating: 3, comment: null })
        .success,
    ).toBe(true);
  });

  it("update needs at least one field", () => {
    expect(UpdateReviewSchema.safeParse({}).success).toBe(false);
    expect(UpdateReviewSchema.safeParse({ comment: null }).success).toBe(true);
  });

  it("list query applies defaults and caps the page size", () => {
    expect(ReviewListQuerySchema.parse({ store_id: id })).toMatchObject({
      page: 1,
      limit: 20,
    });
    expect(
      ReviewListQuerySchema.safeParse({ store_id: id, limit: "51" }).success,
    ).toBe(false);
  });
});
