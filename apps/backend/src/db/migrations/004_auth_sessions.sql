-- Refresh tokens are looked up by hash on every /auth/refresh, so index them.
-- The hash is SHA-256 of 40 random bytes: unique in practice, and uniqueness stops a
-- rotated token from ever matching two sessions.
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_refresh_token_hash
  ON user_sessions (refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash
  ON password_reset_tokens (token_hash);
