// One-off: embed every product that has no embedding yet.
// Run from apps/backend:  pnpm embeddings:backfill
import { db } from "@/config/database";
import { backfillMissingEmbeddings } from "@/services/embedding.service";

(async () => {
  const result = await backfillMissingEmbeddings();
  console.log(
    `[BACKFILL] embedded ${result.updated} product(s), ${result.failed} failed`,
  );
  await db.end();
  process.exit(result.failed > 0 ? 1 : 0);
})();
