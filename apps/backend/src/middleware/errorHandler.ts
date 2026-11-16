import type { ErrorRequestHandler, RequestHandler } from "express";

// Unknown routes answer with JSON, like every other API response.
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: "Not found", code: "ROUTE_NOT_FOUND" });
};

type HttpError = Error & {
  status?: number;
  statusCode?: number;
  type?: string;
};

// Last-resort handler: anything a route forgot to catch (including malformed JSON bodies and
// oversized payloads) becomes a clean JSON error instead of an HTML stack trace.
export const errorHandler: ErrorRequestHandler = (
  err: HttpError,
  _req,
  res,
  next,
) => {
  if (res.headersSent) return next(err);

  if (err.type === "entity.parse.failed")
    return res
      .status(400)
      .json({ error: "Request body is not valid JSON", code: "INVALID_JSON" });
  if (err.type === "entity.too.large")
    return res
      .status(413)
      .json({ error: "Request body is too large", code: "PAYLOAD_TOO_LARGE" });

  const status = err.statusCode ?? err.status;
  if (status && status >= 400 && status < 500)
    return res.status(status).json({ error: err.message });

  if (process.env.NODE_ENV !== "test")
    console.error("[API] Unhandled error", err);
  return res.status(500).json({ error: "Internal Server Error" });
};
