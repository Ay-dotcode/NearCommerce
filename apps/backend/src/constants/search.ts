export const GEMINI_CIRCUIT_BREAKER_TIMEOUT_MS = 2000; // 2s budget for AI embedding generation before falling back to pg_trgm / tsvector
export const SEARCH_RESULTS_LIMIT = 50;
export const GEMINI_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;
export const GEMINI_VISION_MODEL =
  process.env.GEMINI_VISION_MODEL || "gemini-2.5-flash";
export const GEMINI_VISION_TIMEOUT_MS = 8000; // vision is slower than embeddings; past this, report it unavailable
export const MAX_IMAGE_SEARCH_BASE64_CHARS = 1_500_000; // ~1.1 MB of image; the app sends far less
export const IMAGE_SEARCH_RATE_LIMIT_MAX = 20; // photo searches per IP per window (each one is a paid vision call)
export const MAX_DETECTED_QUERY_CHARS = 100;
