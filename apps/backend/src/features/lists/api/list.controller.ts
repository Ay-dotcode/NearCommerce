import { Request, Response } from "express";
import { ZodError } from "zod";
import { db } from "@/config/database";
import { AddListItemSchema, RegenerateInviteCodeSchema } from "@nearcommerce/api";
import { addListItem } from "@/features/lists/services/list.service";
import { generateShortCode } from "@/features/lists/utils/crypto";

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

/**
 * POST /lists/:list_id/items
 *
 * Adds an item to a household list.
 * Uses UPSERT logic in the service layer to bump quantity on duplicates.
 * Requires authentication middleware (sets req.user).
 */
export const handleAddListItem = async (req: Request, res: Response) => {
  try {
    const parsed = AddListItemSchema.parse({
      ...req.body,
      list_id: req.params.list_id,
    });

    const item = await addListItem({ ...parsed, user_id: req.user?.id as string });
    return res.status(201).json(item);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.issues });
    }
    console.error("[LIST] handleAddListItem error:", error);
    return res.status(500).json({ error: "Failed to add item to list" });
  }
};

/**
 * POST /lists/:list_id/regenerate-invite
 *
 * Generates a fresh invite code for the given list.
 * Only the OWNER of the list is authorised to call this endpoint.
 * Requires authentication middleware (sets req.user).
 */
export const regenerateInviteCode = async (req: Request, res: Response) => {
  try {
    const { list_id } = RegenerateInviteCodeSchema.parse(req.params);
    const user_id = req.user?.id;

    // Ownership check — only list OWNER may regenerate the invite code
    const authCheck = await db.query(
      `SELECT role FROM household_list_members WHERE list_id = $1 AND user_id = $2`,
      [list_id, user_id],
    );

    if (authCheck.rows.length === 0 || authCheck.rows[0].role !== "OWNER") {
      return res.status(403).json({ error: "Only list owners can regenerate invite codes." });
    }

    const newCode = generateShortCode();

    const result = await db.query(
      `UPDATE household_lists SET invite_code = $1 WHERE id = $2 RETURNING invite_code`,
      [newCode, list_id],
    );

    return res.status(200).json({ invite_code: result.rows[0].invite_code });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.issues });
    }
    console.error("[LIST] regenerateInviteCode error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
