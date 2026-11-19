-- Sign in with Google. Accounts created through Google have no password, so password_hash
-- can no longer be mandatory. Password login for such an account simply fails (there is no
-- hash to compare against).
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- One row per external identity linked to an account. Google's stable user id ("sub") is the
-- key, not the email address: an email can change, the subject never does.
CREATE TABLE auth_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('google')),
    provider_subject VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (provider, provider_subject),
    UNIQUE (user_id, provider)
);
