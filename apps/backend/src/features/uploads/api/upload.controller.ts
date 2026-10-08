import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_IMAGE_BYTES } from "@/constants";
import {
  getImage,
  imageUrl,
  pruneUnusedImages,
  saveImage,
} from "@/features/uploads/services/image.service";
import { isUuid } from "@/utils/http";
import { detectImageType } from "@/utils/imageType";
import { NextFunction, Request, Response } from "express";

// POST /uploads/images: the request body is the raw image (Content-Type: image/jpeg|png|webp).
export const uploadImage = async (req: Request, res: Response) => {
  const ownerId = req.user?.id;
  if (!ownerId) return res.status(401).json({ error: "Unauthorized" });

  const body = req.body;
  if (!Buffer.isBuffer(body))
    return res.status(415).json({
      error: `Send the image as the request body with Content-Type ${ALLOWED_IMAGE_TYPES.join(", ")}.`,
    });
  if (body.length === 0)
    return res.status(400).json({ error: "The image is empty." });

  // The bytes decide the type, not the header: a mislabelled upload is rejected.
  const detected = detectImageType(body);
  if (!detected || detected !== req.headers["content-type"]?.split(";")[0])
    return res
      .status(415)
      .json({ error: "The file is not a valid JPEG, PNG or WebP image." });

  try {
    const id = await saveImage(ownerId, body, detected);
    try {
      await pruneUnusedImages(ownerId);
    } catch (error) {
      console.error("[UPLOADS] Failed to prune unused images:", error);
    }
    return res.status(201).json({
      id,
      url: imageUrl(id, req),
      content_type: detected,
      bytes: body.length,
    });
  } catch (error) {
    console.error("Upload image error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Turns body-parser's oversize error into a clear 413 instead of a generic 500.
export const uploadErrorHandler = (
  error: { type?: string },
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (error?.type === "entity.too.large")
    return res.status(413).json({
      error: `Images can be at most ${MAX_UPLOAD_IMAGE_BYTES / (1024 * 1024)} MB.`,
    });
  return next(error);
};

// GET /images/:id is public: product images are shown to every shopper. Ids are random
// UUIDs and rows are immutable, so responses can be cached forever.
export const serveImage = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!isUuid(id)) return res.status(404).json({ error: "Image not found" });
  try {
    const image = await getImage(id);
    if (!image) return res.status(404).json({ error: "Image not found" });
    res.set({
      "Content-Type": image.content_type,
      "Content-Length": String(image.data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      // Portals and the app load these from other origins.
      "Cross-Origin-Resource-Policy": "cross-origin",
    });
    return res.status(200).send(image.data);
  } catch (error) {
    console.error("Serve image error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
