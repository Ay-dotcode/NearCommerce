export const MAX_UPLOAD_IMAGE_BYTES = 2 * 1024 * 1024; // the web cropper exports well under this
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const IMAGE_PATH_PREFIX = "/api/images/";
export const UPLOAD_RATE_LIMIT_MAX = 30; // uploads per IP per rate-limit window
export const UNUSED_IMAGE_GRACE_MINUTES = 60;
