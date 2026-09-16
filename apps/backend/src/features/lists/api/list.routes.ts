import { Router } from "express";
import { handleAddListItem, regenerateInviteCode } from "@/features/lists/api/list.controller";

const listsRouter = Router();

// POST /lists/:list_id/items
// Body: { product_id?: string, custom_item_name?: string, quantity?: number }
// Auth required (TODO: add auth middleware here when JWT guard is implemented)
listsRouter.post("/:list_id/items", handleAddListItem);

// POST /lists/:list_id/regenerate-invite
// Auth required — owner-only
listsRouter.post("/:list_id/regenerate-invite", regenerateInviteCode);

export default listsRouter;
