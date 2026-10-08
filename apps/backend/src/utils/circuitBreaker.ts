import {
  EMBEDDING_DIMENSIONS,
  GEMINI_EMBEDDING_MODEL,
  GEMINI_VISION_MODEL,
  MAX_DETECTED_QUERY_CHARS,
} from "@/constants";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export type EmbeddingTaskType = "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT";

// Wraps a promise with a timeout. If the promise takes longer than `timeoutMs`,
// it throws a Timeout Error, triggering our fallback logic.
export const withCircuitBreaker = <T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new Error(
          `Circuit breaker triggered: operation exceeded ${timeoutMs}ms`,
        ),
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutHandle);
  });
};

// gemini-embedding-001 only returns unit-length vectors at its native 3072 dims.
// For truncated (768) outputs we normalise ourselves so L2 distance in pgvector
// behaves consistently between stored documents and live queries.
export const l2Normalize = (vector: number[]): number[] => {
  const norm = Math.sqrt(vector.reduce((sum, x) => sum + x * x, 0));
  if (!norm) throw new Error("Gemini returned a zero-norm embedding");
  return vector.map((x) => x / norm);
};

const buildEmbedRequest = (text: string, taskType: EmbeddingTaskType) => ({
  model: `models/${GEMINI_EMBEDDING_MODEL}`,
  content: { parts: [{ text }] },
  taskType,
  outputDimensionality: EMBEDDING_DIMENSIONS,
});

async function geminiPost<T>(
  model: string,
  method: "embedContent" | "batchEmbedContents" | "generateContent",
  body: unknown,
  timeoutMs: number,
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const response = await fetch(`${GEMINI_API_BASE}/models/${model}:${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Gemini API ${response.status}: ${detail}`);
  }
  return (await response.json()) as T;
}

const assertDimensions = (values: number[] | undefined): number[] => {
  if (!values || values.length !== EMBEDDING_DIMENSIONS)
    throw new Error(
      `Expected a ${EMBEDDING_DIMENSIONS}-dimension embedding, got ${values?.length ?? 0}`,
    );
  return values;
};

// Generates one 768-dimension embedding. Used by live search (RETRIEVAL_QUERY).
export const fetchGeminiEmbedding = async (
  text: string,
  taskType: EmbeddingTaskType = "RETRIEVAL_QUERY",
  timeoutMs = 10_000,
): Promise<number[]> => {
  const data = await geminiPost<{ embedding?: { values?: number[] } }>(
    GEMINI_EMBEDDING_MODEL,
    "embedContent",
    buildEmbedRequest(text, taskType),
    timeoutMs,
  );
  return l2Normalize(assertDimensions(data.embedding?.values));
};

// Generates embeddings for many texts in a single request (max 100).
// Used by the product pipeline (RETRIEVAL_DOCUMENT). Result order matches input order.
export const fetchGeminiEmbeddingsBatch = async (
  texts: string[],
  taskType: EmbeddingTaskType = "RETRIEVAL_DOCUMENT",
  timeoutMs = 15_000,
): Promise<number[][]> => {
  if (texts.length === 0) return [];
  const data = await geminiPost<{ embeddings?: { values?: number[] }[] }>(
    GEMINI_EMBEDDING_MODEL,
    "batchEmbedContents",
    { requests: texts.map((t) => buildEmbedRequest(t, taskType)) },
    timeoutMs,
  );
  const embeddings = data.embeddings ?? [];
  if (embeddings.length !== texts.length)
    throw new Error(
      `Gemini returned ${embeddings.length} embeddings for ${texts.length} inputs`,
    );
  return embeddings.map((e) => l2Normalize(assertDimensions(e.values)));
};

const VISION_PROMPT =
  "You help shoppers find products in local stores. Name the single main retail product " +
  "in this photo as a short search phrase of at most 6 words: the product type, plus brand " +
  "or flavour only if clearly visible. Reply with ONLY that phrase. If the photo shows no " +
  "purchasable product, reply with exactly: NONE";

// Turns the model's reply into a search phrase, or null when it saw no product.
export const parseVisionReply = (reply: string | undefined): string | null => {
  const firstLine = reply?.split("\n").find((line) => line.trim()) ?? "";
  const phrase = firstLine
    .replace(/^["'`\s]+|["'`\s.]+$/g, "")
    .slice(0, MAX_DETECTED_QUERY_CHARS)
    .trim();
  return !phrase || /^none$/i.test(phrase) ? null : phrase;
};

// Asks Gemini what product a photo shows. Resolves null when no product is visible; throws
// when the model is unreachable, slow, or not configured.
export const describeProductImage = async (
  base64: string,
  mimeType: string,
  timeoutMs: number,
): Promise<string | null> => {
  const data = await geminiPost<{
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  }>(
    GEMINI_VISION_MODEL,
    "generateContent",
    {
      contents: [
        {
          parts: [
            { text: VISION_PROMPT },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ],
        },
      ],
      generationConfig: { temperature: 0, maxOutputTokens: 40 },
    },
    timeoutMs,
  );
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("");
  return parseVisionReply(text);
};
