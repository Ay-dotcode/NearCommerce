import {
  createOwnerStore,
  deleteOwnerStore,
  getOwnerStore,
  getStoreDetails,
  listMyStores,
  updateOwnerStore,
} from "@/controllers/storeController";
import {
  createOwnerProduct,
  getStoreProducts,
} from "@/controllers/productController";
import { listOwnerProductReviews } from "@/controllers/reviewController";
import { requireAuth } from "@/middleware/auth.middleware";
import { requireRole } from "@/middleware/rbac";
import { requireStoreAccess } from "@/middleware/storeAccess";
import { Router } from "express";

const storeRouter = Router();
const ownerOnly = [requireAuth, requireRole(["STORE_OWNER"])];
const ownsStore = [...ownerOnly, requireStoreAccess("param")];

// NOTE: "/mine" must stay registered before "/:storeId", otherwise "mine" is read as a store id.
storeRouter.get("/mine", requireAuth, listMyStores);
storeRouter.post("/", ...ownerOnly, createOwnerStore);

storeRouter.get("/:storeId", getStoreDetails);
storeRouter.get("/:storeId/manage", ...ownsStore, getOwnerStore);
storeRouter.put("/:storeId", ...ownsStore, updateOwnerStore);
storeRouter.patch("/:storeId", ...ownsStore, updateOwnerStore);
storeRouter.delete("/:storeId", ...ownsStore, deleteOwnerStore);

// What shoppers wrote about this store's products (the owner's view; no store name, it is theirs).
storeRouter.get(
  "/:storeId/product-reviews",
  ...ownsStore,
  listOwnerProductReviews,
);

// Store-scoped inventory aliases (same handlers as /products, store id taken from the URL).
storeRouter.get("/:storeId/products", ...ownsStore, getStoreProducts);
storeRouter.post("/:storeId/products", ...ownsStore, createOwnerProduct);

export default storeRouter;
