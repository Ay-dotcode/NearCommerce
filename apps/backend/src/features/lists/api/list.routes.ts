import {
  handleAddListItem,
  handleCreateList,
  handleDeleteList,
  handleDeleteListItem,
  handleGetCurrentList,
  handleGetList,
  handleJoinList,
  handleLeaveList,
  handleListMyLists,
  handleRemoveMember,
  handleRenameList,
  handleUpdateListItem,
  regenerateInviteCode,
} from "@/features/lists/api/list.controller";
import { requireAuth } from "@/middleware/auth.middleware";
import { joinListLimiter } from "@/middleware/rateLimiter";
import { Router } from "express";

const listsRouter = Router();

// Every list route needs a signed-in user; membership is enforced in the service layer.
listsRouter.use(requireAuth);

listsRouter.get("/", handleListMyLists);
listsRouter.post("/", handleCreateList);

// NOTE: static paths ("/join", "/my-list") must be registered before "/:list_id".
listsRouter.post("/join", joinListLimiter, handleJoinList);
listsRouter.get("/my-list", handleGetCurrentList);

listsRouter.get("/:list_id", handleGetList);
listsRouter.patch("/:list_id", handleRenameList);
listsRouter.delete("/:list_id", handleDeleteList);
listsRouter.post("/:list_id/leave", handleLeaveList);

listsRouter.post("/:list_id/regenerate-invite", regenerateInviteCode);
listsRouter.post("/:list_id/regenerate-invite-code", regenerateInviteCode);

listsRouter.delete("/:list_id/members/:user_id", handleRemoveMember);

listsRouter.post("/:list_id/items", handleAddListItem);
listsRouter.patch("/:list_id/items/:item_id", handleUpdateListItem);
listsRouter.delete("/:list_id/items/:item_id", handleDeleteListItem);

export default listsRouter;
