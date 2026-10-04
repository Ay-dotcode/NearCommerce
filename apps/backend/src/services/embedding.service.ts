import { db } from "@/config/database";
import {
  EMBEDDING_BATCH_SIZE,
  EMBEDDING_REQUEST_TIMEOUT_MS,
  MAX_EMBEDDING_INPUT_CHARS,
} from "@/constants";
import { fetchGeminiEmbeddingsBatch } from "@/utils/circuitBreaker";

export interface EmbeddableProduct {
  name: string;
  description?: string | null;
}

// The text that represents a product in vector space. Keep in sync with search expectations.
export function buildEmbeddingText(product: EmbeddableProduct): string {
  const parts = [product.name, product.description]
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p));
  return parts.join(". ").slice(0, MAX_EMBEDDING_INPUT_CHARS);
}

const toVectorLiteral = (values: number[]) => `[${values.join(",")}]`;

const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out;
};

export interface EmbedResult {
  updated: number;
  failed: number;
}

// Generates and stores embeddings for the given products. Never throws:
// embeddings are an enhancement (search falls back to pg_trgm / tsvector),
// so a Gemini outage must not break product writes.
export async function embedProducts(
  productIds: string[],
): Promise<EmbedResult> {
  const ids = [...new Set(productIds)];
  if (ids.length === 0) return { updated: 0, failed: 0 };

  if (!process.env.GEMINI_API_KEY) {
    console.warn(
      `[EMBEDDINGS] GEMINI_API_KEY not set; skipped ${ids.length} product(s)`,
    );
    return { updated: 0, failed: ids.length };
  }

  let updated = 0;
  let failed = 0;

  try {
    const { rows } = await db.query(
      `SELECT id, name, description FROM products WHERE id = ANY($1::uuid[])`,
      [ids],
    );

    for (const batch of chunk(rows, EMBEDDING_BATCH_SIZE)) {
      try {
        const vectors = await fetchGeminiEmbeddingsBatch(
          batch.map((r) => buildEmbeddingText(r)),
          "RETRIEVAL_DOCUMENT",
          EMBEDDING_REQUEST_TIMEOUT_MS,
        );
        await db.query(
          `UPDATE products p
              SET embedding = v.embedding::vector
             FROM unnest($1::uuid[], $2::text[]) AS v(id, embedding)
            WHERE p.id = v.id`,
          [batch.map((r) => r.id), vectors.map(toVectorLiteral)],
        );
        updated += batch.length;
      } catch (error) {
        failed += batch.length;
        console.error("[EMBEDDINGS] batch failed:", error);
      }
    }
  } catch (error) {
    failed = ids.length - updated;
    console.error("[EMBEDDINGS] pipeline failed:", error);
  }

  return { updated, failed };
}

// Fire-and-forget wrapper used by request handlers so the owner never waits on Gemini.
export function scheduleProductEmbeddings(productIds: string[]): void {
  if (productIds.length === 0) return;
  setImmediate(() => {
    embedProducts(productIds).catch((error) =>
      console.error("[EMBEDDINGS] unexpected failure:", error),
    );
  });
}

// Embeds every product that has no embedding yet (used by the backfill script).
export async function backfillMissingEmbeddings(
  limit = 5000,
): Promise<EmbedResult> {
  const { rows } = await db.query(
    `SELECT id FROM products WHERE embedding IS NULL ORDER BY created_at LIMIT $1`,
    [limit],
  );
  return embedProducts(rows.map((r) => r.id));
}
