import { db } from "@/config/database";
import {
  buildEmbeddingText,
  embedProducts,
} from "@/services/embedding.service";
import {
  fetchGeminiEmbeddingsBatch,
  l2Normalize,
} from "@/utils/circuitBreaker";

jest.mock("@/config/database", () => ({ db: { query: jest.fn() } }));
jest.mock("@/utils/circuitBreaker", () => {
  const actual = jest.requireActual("@/utils/circuitBreaker");
  return { ...actual, fetchGeminiEmbeddingsBatch: jest.fn() };
});

const query = db.query as jest.Mock;
const batch = fetchGeminiEmbeddingsBatch as jest.Mock;
const vec = (n = 768) => Array.from({ length: n }, () => 0.1);

describe("buildEmbeddingText", () => {
  it("joins name and description and trims blanks", () =>
    expect(buildEmbeddingText({ name: " Milk ", description: " Fresh " })).toBe(
      "Milk. Fresh",
    ));
  it("works without a description", () =>
    expect(buildEmbeddingText({ name: "Milk", description: null })).toBe(
      "Milk",
    ));
  it("caps very long descriptions", () =>
    expect(
      buildEmbeddingText({ name: "A", description: "x".repeat(5000) }).length,
    ).toBeLessThanOrEqual(2000));
});

describe("embedProducts", () => {
  const originalKey = process.env.GEMINI_API_KEY;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-key";
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });
  afterAll(() => {
    process.env.GEMINI_API_KEY = originalKey;
  });

  it("does nothing for an empty list", async () => {
    expect(await embedProducts([])).toEqual({ updated: 0, failed: 0 });
    expect(query).not.toHaveBeenCalled();
  });

  it("skips (without throwing) when no API key is configured", async () => {
    delete process.env.GEMINI_API_KEY;
    expect(await embedProducts(["a"])).toEqual({ updated: 0, failed: 1 });
    expect(batch).not.toHaveBeenCalled();
  });

  it("embeds products as documents and stores vectors as pgvector literals", async () => {
    query
      .mockResolvedValueOnce({
        rows: [{ id: "p1", name: "Milk", description: "Fresh" }],
      })
      .mockResolvedValueOnce({ rowCount: 1 });
    batch.mockResolvedValueOnce([[0.5, 0.5]]);

    const result = await embedProducts(["p1", "p1"]); // duplicates are collapsed

    expect(result).toEqual({ updated: 1, failed: 0 });
    expect(batch).toHaveBeenCalledWith(
      ["Milk. Fresh"],
      "RETRIEVAL_DOCUMENT",
      expect.any(Number),
    );
    const [, params] = query.mock.calls[1];
    expect(params[0]).toEqual(["p1"]);
    expect(params[1]).toEqual(["[0.5,0.5]"]);
  });

  it("reports failures instead of throwing when Gemini errors", async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: "p1", name: "Milk", description: null }],
    });
    batch.mockRejectedValueOnce(new Error("503"));
    expect(await embedProducts(["p1"])).toEqual({ updated: 0, failed: 1 });
  });

  it("splits large sets into batches of 100", async () => {
    const rows = Array.from({ length: 250 }, (_, i) => ({
      id: `p${i}`,
      name: `N${i}`,
      description: null,
    }));
    query.mockResolvedValueOnce({ rows }).mockResolvedValue({ rowCount: 100 });
    batch.mockImplementation(async (texts: string[]) => texts.map(() => [1]));

    const result = await embedProducts(rows.map((r) => r.id));

    expect(batch).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ updated: 250, failed: 0 });
  });
});

describe("Gemini REST client", () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("l2Normalize returns a unit vector and rejects zero vectors", () => {
    const n = l2Normalize([3, 4]);
    expect(n[0]).toBeCloseTo(0.6);
    expect(n[1]).toBeCloseTo(0.8);
    expect(() => l2Normalize([0, 0])).toThrow(/zero-norm/);
  });

  it("requests 768 dimensions with the document task type", async () => {
    // the module under test is mocked in this file, so use the real implementation
    const { fetchGeminiEmbeddingsBatch: real } = jest.requireActual(
      "@/utils/circuitBreaker",
    );
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embeddings: [{ values: vec() }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const [v] = await real(["hello"]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/:batchEmbedContents$/);
    expect(init.headers["x-goog-api-key"]).toBe("test-key");
    const body = JSON.parse(init.body);
    expect(body.requests[0]).toMatchObject({
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: 768,
    });
    expect(v).toHaveLength(768);
    expect(Math.hypot(...v)).toBeCloseTo(1);
  });

  it("rejects a response with the wrong dimensionality", async () => {
    const { fetchGeminiEmbedding: real } = jest.requireActual(
      "@/utils/circuitBreaker",
    );
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: { values: vec(3072) } }),
    }) as unknown as typeof fetch;
    await expect(real("hello")).rejects.toThrow(/768-dimension/);
  });

  it("surfaces API errors (e.g. a retired model)", async () => {
    const { fetchGeminiEmbedding: real } = jest.requireActual(
      "@/utils/circuitBreaker",
    );
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "models/x is not found",
    }) as unknown as typeof fetch;
    await expect(real("hello")).rejects.toThrow(/Gemini API 404/);
  });
});
