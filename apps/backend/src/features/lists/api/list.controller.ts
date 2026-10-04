import {
  addListItem,
  createList,
  deleteList,
  deleteListItem,
  getCurrentList,
  getListDetail,
  joinList,
  leaveList,
  ListError,
  listUserLists,
  regenerateInviteCode as regenerateInviteCodeService,
  removeMember,
  renameList,
  updateListItem,
} from "@/features/lists/services/list.service";
import {
  AddListItemSchema,
  CreateListSchema,
  JoinListSchema,
  ListIdParamSchema,
  ListItemParamsSchema,
  ListMemberParamsSchema,
  RegenerateInviteCodeSchema,
  RenameListSchema,
  UpdateListItemSchema,
} from "@nearcommerce/api";
import { Request, Response } from "express";
import { ZodError } from "zod";

// Response shape: list endpoints return bare objects (not wrapped in `{ data }`) because the
// existing mobile screens and POST /lists/:id/items already consume them that way.

const userId = (req: Request) => req.user?.id as string;

function handleError(res: Response, error: unknown, label: string) {
  if (error instanceof ZodError)
    return res
      .status(400)
      .json({ error: "Validation failed", details: error.issues });
  if (error instanceof ListError)
    return res
      .status(error.status)
      .json({ error: error.message, ...(error.code && { code: error.code }) });
  console.error(`[LIST] ${label} error:`, error);
  return res.status(500).json({ error: "Internal server error" });
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

// GET /lists
export const handleListMyLists = async (req: Request, res: Response) => {
  try {
    return res.status(200).json({ data: await listUserLists(userId(req)) });
  } catch (error) {
    return handleError(res, error, "listMyLists");
  }
};

// GET /lists/my-list: the list the mobile Lists tab opens on.
export const handleGetCurrentList = async (req: Request, res: Response) => {
  try {
    return res.status(200).json(await getCurrentList(userId(req)));
  } catch (error) {
    return handleError(res, error, "getCurrentList");
  }
};

// POST /lists
export const handleCreateList = async (req: Request, res: Response) => {
  try {
    const { name } = CreateListSchema.parse(req.body);
    return res.status(201).json(await createList(userId(req), name));
  } catch (error) {
    return handleError(res, error, "createList");
  }
};

// POST /lists/join
export const handleJoinList = async (req: Request, res: Response) => {
  try {
    const { invite_code } = JoinListSchema.parse(req.body);
    const joined = await joinList(userId(req), invite_code);
    return res.status(joined.already_member ? 200 : 201).json(joined);
  } catch (error) {
    return handleError(res, error, "joinList");
  }
};

// GET /lists/:list_id
export const handleGetList = async (req: Request, res: Response) => {
  try {
    const { list_id } = ListIdParamSchema.parse(req.params);
    return res.status(200).json(await getListDetail(list_id, userId(req)));
  } catch (error) {
    return handleError(res, error, "getList");
  }
};

// PATCH /lists/:list_id
export const handleRenameList = async (req: Request, res: Response) => {
  try {
    const { list_id } = ListIdParamSchema.parse(req.params);
    const { name } = RenameListSchema.parse(req.body);
    return res.status(200).json(await renameList(list_id, userId(req), name));
  } catch (error) {
    return handleError(res, error, "renameList");
  }
};

// DELETE /lists/:list_id
export const handleDeleteList = async (req: Request, res: Response) => {
  try {
    const { list_id } = ListIdParamSchema.parse(req.params);
    await deleteList(list_id, userId(req));
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error, "deleteList");
  }
};

// POST /lists/:list_id/leave
export const handleLeaveList = async (req: Request, res: Response) => {
  try {
    const { list_id } = ListIdParamSchema.parse(req.params);
    const outcome = await leaveList(list_id, userId(req));
    return res.status(200).json({
      list_deleted: outcome.listDeleted,
      new_owner_id: outcome.newOwnerId,
    });
  } catch (error) {
    return handleError(res, error, "leaveList");
  }
};

// POST /lists/:list_id/regenerate-invite (alias: /regenerate-invite-code)
export const regenerateInviteCode = async (req: Request, res: Response) => {
  try {
    const { list_id } = RegenerateInviteCodeSchema.parse(req.params);
    const invite_code = await regenerateInviteCodeService(list_id, userId(req));
    return res.status(200).json({ invite_code });
  } catch (error) {
    return handleError(res, error, "regenerateInviteCode");
  }
};

// DELETE /lists/:list_id/members/:user_id
export const handleRemoveMember = async (req: Request, res: Response) => {
  try {
    const { list_id, user_id } = ListMemberParamsSchema.parse(req.params);
    await removeMember(list_id, userId(req), user_id);
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error, "removeMember");
  }
};

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

// POST /lists/:list_id/items
// Upserts on (list_id, product_id); the response includes `already_on_list` so clients
// can show "Item already on list. Quantity increased to [X] and marked un-checked."
export const handleAddListItem = async (req: Request, res: Response) => {
  try {
    const parsed = AddListItemSchema.parse({
      ...req.body,
      list_id: req.params.list_id,
    });
    const item = await addListItem({ ...parsed, user_id: userId(req) });
    return res.status(201).json(item);
  } catch (error) {
    return handleError(res, error, "addListItem");
  }
};

// PATCH /lists/:list_id/items/:item_id
export const handleUpdateListItem = async (req: Request, res: Response) => {
  try {
    const { list_id, item_id } = ListItemParamsSchema.parse(req.params);
    const patch = UpdateListItemSchema.parse(req.body);
    return res
      .status(200)
      .json(await updateListItem(list_id, item_id, userId(req), patch));
  } catch (error) {
    return handleError(res, error, "updateListItem");
  }
};

// DELETE /lists/:list_id/items/:item_id
export const handleDeleteListItem = async (req: Request, res: Response) => {
  try {
    const { list_id, item_id } = ListItemParamsSchema.parse(req.params);
    await deleteListItem(list_id, item_id, userId(req));
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error, "deleteListItem");
  }
};
