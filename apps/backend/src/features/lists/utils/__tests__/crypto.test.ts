import { generateShortCode } from "../crypto";

describe("Lists Crypto Utils", () => {
  it("should generate an 8-character hex string in uppercase", () => {
    const code = generateShortCode();
    expect(code).toMatch(/^[0-9A-F]{8}$/);
  });

  it("should generate unique codes across multiple calls", () => {
    const codes = new Set();
    for (let i = 0; i < 50; i++) {
      codes.add(generateShortCode());
    }
    expect(codes.size).toBe(50);
  });
});
