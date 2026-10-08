import {
  describeProductImage,
  parseVisionReply,
  withCircuitBreaker,
} from "@/utils/circuitBreaker";

describe("Circuit Breaker Utility", () => {
  it("should resolve if promise completes before timeout", async () => {
    const fastPromise = new Promise<string>((resolve) =>
      setTimeout(() => resolve("success"), 50),
    );
    const result = await withCircuitBreaker(fastPromise, 200);
    expect(result).toBe("success");
  });

  it("should reject with timeout error if operation exceeds timeoutMs", async () => {
    const slowPromise = new Promise<string>((resolve) =>
      setTimeout(() => resolve("too late"), 200),
    );

    await expect(withCircuitBreaker(slowPromise, 50)).rejects.toThrow(
      /Circuit breaker triggered: operation exceeded 50ms/,
    );
  });
});

describe("parseVisionReply", () => {
  it.each([
    ["whole milk", "whole milk"],
    ['  "Whole Milk."  ', "Whole Milk"],
    ["red apples\nThe image shows a bag of red apples.", "red apples"],
    ["\n\n  usb c cable ", "usb c cable"],
  ])("cleans %j into %j", (reply, expected) => {
    expect(parseVisionReply(reply)).toBe(expected);
  });

  it.each([["NONE"], ["none."], ["  None  "], [""], [undefined]])(
    "treats %j as no product",
    (reply) => {
      expect(parseVisionReply(reply)).toBeNull();
    },
  );

  it("caps very long replies", () => {
    expect(parseVisionReply("a".repeat(500))).toHaveLength(100);
  });
});

describe("describeProductImage", () => {
  const originalKey = process.env.GEMINI_API_KEY;
  afterEach(() => {
    jest.restoreAllMocks();
    process.env.GEMINI_API_KEY = originalKey;
  });

  const reply = (text: string) =>
    ({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text }] } }],
      }),
    }) as Response;

  it("sends the photo to the vision model and returns the product phrase", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(reply("sparkling water"));

    await expect(describeProductImage("QUJD", "image/png", 5000)).resolves.toBe(
      "sparkling water",
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/models\/gemini-[\w.-]+:generateContent$/);
    expect((init!.headers as Record<string, string>)["x-goog-api-key"]).toBe(
      "test-key",
    );
    const body = JSON.parse(String(init!.body));
    expect(body.contents[0].parts[1]).toEqual({
      inline_data: { mime_type: "image/png", data: "QUJD" },
    });
  });

  it("resolves null when the model sees no product", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    jest.spyOn(global, "fetch").mockResolvedValue(reply("NONE"));
    await expect(
      describeProductImage("QUJD", "image/jpeg", 5000),
    ).resolves.toBeNull();
  });

  it("throws when the API errors or no key is configured", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "quota",
    } as Response);
    await expect(
      describeProductImage("QUJD", "image/jpeg", 5000),
    ).rejects.toThrow(/Gemini API 429/);

    delete process.env.GEMINI_API_KEY;
    await expect(
      describeProductImage("QUJD", "image/jpeg", 5000),
    ).rejects.toThrow(/GEMINI_API_KEY/);
  });
});
