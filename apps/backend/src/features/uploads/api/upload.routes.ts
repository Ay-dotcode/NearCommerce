import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_IMAGE_BYTES } from "@/constants";
import {
  serveImage,
  uploadErrorHandler,
  uploadImage,
} from "@/features/uploads/api/upload.controller";
import { requireAuth } from "@/middleware/auth.middleware";
import { uploadLimiter } from "@/middleware/rateLimiter";
import { requireRole } from "@/middleware/rbac";
import express, { Router } from "express";

export const uploadRouter = Router();
uploadRouter.post(
  "/images",
  requireAuth,
  requireRole(["STORE_OWNER"]),
  uploadLimiter,
  express.raw({ type: ALLOWED_IMAGE_TYPES, limit: MAX_UPLOAD_IMAGE_BYTES }),
  uploadImage,
  uploadErrorHandler,
);

export const imageRouter = Router();
imageRouter.get("/:id", serveImage);
