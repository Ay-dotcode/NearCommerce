import { OAuth2Client } from "google-auth-library";

// What the rest of the app needs to know about a verified Google sign-in.
export interface GoogleProfile {
  // Google's stable id for the account. Never changes, unlike the email address.
  subject: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

// An error that already carries the HTTP status and a message that is safe to show.
export class GoogleAuthError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "GoogleAuthError";
  }
}

// GOOGLE_CLIENT_IDS is a comma separated list of the OAuth client ids whose tokens this API
// accepts (normally the Web client id; Android and iOS apps sign in with it as the audience).
export function googleClientIds(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  return (env.GOOGLE_CLIENT_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

let client: OAuth2Client | undefined;

// Checks a Google ID token the app received: the signature (against Google's published keys),
// that it was issued by Google, that it has not expired, and that it was issued for one of
// OUR client ids. The last check is what stops a token minted for some other app from being
// replayed here.
export async function verifyGoogleIdToken(
  idToken: string,
): Promise<GoogleProfile> {
  const audience = googleClientIds();
  if (!audience.length)
    throw new GoogleAuthError(
      503,
      "Google sign-in is not configured on this server.",
      "GOOGLE_NOT_CONFIGURED",
    );

  try {
    client ??= new OAuth2Client();
    const ticket = await client.verifyIdToken({ idToken, audience });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) throw new Error("Incomplete token");
    return {
      subject: payload.sub,
      email: payload.email.trim().toLowerCase(),
      emailVerified: payload.email_verified === true,
      name: payload.name,
    };
  } catch {
    // Expired, forged, wrong audience... the caller only needs to know it cannot be trusted.
    throw new GoogleAuthError(
      401,
      "Google sign-in failed. Please try again.",
      "GOOGLE_TOKEN_INVALID",
    );
  }
}
