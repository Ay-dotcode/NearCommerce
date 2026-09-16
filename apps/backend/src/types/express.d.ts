// Augments the Express Request type to include the authenticated user context
// set by the authentication middleware.
declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: string;
    };
  }
}
