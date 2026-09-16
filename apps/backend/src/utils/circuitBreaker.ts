import { GEMINI_EMBEDDING_MODEL } from "@/constants";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Wraps a promise with a timeout. If the promise takes longer than `timeoutMs`,
 * it throws a Timeout Error, triggering our fallback logic.
 */
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

/**
 * Generates a 768-dimensional vector embedding using Google's text-embedding-004 model.
 * The result is fed into pgvector for semantic similarity search.
 */
export const fetchGeminiEmbedding = async (text: string): Promise<number[]> => {
  if (!process.env.GEMINI_API_KEY)
    throw new Error("GEMINI_API_KEY is not configured.");

  const model = genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });
  const result = await model.embedContent(text);

  return result.embedding.values;
};
