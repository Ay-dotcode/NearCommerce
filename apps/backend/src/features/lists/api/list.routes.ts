import {
  handleAddListItem,
  regenerateInviteCode,
} from "@/features/lists/api/list.controller";
import { requireAuth } from "@/middleware/auth.middleware";
import { Router } from "express";

const listsRouter = Router();

listsRouter.post("/:list_id/items", requireAuth, handleAddListItem);
listsRouter.post(
  "/:list_id/regenerate-invite",
  requireAuth,
  regenerateInviteCode,
);

export default listsRouter;
