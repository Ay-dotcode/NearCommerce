import { Response } from "express";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_RE.test(value);

export interface ValidationDetail {
  path: string;
  message: string;
}

interface IssueLike {
  path: (string | number)[];
  message: string;
}

export const toValidationDetails = (issues: IssueLike[]): ValidationDetail[] =>
  issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

export const sendValidationError = (
  res: Response,
  issues: IssueLike[],
  error = "Validation failed",
) => res.status(400).json({ error, details: toValidationDetails(issues) });

/** An error a service can throw to be turned into an HTTP response by the controller. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: ValidationDetail[],
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Maps HttpError and the Postgres constraint errors we expect to a response. Returns false if unhandled. */
export const handleKnownError = (res: Response, err: unknown): boolean => {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: err.message,
      ...(err.details && { details: err.details }),
    });
    return true;
  }
  const code = (err as { code?: string } | null)?.code;
  if (code === "23503") {
    res.status(422).json({ error: "Referenced record does not exist" });
    return true;
  }
  if (code === "23514") {
    res
      .status(422)
      .json({ error: "Product cannot be published without an image" });
    return true;
  }
  if (code === "22P02") {
    res.status(400).json({ error: "Malformed identifier" });
    return true;
  }
  return false;
};
