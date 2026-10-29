CREATE TABLE accounts (
    id            uuid        PRIMARY KEY,
    -- Stored trimmed and lower-case, so the unique constraint is case insensitive.
    email         text        NOT NULL CONSTRAINT accounts_email_key UNIQUE
                              CONSTRAINT accounts_email_lower_case CHECK (email = lower(email)),
    password_hash text        NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);
