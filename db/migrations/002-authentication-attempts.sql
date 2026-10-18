CREATE TABLE authentication_attempts (
  key text PRIMARY KEY,
  attempts integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX authentication_attempts_expiry_idx ON authentication_attempts (expires_at);
