import { db } from "@/config/database";
import { IMAGE_PATH_PREFIX, UNUSED_IMAGE_GRACE_MINUTES } from "@/constants";
import type { ImageType } from "@/utils/imageType";

export async function saveImage(
  ownerId: string,
  data: Buffer,
  contentType: ImageType,
): Promise<string> {
  const { rows } = await db.query(
    `INSERT INTO uploaded_images (owner_id, content_type, byte_size, data)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [ownerId, contentType, data.length, data],
  );
  return rows[0].id;
}

export async function getImage(
  id: string,
): Promise<{ content_type: string; data: Buffer } | null> {
  const { rows } = await db.query(
    `SELECT content_type, data FROM uploaded_images WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

// Deletes this owner's uploads that no product uses and that are past the grace period.
// Run opportunistically after each upload; it only ever touches the caller's own rows.
export async function pruneUnusedImages(ownerId: string): Promise<number> {
  const result = await db.query(
    `DELETE FROM uploaded_images i
      WHERE i.owner_id = $1
        AND i.created_at < NOW() - make_interval(mins => $2)
        AND NOT EXISTS (
          SELECT 1 FROM products p
            JOIN stores s ON s.id = p.store_id
           WHERE s.owner_id = i.owner_id
             AND p.image_url LIKE '%' || $3 || i.id::text
        )`,
    [ownerId, UNUSED_IMAGE_GRACE_MINUTES, IMAGE_PATH_PREFIX],
  );
  return result.rowCount ?? 0;
}

// Absolute URL a product can store and every client can load. PUBLIC_API_URL should be set
// in production (behind a proxy the request host is not always the public one).
export function imageUrl(
  id: string,
  req: { protocol: string; get(name: string): string | undefined },
): string {
  const base = (
    process.env.PUBLIC_API_URL || `${req.protocol}://${req.get("host")}`
  ).replace(/\/+$/, "");
  return `${base}${IMAGE_PATH_PREFIX}${id}`;
}
