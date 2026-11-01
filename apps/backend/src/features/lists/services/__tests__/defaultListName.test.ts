import { defaultListName } from "@/features/lists/services/list.service";

describe("defaultListName", () => {
  it("is the first name followed by 's list", () => {
    expect(defaultListName("Joseph Smith")).toBe("Joseph's list");
    expect(defaultListName("Ayşe")).toBe("Ayşe's list");
  });

  it("uses only the first word, ignoring extra spaces", () => {
    expect(defaultListName("  Jean   Luc Picard ")).toBe("Jean's list");
  });

  it("falls back to a plain name when there is no usable first name", () => {
    expect(defaultListName("")).toBe("My list");
    expect(defaultListName("   ")).toBe("My list");
    expect(defaultListName(null)).toBe("My list");
    expect(defaultListName(undefined)).toBe("My list");
  });

  it("stays within the 100-character list name limit, without splitting a character", () => {
    const name = defaultListName(`${"😀".repeat(200)} Smith`);
    expect(Array.from(name).length).toBeLessThanOrEqual(100);
    expect(name.endsWith("'s list")).toBe(true);
    expect(name).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
  });
});
