import { db } from "@/config/database";
import { MAX_STORES_PER_OWNER } from "@/constants";
import { HttpError } from "@/utils/http";
import { checkIfStoreIsOpen } from "@/utils/timezone";
import type { CreateStoreInput, UpdateStoreInput } from "@nearcommerce/api";

export const STORE_COLUMNS = `id, owner_id, name, description, address, latitude, longitude,
  timezone, opening_hours, is_suspended, created_at, updated_at`;

export interface NormalizedDay {
  open: string;
  close: string;
  isClosed: boolean;
}
export type NormalizedHours = Record<string, NormalizedDay | null>;

 // Collapses the legacy `closed` flag into `isClosed` so the database only ever
 // holds one shape. Days that are omitted stay omitted (treated as closed).
export function normalizeOpeningHours(
  hours: Record<
    string,
    {
      open: string;
      close: string;
      isClosed?: boolean;
      closed?: boolean;
    } | null
  >,
): NormalizedHours {
  const out: NormalizedHours = {};
  for (const [day, value] of Object.entries(hours)) {
    out[day] = value
      ? {
          open: value.open,
          close: value.close,
          isClosed: Boolean(value.isClosed || value.closed),
        }
      : null;
  }
  return out;
}

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

const timezoneError = () =>
  new HttpError(400, "Validation failed", [
    { path: "timezone", message: "Unknown IANA timezone" },
  ]);

export function toStoreDto(row: Record<string, any>) {
  const isOpen = checkIfStoreIsOpen(row.opening_hours, row.timezone);
  return { ...row, isOpen, is_open_now: isOpen };
}

export async function listStoresByOwner(ownerId: string) {
  const { rows } = await db.query(
    `SELECT ${STORE_COLUMNS} FROM stores WHERE owner_id = $1 ORDER BY created_at ASC`,
    [ownerId],
  );
  return rows.map(toStoreDto);
}

export async function createStore(ownerId: string, input: CreateStoreInput) {
  if (!isValidTimezone(input.timezone)) throw timezoneError();

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    // Serialise concurrent creates for one owner so the cap cannot be bypassed.
    await client.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [
      ownerId,
    ]);
    const count = await client.query(
      `SELECT COUNT(*)::int AS n FROM stores WHERE owner_id = $1`,
      [ownerId],
    );
    if (count.rows[0].n >= MAX_STORES_PER_OWNER)
      throw new HttpError(
        409,
        `You can manage at most ${MAX_STORES_PER_OWNER} stores`,
      );

    const { rows } = await client.query(
      `INSERT INTO stores
         (owner_id, name, description, address, latitude, longitude, timezone, opening_hours)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING ${STORE_COLUMNS}`,
      [
        ownerId,
        input.name,
        input.description ?? null,
        input.address,
        input.latitude,
        input.longitude,
        input.timezone,
        JSON.stringify(normalizeOpeningHours(input.openingHours)),
      ],
    );
    await client.query("COMMIT");
    return toStoreDto(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateStore(storeId: string, patch: UpdateStoreInput) {
  if (patch.timezone !== undefined && !isValidTimezone(patch.timezone))
    throw timezoneError();

  const sets: string[] = [];
  const values: unknown[] = [];
  const add = (column: string, value: unknown) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };

  if (patch.name !== undefined) add("name", patch.name);
  if (patch.description !== undefined) add("description", patch.description);
  if (patch.address !== undefined) add("address", patch.address);
  if (patch.latitude !== undefined) add("latitude", patch.latitude);
  if (patch.longitude !== undefined) add("longitude", patch.longitude);
  if (patch.timezone !== undefined) add("timezone", patch.timezone);
  if (patch.openingHours !== undefined)
    add(
      "opening_hours",
      JSON.stringify(normalizeOpeningHours(patch.openingHours)),
    );

  values.push(storeId);
  const { rows } = await db.query(
    `UPDATE stores SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length}
      RETURNING ${STORE_COLUMNS}`,
    values,
  );
  if (rows.length === 0) throw new HttpError(404, "Store not found");
  return toStoreDto(rows[0]);
}

// Deletes the store; products, favorites and reviews cascade via foreign keys.
export async function deleteStore(storeId: string): Promise<boolean> {
  const { rowCount } = await db.query(`DELETE FROM stores WHERE id = $1`, [
    storeId,
  ]);
  return (rowCount ?? 0) > 0;
}
