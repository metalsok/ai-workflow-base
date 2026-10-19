CREATE TABLE catalog_request_limits (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  attempts integer NOT NULL,
  window_end timestamptz NOT NULL
);
