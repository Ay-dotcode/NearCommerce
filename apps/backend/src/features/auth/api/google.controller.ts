import { signInWithGoogle } from "@/features/auth/services/googleAuth.service";
import {
  GoogleAuthError,
  verifyGoogleIdToken,
} from "@/features/auth/services/googleVerifier.service";
import {
  issueSession,
  ownerStoreId,
  primeSuspensionCache,
} from "@/features/auth/services/session.service";
import { ACCOUNT_SUSPENDED_CODE, GoogleAuthSchema } from "@nearcommerce/api";
import { Request, Response } from "express";
import { ZodError } from "zod";

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { id_token, role } = GoogleAuthSchema.parse(req.body);
    const profile = await verifyGoogleIdToken(id_token);
    const { user, isNewUser } = await signInWithGoogle(profile, role);

    if (user.role === "SYSTEM_ADMIN")
      throw new GoogleAuthError(
        403,
        "Administrator accounts must sign in with a password.",
        "GOOGLE_NOT_ALLOWED",
      );
    if (user.is_suspended)
      throw new GoogleAuthError(
        403,
        "Account is suspended.",
        ACCOUNT_SUSPENDED_CODE,
      );

    const session = await issueSession(user);
    await primeSuspensionCache(user.id);
    const storeId =
      user.role === "STORE_OWNER" ? await ownerStoreId(user.id) : undefined;

    return res.status(isNewUser ? 201 : 200).json({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: {
        id: user.id,
        role: user.role,
        email_verified: true,
        ...(storeId ? { store_id: storeId } : {}),
      },
      is_new_user: isNewUser,
    });
  } catch (error) {
    if (error instanceof ZodError)
      return res
        .status(400)
        .json({ error: "Validation failed", details: error.issues });
    if (error instanceof GoogleAuthError)
      return res
        .status(error.status)
        .json({ error: error.message, code: error.code });
    console.error("Google sign-in error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
