import type { UserRole } from "./roles";

// What POST /auth/login returns. Shared by the web portal, the admin console and the mobile app.
export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  user: {
    id: string;
    role: UserRole;
    store_id?: string;
  };
}

// What POST /auth/google returns: the same as a normal login, plus whether this sign-in just
// created the account.
export interface GoogleAuthResponse extends AuthResponse {
  is_new_user: boolean;
}
