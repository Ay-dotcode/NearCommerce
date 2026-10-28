-- Email verification is switched off: new accounts work straight away. The verification
-- tables and columns stay in place so the feature can be switched back on later.
-- Accounts that registered before this change and never clicked a link are marked as verified.
UPDATE users
   SET email_verified_at = COALESCE(created_at, NOW())
 WHERE email_verified_at IS NULL;

-- A root admin is one created from the server (pnpm add-admin / the seed script). Admins who
-- were only promoted from the admin portal cannot demote, suspend or delete a root admin.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_root_admin BOOLEAN NOT NULL DEFAULT false;

-- Every admin that exists today was created by the owner, so they are all protected.
UPDATE users SET is_root_admin = true WHERE role = 'SYSTEM_ADMIN';
