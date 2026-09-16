/**
 * Wraps a promise with a timeout. If the promise takes longer than `timeoutMs`,
 * it throws a Timeout Error, triggering our fallback logic.
 */
export const withCircuitBreaker = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Circuit breaker triggered: operation exceeded ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutHandle);
  });
};

/**
 * Stub for Gemini 1.5 Flash Embedding generation.
 * (You will inject the actual @google/generative-ai call here later).
 */
export const fetchGeminiEmbedding = async (_text: string): Promise<number[]> => {
  // Mocking a failure here so we can test the fallback pipeline immediately.
  // When ready, replace with actual SDK call returning a 768-dimensional vector.
  throw new Error("Gemini SDK not yet initialized");
};
